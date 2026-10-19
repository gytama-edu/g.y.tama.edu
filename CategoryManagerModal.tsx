/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Category, DEFAULT_CATEGORY_ID } from '../../types/category';
import { Test } from '../../types/test';
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from '../../utils/categoryStorage';
import { Button } from '../ui/Button';
import { ConfirmModal } from '../ui/ConfirmModal';
import {
  X,
  Plus,
  Tag,
  Edit2,
  Trash2,
  Check,
  AlertCircle,
  FolderOpen,
} from 'lucide-react';

interface CategoryManagerModalProps {
  isOpen: boolean;
  categories: Category[];
  tests: Test[];
  onClose: () => void;
  onCategoriesChanged: () => void;
  onSelectCategoryFilter?: (categoryId: string) => void;
}

const COLOR_OPTIONS: Array<{ key: Category['color']; label: string; bg: string }> = [
  { key: 'blue', label: 'Blue', bg: 'bg-blue-500' },
  { key: 'emerald', label: 'Emerald', bg: 'bg-emerald-500' },
  { key: 'purple', label: 'Purple', bg: 'bg-purple-500' },
  { key: 'amber', label: 'Amber', bg: 'bg-amber-500' },
  { key: 'rose', label: 'Rose', bg: 'bg-rose-500' },
  { key: 'indigo', label: 'Indigo', bg: 'bg-indigo-500' },
  { key: 'slate', label: 'Slate', bg: 'bg-slate-500' },
];

export function CategoryManagerModal({
  isOpen,
  categories,
  tests,
  onClose,
  onCategoriesChanged,
  onSelectCategoryFilter,
}: CategoryManagerModalProps) {
  // New category form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newColor, setNewColor] = useState<Category['color']>('blue');
  const [formError, setFormError] = useState<string | null>(null);

  // Edit category state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editColor, setEditColor] = useState<Category['color']>('blue');
  const [editError, setEditError] = useState<string | null>(null);

  // Delete confirmation
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [replacementCategoryId, setReplacementCategoryId] = useState<string>('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Count tests per category
  const testCountByCat = new Map<string, number>();
  tests.forEach((t) => {
    const catId = t.categoryId || DEFAULT_CATEGORY_ID;
    testCountByCat.set(catId, (testCountByCat.get(catId) || 0) + 1);
  });

  const handleStartDelete = (cat: Category) => {
    if (cat.id === DEFAULT_CATEGORY_ID) return;
    setDeletingCategory(cat);
    setDeleteError(null);
    const otherCats = categories.filter((c) => c.id !== cat.id);
    const defaultReplacement =
      otherCats.find((c) => c.id === DEFAULT_CATEGORY_ID) ||
      otherCats.find((c) => c.id === 'cat_general') ||
      otherCats[0];
    setReplacementCategoryId(defaultReplacement?.id || '');
  };

  const handleConfirmDelete = () => {
    if (!deletingCategory) return;
    setDeleteError(null);
    const count = testCountByCat.get(deletingCategory.id) || 0;
    const res = deleteCategory(
      deletingCategory.id,
      count > 0 ? replacementCategoryId : undefined
    );
    if (!res.success) {
      setDeleteError(res.error || 'Failed to delete category');
      return;
    }
    setDeletingCategory(null);
    onCategoriesChanged();
  };

  const handleStartAdd = () => {
    setShowAddForm(true);
    setEditingId(null);
    setNewName('');
    setNewDesc('');
    setNewColor('blue');
    setFormError(null);
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const res = createCategory({
      name: newName,
      description: newDesc,
      color: newColor,
    });
    if (!res.success) {
      setFormError(res.error || 'Failed to create category');
      return;
    }
    setNewName('');
    setNewDesc('');
    setShowAddForm(false);
    onCategoriesChanged();
  };

  const handleStartEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditDesc(cat.description || '');
    setEditColor(cat.color || 'slate');
    setEditError(null);
    setShowAddForm(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setEditError(null);
    const res = updateCategory(editingId, {
      name: editName,
      description: editDesc,
      color: editColor,
    });
    if (!res.success) {
      setEditError(res.error || 'Failed to update category');
      return;
    }
    setEditingId(null);
    onCategoriesChanged();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-[#FCFCFA] rounded-2xl border border-[#DCE4EE] shadow-2xl max-w-xl w-full flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#DCE4EE] flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#EEF5FF] text-[#2563EB] border border-blue-200 flex items-center justify-center">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#173B72]">
                Manage Test Categories
              </h2>
              <p className="text-xs text-slate-500">
                Organize and categorize your assessments.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Top Actions: Add New Button */}
          {!showAddForm && (
            <div className="flex justify-between items-center bg-[#F7F9FC] p-3 rounded-xl border border-[#DCE4EE]">
              <div>
                <span className="text-xs font-bold text-[#173B72] block">
                  {categories.length} Categories Configured
                </span>
                <span className="text-2xs text-slate-500">
                  Each test belongs to exactly one category.
                </span>
              </div>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={handleStartAdd}
              >
                New Category
              </Button>
            </div>
          )}

          {/* Add Category Form */}
          {showAddForm && (
            <form
              onSubmit={handleSaveNew}
              className="bg-[#F0F5FF] rounded-xl border border-blue-200 p-4 space-y-3.5 animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-[#173B72] flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-[#2563EB]" />
                  Add New Category
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-2xs text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
              </div>

              {formError && (
                <div className="flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2 rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  maxLength={50}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. TOEFL, IELTS, Placement Tests, English"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#DCE4EE] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  maxLength={150}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Brief summary of tests in this category..."
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#DCE4EE] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Badge Color
                </label>
                <div className="flex items-center gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setNewColor(c.key)}
                      className={`w-6 h-6 rounded-full ${c.bg} transition-all flex items-center justify-center text-white ${
                        newColor === c.key ? 'ring-2 ring-offset-2 ring-[#173B72] scale-110' : 'opacity-70 hover:opacity-100'
                      }`}
                      title={c.label}
                    >
                      {newColor === c.key && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-1 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Create Category
                </Button>
              </div>
            </form>
          )}

          {/* Categories List */}
          <div className="space-y-2.5">
            {categories.map((cat) => {
              const count = testCountByCat.get(cat.id) || 0;
              const isDefault = cat.id === DEFAULT_CATEGORY_ID;
              const isEditing = editingId === cat.id;

              if (isEditing) {
                return (
                  <form
                    key={cat.id}
                    onSubmit={handleSaveEdit}
                    className="p-3.5 rounded-xl border border-blue-300 bg-[#F0F5FF] space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#173B72]">
                        Editing &quot;{cat.name}&quot;
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="text-2xs text-slate-500 hover:text-slate-700"
                      >
                        Cancel
                      </button>
                    </div>

                    {editError && (
                      <div className="flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2 rounded-lg">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{editError}</span>
                      </div>
                    )}

                    <div>
                      <input
                        type="text"
                        required
                        maxLength={50}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-[#DCE4EE] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                        autoFocus
                      />
                    </div>

                    <div>
                      <input
                        type="text"
                        maxLength={150}
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        placeholder="Description..."
                        className="w-full px-3 py-1.5 text-xs bg-white border border-[#DCE4EE] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5">
                        {COLOR_OPTIONS.map((c) => (
                          <button
                            key={c.key}
                            type="button"
                            onClick={() => setEditColor(c.key)}
                            className={`w-5 h-5 rounded-full ${c.bg} transition-all flex items-center justify-center text-white ${
                              editColor === c.key ? 'ring-2 ring-offset-2 ring-[#173B72] scale-110' : 'opacity-60 hover:opacity-100'
                            }`}
                            title={c.label}
                          >
                            {editColor === c.key && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" variant="primary" size="sm">
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  </form>
                );
              }

              return (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-[#DCE4EE] bg-white hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-3 h-3 rounded-full shrink-0 ${
                        cat.color === 'emerald'
                          ? 'bg-emerald-500'
                          : cat.color === 'purple'
                          ? 'bg-purple-500'
                          : cat.color === 'amber'
                          ? 'bg-amber-500'
                          : cat.color === 'rose'
                          ? 'bg-rose-500'
                          : cat.color === 'indigo'
                          ? 'bg-indigo-500'
                          : cat.color === 'blue'
                          ? 'bg-blue-500'
                          : 'bg-slate-400'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#173B72] truncate">
                          {cat.name}
                        </span>
                        {isDefault && (
                          <span className="text-3xs uppercase font-extrabold px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 border border-slate-200">
                            Default
                          </span>
                        )}
                        <span className="text-2xs font-mono text-slate-400 tabular-nums">
                          ({count} {count === 1 ? 'test' : 'tests'})
                        </span>
                      </div>
                      {cat.description && (
                        <p className="text-2xs text-slate-500 truncate max-w-sm mt-0.5">
                          {cat.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-3">
                    {onSelectCategoryFilter && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectCategoryFilter(cat.id);
                          onClose();
                        }}
                        className="text-2xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded-md transition-colors"
                        title="View tests in this category"
                      >
                        View
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleStartEdit(cat)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Category"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartDelete(cat)}
                      disabled={isDefault || (categories.length <= 1 && (testCountByCat.get(cat.id) || 0) > 0)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isDefault || (categories.length <= 1 && (testCountByCat.get(cat.id) || 0) > 0)
                          ? 'text-slate-300 cursor-not-allowed opacity-50'
                          : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                      }`}
                      title={
                        isDefault
                          ? 'Default category cannot be deleted'
                          : categories.length <= 1 && (testCountByCat.get(cat.id) || 0) > 0
                          ? 'Cannot delete the only existing category with tests'
                          : 'Delete Category'
                      }
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#DCE4EE] bg-[#F7F9FC] flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {/* MODULE 11: Section 10 Delete Category Dialog */}
      {deletingCategory && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setDeletingCategory(null)}
        >
          <div
            className="bg-[#FCFCFA] rounded-2xl border border-[#DCE4EE] shadow-2xl max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-[#173B72]">
                  Delete Category?
                </h3>
                {(testCountByCat.get(deletingCategory.id) || 0) === 0 ? (
                  <p className="text-xs text-slate-500">
                    This category contains no tests.
                  </p>
                ) : (
                  <div className="text-xs text-slate-600 space-y-1">
                    <p>
                      This category contains{' '}
                      <span className="font-bold text-[#173B72]">
                        {testCountByCat.get(deletingCategory.id)}{' '}
                        {testCountByCat.get(deletingCategory.id) === 1 ? 'test' : 'tests'}
                      </span>
                      .
                    </p>
                    <p className="text-slate-500 font-medium">The tests will not be deleted.</p>
                  </div>
                )}
              </div>
            </div>

            {deleteError && (
              <div className="flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            {(testCountByCat.get(deletingCategory.id) || 0) > 0 && (
              <div className="pt-2">
                <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Move these tests to:
                </label>
                <select
                  value={replacementCategoryId}
                  onChange={(e) => setReplacementCategoryId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#DCE4EE] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] font-medium"
                >
                  {categories
                    .filter((c) => c.id !== deletingCategory.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#DCE4EE]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingCategory(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmDelete}
                disabled={
                  (testCountByCat.get(deletingCategory.id) || 0) > 0 &&
                  !replacementCategoryId
                }
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
