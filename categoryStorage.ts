/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Category,
  DEFAULT_CATEGORY_ID,
  INITIAL_DEFAULT_CATEGORIES,
} from '../types/category';
import { createCategoryId } from './id';
import { loadAllTests, saveAllTests } from './storage';

export const CATEGORIES_STORAGE_KEY = 'assessment_categories';

/**
 * Loads all categories from localStorage.
 * Initializes with standard default categories (English, TOEFL, IELTS, Placement Tests, General)
 * if storage is empty.
 */
export function loadAllCategories(): Category[] {
  try {
    const raw = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (raw === null) {
      saveAllCategories(INITIAL_DEFAULT_CATEGORIES);
      return [...INITIAL_DEFAULT_CATEGORIES];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Guarantee only the default fallback category (Uncategorized) always exists
      const hasDefault = parsed.some((c) => c.id === DEFAULT_CATEGORY_ID);
      if (!hasDefault) {
        const defaultCat =
          INITIAL_DEFAULT_CATEGORIES.find((c) => c.id === DEFAULT_CATEGORY_ID) || {
            id: DEFAULT_CATEGORY_ID,
            name: 'Uncategorized',
            description: 'Default category for uncategorized assessments',
            color: 'slate',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        const merged = [...parsed, defaultCat];
        saveAllCategories(merged);
        return merged;
      }
      return parsed;
    }
    saveAllCategories(INITIAL_DEFAULT_CATEGORIES);
    return [...INITIAL_DEFAULT_CATEGORIES];
  } catch (err) {
    console.error('[CategoryStorage] Error parsing categories, resetting to defaults:', err);
    saveAllCategories(INITIAL_DEFAULT_CATEGORIES);
    return [...INITIAL_DEFAULT_CATEGORIES];
  }
}

/**
 * Saves all categories to localStorage and syncs to server in background.
 */
export function saveAllCategories(categories: Category[]): boolean {
  try {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
    // Asynchronously notify server of updated categories
    syncCategoriesToServer(categories).catch(() => {});
    return true;
  } catch (err) {
    console.error('[CategoryStorage] Failed to save categories to localStorage:', err);
    return false;
  }
}

/**
 * Finds a category by ID, falling back safely to the General category.
 */
export function getCategoryById(id?: string, categoriesList?: Category[]): Category {
  const cats = categoriesList || loadAllCategories();
  if (id) {
    const found = cats.find((c) => c.id === id);
    if (found) return found;
  }
  const defaultCat = cats.find((c) => c.id === DEFAULT_CATEGORY_ID);
  return (
    defaultCat || {
      id: DEFAULT_CATEGORY_ID,
      name: 'Uncategorized',
      description: 'Default category for uncategorized assessments',
      color: 'slate',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  );
}

/**
 * Creates a new category with unique name validation.
 */
export function createCategory(data: {
  name: string;
  description?: string;
  color?: Category['color'];
}): { success: boolean; category?: Category; error?: string } {
  const trimmedName = data.name.trim();
  if (!trimmedName) {
    return { success: false, error: 'Category name is required.' };
  }

  const existing = loadAllCategories();
  const nameCollision = existing.some(
    (c) => c.name.toLowerCase() === trimmedName.toLowerCase()
  );
  if (nameCollision) {
    return {
      success: false,
      error: 'A category with this name already exists.',
    };
  }

  const now = new Date().toISOString();
  const newCategory: Category = {
    id: createCategoryId(),
    name: trimmedName,
    description: data.description?.trim() || '',
    color: data.color || 'blue',
    createdAt: now,
    updatedAt: now,
  };

  const updated = [...existing, newCategory];
  saveAllCategories(updated);

  return { success: true, category: newCategory };
}

/**
 * Updates an existing category's properties.
 */
export function updateCategory(
  id: string,
  data: {
    name: string;
    description?: string;
    color?: Category['color'];
  }
): { success: boolean; category?: Category; error?: string } {
  const trimmedName = data.name.trim();
  if (!trimmedName) {
    return { success: false, error: 'Category name cannot be empty.' };
  }

  const existing = loadAllCategories();
  const targetIndex = existing.findIndex((c) => c.id === id);
  if (targetIndex === -1) {
    return { success: false, error: 'Category not found.' };
  }

  // Check for duplicate name among other categories
  const nameCollision = existing.some(
    (c, i) => i !== targetIndex && c.name.toLowerCase() === trimmedName.toLowerCase()
  );
  if (nameCollision) {
    return {
      success: false,
      error: 'A category with this name already exists.',
    };
  }

  const updatedCategory: Category = {
    ...existing[targetIndex],
    name: trimmedName,
    description: data.description !== undefined ? data.description.trim() : existing[targetIndex].description,
    color: data.color || existing[targetIndex].color,
    updatedAt: new Date().toISOString(),
  };

  existing[targetIndex] = updatedCategory;
  saveAllCategories(existing);

  // Sync to server via PATCH
  fetch(`/api/categories/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: trimmedName, description: updatedCategory.description }),
  }).catch(() => {});

  return { success: true, category: updatedCategory };
}

/**
 * Deletes a category and safely reassigns all affected tests to replacementCategoryId.
 */
export function deleteCategory(id: string, replacementCategoryId?: string): {
  success: boolean;
  error?: string;
  reassignedCount: number;
} {
  const existing = loadAllCategories();
  const target = existing.find((c) => c.id === id);
  if (!target) {
    return { success: false, error: 'Category not found.', reassignedCount: 0 };
  }

  if (id === DEFAULT_CATEGORY_ID) {
    return {
      success: false,
      error: 'The default "Uncategorized" category cannot be deleted.',
      reassignedCount: 0,
    };
  }

  const tests = loadAllTests();
  const affectedTests = tests.filter((t) => t.categoryId === id);
  let targetReplacementId = replacementCategoryId;

  if (affectedTests.length > 0) {
    if (!targetReplacementId) {
      // Find a safe fallback if none provided
      const fallback = existing.find((c) => c.id !== id);
      if (!fallback) {
        return {
          success: false,
          error: 'Cannot delete the only existing category with tests.',
          reassignedCount: 0,
        };
      }
      targetReplacementId = fallback.id;
    }

    if (targetReplacementId === id) {
      return {
        success: false,
        error: 'A category cannot be moved into itself.',
        reassignedCount: 0,
      };
    }
  }

  // Reassign all tests belonging to this category to targetReplacementId
  let reassignedCount = 0;
  if (affectedTests.length > 0 && targetReplacementId) {
    const updatedTests = tests.map((t) => {
      if (t.categoryId === id) {
        reassignedCount++;
        return {
          ...t,
          categoryId: targetReplacementId,
          updatedAt: new Date().toISOString(),
        };
      }
      return t;
    });

    saveAllTests(updatedTests);
  }

  const filtered = existing.filter((c) => c.id !== id);
  saveAllCategories(filtered);

  // Sync delete to server in background
  fetch(`/api/categories/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ replacementCategoryId: targetReplacementId }),
  }).catch(() => {});

  return { success: true, reassignedCount };
}

/**
 * Background synchronization with server database.
 */
async function syncCategoriesToServer(categories: Category[]): Promise<void> {
  try {
    await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categories }),
    });
  } catch {
    // Silent background fallback
  }
}

/**
 * Fetches categories from server if available (e.g. cross-browser recovery).
 */
export async function fetchServerCategories(): Promise<Category[] | null> {
  try {
    const res = await fetch('/api/categories');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.categories) && data.categories.length > 0) {
        return data.categories;
      }
    }
  } catch {
    // Ignore network error
  }
  return null;
}
