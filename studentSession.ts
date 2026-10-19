/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Test, Question } from '../types/test';
import {
  TestSession,
  TestSessionStatus,
  SessionTimerState,
  StudentAnswer,
  StudentSingleChoiceAnswer,
  StudentMultipleChoiceAnswer,
  StudentTrueFalseAnswer,
  StudentShortAnswer,
  StudentFillBlankAnswer,
  StudentMatchingAnswer,
  StudentOrderingAnswer,
  StudentEssayAnswer,
  StudentWritingAnswer,
  isQuestionAnswered,
} from '../types/student';
import { createSessionId } from './id';

const SESSION_STORAGE_PREFIX = 'assessora_student_session_';
export const SESSION_HISTORY_PREFIX = 'assessora_student_history_';

/**
 * Initializes a new TestSession for a student.
 * If the test has timeLimitEnabled, initializes timer with absolute expiresAt.
 */
export function createTestSession(
  testId: string,
  studentName: string,
  test?: Test | null
): TestSession {
  const trimmedName = studentName.trim() || 'Student';
  const startedAt = new Date().toISOString();
  const id = createSessionId();

  let timerState: SessionTimerState;
  const isTimed = Boolean(
    test?.settings?.timeLimitEnabled &&
      typeof test?.settings?.timeLimitMinutes === 'number' &&
      test.settings.timeLimitMinutes > 0
  );

  if (isTimed && test?.settings?.timeLimitMinutes) {
    const durationSeconds = Math.round(test.settings.timeLimitMinutes * 60);
    const expiresAt = new Date(Date.now() + durationSeconds * 1000).toISOString();
    timerState = {
      enabled: true,
      durationSeconds,
      expiresAt,
      status: 'running',
    };
  } else {
    timerState = {
      enabled: false,
      durationSeconds: 0,
      expiresAt: null,
      status: 'running',
    };
  }

  return {
    id,
    testId,
    studentName: trimmedName,
    answers: {},
    currentQuestionIndex: 0,
    startedAt,
    timer: timerState,
    status: 'active',
    submittedAt: null,
  };
}

function isValidTimestamp(val: unknown): val is string {
  if (typeof val !== 'string' || !val.trim()) return false;
  const time = new Date(val).getTime();
  return !isNaN(time);
}

/**
 * Validates and sanitizes a raw session object against a Test entity.
 * Guarantees no corrupt or stale references can crash the UI.
 */
export function validateAndSanitizeSession(
  raw: unknown,
  test?: Test | null
): TestSession | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const rawObj = raw as Record<string, unknown>;

  // 1. testId validation
  if (typeof rawObj.testId !== 'string' || !rawObj.testId) {
    return null;
  }

  if (test && rawObj.testId !== test.id) {
    return null;
  }

  // 2. studentName validation (must be non-empty string)
  if (typeof rawObj.studentName !== 'string') {
    return null;
  }
  const studentName = rawObj.studentName.trim();
  if (!studentName) {
    return null;
  }

  // 3. startedAt validation
  const startedAt =
    isValidTimestamp(rawObj.startedAt)
      ? rawObj.startedAt
      : new Date().toISOString();

  // 4. currentQuestionIndex validation
  let currentQuestionIndex = 0;
  if (
    typeof rawObj.currentQuestionIndex === 'number' &&
    Number.isInteger(rawObj.currentQuestionIndex) &&
    rawObj.currentQuestionIndex >= 0
  ) {
    currentQuestionIndex = rawObj.currentQuestionIndex;
  }

  if (test && test.questions.length > 0) {
    if (currentQuestionIndex >= test.questions.length) {
      currentQuestionIndex = test.questions.length - 1;
    }
  } else if (test && test.questions.length === 0) {
    currentQuestionIndex = 0;
  }

  // 5. answers validation & sanitization
  const rawAnswers = rawObj.answers;
  const sanitizedAnswers: Record<string, StudentAnswer> = {};

  if (rawAnswers && typeof rawAnswers === 'object' && !Array.isArray(rawAnswers)) {
    const answersObj = rawAnswers as Record<string, unknown>;

    // Map existing questions and their options if test is provided
    const questionMap = new Map<string, Question>();
    if (test) {
      for (const q of test.questions) {
        questionMap.set(q.id, q);
      }
    }

    for (const [qId, ansVal] of Object.entries(answersObj)) {
      if (!ansVal || typeof ansVal !== 'object' || Array.isArray(ansVal)) {
        continue;
      }

      // If test is provided, ensure question exists in current test
      if (test && !questionMap.has(qId)) {
        continue; // Drop stale question reference
      }

      const q = test ? questionMap.get(qId) : undefined;
      const rawAns = ansVal as Record<string, unknown>;
      const ansType = rawAns.type;

      // 1. Multiple Choice / Single Option
      if (
        ansType === 'multiple_choice' ||
        ansType === 'single-choice' ||
        ansType === 'single_choice' ||
        (!ansType && typeof rawAns.optionId === 'string' && !Array.isArray(rawAns.optionIds))
      ) {
        if (typeof rawAns.optionId === 'string' && rawAns.optionId) {
          // If question options exist, verify optionId is valid
          if (q && q.options) {
            const optionExists = q.options.some((opt) => opt.id === rawAns.optionId);
            if (!optionExists) {
              continue; // Option was deleted/modified in editor
            }
          }
          sanitizedAnswers[qId] = {
            type: ansType === 'single-choice' ? 'single-choice' : 'multiple_choice',
            optionId: rawAns.optionId,
          } as StudentSingleChoiceAnswer;
        }
      }
      // 2. Multiple Select / Multiple Options
      else if (
        ansType === 'multiple_select' ||
        ansType === 'multiple-choice' ||
        ansType === 'multiple-select' ||
        (!ansType && Array.isArray(rawAns.optionIds))
      ) {
        if (Array.isArray(rawAns.optionIds)) {
          let validOptionIds = rawAns.optionIds.filter(
            (id): id is string => typeof id === 'string' && id.length > 0
          );
          if (q && q.options) {
            const availableIds = new Set(q.options.map((opt) => opt.id));
            validOptionIds = validOptionIds.filter((id) => availableIds.has(id));
          }
          sanitizedAnswers[qId] = {
            type: ansType === 'multiple-choice' ? 'multiple-choice' : 'multiple_select',
            optionIds: validOptionIds,
          } as StudentMultipleChoiceAnswer;
        }
      }
      // 3. True / False
      else if (
        ansType === 'true_false' ||
        ansType === 'true-false' ||
        (!ansType && typeof rawAns.value === 'boolean')
      ) {
        if (typeof rawAns.value === 'boolean') {
          sanitizedAnswers[qId] = {
            type: ansType === 'true-false' ? 'true-false' : 'true_false',
            value: rawAns.value,
          } as StudentTrueFalseAnswer;
        }
      }
      // 4. Short Answer
      else if (
        ansType === 'short_answer' ||
        ansType === 'short-answer' ||
        (!ansType && typeof rawAns.value === 'string' && q?.type === 'short_answer')
      ) {
        if (typeof rawAns.value === 'string') {
          sanitizedAnswers[qId] = {
            type: ansType === 'short-answer' ? 'short-answer' : 'short_answer',
            value: rawAns.value,
          } as StudentShortAnswer;
        }
      }
      // 5. Essay
      else if (ansType === 'essay' || (!ansType && typeof rawAns.text === 'string' && q?.type === 'essay')) {
        if (typeof rawAns.text === 'string') {
          sanitizedAnswers[qId] = {
            type: 'essay',
            text: rawAns.text, // preserves all line breaks, paragraphs, and spacing
          } as StudentEssayAnswer;
        }
      }
      // 6. Writing
      else if (ansType === 'writing' || (!ansType && typeof rawAns.text === 'string' && q?.type === 'writing')) {
        if (typeof rawAns.text === 'string') {
          sanitizedAnswers[qId] = {
            type: 'writing',
            text: rawAns.text, // preserves all line breaks, paragraphs, and spacing
          } as StudentWritingAnswer;
        }
      }
      // 7. Fill in the Blank
      else if (
        ansType === 'fill_blank' ||
        ansType === 'fill-blank' ||
        (!ansType && rawAns.answers && typeof rawAns.answers === 'object')
      ) {
        if (rawAns.answers && typeof rawAns.answers === 'object') {
          sanitizedAnswers[qId] = {
            type: 'fill_blank',
            answers: rawAns.answers as Record<string, string>,
          } as StudentFillBlankAnswer;
        }
      }
      // 8. Matching
      else if (
        ansType === 'matching' ||
        (!ansType && rawAns.matches && typeof rawAns.matches === 'object')
      ) {
        if (rawAns.matches && typeof rawAns.matches === 'object') {
          sanitizedAnswers[qId] = {
            type: 'matching',
            matches: rawAns.matches as Record<string, string>,
          } as StudentMatchingAnswer;
        }
      }
      // 9. Ordering
      else if (
        ansType === 'ordering' ||
        (!ansType && Array.isArray(rawAns.orderedIds))
      ) {
        if (Array.isArray(rawAns.orderedIds)) {
          sanitizedAnswers[qId] = {
            type: 'ordering',
            orderedIds: rawAns.orderedIds as string[],
          } as StudentOrderingAnswer;
        }
      }
    }
  }

  // 6. timer validation & sanitization
  let sanitizedTimer: SessionTimerState;
  const isTimedInTest = Boolean(
    test?.settings?.timeLimitEnabled &&
      typeof test?.settings?.timeLimitMinutes === 'number' &&
      test.settings.timeLimitMinutes > 0
  );

  const rawTimer = rawObj.timer as Record<string, unknown> | undefined;

  // RULE: Current Test Settings are ALWAYS the authoritative source of truth.
  // If the test exists and is untimed (timeLimitEnabled !== true),
  // ANY previously stored timer data in sessionStorage MUST be completely ignored and disabled.
  if (test && !isTimedInTest) {
    sanitizedTimer = {
      enabled: false,
      durationSeconds: 0,
      expiresAt: null,
      status: 'running',
    };
  } else if (isTimedInTest && test?.settings?.timeLimitMinutes) {
    const defaultDuration = Math.round(test.settings.timeLimitMinutes * 60);

    const durationSeconds =
      rawTimer &&
      typeof rawTimer.durationSeconds === 'number' &&
      rawTimer.durationSeconds > 0
        ? rawTimer.durationSeconds
        : defaultDuration;

    let expiresAt: string;
    let isExpired = false;

    // Strict validation of rawTimer.expiresAt: must be string and valid parseable timestamp
    if (rawTimer && isValidTimestamp(rawTimer.expiresAt)) {
      expiresAt = rawTimer.expiresAt;
      const remainingMs = new Date(expiresAt).getTime() - Date.now();
      isExpired = rawTimer.status === 'expired' || remainingMs <= 0;
    } else {
      // If raw expiresAt is invalid (e.g. "banana", "", null, undefined),
      // fail safely without crashing. Never invent additional time.
      if (isValidTimestamp(rawObj.startedAt)) {
        const startedTime = new Date(rawObj.startedAt).getTime();
        const reconstructedExpiresAt = new Date(
          startedTime + durationSeconds * 1000
        ).toISOString();
        const remainingMs = new Date(reconstructedExpiresAt).getTime() - Date.now();
        expiresAt = reconstructedExpiresAt;
        isExpired = (rawTimer && rawTimer.status === 'expired') || remainingMs <= 0;
      } else {
        // Both startedAt and expiresAt are missing or invalid! Fail safely by expiring immediately
        expiresAt = new Date().toISOString();
        isExpired = true;
      }
    }

    sanitizedTimer = {
      enabled: true,
      durationSeconds,
      expiresAt,
      status: isExpired ? 'expired' : 'running',
    };
  } else {
    // Test object not provided or fallback: check rawTimer with strict timestamp check
    if (
      !test &&
      rawTimer &&
      rawTimer.enabled === true &&
      isValidTimestamp(rawTimer.expiresAt)
    ) {
      const remainingMs = new Date(rawTimer.expiresAt).getTime() - Date.now();
      const isExpired = rawTimer.status === 'expired' || remainingMs <= 0;
      sanitizedTimer = {
        enabled: true,
        durationSeconds:
          typeof rawTimer.durationSeconds === 'number' && rawTimer.durationSeconds > 0
            ? rawTimer.durationSeconds
            : 0,
        expiresAt: rawTimer.expiresAt,
        status: isExpired ? 'expired' : 'running',
      };
    } else {
      sanitizedTimer = {
        enabled: false,
        durationSeconds: 0,
        expiresAt: null,
        status: 'running',
      };
    }
  }

  // 7. session status & submittedAt validation
  let status: TestSessionStatus = 'active';
  let submittedAt: string | null = null;

  if (rawObj.status === 'submitted') {
    status = 'submitted';
    submittedAt = isValidTimestamp(rawObj.submittedAt)
      ? (rawObj.submittedAt as string)
      : new Date().toISOString();
  } else if (sanitizedTimer.status === 'expired' || rawObj.status === 'expired') {
    status = 'expired';
    submittedAt = null;
  } else {
    status = 'active';
    submittedAt = null;
  }

  const id =
    typeof rawObj.id === 'string' && rawObj.id.trim()
      ? rawObj.id.trim()
      : undefined;

  return {
    id,
    testId: rawObj.testId as string,
    studentName,
    answers: sanitizedAnswers,
    currentQuestionIndex,
    startedAt,
    timer: sanitizedTimer,
    status,
    submittedAt,
  };
}

/**
 * Saves a session record into sessionStorage history and localStorage.
 */
export function saveSessionToHistory(session: TestSession): void {
  if (!session || !session.testId) return;
  try {
    const sessionId = session.id || `${session.testId}_${session.startedAt}`;
    const serialized = JSON.stringify(session);

    // 1. Write to sessionStorage
    try {
      sessionStorage.setItem(
        `${SESSION_HISTORY_PREFIX}${sessionId}`,
        serialized
      );

      // Maintain index of historical sessions for this testId
      const indexKey = `${SESSION_HISTORY_PREFIX}list_${session.testId}`;
      const rawIndex = sessionStorage.getItem(indexKey);
      const list: string[] = rawIndex ? JSON.parse(rawIndex) : [];
      if (!list.includes(sessionId)) {
        list.push(sessionId);
        sessionStorage.setItem(indexKey, JSON.stringify(list));
      }
    } catch {
      // Storage quota or error safe
    }

    // 2. Write to localStorage for teacher reporting cross-session/cross-tab persistence
    try {
      localStorage.setItem(
        `${SESSION_HISTORY_PREFIX}${sessionId}`,
        serialized
      );
      const indexKey = `${SESSION_HISTORY_PREFIX}list_${session.testId}`;
      const rawLocalIndex = localStorage.getItem(indexKey);
      const localList: string[] = rawLocalIndex ? JSON.parse(rawLocalIndex) : [];
      if (!localList.includes(sessionId)) {
        localList.push(sessionId);
        localStorage.setItem(indexKey, JSON.stringify(localList));
      }
    } catch {
      // Storage quota or error safe
    }
  } catch {
    // Storage quota or error safe
  }
}

/**
 * Loads a historical session from history by session ID (checks sessionStorage then localStorage).
 */
export function loadHistoricalSession(sessionId: string): TestSession | null {
  try {
    let raw = sessionStorage.getItem(`${SESSION_HISTORY_PREFIX}${sessionId}`);
    if (!raw) {
      raw = localStorage.getItem(`${SESSION_HISTORY_PREFIX}${sessionId}`);
    }
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Loads all known sessions (both active and historical) for a given test ID.
 */
export function loadAllSessionsForTest(testId: string): TestSession[] {
  const sessionsMap = new Map<string, TestSession>();

  const tryAdd = (raw: string | null) => {
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.testId === testId) {
        const id = parsed.id || `${parsed.testId}_${parsed.startedAt}`;
        if (!sessionsMap.has(id)) {
          sessionsMap.set(id, parsed as TestSession);
        }
      }
    } catch {
      // Ignore invalid JSON
    }
  };

  const indexKey = `${SESSION_HISTORY_PREFIX}list_${testId}`;

  // 1. From sessionStorage index
  try {
    const rawIndex = sessionStorage.getItem(indexKey);
    if (rawIndex) {
      const list: string[] = JSON.parse(rawIndex);
      for (const sId of list) {
        tryAdd(sessionStorage.getItem(`${SESSION_HISTORY_PREFIX}${sId}`));
      }
    }
  } catch {
    // Ignore
  }

  // 2. From localStorage index
  try {
    const rawLocalIndex = localStorage.getItem(indexKey);
    if (rawLocalIndex) {
      const list: string[] = JSON.parse(rawLocalIndex);
      for (const sId of list) {
        tryAdd(localStorage.getItem(`${SESSION_HISTORY_PREFIX}${sId}`));
      }
    }
  } catch {
    // Ignore
  }

  // 3. From active sessionStorage for this test
  try {
    tryAdd(sessionStorage.getItem(`${SESSION_STORAGE_PREFIX}${testId}`));
  } catch {
    // Ignore
  }

  return Array.from(sessionsMap.values());
}

/**
 * Loads a specific session for a test by ID.
 */
export function loadSessionById(testId: string, sessionId: string): TestSession | null {
  const fromHistory = loadHistoricalSession(sessionId);
  if (fromHistory && fromHistory.testId === testId) {
    return fromHistory;
  }
  const all = loadAllSessionsForTest(testId);
  return all.find((s) => s.id === sessionId || `${s.testId}_${s.startedAt}` === sessionId) || null;
}

/**
 * Archives any existing active/submitted session for this test into history.
 */
export function archiveExistingSessionToHistory(testId: string): void {
  try {
    const raw = sessionStorage.getItem(`${SESSION_STORAGE_PREFIX}${testId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        saveSessionToHistory(parsed as TestSession);
      }
    }
  } catch {
    // Ignore
  }
}

/**
 * Starts a fresh student test session from the teacher side ("View as Student").
 * 1. Archives any existing session for this test to history (preserving submitted/past data).
 * 2. Creates a completely fresh active session:
 *    - Starts at question index 0
 *    - Has no previous answers ({})
 *    - Has status: "active"
 *    - Has fresh startedAt timestamp
 *    - Initializes timer from current test settings with fresh expiration time
 *    - Has a unique session identity (id)
 * 3. Saves it to sessionStorage as the active session.
 */
export function startFreshStudentSession(
  test: Test,
  studentName: string = 'Student'
): TestSession {
  archiveExistingSessionToHistory(test.id);

  const fresh = createTestSession(test.id, studentName, test);
  saveActiveStudentSession(fresh);
  return fresh;
}

/**
 * Permanently submits a TestSession.
 * Transitions status from 'active' or 'expired' to 'submitted'.
 * Guarantees a session cannot be submitted twice.
 */
export function submitTestSession(session: TestSession): TestSession {
  if (session.status === 'submitted') {
    return session;
  }
  const submittedSession: TestSession = {
    ...session,
    status: 'submitted',
    submittedAt: new Date().toISOString(),
  };
  // Preserve submitted session in history
  saveSessionToHistory(submittedSession);
  return submittedSession;
}

export interface SubmitValidationResult {
  canSubmit: boolean;
  unansweredCount: number;
  totalQuestions: number;
  answeredCount: number;
  reason?: string;
}

/**
 * Validates whether the student session can be submitted based on test settings.
 * Respects settings.requireAllQuestions (unless the test has expired).
 */
export function canSubmitSession(
  session: TestSession,
  test: Test
): SubmitValidationResult {
  const totalQuestions = test.questions.length;
  const answeredCount = test.questions.filter((q) =>
    isQuestionAnswered(session.answers[q.id])
  ).length;
  const unansweredCount = Math.max(0, totalQuestions - answeredCount);

  if (session.status === 'submitted') {
    return {
      canSubmit: false,
      unansweredCount,
      totalQuestions,
      answeredCount,
      reason: 'This assessment has already been submitted.',
    };
  }

  const isExpired =
    session.status === 'expired' || session.timer?.status === 'expired';

  // If active and requireAllQuestions is true, block submission if any question is unanswered
  if (!isExpired && test.settings?.requireAllQuestions && unansweredCount > 0) {
    return {
      canSubmit: false,
      unansweredCount,
      totalQuestions,
      answeredCount,
      reason: `All questions must be answered before submitting. ${unansweredCount} question${
        unansweredCount === 1 ? '' : 's'
      } remain unanswered.`,
    };
  }

  return {
    canSubmit: true,
    unansweredCount,
    totalQuestions,
    answeredCount,
  };
}

/**
 * Loads a temporarily active session from sessionStorage for page refresh resilience.
 * Validates and sanitizes against the provided test.
 */
export function loadActiveStudentSession(
  testOrId: Test | string,
  testEntity?: Test | null
): TestSession | null {
  try {
    const testId = typeof testOrId === 'string' ? testOrId : testOrId.id;
    const test = typeof testOrId === 'object' ? testOrId : testEntity || null;

    const raw = sessionStorage.getItem(`${SESSION_STORAGE_PREFIX}${testId}`);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const sanitized = validateAndSanitizeSession(parsed, test);

    if (!sanitized) {
      // Discard invalid / malformed session data
      sessionStorage.removeItem(`${SESSION_STORAGE_PREFIX}${testId}`);
      return null;
    }

    return sanitized;
  } catch {
    return null;
  }
}

/**
 * Saves the current active student session into sessionStorage.
 */
export function saveActiveStudentSession(session: TestSession): void {
  try {
    sessionStorage.setItem(
      `${SESSION_STORAGE_PREFIX}${session.testId}`,
      JSON.stringify(session)
    );
  } catch {
    // Session storage write failure (e.g. storage quota in private mode)
  }
}

/**
 * Clears the temporary session from sessionStorage when the student leaves or restarts.
 */
export function clearActiveStudentSession(testId: string): void {
  try {
    sessionStorage.removeItem(`${SESSION_STORAGE_PREFIX}${testId}`);
  } catch {
    // Ignore
  }
}

/**
 * MODULE 14: Clears all student sessions (active and historical) for a specific test.
 */
export function clearAllSessionsForTest(testId: string): void {
  clearActiveStudentSession(testId);

  const indexKey = `${SESSION_HISTORY_PREFIX}list_${testId}`;

  // Helper to remove sessions given a list of IDs from storage
  const cleanStorage = (storage: Storage) => {
    try {
      const raw = storage.getItem(indexKey);
      if (raw) {
        const list: string[] = JSON.parse(raw);
        if (Array.isArray(list)) {
          for (const sId of list) {
            storage.removeItem(`${SESSION_HISTORY_PREFIX}${sId}`);
          }
        }
      }
      storage.removeItem(indexKey);
    } catch {
      // Ignore
    }
  };

  cleanStorage(sessionStorage);
  cleanStorage(localStorage);
}

/**
 * MODULE 14: Removes an individual session from history by test ID and session ID.
 * Completely cleans keys, indexes, active sessions, and loose session entries.
 */
export function deleteSessionFromHistory(testId: string, sessionId: string): void {
  if (!sessionId) return;
  const indexKey = `${SESSION_HISTORY_PREFIX}list_${testId}`;
  const cleanId = decodeURIComponent(sessionId).trim();

  const cleanStorage = (storage: Storage) => {
    try {
      // 1. Direct key removals
      storage.removeItem(`${SESSION_HISTORY_PREFIX}${sessionId}`);
      storage.removeItem(`${SESSION_HISTORY_PREFIX}${cleanId}`);

      // 2. Scan index list and remove matching entries
      const raw = storage.getItem(indexKey);
      if (raw) {
        const list: string[] = JSON.parse(raw);
        if (Array.isArray(list)) {
          const updatedList: string[] = [];
          for (const sId of list) {
            let shouldDelete = sId === sessionId || sId === cleanId;
            const sessionRaw = storage.getItem(`${SESSION_HISTORY_PREFIX}${sId}`);
            if (sessionRaw && !shouldDelete) {
              try {
                const s = JSON.parse(sessionRaw);
                if (
                  s &&
                  (s.id === sessionId ||
                    s.id === cleanId ||
                    `${s.testId}_${encodeURIComponent(s.studentName || '')}_${s.startedAt}` === sessionId ||
                    `${s.testId}_${s.studentName || ''}_${s.startedAt}` === cleanId ||
                    `${s.testId}_${s.startedAt}` === sessionId ||
                    `${s.testId}_${s.startedAt}` === cleanId)
                ) {
                  shouldDelete = true;
                }
              } catch {
                // Ignore
              }
            }

            if (shouldDelete) {
              storage.removeItem(`${SESSION_HISTORY_PREFIX}${sId}`);
            } else {
              updatedList.push(sId);
            }
          }
          storage.setItem(indexKey, JSON.stringify(updatedList));
        }
      }

      // 3. Scan all keys in storage for matching session history entries
      const keysToRemove: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (k && k.startsWith(SESSION_HISTORY_PREFIX) && k !== indexKey) {
          const itemRaw = storage.getItem(k);
          if (itemRaw) {
            try {
              const parsed = JSON.parse(itemRaw);
              if (
                parsed &&
                (parsed.id === sessionId ||
                  parsed.id === cleanId ||
                  (parsed.testId === testId &&
                    (`${parsed.testId}_${encodeURIComponent(parsed.studentName || '')}_${parsed.startedAt}` === sessionId ||
                      `${parsed.testId}_${parsed.startedAt}` === sessionId ||
                      `${parsed.testId}_${parsed.startedAt}` === cleanId)))
              ) {
                keysToRemove.push(k);
              }
            } catch {
              // Ignore
            }
          }
        }
      }
      for (const k of keysToRemove) {
        storage.removeItem(k);
      }
    } catch {
      // Ignore
    }
  };

  cleanStorage(sessionStorage);
  cleanStorage(localStorage);

  // 4. Remove active session from sessionStorage if it matches this session
  try {
    const activeKey = `${SESSION_STORAGE_PREFIX}${testId}`;
    const activeRaw = sessionStorage.getItem(activeKey);
    if (activeRaw) {
      const active = JSON.parse(activeRaw);
      if (
        active &&
        (active.id === sessionId ||
          active.id === cleanId ||
          `${active.testId}_${encodeURIComponent(active.studentName || '')}_${active.startedAt}` === sessionId ||
          `${active.testId}_${active.startedAt}` === sessionId ||
          `${active.testId}_${active.startedAt}` === cleanId)
      ) {
        sessionStorage.removeItem(activeKey);
      }
    }
  } catch {
    // Ignore
  }
}
