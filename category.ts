/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: 'blue' | 'emerald' | 'purple' | 'amber' | 'rose' | 'indigo' | 'slate';
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_CATEGORY_ID = 'cat_uncategorized';

export const INITIAL_DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'cat_general',
    name: 'General',
    description: 'General English assessments and core evaluations',
    color: 'blue',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'cat_english',
    name: 'English',
    description: 'Grammar, vocabulary, and general English examinations',
    color: 'indigo',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'cat_toefl',
    name: 'TOEFL',
    description: 'TOEFL preparation and assessment tests',
    color: 'emerald',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'cat_ielts',
    name: 'IELTS',
    description: 'IELTS Reading, Writing, and Speaking assessments',
    color: 'purple',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'cat_placement',
    name: 'Placement Tests',
    description: 'Diagnostic and student placement examinations',
    color: 'amber',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'cat_uncategorized',
    name: 'Uncategorized',
    description: 'Default category for uncategorized assessments',
    color: 'slate',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];
