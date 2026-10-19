/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { FileText, AlertCircle, Clock } from 'lucide-react';

interface EssayEditorProps {
  maxWords?: number | null;
  onChangeMaxWords: (maxWords: number | null) => void;
}

export function EssayEditor({ maxWords, onChangeMaxWords }: EssayEditorProps) {
  return (
    <div className="space-y-3.5 bg-[#F7F9FC] rounded-xl border border-[#DCE4EE] p-4 text-xs">
      <div className="flex items-center gap-2 text-slate-700 font-bold border-b border-[#DCE4EE] pb-2">
        <FileText className="w-4 h-4 text-blue-600" />
        <span>Essay / Long Answer Configuration</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-2xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Response Type
          </label>
          <div className="bg-white border border-[#DCE4EE] px-3 py-2 rounded-lg text-slate-700 font-medium">
            Open Long-Form Essay
          </div>
        </div>

        <div>
          <label
            htmlFor="essay-max-words"
            className="text-2xs font-bold uppercase tracking-wider text-slate-500 block mb-1"
          >
            Maximum Word Count (Optional)
          </label>
          <input
            id="essay-max-words"
            type="number"
            min="1"
            value={maxWords || ''}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              onChangeMaxWords(isNaN(val) || val <= 0 ? null : val);
            }}
            placeholder="Unlimited words if blank"
            className="w-full bg-white border border-[#DCE4EE] px-3 py-2 rounded-lg text-[#172033] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
          />
        </div>
      </div>

      {/* Manual Grading Notice */}
      <div className="flex items-start gap-2 bg-amber-50/80 border border-amber-200/90 rounded-lg p-3 text-amber-900 text-2xs leading-relaxed">
        <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Manual Grading Requirement:</span> Essay questions are evaluated by the teacher and are not automatically graded. Submissions will be marked as <span className="font-semibold underline">Pending Review</span> until evaluated.
        </div>
      </div>
    </div>
  );
}
