/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getTestById } from './storage';
import {
  loadAllSessionsForTest,
  loadSessionById,
  saveSessionToHistory,
  clearAllSessionsForTest,
  deleteSessionFromHistory,
} from './studentSession';
import {
  loadGradingResult,
  loadGradingResultsByTest,
  saveGradingResult,
  deleteGradingResultsForTest,
  deleteGradingResultForSession,
} from './gradingStorage';
import { isQuestionAnswered, TestSession } from '../types/student';
import { getStudentAnswerDisplay, getCorrectAnswerDisplay } from './results';
import {
  StudentReportSummary,
  IndividualStudentReport,
  QuestionReportItem,
} from '../types/report';

/**
 * Synchronizes server submissions from cross-device attempts into local storage for reporting.
 */
export async function syncServerSubmissions(testId: string): Promise<boolean> {
  if (!testId) return false;
  try {
    const res = await fetch(`/api/tests/${encodeURIComponent(testId)}/submissions`);
    if (!res.ok) return false;
    const data = await res.json();
    if (!data || !Array.isArray(data.submissions)) return false;

    let updated = false;
    for (const sub of data.submissions) {
      const subSessionId = sub.sessionId || sub.id;
      if (sub.gradingResult) {
        saveGradingResult({
          ...sub.gradingResult,
          testId: sub.testId || testId,
          sessionId: sub.gradingResult.sessionId || subSessionId,
        });
        updated = true;
      }
      if (subSessionId) {
        const session: TestSession = {
          id: subSessionId,
          testId: sub.testId || testId,
          studentName: sub.studentName || 'Student',
          answers: sub.answers || {},
          currentQuestionIndex: 0,
          startedAt: sub.startedAt || new Date().toISOString(),
          submittedAt: sub.submittedAt || new Date().toISOString(),
          status: 'submitted',
        };
        saveSessionToHistory(session);
        updated = true;
      }
    }
    return updated;
  } catch (err) {
    console.warn('[reports] Failed to sync server submissions:', err);
    return false;
  }
}

/**
 * Formats a report submission timestamp into a clean teacher-facing format:
 * e.g. "28 Sep 2026, 16:30"
 */
export function formatReportDate(isoString?: string | null): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;

    return d.toLocaleString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return isoString;
  }
}

/**
 * Conceptually: getTestReports(testId)
 * 1. Loads the Test.
 * 2. Loads relevant TestSessions.
 * 3. Filters sessions by testId.
 * 4. Filters to submitted sessions.
 * 5. Loads matching GradingResults.
 * 6. Matches GradingResult.sessionId to TestSession.id.
 * 7. Filters out incomplete/un-graded sessions.
 * 8. Sorts by newest submitted attempt first (submittedAt desc).
 * 9. Returns report summary records.
 */
export function getTestReports(testId: string): StudentReportSummary[] {
  if (!testId || typeof testId !== 'string') {
    return [];
  }

  // 1. Verify test exists
  const test = getTestById(testId);
  if (!test) {
    return [];
  }

  // 2. Load all known sessions for this test
  const sessions = loadAllSessionsForTest(testId);

  // 3. Load all grading results for this test
  const gradingResults = loadGradingResultsByTest(testId);
  const gradingMap = new Map<string, typeof gradingResults[0]>();
  for (const gr of gradingResults) {
    if (gr.testId === testId && gr.sessionId) {
      gradingMap.set(gr.sessionId, gr);
      gradingMap.set(`grading_${gr.sessionId}`, gr);
    }
  }

  const summaries: StudentReportSummary[] = [];

  for (const session of sessions) {
    // 3 & 4. Filter by testId and status === 'submitted'
    if (session.testId !== testId || session.status !== 'submitted') {
      continue;
    }

    const sessionId =
      session.id ||
      `${session.testId}_${encodeURIComponent(session.studentName)}_${session.startedAt}`;

    // 5 & 6. Match GradingResult
    const grading = gradingMap.get(sessionId) || loadGradingResult(testId, sessionId);
    if (!grading || grading.testId !== testId) {
      // Missing or unmatched grading result - do NOT guess or display in completed list
      continue;
    }

    const totalPoints = Math.max(0, grading.totalPoints || 0);
    const earnedPoints = Math.max(0, grading.earnedPoints || 0);
    const rawPercentage = typeof grading.percentage === 'number' ? grading.percentage : 0;
    const percentage = isNaN(rawPercentage) || !isFinite(rawPercentage) ? 0 : rawPercentage;
    const hasPendingManualGrading = Boolean(
      grading.hasPendingManualGrading ||
      grading.questionResults?.some(
        (qr) => qr.status === 'pending_review' || (qr.requiresManualGrading && qr.status !== 'graded')
      )
    );

    summaries.push({
      testId,
      sessionId,
      studentName: session.studentName || 'Student',
      submittedAt: session.submittedAt || session.startedAt || new Date().toISOString(),
      earnedPoints,
      totalPoints,
      percentage,
      status: 'submitted',
      hasPendingManualGrading,
    });
  }

  // 8. Sort: newest submitted attempt first
  summaries.sort((a, b) => {
    const timeA = new Date(a.submittedAt).getTime() || 0;
    const timeB = new Date(b.submittedAt).getTime() || 0;
    return timeB - timeA;
  });

  return summaries;
}

/**
 * Conceptually: getStudentReport(testId, sessionId)
 * 1. Loads the Test.
 * 2. Loads the specific TestSession.
 * 3. Verifies session.testId === testId.
 * 4. Verifies session.status === "submitted".
 * 5. Loads the GradingResult.
 * 6. Verifies gradingResult.testId === testId.
 * 7. Verifies gradingResult.sessionId === sessionId.
 * 8. Maps questions in Test.questions order and constructs QuestionReportItem array.
 * 9. Returns the combined IndividualStudentReport data.
 */
export function getStudentReport(
  testId: string,
  sessionId: string
): IndividualStudentReport | null {
  if (!testId || !sessionId) {
    return null;
  }

  // 1. Load the Test
  const test = getTestById(testId);
  if (!test) {
    return null;
  }

  // 2. Load the specific TestSession
  const session = loadSessionById(testId, sessionId);
  if (!session) {
    return null;
  }

  // 3. Verify session.testId === testId
  if (session.testId !== testId) {
    return null;
  }

  // 4. Verify session.status === 'submitted'
  if (session.status !== 'submitted') {
    return null;
  }

  // 5. Load the GradingResult
  const gradingResult = loadGradingResult(testId, sessionId);
  if (!gradingResult) {
    return null;
  }

  // 6 & 7. Verify gradingResult matches testId and sessionId
  if (
    gradingResult.testId !== testId ||
    (gradingResult.sessionId !== sessionId && gradingResult.id !== `grading_${sessionId}`)
  ) {
    return null;
  }

  // 8. Map question results by questionId (matching Test.questions order)
  const qrMap = new Map(gradingResult.questionResults.map((qr) => [qr.questionId, qr]));

  const questionReports: QuestionReportItem[] = test.questions.map((question, index) => {
    const qr = qrMap.get(question.id);
    const studentAnswer = session.answers ? session.answers[question.id] : undefined;
    const studentAnswerText = getStudentAnswerDisplay(question, studentAnswer);
    const correctAnswerText = getCorrectAnswerDisplay(question);

    const isAnswered = studentAnswer && isQuestionAnswered(studentAnswer) && studentAnswerText !== null;

    const rawType = String(question.type || 'single-choice').replace(/-/g, '_').toLowerCase();
    const isEssayOrWriting = rawType === 'essay' || rawType === 'writing' || Boolean(question.requiresManualGrading);

    let status: 'correct' | 'incorrect' | 'not-answered' | 'pending_review';
    let earnedPoints: number | null = 0;
    const maxPoints = qr ? qr.maxPoints : Math.max(0, question.points || 0);

    if (qr?.status === 'graded' && typeof qr.earnedPoints === 'number') {
      // Manually graded by teacher!
      earnedPoints = qr.earnedPoints;
      status = qr.earnedPoints > 0 ? 'correct' : 'incorrect';
    } else if (qr?.requiresManualGrading || isEssayOrWriting) {
      status = 'pending_review';
      earnedPoints = null;
    } else if (!isAnswered || qr?.status === 'unanswered') {
      status = 'not-answered';
      earnedPoints = 0;
    } else if (qr?.isCorrect || (typeof qr?.earnedPoints === 'number' && qr.earnedPoints > 0)) {
      status = 'correct';
      earnedPoints = typeof qr?.earnedPoints === 'number' ? qr.earnedPoints : maxPoints;
    } else {
      status = 'incorrect';
      earnedPoints = typeof qr?.earnedPoints === 'number' ? qr.earnedPoints : 0;
    }

    return {
      questionNumber: index + 1,
      question,
      questionResult: qr,
      studentAnswer,
      studentAnswerText,
      correctAnswerText,
      earnedPoints,
      maxPoints,
      status,
    };
  });

  return {
    test,
    session,
    gradingResult,
    questionReports,
  };
}

/**
 * Saves or updates manual grading for an Essay or Writing question.
 *
 * Requirements:
 * 1. Score must be between 0 and the question's maximum points.
 * 2. Saves with the student's submission / gradingResult.
 * 3. Updates student's total score / result immediately.
 * 4. Persists after refresh.
 * 5. Appears correctly in reports / results.
 */
export async function saveManualGrade(
  testId: string,
  sessionId: string,
  questionId: string,
  score: number,
  feedback?: string
): Promise<IndividualStudentReport | null> {
  if (!testId || !sessionId || !questionId) return null;

  const gradingResult = loadGradingResult(testId, sessionId);
  if (!gradingResult) return null;

  const test = getTestById(testId);
  const question = test?.questions.find((q) => q.id === questionId);
  const maxPoints = question ? Math.max(0, question.points || 0) : 1;

  // Score must be between 0 and question's maximum points
  const validatedScore = Math.max(0, Math.min(maxPoints, Number(score) || 0));

  // Find or create QuestionGradingResult
  let qr = gradingResult.questionResults.find((r) => r.questionId === questionId);
  if (!qr) {
    qr = {
      questionId,
      earnedPoints: validatedScore,
      maxPoints,
      isCorrect: validatedScore > 0,
      requiresManualGrading: false,
      status: 'graded',
      feedback: feedback ? feedback.trim() : undefined,
      gradedAt: new Date().toISOString(),
    };
    gradingResult.questionResults.push(qr);
  } else {
    qr.earnedPoints = validatedScore;
    qr.maxPoints = maxPoints;
    qr.isCorrect = validatedScore > 0;
    qr.requiresManualGrading = false;
    qr.status = 'graded';
    if (feedback !== undefined) {
      qr.feedback = feedback.trim();
    }
    qr.gradedAt = new Date().toISOString();
  }

  // Recalculate student's total points, earned points, and percentage
  let newEarned = 0;
  let newTotal = 0;
  let pendingCount = 0;

  for (const item of gradingResult.questionResults) {
    newTotal += item.maxPoints;
    if (item.status === 'pending_review' || (item.requiresManualGrading && item.status !== 'graded')) {
      pendingCount++;
    } else if (typeof item.earnedPoints === 'number') {
      newEarned += item.earnedPoints;
    }
  }

  gradingResult.earnedPoints = newEarned;
  gradingResult.totalPoints = newTotal;
  gradingResult.percentage = newTotal > 0 ? Math.round((newEarned / newTotal) * 10000) / 100 : 0;
  gradingResult.hasPendingManualGrading = pendingCount > 0;
  gradingResult.pendingReviewCount = pendingCount;
  gradingResult.gradedAt = new Date().toISOString();

  // Save to localStorage immediately
  saveGradingResult(gradingResult);

  // Sync to server if backend is reachable
  try {
    await fetch(`/api/tests/${encodeURIComponent(testId)}/submissions/${encodeURIComponent(sessionId)}/grade`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId,
        earnedPoints: validatedScore,
        feedback: qr.feedback,
        gradingResult,
      }),
    });
  } catch (err) {
    console.warn('[reports] Server grade update failed, local copy saved:', err);
  }

  // Dispatch event so any parent / listening view updates immediately
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('assessora_results_updated', {
        detail: { testId, sessionId, questionId, score: validatedScore },
      })
    );
  }

  return getStudentReport(testId, sessionId);
}

/**
 * MODULE 14: Clears all student submissions and results for a specific test.
 * Calls backend API to remove server-authoritative submission records,
 * and clears client-side cache and historical sessions.
 */
export async function clearAllStudentResults(
  testId: string
): Promise<{ success: boolean; clearedCount: number; error?: string }> {
  if (!testId) {
    return { success: false, clearedCount: 0, error: 'Invalid testId' };
  }

  try {
    const res = await fetch(`/api/tests/${encodeURIComponent(testId)}/submissions`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      let errMsg = 'Failed to clear student results on server';
      try {
        const errJson = await res.json();
        if (errJson?.error) errMsg = errJson.error;
      } catch {
        // fallback
      }
      return { success: false, clearedCount: 0, error: errMsg };
    }

    const data = await res.json().catch(() => ({ clearedCount: 0 }));
    const count = typeof data?.clearedCount === 'number' ? data.clearedCount : 0;

    // Purge local storage and session storage
    deleteGradingResultsForTest(testId);
    clearAllSessionsForTest(testId);

    // Notify any listening components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('assessora_results_cleared', {
          detail: { testId, clearedCount: count },
        })
      );
    }

    return { success: true, clearedCount: count };
  } catch (err: any) {
    console.error('[reports] Network error clearing student results:', err);
    return {
      success: false,
      clearedCount: 0,
      error: 'Network error communicating with server. Please try again.',
    };
  }
}

/**
 * MODULE 14: Clears an individual student result from a test by session ID.
 * Purges local session history, active session, and grading result,
 * and notifies server to delete the authoritative submission record.
 */
export async function clearIndividualStudentResult(
  testId: string,
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  if (!testId || !sessionId) {
    return { success: false, error: 'Invalid testId or sessionId' };
  }

  // 1. Purge local storage, session storage, and active session cache immediately
  try {
    deleteGradingResultForSession(testId, sessionId);
    deleteSessionFromHistory(testId, sessionId);
  } catch (err) {
    console.warn('[reports] Error purging local storage for session:', err);
  }

  // 2. Notify backend server to remove the submission record
  try {
    const res = await fetch(
      `/api/tests/${encodeURIComponent(testId)}/submissions/${encodeURIComponent(sessionId)}`,
      { method: 'DELETE' }
    );

    if (!res.ok && res.status !== 404) {
      console.warn('[reports] Non-critical server delete response status:', res.status);
    }
  } catch (err: any) {
    console.warn('[reports] Network notice deleting submission on server:', err);
  }

  // 3. Dispatch global event to notify active views (ReportsList, TestList, etc.)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('assessora_results_cleared', {
        detail: { testId, sessionId },
      })
    );
  }

  return { success: true };
}
