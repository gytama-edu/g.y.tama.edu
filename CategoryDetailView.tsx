/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Test } from '../../types/test';
import { Category, DEFAULT_CATEGORY_ID } from '../../types/category';
import { clearAllStudentResults } from '../../utils/reports';
import { Button } from '../ui/Button';
import { ConfirmModal } from '../ui/ConfirmModal';
import {
  ArrowLeft,
  Plus,
  Search,
  ArrowUpDown,
  FileText,
  Clock,
  Pencil,
  Play,
  Share2,
  ClipboardList,
  MoreVertical,
  Copy,
  RotateCcw,
  Trash2,
  CheckCircle2,
  X,
  Inbox,
} from 'lucide-react';

interface CategoryDetailViewProps {
  category: Category;
  tests: Test[];
  resultCountByTest: Map<string, number>;
  onBackToLibrary: () => void;
  onCreateAssessment: () => void;
  onOpenTest: (testId: string, initialTab?: 'questions' | 'settings' | 'share') => void;
  onTakeTest?: (testId: string) => void;
  onOpenReports?: (testId: string) => void;
  onDuplicateTest: (testId: string) => void;
  onDeleteTest: (testId: string) => void;
  onRefreshTests?: () => void;
}

type AssessmentSortOption =
  | 'recent'
  | 'oldest'
  | 'name-asc'
  | 'name-desc'
  | 'questions-desc'
  | 'questions-asc';

export function CategoryDetailView({
  category,
  tests,
  resultCountByTest,
  onBackToLibrary,
  onCreateAssessment,
  onOpenTest,
  onTakeTest,
  onOpenReports,
  onDuplicateTest,
  onDeleteTest,
  onRefreshTests,
}: CategoryDetailViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<AssessmentSortOption>('recent');

  // Card overflow dropdown state
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Deletion and clearing modal states
  const [deletingTestId, setDeletingTestId] = useState<string | null>(null);
  const [clearingTest, setClearingTest] = useState<Test | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Auto-dismiss success toast after 4s
  useEffect(() => {
    if (!successToast) return;
    const timer = setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [successToast]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    }
    if (openDropdownId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdownId]);

  // Filter tests belonging exclusively to this category
  const categoryTests = useMemo(() => {
    return tests.filter((t) => {
      const testCat = t.categoryId || DEFAULT_CATEGORY_ID;
      return testCat === category.id;
    });
  }, [tests, category.id]);

  // Filter tests inside this category by search term
  const searchedTests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return categoryTests;

    return categoryTests.filter((t) => {
      const matchTitle = t.title.toLowerCase().includes(query);
      const matchDesc = t.description?.toLowerCase().includes(query) || false;
      return matchTitle || matchDesc;
    });
  }, [categoryTests, searchQuery]);

  // Sort tests by selected sorting criteria
  const sortedTests = useMemo(() => {
    const list = [...searchedTests];

    list.sort((a, b) => {
      if (sortBy === 'recent') {
        const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return timeB - timeA;
      }
      if (sortBy === 'oldest') {
        const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return timeA - timeB;
      }
      if (sortBy === 'name-asc') {
        return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
      }
      if (sortBy === 'name-desc') {
        return b.title.localeCompare(a.title, undefined, { sensitivity: 'base' });
      }
      if (sortBy === 'questions-desc') {
        return (b.questions?.length || 0) - (a.questions?.length || 0);
      }
      if (sortBy === 'questions-asc') {
        return (a.questions?.length || 0) - (b.questions?.length || 0);
      }
      return 0;
    });

    return list;
  }, [searchedTests, sortBy]);

  const testToDelete = tests.find((t) => t.id === deletingTestId);

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Recently';
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(date);
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F6FA] flex flex-col">
      {/* Top Navigation Bar with 3-Level Breadcrumb (Section 15) */}
      <header className="bg-[#FCFCFA] border-b border-[#DCE4EE] shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-13 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={onBackToLibrary}
              className="flex items-center gap-1 group cursor-pointer focus:outline-none"
              title="Return to Assessment Library"
            >
              <span className="font-extrabold text-[#173B72] text-sm sm:text-base tracking-tight group-hover:text-blue-600 transition-colors">
                Assess<span className="text-orange-500">ora</span>
              </span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500 mb-1" />
            </button>
            <span className="text-slate-300">/</span>
            <button
              type="button"
              onClick={onBackToLibrary}
              className="text-xs sm:text-sm font-semibold text-slate-500 hover:text-[#2563EB] transition-colors cursor-pointer"
            >
              Assessments
            </button>
            <span className="text-slate-300">/</span>
            <span className="text-xs sm:text-sm font-bold text-[#173B72] truncate max-w-[160px] sm:max-w-[240px]">
              {category.name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              onClick={onBackToLibrary}
              className="text-xs h-8 px-2.5 sm:px-3"
            >
              <span className="hidden sm:inline">Back to Categories</span>
              <span className="sm:hidden">Categories</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-6 space-y-4">
        {/* Category Detail Page Header (Section 16) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#173B72]">
                {category.name}
              </h1>
              <span className="font-mono text-2xs font-bold text-slate-500 bg-[#E2E8F0]/70 px-2 py-0.5 rounded-md border border-slate-300/60">
                {categoryTests.length}{' '}
                {categoryTests.length === 1 ? 'assessment' : 'assessments'}
              </span>
            </div>
            {category.description && (
              <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
                {category.description}
              </p>
            )}
          </div>

          {/* Primary Action: Create Assessment (Preselects this category) */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={onCreateAssessment}
              className="shrink-0 whitespace-nowrap shadow-xs w-full sm:w-auto justify-center"
            >
              Create Assessment
            </Button>
          </div>
        </div>

        {/* Controls Row: Search & Sorting inside Category (Section 17 & 18) */}
        <div className="bg-[#FCFCFA] rounded-xl border border-[#DCE4EE] p-3 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Assessment Search Field */}
          <div className="relative w-full sm:max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={`Search in ${category.name}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8.5 pr-8 py-1.5 text-xs sm:text-sm bg-white border border-[#DCE4EE] rounded-lg text-[#172033] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15 focus:border-[#2563EB] shadow-2xs transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Controls: Count & Sorting */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            {searchQuery && (
              <span className="text-2xs text-slate-500 font-medium">
                Showing {sortedTests.length} of {categoryTests.length}
              </span>
            )}

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3 text-slate-400" />
                Sort:
              </span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as AssessmentSortOption)}
                  aria-label="Sort assessments"
                  className="pl-2.5 pr-7 py-1.5 text-xs bg-white border border-[#DCE4EE] rounded-lg text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15 focus:border-[#2563EB] shadow-2xs cursor-pointer appearance-none"
                >
                  <option value="recent">Recently Updated</option>
                  <option value="oldest">Oldest Updated</option>
                  <option value="name-asc">Name A–Z</option>
                  <option value="name-desc">Name Z–A</option>
                  <option value="questions-desc">Most Questions</option>
                  <option value="questions-asc">Least Questions</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                  <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Assessment Cards Grid / Empty States */}
        {categoryTests.length === 0 ? (
          /* Empty Category State (Section 21) */
          <div className="bg-[#FCFCFA] rounded-2xl border border-[#DCE4EE] p-10 sm:p-12 text-center space-y-4 shadow-xs">
            <div className="w-13 h-13 rounded-2xl bg-blue-50 text-[#2563EB] border border-blue-200 flex items-center justify-center mx-auto shadow-2xs">
              <Inbox className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-extrabold text-[#173B72]">
                No assessments in this category yet
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                Create an assessment to start building your {category.name} library.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={onCreateAssessment}
              className="mx-auto"
            >
              Create Assessment
            </Button>
          </div>
        ) : sortedTests.length === 0 ? (
          /* Empty Search State Inside Category (Section 22) */
          <div className="bg-[#FCFCFA] rounded-2xl border border-[#DCE4EE] p-8 text-center space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Search className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-sm sm:text-base font-bold text-[#173B72]">
                No assessments found
              </h3>
              <p className="text-xs text-slate-500">
                No assessments match "{searchQuery}".
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="mx-auto text-xs"
            >
              Clear Search
            </Button>
          </div>
        ) : (
          /* Assessment Cards Grid (Section 20) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-4.5">
            {sortedTests.map((test) => {
              const resCount = resultCountByTest.get(test.id) || 0;
              const isDropdownOpen = openDropdownId === test.id;
              const questionCount = test.questions?.length || 0;
              const totalPoints =
                test.questions?.reduce(
                  (sum, q) => sum + (typeof q.points === 'number' ? q.points : 1),
                  0
                ) || 0;

              return (
                <div
                  key={test.id}
                  className="bg-[#FCFCFA] rounded-2xl border border-[#DCE4EE] p-4.5 sm:p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:border-[#2563EB]/40 flex flex-col justify-between text-left group"
                >
                  <div className="space-y-2.5">
                    {/* Header: Title */}
                    <div>
                      <h2
                        onClick={() => onOpenTest(test.id, 'questions')}
                        className="text-base font-extrabold text-[#173B72] group-hover:text-[#2563EB] transition-colors tracking-tight line-clamp-1 cursor-pointer"
                        title={test.title || 'Untitled Assessment'}
                      >
                        {test.title || 'Untitled Assessment'}
                      </h2>
                    </div>

                    {/* Meta line: Questions count, points, updated date */}
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-2xs text-slate-500 font-medium">
                      <span className="flex items-center gap-1 font-semibold text-slate-700">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {questionCount} question{questionCount === 1 ? '' : 's'}
                        </span>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span>{totalPoints} pts</span>
                      <span className="text-slate-300">•</span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{formatDate(test.updatedAt || test.createdAt)}</span>
                      </span>
                    </div>

                    {/* Description preview */}
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed min-h-[2rem]">
                      {test.description || 'No instructions provided.'}
                    </p>
                  </div>

                  {/* Actions Section */}
                  <div className="mt-4 pt-3.5 border-t border-[#DCE4EE]/70 space-y-2">
                    {/* Row 1: Primary Task Actions */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<Pencil className="w-3.5 h-3.5" />}
                        onClick={() => onOpenTest(test.id, 'questions')}
                        className="w-full justify-center text-xs h-8 shadow-xs"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Play className="w-3.5 h-3.5 text-emerald-600" />}
                        onClick={() => onTakeTest?.(test.id)}
                        className="w-full justify-center text-xs h-8 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                      >
                        Take Test
                      </Button>
                    </div>

                    {/* Row 2: Secondary Sharing, Reports & Overflow Actions */}
                    <div className="flex items-center justify-between gap-1.5 pt-0.5">
                      <div className="flex items-center gap-1.5 flex-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Share2 className="w-3.5 h-3.5 text-slate-500" />}
                          onClick={() => onOpenTest(test.id, 'share')}
                          className="text-xs h-7.5 px-2.5 text-slate-600 hover:text-[#2563EB] hover:bg-blue-50/50"
                        >
                          Share
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<ClipboardList className="w-3.5 h-3.5 text-slate-500" />}
                          onClick={() => onOpenReports?.(test.id)}
                          className="text-xs h-7.5 px-2.5 text-slate-600 hover:text-[#2563EB] hover:bg-blue-50/50"
                        >
                          Reports
                          {resCount > 0 && (
                            <span className="ml-1.5 font-mono text-2xs px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 font-bold">
                              {resCount}
                            </span>
                          )}
                        </Button>
                      </div>

                      {/* Card Overflow ⋯ Menu */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenDropdownId(isDropdownOpen ? null : test.id)
                          }
                          aria-label="More actions"
                          aria-expanded={isDropdownOpen}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {isDropdownOpen && (
                          <div
                            ref={dropdownRef}
                            className="absolute right-0 bottom-full mb-1.5 w-44 bg-white rounded-xl border border-[#DCE4EE] shadow-md py-1 z-20 text-xs"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setOpenDropdownId(null);
                                onDuplicateTest(test.id);
                              }}
                              className="w-full text-left px-3 py-1.5 flex items-center gap-2 text-slate-700 hover:bg-[#F7F9FC] transition-colors cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5 text-slate-400" />
                              <span>Duplicate Test</span>
                            </button>

                            {/* Clear Results (Module 14) */}
                            <button
                              type="button"
                              disabled={resCount === 0}
                              onClick={() => {
                                setOpenDropdownId(null);
                                if (resCount > 0) {
                                  setClearingTest(test);
                                  setClearError(null);
                                }
                              }}
                              title={
                                resCount === 0
                                  ? 'No student results to clear'
                                  : `Clear ${resCount} student results`
                              }
                              className={`w-full text-left px-3 py-1.5 flex items-center gap-2 transition-colors ${
                                resCount === 0
                                  ? 'text-slate-400 cursor-not-allowed opacity-60'
                                  : 'text-amber-700 hover:bg-amber-50 cursor-pointer'
                              }`}
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                              <span>Clear Results</span>
                              {resCount > 0 && (
                                <span className="ml-auto font-mono text-2xs px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-bold">
                                  {resCount}
                                </span>
                              )}
                            </button>

                            <div className="border-t border-[#DCE4EE] my-1" />

                            <button
                              type="button"
                              onClick={() => {
                                setOpenDropdownId(null);
                                setDeletingTestId(test.id);
                              }}
                              className="w-full text-left px-3 py-1.5 flex items-center gap-2 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                              <span>Delete Assessment</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Brand Footer */}
      <footer className="mt-auto border-t border-[#DCE4EE] bg-[#FCFCFA] py-5 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-[#173B72] text-sm tracking-tight">
              Assess<span className="text-orange-500">ora</span>
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-xs text-slate-600 font-medium">
              Assessora by <span className="font-semibold text-[#173B72]">GYTama EDU</span>
            </span>
          </div>
          <p className="text-2xs text-slate-400">
            Professional Online Assessment & Question Management Platform
          </p>
        </div>
      </footer>

      {/* Delete Test Modal */}
      <ConfirmModal
        isOpen={!!deletingTestId}
        title="Delete assessment?"
        description={`Are you sure you want to delete "${
          testToDelete?.title || 'this test'
        }"? This action cannot be undone.`}
        confirmText="Delete Assessment"
        cancelText="Cancel"
        confirmVariant="danger"
        onConfirm={() => {
          if (deletingTestId) {
            onDeleteTest(deletingTestId);
            setDeletingTestId(null);
          }
        }}
        onCancel={() => setDeletingTestId(null)}
      />

      {/* Clear All Results Confirmation Modal */}
      <ConfirmModal
        isOpen={!!clearingTest}
        title="Clear all results?"
        description={`This will permanently remove all student submissions and results for "${
          clearingTest?.title || 'this assessment'
        }". The test, questions, settings, category, and share link will remain unchanged.${
          clearingTest && (resultCountByTest.get(clearingTest.id) || 0) > 0
            ? `\n\n${resultCountByTest.get(clearingTest.id)} student result${
                (resultCountByTest.get(clearingTest.id) || 0) === 1 ? '' : 's'
              } will be removed.`
            : ''
        }\n\nThis action cannot be undone.`}
        confirmText="Clear Results"
        cancelText="Cancel"
        confirmVariant="danger"
        isLoading={isClearing}
        error={clearError}
        onConfirm={async () => {
          if (!clearingTest || isClearing) return;
          setIsClearing(true);
          setClearError(null);
          const res = await clearAllStudentResults(clearingTest.id);
          setIsClearing(false);
          if (res.success) {
            setSuccessToast(
              `Student results cleared successfully for "${clearingTest.title || 'assessment'}".`
            );
            setClearingTest(null);
          } else {
            setClearError(res.error || 'Unable to clear results. Please try again.');
          }
        }}
        onCancel={() => {
          if (!isClearing) {
            setClearingTest(null);
            setClearError(null);
          }
        }}
      />

      {/* Success Notification Toast */}
      {successToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#173B72] text-white px-4 py-2.5 rounded-xl shadow-lg border border-blue-400/30 flex items-center gap-2.5 text-xs animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{successToast}</span>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="ml-2 text-white/60 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
