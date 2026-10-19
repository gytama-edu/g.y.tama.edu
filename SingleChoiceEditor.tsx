/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AnswerOption } from '../../../types/test';
import { createOptionId } from '../../../utils/id';
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';

interface SingleChoiceEditorProps {
  options: AnswerOption[];
  questionId: string;
  onChange: (options: AnswerOption[]) => void;
  hasErrors?: boolean;
}

export function SingleChoiceEditor({
  options,
  questionId,
  onChange,
}: SingleChoiceEditorProps) {
  const getLetter = (index: number) => String.fromCharCode(65 + index);

  const handleSelectCorrect = (optionId: string) => {
    const updated = options.map((opt) => ({
      ...opt,
      isCorrect: opt.id === optionId,
    }));
    onChange(updated);
  };

  const handleTextChange = (optionId: string, text: string) => {
    const updated = options.map((opt) =>
      opt.id === optionId ? { ...opt, text } : opt
    );
    onChange(updated);
  };

  const handleAddOption = () => {
    if (options.length >= 10) return;
    const newOption: AnswerOption = {
      id: createOptionId(),
      text: '',
      isCorrect: options.length === 0, // if no options exist, make it correct
    };
    onChange([...options, newOption]);
  };

  const handleDeleteOption = (optionId: string) => {
    if (options.length <= 2) return;
    const deletingWasCorrect = options.find((o) => o.id === optionId)?.isCorrect;
    const filtered = options.filter((opt) => opt.id !== optionId);

    // If the deleted option was correct, set the first remaining option as correct
    if (deletingWasCorrect && filtered.length > 0) {
      filtered[0].isCorrect = true;
    }

    onChange(filtered);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
        <span>Answer options (select the radio button to set the correct answer)</span>
        <span className="font-mono tabular-nums">{options.length}/10 options</span>
      </div>

      <div className="space-y-2.5">
        {options.map((opt, index) => {
          const letter = getLetter(index);
          const isCorrect = opt.isCorrect;

          return (
            <div
              key={opt.id}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                isCorrect
                  ? 'border-[#F97316] bg-[#FFF4E8] shadow-2xs'
                  : 'border-[#DCE4EE] bg-[#F7F9FC] hover:border-slate-300 hover:bg-[#F1F5F9]/60'
              }`}
            >
              {/* Radio button for correct answer */}
              <label
                htmlFor={`sc-correct-${questionId}-${opt.id}`}
                className="flex items-center gap-2 cursor-pointer select-none"
                title="Mark as correct answer"
              >
                <input
                  type="radio"
                  id={`sc-correct-${questionId}-${opt.id}`}
                  name={`correct-answer-${questionId}`}
                  checked={isCorrect}
                  onChange={() => handleSelectCorrect(opt.id)}
                  className="w-4 h-4 text-orange-500 focus:ring-orange-500 focus:ring-offset-1 border-slate-300 cursor-pointer"
                />
                <span className={`w-6 h-6 flex items-center justify-center rounded-lg text-xs font-bold ${
                  isCorrect ? 'bg-orange-200/80 text-orange-900' : 'bg-white border border-[#DCE4EE] text-slate-700'
                }`}>
                  {letter}
                </span>
              </label>

              {/* Option text input */}
              <div className="flex-1">
                <input
                  type="text"
                  value={opt.text}
                  onChange={(e) => handleTextChange(opt.id, e.target.value)}
                  placeholder={`Option ${letter} text...`}
                  aria-label={`Option ${letter} text`}
                  className="w-full bg-transparent text-sm text-[#172033] placeholder:text-slate-400 focus:outline-none font-medium"
                />
              </div>

              {/* Correct indicator tag for author */}
              {isCorrect && (
                <div className="flex items-center gap-1 text-xs font-bold text-orange-900 bg-orange-100/90 px-2 py-0.5 rounded-md">
                  <CheckCircle2 className="w-3.5 h-3.5 text-orange-600" />
                  <span>Correct</span>
                </div>
              )}

              {/* Delete option */}
              <button
                type="button"
                onClick={() => handleDeleteOption(opt.id)}
                disabled={options.length <= 2}
                title={
                  options.length <= 2
                    ? 'Minimum 2 options required'
                    : 'Remove option'
                }
                className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded-lg cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {options.length < 10 && (
        <button
          type="button"
          onClick={handleAddOption}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50/70 hover:bg-orange-100/80 border border-orange-200/80 px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add answer option</span>
        </button>
      )}
    </div>
  );
}
