/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface QuestionGradingResult {
  questionId: string;
  earnedPoints: number | null;
  maxPoints: number;
  isCorrect: boolean | null;
  requiresManualGrading?: boolean;
  status?: 'graded' | 'unanswered' | 'pending_review';
  feedback?: string;
  gradedAt?: string;
}

export interface GradingResult {
  id: string;
  testId: string;
  sessionId: string;

  totalPoints: number;
  earnedPoints: number;
  percentage: number;

  questionResults: QuestionGradingResult[];

  gradedAt: string;
  hasPendingManualGrading?: boolean;
  pendingReviewCount?: number;
}
