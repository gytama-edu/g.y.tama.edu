/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GradingResult } from '../types/grading';

export const GRADING_RESULTS_STORAGE_KEY = 'assessora_grading_results';

/**
 * Loads all stored grading results from localStorage.
 */
export function loadAllGradingResults(): GradingResult[] {
  try {
    const raw = localStorage.getItem(GRADING_RESULTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (err) {
    console.error('Failed to load grading results from storage:', err);
    return [];
  }
}

/**
 * Saves or updates a GradingResult in localStorage.
 * Deterministic upsert based on result.id (testId + sessionId).
 */
export function saveGradingResult(result: GradingResult): void {
  try {
    const all = loadAllGradingResults();
    const existingIndex = all.findIndex(
      (r) => r.id === result.id || (r.testId === result.testId && r.sessionId === result.sessionId)
    );

    if (existingIndex >= 0) {
      all[existingIndex] = result;
    } else {
      all.push(result);
    }

    localStorage.setItem(GRADING_RESULTS_STORAGE_KEY, JSON.stringify(all));
  } catch (err) {
    console.error('Failed to save grading result to storage:', err);
  }
}

/**
 * Loads a GradingResult for a specific test and session.
 */
export function loadGradingResult(
  testId: string,
  sessionId: string
): GradingResult | null {
  const all = loadAllGradingResults();
  return (
    all.find(
      (r) => r.testId === testId && (r.sessionId === sessionId || r.id === `grading_${sessionId}`)
    ) || null
  );
}

/**
 * Loads all GradingResults for a given test ID.
 */
export function loadGradingResultsByTest(testId: string): GradingResult[] {
  const all = loadAllGradingResults();
  return all.filter((r) => r.testId === testId);
}

/**
 * Deletes a specific GradingResult.
 */
export function deleteGradingResult(resultId: string): void {
  try {
    const all = loadAllGradingResults();
    const filtered = all.filter((r) => r.id !== resultId);
    localStorage.setItem(GRADING_RESULTS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to delete grading result from storage:', err);
  }
}

/**
 * MODULE 14: Deletes all grading results for a specific test ID.
 */
export function deleteGradingResultsForTest(testId: string): void {
  try {
    const all = loadAllGradingResults();
    const filtered = all.filter((r) => r.testId !== testId);
    localStorage.setItem(GRADING_RESULTS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to delete test grading results from storage:', err);
  }
}

/**
 * MODULE 14: Deletes a grading result for a specific session of a test.
 */
export function deleteGradingResultForSession(testId: string, sessionId: string): void {
  try {
    const all = loadAllGradingResults();
    if (!sessionId) return;
    const cleanId = decodeURIComponent(sessionId).trim();

    const filtered = all.filter((r) => {
      const matchesSession =
        r.sessionId === sessionId ||
        r.sessionId === cleanId ||
        r.id === sessionId ||
        r.id === cleanId ||
        r.id === `grading_${sessionId}` ||
        r.id === `grading_${cleanId}`;

      if (matchesSession) {
        return false; // Remove
      }

      if (testId && (r.testId === testId || !r.testId)) {
        if (
          r.sessionId?.includes(cleanId) ||
          cleanId.includes(r.sessionId || '') ||
          r.id?.includes(cleanId)
        ) {
          return false; // Remove
        }
      }

      return true; // Keep
    });

    localStorage.setItem(GRADING_RESULTS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to delete session grading result from storage:', err);
  }
}

/**
 * Clears all grading results.
 */
export function clearAllGradingResults(): void {
  try {
    localStorage.removeItem(GRADING_RESULTS_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear grading results:', err);
  }
}
