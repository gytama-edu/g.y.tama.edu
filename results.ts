/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Question } from '../types/test';
import { StudentAnswer, isQuestionAnswered } from '../types/student';
import { getTrueFalseExpectedValue } from './grading';
import { countWords } from './wordCount';

/**
 * Returns a human-readable display of the student's answer for a question.
 * Returns null if the student did not answer this question.
 */
export function getStudentAnswerDisplay(
  question: Question,
  studentAnswer?: StudentAnswer
): string | null {
  if (!studentAnswer || !isQuestionAnswered(studentAnswer)) {
    return null;
  }

  const rawType = String(question.type || 'single-choice').replace(/-/g, '_').toLowerCase();

  switch (rawType) {
    case 'single_choice':
    case 'multiple_choice': {
      if (studentAnswer.type === 'single-choice' || studentAnswer.type === 'multiple_choice') {
        const opt = question.options?.find((o) => o.id === studentAnswer.optionId);
        return opt ? opt.text : studentAnswer.optionId;
      }
      return null;
    }

    case 'multiple_select': {
      if (studentAnswer.type === 'multiple-choice' || studentAnswer.type === 'multiple_select') {
        if (!Array.isArray(studentAnswer.optionIds) || studentAnswer.optionIds.length === 0) {
          return null;
        }
        const selectedTexts: string[] = [];
        for (const id of studentAnswer.optionIds) {
          const opt = question.options?.find((o) => o.id === id);
          if (opt) {
            selectedTexts.push(opt.text);
          } else {
            selectedTexts.push(id);
          }
        }
        return selectedTexts.length > 0 ? selectedTexts.join(', ') : null;
      }
      return null;
    }

    case 'true_false': {
      if (studentAnswer.type === 'true-false' || studentAnswer.type === 'true_false') {
        return studentAnswer.value === true ? 'True' : 'False';
      }
      return null;
    }

    case 'short_answer': {
      if (studentAnswer.type === 'short-answer' || studentAnswer.type === 'short_answer') {
        return typeof studentAnswer.value === 'string' ? studentAnswer.value.trim() : null;
      }
      return null;
    }

    case 'fill_blank': {
      if (studentAnswer.type === 'fill_blank' && typeof studentAnswer.answers === 'object') {
        const parts: string[] = [];
        const blanks = question.blanks || [];
        blanks.forEach((b, idx) => {
          const val = studentAnswer.answers[b.id] || '(unanswered)';
          parts.push(`Blank ${idx + 1}: ${val}`);
        });
        return parts.length > 0 ? parts.join(' | ') : null;
      }
      return null;
    }

    case 'matching': {
      if (studentAnswer.type === 'matching' && typeof studentAnswer.matches === 'object') {
        const parts: string[] = [];
        const pairs = question.matchingPairs || [];
        pairs.forEach((p) => {
          const match = studentAnswer.matches[p.id] ?? studentAnswer.matches[p.left] ?? '(unmatched)';
          parts.push(`${p.left} → ${match}`);
        });
        return parts.length > 0 ? parts.join(', ') : null;
      }
      return null;
    }

    case 'ordering': {
      if (studentAnswer.type === 'ordering' && Array.isArray(studentAnswer.orderedIds)) {
        const itemMap = new Map<string, string>();
        (question.orderingItems || []).forEach((item) => {
          itemMap.set(item.id, item.text);
        });
        const steps = studentAnswer.orderedIds.map((id, idx) => `${idx + 1}. ${itemMap.get(id) || id}`);
        return steps.join(' → ');
      }
      return null;
    }

    case 'essay': {
      if (studentAnswer.type === 'essay' && typeof studentAnswer.text === 'string') {
        return studentAnswer.text;
      }
      return null;
    }

    case 'writing': {
      if (studentAnswer.type === 'writing' && typeof studentAnswer.text === 'string') {
        return studentAnswer.text;
      }
      return null;
    }

    default:
      return null;
  }
}

/**
 * Returns a human-readable display of the correct answer for a question.
 * Only shown when test.settings.showCorrectAnswersAfterSubmission is true.
 */
export function getCorrectAnswerDisplay(question: Question): string | null {
  const rawType = String(question.type || 'single-choice').replace(/-/g, '_').toLowerCase();

  switch (rawType) {
    case 'single_choice':
    case 'multiple_choice': {
      const correctOpt = question.options?.find((o) => o.isCorrect);
      return correctOpt ? correctOpt.text : null;
    }

    case 'multiple_select': {
      const correctOpts = question.options?.filter((o) => o.isCorrect) || [];
      if (correctOpts.length === 0) return null;
      return correctOpts.map((o) => o.text).join(', ');
    }

    case 'true_false': {
      const expected = getTrueFalseExpectedValue(question);
      if (expected === null) return null;
      return expected ? 'True' : 'False';
    }

    case 'short_answer': {
      if (!question.acceptedAnswers || question.acceptedAnswers.length === 0) {
        return null;
      }
      return question.acceptedAnswers.join(', ');
    }

    case 'fill_blank': {
      const blanks = question.blanks || [];
      if (blanks.length === 0) return null;
      const parts = blanks.map((b, idx) => `Blank ${idx + 1}: ${b.acceptedAnswers.join(' / ')}`);
      return parts.join(' | ');
    }

    case 'matching': {
      const pairs = question.matchingPairs || [];
      if (pairs.length === 0) return null;
      return pairs.map((p) => `${p.left} → ${p.right}`).join(', ');
    }

    case 'ordering': {
      const items = question.orderingItems || [];
      if (items.length === 0) return null;
      return items.map((item, idx) => `${idx + 1}. ${item.text}`).join(' → ');
    }

    case 'essay':
    case 'writing': {
      // Manual review question formats have no automatic answer key
      return 'Requires manual teacher evaluation';
    }

    default:
      return null;
  }
}

/**
 * Formats a timestamp into a clean, educational format:
 * e.g. "28 September 2026, 16:30"
 */
export function formatGradedTimestamp(isoString?: string | null): string {
  if (!isoString) return 'Just now';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;

    return d.toLocaleString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return isoString;
  }
}
