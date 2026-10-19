/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Test, TestAccess, DEFAULT_TEST_ACCESS } from '../types/test';
import { loadAllTests } from './storage';

// URL-safe, human-legible characters (omits ambiguous 0, O, 1, I, L)
const ACCESS_CODE_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const ACCESS_CODE_LENGTH = 8;

/**
 * Normalizes a raw access object, guaranteeing no null/undefined exceptions.
 * Unconfigured/legacy tests default safely to disabled access.
 */
export function normalizeTestAccess(raw?: unknown): TestAccess {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_TEST_ACCESS };
  }

  const obj = raw as Record<string, unknown>;
  const enabled = Boolean(obj.enabled);
  const accessCode =
    typeof obj.accessCode === 'string' ? obj.accessCode.trim() : '';
  const createdAt =
    typeof obj.createdAt === 'string' && obj.createdAt.trim()
      ? obj.createdAt.trim()
      : null;

  return {
    enabled,
    accessCode,
    createdAt,
  };
}

/**
 * Generates an unpredictable, URL-safe access code.
 * Checks against existing codes to ensure collision resistance.
 */
export function generateAccessCode(existingCodes: string[] = []): string {
  const existingSet = new Set(
    existingCodes.map((c) => (c ? c.toUpperCase().trim() : ''))
  );

  let attempts = 0;
  while (attempts < 1000) {
    attempts++;
    let result = '';
    // Prefer crypto.getRandomValues when available
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const bytes = new Uint8Array(ACCESS_CODE_LENGTH);
      crypto.getRandomValues(bytes);
      for (let i = 0; i < ACCESS_CODE_LENGTH; i++) {
        result += ACCESS_CODE_CHARS[bytes[i] % ACCESS_CODE_CHARS.length];
      }
    } else {
      for (let i = 0; i < ACCESS_CODE_LENGTH; i++) {
        const rand = Math.floor(Math.random() * ACCESS_CODE_CHARS.length);
        result += ACCESS_CODE_CHARS[rand];
      }
    }

    if (!existingSet.has(result)) {
      return result;
    }
  }

  // Fallback with timestamp suffix in extreme collision case
  return `AC${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

/**
 * Builds the canonical shareable access URL.
 */
export function buildShareableUrl(accessCode: string): string {
  const cleanCode = encodeURIComponent(accessCode.trim());
  if (typeof window === 'undefined') {
    return `/#/test/${cleanCode}`;
  }

  const origin = window.location.origin;
  const path = window.location.pathname.replace(/\/+$/, '');
  return `${origin}${path}/#/test/${cleanCode}`;
}

/**
 * Formats an access code for visual display (e.g. 8K2P-9M4Z if 8 characters).
 */
export function formatAccessCodeDisplay(code?: string | null): string {
  if (!code) return '';
  const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length === 8) {
    return `${clean.slice(0, 4)}-${clean.slice(4)}`;
  }
  return clean || code.trim().toUpperCase();
}

/**
 * Cleans user-entered access code input (stripping whitespace, hyphens, and non-alphanumerics).
 */
export function cleanAccessCodeInput(raw: string): string {
  if (!raw) return '';
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '');
}

/**
 * Robustly extracts the student access code from any location source:
 * - window.location.hash (e.g. #/test/ABC123, #test/ABC123, #/test/ABC123/, #/test/ABC123?preview=1)
 * - window.location.search (e.g. ?test=ABC123, ?code=ABC123, ?accessCode=ABC123)
 * - window.location.pathname (e.g. /test/ABC123)
 * - window.location.href (e.g. any URL containing /test/ABC123)
 */
export function extractAccessCode(
  location?: {
    href?: string;
    hash?: string;
    pathname?: string;
    search?: string;
  }
): string | null {
  const loc =
    location || (typeof window !== 'undefined' ? window.location : null);
  if (!loc) return null;

  const hash = loc.hash || '';
  const pathname = loc.pathname || '';
  const search = loc.search || '';
  const href = loc.href || '';

  // 1. Primary: Hash-based routing (e.g. #/test/ABC123 or #test/ABC123)
  if (hash) {
    const hashMatch = hash.match(/^#\/?test\/([^/?#&]+)/i);
    if (hashMatch && hashMatch[1]) {
      try {
        return decodeURIComponent(hashMatch[1]).trim();
      } catch {
        return hashMatch[1].trim();
      }
    }

    // Check if query parameter style inside hash: e.g. #/test?code=CODE
    if (hash.includes('test') && hash.includes('=')) {
      const qIndex = hash.indexOf('?');
      if (qIndex !== -1) {
        const hashParams = new URLSearchParams(hash.slice(qIndex + 1));
        const val =
          hashParams.get('code') ||
          hashParams.get('accessCode') ||
          hashParams.get('test');
        if (val) return val.trim();
      }
    }
  }

  // 2. Search query params: ?test=CODE or ?code=CODE or ?accessCode=CODE
  if (search) {
    const searchParams = new URLSearchParams(search);
    const val =
      searchParams.get('test') ||
      searchParams.get('code') ||
      searchParams.get('accessCode');
    if (val) return val.trim();
  }

  // 3. Fallback: Pathname-based (e.g. /test/CODE or /test/CODE/)
  if (pathname) {
    const pathMatch = pathname.match(/^\/?test\/([^/?#&]+)/i);
    if (pathMatch && pathMatch[1]) {
      try {
        return decodeURIComponent(pathMatch[1]).trim();
      } catch {
        return pathMatch[1].trim();
      }
    }
  }

  // 4. Fallback: Search inside href in case hash/pathname was encoded or nested
  if (href) {
    const hrefMatch = href.match(/[#/]test\/([^/?#&]+)/i);
    if (hrefMatch && hrefMatch[1]) {
      try {
        return decodeURIComponent(hrefMatch[1]).trim();
      } catch {
        return hrefMatch[1].trim();
      }
    }
  }

  return null;
}

/**
 * Access Validation Result discriminated union
 */
export type AccessValidationResult =
  | { status: 'valid'; test: Test }
  | { status: 'disabled'; test: Test }
  | { status: 'not-found' }
  | { status: 'invalid-code' };

/**
 * Validates a student's access code against stored Tests (synchronously).
 */
export function validateTestAccess(
  accessCode?: string | null,
  testsList?: Test[]
): AccessValidationResult {
  if (!accessCode || typeof accessCode !== 'string') {
    return { status: 'invalid-code' };
  }

  let clean = accessCode.trim();
  try {
    clean = decodeURIComponent(clean).trim();
  } catch {
    // keep trimmed
  }

  if (!clean || clean.length > 64) {
    return { status: 'invalid-code' };
  }

  // Sanitize: only alphanumeric and hyphens/underscores allowed
  if (!/^[a-zA-Z0-9_-]+$/.test(clean)) {
    return { status: 'invalid-code' };
  }

  const tests = testsList || loadAllTests();
  const found = tests.find(
    (t) =>
      t.access?.accessCode &&
      (t.access.accessCode.trim() === clean ||
        t.access.accessCode.trim().toUpperCase() === clean.toUpperCase())
  );

  if (!found) {
    return { status: 'not-found' };
  }

  if (!found.access || !found.access.enabled) {
    return { status: 'disabled', test: found };
  }

  return { status: 'valid', test: found };
}

/**
 * Asynchronously validates a student's access code against the server database.
 * Enables CROSS-BROWSER and CROSS-DEVICE test access.
 * Automatically synchronizes/caches the published test into client storage.
 */
export async function validateTestAccessAsync(
  accessCode?: string | null
): Promise<AccessValidationResult> {
  if (!accessCode || typeof accessCode !== 'string') {
    return { status: 'invalid-code' };
  }

  let clean = accessCode.trim();
  try {
    clean = decodeURIComponent(clean).trim();
  } catch {
    // keep trimmed
  }

  if (!clean || clean.length > 64) {
    return { status: 'invalid-code' };
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(clean)) {
    return { status: 'invalid-code' };
  }

  try {
    // Query authoritative server persistence
    const res = await fetch(`/api/tests/access/${encodeURIComponent(clean)}`);

    if (res.ok) {
      const data = await res.json();
      if (data.status === 'valid' && data.test) {
        // Cache server-published test locally so all student components resolve seamlessly
        const { saveTest } = await import('./storage');
        saveTest(data.test);
        return { status: 'valid', test: data.test };
      }
    } else if (res.status === 403) {
      const data = await res.json().catch(() => ({}));
      return {
        status: 'disabled',
        test: data.test || findTestByAccessCode(clean) || ({} as Test),
      };
    } else if (res.status === 404) {
      // Check local storage before concluding not found (e.g. offline testing)
      const localResult = validateTestAccess(clean);
      return localResult;
    }
  } catch (err) {
    console.warn('[testAccess] Network check failed, falling back to local storage:', err);
  }

  // Graceful fallback to local storage
  return validateTestAccess(clean);
}

/**
 * Publishes a test to the server persistence layer.
 * Guarantees cross-browser and cross-device availability.
 */
export async function publishTestToServer(test: Test): Promise<{
  success: boolean;
  accessCode: string;
  ownerToken?: string;
}> {
  try {
    const payload = {
      testId: test.id,
      title: test.title,
      description: test.description,
      categoryId: test.categoryId || 'cat_general',
      sections: test.sections || [],
      readingSets: test.readingSets || [],
      audioId: test.audioId,
      audioMetadata: test.audioMetadata,
      settings: test.settings,
      questions: test.questions,
      access: test.access,
      accessCode: test.access?.accessCode,
      enabled: test.access?.enabled ?? true,
      createdAt: test.createdAt,
      updatedAt: test.updatedAt,
    };

    const res = await fetch('/api/tests/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        accessCode: data.accessCode || test.access?.accessCode || '',
        ownerToken: data.ownerToken,
      };
    } else {
      const errData = await res.json().catch(() => ({}));
      console.error('[testAccess] Failed to publish test to server:', errData);
      return { success: false, accessCode: test.access?.accessCode || '' };
    }
  } catch (err) {
    console.error('[testAccess] Network error publishing test:', err);
    return { success: false, accessCode: test.access?.accessCode || '' };
  }
}

/**
 * Toggles the enabled state of a test on the server.
 */
export async function toggleTestAccessOnServer(
  accessCode: string,
  enabled: boolean
): Promise<boolean> {
  try {
    const res = await fetch(`/api/tests/access/${encodeURIComponent(accessCode)}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    return res.ok;
  } catch (err) {
    console.error('[testAccess] Failed to toggle test access on server:', err);
    return false;
  }
}

/**
 * Regenerates the access code on the server.
 */
export async function regenerateTestAccessOnServer(
  accessCode: string,
  ownerToken?: string
): Promise<{ success: boolean; accessCode: string }> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Teacher-Token': ownerToken || 'teacher_admin_auth',
    };
    const res = await fetch(`/api/tests/access/${encodeURIComponent(accessCode)}/regenerate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ownerToken }),
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, accessCode: data.accessCode };
    }
    return { success: false, accessCode };
  } catch (err) {
    console.error('[testAccess] Failed to regenerate access code on server:', err);
    return { success: false, accessCode };
  }
}

/**
 * Submits a completed student test session to the server for authoritative grading and storage.
 */
export async function submitStudentSessionToServer(
  accessCode: string,
  session: {
    id?: string;
    testId: string;
    studentName: string;
    startedAt: string;
    submittedAt?: string | null;
    answers: Record<string, any>;
  }
): Promise<{ success: boolean; gradingResult?: any; submissionId?: string }> {
  try {
    const res = await fetch('/api/tests/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessCode,
        testId: session.testId,
        studentName: session.studentName,
        sessionId: session.id,
        startedAt: session.startedAt,
        submittedAt: session.submittedAt || new Date().toISOString(),
        answers: session.answers,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        gradingResult: data.gradingResult,
        submissionId: data.submissionId,
      };
    }
  } catch (err) {
    console.warn('[testAccess] Failed to submit session to server, falling back to local:', err);
  }
  return { success: false };
}

/**
 * Fetches server-side submissions for teacher reports across all devices.
 */
export async function fetchServerSubmissions(testId: string): Promise<any[]> {
  try {
    const res = await fetch(`/api/tests/${encodeURIComponent(testId)}/submissions`);
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data.submissions) ? data.submissions : [];
    }
  } catch (err) {
    console.warn('[testAccess] Failed to fetch server submissions:', err);
  }
  return [];
}

/**
 * Finds a test by access code without validating enabled state.
 */
export function findTestByAccessCode(
  accessCode: string,
  testsList?: Test[]
): Test | null {
  if (!accessCode || typeof accessCode !== 'string') return null;
  const clean = accessCode.trim().toUpperCase();
  if (!clean) return null;

  const tests = testsList || loadAllTests();
  return (
    tests.find(
      (t) =>
        t.access?.accessCode &&
        t.access.accessCode.toUpperCase() === clean
    ) || null
  );
}
