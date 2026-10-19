/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { ValidationError } from '../../types/test';
import { Category, DEFAULT_CATEGORY_ID } from '../../types/category';
import { AudioMetadata } from '../../types/audio';
import { createCategory } from '../../utils/categoryStorage';
import { Tag, Plus, Check, AlertCircle } from 'lucide-react';

interface TestInformationProps {
  title: string;
  description: string;
  categoryId?: string;
  categories: Category[];
  totalQuestions: number;
  totalPoints: number;
  errors: ValidationError[];
  audioId?: string;
  audioMetadata?: AudioMetadata;
  onChangeTitle: (title: string) => void;
  onChangeDescription: (desc: string) => void;
  onChangeCategory: (categoryId: string) => void;
  onChangeAudio?: (audioId: string | undefined, metadata: AudioMetadata | undefined) => void;
  onCategoriesUpdated?: () => void;
}

export function TestInformation({
  title,
  description,
  categoryId = DEFAULT_CATEGORY_ID,
  categories,
  totalQuestions,
  totalPoints,
  errors,
  audioId,
  audioMetadata,
  onChangeTitle,
  onChangeDescription,
  onChangeCategory,
  onChangeAudio,
  onCategoriesUpdated,
}: TestInformationProps) {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickError, setQuickError] = useState<string | null>(null);

  const titleError = errors.find((e) => e.field === 'title')?.message;
  const descError = errors.find((e) => e.field === 'description')?.message;
  const questionsError = errors.find((e) => e.field === 'questions')?.message;

  const selectedCategory =
    categories.find((c) => c.id === categoryId) ||
    categories.find((c) => c.id === DEFAULT_CATEGORY_ID);

  const handleCreateQuickCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setQuickError(null);
    const res = createCategory({ name: quickName });
    if (!res.success) {
      setQuickError(res.error || 'Failed to create category');
      return;
    }
    if (res.category) {
      onChangeCategory(res.category.id);
      onCategoriesUpdated?.();
    }
    setQuickName('');
    setShowQuickAdd(false);
  };

  return (
    <div className="bg-[#FCFCFA] rounded-2xl border border-[#DCE4EE] shadow-xs p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#DCE4EE]/70 gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-1.5 h-6 rounded-full bg-orange-500 mt-0.5 shrink-0" />
          <div>
            <h2 className="text-base font-extrabold text-[#173B72] uppercase tracking-wide">
              Create Your Test
            </h2>
            <p className="text-xs text-slate-500">
              Build an assessment for your students with clear instructions and questions.
            </p>
          </div>
        </div>

        {/* Live Metrics Display */}
        <div className="flex items-center gap-3.5 text-xs font-medium text-slate-600 bg-[#EEF5FF] px-4 py-2 rounded-xl border border-[#DCE4EE]/80">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">Questions:</span>
            <span className="font-mono font-bold text-[#173B72] tabular-nums">
              {totalQuestions}
            </span>
          </div>
          <span className="text-blue-300">·</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">Total Points:</span>
            <span className="font-mono font-bold text-orange-600 tabular-nums">
              {totalPoints}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-1">
        {/* Title Input & Category Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Test Title"
              required
              maxLength={150}
              value={title}
              onChange={(e) => onChangeTitle(e.target.value)}
              placeholder="e.g. Upper-Intermediate Final Examination"
              error={titleError}
              helperText="3 to 150 characters. Visible to students during examination."
            />
          </div>

          {/* Category Dropdown */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="test-category-select"
                className="block text-xs font-bold text-[#173B72] tracking-wide"
              >
                Category *
              </label>
              {!showQuickAdd && (
                <button
                  type="button"
                  onClick={() => setShowQuickAdd(true)}
                  className="text-2xs font-semibold text-[#2563EB] hover:text-blue-800 flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" />
                  <span>New</span>
                </button>
              )}
            </div>

            {showQuickAdd ? (
              <form onSubmit={handleCreateQuickCategory} className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    required
                    maxLength={40}
                    value={quickName}
                    onChange={(e) => setQuickName(e.target.value)}
                    placeholder="New category..."
                    className="w-full px-2.5 py-1.5 text-xs bg-[#F7F9FC] border border-blue-300 rounded-lg focus:outline-none focus:bg-white"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="p-1.5 bg-[#2563EB] text-white rounded-lg hover:bg-blue-700 shrink-0"
                    title="Save Category"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowQuickAdd(false);
                      setQuickError(null);
                    }}
                    className="text-2xs text-slate-400 hover:text-slate-600 px-1"
                  >
                    ✕
                  </button>
                </div>
                {quickError && (
                  <p className="text-3xs text-rose-600">{quickError}</p>
                )}
              </form>
            ) : (
              <div className="relative">
                <select
                  id="test-category-select"
                  value={categoryId || DEFAULT_CATEGORY_ID}
                  onChange={(e) => onChangeCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-[#F7F9FC] border border-[#DCE4EE] rounded-xl text-[#172033] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15 focus:border-[#2563EB] shadow-2xs appearance-none cursor-pointer transition-all pr-8"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                  <Tag className="w-3.5 h-3.5" />
                </div>
              </div>
            )}
            <p className="mt-1 text-2xs text-slate-500">
              {selectedCategory?.description || 'Organize and group related tests.'}
            </p>
          </div>
        </div>

        {/* Description / Instructions */}
        <div>
          <Textarea
            label="Description & Instructions"
            rows={3}
            maxLength={1000}
            showCharCount
            value={description}
            onChange={(e) => onChangeDescription(e.target.value)}
            placeholder="Add instructions or a short description for this test..."
            error={descError}
            helperText="Optional guidelines, timing expectations, or notes for test-takers."
          />
        </div>

        {/* Global Questions Error (if 0 questions) */}
        {questionsError && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{questionsError}</span>
          </div>
        )}
      </div>
    </div>
  );
}
