/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ImportQuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'multiple_select'
  | 'short_answer'
  | 'fill_blank'
  | 'matching'
  | 'ordering'
  | 'reading_passage';

export interface RawParsedOption {
  label: string;
  text: string;
  rawLabel: string;
}

export interface MatchingParsedItem {
  label: string;
  text: string;
}

export interface MatchingParsedPair {
  leftLabel: string;
  rightLabel: string;
  leftText: string;
  rightText: string;
}

export interface RawParsedQuestion {
  questionNumber: number;
  type: ImportQuestionType;
  text: string;
  options: RawParsedOption[];
  answer?: string;
  answers?: string[];
  matchingLeft?: MatchingParsedItem[];
  matchingRight?: MatchingParsedItem[];
  matchingPairs?: MatchingParsedPair[];
  orderingItems?: { label: string; text: string }[];
  correctOrder?: string[];
  errors: string[];
  warnings: string[];
  status: 'READY' | 'WARNING' | 'ERROR';
}

export interface ParseResult {
  questions: RawParsedQuestion[];
  globalErrors: string[];
  globalWarnings: string[];
  totalDetected: number;
  readyCount: number;
  warningCount: number;
  errorCount: number;
  hasErrors: boolean;
  hasWarnings: boolean;
  answerKeyMap: Record<number, string>;
  selectedType: ImportQuestionType;
  readingPassage?: {
    title?: string;
    passage: string;
  };
}

export interface QuestionTypeImportConfig {
  type: ImportQuestionType;
  label: string;
  tagline: string;
  shortDescription: string;
  formatDescription: string;
  sampleText: string;
  placeholderText: string;
}

export const IMPORT_TYPE_CONFIGS: Record<ImportQuestionType, QuestionTypeImportConfig> = {
  multiple_choice: {
    type: 'multiple_choice',
    label: 'Multiple Choice',
    tagline: '4 Options (A–D)',
    shortDescription: 'Standard multiple-choice questions with 4 distinct options (A through D) and one correct answer.',
    formatDescription: 'Numbered question followed by options A. through D. on separate lines, and an ANSWER: <A-D> line (or bottom Answer Key).',
    sampleText: `1. What is the capital of France?
A. London
B. Paris
C. Rome
D. Madrid
ANSWER: B

2. Which planet is known as the Red Planet?
A. Venus
B. Mars
C. Jupiter
D. Saturn
ANSWER: B

3. What is the chemical symbol for water?
A. CO2
B. NaCl
C. H2O
D. O2
ANSWER: C`,
    placeholderText: `1. What is the capital of France?
A. London
B. Paris
C. Rome
D. Madrid
ANSWER: B

2. Which planet is known as the Red Planet?
A. Venus
B. Mars
C. Jupiter
D. Saturn
ANSWER: B`,
  },
  true_false: {
    type: 'true_false',
    label: 'True / False',
    tagline: 'Binary Choice',
    shortDescription: 'Statements evaluated as TRUE or FALSE with an ANSWER: line. No options should be included.',
    formatDescription: 'Numbered statement followed directly by an ANSWER: TRUE or ANSWER: FALSE line (no options).',
    sampleText: `1. The Earth revolves around the Sun.
ANSWER: TRUE

2. Water boils at 50°C at sea level.
ANSWER: FALSE

3. The Pacific Ocean is larger than the Atlantic Ocean.
ANSWER: TRUE`,
    placeholderText: `1. The Earth revolves around the Sun.
ANSWER: TRUE

2. Water boils at 50°C at sea level.
ANSWER: FALSE`,
  },
  multiple_select: {
    type: 'multiple_select',
    label: 'Multiple Select',
    tagline: '2+ Correct Options',
    shortDescription: 'Questions with multiple options where two or more correct answers are selected.',
    formatDescription: 'Numbered question followed by options (A., B., etc.) and an ANSWER: line with at least 2 correct letters separated by commas.',
    sampleText: `1. Which of the following are colors?
A. Red
B. Blue
C. Table
D. Green
ANSWER: A, B, D

2. Which are fruits?
A. Apple
B. Carrot
C. Banana
D. Orange
ANSWER: A, C, D

3. Which numbers are even?
A. 2
B. 3
C. 4
D. 5
ANSWER: A, C`,
    placeholderText: `1. Which of the following are colors?
A. Red
B. Blue
C. Table
D. Green
ANSWER: A, B, D

2. Which are fruits?
A. Apple
B. Carrot
C. Banana
D. Orange
ANSWER: A, C, D`,
  },
  short_answer: {
    type: 'short_answer',
    label: 'Short Answer',
    tagline: 'Text Response',
    shortDescription: 'Open-ended questions with a specific text-based answer key.',
    formatDescription: 'Numbered question followed directly by an ANSWER: <text> line (no options).',
    sampleText: `1. What is the capital of France?
ANSWER: Paris

2. What is 2 + 2?
ANSWER: Four

3. Which gas do plants absorb from the atmosphere?
ANSWER: Carbon dioxide`,
    placeholderText: `1. What is the capital of France?
ANSWER: Paris

2. What is 2 + 2?
ANSWER: Four`,
  },
  fill_blank: {
    type: 'fill_blank',
    label: 'Fill in the Blank',
    tagline: 'Missing Words',
    shortDescription: 'Questions with blanks in the text (___) and pipe-separated answers.',
    formatDescription: 'Numbered question containing blanks (e.g. ___), followed by an ANSWER: line with answers separated by | for multiple blanks.',
    sampleText: `1. She ___ to school every day.
ANSWER: goes

2. They ___ playing football yesterday.
ANSWER: were

3. I ___ coffee and my brother ___ tea.
ANSWER: drink | drinks`,
    placeholderText: `1. She ___ to school every day.
ANSWER: goes

2. They ___ playing football yesterday.
ANSWER: were

3. I ___ coffee and my brother ___ tea.
ANSWER: drink | drinks`,
  },
  matching: {
    type: 'matching',
    label: 'Matching',
    tagline: 'Pair Items',
    shortDescription: 'Match prompts on the left (A, B, C) with items on the right (1, 2, 3).',
    formatDescription: 'Numbered question followed by LEFT: (A., B., etc.), RIGHT: (1., 2., etc.), and ANSWER: (A-3, B-1, etc.) sections.',
    sampleText: `1. Match each word with its meaning.
LEFT:
A. Huge
B. Tiny
C. Quick

RIGHT:
1. Very small
2. Very fast
3. Very large

ANSWER:
A-3
B-1
C-2`,
    placeholderText: `1. Match each word with its meaning.
LEFT:
A. Huge
B. Tiny
C. Quick

RIGHT:
1. Very small
2. Very fast
3. Very large

ANSWER:
A-3
B-1
C-2`,
  },
  ordering: {
    type: 'ordering',
    label: 'Ordering',
    tagline: 'Sequence Items',
    shortDescription: 'Arrange events, processes, or steps into the correct sequence.',
    formatDescription: 'Numbered question followed by lettered items (A., B., C., D.) and an ANSWER: line with the correct letter sequence separated by commas.',
    sampleText: `1. Put these steps in the correct order.
A. Wake up
B. Have breakfast
C. Go to school
D. Go to bed
ANSWER: A, B, C, D

2. Arrange the process in the correct order.
A. Mix the ingredients
B. Serve the food
C. Prepare the ingredients
D. Cook the mixture
ANSWER: C, A, D, B`,
    placeholderText: `1. Put these steps in the correct order.
A. Wake up
B. Have breakfast
C. Go to school
D. Go to bed
ANSWER: A, B, C, D

2. Arrange the process in the correct order.
A. Mix the ingredients
B. Serve the food
C. Prepare the ingredients
D. Cook the mixture
ANSWER: C, A, D, B`,
  },
  reading_passage: {
    type: 'reading_passage',
    label: 'Reading Passage',
    tagline: 'Passage + Questions',
    shortDescription: 'One reading passage container with attached comprehension questions across any format.',
    formatDescription: 'PASSAGE: section followed by reading paragraphs, then QUESTIONS: section with numbered questions using any established format.',
    sampleText: `PASSAGE:
The internet has changed the way people communicate. People can now send messages instantly across the globe, share photos, and collaborate on projects in real time.

However, the rapid growth of digital communication also presents challenges. People often spend less time communicating face-to-face, and misunderstandings can arise more easily in written messages without tone and body language.

QUESTIONS:

1. What has changed the way people communicate?
A. Television
B. The internet
C. Newspapers
D. Radio
ANSWER: B

2. The internet allows people to communicate instantly.
ANSWER: TRUE

3. Which statements are supported by the passage?
A. People can send messages quickly.
B. Communication has become slower.
C. The internet affects communication.
D. People no longer communicate.
ANSWER: A, C`,
    placeholderText: `PASSAGE:
Write or paste your reading passage here.
Multiple paragraphs are preserved.

QUESTIONS:

1. What is the main idea of the passage?
A. Option A
B. Option B
C. Option C
D. Option D
ANSWER: A

2. The statement is supported by the text.
ANSWER: TRUE`,
  },
};
