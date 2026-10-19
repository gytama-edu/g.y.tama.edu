/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Test, Question } from './test';
import { TestSession, StudentAnswer } from './student';
import { GradingResult, QuestionGradingResult } from './grading';

/**
 * Summary record of a submitted attempt for the Reports List table/cards
 */
export interface StudentReportSummary {
  testId: string;
  sessionId: string;
  studentName: string;
  submittedAt: string;
  earnedPoints: number;
  totalPoints: number;
  percentage: number;
  status: 'submitted';
  hasPendingManualGrading?: boolean;
}

/**
 * Question performance breakdown item for Individual Student Report
 */
export interface QuestionReportItem {
  questionNumber: number;
  question: Question;
  questionResult?: QuestionGradingResult;
  studentAnswer?: StudentAnswer;
  studentAnswerText: string | null;
  correctAnswerText: string | null;
  earnedPoints: number | null;
  maxPoints: number;
  status: 'correct' | 'incorrect' | 'not-answered' | 'pending_review';
}

/**
 * Full Individual Student Report
 */
export interface IndividualStudentReport {
  test: Test;
  session: TestSession;
  gradingResult: GradingResult;
  questionReports: QuestionReportItem[];
}
