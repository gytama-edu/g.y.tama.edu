/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Test,
  Question,
  ReadingSet,
  AssessmentSection,
  SectionType,
  SUPPORTED_SECTION_TYPES,
} from '../types/test';
import { createSectionId } from './id';

export const DEFAULT_SECTION_TITLE = 'Section 1';
export const DEFAULT_SECTION_TYPE: SectionType = 'General';

/**
 * Creates a new blank section with default metadata.
 */
export function createNewSection(
  type: SectionType = DEFAULT_SECTION_TYPE,
  order: number = 1,
  title?: string
): AssessmentSection {
  const now = new Date().toISOString();
  return {
    id: createSectionId(),
    title: title || `${type} Section`,
    type,
    instructions: getDefaultInstructionsForSectionType(type),
    order,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Returns intuitive default instructions based on the section type.
 */
export function getDefaultInstructionsForSectionType(type: SectionType): string {
  switch (type) {
    case 'Listening':
      return 'Listen attentively to the audio track and answer the questions that follow.';
    case 'Reading':
      return 'Read the passage carefully and answer the comprehension questions below.';
    case 'Grammar':
      return 'Choose or provide the grammatically correct option for each question.';
    case 'Vocabulary':
      return 'Select or provide the most appropriate word or definition.';
    case 'Writing':
      return 'Complete the writing prompt following the word count guidelines.';
    case 'General':
    case 'Custom':
    default:
      return 'Answer all questions in this section carefully.';
  }
}

/**
 * Checks if a section type is supported.
 */
export function isValidSectionType(type: string): type is SectionType {
  return SUPPORTED_SECTION_TYPES.includes(type as SectionType);
}

/**
 * Normalizes an array of sections ensuring:
 * - Unique, non-empty IDs
 * - Valid types (fallback to 'General')
 * - Monotonic 1-based order
 */
export function normalizeSections(
  rawSections?: AssessmentSection[] | null
): AssessmentSection[] {
  if (!rawSections || !Array.isArray(rawSections) || rawSections.length === 0) {
    return [];
  }

  const seenIds = new Set<string>();
  const normalized: AssessmentSection[] = [];

  rawSections.forEach((sec, idx) => {
    if (!sec || typeof sec !== 'object') return;

    let id = String(sec.id || '').trim();
    if (!id || seenIds.has(id)) {
      id = createSectionId();
    }
    seenIds.add(id);

    const type: SectionType = isValidSectionType(sec.type)
      ? sec.type
      : 'General';

    normalized.push({
      id,
      title: String(sec.title || `Section ${idx + 1}`).trim() || `Section ${idx + 1}`,
      type,
      instructions: sec.instructions !== undefined ? String(sec.instructions) : undefined,
      order: idx + 1,
      audioId: sec.audioId ? String(sec.audioId).trim() : undefined,
      audioMetadata: sec.audioMetadata || undefined,
      readingSetId: sec.readingSetId ? String(sec.readingSetId).trim() : undefined,
      questionIds: Array.isArray(sec.questionIds) ? sec.questionIds.map(String) : undefined,
      createdAt: sec.createdAt || new Date().toISOString(),
      updatedAt: sec.updatedAt || new Date().toISOString(),
    });
  });

  return normalized;
}

/**
 * Presentational Section: Combines an AssessmentSection with its associated questions and reading sets.
 * Does NOT alter the underlying Test unless saved.
 */
export interface PresentationalSection {
  section: AssessmentSection;
  isVirtual: boolean; // true if automatically generated for backward compatibility
  questions: Question[];
  readingSets: ReadingSet[];
  totalPoints: number;
  questionCount: number;
}

/**
 * Resolves a Test into an ordered list of presentational sections.
 * 
 * BACKWARD COMPATIBILITY:
 * If an assessment has NO sections defined (legacy assessment), this function presents
 * all questions under a single default "General" virtual section without mutating the saved Test.
 * 
 * If sections exist, questions are assigned based on:
 * 1. question.sectionId matching section.id
 * 2. or section.questionIds containing question.id
 * 3. Any leftover/unassigned questions are placed into the first section (or a default section).
 */
export function resolveSectionsForTest(test: Test): PresentationalSection[] {
  const questions = test.questions || [];
  const readingSets = test.readingSets || [];
  const sections = test.sections || [];

  // Legacy assessment: No sections configured
  if (sections.length === 0) {
    const virtualSection: AssessmentSection = {
      id: 'sec_legacy_default',
      title: test.title ? `${test.title} (General)` : 'Main Assessment',
      type: 'General',
      instructions: test.description || 'Answer all questions in this assessment.',
      order: 1,
      audioId: test.audioId,
      audioMetadata: test.audioMetadata,
    };

    const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);

    return [
      {
        section: virtualSection,
        isVirtual: true,
        questions: [...questions],
        readingSets: [...readingSets],
        totalPoints,
        questionCount: questions.length,
      },
    ];
  }

  // Sections exist
  const normalized = normalizeSections(sections);
  const sectionMap = new Map<string, AssessmentSection>();
  normalized.forEach((s) => sectionMap.set(s.id, s));

  // Partition questions into sections
  const questionsBySection = new Map<string, Question[]>();
  normalized.forEach((s) => questionsBySection.set(s.id, []));

  const unassignedQuestions: Question[] = [];

  questions.forEach((q) => {
    if (q.sectionId && questionsBySection.has(q.sectionId)) {
      questionsBySection.get(q.sectionId)!.push(q);
    } else {
      // Check if any section references it in questionIds
      const ownerSection = normalized.find(
        (s) => s.questionIds && s.questionIds.includes(q.id)
      );
      if (ownerSection) {
        questionsBySection.get(ownerSection.id)!.push(q);
      } else {
        unassignedQuestions.push(q);
      }
    }
  });

  // Assign any orphan questions to the first section so no questions are ever lost
  if (unassignedQuestions.length > 0 && normalized.length > 0) {
    const firstSecId = normalized[0].id;
    questionsBySection.get(firstSecId)!.push(...unassignedQuestions);
  }

  // Partition reading sets into sections
  const readingSetsBySection = new Map<string, ReadingSet[]>();
  normalized.forEach((s) => readingSetsBySection.set(s.id, []));
  const unassignedReadingSets: ReadingSet[] = [];

  readingSets.forEach((rs) => {
    // If a section explicitly claims this reading set
    const explicitSec = normalized.find((s) => s.readingSetId === rs.id);
    if (explicitSec) {
      readingSetsBySection.get(explicitSec.id)!.push(rs);
      return;
    }

    // Otherwise, check where its child questions live
    const childQuestions = questions.filter((q) => q.readingSetId === rs.id);
    if (childQuestions.length > 0) {
      const childSecId = childQuestions[0].sectionId;
      if (childSecId && readingSetsBySection.has(childSecId)) {
        readingSetsBySection.get(childSecId)!.push(rs);
        return;
      }
    }

    unassignedReadingSets.push(rs);
  });

  if (unassignedReadingSets.length > 0 && normalized.length > 0) {
    readingSetsBySection.get(normalized[0].id)!.push(...unassignedReadingSets);
  }

  return normalized.map((sec) => {
    const secQuestions = questionsBySection.get(sec.id) || [];
    const secReadingSets = readingSetsBySection.get(sec.id) || [];
    const totalPoints = secQuestions.reduce((sum, q) => sum + (q.points || 1), 0);

    return {
      section: sec,
      isVirtual: false,
      questions: secQuestions,
      readingSets: secReadingSets,
      totalPoints,
      questionCount: secQuestions.length,
    };
  });
}

/**
 * Calculates points for a specific section given its questions.
 */
export function calculateSectionPoints(questions: Question[]): number {
  return questions.reduce((sum, q) => sum + (q.points || 1), 0);
}
