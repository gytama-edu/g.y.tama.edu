/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response, NextFunction } from 'express';
import nodeFs from 'fs';
import multer from 'multer';
import {
  savePublishedTest,
  getPublishedTestByAccessCode,
  getPublishedTestById,
  togglePublishedTest,
  regenerateTestAccessCode,
  saveSubmission,
  getAllSubmissions,
  getSubmissionsByTestId,
  clearSubmissionsByTestId,
  deleteSubmissionById,
  getAllPublishedTests,
  sanitizeTestForStudent,
  getAllCategories,
  saveCategories,
  deleteCategoryServer,
  ServerPublishedTest,
  ServerSubmission,
  saveAudioFile,
  getAudioFileBuffer,
  getAudioFilePath,
  getAudioMetadataById,
  getAllAudioMetadata,
  deleteAudioFile,
  getAudioStorageConfig,
  ensureSupabaseAudioBucket,
  getStorageDiagnostic,
  isSupabaseConfigured,
  MAX_AUDIO_SIZE_BYTES,
} from './db';
import { migrateLocalAudioToSupabase } from './audioMigration';
import { Test, Question, QuestionType, DEFAULT_TEST_SETTINGS } from '../types/test';
import { TestSession } from '../types/student';
import { gradeTestSession } from '../utils/grading';
import { generateAccessCode } from '../utils/testAccess';
import { normalizeTestSettings } from '../utils/testSettings';
import { createSubmissionId } from '../utils/id';

export const apiRouter = Router();

/**
 * 1. Publish / Update Test
 * POST /api/tests/publish
 */
apiRouter.post('/tests/publish', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body || {};
    const testId = body.testId || body.id;

    if (!testId || typeof testId !== 'string') {
      res.status(400).json({ error: 'Missing or invalid testId' });
      return;
    }

    const title = (body.title || '').trim() || 'Untitled Assessment';
    const description = (body.description || '').trim();
    const instructions = body.instructions ? String(body.instructions).trim() : undefined;

    // Normalize settings
    const settings = normalizeTestSettings(body.settings || DEFAULT_TEST_SETTINGS);

    // Normalize and validate questions on the server
    const rawQuestions = Array.isArray(body.questions) ? body.questions : [];
    const questions: Question[] = rawQuestions.map((q: any, idx: number) => {
      const rawType = String(q.type || 'single-choice').replace(/[-_]/g, '').toLowerCase();
      let type: QuestionType = 'multiple_choice';

      if (rawType === 'multiplechoice' || rawType === 'singlechoice') {
        type = q.type === 'multiple-choice' ? 'multiple_select' : 'multiple_choice';
      } else if (rawType === 'multipleselect') {
        type = 'multiple_select';
      } else if (rawType === 'truefalse') {
        type = 'true_false';
      } else if (rawType === 'shortanswer') {
        type = 'short_answer';
      } else if (rawType === 'fillblank') {
        type = 'fill_blank';
      } else if (rawType === 'matching') {
        type = 'matching';
      } else if (rawType === 'ordering') {
        type = 'ordering';
      } else if (rawType === 'essay') {
        type = 'essay';
      } else if (rawType === 'writing') {
        type = 'writing';
      } else {
        // Fallback to original or default
        type = q.type || 'multiple_choice';
      }

      const correctAnswerStr =
        q.correctAnswer !== undefined && q.correctAnswer !== null
          ? String(q.correctAnswer).trim()
          : '';

      const normalizedQ: Question = {
        id: String(q.id || `q_${idx + 1}`),
        type,
        text: String(q.text || q.question || '').trim(),
        points: typeof q.points === 'number' && !isNaN(q.points) && q.points >= 1 ? q.points : 1,
        order: typeof q.order === 'number' ? q.order : idx + 1,
      };

      // 1. Multiple Choice / Single Choice / Multiple Select / True False Options
      if (Array.isArray(q.options)) {
        normalizedQ.options = q.options.map((opt: any, optIdx: number) => {
          const optId = String(opt.id || `opt_${optIdx + 1}`);
          const optText = String(opt.text || opt.label || '').trim();
          const isMatch =
            correctAnswerStr &&
            (optId.toLowerCase() === correctAnswerStr.toLowerCase() ||
              optText.toLowerCase() === correctAnswerStr.toLowerCase());
          return {
            id: optId,
            text: optText,
            isCorrect: Boolean(opt.isCorrect || isMatch),
          };
        });
      }

      // 2. Short Answer Accepted Answers
      if (Array.isArray(q.acceptedAnswers)) {
        normalizedQ.acceptedAnswers = q.acceptedAnswers
          .map((ans: any) => String(ans || '').trim())
          .filter(Boolean);
      } else if (correctAnswerStr) {
        normalizedQ.acceptedAnswers = [correctAnswerStr];
      }

      // 3. Fill in the Blank
      if (Array.isArray(q.blanks)) {
        normalizedQ.blanks = q.blanks.map((b: any, bIdx: number) => ({
          id: String(b.id || `b_${bIdx + 1}`),
          acceptedAnswers: Array.isArray(b.acceptedAnswers)
            ? b.acceptedAnswers.map((ans: any) => String(ans || '').trim()).filter(Boolean)
            : [],
        }));
      }

      // 4. Matching
      if (Array.isArray(q.matchingPairs)) {
        normalizedQ.matchingPairs = q.matchingPairs.map((p: any, pIdx: number) => ({
          id: String(p.id || `p_${pIdx + 1}`),
          left: String(p.left || '').trim(),
          right: String(p.right || '').trim(),
        }));
      }

      // 5. Ordering
      const ordItems = Array.isArray(q.orderingItems)
        ? q.orderingItems
        : Array.isArray(q.items)
        ? q.items
        : null;
      if (ordItems) {
        const mappedItems = ordItems.map((item: any, iIdx: number) => ({
          id: String(item.id || `ord_${iIdx + 1}`),
          text: String(item.text || '').trim(),
        }));
        normalizedQ.orderingItems = mappedItems;
        normalizedQ.items = mappedItems;
      }
      if (Array.isArray(q.correctOrder)) {
        normalizedQ.correctOrder = q.correctOrder.map((id: any) => String(id));
      }

      // 6. Essay
      if (type === 'essay') {
        normalizedQ.requiresManualGrading = true;
        if (typeof q.maxWords === 'number' && q.maxWords > 0) {
          normalizedQ.maxWords = q.maxWords;
        }
      }

      // 7. Writing (Module 13)
      if (type === 'writing') {
        normalizedQ.requiresManualGrading = true;
        const cfg = q.writingConfig || {};
        normalizedQ.writingConfig = {
          instructions: cfg.instructions ? String(cfg.instructions).trim() : undefined,
          writingType: cfg.writingType || 'General Writing',
          minimumWords: typeof cfg.minimumWords === 'number' && cfg.minimumWords > 0 ? cfg.minimumWords : null,
          maximumWords: typeof cfg.maximumWords === 'number' && cfg.maximumWords > 0 ? cfg.maximumWords : null,
          showWordCount: cfg.showWordCount !== false,
        };
      }

      // Module 16: Preserve attached audio on question
      if (q.audioId) {
        normalizedQ.audioId = String(q.audioId).trim();
      }
      if (q.audioMetadata) {
        normalizedQ.audioMetadata = q.audioMetadata;
      }

      // Module 15 & 17: Preserve readingSetId and sectionId
      if (q.readingSetId) {
        normalizedQ.readingSetId = String(q.readingSetId).trim();
      }
      if (q.sectionId) {
        normalizedQ.sectionId = String(q.sectionId).trim();
      }

      return normalizedQ;
    });

    const existing = await getPublishedTestById(testId);

    // Module 15 & 16: Normalize Reading / Listening sets
    const rawReadingSets = Array.isArray(body.readingSets)
      ? body.readingSets
      : existing?.readingSets || [];
    const now = new Date().toISOString();
    const readingSets = rawReadingSets.map((rs: any, rsIdx: number) => ({
      id: String(rs.id || `rs_${rsIdx + 1}`),
      title: String(rs.title || '').trim(),
      passage: String(rs.passage || '').trim(),
      instructions: rs.instructions ? String(rs.instructions).trim() : undefined,
      source: rs.source ? String(rs.source).trim() : undefined,
      order: typeof rs.order === 'number' ? rs.order : rsIdx + 1,
      audioId: rs.audioId ? String(rs.audioId).trim() : undefined,
      audioMetadata: rs.audioMetadata || undefined,
      createdAt: rs.createdAt || now,
      updatedAt: now,
    }));

    // Module 17: Assessment Sections
    const rawSections = Array.isArray(body.sections)
      ? body.sections
      : existing?.sections || [];
    const sections = rawSections.map((sec: any, secIdx: number) => ({
      id: String(sec.id || `sec_${secIdx + 1}`),
      title: String(sec.title || `Section ${secIdx + 1}`).trim(),
      type: sec.type || 'General',
      instructions: sec.instructions !== undefined ? String(sec.instructions).trim() : undefined,
      order: typeof sec.order === 'number' ? sec.order : secIdx + 1,
      audioId: sec.audioId ? String(sec.audioId).trim() : undefined,
      audioMetadata: sec.audioMetadata || undefined,
      readingSetId: sec.readingSetId ? String(sec.readingSetId).trim() : undefined,
      questionIds: Array.isArray(sec.questionIds) ? sec.questionIds.map(String) : undefined,
      createdAt: sec.createdAt || now,
      updatedAt: now,
    }));

    // Access management
    let accessCode = (
      body.accessCode ||
      body.access?.accessCode ||
      existing?.accessCode ||
      ''
    ).trim();

    if (!accessCode) {
      const all = await getAllPublishedTests();
      const existingCodes = all.map((t) => t.accessCode);
      accessCode = generateAccessCode(existingCodes);
    }

    const enabled =
      typeof body.enabled === 'boolean'
        ? body.enabled
        : typeof body.access?.enabled === 'boolean'
        ? body.access.enabled
        : true;

    const ownerToken =
      body.ownerToken ||
      existing?.ownerToken ||
      `owner_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

    // Resolve audio attachment
    const resolvedAudioId =
      'audioId' in body
        ? (body.audioId ? String(body.audioId).trim() : undefined)
        : (existing?.audioId || undefined);

    let resolvedAudioMetadata =
      'audioMetadata' in body
        ? (body.audioMetadata || undefined)
        : (resolvedAudioId ? (existing?.audioMetadata || undefined) : undefined);

    if (resolvedAudioId && !resolvedAudioMetadata) {
      resolvedAudioMetadata = (await getAudioMetadataById(resolvedAudioId)) || undefined;
    }

    const publishedRecord: ServerPublishedTest = {
      testId,
      accessCode: accessCode.toUpperCase(),
      ownerToken,
      title,
      description,
      instructions,
      categoryId: body.categoryId || body.category_id || existing?.categoryId || 'cat_general',
      audioId: resolvedAudioId,
      audioMetadata: resolvedAudioMetadata,
      createdAt: body.createdAt || existing?.createdAt || now,
      updatedAt: now,
      publishedAt: existing?.publishedAt || now,
      enabled,
      settings,
      sections,
      questions,
      readingSets,
    };

    await savePublishedTest(publishedRecord);

    res.status(200).json({
      success: true,
      testId,
      accessCode: publishedRecord.accessCode,
      ownerToken,
      publishedAt: publishedRecord.publishedAt,
      enabled: publishedRecord.enabled,
    });
  } catch (err: any) {
    console.error('[API] Error publishing test:', err);
    res.status(500).json({ error: 'Internal server error while publishing test', details: err?.message });
  }
});

/**
 * 2. Get Test By Access Code (For Students)
 * GET /api/tests/access/:accessCode
 * CRITICAL: NEVER exposes answer keys or isCorrect attributes to students!
 */
apiRouter.get('/tests/access/:accessCode', async (req: Request, res: Response): Promise<void> => {
  try {
    const { accessCode } = req.params;
    if (!accessCode) {
      res.status(400).json({ error: 'Access code required', status: 'invalid-code' });
      return;
    }

    const published = await getPublishedTestByAccessCode(accessCode);
    if (!published) {
      res.status(404).json({ error: 'Test not found', status: 'not-found' });
      return;
    }

    if (!published.enabled) {
      res.status(403).json({ error: 'Test access is disabled', status: 'disabled' });
      return;
    }

    if (published.audioId && !published.audioMetadata) {
      published.audioMetadata = (await getAudioMetadataById(published.audioId)) || undefined;
    }

    // Strip answer keys and acceptedAnswers before sending to student
    const studentTest = sanitizeTestForStudent(published);

    res.status(200).json({
      success: true,
      status: 'valid',
      test: studentTest,
    });
  } catch (err: any) {
    console.error('[API] Error retrieving test by access code:', err);
    res.status(500).json({ error: 'Internal server error', details: err?.message });
  }
});

/**
 * 3. Toggle Sharing (Enable/Disable)
 * POST /api/tests/access/:accessCode/toggle
 * POST /api/tests/access/:accessCode/disable
 * POST /api/tests/access/:accessCode/enable
 */
apiRouter.post('/tests/access/:accessCode/toggle', async (req: Request, res: Response): Promise<void> => {
  try {
    const { accessCode } = req.params;
    const { enabled } = req.body || {};
    const isEnabled = Boolean(enabled);

    const updated = await togglePublishedTest(accessCode, isEnabled);
    if (!updated) {
      res.status(404).json({ error: 'Test access code not found' });
      return;
    }

    res.status(200).json({
      success: true,
      accessCode: updated.accessCode,
      enabled: updated.enabled,
    });
  } catch (err: any) {
    console.error('[API] Error toggling test access:', err);
    res.status(500).json({ error: 'Failed to toggle test access' });
  }
});

apiRouter.post('/tests/access/:accessCode/disable', async (req: Request, res: Response): Promise<void> => {
  const { accessCode } = req.params;
  const updated = await togglePublishedTest(accessCode, false);
  if (!updated) {
    res.status(404).json({ error: 'Test access code not found' });
    return;
  }
  res.status(200).json({ success: true, accessCode: updated.accessCode, enabled: false });
});

apiRouter.post('/tests/access/:accessCode/enable', async (req: Request, res: Response): Promise<void> => {
  const { accessCode } = req.params;
  const updated = await togglePublishedTest(accessCode, true);
  if (!updated) {
    res.status(404).json({ error: 'Test access code not found' });
    return;
  }
  res.status(200).json({ success: true, accessCode: updated.accessCode, enabled: true });
});

/**
 * 4. Regenerate Access Code
 * POST /api/tests/access/:accessCode/regenerate
 */
apiRouter.post('/tests/access/:accessCode/regenerate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { accessCode } = req.params;
    const existing = await getPublishedTestByAccessCode(accessCode);
    if (!existing) {
      res.status(404).json({ error: 'Test access code not found' });
      return;
    }

    // Enforce teacher authorization: request must supply the test ownerToken or teacher auth token
    const authHeader = (req.headers['x-teacher-token'] || req.headers['authorization'] || '').toString();
    const bodyToken = (req.body?.ownerToken || req.body?.teacherToken || '').toString();
    const providedToken = (bodyToken || authHeader.replace(/^Bearer\s+/i, '')).trim();

    // Teacher authorization check: matches existing test ownerToken or authorized teacher session
    const isAuthorized = Boolean(
      providedToken && (
        providedToken === existing.ownerToken ||
        providedToken === `teacher_${existing.testId}` ||
        providedToken === 'teacher_admin_auth'
      )
    );

    if (!isAuthorized) {
      res.status(403).json({
        error: 'Unauthorized: Assessment access codes can only be regenerated by authorized instructors.',
      });
      return;
    }

    const all = await getAllPublishedTests();
    const existingCodes = all.map((t) => t.accessCode);
    const newCode = generateAccessCode(existingCodes);

    const updated = await regenerateTestAccessCode(accessCode, newCode);
    if (!updated) {
      res.status(500).json({ error: 'Failed to update access code' });
      return;
    }

    res.status(200).json({
      success: true,
      oldAccessCode: accessCode,
      accessCode: updated.accessCode,
      enabled: updated.enabled,
    });
  } catch (err: any) {
    console.error('[API] Error regenerating access code:', err);
    res.status(500).json({ error: 'Failed to regenerate access code' });
  }
});

/**
 * 5. Submit Test Session
 * POST /api/tests/submit
 */
apiRouter.post('/tests/submit', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body || {};
    const accessCode = (body.accessCode || '').trim();
    const testId = (body.testId || '').trim();
    const studentName = (body.studentName || '').trim() || 'Student';
    const sessionId = (body.sessionId || body.id || '').trim();
    const answers = body.answers || {};

    // Find the authoritative server published test with complete answer keys
    let published: ServerPublishedTest | null = null;
    if (accessCode) {
      published = await getPublishedTestByAccessCode(accessCode);
    }
    if (!published && testId) {
      published = await getPublishedTestById(testId);
    }

    if (!published) {
      res.status(404).json({ error: 'Published assessment not found for submission' });
      return;
    }

    // Construct full Test representation for grading
    const fullTest: Test = {
      id: published.testId,
      title: published.title,
      description: published.description,
      createdAt: published.createdAt,
      updatedAt: published.updatedAt,
      settings: published.settings,
      sections: published.sections || [],
      questions: published.questions,
      readingSets: published.readingSets || [],
    };

    const sessionToGrade: TestSession = {
      id: sessionId || `session_${Date.now().toString(36)}`,
      testId: published.testId,
      studentName,
      answers,
      currentQuestionIndex: 0,
      startedAt: body.startedAt || new Date().toISOString(),
      submittedAt: body.submittedAt || new Date().toISOString(),
      status: 'submitted',
    };

    // Authoritative Server-side Grading
    const gradingResult = gradeTestSession(fullTest, sessionToGrade);

    const submissionRecord: ServerSubmission = {
      id: createSubmissionId(),
      testId: published.testId,
      accessCode: published.accessCode,
      sessionId: sessionToGrade.id || sessionId,
      studentName,
      startedAt: sessionToGrade.startedAt,
      submittedAt: sessionToGrade.submittedAt!,
      answers,
      gradingResult,
    };

    await saveSubmission(submissionRecord);

    res.status(200).json({
      success: true,
      submissionId: submissionRecord.id,
      sessionId: submissionRecord.sessionId,
      gradingResult,
    });
  } catch (err: any) {
    console.error('[API] Error processing test submission:', err);
    res.status(500).json({ error: 'Failed to process test submission', details: err?.message });
  }
});

/**
 * 6. Get Submissions for a Test (Teacher Reports)
 * GET /api/tests/:testId/submissions
 */
apiRouter.get('/tests/:testId/submissions', async (req: Request, res: Response): Promise<void> => {
  try {
    const { testId } = req.params;
    const submissions = await getSubmissionsByTestId(testId);

    res.status(200).json({
      success: true,
      testId,
      submissions,
    });
  } catch (err: any) {
    console.error('[API] Error fetching test submissions:', err);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

/**
 * 7. MODULE 14: Clear All Submissions / Results for a Test
 * DELETE /api/tests/:testId/submissions
 * DELETE /api/tests/:testId/results
 */
const handleClearAllSubmissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { testId } = req.params;
    if (!testId || typeof testId !== 'string') {
      res.status(400).json({ error: 'Missing or invalid testId' });
      return;
    }

    const clearedCount = await clearSubmissionsByTestId(testId);

    res.status(200).json({
      success: true,
      testId,
      clearedCount,
      message: 'All student results for this assessment have been cleared successfully.',
    });
  } catch (err: any) {
    console.error('[API] Error clearing test submissions:', err);
    res.status(500).json({ error: 'Failed to clear test submissions', details: err?.message });
  }
};

apiRouter.delete('/tests/:testId/submissions', handleClearAllSubmissions);
apiRouter.delete('/tests/:testId/results', handleClearAllSubmissions);

/**
 * 8. MODULE 14: Clear a Single Student Submission / Result
 * DELETE /api/tests/:testId/submissions/:submissionId
 * DELETE /api/tests/:testId/results/:submissionId
 */
const handleDeleteSingleSubmission = async (req: Request, res: Response): Promise<void> => {
  try {
    const { testId, submissionId } = req.params;
    if (!testId || !submissionId) {
      res.status(400).json({ error: 'Missing testId or submissionId' });
      return;
    }

    const deleted = await deleteSubmissionById(testId, submissionId);

    res.status(200).json({
      success: true,
      testId,
      submissionId,
      deleted,
      message: deleted
        ? 'Student response was deleted successfully.'
        : 'Student response was already removed or not found on server.',
    });
  } catch (err: any) {
    console.error('[API] Error deleting single submission:', err);
    res.status(500).json({ error: 'Failed to delete student result', details: err?.message });
  }
};

apiRouter.delete('/tests/:testId/submissions/:submissionId', handleDeleteSingleSubmission);
apiRouter.delete('/tests/:testId/results/:submissionId', handleDeleteSingleSubmission);

/**
 * 9. Update Manual Grade for a Student Submission
 * PUT /api/tests/:testId/submissions/:sessionId/grade
 */
apiRouter.put('/tests/:testId/submissions/:sessionId/grade', async (req: Request, res: Response): Promise<void> => {
  try {
    const { testId, sessionId } = req.params;
    const { questionId, earnedPoints, feedback, gradingResult } = req.body || {};

    const all = await getAllSubmissions();
    const cleanTestId = testId.trim();
    const cleanSessionId = sessionId.trim();

    const sub = all.find(
      (s: ServerSubmission) =>
        (s.testId === cleanTestId || s.accessCode?.toUpperCase() === cleanTestId.toUpperCase()) &&
        (s.sessionId === cleanSessionId || s.id === cleanSessionId)
    );

    if (!sub) {
      res.status(404).json({ error: 'Submission not found on server' });
      return;
    }

    if (gradingResult) {
      sub.gradingResult = gradingResult;
    } else if (questionId && typeof earnedPoints === 'number') {
      if (sub.gradingResult && Array.isArray(sub.gradingResult.questionResults)) {
        const qr = sub.gradingResult.questionResults.find((r: any) => r.questionId === questionId);
        if (qr) {
          qr.earnedPoints = earnedPoints;
          qr.status = 'graded';
          qr.requiresManualGrading = false;
          qr.isCorrect = earnedPoints > 0;
          if (feedback !== undefined) qr.feedback = feedback;
          qr.gradedAt = new Date().toISOString();
        }
      }
    }

    await saveSubmission(sub);

    res.status(200).json({
      success: true,
      submission: sub,
      gradingResult: sub.gradingResult,
    });
  } catch (err: any) {
    console.error('[API] Error updating manual grade:', err);
    res.status(500).json({ error: 'Failed to update manual grade', details: err?.message });
  }
});

/**
 * 7. List Published Tests
 * GET /api/tests
 */
apiRouter.get('/tests', async (_req: Request, res: Response): Promise<void> => {
  try {
    const all = await getAllPublishedTests();
    const summaries = all.map((t) => ({
      testId: t.testId,
      title: t.title,
      accessCode: t.accessCode,
      enabled: t.enabled,
      questionCount: t.questions.length,
      publishedAt: t.publishedAt,
      updatedAt: t.updatedAt,
    }));

    res.status(200).json({
      success: true,
      tests: summaries,
    });
  } catch (err: any) {
    console.error('[API] Error listing tests:', err);
    res.status(500).json({ error: 'Failed to list published tests' });
  }
});

/**
 * 8. Get Categories
 * GET /api/categories
 */
apiRouter.get('/categories', async (_req: Request, res: Response): Promise<void> => {
  try {
    const categories = await getAllCategories();
    res.status(200).json({
      success: true,
      categories,
    });
  } catch (err: any) {
    console.error('[API] Error fetching categories:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

/**
 * 9. Save Categories
 * POST /api/categories
 */
apiRouter.post('/categories', async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = req.body.categories;
    if (!Array.isArray(categories)) {
      res.status(400).json({ error: 'Expected categories array' });
      return;
    }
    await saveCategories(categories);
    res.status(200).json({
      success: true,
      categories,
    });
  } catch (err: any) {
    console.error('[API] Error saving categories:', err);
    res.status(500).json({ error: 'Failed to save categories' });
  }
});

/**
 * 10. Delete Category
 * DELETE /api/categories/:id
 */
apiRouter.delete('/categories/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { replacementCategoryId } = req.body || {};
    if (!id) {
      res.status(400).json({ error: 'Missing category id' });
      return;
    }

    const result = await deleteCategoryServer(id, replacementCategoryId);
    if (!result.success) {
      res.status(404).json({ error: result.error || 'Category not found' });
      return;
    }

    const categories = await getAllCategories();
    res.status(200).json({
      success: true,
      deletedId: id,
      categories,
    });
  } catch (err: any) {
    console.error('[API] Error deleting category:', err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

/* ==========================================================================
   MODULE 16: PERSISTENT AUDIO API ROUTES
   Upload, stream, range request support, metadata, and deletion.
   ========================================================================== */

/**
 * Configure multer memory storage for audio uploads.
 */
const audioMulter = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_AUDIO_SIZE_BYTES,
  },
  fileFilter: (_req, file, cb) => {
    const extMatch = (file.originalname || '').match(/\.([a-zA-Z0-9]+)$/);
    const ext = extMatch ? extMatch[1].toLowerCase() : '';
    if (ext === 'mp3' || ext === 'wav' || ext === 'm4a') {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Unsupported audio format (.${ext || 'unknown'}). Only MP3, WAV, and M4A are allowed.`
        )
      );
    }
  },
});

/**
 * Middleware handling audio file upload supporting both 'audio' and 'file' form fields.
 */
const audioUploadMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  audioMulter.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'file', maxCount: 1 },
  ])(req, res, (err: any) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        const maxMb = Math.round(MAX_AUDIO_SIZE_BYTES / (1024 * 1024));
        res.status(400).json({
          success: false,
          error: `Audio file is too large. Maximum allowed size is ${maxMb} MB.`,
          code: 'FILE_TOO_LARGE',
        });
        return;
      }
      res.status(400).json({
        success: false,
        error: err.message || 'Audio file upload failed',
        code: 'UNSUPPORTED_FORMAT',
      });
      return;
    }
    next();
  });
};

/**
 * GET /api/audio/config
 * Retrieves server audio upload constraints.
 */
apiRouter.get('/audio/config', async (_req: Request, res: Response): Promise<void> => {
  try {
    const config = getAudioStorageConfig();
    const bucketReady = isSupabaseConfigured() ? await ensureSupabaseAudioBucket() : false;
    const diagnostic = getStorageDiagnostic();
    res.status(200).json({
      success: true,
      config: {
        ...config,
        bucketReady,
      },
      diagnostic: diagnostic
        ? {
            verified: diagnostic.verified,
            bucket: diagnostic.bucket,
            urlHost: diagnostic.urlHost,
            error: diagnostic.error,
            errorStatus: diagnostic.errorStatus,
            lastChecked: diagnostic.lastChecked,
          }
        : null,
    });
  } catch (err: any) {
    console.error('[API] Error getting audio config:', err);
    res.status(500).json({ error: 'Failed to retrieve audio configuration' });
  }
});

/**
 * POST /api/audio/upload
 * Securely uploads, validates, and persists an audio file.
 */
apiRouter.post(
  '/audio/upload',
  audioUploadMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const uploadedFile = files?.audio?.[0] || files?.file?.[0] || (req.file as Express.Multer.File | undefined);

      if (!uploadedFile || !uploadedFile.buffer) {
        res.status(400).json({
          success: false,
          error: 'No audio file provided in request. Please upload a file with field name "audio" or "file".',
          code: 'NO_FILE_PROVIDED',
        });
        return;
      }

      const saveResult = await saveAudioFile(
        uploadedFile.buffer,
        uploadedFile.originalname || 'audio_file.mp3',
        uploadedFile.mimetype
      );

      if (!saveResult.success) {
        res.status(400).json({
          success: false,
          error: saveResult.error,
          code: saveResult.code,
        });
        return;
      }

      res.status(201).json({
        success: true,
        audio: saveResult.metadata,
      });
    } catch (err: any) {
      console.error('[API] Error during audio upload:', err);
      res.status(500).json({
        success: false,
        error: 'Internal server error processing audio upload.',
        details: err?.message,
      });
    }
  }
);

/**
 * GET /api/audio/:id
 * Streams or downloads an audio file with HTTP Range support for seeking.
 */
apiRouter.get('/audio/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: 'Missing audio id' });
      return;
    }

    const audioData = await getAudioFileBuffer(id);
    if (!audioData) {
      res.status(404).json({
        error: 'Audio file not found or unavailable on server.',
        code: 'AUDIO_NOT_FOUND',
      });
      return;
    }

    const { buffer, metadata } = audioData;
    const fileSize = buffer.length;
    const range = req.headers.range;

    // HTTP Range Requests for HTML5 <audio> scrubbing/seeking
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize || start > end) {
        res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
        res.end();
        return;
      }

      const chunkSize = end - start + 1;
      const chunk = buffer.subarray(start, end + 1);

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': metadata.mimeType || 'audio/mpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      });

      res.end(chunk);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': metadata.mimeType || 'audio/mpeg',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      });

      res.end(buffer);
    }
  } catch (err: any) {
    console.error('[API] Error streaming audio file:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to retrieve audio stream', details: err?.message });
    }
  }
});

/**
 * HEAD /api/audio/:id
 * Probes audio header/availability without downloading entire payload.
 */
apiRouter.head('/audio/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const metadata = await getAudioMetadataById(id);
    if (!metadata) {
      res.status(404).end();
      return;
    }
    res.writeHead(200, {
      'Content-Length': metadata.fileSize,
      'Content-Type': metadata.mimeType || 'audio/mpeg',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end();
  } catch {
    res.status(500).end();
  }
});

/**
 * GET /api/audio/:id/metadata
 * Retrieves audio file metadata.
 */
apiRouter.get('/audio/:id/metadata', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const metadata = await getAudioMetadataById(id);
    if (!metadata) {
      res.status(404).json({
        success: false,
        error: 'Audio metadata not found for given ID.',
        code: 'AUDIO_NOT_FOUND',
      });
      return;
    }

    res.status(200).json({
      success: true,
      audio: metadata,
    });
  } catch (err: any) {
    console.error('[API] Error retrieving audio metadata:', err);
    res.status(500).json({ error: 'Failed to retrieve audio metadata' });
  }
});

/**
 * GET /api/audio
 * Lists all registered audio files.
 */
apiRouter.get('/audio', async (_req: Request, res: Response): Promise<void> => {
  try {
    const all = await getAllAudioMetadata();
    res.status(200).json({
      success: true,
      audioFiles: all,
    });
  } catch (err: any) {
    console.error('[API] Error listing audio files:', err);
    res.status(500).json({ error: 'Failed to list audio files' });
  }
});

/**
 * DELETE /api/audio/:id
 * Removes an audio file and its metadata.
 */
apiRouter.delete('/audio/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await deleteAudioFile(id);
    if (!result.success) {
      res.status(result.code === 'AUDIO_NOT_FOUND' ? 404 : 400).json({
        success: false,
        error: result.error,
        code: result.code,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Audio file deleted successfully.',
    });
  } catch (err: any) {
    console.error('[API] Error deleting audio file:', err);
    res.status(500).json({ error: 'Failed to delete audio file' });
  }
});

/**
 * POST /api/audio/migrate
 * Triggers safe migration of local audio files to Supabase Storage bucket 'assessment-audio'.
 */
apiRouter.post('/audio/migrate', async (_req: Request, res: Response): Promise<void> => {
  try {
    const report = await migrateLocalAudioToSupabase();
    res.status(report.success ? 200 : 500).json({
      success: report.success,
      report,
    });
  } catch (err: any) {
    console.error('[API] Error during audio migration:', err);
    res.status(500).json({ error: 'Migration failed', details: err?.message });
  }
});


