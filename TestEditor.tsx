/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Test,
  Question,
  QuestionType,
  ValidationError,
  TestSettings,
  DEFAULT_TEST_SETTINGS,
  TestAccess,
  ReadingSet,
  AssessmentSection,
  SectionType,
  MatchingItem,
  CorrectMatch,
  MatchingPair,
  OrderingItem,
} from '../../types/test';
import { Category, DEFAULT_CATEGORY_ID } from '../../types/category';
import { AudioMetadata } from '../../types/audio';
import { loadAllCategories } from '../../utils/categoryStorage';
import { TestHeader } from './TestHeader';
import { TestInformation } from './TestInformation';
import { QuestionList } from './QuestionList';
import { SectionCard } from './SectionCard';
import { QuestionTypeModal } from './QuestionTypeModal';
import { TypeChangeModal } from './TypeChangeModal';
import { TestPreview } from './TestPreview';
import { ConfirmModal } from '../ui/ConfirmModal';
import { QuestionImportModal } from './QuestionImportModal';
import { TestSettingsCard } from './TestSettingsCard';
import { TestSharingPanel } from './TestSharingPanel';
import { RawParsedQuestion } from '../../types/questionImport';
import { Button } from '../ui/Button';
import { Plus, Upload, Settings as SettingsIcon, BookOpen, FolderTree, Layers } from 'lucide-react';
import { createNewQuestion, convertQuestionType } from '../../utils/questionDefaults';
import { createQuestionId, createOptionId, createReadingSetId, createSectionId } from '../../utils/id';
import { validateTest } from '../../utils/validation';
import { saveTest } from '../../utils/storage';
import { normalizeTestSettings } from '../../utils/testSettings';
import { normalizeTestAccess, publishTestToServer, toggleTestAccessOnServer } from '../../utils/testAccess';
import {
  createNewSection,
  resolveSectionsForTest,
  PresentationalSection,
} from '../../utils/sectionHelpers';


interface TestEditorProps {
  initialTest: Test;
  initialTab?: 'questions' | 'settings' | 'share';
  onBackToDashboard: () => void;
  onSaveSuccess?: (savedTest: Test) => void;
  onTakeTest?: (testId: string) => void;
  onOpenReports?: (testId: string) => void;
}

export function TestEditor({
  initialTest,
  initialTab = 'questions',
  onBackToDashboard,
  onSaveSuccess,
  onTakeTest,
  onOpenReports,
}: TestEditorProps) {
  const [categories, setCategories] = useState<Category[]>(() => loadAllCategories());

  // Normalize initial test with Module 3 settings, Module 10 access, and categoryId if missing
  const normalizedInitial: Test = {
    ...initialTest,
    categoryId: initialTest.categoryId || DEFAULT_CATEGORY_ID,
    settings: normalizeTestSettings(initialTest.settings),
    access: normalizeTestAccess(initialTest.access),
    readingSets: initialTest.readingSets || [],
    sections: initialTest.sections || [],
  };

  // Current working test state
  const [currentTest, setCurrentTest] = useState<Test>(normalizedInitial);

  // Active view tab: 'questions', 'settings', or 'share'
  const [activeTab, setActiveTab] = useState<'questions' | 'settings' | 'share'>(initialTab);

  // Snapshot of test as last saved (to calculate isDirty)
  const [savedSnapshot, setSavedSnapshot] = useState<string>(
    JSON.stringify(normalizedInitial)
  );

  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(initialTest.updatedAt);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // Preview mode
  const [previewMode, setPreviewMode] = useState(false);

  // Add question modal & target context
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [insertIndex, setInsertIndex] = useState<number | undefined>(undefined);
  const [targetReadingSetId, setTargetReadingSetId] = useState<string | null>(null);
  const [targetSectionId, setTargetSectionId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(
    initialTest.sections && initialTest.sections.length > 0 ? initialTest.sections[0].id : null
  );

  // Section Create Modal / Inline Add state
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [newSectionType, setNewSectionType] = useState<SectionType>('Listening');
  const [newSectionTitle, setNewSectionTitle] = useState('');

  // Type change modal
  const [pendingTypeChange, setPendingTypeChange] = useState<{
    question: Question;
    targetType: QuestionType;
  } | null>(null);

  // Unsaved changes modal when attempting to leave
  const [showUnsavedExitModal, setShowUnsavedExitModal] = useState(false);

  // Track if current state differs from last saved snapshot
  const currentSnapshot = JSON.stringify(currentTest);
  const isDirty = currentSnapshot !== savedSnapshot;

  // Window beforeunload warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Clean renumbering helper
  const renumberQuestions = (qs: Question[]): Question[] => {
    return qs.map((q, index) => ({
      ...q,
      order: index + 1,
    }));
  };

  // Update Title
  const handleChangeTitle = (title: string) => {
    setCurrentTest((prev) => ({ ...prev, title }));
    // Clear title validation error if fixed
    if (validationErrors.some((e) => e.field === 'title')) {
      setValidationErrors((prev) => prev.filter((e) => e.field !== 'title'));
    }
  };

  // Update Description
  const handleChangeDescription = (description: string) => {
    setCurrentTest((prev) => ({ ...prev, description }));
    if (validationErrors.some((e) => e.field === 'description')) {
      setValidationErrors((prev) => prev.filter((e) => e.field !== 'description'));
    }
  };

  // Update Category
  const handleChangeCategory = (categoryId: string) => {
    setCurrentTest((prev) => ({ ...prev, categoryId }));
  };

  // Update Audio Attachment (Module 16)
  const handleChangeAudio = (
    audioId: string | undefined,
    audioMetadata: AudioMetadata | undefined
  ) => {
    setCurrentTest((prev) => ({
      ...prev,
      audioId,
      audioMetadata,
    }));
  };

  // Add Question handler
  const handleOpenAddModal = (index?: number, secId?: string) => {
    setTargetReadingSetId(null);
    setInsertIndex(index);
    setTargetSectionId(secId || null);
    setAddModalOpen(true);
  };

  // Open Import Questions handler (Module 17 Section-Specific Question Import)
  const handleOpenImportModal = (secId?: string) => {
    setTargetSectionId(secId || null);
    setImportModalOpen(true);
  };

  const handleSelectQuestionType = (type: QuestionType) => {
    setAddModalOpen(false);

    // If adding specifically inside a Reading Set
    if (targetReadingSetId) {
      const setQuestions = currentTest.questions.filter(
        (q) => q.readingSetId === targetReadingSetId
      );
      const newQuestion = createNewQuestion(type, setQuestions.length + 1);
      newQuestion.readingSetId = targetReadingSetId;
      if (targetSectionId) {
        newQuestion.sectionId = targetSectionId;
      } else if (currentTest.sections && currentTest.sections.length > 0) {
        // Tag with the section that owns this reading set
        const ownerSec = currentTest.sections.find(
          (s) =>
            s.readingSetId === targetReadingSetId ||
            (s.questionIds && s.questionIds.includes(newQuestion.id))
        );
        if (ownerSec) newQuestion.sectionId = ownerSec.id;
      }

      const updatedQuestions = [...currentTest.questions, newQuestion];
      setCurrentTest((prev) => ({
        ...prev,
        questions: renumberQuestions(updatedQuestions),
      }));

      setTargetReadingSetId(null);
      setTargetSectionId(null);
      setValidationErrors((prev) =>
        prev.filter((e) => e.field !== 'reading_set_questions' && e.field !== 'questions')
      );

      setTimeout(() => {
        const el = document.getElementById(`question-card-${newQuestion.id}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return;
    }

    const targetPos =
      insertIndex !== undefined ? insertIndex : currentTest.questions.length;

    const newQuestion = createNewQuestion(type, targetPos + 1);

    // Assign to targeted section or current active/first section if test has sections
    if (targetSectionId) {
      newQuestion.sectionId = targetSectionId;
    } else if (currentTest.sections && currentTest.sections.length > 0) {
      newQuestion.sectionId = activeSectionId || currentTest.sections[0].id;
    }

    const updatedQuestions = [...currentTest.questions];
    updatedQuestions.splice(targetPos, 0, newQuestion);

    setCurrentTest((prev) => ({
      ...prev,
      questions: renumberQuestions(updatedQuestions),
    }));

    setTargetSectionId(null);
    // Clear global questions error if present
    setValidationErrors((prev) => prev.filter((e) => e.field !== 'questions'));

    // Smooth scroll to the newly inserted card
    setTimeout(() => {
      const el = document.getElementById(`question-card-${newQuestion.id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  // MODULE 17: Section Management Handlers
  const handleAddSection = (type: SectionType = 'Listening', customTitle?: string) => {
    const existingSections = currentTest.sections || [];
    const nextOrder = existingSections.length + 1;
    const title = customTitle || `${type} Section`;
    const newSection = createNewSection(type, nextOrder, title);

    setCurrentTest((prev) => ({
      ...prev,
      sections: [...(prev.sections || []), newSection],
    }));

    setActiveSectionId(newSection.id);
    setShowAddSectionModal(false);
    setNewSectionTitle('');

    setTimeout(() => {
      const el = document.getElementById(`section-${newSection.id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
  };

  const handleUpdateSection = (updated: AssessmentSection) => {
    setCurrentTest((prev) => ({
      ...prev,
      sections: (prev.sections || []).map((s) => (s.id === updated.id ? updated : s)),
    }));
    setValidationErrors((prev) =>
      prev.filter((e) => e.sectionId !== updated.id && !e.field.startsWith('section'))
    );
  };

  const handleDeleteSection = (sectionId: string) => {
    const remainingSections = (currentTest.sections || []).filter((s) => s.id !== sectionId);
    const fallbackSectionId = remainingSections.length > 0 ? remainingSections[0].id : undefined;

    // Move any questions in deleted section to fallback section so NO questions are lost!
    const updatedQuestions = currentTest.questions.map((q) => {
      if (q.sectionId === sectionId) {
        return {
          ...q,
          sectionId: fallbackSectionId,
        };
      }
      return q;
    });

    // Renumber remaining sections
    const reorderedSections = remainingSections.map((s, idx) => ({
      ...s,
      order: idx + 1,
    }));

    setCurrentTest((prev) => ({
      ...prev,
      sections: reorderedSections,
      questions: updatedQuestions,
    }));

    if (activeSectionId === sectionId) {
      setActiveSectionId(fallbackSectionId || null);
    }

    setValidationErrors((prev) =>
      prev.filter((e) => e.sectionId !== sectionId && !e.field.startsWith('section'))
    );
  };

  const handleDuplicateSection = (sectionId: string) => {
    const target = (currentTest.sections || []).find((s) => s.id === sectionId);
    if (!target) return;

    const newSectionId = createSectionId();
    const existingSections = currentTest.sections || [];
    const duplicatedSection: AssessmentSection = {
      ...target,
      id: newSectionId,
      title: `${target.title} (Copy)`,
      order: existingSections.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Duplicate all questions that belonged to this section with new IDs and safe answers
    const sectionQuestions = currentTest.questions.filter((q) => q.sectionId === sectionId);
    const duplicatedQuestions: Question[] = sectionQuestions.map((q) => ({
      ...q,
      id: createQuestionId(),
      sectionId: newSectionId,
      options: q.options?.map((opt) => ({ ...opt, id: createOptionId() })),
      blanks: q.blanks?.map((b) => ({ ...b, id: createOptionId() })),
      matchingPairs: q.matchingPairs?.map((p) => ({ ...p, id: createOptionId() })),
      orderingItems: q.orderingItems?.map((o) => ({ ...o, id: createOptionId() })),
    }));

    setCurrentTest((prev) => ({
      ...prev,
      sections: [...(prev.sections || []), duplicatedSection],
      questions: renumberQuestions([...prev.questions, ...duplicatedQuestions]),
    }));

    setActiveSectionId(newSectionId);
    setTimeout(() => {
      const el = document.getElementById(`section-${newSectionId}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
  };

  const handleMoveSectionUp = (index: number) => {
    if (index <= 0 || !currentTest.sections) return;
    const sections = [...currentTest.sections];
    const [moved] = sections.splice(index, 1);
    sections.splice(index - 1, 0, moved);
    const reordered = sections.map((s, i) => ({ ...s, order: i + 1 }));
    setCurrentTest((prev) => ({ ...prev, sections: reordered }));
  };

  const handleMoveSectionDown = (index: number) => {
    if (!currentTest.sections || index >= currentTest.sections.length - 1) return;
    const sections = [...currentTest.sections];
    const [moved] = sections.splice(index, 1);
    sections.splice(index + 1, 0, moved);
    const reordered = sections.map((s, i) => ({ ...s, order: i + 1 }));
    setCurrentTest((prev) => ({ ...prev, sections: reordered }));
  };

  const handleMoveQuestionToSection = (questionId: string, targetSecId: string) => {
    setCurrentTest((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === questionId ? { ...q, sectionId: targetSecId } : q
      ),
    }));
  };

  // MODULE 15: Add Reading Passage Set
  const handleAddReadingSet = (secId?: string) => {
    setAddModalOpen(false);
    setTargetReadingSetId(null);
    const existingSets = currentTest.readingSets || [];
    const nextOrder = existingSets.length + 1;
    const newReadingSet: ReadingSet = {
      id: createReadingSetId(),
      title: `Reading Passage ${nextOrder}`,
      passage: '',
      instructions: 'Read the passage and answer the questions that follow.',
      source: '',
      order: nextOrder,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const targetSec = secId || activeSectionId || (currentTest.sections && currentTest.sections.length > 0 ? currentTest.sections[0].id : undefined);

    setCurrentTest((prev) => ({
      ...prev,
      readingSets: [...(prev.readingSets || []), newReadingSet],
      sections: targetSec && prev.sections
        ? prev.sections.map((s) => (s.id === targetSec ? { ...s, readingSetId: newReadingSet.id } : s))
        : prev.sections,
    }));

    setTimeout(() => {
      const el = document.getElementById(`reading-set-${newReadingSet.id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };


  const handleUpdateReadingSet = (updated: ReadingSet) => {
    setCurrentTest((prev) => ({
      ...prev,
      readingSets: (prev.readingSets || []).map((rs) =>
        rs.id === updated.id ? updated : rs
      ),
    }));
    setValidationErrors((prev) =>
      prev.filter((e) => !e.field.startsWith('reading_set'))
    );
  };

  const handleDeleteReadingSet = (readingSetId: string) => {
    setCurrentTest((prev) => ({
      ...prev,
      readingSets: (prev.readingSets || []).filter((rs) => rs.id !== readingSetId),
      questions: renumberQuestions(
        prev.questions.filter((q) => q.readingSetId !== readingSetId)
      ),
    }));
    setValidationErrors((prev) =>
      prev.filter((e) => !e.field.startsWith('reading_set'))
    );
  };

  const handleDuplicateReadingSet = (readingSetId: string) => {
    const target = (currentTest.readingSets || []).find((rs) => rs.id === readingSetId);
    if (!target) return;

    const newSetId = createReadingSetId();
    const duplicatedSet: ReadingSet = {
      ...target,
      id: newSetId,
      title: `${target.title} (Copy)`,
      order: (currentTest.readingSets || []).length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const childQuestions = currentTest.questions.filter((q) => q.readingSetId === readingSetId);
    const duplicatedQuestions: Question[] = childQuestions.map((q) => ({
      ...q,
      id: createQuestionId(),
      readingSetId: newSetId,
      options: q.options?.map((opt) => ({ ...opt, id: createOptionId() })),
      blanks: q.blanks?.map((b) => ({ ...b, id: createOptionId() })),
      matchingPairs: q.matchingPairs?.map((p) => ({ ...p, id: createOptionId() })),
      orderingItems: q.orderingItems?.map((o) => ({ ...o, id: createOptionId() })),
    }));

    setCurrentTest((prev) => ({
      ...prev,
      readingSets: [...(prev.readingSets || []), duplicatedSet],
      questions: renumberQuestions([...prev.questions, ...duplicatedQuestions]),
    }));
  };

  const handleMoveReadingSetUp = (index: number) => {
    if (index <= 0 || !currentTest.readingSets) return;
    const sets = [...currentTest.readingSets];
    const [moved] = sets.splice(index, 1);
    sets.splice(index - 1, 0, moved);
    const reordered = sets.map((rs, i) => ({ ...rs, order: i + 1 }));
    setCurrentTest((prev) => ({ ...prev, readingSets: reordered }));
  };

  const handleMoveReadingSetDown = (index: number) => {
    if (!currentTest.readingSets || index >= currentTest.readingSets.length - 1) return;
    const sets = [...currentTest.readingSets];
    const [moved] = sets.splice(index, 1);
    sets.splice(index + 1, 0, moved);
    const reordered = sets.map((rs, i) => ({ ...rs, order: i + 1 }));
    setCurrentTest((prev) => ({ ...prev, readingSets: reordered }));
  };

  const handleAddQuestionToSet = (readingSetId: string) => {
    setTargetReadingSetId(readingSetId);
    setInsertIndex(undefined);
    setAddModalOpen(true);
  };

  const handleImportQuestions = (
    parsedQuestions: RawParsedQuestion[],
    readingPassage?: { title?: string; passage: string }
  ) => {
    let newReadingSet: ReadingSet | undefined = undefined;
    if (readingPassage && readingPassage.passage) {
      const existingSets = currentTest.readingSets || [];
      const nextSetOrder = existingSets.length + 1;
      newReadingSet = {
        id: createReadingSetId(),
        title: readingPassage.title?.trim() || `Reading Passage ${nextSetOrder}`,
        passage: readingPassage.passage,
        instructions: 'Read the passage and answer the questions that follow.',
        order: nextSetOrder,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    let nextOrder = currentTest.questions.length + 1;
    
    // Determine section for imported questions (Module 17 section-specific import)
    const hasSections = Boolean(currentTest.sections && currentTest.sections.length > 0);
    let assignedSectionId: string | undefined = undefined;

    if (hasSections) {
      if (targetSectionId) {
        // Verify section still exists
        const exists = currentTest.sections!.some((s) => s.id === targetSectionId);
        if (!exists) {
          console.error('[TestEditor] Cannot import: Target section is no longer available.');
          return;
        }
        assignedSectionId = targetSectionId;
      } else if (activeSectionId && currentTest.sections!.some((s) => s.id === activeSectionId)) {
        assignedSectionId = activeSectionId;
      } else {
        assignedSectionId = currentTest.sections![0].id;
      }
    }

    const newQuestions: Question[] = parsedQuestions.map((pq) => {
      const assignedReadingSetId = newReadingSet ? newReadingSet.id : undefined;


      if (pq.type === 'true_false') {
        const isTrue = (pq.answer || '').toUpperCase() === 'TRUE';
        return {
          id: createQuestionId(),
          type: 'true_false',
          text: pq.text,
          points: 1,
          order: nextOrder++,
          readingSetId: assignedReadingSetId,
          correctAnswer: isTrue,
          options: [
            { id: createOptionId(), text: 'True', isCorrect: isTrue },
            { id: createOptionId(), text: 'False', isCorrect: !isTrue },
          ],
        };
      }

      if (pq.type === 'multiple_select') {
        const correctLetters = new Set(
          pq.answers && pq.answers.length > 0
            ? pq.answers
            : pq.answer
            ? pq.answer.split(',').map((s) => s.trim().toUpperCase())
            : []
        );

        const options = pq.options.map((opt) => ({
          id: createOptionId(),
          text: opt.text,
          isCorrect: correctLetters.has(opt.label.toUpperCase()),
        }));

        const correctAnswers = options
          .filter((opt) => opt.isCorrect)
          .map((opt) => opt.id);

        return {
          id: createQuestionId(),
          type: 'multiple_select',
          text: pq.text,
          points: 1,
          order: nextOrder++,
          readingSetId: assignedReadingSetId,
          options,
          correctAnswers,
        };
      }

      if (pq.type === 'short_answer') {
        const initialAnswer = (pq.answer || '').trim();
        return {
          id: createQuestionId(),
          type: 'short_answer',
          text: pq.text,
          points: 1,
          order: nextOrder++,
          readingSetId: assignedReadingSetId,
          acceptedAnswers: initialAnswer ? [initialAnswer] : [],
        };
      }

      if (pq.type === 'fill_blank') {
        const answersList =
          pq.answers && pq.answers.length > 0
            ? pq.answers
            : pq.answer
            ? pq.answer.split('|').map((s) => s.trim())
            : [];

        const blanks = answersList.map((ans, bIdx) => ({
          id: `b${createOptionId().slice(-4)}_${bIdx + 1}`,
          acceptedAnswers: ans ? [ans] : [],
        }));

        return {
          id: createQuestionId(),
          type: 'fill_blank',
          text: pq.text,
          points: 1,
          order: nextOrder++,
          readingSetId: assignedReadingSetId,
          blanks,
        };
      }

      if (pq.type === 'matching') {
        const leftItemsRaw = pq.matchingLeft || [];
        const rightItemsRaw = pq.matchingRight || [];
        const pairsRaw = pq.matchingPairs || [];

        const leftIdMap = new Map<string, string>();
        const rightIdMap = new Map<string, string>();

        const leftItems: MatchingItem[] = leftItemsRaw.map((item) => {
          const id = `l_${createOptionId().slice(-6)}`;
          leftIdMap.set(item.label.toUpperCase(), id);
          return { id, text: item.text };
        });

        const rightItems: MatchingItem[] = rightItemsRaw.map((item) => {
          const id = `r_${createOptionId().slice(-6)}`;
          rightIdMap.set(item.label, id);
          return { id, text: item.text };
        });

        const correctMatches: CorrectMatch[] = pairsRaw.map((pair) => ({
          leftId: leftIdMap.get(pair.leftLabel.toUpperCase()) || '',
          rightId: rightIdMap.get(pair.rightLabel) || '',
        }));

        const matchingPairs: MatchingPair[] = pairsRaw.map((pair) => ({
          id: `p_${createOptionId().slice(-6)}`,
          left: pair.leftText,
          right: pair.rightText,
        }));

        return {
          id: createQuestionId(),
          type: 'matching',
          text: pq.text,
          points: Math.max(1, matchingPairs.length),
          order: nextOrder++,
          readingSetId: assignedReadingSetId,
          leftItems,
          rightItems,
          correctMatches,
          matchingPairs,
        };
      }

      if (pq.type === 'ordering') {
        const rawItems = pq.orderingItems || [];
        const labelToIdMap = new Map<string, string>();

        const items: OrderingItem[] = rawItems.map((item) => {
          const id = `ord_${createOptionId().slice(-6)}`;
          labelToIdMap.set(item.label.toUpperCase(), id);
          return {
            id,
            text: item.text,
          };
        });

        const answerSequence =
          pq.correctOrder && pq.correctOrder.length > 0
            ? pq.correctOrder
            : pq.answers && pq.answers.length > 0
            ? pq.answers
            : pq.answer
            ? pq.answer.split(',').map((s) => s.trim().toUpperCase())
            : [];

        const correctOrder: string[] = answerSequence
          .map((letter) => labelToIdMap.get(letter.toUpperCase()))
          .filter((id): id is string => Boolean(id));

        return {
          id: createQuestionId(),
          type: 'ordering',
          text: pq.text,
          points: 1,
          order: nextOrder++,
          readingSetId: assignedReadingSetId,
          items,
          orderingItems: items,
          correctOrder,
        };
      }

      const correctLetter = (pq.answer || '').toUpperCase();
      return {
        id: createQuestionId(),
        type: 'multiple_choice',
        text: pq.text,
        points: 1,
        order: nextOrder++,
        sectionId: assignedSectionId || undefined,
        readingSetId: assignedReadingSetId,
        options: pq.options.map((opt) => ({
          id: createOptionId(),
          text: opt.text,
          isCorrect: opt.label.toUpperCase() === correctLetter,
        })),
      };
    });

    // Tag all newly generated questions with assignedSectionId
    const taggedNewQuestions = newQuestions.map((q) => ({
      ...q,
      sectionId: assignedSectionId || q.sectionId,
    }));

    const updated = [...currentTest.questions, ...taggedNewQuestions];
    const renumbered = renumberQuestions(updated);
    setCurrentTest((prev) => ({
      ...prev,
      readingSets: newReadingSet
        ? [...(prev.readingSets || []), newReadingSet]
        : prev.readingSets,
      questions: renumbered,
    }));
    setValidationErrors((prev) =>
      prev.filter((e) => e.field !== 'questions' && !e.field.startsWith('reading_set'))
    );

    // Reset target context
    setTargetSectionId(null);

    // Smooth scroll to target section, newly created reading set, or first newly inserted card
    if (assignedSectionId) {
      setTimeout(() => {
        const el = document.getElementById(`section-${assignedSectionId}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    } else if (newReadingSet) {
      setTimeout(() => {
        const el = document.getElementById(`reading-set-${newReadingSet!.id}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    } else if (newQuestions.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`question-card-${newQuestions[0].id}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    }
  };

  // Update a single question
  const handleUpdateQuestion = (updated: Question) => {
    setCurrentTest((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => (q.id === updated.id ? updated : q)),
    }));

    // Clear any errors for this question on update
    if (validationErrors.some((e) => e.questionId === updated.id)) {
      setValidationErrors((prev) =>
        prev.filter((e) => e.questionId !== updated.id)
      );
    }
  };

  // Duplicate a question
  const handleDuplicateQuestion = (questionId: string) => {
    const index = currentTest.questions.findIndex((q) => q.id === questionId);
    if (index === -1) return;

    const original = currentTest.questions[index];
    const duplicated: Question = {
      ...original,
      id: createQuestionId(),
      options: original.options?.map((opt) => ({
        ...opt,
        id: createOptionId(),
      })),
      acceptedAnswers: original.acceptedAnswers
        ? [...original.acceptedAnswers]
        : undefined,
      blanks: original.blanks
        ? original.blanks.map((b) => ({ ...b, acceptedAnswers: [...b.acceptedAnswers] }))
        : undefined,
      matchingPairs: original.matchingPairs
        ? original.matchingPairs.map((p) => ({ ...p, id: createOptionId() }))
        : undefined,
      orderingItems: original.orderingItems
        ? original.orderingItems.map((item) => ({ ...item, id: createOptionId() }))
        : undefined,
      writingConfig: original.writingConfig ? { ...original.writingConfig } : undefined,
    };

    const updatedQuestions = [...currentTest.questions];
    updatedQuestions.splice(index + 1, 0, duplicated);

    setCurrentTest((prev) => ({
      ...prev,
      questions: renumberQuestions(updatedQuestions),
    }));

    setTimeout(() => {
      const el = document.getElementById(`question-card-${duplicated.id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  // Delete a question
  const handleDeleteQuestion = (questionId: string) => {
    const filtered = currentTest.questions.filter((q) => q.id !== questionId);
    setCurrentTest((prev) => ({
      ...prev,
      questions: renumberQuestions(filtered),
    }));

    // Remove any validation errors for deleted question
    setValidationErrors((prev) =>
      prev.filter((e) => e.questionId !== questionId)
    );
  };

  // Reorder question fromIndex to toIndex
  const handleMoveQuestion = (fromIndex: number, toIndex: number) => {
    if (
      fromIndex < 0 ||
      fromIndex >= currentTest.questions.length ||
      toIndex < 0 ||
      toIndex >= currentTest.questions.length
    ) {
      return;
    }

    const items = [...currentTest.questions];
    const [moved] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, moved);

    setCurrentTest((prev) => ({
      ...prev,
      questions: renumberQuestions(items),
    }));
  };

  // Request Question Type Change
  const handleRequestChangeType = (
    question: Question,
    targetType: QuestionType
  ) => {
    if (question.type === targetType) return;

    // Check if change will alter existing data (e.g. options removed when switching to short-answer or true-false)
    const hasExistingOptions =
      (question.options && question.options.some((o) => o.text.trim().length > 0)) ||
      (question.acceptedAnswers && question.acceptedAnswers.some((a) => a.trim().length > 0));

    if (hasExistingOptions) {
      setPendingTypeChange({ question, targetType });
    } else {
      // Safe to switch directly
      const converted = convertQuestionType(question, targetType);
      handleUpdateQuestion(converted);
    }
  };

  const handleConfirmTypeChange = () => {
    if (!pendingTypeChange) return;
    const { question, targetType } = pendingTypeChange;
    const converted = convertQuestionType(question, targetType);
    handleUpdateQuestion(converted);
    setPendingTypeChange(null);
  };

  // Update Settings handler (Module 3)
  const handleUpdateSettings = (newSettings: TestSettings) => {
    setCurrentTest((prev) => ({
      ...prev,
      settings: newSettings,
    }));
    // Clear settings validation errors if resolved
    setValidationErrors((prev) =>
      prev.filter((e) => !e.field.startsWith('settings'))
    );
  };

  // Update Access Settings handler (Module 10)
  const handleUpdateAccess = async (newAccess: TestAccess) => {
    const updated: Test = {
      ...currentTest,
      access: newAccess,
      updatedAt: new Date().toISOString(),
    };
    setCurrentTest(updated);
    saveTest(updated);
    setSavedSnapshot(JSON.stringify(updated));

    // Server-side published persistence for cross-device access
    if (newAccess.enabled) {
      await publishTestToServer(updated);
    } else if (newAccess.accessCode) {
      await toggleTestAccessOnServer(newAccess.accessCode, false);
    }

    if (onSaveSuccess) {
      onSaveSuccess(updated);
    }
  };

  const handleResetSettingsDefaults = () => {
    setCurrentTest((prev) => ({
      ...prev,
      settings: { ...DEFAULT_TEST_SETTINGS },
    }));
    setValidationErrors((prev) =>
      prev.filter((e) => !e.field.startsWith('settings'))
    );
  };

  // Save Test
  const handleSave = () => {
    // 1. Run Validation
    const validation = validateTest(currentTest);

    if (!validation.isValid) {
      setValidationErrors(validation.errors);

      // Auto-route tab and scroll to first invalid field
      const firstError = validation.errors[0];
      if (firstError.field.startsWith('settings')) {
        setActiveTab('settings');
        const targetId =
          firstError.field === 'settings_time_limit'
            ? 'setting-group-timelimit'
            : 'setting-group-attempts';
        setTimeout(() => {
          document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 80);
      } else if (firstError.field === 'title' || firstError.field === 'description') {
        setActiveTab('questions');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (firstError.questionId) {
        setActiveTab('questions');
        setTimeout(() => {
          const el = document.getElementById(`question-card-${firstError.questionId}`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 80);
      }
      return;
    }

    // 2. Clear any lingering errors
    setValidationErrors([]);
    setIsSaving(true);

    // 3. Persist to storage
    const trimmedTitle = currentTest.title.trim();
    const testToSave: Test = {
      ...currentTest,
      title: trimmedTitle,
      categoryId: currentTest.categoryId || DEFAULT_CATEGORY_ID,
      settings: normalizeTestSettings(currentTest.settings),
      updatedAt: new Date().toISOString(),
    };

    setTimeout(() => {
      const success = saveTest(testToSave);
      setIsSaving(false);

      if (success) {
        setCurrentTest(testToSave);
        const newSnapshot = JSON.stringify(testToSave);
        setSavedSnapshot(newSnapshot);
        setLastSavedAt(testToSave.updatedAt);
        if (testToSave.access?.enabled) {
          publishTestToServer(testToSave).catch((e) =>
            console.warn('[TestEditor] Server sync warning on save:', e)
          );
        }
        onSaveSuccess?.(testToSave);
      }
    }, 250);
  };

  // Back Navigation with Unsaved Changes check
  const handleRequestBack = () => {
    if (isDirty) {
      setShowUnsavedExitModal(true);
    } else {
      onBackToDashboard();
    }
  };

  // Launch Student View (auto-saves any unsaved changes first)
  const handleStudentView = () => {
    if (isDirty) {
      const trimmedTitle = currentTest.title.trim();
      const testToSave: Test = {
        ...currentTest,
        title: trimmedTitle,
        categoryId: currentTest.categoryId || DEFAULT_CATEGORY_ID,
        settings: normalizeTestSettings(currentTest.settings),
        updatedAt: new Date().toISOString(),
      };
      saveTest(testToSave);
      setSavedSnapshot(JSON.stringify(testToSave));
      setLastSavedAt(testToSave.updatedAt);
      onSaveSuccess?.(testToSave);
      onTakeTest?.(testToSave.id);
    } else {
      onTakeTest?.(currentTest.id);
    }
  };

  const totalPoints = currentTest.questions.reduce(
    (acc, q) => acc + (q.points || 1),
    0
  );

  const hasSettingsErrors = validationErrors.some((e) =>
    e.field.startsWith('settings')
  );

  return (
    <div className="min-h-screen bg-[#F3F6FA] flex flex-col pb-16">
      {/* Persistent Top Navigation */}
      <TestHeader
        testTitle={currentTest.title}
        isDirty={isDirty}
        isSaving={isSaving}
        lastSavedAt={lastSavedAt}
        activeTab={activeTab}
        questionCount={currentTest.questions.length}
        hasSettingsErrors={hasSettingsErrors}
        onTabChange={setActiveTab}
        onSave={handleSave}
        onPreview={() => setPreviewMode(true)}
        onTakeTest={onTakeTest ? handleStudentView : undefined}
        onOpenReports={onOpenReports ? () => onOpenReports(currentTest.id) : undefined}
        onBackToDashboard={handleRequestBack}
      />

      {/* Main Authoring Canvas */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {activeTab === 'share' ? (
          /* MODULE 10: TEST SHARING VIEW */
          <TestSharingPanel
            test={currentTest}
            onUpdateAccess={handleUpdateAccess}
          />
        ) : activeTab === 'settings' ? (
          /* MODULE 3: TEST SETTINGS VIEW */
          <TestSettingsCard
            settings={currentTest.settings || DEFAULT_TEST_SETTINGS}
            errors={validationErrors}
            onChangeSettings={handleUpdateSettings}
            onResetDefaults={handleResetSettingsDefaults}
          />
        ) : (
          /* MODULE 1 & 2: QUESTIONS AUTHORING VIEW */
          <>
            {/* Test Information Card */}
            <TestInformation
              title={currentTest.title}
              description={currentTest.description}
              categoryId={currentTest.categoryId || DEFAULT_CATEGORY_ID}
              categories={categories}
              totalQuestions={currentTest.questions.length}
              totalPoints={totalPoints}
              errors={validationErrors}
              audioId={currentTest.audioId}
              audioMetadata={currentTest.audioMetadata}
              onChangeTitle={handleChangeTitle}
              onChangeDescription={handleChangeDescription}
              onChangeCategory={handleChangeCategory}
              onCategoriesUpdated={() => setCategories(loadAllCategories())}
            />

            {/* Question & Section System Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2.5">
                <div className="w-1.5 h-5 rounded-full bg-orange-500 shrink-0" />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-extrabold text-[#173B72] uppercase tracking-wide">
                      {currentTest.sections && currentTest.sections.length > 0
                        ? 'Sections & Questions'
                        : 'Questions'}
                    </h2>
                    {currentTest.sections && currentTest.sections.length > 0 && (
                      <span className="text-xs font-mono font-bold text-orange-700 bg-orange-100/90 px-2.5 py-0.5 rounded-lg border border-orange-300">
                        {currentTest.sections.length} {currentTest.sections.length === 1 ? 'section' : 'sections'}
                      </span>
                    )}
                    {currentTest.questions.length > 0 && (
                      <span className="text-xs font-mono font-semibold text-[#173B72] tabular-nums bg-[#EEF5FF] px-2.5 py-0.5 rounded-lg border border-[#DCE4EE]">
                        {currentTest.questions.length} {currentTest.questions.length === 1 ? 'question' : 'questions'} · {totalPoints} {totalPoints === 1 ? 'point' : 'points'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Organize your assessment into sections (Listening, Reading, Grammar, etc.) or arrange standalone questions.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('settings')}
                  leftIcon={<SettingsIcon className="w-4 h-4 text-orange-500" />}
                  title="Configure test settings"
                >
                  Settings
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddSectionModal(true)}
                  leftIcon={<FolderTree className="w-4 h-4 text-orange-600" />}
                  className="border-orange-300 text-orange-700 hover:bg-orange-50 font-bold"
                  title="Add a new assessment section"
                >
                  + Add Section
                </Button>
                {!(currentTest.sections && currentTest.sections.length > 0) && (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenAddModal()}
                      leftIcon={<Plus className="w-4 h-4" />}
                    >
                      + Add Question
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddReadingSet()}
                      leftIcon={<BookOpen className="w-4 h-4 text-emerald-600" />}
                      className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      title="Add a Reading Passage Set with questions"
                    >
                      + Reading Passage
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setImportModalOpen(true)}
                      leftIcon={<Upload className="w-4 h-4 text-[#2563EB]" />}
                      className="border-blue-200 text-[#2563EB] hover:bg-blue-50"
                    >
                      Import Questions
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Assessment Content Canvas: Sections Mode OR Flat/Legacy Mode */}
            {currentTest.sections && currentTest.sections.length > 0 ? (
              <div className="space-y-6">
                {(() => {
                  const presSections = resolveSectionsForTest(currentTest);
                  return presSections.map((ps, psIdx) => (
                    <SectionCard
                      key={`sec_card_${ps.section.id}`}
                      section={ps.section}
                      sectionIndex={psIdx}
                      totalSections={presSections.length}
                      questions={ps.questions}
                      allQuestions={currentTest.questions}
                      readingSets={ps.readingSets}
                      allReadingSets={currentTest.readingSets || []}
                      allSections={currentTest.sections || []}
                      errors={validationErrors}
                      onUpdateSection={handleUpdateSection}
                      onDeleteSection={handleDeleteSection}
                      onDuplicateSection={handleDuplicateSection}
                      onMoveSectionUp={handleMoveSectionUp}
                      onMoveSectionDown={handleMoveSectionDown}
                      onAddQuestionToSection={(secId) => handleOpenAddModal(undefined, secId)}
                      onAddReadingPassageToSection={(secId) => handleAddReadingSet(secId)}
                      onOpenImportModalToSection={(secId) => handleOpenImportModal(secId)}
                      onUpdateQuestion={handleUpdateQuestion}
                      onDuplicateQuestion={handleDuplicateQuestion}
                      onDeleteQuestion={handleDeleteQuestion}
                      onMoveQuestionUp={(qId) => {
                        const idx = currentTest.questions.findIndex((q) => q.id === qId);
                        if (idx > 0) handleMoveQuestion(idx, idx - 1);
                      }}
                      onMoveQuestionDown={(qId) => {
                        const idx = currentTest.questions.findIndex((q) => q.id === qId);
                        if (idx < currentTest.questions.length - 1) handleMoveQuestion(idx, idx + 1);
                      }}
                      onRequestChangeType={handleRequestChangeType}
                      onMoveQuestionToSection={handleMoveQuestionToSection}
                      onUpdateReadingSet={handleUpdateReadingSet}
                      onDeleteReadingSet={handleDeleteReadingSet}
                      onDuplicateReadingSet={handleDuplicateReadingSet}
                      onMoveReadingSetUp={handleMoveReadingSetUp}
                      onMoveReadingSetDown={handleMoveReadingSetDown}
                      onAddQuestionToSet={handleAddQuestionToSet}
                    />
                  ));
                })()}

                {/* Bottom Add Section Button Bar */}
                <div className="pt-2 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowAddSectionModal(true)}
                    className="w-full py-3.5 border-2 border-dashed border-orange-300 hover:border-orange-500 bg-[#FFF4E8]/60 hover:bg-[#FFF4E8] text-orange-600 hover:text-orange-700 font-bold text-sm rounded-2xl transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-2"
                  >
                    <FolderTree className="w-4 h-4 text-orange-500" />
                    <span>+ Add Section</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Flat / Legacy Questions List (also accessible to add sections at any time) */
              <QuestionList
                questions={currentTest.questions}
                readingSets={currentTest.readingSets || []}
                sections={currentTest.sections || []}
                errors={validationErrors}
                onUpdateQuestion={handleUpdateQuestion}
                onDuplicateQuestion={handleDuplicateQuestion}
                onDeleteQuestion={handleDeleteQuestion}
                onMoveQuestion={handleMoveQuestion}
                onRequestChangeType={handleRequestChangeType}
                onOpenAddModal={handleOpenAddModal}
                onOpenImportModal={() => setImportModalOpen(true)}
                onAddReadingSet={handleAddReadingSet}
                onUpdateReadingSet={handleUpdateReadingSet}
                onDeleteReadingSet={handleDeleteReadingSet}
                onDuplicateReadingSet={handleDuplicateReadingSet}
                onMoveReadingSetUp={handleMoveReadingSetUp}
                onMoveReadingSetDown={handleMoveReadingSetDown}
                onAddQuestionToSet={handleAddQuestionToSet}
                onMoveToSection={handleMoveQuestionToSection}
              />
            )}
          </>
        )}
      </main>

      {/* Modal: Add Section */}
      {showAddSectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#DCE4EE] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                  <FolderTree className="w-4 h-4" />
                </div>
                <h3 className="text-base font-extrabold text-[#173B72]">
                  Add Assessment Section
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSectionModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Section Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['Listening', 'Reading', 'Grammar', 'Vocabulary', 'Writing', 'General', 'Custom'] as SectionType[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setNewSectionType(st);
                      if (!newSectionTitle || newSectionTitle.endsWith('Section')) {
                        setNewSectionTitle(`${st} Section`);
                      }
                    }}
                    className={`px-3 py-2 text-xs font-bold rounded-xl border text-left transition-all ${
                      newSectionType === st
                        ? 'bg-orange-500 text-white border-orange-500 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="new-section-title-input"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
              >
                Section Title
              </label>
              <input
                id="new-section-title-input"
                type="text"
                value={newSectionTitle}
                onChange={(e) => setNewSectionTitle(e.target.value)}
                placeholder={`e.g. Part 1: ${newSectionType}`}
                className="w-full px-3.5 py-2 text-sm bg-white rounded-xl border border-[#DCE4EE] focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none font-medium text-slate-800"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddSectionModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleAddSection(newSectionType, newSectionTitle.trim() || undefined)}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                Create Section
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Question (Type selector) */}
      <QuestionTypeModal
        isOpen={addModalOpen}
        insertPositionText={
          targetReadingSetId
            ? 'Select a question format to add to this reading passage:'
            : insertIndex !== undefined && insertIndex < currentTest.questions.length
            ? `Insert question after Question ${insertIndex}`
            : undefined
        }
        hideReadingPassage={Boolean(targetReadingSetId)}
        onSelectReadingPassage={handleAddReadingSet}
        onSelectType={handleSelectQuestionType}
        onClose={() => {
          setAddModalOpen(false);
          setTargetReadingSetId(null);
        }}
      />

      {/* Modal: Change Question Type Confirmation */}
      <TypeChangeModal
        pendingChange={pendingTypeChange}
        onConfirm={handleConfirmTypeChange}
        onCancel={() => setPendingTypeChange(null)}
      />

      {/* Modal: Direct Question Import */}
      {(() => {
        const destSection = targetSectionId && currentTest.sections
          ? currentTest.sections.find((s) => s.id === targetSectionId)
          : null;
        const isDestInvalid = Boolean(targetSectionId && !destSection);

        return (
          <QuestionImportModal
            isOpen={importModalOpen}
            destinationSectionTitle={destSection ? destSection.title : null}
            isDestinationInvalid={isDestInvalid}
            onClose={() => {
              setImportModalOpen(false);
              setTargetSectionId(null);
            }}
            onImportQuestions={handleImportQuestions}
          />
        );
      })()}

      {/* Modal: Unsaved Changes Before Exit */}
      <ConfirmModal
        isOpen={showUnsavedExitModal}
        title="Unsaved changes"
        description="You have unsaved changes in this assessment. If you leave now, recent modifications will be discarded."
        confirmText="Leave without saving"
        cancelText="Stay and save"
        confirmVariant="danger"
        onConfirm={() => {
          setShowUnsavedExitModal(false);
          onBackToDashboard();
        }}
        onCancel={() => setShowUnsavedExitModal(false)}
      />

      {/* Student Perspective Preview Overlay */}
      {previewMode && (
        <TestPreview
          test={currentTest}
          onClose={() => setPreviewMode(false)}
        />
      )}
    </div>
  );
}
