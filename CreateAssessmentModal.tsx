/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Category, DEFAULT_CATEGORY_ID } from '../../types/category';
import { Button } from '../ui/Button';
import { X, FileText, FolderOpen } from 'lucide-react';

interface CreateAssessmentModalProps {
  isOpen: boolean;
  categories: Category[];
  initialCategoryId?: string;
  onClose: () => void;
  onCreate: (data: { title: string; categoryId: string; description: string }) => void;
}

export function CreateAssessmentModal({
  isOpen,
  categories,
  initialCategoryId,
  onClose,
  onCreate,
}: CreateAssessmentModalProps) {
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState<string>(
    initialCategoryId || DEFAULT_CATEGORY_ID
  );
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setError(null);
      // Preselect contextual category or first available
      if (initialCategoryId && categories.some((c) => c.id === initialCategoryId)) {
        setCategoryId(initialCategoryId);
      } else {
        const defaultCat =
          categories.find((c) => c.id === 'cat_general') ||
          categories.find((c) => c.id !== DEFAULT_CATEGORY_ID) ||
          categories[0];
        setCategoryId(defaultCat?.id || DEFAULT_CATEGORY_ID);
      }

      const timer = setTimeout(() => {
        titleInputRef.current?.focus();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialCategoryId, categories]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError('Assessment title is required.');
      titleInputRef.current?.focus();
      return;
    }

    const chosenCat = categoryId || DEFAULT_CATEGORY_ID;
    onCreate({
      title: cleanTitle,
      categoryId: chosenCat,
      description: description.trim(),
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-assessment-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-[#FCFCFA] rounded-2xl border border-[#DCE4EE] shadow-2xl max-w-lg w-full flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#DCE4EE] flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center shadow-2xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="create-assessment-modal-title"
                className="text-base font-extrabold text-[#173B72]"
              >
                Create Assessment
              </h2>
              <p className="text-xs text-slate-500">
                Set up a new examination and organize it by category.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          {/* Assessment Title */}
          <div>
            <label
              htmlFor="assessment-title-input"
              className="block text-xs font-bold text-slate-700 mb-1"
            >
              Title <span className="text-rose-500">*</span>
            </label>
            <input
              ref={titleInputRef}
              id="assessment-title-input"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. TOEFL Structure Questions, IELTS Academic Reading"
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#DCE4EE] rounded-xl text-[#172033] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15 focus:border-[#2563EB] shadow-2xs transition-all"
            />
          </div>

          {/* Category Selector */}
          <div>
            <label
              htmlFor="assessment-category-select"
              className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between"
            >
              <span>Category</span>
              <span className="text-2xs font-normal text-slate-400">
                Organizational category
              </span>
            </label>
            <div className="relative">
              <select
                id="assessment-category-select"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full pl-3.5 pr-8 py-2 text-sm bg-white border border-[#DCE4EE] rounded-xl text-[#172033] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15 focus:border-[#2563EB] shadow-2xs transition-all cursor-pointer appearance-none"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                <svg
                  className="w-4 h-4 fill-current"
                  viewBox="0 0 20 20"
                >
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Assessment Description */}
          <div>
            <label
              htmlFor="assessment-desc-input"
              className="block text-xs font-bold text-slate-700 mb-1"
            >
              Description <span className="text-2xs font-normal text-slate-400">(Optional)</span>
            </label>
            <textarea
              id="assessment-desc-input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Instructions or brief notes for students..."
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#DCE4EE] rounded-xl text-[#172033] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15 focus:border-[#2563EB] shadow-2xs transition-all resize-none"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <Button variant="outline" size="md" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit">
              Create Assessment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
