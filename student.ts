/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type StudentSingleChoiceAnswer = {
  type: 'single-choice' | 'multiple_choice';
  optionId: string;
};

export type StudentMultipleChoiceAnswer = {
  type: 'multiple-choice' | 'multiple_select';
  optionIds: string[];
};

export type StudentTrueFalseAnswer = {
  type: 'true-false' | 'true_false';
  value: boolean;
};

export type StudentShortAnswer = {
  type: 'short-answer' | 'short_answer';
  value: string;
};

export type StudentFillBlankAnswer = {
  type: 'fill_blank';
  answers: Record<string, string>; // blankId -> student answer
};

export type StudentMatchingAnswer = {
  type: 'matching';
  matches: Record<string, string>; // pairId or left item -> right item
};

export type StudentOrderingAnswer = {
  type: 'ordering';
  orderedIds: string[]; // sequence of item ids
};

export type StudentEssayAnswer = {
  type: 'essay';
  text: string;
};

export type StudentWritingAnswer = {
  type: 'writing';
  text: string;
};

export type StudentAnswer =
  | StudentSingleChoiceAnswer
  | StudentMultipleChoiceAnswer
  | StudentTrueFalseAnswer
  | StudentShortAnswer
  | StudentFillBlankAnswer
  | StudentMatchingAnswer
  | StudentOrderingAnswer
  | StudentEssayAnswer
  | StudentWritingAnswer;

export type SessionTimerState = {
  enabled: boolean;
  durationSeconds: number;
  expiresAt: string | null;
  status: 'running' | 'expired';
};

export type TestSessionStatus = 'active' | 'expired' | 'submitted';

export interface TestSession {
  id?: string;
  testId: string;
  studentName: string;
  answers: Record<string, StudentAnswer>;
  currentQuestionIndex: number;
  startedAt: string;
  timer?: SessionTimerState;
  status: TestSessionStatus;
  submittedAt: string | null;
}

/**
 * Returns true if the student has provided an answer to the given question.
 */
export function isQuestionAnswered(answer?: StudentAnswer): boolean {
  if (!answer) return false;

  const rawAns = answer as unknown as Record<string, unknown>;
  const rawType = typeof rawAns.type === 'string' ? rawAns.type : '';

  switch (rawType) {
    case 'single-choice':
    case 'multiple_choice':
    case 'single_choice':
      return typeof rawAns.optionId === 'string' && rawAns.optionId.length > 0;
    case 'multiple-choice':
    case 'multiple_select':
    case 'multiple-select':
      return Array.isArray(rawAns.optionIds) && rawAns.optionIds.length > 0;
    case 'true-false':
    case 'true_false':
      return typeof rawAns.value === 'boolean';
    case 'short-answer':
    case 'short_answer':
      return typeof rawAns.value === 'string' && rawAns.value.trim().length > 0;
    case 'fill_blank':
    case 'fill-blank':
      return (
        typeof rawAns.answers === 'object' &&
        rawAns.answers !== null &&
        Object.values(rawAns.answers as Record<string, unknown>).some(
          (val) => typeof val === 'string' && val.trim().length > 0
        )
      );
    case 'matching':
      return (
        typeof rawAns.matches === 'object' &&
        rawAns.matches !== null &&
        Object.keys(rawAns.matches as Record<string, unknown>).length > 0 &&
        Object.values(rawAns.matches as Record<string, unknown>).some(
          (val) => typeof val === 'string' && val.trim().length > 0
        )
      );
    case 'ordering':
      return Array.isArray(rawAns.orderedIds) && rawAns.orderedIds.length > 0;
    case 'essay':
      return typeof rawAns.text === 'string' && rawAns.text.trim().length > 0;
    case 'writing':
      return typeof rawAns.text === 'string' && rawAns.text.trim().length > 0;
    default:
      // Fallback structural check if type is unrecognized or custom
      if (typeof rawAns.optionId === 'string' && rawAns.optionId.length > 0) return true;
      if (Array.isArray(rawAns.optionIds) && rawAns.optionIds.length > 0) return true;
      if (typeof rawAns.value === 'boolean') return true;
      if (typeof rawAns.value === 'string' && rawAns.value.trim().length > 0) return true;
      if (typeof rawAns.text === 'string' && rawAns.text.trim().length > 0) return true;
      if (Array.isArray(rawAns.orderedIds) && rawAns.orderedIds.length > 0) return true;
      if (
        typeof rawAns.answers === 'object' &&
        rawAns.answers !== null &&
        Object.values(rawAns.answers as Record<string, unknown>).some(
          (val) => typeof val === 'string' && val.trim().length > 0
        )
      ) {
        return true;
      }
      if (
        typeof rawAns.matches === 'object' &&
        rawAns.matches !== null &&
        Object.values(rawAns.matches as Record<string, unknown>).some(
          (val) => typeof val === 'string' && val.trim().length > 0
        )
      ) {
        return true;
      }
      return false;
  }
}

/**
 * Calculates remaining seconds from an absolute expiresAt timestamp.
 * Guaranteed to never return negative numbers or NaN.
 */
export function calculateRemainingSeconds(expiresAt: string | null | undefined): number {
  if (!expiresAt || typeof expiresAt !== 'string') return 0;
  const targetTime = new Date(expiresAt).getTime();
  if (isNaN(targetTime)) return 0;
  const diffMs = targetTime - Date.now();
  if (diffMs <= 0) return 0;
  return Math.floor(diffMs / 1000);
}

/**
 * Formats seconds into MM:SS or HH:MM:SS (if duration is 60+ minutes).
 * Never displays negative numbers, NaN:NaN, or undefined.
 */
export function formatTimerDisplay(
  totalSeconds: number,
  initialDurationSeconds?: number
): string {
  if (typeof totalSeconds !== 'number' || isNaN(totalSeconds) || totalSeconds <= 0) {
    if (initialDurationSeconds && initialDurationSeconds >= 3600) {
      return '00:00:00';
    }
    return '00:00';
  }

  const clamped = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0 || (initialDurationSeconds && initialDurationSeconds >= 3600)) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  return `${pad(minutes)}:${pad(seconds)}`;
}
