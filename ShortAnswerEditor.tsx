/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plus, Trash2, HelpCircle } from 'lucide-react';

interface ShortAnswerEditorProps {
  acceptedAnswers: string[];
  onChange: (answers: string[]) => void;
  hasErrors?: boolean;
}

export function ShortAnswerEditor({
  acceptedAnswers = [],
  onChange,
}: ShortAnswerEditorProps) {
  const [newAnswerText, setNewAnswerText] = useState('');

  const handleUpdateAnswer = (index: number, text: string) => {
    const updated = [...acceptedAnswers];
    updated[index] = text;
    onChange(updated);
  };

  const handleAddAnswer = () => {
    if (newAnswerText.trim()) {
      onChange([...acceptedAnswers, newAnswerText.trim()]);
      setNewAnswerText('');
    } else {
      // Add empty slot for user to type in
      onChange([...acceptedAnswers, '']);
    }
  };

  const handleDeleteAnswer = (index: number) => {
    if (acceptedAnswers.length <= 1) {
      // Keep at least one slot empty
      onChange(['']);
      return;
    }
    const updated = acceptedAnswers.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
        <span>Accepted correct answers (enter all valid variations)</span>
        <span className="font-mono tabular-nums">{acceptedAnswers.length} defined</span>
      </div>

      <div className="space-y-2.5">
        {acceptedAnswers.map((answer, index) => (
          <div
            key={`sa_ans_${index}`}
            className="flex items-center gap-2.5 p-2.5 rounded-xl border border-[#DCE4EE] bg-[#F7F9FC] hover:border-slate-300 transition-colors shadow-2xs"
          >
            <span className="w-6 h-6 flex items-center justify-center rounded-lg bg-[#EEF5FF] text-xs font-bold text-[#173B72] font-mono tabular-nums">
              {index + 1}
            </span>
            <input
              type="text"
              value={answer}
              onChange={(e) => handleUpdateAnswer(index, e.target.value)}
              placeholder="e.g. went, colour, color"
              className="flex-1 bg-transparent text-sm text-[#172033] placeholder:text-slate-400 focus:outline-none font-medium"
            />
            <button
              type="button"
              onClick={() => handleDeleteAnswer(index)}
              title="Remove accepted answer"
              className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded-lg cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
        <button
          type="button"
          onClick={handleAddAnswer}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50/70 hover:bg-orange-100/80 border border-orange-200/80 px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-2xs w-fit"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add accepted answer</span>
        </button>

        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <HelpCircle className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span>Student answers match case-insensitively.</span>
        </div>
      </div>
    </div>
  );
}
