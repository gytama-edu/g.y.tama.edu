/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MatchingPair } from '../../../types/test';
import { Plus, Trash2, ArrowRight } from 'lucide-react';
import { createOptionId } from '../../../utils/id';

interface MatchingEditorProps {
  pairs: MatchingPair[];
  onChange: (pairs: MatchingPair[]) => void;
}

export function MatchingEditor({ pairs, onChange }: MatchingEditorProps) {
  const handleAddPair = () => {
    const newPair: MatchingPair = {
      id: `p_${createOptionId().slice(-6)}`,
      left: '',
      right: '',
    };
    onChange([...pairs, newPair]);
  };

  const handleDeletePair = (index: number) => {
    if (pairs.length <= 2) return;
    const updated = pairs.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handlePairChange = (index: number, field: 'left' | 'right', value: string) => {
    const updated = pairs.map((pair, i) => {
      if (i === index) {
        return { ...pair, [field]: value };
      }
      return pair;
    });
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-500 font-medium pb-1 border-b border-[#DCE4EE]">
        <span>Define matching item pairs (Left Item → Correct Match)</span>
        <button
          type="button"
          onClick={handleAddPair}
          className="inline-flex items-center gap-1 text-xs font-bold text-[#2563EB] hover:text-blue-700 bg-[#EEF5FF] px-2.5 py-1 rounded-lg border border-blue-200 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Pair</span>
        </button>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-12 gap-2 text-2xs font-extrabold uppercase tracking-wider text-slate-500 px-1">
        <div className="col-span-5">Left Item (Prompt)</div>
        <div className="col-span-1 text-center"></div>
        <div className="col-span-5">Right Item (Correct Match)</div>
        <div className="col-span-1 text-right">Action</div>
      </div>

      <div className="space-y-2.5">
        {pairs.map((pair, idx) => (
          <div
            key={`pair_${pair.id}_${idx}`}
            className="grid grid-cols-12 gap-2 items-center p-2.5 bg-[#F7F9FC] rounded-xl border border-[#DCE4EE]"
          >
            <div className="col-span-5">
              <input
                type="text"
                value={pair.left}
                onChange={(e) => handlePairChange(idx, 'left', e.target.value)}
                placeholder={`Left item ${idx + 1} (e.g. Huge)`}
                className="w-full rounded-lg border border-[#DCE4EE] bg-white px-3 py-1.5 text-xs text-[#172033] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              />
            </div>

            <div className="col-span-1 flex justify-center text-slate-400">
              <ArrowRight className="w-3.5 h-3.5" />
            </div>

            <div className="col-span-5">
              <input
                type="text"
                value={pair.right}
                onChange={(e) => handlePairChange(idx, 'right', e.target.value)}
                placeholder={`Correct match ${idx + 1} (e.g. Very large)`}
                className="w-full rounded-lg border border-[#DCE4EE] bg-white px-3 py-1.5 text-xs text-[#172033] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              />
            </div>

            <div className="col-span-1 flex justify-end">
              {pairs.length > 2 && (
                <button
                  type="button"
                  onClick={() => handleDeletePair(idx)}
                  className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                  title="Remove this pair"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
