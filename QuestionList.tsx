/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Question,
  QuestionType,
  ValidationError,
  ReadingSet,
  AssessmentSection,
} from '../../types/test';
import { QuestionCard } from './QuestionCard';
import { ReadingSetCard } from './ReadingSetCard';
import { Button } from '../ui/Button';
import { Plus, BookOpen, Layers, Upload } from 'lucide-react';

interface QuestionListProps {
  questions: Question[];
  readingSets?: ReadingSet[];
  sections?: AssessmentSection[];
  errors: ValidationError[];
  onUpdateQuestion: (updated: Question) => void;
  onDuplicateQuestion: (questionId: string) => void;
  onDeleteQuestion: (questionId: string) => void;
  onMoveQuestion: (fromIndex: number, toIndex: number) => void;
  onRequestChangeType: (question: Question, targetType: QuestionType) => void;
  onOpenAddModal: (insertIndex?: number) => void;
  onOpenImportModal: () => void;
  onAddReadingSet: () => void;
  onUpdateReadingSet: (updated: ReadingSet) => void;
  onDeleteReadingSet: (readingSetId: string) => void;
  onDuplicateReadingSet: (readingSetId: string) => void;
  onMoveReadingSetUp: (index: number) => void;
  onMoveReadingSetDown: (index: number) => void;
  onAddQuestionToSet: (readingSetId: string) => void;
  onMoveToSection?: (questionId: string, targetSectionId: string) => void;
}

export function QuestionList({
  questions,
  readingSets = [],
  sections = [],
  errors,
  onUpdateQuestion,
  onDuplicateQuestion,
  onDeleteQuestion,
  onMoveQuestion,
  onRequestChangeType,
  onOpenAddModal,
  onOpenImportModal,
  onAddReadingSet,
  onUpdateReadingSet,
  onDeleteReadingSet,
  onDuplicateReadingSet,
  onMoveReadingSetUp,
  onMoveReadingSetDown,
  onAddQuestionToSet,
  onMoveToSection,
}: QuestionListProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const standaloneQuestions = questions.filter((q) => !q.readingSetId);
  const totalContentItems = readingSets.length + standaloneQuestions.length;

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && draggedIndex !== index) {
      onMoveQuestion(draggedIndex, index);
      setDraggedIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      onMoveQuestion(index, index - 1);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < questions.length - 1) {
      onMoveQuestion(index, index + 1);
    }
  };

  // Reorder question inside reading set
  const handleMoveQuestionInSet = (
    readingSetId: string,
    questionId: string,
    direction: 'up' | 'down'
  ) => {
    const setQuestions = questions.filter(
      (q) => q.readingSetId === readingSetId
    );
    const setIdx = setQuestions.findIndex((q) => q.id === questionId);
    if (setIdx === -1) return;
    if (direction === 'up' && setIdx === 0) return;
    if (direction === 'down' && setIdx === setQuestions.length - 1) return;

    const targetQuestion =
      direction === 'up' ? setQuestions[setIdx - 1] : setQuestions[setIdx + 1];
    const fromGlobal = questions.findIndex((q) => q.id === questionId);
    const toGlobal = questions.findIndex((q) => q.id === targetQuestion.id);

    if (fromGlobal >= 0 && toGlobal >= 0) {
      onMoveQuestion(fromGlobal, toGlobal);
    }
  };

  // Empty State: No questions and no reading sets (Refined compact informational state)
  if (totalContentItems === 0) {
    return (
      <div className="border border-dashed border-[#DCE4EE] rounded-2xl py-8 px-6 text-center bg-[#FCFCFA] shadow-2xs">
        <h3 className="text-sm font-extrabold text-[#173B72] mb-1">
          No content yet
        </h3>
        <p className="text-xs text-[#64748B] max-w-md mx-auto leading-relaxed">
          Add a question, reading passage, or import questions to start building this assessment.
        </p>
      </div>
    );
  }

  // Interleave blocks: Reading Sets and Standalone Questions sorted by order
  type ContentBlock =
    | {
        type: 'reading_set';
        id: string;
        order: number;
        readingSet: ReadingSet;
        setIndex: number;
        childQuestions: Question[];
      }
    | {
        type: 'standalone_question';
        id: string;
        order: number;
        question: Question;
        globalIndex: number;
      };

  const blocks: ContentBlock[] = [];

  // Add Reading Sets
  readingSets.forEach((rs, sIdx) => {
    const childQuestions = questions.filter((q) => q.readingSetId === rs.id);
    blocks.push({
      type: 'reading_set',
      id: rs.id,
      order: rs.order || sIdx + 1,
      readingSet: rs,
      setIndex: sIdx,
      childQuestions,
    });
  });

  // Add Standalone Questions
  questions.forEach((q, gIdx) => {
    if (!q.readingSetId) {
      blocks.push({
        type: 'standalone_question',
        id: q.id,
        order: q.order || gIdx + 1,
        question: q,
        globalIndex: gIdx,
      });
    }
  });

  // Deterministic order
  blocks.sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      {blocks.map((block, bIdx) => {
        if (block.type === 'reading_set') {
          return (
            <React.Fragment key={`block_rs_${block.id}`}>
              <ReadingSetCard
                readingSet={block.readingSet}
                setIndex={block.setIndex}
                totalReadingSets={readingSets.length}
                questions={block.childQuestions}
                allReadingSets={readingSets}
                errors={errors}
                onUpdateReadingSet={onUpdateReadingSet}
                onDeleteReadingSet={onDeleteReadingSet}
                onDuplicateReadingSet={onDuplicateReadingSet}
                onMoveReadingSetUp={onMoveReadingSetUp}
                onMoveReadingSetDown={onMoveReadingSetDown}
                onAddQuestionToSet={onAddQuestionToSet}
                onUpdateQuestion={onUpdateQuestion}
                onDuplicateQuestion={onDuplicateQuestion}
                onDeleteQuestion={onDeleteQuestion}
                onMoveQuestionUp={(qId) =>
                  handleMoveQuestionInSet(block.readingSet.id, qId, 'up')
                }
                onMoveQuestionDown={(qId) =>
                  handleMoveQuestionInSet(block.readingSet.id, qId, 'down')
                }
                onRequestChangeType={onRequestChangeType}
              />

              {/* Add Content Divider Between Blocks */}
              <div className="relative flex items-center justify-center py-2 group">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#DCE4EE] group-hover:border-orange-300 transition-colors" />
                </div>
                <div className="relative z-10 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenAddModal(block.order)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-orange-600 bg-[#FCFCFA] border border-orange-300 group-hover:border-orange-500 group-hover:bg-[#FFF4E8] transition-all shadow-2xs hover:shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-orange-500" />
                    <span>Add Question</span>
                  </button>
                  <button
                    type="button"
                    onClick={onAddReadingSet}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-emerald-700 bg-[#FCFCFA] border border-emerald-300 group-hover:border-emerald-500 group-hover:bg-emerald-50 transition-all shadow-2xs hover:shadow-xs cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Add Reading Passage</span>
                  </button>
                </div>
              </div>
            </React.Fragment>
          );
        }

        // Standalone Question
        return (
          <React.Fragment key={`block_q_${block.id}`}>
            <QuestionCard
              question={block.question}
              index={block.globalIndex}
              totalQuestions={questions.length}
              errors={errors}
              readingSets={readingSets}
              sections={sections}
              onUpdate={onUpdateQuestion}
              onDuplicate={onDuplicateQuestion}
              onDelete={onDeleteQuestion}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              onRequestChangeType={onRequestChangeType}
              onMoveToSection={onMoveToSection}
              isDragging={draggedIndex === block.globalIndex}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            />

            {/* Add Content Divider Between Cards */}
            <div className="relative flex items-center justify-center py-1.5 group">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#DCE4EE] group-hover:border-orange-300 transition-colors" />
              </div>
              <div className="relative z-10 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenAddModal(block.globalIndex + 1)}
                  className="flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold text-orange-600 bg-[#FCFCFA] border border-orange-300 group-hover:border-orange-500 group-hover:bg-[#FFF4E8] transition-all shadow-2xs hover:shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-orange-500" />
                  <span>Add Question here</span>
                </button>
              </div>
            </div>
          </React.Fragment>
        );
      })}

      {/* Bottom Action Toolbar */}
      <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
        <button
          type="button"
          onClick={() => onOpenAddModal(questions.length)}
          className="w-full flex-1 py-3.5 border-2 border-dashed border-orange-300 hover:border-orange-500 bg-[#FFF4E8]/60 hover:bg-[#FFF4E8] text-orange-600 hover:text-orange-700 font-bold text-sm rounded-2xl transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4 text-orange-500" />
          <span>Add Question</span>
        </button>

        <button
          type="button"
          onClick={onAddReadingSet}
          className="w-full flex-1 py-3.5 border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/60 hover:bg-emerald-50 text-emerald-700 hover:text-emerald-800 font-bold text-sm rounded-2xl transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-2"
        >
          <BookOpen className="w-4 h-4 text-emerald-600" />
          <span>+ Add Reading Passage</span>
        </button>

        <button
          type="button"
          onClick={onOpenImportModal}
          className="w-full sm:w-auto px-6 py-3.5 border-2 border-dashed border-blue-300 hover:border-blue-500 bg-[#EEF5FF]/60 hover:bg-[#EEF5FF] text-[#2563EB] hover:text-blue-700 font-bold text-sm rounded-2xl transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-2"
        >
          <Upload className="w-4 h-4 text-[#2563EB]" />
          <span>Import Questions</span>
        </button>
      </div>
    </div>
  );
}
