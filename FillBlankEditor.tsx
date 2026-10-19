/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BlankItem } from '../../../types/test';
import { Plus, Trash2, Tag, AlertCircle } from 'lucide-react';
import { createOptionId } from '../../../utils/id';

interface FillBlankEditorProps {
  blanks: BlankItem[];
  onChange: (blanks: BlankItem[]) => void;
}

export function FillBlankEditor({ blanks, onChange }: FillBlankEditorProps) {
  const handleAddBlank = () => {
    const newBlankNum = blanks.length + 1;
    const newBlank: BlankItem = {
      id: `b${createOptionId().slice(-4)}`,
      acceptedAnswers: [''],
    };
    onChange([...blanks, newBlank]);
  };

  const handleDeleteBlank = (index: number) => {
    if (blanks.length <= 1) return;
    const updated = blanks.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleAddAcceptedAnswer = (blankIndex: number) => {
    const updated = blanks.map((blank, i) => {
      if (i === blankIndex) {
        return {
          ...blank,
          acceptedAnswers: [...blank.acceptedAnswers, ''],
        };
      }
      return blank;
    });
    onChange(updated);
  };

  const handleRemoveAcceptedAnswer = (blankIndex: number, ansIndex: number) => {
    const updated = blanks.map((blank, i) => {
      if (i === blankIndex) {
        if (blank.acceptedAnswers.length <= 1) return blank;
        return {
          ...blank,
          acceptedAnswers: blank.acceptedAnswers.filter((_, aI) => aI !== ansIndex),
        };
      }
      return blank;
    });
    onChange(updated);
  };

  const handleAnswerChange = (
    blankIndex: number,
    ansIndex: number,
    value: string
  ) => {
    const updated = blanks.map((blank, i) => {
      if (i === blankIndex) {
        const nextAns = [...blank.acceptedAnswers];
        nextAns[ansIndex] = value;
        return {
          ...blank,
          acceptedAnswers: nextAns,
        };
      }
      return blank;
    });
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-slate-500 font-medium pb-1 border-b border-[#DCE4EE]">
        <div className="flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-blue-600" />
          <span>Define blanks and accepted answers (case-insensitive & trimmed)</span>
        </div>
        <button
          type="button"
          onClick={handleAddBlank}
          className="inline-flex items-center gap-1 text-xs font-bold text-[#2563EB] hover:text-blue-700 bg-[#EEF5FF] px-2.5 py-1 rounded-lg border border-blue-200 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Blank</span>
        </button>
      </div>

      <div className="space-y-3">
        {blanks.map((blank, bIdx) => (
          <div
            key={`blank_${blank.id}_${bIdx}`}
            className="p-3.5 bg-[#F7F9FC] rounded-xl border border-[#DCE4EE] space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-extrabold text-[#173B72] bg-white border border-[#DCE4EE] px-2 py-0.5 rounded-md">
                  Blank {bIdx + 1}
                </span>
                <span className="text-3xs font-mono text-slate-400">
                  (Placeholder: [blank_{bIdx + 1}])
                </span>
              </div>

              {blanks.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleDeleteBlank(bIdx)}
                  className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                  title="Remove this blank"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Accepted answers for this blank */}
            <div className="space-y-2">
              <span className="text-2xs font-semibold text-slate-600 block">
                Accepted Answers:
              </span>
              <div className="space-y-1.5">
                {blank.acceptedAnswers.map((ans, ansIdx) => (
                  <div key={`ans_${blank.id}_${ansIdx}`} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={ans}
                      onChange={(e) =>
                        handleAnswerChange(bIdx, ansIdx, e.target.value)
                      }
                      placeholder={`e.g. ${bIdx === 0 ? 'goes' : 'on'}`}
                      className="flex-1 rounded-lg border border-[#DCE4EE] bg-white px-3 py-1.5 text-xs text-[#172033] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    />
                    {blank.acceptedAnswers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAcceptedAnswer(bIdx, ansIdx)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Remove variation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleAddAcceptedAnswer(bIdx)}
                className="text-2xs font-bold text-[#2563EB] hover:text-blue-700 flex items-center gap-1 pt-0.5"
              >
                <Plus className="w-3 h-3" />
                <span>Add Accepted Alternative</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
