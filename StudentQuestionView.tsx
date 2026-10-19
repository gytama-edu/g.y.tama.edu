/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { Question } from '../../types/test';
import {
  StudentAnswer,
  StudentSingleChoiceAnswer,
  StudentMultipleChoiceAnswer,
  StudentTrueFalseAnswer,
  StudentShortAnswer,
  StudentFillBlankAnswer,
  StudentMatchingAnswer,
  StudentOrderingAnswer,
  StudentEssayAnswer,
  StudentWritingAnswer,
} from '../../types/student';
import { evaluateWordCount } from '../../utils/wordCount';
import {
  Check,
  ChevronUp,
  ChevronDown,
  GripVertical,
  PenTool,
  Clock,
  ArrowRight,
  Tag,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { StudentAudioPlayer } from './StudentAudioPlayer';

interface StudentQuestionViewProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  answer?: StudentAnswer;
  disabled?: boolean;
  onAnswerChange: (answer: StudentAnswer) => void;
}

export function StudentQuestionView({
  question,
  questionNumber,
  totalQuestions,
  answer,
  disabled = false,
  onAnswerChange,
}: StudentQuestionViewProps) {
  const points = question.points || 1;
  const normType = String(question.type || 'single-choice').replace(/-/g, '_').toLowerCase();

  // 1. Multiple Choice / Single Choice handler
  const handleSelectOptionSingle = (optionId: string) => {
    if (disabled) return;
    const newAnswer: StudentSingleChoiceAnswer = {
      type: 'multiple_choice',
      optionId,
    };
    onAnswerChange(newAnswer);
  };

  // 2. Multiple Select handler
  const handleToggleOptionMultiple = (optionId: string) => {
    if (disabled) return;
    let currentOptionIds: string[] = [];
    if (answer?.type === 'multiple-choice' || answer?.type === 'multiple_select') {
      currentOptionIds = answer.optionIds || [];
    }

    const updated = currentOptionIds.includes(optionId)
      ? currentOptionIds.filter((id) => id !== optionId)
      : [...currentOptionIds, optionId];

    const newAnswer: StudentMultipleChoiceAnswer = {
      type: 'multiple_select',
      optionIds: updated,
    };
    onAnswerChange(newAnswer);
  };

  // 3. True / False handler
  const handleSelectTrueFalse = (val: boolean) => {
    if (disabled) return;
    const newAnswer: StudentTrueFalseAnswer = {
      type: 'true_false',
      value: val,
    };
    onAnswerChange(newAnswer);
  };

  // 4. Short Answer handler
  const handleChangeShortAnswer = (val: string) => {
    if (disabled) return;
    const newAnswer: StudentShortAnswer = {
      type: 'short_answer',
      value: val,
    };
    onAnswerChange(newAnswer);
  };

  // 5. Fill in the Blank handler
  const handleBlankChange = (blankId: string, val: string) => {
    if (disabled) return;
    const currentBlanks =
      answer && answer.type === 'fill_blank' && typeof answer.answers === 'object'
        ? { ...answer.answers }
        : {};

    currentBlanks[blankId] = val;

    const newAnswer: StudentFillBlankAnswer = {
      type: 'fill_blank',
      answers: currentBlanks,
    };
    onAnswerChange(newAnswer);
  };

  // 6. Matching handler
  const handleMatchChange = (leftKey: string, rightValue: string) => {
    if (disabled) return;
    const currentMatches =
      answer && answer.type === 'matching' && typeof answer.matches === 'object'
        ? { ...answer.matches }
        : {};

    currentMatches[leftKey] = rightValue;

    const newAnswer: StudentMatchingAnswer = {
      type: 'matching',
      matches: currentMatches,
    };
    onAnswerChange(newAnswer);
  };

  // 7. Ordering handlers
  // Ensure we have an active ordered list of IDs initialized from answer or question items
  const currentOrderedIds = useMemo(() => {
    if (answer && answer.type === 'ordering' && Array.isArray(answer.orderedIds) && answer.orderedIds.length > 0) {
      return answer.orderedIds;
    }
    const items = question.orderingItems || question.items || [];
    return items.map((item) => item.id);
  }, [answer, question.orderingItems, question.items]);

  const handleMoveOrderItem = (index: number, direction: 'up' | 'down') => {
    if (disabled) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentOrderedIds.length) return;

    const copy = [...currentOrderedIds];
    const temp = copy[targetIndex];
    copy[targetIndex] = copy[index];
    copy[index] = temp;

    const newAnswer: StudentOrderingAnswer = {
      type: 'ordering',
      orderedIds: copy,
    };
    onAnswerChange(newAnswer);
  };

  // 8. Essay handler
  const handleChangeEssay = (text: string) => {
    if (disabled) return;
    const newAnswer: StudentEssayAnswer = {
      type: 'essay',
      text,
    };
    onAnswerChange(newAnswer);
  };

  // 9. Writing handler
  const handleChangeWriting = (text: string) => {
    if (disabled) return;
    const newAnswer: StudentWritingAnswer = {
      type: 'writing',
      text,
    };
    onAnswerChange(newAnswer);
  };

  // Items for Matching: supports matchingPairs and leftItems/rightItems
  const matchingLeftItems = useMemo(() => {
    if (question.matchingPairs && question.matchingPairs.length > 0) {
      return question.matchingPairs.map((p) => ({
        id: p.id,
        left: p.left,
        right: p.right,
      }));
    }
    if (question.leftItems && question.leftItems.length > 0) {
      return question.leftItems.map((item) => ({
        id: item.id,
        left: item.text,
        right: '',
      }));
    }
    return [];
  }, [question.matchingPairs, question.leftItems]);

  const matchingRightOptions = useMemo(() => {
    const fromPairs = (question.matchingPairs || []).map((p) => p.right).filter(Boolean);
    const fromRightItems = (question.rightItems || []).map((r) => r.text).filter(Boolean);
    return Array.from(new Set([...fromPairs, ...fromRightItems]));
  }, [question.matchingPairs, question.rightItems]);

  // Lookup map for ordering items
  const orderingItemMap = useMemo(() => {
    const map = new Map<string, string>();
    const items = question.orderingItems || question.items || [];
    items.forEach((item) => {
      map.set(item.id, item.text);
    });
    return map;
  }, [question.orderingItems, question.items]);

  // Word count evaluation for Writing
  const writingText = answer && answer.type === 'writing' ? answer.text : '';
  const wordCountEval = evaluateWordCount(
    writingText,
    question.writingConfig?.minimumWords,
    question.writingConfig?.maximumWords
  );

  return (
    <div className="bg-[#FCFCFA] rounded-xl sm:rounded-2xl border border-[#DCE4EE] p-3.5 xs:p-4 sm:p-7 shadow-xs space-y-4 sm:space-y-6">
      {/* Question Header: Number, Points & Format Badge */}
      <div className="flex items-center justify-between pb-2.5 sm:pb-3.5 border-b border-[#DCE4EE]/80">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="w-2 h-2 rounded-full bg-[#2563EB] shrink-0" />
          <h2 className="text-xs sm:text-sm font-extrabold text-[#173B72] uppercase tracking-wider">
            Question {questionNumber} of {totalQuestions}
          </h2>
          {normType === 'writing' && question.writingConfig?.writingType && (
            <span className="text-3xs sm:text-2xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
              {question.writingConfig.writingType}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-mono text-2xs sm:text-xs font-bold text-[#173B72] bg-[#EEF5FF] border border-[#DCE4EE] px-2 sm:px-2.5 py-0.5 rounded-full">
            {points} {points === 1 ? 'pt' : 'pts'}
          </span>
        </div>
      </div>

      {/* Writing Instructions Callout if present */}
      {normType === 'writing' && question.writingConfig?.instructions && (
        <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-blue-950 text-xs sm:text-sm space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-blue-900 text-xs uppercase tracking-wide">
            <PenTool className="w-3.5 h-3.5 text-blue-600" />
            <span>Task Instructions</span>
          </div>
          <p className="text-xs leading-relaxed whitespace-pre-wrap">
            {question.writingConfig.instructions}
          </p>
        </div>
      )}

      {/* Question Prompt */}
      <div className="space-y-1">
        <div className="text-base sm:text-lg font-bold text-[#172033] leading-relaxed break-words whitespace-pre-wrap">
          {question.text || <span className="text-slate-400 italic">No question prompt provided</span>}
        </div>
        {(normType === 'multiple_select' || (normType === 'multiple_choice' && question.type === 'multiple-choice')) && (
          <p className="text-2xs text-slate-500 font-medium">
            (Select all that apply)
          </p>
        )}
      </div>

      {/* Question-Specific Audio Player (Module 16) */}
      {question.audioId && (
        <div className="pt-1">
          <StudentAudioPlayer
            key={`q_audio_${question.id}_${question.audioId}`}
            audioId={question.audioId}
            audioMetadata={question.audioMetadata}
            instructions="Audio attachment for this question"
          />
        </div>
      )}

      {/* Answer Controls: Rendered per question type */}
      <div className="pt-2">
        {/* 1. SINGLE CHOICE / MULTIPLE CHOICE (Single Option) */}
        {(normType === 'single_choice' || (normType === 'multiple_choice' && question.type !== 'multiple-choice')) && (
          <div className="space-y-2.5">
            {(question.options || []).map((opt, idx) => {
              const letter = String.fromCharCode(65 + idx);
              const isSelected =
                answer &&
                (answer.type === 'single-choice' || answer.type === 'multiple_choice') &&
                answer.optionId === opt.id;

              return (
                <button
                  key={`opt_single_${question.id}_${opt.id || idx}_${idx}`}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleSelectOptionSingle(opt.id)}
                  className={`w-full text-left p-3.5 sm:p-4 rounded-xl border transition-all flex items-start gap-3.5 select-none group ${
                    disabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
                  } ${
                    isSelected
                      ? 'bg-[#EEF5FF] border-[#2563EB] ring-2 ring-blue-100 shadow-2xs'
                      : 'bg-white border-[#DCE4EE] hover:border-blue-300 hover:bg-[#F7F9FC]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      isSelected
                        ? 'border-[#2563EB] bg-[#2563EB] text-white'
                        : 'border-slate-300 bg-white group-hover:border-slate-400'
                    }`}
                  >
                    {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <span
                      className={`inline-block font-bold text-xs mr-2 ${
                        isSelected ? 'text-[#2563EB]' : 'text-slate-500'
                      }`}
                    >
                      {letter}.
                    </span>
                    <span
                      className={`text-sm break-words ${
                        isSelected ? 'font-semibold text-[#173B72]' : 'text-[#172033]'
                      }`}
                    >
                      {opt.text || <span className="text-slate-400 italic">(Blank Option)</span>}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* 2. MULTIPLE SELECT (Multi Option) */}
        {(normType === 'multiple_select' || (normType === 'multiple_choice' && question.type === 'multiple-choice')) && (
          <div className="space-y-2.5">
            {(question.options || []).map((opt, idx) => {
              const letter = String.fromCharCode(65 + idx);
              const isChecked = Boolean(
                answer &&
                  (answer.type === 'multiple-choice' || answer.type === 'multiple_select') &&
                  answer.optionIds.includes(opt.id)
              );

              return (
                <button
                  key={`opt_multi_${question.id}_${opt.id || idx}_${idx}`}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleToggleOptionMultiple(opt.id)}
                  className={`w-full text-left p-3.5 sm:p-4 rounded-xl border transition-all flex items-start gap-3.5 select-none group ${
                    disabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
                  } ${
                    isChecked
                      ? 'bg-[#EEF5FF] border-[#2563EB] ring-2 ring-blue-100 shadow-2xs'
                      : 'bg-white border-[#DCE4EE] hover:border-blue-300 hover:bg-[#F7F9FC]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      isChecked
                        ? 'border-[#2563EB] bg-[#2563EB] text-white'
                        : 'border-slate-300 bg-white group-hover:border-slate-400'
                    }`}
                  >
                    {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <span
                      className={`inline-block font-bold text-xs mr-2 ${
                        isChecked ? 'text-[#2563EB]' : 'text-slate-500'
                      }`}
                    >
                      {letter}.
                    </span>
                    <span
                      className={`text-sm break-words ${
                        isChecked ? 'font-semibold text-[#173B72]' : 'text-[#172033]'
                      }`}
                    >
                      {opt.text || <span className="text-slate-400 italic">(Blank Option)</span>}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* 3. TRUE / FALSE */}
        {normType === 'true_false' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* True Option */}
            {(() => {
              const isSelected =
                answer &&
                (answer.type === 'true-false' || answer.type === 'true_false') &&
                answer.value === true;

              return (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => handleSelectTrueFalse(true)}
                  className={`p-4 rounded-xl border text-left transition-all flex items-center gap-3 select-none ${
                    disabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
                  } ${
                    isSelected
                      ? 'bg-[#EEF5FF] border-[#2563EB] ring-2 ring-blue-100 shadow-2xs'
                      : 'bg-white border-[#DCE4EE] hover:border-blue-300 hover:bg-[#F7F9FC]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'border-[#2563EB] bg-[#2563EB]'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div>
                    <span className="block text-sm font-bold text-[#173B72]">
                      True
                    </span>
                  </div>
                </button>
              );
            })()}

            {/* False Option */}
            {(() => {
              const isSelected =
                answer &&
                (answer.type === 'true-false' || answer.type === 'true_false') &&
                answer.value === false;

              return (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => handleSelectTrueFalse(false)}
                  className={`p-4 rounded-xl border text-left transition-all flex items-center gap-3 select-none ${
                    disabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
                  } ${
                    isSelected
                      ? 'bg-[#EEF5FF] border-[#2563EB] ring-2 ring-blue-100 shadow-2xs'
                      : 'bg-white border-[#DCE4EE] hover:border-blue-300 hover:bg-[#F7F9FC]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'border-[#2563EB] bg-[#2563EB]'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div>
                    <span className="block text-sm font-bold text-[#173B72]">
                      False
                    </span>
                  </div>
                </button>
              );
            })()}
          </div>
        )}

        {/* 4. SHORT ANSWER */}
        {normType === 'short_answer' && (
          <div className="space-y-2">
            <input
              type="text"
              disabled={disabled}
              placeholder={disabled ? 'Time has expired. Editing is disabled.' : 'Type your answer here...'}
              value={answer && (answer.type === 'short-answer' || answer.type === 'short_answer') ? answer.value : ''}
              onChange={(e) => handleChangeShortAnswer(e.target.value)}
              className={`w-full p-3.5 sm:p-4 text-sm border border-[#DCE4EE] rounded-xl text-[#172033] focus:outline-none shadow-2xs transition-all ${
                disabled
                  ? 'bg-slate-100/80 cursor-not-allowed text-slate-600'
                  : 'bg-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-100 focus:border-[#2563EB]'
              }`}
            />
            <p className="text-3xs text-slate-400">
              Answer will be compared case-insensitively with whitespace trimmed.
            </p>
          </div>
        )}

        {/* 5. FILL IN THE BLANK */}
        {normType === 'fill_blank' && (
          <div className="space-y-3.5">
            <div className="text-xs text-slate-500 font-medium">
              Fill in each blank for this question:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(question.blanks || []).map((blank, bIdx) => {
                const currentVal =
                  answer && answer.type === 'fill_blank' && answer.answers
                    ? answer.answers[blank.id] || ''
                    : '';

                return (
                  <div
                    key={`blank_input_${blank.id}_${bIdx}`}
                    className="p-3 bg-[#F7F9FC] rounded-xl border border-[#DCE4EE] space-y-1.5"
                  >
                    <label
                      htmlFor={`blank-${blank.id}`}
                      className="block text-2xs font-bold text-[#173B72] uppercase tracking-wide"
                    >
                      Blank {bIdx + 1}
                    </label>
                    <input
                      id={`blank-${blank.id}`}
                      type="text"
                      disabled={disabled}
                      value={currentVal}
                      onChange={(e) => handleBlankChange(blank.id, e.target.value)}
                      placeholder={`Enter answer for Blank ${bIdx + 1}`}
                      className={`w-full p-2.5 text-xs border border-[#DCE4EE] rounded-lg text-[#172033] focus:outline-none transition-all ${
                        disabled
                          ? 'bg-slate-100/80 cursor-not-allowed'
                          : 'bg-white focus:ring-2 focus:ring-blue-100 focus:border-[#2563EB]'
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 6. MATCHING */}
        {normType === 'matching' && (
          <div className="space-y-3.5">
            <div className="text-xs text-slate-500 font-medium">
              Match each prompt on the left with the correct option on the right:
            </div>
            <div className="space-y-3">
              {matchingLeftItems.map((item, pIdx) => {
                const currentMatch =
                  answer && answer.type === 'matching' && answer.matches
                    ? answer.matches[item.id] ?? answer.matches[item.left] ?? ''
                    : '';

                return (
                  <div
                    key={`matching_row_${item.id}_${pIdx}`}
                    className={`grid grid-cols-1 sm:grid-cols-12 gap-3 items-center p-3.5 sm:p-4 rounded-xl border transition-all ${
                      currentMatch
                        ? 'bg-[#EEF5FF]/50 border-blue-200'
                        : 'bg-[#F7F9FC] border-[#DCE4EE]'
                    }`}
                  >
                    {/* Left Prompt */}
                    <div className="sm:col-span-5 font-bold text-sm text-[#173B72] break-words">
                      <span className="inline-block text-xs text-slate-400 mr-1.5 font-mono">
                        {pIdx + 1}.
                      </span>
                      {item.left}
                    </div>

                    <div className="hidden sm:flex sm:col-span-1 justify-center text-slate-400">
                      <ArrowRight className="w-4 h-4" />
                    </div>

                    {/* Right Option Selector */}
                    <div className="sm:col-span-6">
                      <select
                        aria-label={`Match for ${item.left}`}
                        disabled={disabled}
                        value={currentMatch}
                        onChange={(e) => handleMatchChange(item.id, e.target.value)}
                        className={`w-full py-3 px-3.5 text-sm sm:text-base border rounded-xl text-[#172033] focus:outline-none transition-all cursor-pointer ${
                          disabled
                            ? 'bg-slate-100/80 cursor-not-allowed border-[#DCE4EE]'
                            : currentMatch
                            ? 'bg-white border-[#2563EB] ring-2 ring-blue-100 font-semibold text-[#173B72]'
                            : 'bg-white border-[#DCE4EE] hover:border-slate-400 focus:ring-2 focus:ring-blue-100 focus:border-[#2563EB]'
                        }`}
                      >
                        <option value="">-- Choose matching item --</option>
                        {matchingRightOptions.map((opt, optIdx) => (
                          <option key={`mopt_${optIdx}`} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 7. ORDERING */}
        {normType === 'ordering' && (
          <div className="space-y-3.5">
            <div className="text-xs text-slate-500 font-medium flex items-center justify-between">
              <span>Arrange items into the correct sequence:</span>
              <span className="text-2xs text-slate-400">
                Use Up / Down controls to reorder
              </span>
            </div>

            <div className="space-y-2.5">
              {currentOrderedIds.map((itemId, idx) => {
                const itemText = orderingItemMap.get(itemId) || itemId;

                return (
                  <div
                    key={`ord_row_${itemId}_${idx}`}
                    className="flex items-center gap-3 p-3 sm:p-3.5 bg-white rounded-xl border border-[#DCE4EE] shadow-2xs hover:border-blue-200 transition-all"
                  >
                    {/* Position Indicator */}
                    <span className="font-mono text-xs font-extrabold text-[#173B72] bg-[#EEF5FF] border border-blue-200 w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>

                    {/* Item Text */}
                    <div className="flex-1 text-sm font-medium text-[#172033] break-words">
                      {itemText}
                    </div>

                    {/* Move Up / Down Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={disabled || idx === 0}
                        onClick={() => handleMoveOrderItem(idx, 'up')}
                        aria-label={`Move ${itemText} up`}
                        title="Move up"
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-[#DCE4EE] bg-[#F7F9FC] hover:bg-blue-50 text-slate-700 hover:text-blue-600 disabled:opacity-25 disabled:cursor-not-allowed transition-all flex items-center justify-center cursor-pointer shadow-2xs active:scale-95"
                      >
                        <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
                      </button>
                      <button
                        type="button"
                        disabled={disabled || idx === currentOrderedIds.length - 1}
                        onClick={() => handleMoveOrderItem(idx, 'down')}
                        aria-label={`Move ${itemText} down`}
                        title="Move down"
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-[#DCE4EE] bg-[#F7F9FC] hover:bg-blue-50 text-slate-700 hover:text-blue-600 disabled:opacity-25 disabled:cursor-not-allowed transition-all flex items-center justify-center cursor-pointer shadow-2xs active:scale-95"
                      >
                        <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 8. ESSAY / LONG ANSWER */}
        {normType === 'essay' && (
          <div className="space-y-3">
            <textarea
              rows={11}
              disabled={disabled}
              placeholder={disabled ? 'Time has expired. Editing is disabled.' : 'Write your essay response here. Use paragraph breaks as needed...'}
              value={answer && answer.type === 'essay' ? answer.text : ''}
              onChange={(e) => handleChangeEssay(e.target.value)}
              className={`w-full min-h-[260px] sm:min-h-[320px] p-4 sm:p-5 text-sm sm:text-base border border-[#DCE4EE] rounded-2xl text-[#172033] focus:outline-none shadow-2xs transition-all leading-relaxed whitespace-pre-wrap font-sans ${
                disabled
                  ? 'bg-slate-100/80 cursor-not-allowed text-slate-600'
                  : 'bg-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-100 focus:border-[#2563EB]'
              }`}
            />
            <div className="flex items-center justify-between text-2xs text-slate-500 px-1">
              <span>Paragraph and line breaks are fully preserved upon submission.</span>
              <span className="font-mono font-bold text-[#173B72]">
                {answer && answer.type === 'essay'
                  ? `${evaluateWordCount(answer.text).count} words`
                  : '0 words'}
              </span>
            </div>
          </div>
        )}

        {/* 9. WRITING TASK */}
        {normType === 'writing' && (
          <div className="space-y-3">
            <textarea
              rows={14}
              disabled={disabled}
              placeholder={
                disabled
                  ? 'Time has expired. Editing is disabled.'
                  : 'Write your composition here. Separate paragraphs with line breaks...'
              }
              value={writingText}
              onChange={(e) => handleChangeWriting(e.target.value)}
              className={`w-full min-h-[320px] sm:min-h-[380px] p-4 sm:p-5 text-sm sm:text-base border border-[#DCE4EE] rounded-2xl text-[#172033] focus:outline-none shadow-2xs transition-all leading-relaxed whitespace-pre-wrap font-sans ${
                disabled
                  ? 'bg-slate-100/80 cursor-not-allowed text-slate-600'
                  : 'bg-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-100 focus:border-[#2563EB]'
              }`}
            />

            {/* Word count toolbar */}
            {question.writingConfig?.showWordCount !== false && (
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-[#F7F9FC] rounded-xl border border-[#DCE4EE] text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700">Word count:</span>
                  <span className="font-mono font-bold text-[#173B72] text-sm tabular-nums">
                    {wordCountEval.count}
                    {wordCountEval.minRequired ? ` / ${wordCountEval.minRequired}` : ''}
                    {wordCountEval.maxAllowed ? ` (Max: ${wordCountEval.maxAllowed})` : ''}
                  </span>
                </div>

                {/* Requirement Badge */}
                {wordCountEval.minRequired !== null && (
                  <div>
                    {wordCountEval.meetsMinimum ? (
                      <span className="inline-flex items-center gap-1 font-bold text-xs text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Minimum met</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-bold text-xs text-amber-700 bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-200">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Minimum not met</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
            <p className="text-3xs text-slate-400 px-1">
              Your formatting, indents, and paragraph structure will remain intact when submitted.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
