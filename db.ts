/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { Test, Question, TestSettings, TestAccess, ReadingSet, AssessmentSection } from '../types/test';
import { Category, INITIAL_DEFAULT_CATEGORIES } from '../types/category';
import { StudentAnswer } from '../types/student';
import { GradingResult } from '../types/grading';
import {
  AudioMetadata,
  AudioUploadConfig,
  AudioErrorCode,
  DEFAULT_MAX_AUDIO_SIZE_BYTES,
  SUPPORTED_AUDIO_EXTENSIONS,
  SUPPORTED_AUDIO_MIME_TYPES,
  SupportedAudioExtension,
} from '../types/audio';

export interface ServerPublishedTest {
  testId: string;
  accessCode: string;
  ownerToken: string;
  title: string;
  description: string;
  instructions?: string;
  categoryId?: string;
  audioId?: string;
  audioMetadata?: AudioMetadata;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  enabled: boolean;
  settings: TestSettings;
  sections?: AssessmentSection[];
  questions: Question[];
  readingSets?: ReadingSet[];
}


export interface ServerSubmission {
  id: string;
  testId: string;
  accessCode: string;
  sessionId: string;
  studentName: string;
  startedAt: string;
  submittedAt: string;
  answers: Record<string, StudentAnswer>;
  gradingResult: GradingResult;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const TESTS_FILE = path.join(DATA_DIR, 'published_tests.json');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');
const CATEGORIES_FILE = path.join(DATA_DIR, 'categories.json');
const AUDIO_DIR = path.join(DATA_DIR, 'audio');
const AUDIO_METADATA_FILE = path.join(DATA_DIR, 'audio_metadata.json');

/** Maximum configurable audio file size in bytes (default 25MB) */
export const MAX_AUDIO_SIZE_BYTES =
  Number(process.env.MAX_AUDIO_SIZE_BYTES) || DEFAULT_MAX_AUDIO_SIZE_BYTES;

let isInitialized = false;

/**
 * Initializes the data directory and stores if not already existing.
 */
export async function initDb(): Promise<void> {
  if (isInitialized) return;

  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(AUDIO_DIR, { recursive: true });

    try {
      await fs.access(TESTS_FILE);
    } catch {
      await fs.writeFile(TESTS_FILE, JSON.stringify([], null, 2), 'utf-8');
    }

    try {
      await fs.access(SUBMISSIONS_FILE);
    } catch {
      await fs.writeFile(SUBMISSIONS_FILE, JSON.stringify([], null, 2), 'utf-8');
    }

    try {
      await fs.access(CATEGORIES_FILE);
    } catch {
      await fs.writeFile(CATEGORIES_FILE, JSON.stringify(INITIAL_DEFAULT_CATEGORIES, null, 2), 'utf-8');
    }

    try {
      await fs.access(AUDIO_METADATA_FILE);
    } catch {
      await fs.writeFile(AUDIO_METADATA_FILE, JSON.stringify([], null, 2), 'utf-8');
    }

    isInitialized = true;
  } catch (err) {
    console.error('[DB] Failed to initialize data storage directory:', err);
  }
}

/**
 * Safely writes JSON data to a file atomically via a temporary file.
 */
async function atomicWriteJson(filePath: string, data: unknown): Promise<void> {
  await initDb();
  const tempPath = `${filePath}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;
  const content = JSON.stringify(data, null, 2);
  await fs.writeFile(tempPath, content, 'utf-8');
  await fs.rename(tempPath, filePath);
}

/**
 * Reads all categories from server storage.
 */
export async function getAllCategories(): Promise<Category[]> {
  await initDb();
  try {
    const raw = await fs.readFile(CATEGORIES_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_DEFAULT_CATEGORIES;
  } catch (err) {
    console.error('[DB] Error reading categories:', err);
    return INITIAL_DEFAULT_CATEGORIES;
  }
}

/**
 * Saves all categories to server storage.
 */
export async function saveCategories(categories: Category[]): Promise<void> {
  await initDb();
  await atomicWriteJson(CATEGORIES_FILE, categories);
}

/**
 * Deletes a category from server storage and optionally reassigns published tests.
 */
export async function deleteCategoryServer(
  id: string,
  replacementCategoryId?: string
): Promise<{ success: boolean; error?: string }> {
  await initDb();
  const all = await getAllCategories();
  const filtered = all.filter((c) => c.id !== id);
  await saveCategories(filtered);

  if (replacementCategoryId) {
    const tests = await getAllPublishedTests();
    let testsUpdated = false;
    for (const t of tests) {
      if (t.categoryId === id) {
        t.categoryId = replacementCategoryId;
        testsUpdated = true;
      }
    }
    if (testsUpdated) {
      await atomicWriteJson(TESTS_FILE, tests);
    }
  }

  return { success: true };
}

/**
 * Reads all published tests from server storage.
 */
export async function getAllPublishedTests(): Promise<ServerPublishedTest[]> {
  await initDb();
  try {
    const raw = await fs.readFile(TESTS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('[DB] Error reading published tests:', err);
    return [];
  }
}

/**
 * Finds a published test by its access code (case-insensitive).
 */
export async function getPublishedTestByAccessCode(
  accessCode: string
): Promise<ServerPublishedTest | null> {
  if (!accessCode) return null;
  const clean = accessCode.trim().toUpperCase();
  const all = await getAllPublishedTests();
  return all.find((t) => t.accessCode.toUpperCase() === clean) || null;
}

/**
 * Finds a published test by testId.
 */
export async function getPublishedTestById(
  testId: string
): Promise<ServerPublishedTest | null> {
  if (!testId) return null;
  const all = await getAllPublishedTests();
  return all.find((t) => t.testId === testId) || null;
}

/**
 * Saves or updates a published test in server storage.
 */
export async function savePublishedTest(
  test: ServerPublishedTest
): Promise<ServerPublishedTest> {
  await initDb();
  const all = await getAllPublishedTests();
  const index = all.findIndex(
    (t) => t.testId === test.testId || t.accessCode.toUpperCase() === test.accessCode.toUpperCase()
  );

  if (index >= 0) {
    all[index] = { ...all[index], ...test, updatedAt: new Date().toISOString() };
  } else {
    all.unshift(test);
  }

  await atomicWriteJson(TESTS_FILE, all);
  return test;
}

/**
 * Toggles or updates the enabled state of a published test.
 */
export async function togglePublishedTest(
  accessCode: string,
  enabled: boolean
): Promise<ServerPublishedTest | null> {
  await initDb();
  const all = await getAllPublishedTests();
  const clean = accessCode.trim().toUpperCase();
  const target = all.find((t) => t.accessCode.toUpperCase() === clean);

  if (!target) return null;

  target.enabled = enabled;
  target.updatedAt = new Date().toISOString();

  await atomicWriteJson(TESTS_FILE, all);
  return target;
}

/**
 * Regenerates the access code for an existing published test.
 */
export async function regenerateTestAccessCode(
  oldCode: string,
  newCode: string
): Promise<ServerPublishedTest | null> {
  await initDb();
  const all = await getAllPublishedTests();
  const cleanOld = oldCode.trim().toUpperCase();
  const target = all.find((t) => t.accessCode.toUpperCase() === cleanOld);

  if (!target) return null;

  target.accessCode = newCode.trim().toUpperCase();
  target.updatedAt = new Date().toISOString();

  await atomicWriteJson(TESTS_FILE, all);
  return target;
}

/**
 * Reads all submissions from storage.
 */
export async function getAllSubmissions(): Promise<ServerSubmission[]> {
  await initDb();
  try {
    const raw = await fs.readFile(SUBMISSIONS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('[DB] Error reading submissions:', err);
    return [];
  }
}

/**
 * Saves a new student submission.
 */
export async function saveSubmission(
  submission: ServerSubmission
): Promise<ServerSubmission> {
  await initDb();
  const all = await getAllSubmissions();
  const existingIdx = all.findIndex((s) => s.id === submission.id || s.sessionId === submission.sessionId);

  if (existingIdx >= 0) {
    all[existingIdx] = submission;
  } else {
    all.unshift(submission);
  }

  await atomicWriteJson(SUBMISSIONS_FILE, all);
  return submission;
}

/**
 * Gets all submissions for a specific testId or accessCode.
 */
export async function getSubmissionsByTestId(
  testId: string
): Promise<ServerSubmission[]> {
  const all = await getAllSubmissions();
  const clean = testId ? testId.trim() : '';
  return all.filter(
    (s) => s.testId === clean || s.accessCode?.toUpperCase() === clean.toUpperCase()
  );
}

/**
 * MODULE 14: Clears all student submissions for a specific test.
 * Preserves the test itself, its questions, settings, category, and share link.
 * Returns the count of deleted submissions.
 */
export async function clearSubmissionsByTestId(
  testId: string
): Promise<number> {
  await initDb();
  const all = await getAllSubmissions();
  const clean = testId ? testId.trim() : '';
  const remaining = all.filter(
    (s) => s.testId !== clean && s.accessCode?.toUpperCase() !== clean.toUpperCase()
  );
  const clearedCount = all.length - remaining.length;

  if (clearedCount > 0) {
    await atomicWriteJson(SUBMISSIONS_FILE, remaining);
  }

  return clearedCount;
}

/**
 * MODULE 14: Clears an individual student submission by submission ID or session ID.
 * Matches by submission id or sessionId, and verifies against testId if provided.
 * Returns true if found and deleted, false if already absent.
 */
export async function deleteSubmissionById(
  testId: string,
  submissionOrSessionId: string
): Promise<boolean> {
  await initDb();
  const all = await getAllSubmissions();
  if (!submissionOrSessionId) return false;

  const rawTarget = submissionOrSessionId.trim();
  let cleanTarget = rawTarget;
  try {
    cleanTarget = decodeURIComponent(rawTarget).trim();
  } catch {
    // Keep raw
  }

  let cleanTestId = testId ? testId.trim() : '';
  try {
    if (cleanTestId) cleanTestId = decodeURIComponent(cleanTestId).trim();
  } catch {
    // Keep raw
  }

  const remaining = all.filter((s) => {
    const directMatch =
      s.id === rawTarget ||
      s.id === cleanTarget ||
      s.sessionId === rawTarget ||
      s.sessionId === cleanTarget;

    const compositeMatch = Boolean(
      (s.studentName &&
        s.startedAt &&
        (cleanTarget.includes(encodeURIComponent(s.studentName)) ||
          cleanTarget.includes(s.studentName)) &&
        cleanTarget.includes(s.startedAt)) ||
        (s.sessionId && cleanTarget.includes(s.sessionId)) ||
        (cleanTarget && s.sessionId && s.sessionId.includes(cleanTarget))
    );

    const matchesTarget = directMatch || compositeMatch;

    if (!matchesTarget) {
      return true; // Keep this submission
    }

    // Target matched! If testId is specified, check compatibility
    if (cleanTestId && s.testId) {
      const testMatches =
        s.testId === cleanTestId ||
        s.testId === testId ||
        s.accessCode?.toUpperCase() === cleanTestId.toUpperCase() ||
        cleanTestId.toUpperCase() === s.accessCode?.toUpperCase();

      // If direct match was found, delete regardless of minor testId mismatch
      if (directMatch || testMatches) {
        return false; // Delete it
      }
      return true; // Keep if totally different test and only composite matched
    }

    // Direct or verified match -> delete it
    return false;
  });

  const deletedCount = all.length - remaining.length;
  if (deletedCount > 0) {
    await atomicWriteJson(SUBMISSIONS_FILE, remaining);
    return true;
  }

  return false;
}

/**
 * Sanitizes a published test for student consumption:
 * CRITICAL SECURITY: STRIPS all answer keys, isCorrect attributes, acceptedAnswers, and correct solutions!
 */
export function sanitizeTestForStudent(published: ServerPublishedTest): Test {
  return {
    id: published.testId,
    title: published.title,
    description: published.description,
    categoryId: published.categoryId || 'cat_general',
    createdAt: published.createdAt,
    updatedAt: published.updatedAt,
    audioId: published.audioId,
    audioMetadata: published.audioMetadata,
    settings: { ...published.settings },
    access: {
      enabled: published.enabled,
      accessCode: published.accessCode,
      createdAt: published.publishedAt,
    },
    sections: published.sections
      ? published.sections.map((sec) => ({
          id: sec.id,
          title: sec.title,
          type: sec.type,
          instructions: sec.instructions,
          order: sec.order,
          audioId: sec.audioId,
          audioMetadata: sec.audioMetadata,
          readingSetId: sec.readingSetId,
          questionIds: sec.questionIds,
          createdAt: sec.createdAt,
          updatedAt: sec.updatedAt,
        }))
      : [],
    readingSets: published.readingSets
      ? published.readingSets.map((rs) => ({
          id: rs.id,
          title: rs.title,
          passage: rs.passage,
          instructions: rs.instructions,
          source: rs.source,
          order: rs.order,
          audioId: rs.audioId,
          audioMetadata: rs.audioMetadata,
          createdAt: rs.createdAt,
          updatedAt: rs.updatedAt,
        }))
      : [],
    questions: published.questions.map((q) => {
      const sanitized: Question = {
        id: q.id,
        type: q.type,
        text: q.text,
        points: q.points,
        order: q.order,
      };

      if (q.sectionId) {
        sanitized.sectionId = q.sectionId;
      }


      if (q.readingSetId) {
        sanitized.readingSetId = q.readingSetId;
      }
      if (q.audioId) {
        sanitized.audioId = q.audioId;
      }
      if (q.audioMetadata) {
        sanitized.audioMetadata = q.audioMetadata;
      }

      // 1. Multiple Choice / Single Choice / Multiple Select: Strip isCorrect and correctAnswer keys
      if (q.options) {
        sanitized.options = q.options.map((opt) => ({
          id: opt.id,
          text: opt.text,
          isCorrect: false, // STRIPPED
        }));
      }

      // 2. Short Answer: Strip acceptedAnswers
      // acceptedAnswers is left undefined

      // 3. Fill in the Blank: Strip accepted answers for every blank
      if (q.blanks) {
        sanitized.blanks = q.blanks.map((b) => ({
          id: b.id,
          acceptedAnswers: [], // STRIPPED
        }));
      }

      // 4. Matching: Send options without answer pairings
      if (q.matchingPairs) {
        sanitized.matchingPairs = q.matchingPairs.map((p) => ({
          id: p.id,
          left: p.left,
          right: p.right,
        }));
      }
      if (q.leftItems) {
        sanitized.leftItems = q.leftItems.map((item) => ({
          id: item.id,
          text: item.text,
        }));
      }
      if (q.rightItems) {
        sanitized.rightItems = q.rightItems.map((item) => ({
          id: item.id,
          text: item.text,
        }));
      }
      // correctMatches is never copied - not exposed to students

      // 5. Ordering: Send items without revealing the correct order index
      if (q.orderingItems) {
        sanitized.orderingItems = q.orderingItems.map((item) => ({
          id: item.id,
          text: item.text,
        }));
      }
      if (q.items) {
        sanitized.items = q.items.map((item) => ({
          id: item.id,
          text: item.text,
        }));
      }
      // correctOrder is never copied - not exposed to students

      // 6. Essay: Max words limit
      if (q.maxWords !== undefined) {
        sanitized.maxWords = q.maxWords;
      }
      if (q.requiresManualGrading !== undefined) {
        sanitized.requiresManualGrading = q.requiresManualGrading;
      }

      // 7. Writing (Module 13): Writing config
      if (q.writingConfig) {
        sanitized.writingConfig = {
          instructions: q.writingConfig.instructions,
          writingType: q.writingConfig.writingType,
          minimumWords: q.writingConfig.minimumWords,
          maximumWords: q.writingConfig.maximumWords,
          showWordCount: q.writingConfig.showWordCount !== false,
        };
        sanitized.requiresManualGrading = true;
      }

      return sanitized;
    }),
  };
}

/* ==========================================================================
   MODULE 16: PERSISTENT AUDIO INFRASTRUCTURE
   Storage, retrieval, server-side validation, and metadata persistence.
   ========================================================================== */

/**
 * Result of validating an audio buffer.
 */
export interface AudioValidationResult {
  valid: boolean;
  error?: string;
  code?: AudioErrorCode;
  canonicalMimeType?: string;
  extension?: SupportedAudioExtension;
  cleanFilename?: string;
}

/**
 * Strips path traversal sequences and unsafe control characters from a filename.
 */
export function sanitizeAudioFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') return 'audio_file';
  // Strip path traversal and directory separators
  const base = path.basename(filename).replace(/[\0\r\n\t]/g, '').trim();
  // Keep only standard safe characters
  const sanitized = base.replace(/[^a-zA-Z0-9._\-\s()[\]]/g, '_');
  return sanitized.slice(0, 150) || 'audio_file';
}

/**
 * Validates audio file buffer, extension, MIME type, size, and magic byte signatures.
 */
export function validateAudioBuffer(
  buffer: Buffer,
  originalFilename: string,
  declaredMimeType?: string
): AudioValidationResult {
  if (!buffer || buffer.length === 0) {
    return {
      valid: false,
      error: 'Empty or missing audio file.',
      code: 'NO_FILE_PROVIDED',
    };
  }

  // 1. File size check
  if (buffer.length > MAX_AUDIO_SIZE_BYTES) {
    const maxMb = Math.round(MAX_AUDIO_SIZE_BYTES / (1024 * 1024));
    return {
      valid: false,
      error: `File size (${(buffer.length / (1024 * 1024)).toFixed(
        2
      )} MB) exceeds the maximum allowed limit of ${maxMb} MB.`,
      code: 'FILE_TOO_LARGE',
    };
  }

  // 2. Extension check
  const cleanFilename = sanitizeAudioFilename(originalFilename);
  const extMatch = cleanFilename.match(/\.([a-zA-Z0-9]+)$/);
  const rawExt = extMatch ? extMatch[1].toLowerCase() : '';

  let extension: SupportedAudioExtension | null = null;
  if (rawExt === 'mp3') extension = 'mp3';
  else if (rawExt === 'wav') extension = 'wav';
  else if (rawExt === 'm4a') extension = 'm4a';

  if (!extension) {
    return {
      valid: false,
      error: `Unsupported audio extension (.${rawExt || 'unknown'}). Only MP3, WAV, and M4A audio files are supported.`,
      code: 'UNSUPPORTED_FORMAT',
    };
  }

  // 3. Audio Magic Bytes / Header Signature Verification
  let detectedFormat: 'mp3' | 'wav' | 'm4a' | null = null;

  // WAV signature check: RIFF....WAVE or RIFX....WAVE
  if (
    buffer.length >= 12 &&
    (buffer.toString('ascii', 0, 4) === 'RIFF' || buffer.toString('ascii', 0, 4) === 'RIFX') &&
    buffer.toString('ascii', 8, 12) === 'WAVE'
  ) {
    detectedFormat = 'wav';
  }

  // MP3 signature check:
  // ID3 tag: starts with "ID3"
  if (
    !detectedFormat &&
    buffer.length >= 3 &&
    buffer[0] === 0x49 &&
    buffer[1] === 0x44 &&
    buffer[2] === 0x33
  ) {
    detectedFormat = 'mp3';
  }

  // MP3 frame sync: starts with 0xFF followed by 3 bits set (0xE0)
  if (!detectedFormat && buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) {
    detectedFormat = 'mp3';
  }

  // If first bytes didn't hit MPEG sync directly, scan the first 1024 bytes for MPEG sync or ID3
  if (!detectedFormat) {
    const scanLimit = Math.min(buffer.length - 2, 1024);
    for (let i = 0; i < scanLimit; i++) {
      if (
        i + 2 < buffer.length &&
        buffer[i] === 0x49 &&
        buffer[i + 1] === 0x44 &&
        buffer[i + 2] === 0x33
      ) {
        detectedFormat = 'mp3';
        break;
      }
      if (buffer[i] === 0xff && (buffer[i + 1] & 0xe0) === 0xe0) {
        detectedFormat = 'mp3';
        break;
      }
    }
  }

  // M4A signature check: ISO base media file with "ftyp" box at offset 4
  if (!detectedFormat && buffer.length >= 12) {
    const boxType = buffer.toString('ascii', 4, 8);
    if (boxType === 'ftyp') {
      const majorBrand = buffer.toString('ascii', 8, 12).toLowerCase();
      // Check brand or compatibility brands in header
      const headerStr = buffer.toString('ascii', 8, Math.min(buffer.length, 36)).toLowerCase();
      if (
        majorBrand.includes('m4a') ||
        headerStr.includes('m4a') ||
        majorBrand.includes('mp4') ||
        headerStr.includes('isom') ||
        headerStr.includes('mp42') ||
        headerStr.includes('dash')
      ) {
        detectedFormat = 'm4a';
      }
    }
  }

  // If magic byte detection confirmed a different known format
  if (detectedFormat && detectedFormat !== extension) {
    // If user uploaded an m4a that is actually wav, or vice versa
    return {
      valid: false,
      error: `File signature mismatch: file appears to be ${detectedFormat.toUpperCase()} but extension is .${extension}.`,
      code: 'UNSUPPORTED_FORMAT',
    };
  }

  // If format couldn't be detected by magic bytes, verify declared MIME type or fallback if valid
  if (!detectedFormat) {
    const normDeclared = (declaredMimeType || '').toLowerCase().trim();
    const isDeclaredMimeSupported =
      normDeclared.includes('audio/mpeg') ||
      normDeclared.includes('audio/mp3') ||
      normDeclared.includes('audio/wav') ||
      normDeclared.includes('audio/x-wav') ||
      normDeclared.includes('audio/mp4') ||
      normDeclared.includes('audio/x-m4a') ||
      normDeclared.includes('audio/m4a') ||
      normDeclared.includes('audio/aac');

    if (!isDeclaredMimeSupported && buffer.length < 32) {
      return {
        valid: false,
        error: 'Uploaded file is corrupted or not a valid audio recording.',
        code: 'CORRUPTED_FILE',
      };
    }
  }

  // Canonical MIME mapping
  let canonicalMimeType: string;
  switch (extension) {
    case 'wav':
      canonicalMimeType = 'audio/wav';
      break;
    case 'm4a':
      canonicalMimeType = 'audio/mp4';
      break;
    case 'mp3':
    default:
      canonicalMimeType = 'audio/mpeg';
      break;
  }

  return {
    valid: true,
    canonicalMimeType,
    extension,
    cleanFilename,
  };
}

import {
  saveAudioToSupabase,
  getAudioBufferFromSupabase,
  getAudioMetadataFromSupabase,
  getAllAudioMetadataFromSupabase,
  deleteAudioFromSupabase,
  getAudioStorageConfig as getSupabaseAudioConfig,
  isSupabaseConfigured,
  ensureSupabaseAudioBucket,
  getStorageDiagnostic,
  normalizeSupabaseUrl,
  SUPABASE_AUDIO_BUCKET,
} from './supabaseAudio';

export {
  saveAudioToSupabase,
  getAudioBufferFromSupabase,
  getAudioMetadataFromSupabase,
  getAllAudioMetadataFromSupabase,
  deleteAudioFromSupabase,
  isSupabaseConfigured,
  ensureSupabaseAudioBucket,
  getStorageDiagnostic,
  normalizeSupabaseUrl,
  SUPABASE_AUDIO_BUCKET,
};

/**
 * Returns configuration settings for audio uploads.
 */
export function getAudioStorageConfig(): AudioUploadConfig & {
  backend: 'supabase' | 'unconfigured';
  bucket: string;
} {
  return getSupabaseAudioConfig();
}

/**
 * Reads all audio metadata records from persistent storage (Supabase Storage).
 */
export async function getAllAudioMetadata(): Promise<AudioMetadata[]> {
  if (isSupabaseConfigured()) {
    return getAllAudioMetadataFromSupabase();
  }

  // If in production without Supabase: do not silently fall back
  if (process.env.NODE_ENV === 'production') {
    console.error(
      '[DB] Supabase Storage is not configured in production. Set SUPABASE_URL and SUPABASE_SECRET_KEY.'
    );
    return [];
  }

  // Development fallback for existing local files before migration
  await initDb();
  try {
    const raw = await fs.readFile(AUDIO_METADATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

/**
 * Retrieves a single audio metadata record by file ID.
 */
export async function getAudioMetadataById(id: string): Promise<AudioMetadata | null> {
  if (!id || typeof id !== 'string') return null;

  if (isSupabaseConfigured()) {
    return getAudioMetadataFromSupabase(id);
  }

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const all = await getAllAudioMetadata();
  const cleanId = id.trim();
  return all.find((item) => item.id === cleanId) || null;
}

/**
 * Returns the audio buffer and metadata for a given audio ID.
 */
export async function getAudioFileBuffer(
  id: string
): Promise<{ buffer: Buffer; metadata: AudioMetadata } | null> {
  if (isSupabaseConfigured()) {
    return getAudioBufferFromSupabase(id);
  }

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  // Development local read
  const metadata = await getAudioMetadataById(id);
  if (!metadata) return null;

  const fileName = path.basename(metadata.storageReference);
  const absolutePath = path.join(AUDIO_DIR, fileName);
  try {
    const buffer = await fs.readFile(absolutePath);
    return { buffer, metadata };
  } catch {
    return null;
  }
}

/**
 * Legacy path getter (returns null in production when Supabase is active).
 */
export async function getAudioFilePath(
  id: string
): Promise<{ filePath: string; metadata: AudioMetadata } | null> {
  const metadata = await getAudioMetadataById(id);
  if (!metadata) return null;

  const fileName = path.basename(metadata.storageReference);
  const absolutePath = path.join(AUDIO_DIR, fileName);

  try {
    await fs.access(absolutePath);
    return { filePath: absolutePath, metadata };
  } catch {
    return null;
  }
}

/**
 * Persists an uploaded audio buffer to Supabase Storage bucket 'assessment-audio'.
 */
export async function saveAudioFile(
  buffer: Buffer,
  originalFilename: string,
  declaredMimeType?: string
): Promise<
  | { success: true; metadata: AudioMetadata }
  | { success: false; error: string; code: AudioErrorCode }
> {
  if (isSupabaseConfigured()) {
    return saveAudioToSupabase(buffer, originalFilename, declaredMimeType);
  }

  // Requirement 8: Do not silently fall back to local storage in production if Supabase is unavailable
  if (process.env.NODE_ENV === 'production') {
    return {
      success: false,
      error:
        'Supabase Storage is not configured. SUPABASE_URL and SUPABASE_SECRET_KEY must be set in production to store assessment audio in bucket "assessment-audio".',
      code: 'STORAGE_ERROR',
    };
  }

  // Development warning if Supabase is not configured
  return {
    success: false,
    error:
      'Supabase Storage is not configured. Please set SUPABASE_URL and SUPABASE_SECRET_KEY to connect to bucket "assessment-audio".',
    code: 'STORAGE_ERROR',
  };
}

/**
 * Deletes an audio file and its metadata from Supabase Storage.
 */
export async function deleteAudioFile(
  id: string
): Promise<{ success: boolean; error?: string; code?: AudioErrorCode }> {
  if (isSupabaseConfigured()) {
    return deleteAudioFromSupabase(id);
  }

  if (process.env.NODE_ENV === 'production') {
    return {
      success: false,
      error: 'Supabase Storage is not configured in production.',
      code: 'STORAGE_ERROR',
    };
  }

  return {
    success: false,
    error: 'Supabase Storage is not configured.',
    code: 'STORAGE_ERROR',
  };
}
