/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { OrderingItem } from '../../../types/test';
import { Plus, Trash2, ChevronUp, ChevronDown, ListOrdered } from 'lucide-react';
import { createOptionId } from '../../../utils/id';

interface OrderingEditorProps {
  items: OrderingItem[];
  onChange: (items: OrderingItem[]) => void;
}

export function OrderingEditor({ items, onChange }: OrderingEditorProps) {
  const handleAddItem = () => {
    const newItem: OrderingItem = {
      id: `ord_${createOptionId().slice(-6)}`,
      text: '',
    };
    onChange([...items, newItem]);
  };

  const handleDeleteItem = (index: number) => {
    if (items.length <= 2) return;
    const updated = items.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleTextChange = (index: number, text: string) => {
    const updated = items.map((item, i) => (i === index ? { ...item, text } : item));
    onChange(updated);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const copy = [...items];
    const temp = copy[index - 1];
    copy[index - 1] = copy[index];
    copy[index] = temp;
    onChange(copy);
  };

  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return;
    const copy = [...items];
    const temp = copy[index + 1];
    copy[index + 1] = copy[index];
    copy[index] = temp;
    onChange(copy);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-500 font-medium pb-1 border-b border-[#DCE4EE]">
        <div className="flex items-center gap-1.5">
          <ListOrdered className="w-3.5 h-3.5 text-blue-600" />
          <span>Define the correct target sequence (items will be shuffled for students)</span>
        </div>
        <button
          type="button"
          onClick={handleAddItem}
          className="inline-flex items-center gap-1 text-xs font-bold text-[#2563EB] hover:text-blue-700 bg-[#EEF5FF] px-2.5 py-1 rounded-lg border border-blue-200 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Step</span>
        </button>
      </div>

      <div className="space-y-2">
        {items.map((item, idx) => (
          <div
            key={`ord_${item.id}_${idx}`}
            className="flex items-center gap-2.5 p-2.5 bg-[#F7F9FC] rounded-xl border border-[#DCE4EE]"
          >
            {/* Step badge */}
            <span className="font-mono text-xs font-extrabold text-[#173B72] bg-white border border-[#DCE4EE] w-7 h-7 rounded-lg flex items-center justify-center shrink-0">
              {idx + 1}
            </span>

            {/* Input */}
            <input
              type="text"
              value={item.text}
              onChange={(e) => handleTextChange(idx, e.target.value)}
              placeholder={`Step ${idx + 1} in correct order`}
              className="flex-1 rounded-lg border border-[#DCE4EE] bg-white px-3 py-1.5 text-xs text-[#172033] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
            />

            {/* Move Up/Down Controls */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                disabled={idx === 0}
                onClick={() => handleMoveUp(idx)}
                className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-slate-400"
                title="Move up in order"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={idx === items.length - 1}
                onClick={() => handleMoveDown(idx)}
                className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-slate-400"
                title="Move down in order"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Delete button */}
            {items.length > 2 && (
              <button
                type="button"
                onClick={() => handleDeleteItem(idx)}
                className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                title="Remove step"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
