/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Test, DEFAULT_TEST_SETTINGS, DEFAULT_TEST_ACCESS } from '../types/test';
import { DEFAULT_CATEGORY_ID } from '../types/category';
import { createTestId, createQuestionId, createOptionId } from './id';
import { normalizeTestSettings } from './testSettings';
import { normalizeTestAccess } from './testAccess';

export const STORAGE_KEY = 'assessment_tests';

export function getSampleTest(): Test {
  const now = new Date().toISOString();
  return {
    id: 'test_sample_001',
    title: 'Upper-Intermediate Grammar Test',
    description: 'Choose the best answer for each question. Pay close attention to conditionals, verb tenses, and adjectives.',
    categoryId: 'cat_english',
    createdAt: now,
    updatedAt: now,
    settings: { ...DEFAULT_TEST_SETTINGS },
    access: { ...DEFAULT_TEST_ACCESS },
    questions: [
      {
        id: createQuestionId(),
        type: 'single-choice',
        text: 'If I ___ more time, I would travel more.',
        points: 1,
        order: 1,
        options: [
          { id: createOptionId(), text: 'have', isCorrect: false },
          { id: createOptionId(), text: 'had', isCorrect: true },
          { id: createOptionId(), text: 'will have', isCorrect: false },
          { id: createOptionId(), text: 'am having', isCorrect: false },
        ],
      },
      {
        id: createQuestionId(),
        type: 'multiple-choice',
        text: 'Which of the following words are adjectives?',
        points: 2,
        order: 2,
        options: [
          { id: createOptionId(), text: 'beautiful', isCorrect: true },
          { id: createOptionId(), text: 'quickly', isCorrect: false },
          { id: createOptionId(), text: 'expensive', isCorrect: true },
          { id: createOptionId(), text: 'carefully', isCorrect: false },
        ],
      },
      {
        id: createQuestionId(),
        type: 'true-false',
        text: 'The past participle of the irregular verb "break" is "broken".',
        points: 1,
        order: 3,
        options: [
          { id: createOptionId(), text: 'True', isCorrect: true },
          { id: createOptionId(), text: 'False', isCorrect: false },
        ],
      },
      {
        id: createQuestionId(),
        type: 'short-answer',
        text: 'What is the past tense of the verb "go"?',
        points: 1,
        order: 4,
        acceptedAnswers: ['went'],
      },
    ],
  };
}

export function loadAllTests(): Test[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      const sample = getSampleTest();
      saveAllTests([sample]);
      return [sample];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Ensure every test has valid, normalized Module 3 settings, Module 10 access, categoryId, readingSets, and sections
      return parsed.map((t) => ({
        ...t,
        categoryId: t.categoryId || DEFAULT_CATEGORY_ID,
        settings: normalizeTestSettings(t.settings),
        access: normalizeTestAccess(t.access),
        readingSets: t.readingSets || [],
        sections: t.sections || [],
      }));
    }
    console.warn('Storage data corrupted (not an array). Re-initializing.');
    return [];
  } catch (error) {
    console.error('Failed to parse assessment tests from storage:', error);
    return [];
  }
}

export function saveAllTests(tests: Test[]): boolean {
  try {
    // Ensure all tests saved have normalized settings and access
    const normalizedTests = tests.map((t) => ({
      ...t,
      settings: normalizeTestSettings(t.settings),
      access: normalizeTestAccess(t.access),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedTests));
    return true;
  } catch (error) {
    console.error('Failed to persist assessment tests to storage:', error);
    return false;
  }
}

export function getTestById(id: string): Test | null {
  const tests = loadAllTests();
  const test = tests.find((t) => t.id === id);
  if (!test) return null;
  return {
    ...test,
    settings: normalizeTestSettings(test.settings),
    access: normalizeTestAccess(test.access),
    readingSets: test.readingSets || [],
    sections: test.sections || [],
  };
}

export function saveTest(test: Test): boolean {
  try {
    const tests = loadAllTests();
    const existingIndex = tests.findIndex((t) => t.id === test.id);
    const updatedTest: Test = {
      ...test,
      categoryId: test.categoryId || DEFAULT_CATEGORY_ID,
      settings: normalizeTestSettings(test.settings),
      access: normalizeTestAccess(test.access),
      readingSets: test.readingSets || [],
      sections: test.sections || [],
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      tests[existingIndex] = updatedTest;
    } else {
      tests.unshift(updatedTest);
    }

    return saveAllTests(tests);
  } catch (err) {
    console.error('Failed to save test:', err);
    return false;
  }
}

export function deleteTest(id: string): boolean {
  try {
    const tests = loadAllTests();
    const filtered = tests.filter((t) => t.id !== id);
    return saveAllTests(filtered);
  } catch (err) {
    console.error('Failed to delete test:', err);
    return false;
  }
}

export function duplicateTest(id: string): Test | null {
  try {
    const original = getTestById(id);
    if (!original) return null;

    const now = new Date().toISOString();

    // Map old section IDs to new section IDs if sections exist
    const sectionIdMap = new Map<string, string>();
    const duplicatedSections = (original.sections || []).map((sec) => {
      const newSecId = `sec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      sectionIdMap.set(sec.id, newSecId);
      return {
        ...sec,
        id: newSecId,
        createdAt: now,
        updatedAt: now,
      };
    });

    const copy: Test = {
      ...original,
      id: createTestId(),
      title: `${original.title} (Copy)`,
      categoryId: original.categoryId || DEFAULT_CATEGORY_ID,
      createdAt: now,
      updatedAt: now,
      settings: normalizeTestSettings(original.settings),
      audioId: original.audioId,
      audioMetadata: original.audioMetadata,
      sections: duplicatedSections,
      readingSets: original.readingSets ? original.readingSets.map((rs) => ({ ...rs })) : [],
      questions: original.questions.map((q) => ({
        ...q,
        id: createQuestionId(),
        sectionId: q.sectionId && sectionIdMap.has(q.sectionId)
          ? sectionIdMap.get(q.sectionId)
          : q.sectionId,
        options: q.options?.map((opt) => ({
          ...opt,
          id: createOptionId(),
        })),
        acceptedAnswers: q.acceptedAnswers ? [...q.acceptedAnswers] : undefined,
      })),
    };

    const tests = loadAllTests();
    tests.unshift(copy);
    saveAllTests(tests);
    return copy;
  } catch (err) {
    console.error('Failed to duplicate test:', err);
    return null;
  }
}

