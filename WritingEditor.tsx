/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { WritingConfig, WritingType } from '../../../types/test';
import { PenTool, Clock, Eye, AlertCircle } from 'lucide-react';

interface WritingEditorProps {
  config: WritingConfig;
  onChange: (config: WritingConfig) => void;
}

const WRITING_TYPES: WritingType[] = [
  'General Writing',
  'Paragraph',
  'Essay',
  'Opinion',
  'Descriptive',
  'Narrative',
  'Email / Letter',
  'Academic Writing',
  'IELTS Writing',
  'TOEFL Writing',
  'Other',
];

export function WritingEditor({ config, onChange }: WritingEditorProps) {
  const handleTypeChange = (type: WritingType) => {
    onChange({ ...config, writingType: type });
  };

  const handleInstructionsChange = (instructions: string) => {
    onChange({ ...config, instructions });
  };

  const handleMinWordsChange = (valStr: string) => {
    const val = parseInt(valStr, 10);
    onChange({ ...config, minimumWords: isNaN(val) || val <= 0 ? null : val });
  };

  const handleMaxWordsChange = (valStr: string) => {
    const val = parseInt(valStr, 10);
    onChange({ ...config, maximumWords: isNaN(val) || val <= 0 ? null : val });
  };

  const handleToggleShowWordCount = () => {
    onChange({ ...config, showWordCount: config.showWordCount === false ? true : false });
  };

  return (
    <div className="space-y-4 bg-[#F7F9FC] rounded-xl border border-[#DCE4EE] p-4 text-xs">
      <div className="flex items-center justify-between border-b border-[#DCE4EE] pb-2.5">
        <div className="flex items-center gap-2 text-slate-700 font-bold">
          <PenTool className="w-4 h-4 text-orange-500" />
          <span>Structured Writing Task Configuration</span>
        </div>
        <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
          Module 13 Writing
        </span>
      </div>

      {/* Writing Instructions */}
      <div>
        <label
          htmlFor="writing-instructions"
          className="text-2xs font-bold uppercase tracking-wider text-slate-500 block mb-1"
        >
          Writing Instructions (Displayed above student response area)
        </label>
        <textarea
          id="writing-instructions"
          rows={2}
          value={config.instructions || ''}
          onChange={(e) => handleInstructionsChange(e.target.value)}
          placeholder="e.g. Write at least 250 words. Give reasons and examples to support your ideas."
          className="w-full bg-white border border-[#DCE4EE] p-2.5 rounded-lg text-[#172033] placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
        />
      </div>

      {/* Writing Type & Word Count Limits */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Writing Type Selector */}
        <div>
          <label
            htmlFor="writing-type-select"
            className="text-2xs font-bold uppercase tracking-wider text-slate-500 block mb-1"
          >
            Writing Task Type
          </label>
          <select
            id="writing-type-select"
            value={config.writingType || 'General Writing'}
            onChange={(e) => handleTypeChange(e.target.value as WritingType)}
            className="w-full bg-white border border-[#DCE4EE] px-3 py-2 rounded-lg text-slate-700 font-medium focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
          >
            {WRITING_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Minimum Word Count */}
        <div>
          <label
            htmlFor="writing-min-words"
            className="text-2xs font-bold uppercase tracking-wider text-slate-500 block mb-1"
          >
            Minimum Words (Optional)
          </label>
          <input
            id="writing-min-words"
            type="number"
            min="1"
            value={config.minimumWords || ''}
            onChange={(e) => handleMinWordsChange(e.target.value)}
            placeholder="e.g. 250"
            className="w-full bg-white border border-[#DCE4EE] px-3 py-2 rounded-lg text-[#172033] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
          />
        </div>

        {/* Maximum Word Count */}
        <div>
          <label
            htmlFor="writing-max-words"
            className="text-2xs font-bold uppercase tracking-wider text-slate-500 block mb-1"
          >
            Maximum Words (Optional)
          </label>
          <input
            id="writing-max-words"
            type="number"
            min="1"
            value={config.maximumWords || ''}
            onChange={(e) => handleMaxWordsChange(e.target.value)}
            placeholder="e.g. 350"
            className="w-full bg-white border border-[#DCE4EE] px-3 py-2 rounded-lg text-[#172033] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
          />
        </div>
      </div>

      {/* Show Live Word Count Toggle */}
      <div className="flex items-center justify-between pt-1">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={config.showWordCount !== false}
            onChange={handleToggleShowWordCount}
            className="w-4 h-4 rounded text-[#2563EB] focus:ring-blue-500 border-slate-300"
          />
          <span className="text-xs font-semibold text-slate-700">
            Show live word count counter to student
          </span>
        </label>
      </div>

      {/* Manual Review Callout */}
      <div className="flex items-start gap-2 bg-amber-50/80 border border-amber-200/90 rounded-lg p-3 text-amber-900 text-2xs leading-relaxed">
        <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Manual Evaluation Notice:</span> Writing assessments are preserved in full paragraph structure and marked as <span className="font-semibold underline">Pending Review</span> for teacher evaluation. No AI evaluation is performed.
        </div>
      </div>
    </div>
  );
}
