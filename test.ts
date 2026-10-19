/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AudioMetadata } from './audio';

export type QuestionType =
  | 'multiple_choice'
  | 'single-choice'
  | 'true_false'
  | 'true-false'
  | 'multiple_select'
  | 'multiple-choice'
  | 'short_answer'
  | 'short-answer'
  | 'fill_blank'
  | 'matching'
  | 'ordering'
  | 'essay'
  | 'writing';

export interface AnswerOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface BlankItem {
  id: string;
  acceptedAnswers: string[];
}

export interface MatchingPair {
  id: string;
  left: string;
  right: string;
}

export interface MatchingItem {
  id: string;
  text: string;
}

export interface CorrectMatch {
  leftId: string;
  rightId: string;
}

export interface OrderingItem {
  id: string;
  text: string;
}

export type WritingType =
  | 'General Writing'
  | 'Paragraph'
  | 'Essay'
  | 'Opinion'
  | 'Descriptive'
  | 'Narrative'
  | 'Email / Letter'
  | 'Academic Writing'
  | 'IELTS Writing'
  | 'TOEFL Writing'
  | 'Other';

export interface WritingConfig {
  instructions?: string;
  writingType?: WritingType;
  minimumWords?: number | null;
  maximumWords?: number | null;
  showWordCount?: boolean;
}

/**
 * MODULE 15: Reading Passage Set
 * Represents a reading passage container with metadata that groups questions.
 */
export interface ReadingSet {
  id: string;
  title: string;
  passage: string;
  instructions?: string;
  source?: string;
  order: number;
  audioId?: string;
  audioMetadata?: AudioMetadata;
  createdAt?: string;
  updatedAt?: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  points: number;
  order: number;

  // Module 15: Association with a ReadingSet (optional)
  readingSetId?: string;

  // Module 16: Associated audio attachment (optional)
  audioId?: string;
  audioMetadata?: AudioMetadata;

  // Module 17: Association with an AssessmentSection (optional)
  sectionId?: string;

  // Multiple Choice / Multiple Select / True False
  options?: AnswerOption[];
  correctAnswer?: string | boolean;
  correctAnswers?: string[];

  // Short Answer
  acceptedAnswers?: string[];

  // Fill in the Blank
  blanks?: BlankItem[];

  // Matching
  matchingPairs?: MatchingPair[];
  leftItems?: MatchingItem[];
  rightItems?: MatchingItem[];
  correctMatches?: CorrectMatch[];

  // Ordering
  orderingItems?: OrderingItem[];
  items?: OrderingItem[];
  correctOrder?: string[];

  // Essay / Long Answer
  maxWords?: number | null;
  requiresManualGrading?: boolean;

  // Writing (Module 13)
  writingConfig?: WritingConfig;
}

export interface TestSettings {
  timeLimitEnabled: boolean;
  timeLimitMinutes: number | null;

  attemptsAllowed: number;

  shuffleQuestions: boolean;
  shuffleAnswers: boolean;

  showResultsAfterSubmission: boolean;
  showCorrectAnswersAfterSubmission: boolean;

  requireAllQuestions: boolean;
}

export const DEFAULT_TEST_SETTINGS: TestSettings = {
  timeLimitEnabled: false,
  timeLimitMinutes: null,

  attemptsAllowed: 1,

  shuffleQuestions: false,
  shuffleAnswers: false,

  showResultsAfterSubmission: true,
  showCorrectAnswersAfterSubmission: false,

  requireAllQuestions: false,
};

export interface TestAccess {
  enabled: boolean;
  accessCode: string;
  createdAt: string | null;
}

export type SectionType =
  | 'Listening'
  | 'Reading'
  | 'Grammar'
  | 'Vocabulary'
  | 'Writing'
  | 'General'
  | 'Custom';

export const SUPPORTED_SECTION_TYPES: SectionType[] = [
  'Listening',
  'Reading',
  'Grammar',
  'Vocabulary',
  'Writing',
  'General',
  'Custom',
];

export interface AssessmentSection {
  id: string;
  title: string;
  type: SectionType;
  instructions?: string;
  order: number;
  audioId?: string;
  audioMetadata?: AudioMetadata;
  readingSetId?: string;
  questionIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_TEST_ACCESS: TestAccess = {
  enabled: false,
  accessCode: '',
  createdAt: null,
};

export interface Test {
  id: string;
  title: string;
  description: string;
  categoryId?: string;
  sections?: AssessmentSection[];
  questions: Question[];
  readingSets?: ReadingSet[];
  audioId?: string;
  audioMetadata?: AudioMetadata;
  settings?: TestSettings;
  access?: TestAccess;
  createdAt: string;
  updatedAt: string;
}

export type ValidationErrorField =
  | 'title'
  | 'description'
  | 'sections'
  | 'section_title'
  | 'section_instructions'
  | 'questions'
  | 'question_text'
  | 'points'
  | 'options'
  | 'accepted_answers'
  | 'correct_answer'
  | 'blanks'
  | 'matching_pairs'
  | 'ordering_items'
  | 'writing_config'
  | 'reading_set'
  | 'reading_set_title'
  | 'reading_set_passage'
  | 'reading_set_questions'
  | 'settings_time_limit'
  | 'settings_attempts'
  | 'settings';

export interface ValidationError {
  field: ValidationErrorField;
  sectionId?: string;
  questionId?: string;
  optionId?: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

