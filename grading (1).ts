/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Test, Question } from '../types/test';
import { TestSession, StudentAnswer, isQuestionAnswered } from '../types/student';
import { GradingResult, QuestionGradingResult } from '../types/grading';

/**
 * Extracts the expected boolean for a true-false question based on question definition.
 */
export function getTrueFalseExpectedValue(question: Question): boolean | null {
  const rawQ = question as unknown as Record<string, unknown>;
  if (typeof rawQ.correctAnswer === 'boolean') {
    return rawQ.correctAnswer;
  }

  if (!question.options || question.options.length === 0) {
    return null;
  }

  const correctOption = question.options.find((opt) => opt.isCorrect);
  if (!correctOption) {
    return null;
  }

  const text = (correctOption.text || '').trim().toLowerCase();
  if (text === 'true' || text === 't' || text === 'yes' || text === '1') {
    return true;
  }
  if (text === 'false' || text === 'f' || text === 'no' || text === '0') {
    return false;
  }

  // Fallback check on option id
  const optId = correctOption.id.toLowerCase();
  if (optId.includes('true')) return true;
  if (optId.includes('false')) return false;

  return null;
}

/**
 * Grades a single question against the student's answer.
 * Pure function: does not mutate question or answer.
 * Returns QuestionGradingResult with { questionId, earnedPoints, maxPoints, isCorrect, requiresManualGrading?, status? }.
 */
export function gradeQuestion(
  question: Question,
  studentAnswer?: StudentAnswer
): QuestionGradingResult {
  const maxPoints = Math.max(0, typeof question.points === 'number' && !isNaN(question.points) ? question.points : 0);

  // Normalization of question type
  const rawType = String(question.type || 'single-choice').replace(/-/g, '_').toLowerCase();

  // ----------------------------------------------------
  // 1. UNANSWERED QUESTIONS
  // When a question has no valid student answer:
  // - earnedPoints = 0
  // - isCorrect = null
  // - status = 'unanswered'
  // (Do NOT use isCorrect: false for unanswered questions)
  // ----------------------------------------------------
  if (!studentAnswer || !isQuestionAnswered(studentAnswer)) {
    return {
      questionId: question.id,
      earnedPoints: 0,
      maxPoints,
      isCorrect: null,
      status: 'unanswered',
    };
  }

  // ----------------------------------------------------
  // 2. MANUAL GRADING TYPES: ESSAY & WRITING
  // ----------------------------------------------------
  if (rawType === 'essay' || rawType === 'writing') {
    return {
      questionId: question.id,
      earnedPoints: null,
      maxPoints,
      isCorrect: null,
      requiresManualGrading: true,
      status: 'pending_review',
    };
  }

  let isCorrect = false;

  switch (rawType) {
    // ----------------------------------------------------
    // 1. MULTIPLE CHOICE (Single Option Selection)
    // ----------------------------------------------------
    case 'multiple_choice':
    case 'single_choice': {
      let selectedOptionId = '';
      if (studentAnswer.type === 'single-choice' || studentAnswer.type === 'multiple_choice') {
        selectedOptionId = studentAnswer.optionId;
      }

      if (selectedOptionId) {
        const options = question.options || [];
        const optionExists = options.some((opt) => opt.id === selectedOptionId);
        const correctOption = options.find((opt) => opt.isCorrect);

        if (optionExists && correctOption && selectedOptionId === correctOption.id) {
          isCorrect = true;
        }
      }
      break;
    }

    // ----------------------------------------------------
    // 2. MULTIPLE SELECT (Multi Option Selection)
    // ----------------------------------------------------
    case 'multiple_select': {
      let selectedOptionIds: string[] = [];
      if (studentAnswer.type === 'multiple-choice' || studentAnswer.type === 'multiple_select') {
        selectedOptionIds = studentAnswer.optionIds || [];
      }

      if (Array.isArray(selectedOptionIds) && selectedOptionIds.length > 0) {
        const options = question.options || [];
        const existingOptionIds = new Set(options.map((opt) => opt.id));
        const correctOptionIds = new Set(
          options.filter((opt) => opt.isCorrect).map((opt) => opt.id)
        );

        if (correctOptionIds.size > 0) {
          const allOptionsExist = selectedOptionIds.every((id) =>
            existingOptionIds.has(id)
          );

          if (allOptionsExist) {
            const studentIdsSet = new Set(selectedOptionIds);
            // Exact set match: same size and every student id is in correct set
            if (
              studentIdsSet.size === correctOptionIds.size &&
              selectedOptionIds.every((id) => correctOptionIds.has(id))
            ) {
              isCorrect = true;
            }
          }
        }
      }
      break;
    }

    // ----------------------------------------------------
    // 3. TRUE / FALSE
    // ----------------------------------------------------
    case 'true_false': {
      if (
        (studentAnswer.type === 'true-false' || studentAnswer.type === 'true_false') &&
        typeof studentAnswer.value === 'boolean'
      ) {
        const expected = getTrueFalseExpectedValue(question);
        if (expected !== null && studentAnswer.value === expected) {
          isCorrect = true;
        }
      }
      break;
    }

    // ----------------------------------------------------
    // 4. SHORT ANSWER
    // ----------------------------------------------------
    case 'short_answer': {
      if (
        (studentAnswer.type === 'short-answer' || studentAnswer.type === 'short_answer') &&
        typeof studentAnswer.value === 'string'
      ) {
        const cleanedStudent = studentAnswer.value.trim().toLowerCase();
        const accepted = question.acceptedAnswers || [];

        if (cleanedStudent.length > 0 && accepted.length > 0) {
          isCorrect = accepted.some(
            (ans) => String(ans || '').trim().toLowerCase() === cleanedStudent
          );
        }
      }
      break;
    }

    // ----------------------------------------------------
    // 5. FILL IN THE BLANK
    // ----------------------------------------------------
    case 'fill_blank': {
      if (studentAnswer.type === 'fill_blank' && typeof studentAnswer.answers === 'object' && studentAnswer.answers !== null) {
        const blanks = question.blanks || [];
        if (blanks.length > 0) {
          // Every blank must match one of its accepted answers (trimmed, case-insensitive)
          const allBlanksCorrect = blanks.every((blank) => {
            const studentVal = String(studentAnswer.answers[blank.id] || '').trim().toLowerCase();
            if (!studentVal) return false;
            const accepted = blank.acceptedAnswers || [];
            return accepted.some(
              (ans) => String(ans || '').trim().toLowerCase() === studentVal
            );
          });
          isCorrect = allBlanksCorrect;
        }
      }
      break;
    }

    // ----------------------------------------------------
    // 6. MATCHING
    // ----------------------------------------------------
    case 'matching': {
      if (studentAnswer.type === 'matching' && typeof studentAnswer.matches === 'object' && studentAnswer.matches !== null) {
        const pairs = question.matchingPairs || [];
        if (pairs.length >= 2) {
          // Complete matching required: every pair.id or pair.left must match pair.right
          const allPairsMatch = pairs.every((pair) => {
            // Student match key can be pair.id or pair.left
            const studentRight = (
              studentAnswer.matches[pair.id] ??
              studentAnswer.matches[pair.left] ??
              ''
            ).trim().toLowerCase();
            const expectedRight = (pair.right || '').trim().toLowerCase();
            return studentRight.length > 0 && studentRight === expectedRight;
          });
          isCorrect = allPairsMatch;
        }
      }
      break;
    }

    // ----------------------------------------------------
    // 7. ORDERING
    // ----------------------------------------------------
    case 'ordering': {
      if (studentAnswer.type === 'ordering' && Array.isArray(studentAnswer.orderedIds)) {
        const items = question.orderingItems || question.items || [];
        if (items.length >= 2) {
          // Expected order is question.correctOrder if provided, else order of items
          const expectedIds =
            question.correctOrder && question.correctOrder.length > 0
              ? question.correctOrder
              : items.map((item) => item.id);
          if (
            studentAnswer.orderedIds.length === expectedIds.length &&
            studentAnswer.orderedIds.every((id, idx) => id === expectedIds[idx])
          ) {
            isCorrect = true;
          }
        }
      }
      break;
    }

    default:
      isCorrect = false;
  }

  const earnedPoints = isCorrect ? maxPoints : 0;

  return {
    questionId: question.id,
    earnedPoints,
    maxPoints,
    isCorrect,
    status: 'graded',
  };
}

/**
 * Grades an entire submitted TestSession against a Test definition.
 * 
 * Rules:
 * 1. Requires session.status === 'submitted'. Throws error if active or expired-unsubmitted.
 * 2. Pure function: does not mutate test or session.
 * 3. Does NOT calculate letter grades, pass/fail, or CEFR bands.
 * 4. Question results strictly follow test.questions order.
 * 5. Handles pending manual review questions (essay, writing) without failing or marking as 0.
 * 6. Returns a deterministic GradingResult.
 */
export function gradeTestSession(
  test: Test,
  session: TestSession,
  overrideGradedAt?: string
): GradingResult {
  // Validation: session MUST be submitted
  if (!session || session.status !== 'submitted') {
    throw new Error(
      `Cannot grade session: only submitted sessions can be graded (current status: "${session?.status}").`
    );
  }

  const questionResults: QuestionGradingResult[] = [];
  let totalPoints = 0;
  let earnedPoints = 0;
  let pendingReviewCount = 0;

  // Grade each question in the strict order of test.questions
  for (const question of test.questions) {
    const studentAnswer = session.answers ? session.answers[question.id] : undefined;
    const result = gradeQuestion(question, studentAnswer);

    questionResults.push(result);
    totalPoints += result.maxPoints;

    if (result.requiresManualGrading) {
      pendingReviewCount++;
    } else if (typeof result.earnedPoints === 'number') {
      earnedPoints += result.earnedPoints;
    }
  }

  const hasPendingManualGrading = pendingReviewCount > 0;

  // Calculate percentage: safe against division by zero and NaN
  let percentage = 0;
  if (totalPoints > 0) {
    const rawPct = (earnedPoints / totalPoints) * 100;
    percentage = Math.round(rawPct * 100) / 100;
  }

  // Deterministic unique sessionId and resultId
  const sessionId =
    session.id ||
    `${session.testId}_${encodeURIComponent(session.studentName)}_${session.startedAt}`;
  const id = `grading_${sessionId}`;

  const gradedAt = overrideGradedAt || (session.submittedAt || new Date().toISOString());

  return {
    id,
    testId: test.id,
    sessionId,
    totalPoints,
    earnedPoints,
    percentage,
    questionResults,
    gradedAt,
    hasPendingManualGrading,
    pendingReviewCount,
  };
}
