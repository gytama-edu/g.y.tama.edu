/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AnswerOption } from '../../../types/test';
import { CheckCircle2 } from 'lucide-react';

interface TrueFalseEditorProps {
  options: AnswerOption[];
  questionId: string;
  onChange: (options: AnswerOption[]) => void;
}

export function TrueFalseEditor({
  options,
  questionId,
  onChange,
}: TrueFalseEditorProps) {
  // Ensure True and False options exist
  const trueOption = options.find((o) => o.text.toLowerCase() === 'true') || {
    id: 'tf_true',
    text: 'True',
    isCorrect: true,
  };
  const falseOption = options.find((o) => o.text.toLowerCase() === 'false') || {
    id: 'tf_false',
    text: 'False',
    isCorrect: false,
  };

  const handleSelect = (isTrueCorrect: boolean) => {
    onChange([
      { ...trueOption, text: 'True', isCorrect: isTrueCorrect },
      { ...falseOption, text: 'False', isCorrect: !isTrueCorrect },
    ]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
        <span>Select the correct statement truth value</span>
        <span>Fixed choices</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* True Option */}
        <label
          htmlFor={`tf-true-${questionId}`}
          className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
            trueOption.isCorrect
              ? 'border-[#F97316] bg-[#FFF4E8] shadow-2xs'
              : 'border-[#DCE4EE] bg-[#F7F9FC] hover:border-slate-300 hover:bg-[#F1F5F9]/60'
          }`}
        >
          <div className="flex items-center gap-3">
            <input
              type="radio"
              id={`tf-true-${questionId}`}
              name={`tf-answer-${questionId}`}
              checked={trueOption.isCorrect}
              onChange={() => handleSelect(true)}
              className="w-4 h-4 text-orange-500 focus:ring-orange-500 border-slate-300 cursor-pointer"
            />
            <span className="text-sm font-bold text-[#172033]">True</span>
          </div>
          {trueOption.isCorrect && (
            <div className="flex items-center gap-1 text-xs font-bold text-orange-900 bg-orange-100/90 px-2 py-0.5 rounded-md">
              <CheckCircle2 className="w-3.5 h-3.5 text-orange-600" />
              <span>Correct</span>
            </div>
          )}
        </label>

        {/* False Option */}
        <label
          htmlFor={`tf-false-${questionId}`}
          className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
            falseOption.isCorrect
              ? 'border-[#F97316] bg-[#FFF4E8] shadow-2xs'
              : 'border-[#DCE4EE] bg-[#F7F9FC] hover:border-slate-300 hover:bg-[#F1F5F9]/60'
          }`}
        >
          <div className="flex items-center gap-3">
            <input
              type="radio"
              id={`tf-false-${questionId}`}
              name={`tf-answer-${questionId}`}
              checked={falseOption.isCorrect}
              onChange={() => handleSelect(false)}
              className="w-4 h-4 text-orange-500 focus:ring-orange-500 border-slate-300 cursor-pointer"
            />
            <span className="text-sm font-bold text-[#172033]">False</span>
          </div>
          {falseOption.isCorrect && (
            <div className="flex items-center gap-1 text-xs font-bold text-orange-900 bg-orange-100/90 px-2 py-0.5 rounded-md">
              <CheckCircle2 className="w-3.5 h-3.5 text-orange-600" />
              <span>Correct</span>
            </div>
          )}
        </label>
      </div>
    </div>
  );
}
