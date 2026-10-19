/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Question,
  QuestionType,
  AnswerOption,
  ValidationError,
  BlankItem,
  MatchingPair,
  OrderingItem,
  WritingConfig,
  ReadingSet,
  AssessmentSection,
} from '../../types/test';
import { SingleChoiceEditor } from './editors/SingleChoiceEditor';
import { MultipleChoiceEditor } from './editors/MultipleChoiceEditor';
import { TrueFalseEditor } from './editors/TrueFalseEditor';
import { ShortAnswerEditor } from './editors/ShortAnswerEditor';
import { FillBlankEditor } from './editors/FillBlankEditor';
import { MatchingEditor } from './editors/MatchingEditor';
import { OrderingEditor } from './editors/OrderingEditor';
import { EssayEditor } from './editors/EssayEditor';
import { WritingEditor } from './editors/WritingEditor';
import { ConfirmModal } from '../ui/ConfirmModal';
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  Copy,
  Trash2,
  AlertCircle,
  BookOpen,
  FolderTree,
} from 'lucide-react';

interface QuestionCardProps {
  question: Question;
  index: number;
  totalQuestions: number;
  errors: ValidationError[];
  readingSets?: ReadingSet[];
  sections?: AssessmentSection[];
  onUpdate: (updated: Question) => void;
  onDuplicate: (questionId: string) => void;
  onDelete: (questionId: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRequestChangeType: (question: Question, targetType: QuestionType) => void;
  onMoveToSection?: (questionId: string, targetSectionId: string) => void;
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent, index: number) => void;
  onDragOver?: (e: React.DragEvent, index: number) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

export function QuestionCard({
  question,
  index,
  totalQuestions,
  errors,
  readingSets = [],
  sections = [],
  onUpdate,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onRequestChangeType,
  onMoveToSection,
  isDragging,
  onDragStart,
  onDragOver,
  onDragEnd,
}: QuestionCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const questionNum = String(index + 1).padStart(2, '0');
  const questionErrors = errors.filter((e) => e.questionId === question.id);
  const hasErrors = questionErrors.length > 0;

  const normType = String(question.type || 'single-choice').replace(/-/g, '_').toLowerCase();

  const handleTextChange = (text: string) => {
    onUpdate({ ...question, text });
  };

  const handlePointsChange = (valStr: string) => {
    const val = parseInt(valStr, 10);
    onUpdate({
      ...question,
      points: isNaN(val) ? 1 : Math.max(1, Math.min(100, val)),
    });
  };

  const handleOptionsChange = (options: AnswerOption[]) => {
    onUpdate({ ...question, options });
  };

  const handleAcceptedAnswersChange = (acceptedAnswers: string[]) => {
    onUpdate({ ...question, acceptedAnswers });
  };

  const handleBlanksChange = (blanks: BlankItem[]) => {
    onUpdate({ ...question, blanks });
  };

  const handleMatchingPairsChange = (matchingPairs: MatchingPair[]) => {
    onUpdate({ ...question, matchingPairs });
  };

  const handleOrderingItemsChange = (orderingItems: OrderingItem[]) => {
    onUpdate({ ...question, orderingItems });
  };

  const handleEssayMaxWordsChange = (maxWords: number | null) => {
    onUpdate({ ...question, maxWords, requiresManualGrading: true });
  };

  const handleWritingConfigChange = (writingConfig: WritingConfig) => {
    onUpdate({ ...question, writingConfig, requiresManualGrading: true });
  };

  return (
    <>
      <div
        id={`question-card-${question.id}`}
        draggable
        onFocus={() => setIsFocused(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) {
            setIsFocused(false);
          }
        }}
        onClick={() => setIsFocused(true)}
        onDragStart={(e) => onDragStart?.(e, index)}
        onDragOver={(e) => onDragOver?.(e, index)}
        onDragEnd={onDragEnd}
        className={`relative rounded-2xl border bg-white shadow-xs transition-all duration-200 overflow-hidden ${
          isDragging ? 'opacity-40 border-dashed border-blue-400' : ''
        } ${
          hasErrors
            ? 'border-rose-300 ring-2 ring-rose-100'
            : isFocused
            ? 'border-[#2563EB] ring-2 ring-[#2563EB]/10 shadow-sm'
            : 'border-[#DCE4EE] hover:border-[#CBD5E1]'
        }`}
      >
        {/* Left Orange Accent bar on active focus */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors ${
            hasErrors
              ? 'bg-rose-500'
              : isFocused
              ? 'bg-orange-500'
              : 'bg-transparent'
          }`}
        />

        {/* Top Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[#DCE4EE] bg-[#F7F9FC] pl-6">
          <div className="flex items-center gap-3">
            {/* Drag Handle */}
            <div
              className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-blue-600 p-1 rounded transition-colors"
              title="Drag to reorder"
            >
              <GripVertical className="w-4 h-4" />
            </div>

            {/* Question Number with blue / orange accent */}
            <div className="flex items-center gap-2">
              <span
                className={`font-mono font-extrabold text-base tabular-nums transition-colors ${
                  isFocused ? 'text-orange-600' : 'text-[#173B72]'
                }`}
              >
                {questionNum}
              </span>
            </div>

            {/* Question Type Badge Dropdown */}
            <div className="flex items-center">
              <select
                value={
                  normType === 'single_choice'
                    ? 'multiple_choice'
                    : normType === 'multiple_choice' && question.type === 'multiple-choice'
                    ? 'multiple_select'
                    : question.type
                }
                onChange={(e) =>
                  onRequestChangeType(question, e.target.value as QuestionType)
                }
                aria-label={`Change type for Question ${questionNum}`}
                className="text-xs font-bold uppercase tracking-wider text-[#2563EB] bg-[#EEF5FF] border border-[#DCE4EE] hover:bg-blue-100/70 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs transition-colors"
              >
                <option value="multiple_choice">Multiple Choice</option>
                <option value="true_false">True / False</option>
                <option value="multiple_select">Multiple Select</option>
                <option value="short_answer">Short Answer</option>
                <option value="fill_blank">Fill in the Blank</option>
                <option value="matching">Matching</option>
                <option value="ordering">Ordering</option>
                <option value="essay">Essay / Long Answer</option>
                <option value="writing">Writing Task</option>
              </select>
            </div>

            {/* Reading Passage Assignment if test has reading sets */}
            {readingSets.length > 0 && (
              <div className="flex items-center gap-1.5">
                <select
                  value={question.readingSetId || ''}
                  onChange={(e) =>
                    onUpdate({
                      ...question,
                      readingSetId: e.target.value ? e.target.value : undefined,
                    })
                  }
                  aria-label={`Assign Question ${questionNum} to reading passage`}
                  className={`text-2xs font-bold uppercase tracking-wider rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs transition-colors border ${
                    question.readingSetId
                      ? 'text-emerald-800 bg-emerald-100/90 border-emerald-300'
                      : 'text-slate-500 bg-white border-[#DCE4EE] hover:bg-slate-50'
                  }`}
                >
                  <option value="">Standalone Question</option>
                  {readingSets.map((rs, rIdx) => (
                    <option key={rs.id} value={rs.id}>
                      Reading {rIdx + 1}: {rs.title.trim() || 'Untitled'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Section Assignment / Move between sections (Module 17) */}
            {sections.length > 1 && (
              <div className="flex items-center gap-1.5">
                <select
                  value={question.sectionId || ''}
                  onChange={(e) => {
                    const targetSecId = e.target.value;
                    if (onMoveToSection && targetSecId) {
                      onMoveToSection(question.id, targetSecId);
                    } else {
                      onUpdate({
                        ...question,
                        sectionId: targetSecId || undefined,
                      });
                    }
                  }}
                  aria-label={`Move Question ${questionNum} to section`}
                  className={`text-2xs font-bold uppercase tracking-wider rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer shadow-2xs transition-colors border ${
                    question.sectionId
                      ? 'text-orange-800 bg-orange-100/90 border-orange-300'
                      : 'text-slate-500 bg-white border-[#DCE4EE] hover:bg-slate-50'
                  }`}
                  title="Move question to a different section"
                >
                  <option value="">Section: Default</option>
                  {sections.map((sec, sIdx) => (
                    <option key={sec.id} value={sec.id}>
                      Sec {sIdx + 1}: {sec.title.trim() || `${sec.type} Section`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Right Action Controls: Points & Reorder / Actions */}
          <div className="flex items-center gap-3">
            {/* Points input */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium bg-white px-2.5 py-1 rounded-lg border border-[#DCE4EE] shadow-2xs">
              <label htmlFor={`pts-${question.id}`} className="select-none font-semibold text-slate-700">
                Points:
              </label>
              <input
                id={`pts-${question.id}`}
                type="number"
                min={1}
                max={100}
                value={question.points}
                onChange={(e) => handlePointsChange(e.target.value)}
                className="w-12 text-center font-mono font-bold text-orange-600 focus:outline-none focus:ring-1 focus:ring-orange-500 rounded bg-[#FFF4E8] tabular-nums"
              />
            </div>

            {/* Reorder Buttons (Move Up / Down) */}
            <div className="flex items-center border border-[#DCE4EE] rounded-lg bg-white overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => onMoveUp(index)}
                disabled={index === 0}
                title="Move question up"
                aria-label="Move question up"
                className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <div className="w-[1px] h-3.5 bg-[#DCE4EE]" />
              <button
                type="button"
                onClick={() => onMoveDown(index)}
                disabled={index === totalQuestions - 1}
                title="Move question down"
                aria-label="Move question down"
                className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Duplicate Button */}
            <button
              type="button"
              onClick={() => onDuplicate(question.id)}
              title="Duplicate question"
              className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 border border-transparent hover:border-[#DCE4EE] rounded-lg transition-colors cursor-pointer"
            >
              <Copy className="w-4 h-4" />
            </button>

            {/* Delete Button */}
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              title="Delete question"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 space-y-5 pl-7">
          {/* Question Text Prompt */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor={`q-text-${question.id}`}
                className="text-xs font-bold text-[#173B72] uppercase tracking-wide"
              >
                {normType === 'writing' ? 'Writing Task Prompt' : 'Question Prompt'}{' '}
                <span className="text-orange-500">*</span>
              </label>
              <span className="text-2xs text-slate-400 font-mono tabular-nums">
                {question.text.length}/5000
              </span>
            </div>
            <textarea
              id={`q-text-${question.id}`}
              rows={normType === 'writing' || normType === 'essay' ? 4 : 2}
              maxLength={5000}
              value={question.text}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={
                normType === 'writing'
                  ? 'Write an essay about the advantages and disadvantages of working from home.'
                  : normType === 'fill_blank'
                  ? 'She [blank_1] to school [blank_2] Monday.'
                  : 'Enter question text...'
              }
              className="w-full rounded-xl border border-[#DCE4EE] bg-[#F7F9FC] px-3.5 py-2.5 text-sm text-[#172033] placeholder:text-slate-400 focus:bg-white focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15 transition-all whitespace-pre-wrap"
            />
          </div>

          {/* Type-Specific Answer Options Editor */}
          <div className="pt-1">
            {(normType === 'single_choice' || normType === 'multiple_choice') && (
              <SingleChoiceEditor
                options={question.options || []}
                questionId={question.id}
                onChange={handleOptionsChange}
              />
            )}

            {normType === 'multiple_select' && (
              <MultipleChoiceEditor
                options={question.options || []}
                questionId={question.id}
                onChange={handleOptionsChange}
              />
            )}

            {normType === 'true_false' && (
              <TrueFalseEditor
                options={question.options || []}
                questionId={question.id}
                onChange={handleOptionsChange}
              />
            )}

            {normType === 'short_answer' && (
              <ShortAnswerEditor
                acceptedAnswers={question.acceptedAnswers || []}
                onChange={handleAcceptedAnswersChange}
              />
            )}

            {normType === 'fill_blank' && (
              <FillBlankEditor
                blanks={question.blanks || []}
                onChange={handleBlanksChange}
              />
            )}

            {normType === 'matching' && (
              <MatchingEditor
                pairs={question.matchingPairs || []}
                onChange={handleMatchingPairsChange}
              />
            )}

            {normType === 'ordering' && (
              <OrderingEditor
                items={question.orderingItems || []}
                onChange={handleOrderingItemsChange}
              />
            )}

            {normType === 'essay' && (
              <EssayEditor
                maxWords={question.maxWords}
                onChangeMaxWords={handleEssayMaxWordsChange}
              />
            )}

            {normType === 'writing' && (
              <WritingEditor
                config={
                  question.writingConfig || {
                    writingType: 'General Writing',
                    showWordCount: true,
                  }
                }
                onChange={handleWritingConfigChange}
              />
            )}
          </div>

          {/* Inline Validation Errors for this question */}
          {hasErrors && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 space-y-1">
              {questionErrors.map((err, i) => (
                <div key={`err_${question.id}_${i}`} className="flex items-start gap-2 text-xs text-rose-700 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 text-rose-500 shrink-0" />
                  <span>{err.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete question?"
        description={`This will permanently remove Question ${questionNum} and all its answers from this assessment.`}
        confirmText="Delete Question"
        cancelText="Cancel"
        confirmVariant="danger"
        onConfirm={() => {
          setShowDeleteConfirm(false);
          onDelete(question.id);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}
