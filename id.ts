/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function generateId(prefix: string = 'id'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}`;
}

export function createTestId(): string {
  return generateId('test');
}

export function createQuestionId(): string {
  return generateId('question');
}

export function createOptionId(): string {
  return generateId('option');
}

export function createSessionId(): string {
  return generateId('session');
}

export function createSubmissionId(): string {
  return generateId('submission');
}

export function createCategoryId(): string {
  return generateId('cat');
}

export function createReadingSetId(): string {
  return generateId('readingset');
}

export function createSectionId(): string {
  return generateId('sec');
}


