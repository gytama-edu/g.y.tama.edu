/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ReadingSet,
  Question,
  QuestionType,
  ValidationError,
  AssessmentSection,
} from '../../types/test';
import { QuestionCard } from './QuestionCard';
import { ConfirmModal } from '../ui/ConfirmModal';
import { Button } from '../ui/Button';
import {
  BookOpen,
  ChevronUp,
  ChevronDown,
  Trash2,
  Copy,
  Plus,
  FileText,
  AlertCircle,
  Layers,
} from 'lucide-react';

interface ReadingSetCardProps {
  readingSet: ReadingSet;
  setIndex: number;
  totalReadingSets: number;
  questions: Question[];
  allReadingSets?: ReadingSet[];
  errors: ValidationError[];
  section?: AssessmentSection;
  sectionTotalQuestions?: number;
  sectionTotalPoints?: number;
  onUpdateReadingSet: (updated: ReadingSet) => void;
  onDeleteReadingSet: (readingSetId: string) => void;
  onDuplicateReadingSet: (readingSetId: string) => void;
  onMoveReadingSetUp: (index: number) => void;
  onMoveReadingSetDown: (index: number) => void;
  onAddQuestionToSet: (readingSetId: string) => void;
  onUpdateQuestion: (updated: Question) => void;
  onDuplicateQuestion: (questionId: string) => void;
  onDeleteQuestion: (questionId: string) => void;
  onMoveQuestionUp: (questionId: string) => void;
  onMoveQuestionDown: (questionId: string) => void;
  onRequestChangeType: (question: Question, targetType: QuestionType) => void;
}

export function ReadingSetCard({
  readingSet,
  setIndex,
  totalReadingSets,
  questions,
  allReadingSets = [],
  errors,
  section,
  sectionTotalQuestions,
  sectionTotalPoints,
  onUpdateReadingSet,
  onDeleteReadingSet,
  onDuplicateReadingSet,
  onMoveReadingSetUp,
  onMoveReadingSetDown,
  onAddQuestionToSet,
  onUpdateQuestion,
  onDuplicateQuestion,
  onDeleteQuestion,
  onMoveQuestionUp,
  onMoveQuestionDown,
  onRequestChangeType,
}: ReadingSetCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showCustomInstructions, setShowCustomInstructions] = useState(false);

  // Compute word count for the passage
  const wordCount = (readingSet.passage || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  // Filter errors for this reading set
  const titleErrors = errors.filter(
    (e) =>
      e.field === 'reading_set_title' &&
      e.message.includes(`Reading Passage ${setIndex + 1}`)
  );
  const passageErrors = errors.filter(
    (e) =>
      e.field === 'reading_set_passage' &&
      e.message.includes(`Reading Passage ${setIndex + 1}`)
  );
  const setQuestionErrors = errors.filter(
    (e) =>
      e.field === 'reading_set_questions' &&
      e.message.includes(`Reading Passage ${setIndex + 1}`)
  );

  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);

  const isInsideSection = Boolean(section);

  // When inside a section, check if this passage's question count and points duplicate the section totals
  const isDuplicateOfSectionTotals =
    isInsideSection &&
    typeof sectionTotalQuestions === 'number' &&
    questions.length === sectionTotalQuestions &&
    typeof sectionTotalPoints === 'number' &&
    totalPoints === sectionTotalPoints;

  // Section vs passage instructions comparison:
  // Only display passage instructions if they differ meaningfully from section instructions,
  // or if the user explicitly clicked to add custom instructions.
  const sectionInstructions = (section?.instructions || '').trim();
  const passageInstructions = (readingSet.instructions || '').trim();
  const hasMeaningfulDifferentInstructions =
    isInsideSection &&
    passageInstructions.length > 0 &&
    passageInstructions.toLowerCase() !== sectionInstructions.toLowerCase();

  const shouldShowInstructionsInput =
    !isInsideSection || hasMeaningfulDifferentInstructions || showCustomInstructions;

  return (
    <div
      id={`reading-set-${readingSet.id}`}
      className={
        isInsideSection
          ? 'bg-white rounded-xl border border-slate-200/90 shadow-2xs transition-all duration-200'
          : 'bg-[#FCFCFA] rounded-2xl border-2 border-emerald-300/80 shadow-xs transition-all duration-200'
      }
    >
      {/* Set Header Bar: compact and cohesive inside sections */}
      <div
        className={
          isInsideSection
            ? 'bg-slate-50/80 border-b border-slate-200/80 px-4 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-2.5 rounded-t-xl'
            : 'bg-emerald-50/60 border-b border-emerald-200/80 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 rounded-t-2xl'
        }
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <BookOpen className="w-4 h-4 text-emerald-700 shrink-0" />
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-xs font-bold text-slate-700">
              {totalReadingSets > 1
                ? `Passage ${setIndex + 1}`
                : isInsideSection
                ? 'Passage'
                : `Reading Passage ${setIndex + 1}`}
            </span>
            {readingSet.title.trim() && (
              <span className="text-xs font-bold text-[#173B72] truncate max-w-[200px] sm:max-w-sm">
                — {readingSet.title.trim()}
              </span>
            )}
            {/* Display question count and points only if they do NOT duplicate section totals */}
            {!isDuplicateOfSectionTotals && (
              <span className="text-2xs font-mono text-slate-500">
                · {questions.length} {questions.length === 1 ? 'question' : 'questions'} ·{' '}
                {totalPoints} {totalPoints === 1 ? 'pt' : 'pts'}
              </span>
            )}
            {wordCount > 0 && (
              <span className="text-3xs font-mono text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                {wordCount} words
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          {totalReadingSets > 1 && (
            <>
              <button
                type="button"
                disabled={setIndex === 0}
                onClick={() => onMoveReadingSetUp(setIndex)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Move passage up"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={setIndex === totalReadingSets - 1}
                onClick={() => onMoveReadingSetDown(setIndex)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Move passage down"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => onDuplicateReadingSet(readingSet.id)}
            className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
            title="Duplicate reading passage with questions"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            title="Delete reading passage"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="ml-1 text-2xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
          >
            {isCollapsed ? 'Expand' : 'Collapse'}
          </button>
        </div>
      </div>

      {/* Set Body */}
      {!isCollapsed && (
        <div className="p-4 sm:p-5 space-y-4">
          {/* Top Inputs: Title & Source */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label
                htmlFor={`reading-title-${readingSet.id}`}
                className="block text-2xs font-bold uppercase tracking-wider text-slate-700 mb-1"
              >
                Passage Title <span className="text-rose-500">*</span>
              </label>
              <input
                id={`reading-title-${readingSet.id}`}
                type="text"
                value={readingSet.title}
                onChange={(e) =>
                  onUpdateReadingSet({ ...readingSet, title: e.target.value })
                }
                placeholder="e.g. The History of Coffee"
                className={`w-full px-3 py-1.5 text-sm bg-white rounded-lg border focus:outline-none transition-colors font-medium text-slate-800 ${
                  titleErrors.length > 0
                    ? 'border-rose-400 focus:border-rose-500'
                    : 'border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                }`}
              />
              {titleErrors.map((err, i) => (
                <p
                  key={i}
                  className="text-xs text-rose-500 mt-1 flex items-center gap-1 font-medium"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {err.message}
                </p>
              ))}
            </div>

            <div>
              <label
                htmlFor={`reading-source-${readingSet.id}`}
                className="block text-2xs font-bold uppercase tracking-wider text-slate-700 mb-1"
              >
                Source / Reference{' '}
                <span className="text-slate-400 font-normal lowercase">
                  (optional)
                </span>
              </label>
              <input
                id={`reading-source-${readingSet.id}`}
                type="text"
                value={readingSet.source || ''}
                onChange={(e) =>
                  onUpdateReadingSet({ ...readingSet, source: e.target.value })
                }
                placeholder="e.g. Adapted from Smithsonian Magazine (2024)"
                className="w-full px-3 py-1.5 text-sm bg-white rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-colors text-slate-800"
              />
            </div>
          </div>

          {/* Instructions: display only when differing from section instructions */}
          {shouldShowInstructionsInput ? (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor={`reading-instructions-${readingSet.id}`}
                  className="block text-2xs font-bold uppercase tracking-wider text-slate-700"
                >
                  Passage Instructions{' '}
                  <span className="text-slate-400 font-normal lowercase">
                    {isInsideSection
                      ? '(optional — differs from section instructions)'
                      : '(optional)'}
                  </span>
                </label>
                {isInsideSection && (
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateReadingSet({ ...readingSet, instructions: '' });
                      setShowCustomInstructions(false);
                    }}
                    className="text-2xs text-slate-500 hover:text-rose-600 underline cursor-pointer"
                  >
                    Use section instructions
                  </button>
                )}
              </div>
              <input
                id={`reading-instructions-${readingSet.id}`}
                type="text"
                value={readingSet.instructions || ''}
                onChange={(e) =>
                  onUpdateReadingSet({
                    ...readingSet,
                    instructions: e.target.value,
                  })
                }
                placeholder="e.g. Read the passage and answer Questions 1–5."
                className="w-full px-3 py-1.5 text-sm bg-white rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-colors text-slate-800"
              />
            </div>
          ) : (
            <div className="flex items-center justify-between text-2xs text-slate-500 py-1.5 px-3 bg-slate-50/80 rounded-lg border border-slate-200/60">
              <span>
                Instructions:{' '}
                <span className="italic text-slate-600">
                  Using section instructions
                </span>
              </span>
              <button
                type="button"
                onClick={() => setShowCustomInstructions(true)}
                className="text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer font-medium"
              >
                + Add passage-specific instructions
              </button>
            </div>
          )}

          {/* Passage Text */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor={`reading-passage-${readingSet.id}`}
                className="block text-2xs font-bold uppercase tracking-wider text-slate-700"
              >
                Reading Passage Text <span className="text-rose-500">*</span>
              </label>
              <span className="text-2xs font-mono text-slate-400">
                {wordCount} words · {readingSet.passage?.length || 0} characters
              </span>
            </div>
            <textarea
              id={`reading-passage-${readingSet.id}`}
              rows={8}
              value={readingSet.passage}
              onChange={(e) =>
                onUpdateReadingSet({ ...readingSet, passage: e.target.value })
              }
              placeholder="Paste or type the reading passage here. Paragraph breaks and formatting are preserved for students..."
              className={`w-full p-3.5 text-sm font-serif leading-relaxed bg-white rounded-lg border focus:outline-none transition-colors text-slate-900 ${
                passageErrors.length > 0
                  ? 'border-rose-400 focus:border-rose-500'
                  : 'border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
              }`}
            />
            {passageErrors.map((err, i) => (
              <p
                key={i}
                className="text-xs text-rose-500 mt-1 flex items-center gap-1 font-medium"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {err.message}
              </p>
            ))}
          </div>

          {/* Attached Questions */}
          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  {totalReadingSets > 1
                    ? `Questions for Passage ${setIndex + 1}`
                    : 'Passage Questions'}
                </h4>
                {!isDuplicateOfSectionTotals && questions.length > 0 && (
                  <span className="text-2xs font-mono text-slate-500">
                    ({questions.length})
                  </span>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onAddQuestionToSet(readingSet.id)}
                leftIcon={<Plus className="w-3.5 h-3.5 text-emerald-600" />}
                className="text-xs border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50/50"
              >
                + Add Question
              </Button>
            </div>

            {setQuestionErrors.map((err, i) => (
              <div
                key={i}
                className="mb-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{err.message}</span>
              </div>
            ))}

            {/* Questions List or Empty State */}
            {questions.length === 0 ? (
              <div className="bg-slate-50/60 border border-dashed border-slate-200 rounded-xl p-6 text-center space-y-2">
                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700">
                    No questions yet
                  </p>
                  <p className="text-2xs text-slate-500 mt-0.5">
                    Add questions for students to answer after reading this passage.
                  </p>
                </div>
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAddQuestionToSet(readingSet.id)}
                    leftIcon={<Plus className="w-3.5 h-3.5 text-emerald-600" />}
                    className="text-xs border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50/50"
                  >
                    + Add Question
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                {questions.map((q, qIdx) => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    index={q.order ? q.order - 1 : qIdx}
                    totalQuestions={questions.length}
                    errors={errors}
                    readingSets={allReadingSets}
                    onUpdate={onUpdateQuestion}
                    onDuplicate={onDuplicateQuestion}
                    onDelete={onDeleteQuestion}
                    onMoveUp={() => onMoveQuestionUp(q.id)}
                    onMoveDown={() => onMoveQuestionDown(q.id)}
                    onRequestChangeType={onRequestChangeType}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete reading passage?"
        description={`Are you sure you want to delete "${
          readingSet.title || 'this reading passage'
        }"?\n\nThis will remove the reading passage and its ${
          questions.length
        } attached question${
          questions.length === 1 ? '' : 's'
        }. Any other questions in your assessment will remain untouched.`}
        confirmText="Delete Reading Passage"
        cancelText="Cancel"
        confirmVariant="danger"
        onConfirm={() => {
          setShowDeleteConfirm(false);
          onDeleteReadingSet(readingSet.id);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
