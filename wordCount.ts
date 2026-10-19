/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Counts the number of words in a text string.
 * - Trims leading and trailing whitespace
 * - Treats consecutive whitespace (spaces, tabs, newlines) as separators
 * - Handles multiple paragraphs and line breaks
 * - Avoids counting empty strings or whitespace-only strings
 * - Does not count characters as words
 */
export function countWords(text?: string | null): number {
  if (!text) return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;

  // Split on any whitespace sequence (\s+ covers spaces, tabs, newlines, carriage returns)
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  return tokens.length;
}

/**
 * Checks whether a student response meets minimum and maximum word count requirements.
 */
export function evaluateWordCount(
  text: string | null | undefined,
  minimumWords?: number | null,
  maximumWords?: number | null
): {
  count: number;
  meetsMinimum: boolean;
  exceedsMaximum: boolean;
  minRequired: number | null;
  maxAllowed: number | null;
} {
  const count = countWords(text);
  const minRequired = typeof minimumWords === 'number' && minimumWords > 0 ? minimumWords : null;
  const maxAllowed = typeof maximumWords === 'number' && maximumWords > 0 ? maximumWords : null;

  return {
    count,
    meetsMinimum: minRequired !== null ? count >= minRequired : true,
    exceedsMaximum: maxAllowed !== null ? count > maxAllowed : false,
    minRequired,
    maxAllowed,
  };
}
