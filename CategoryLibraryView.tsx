/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Category, DEFAULT_CATEGORY_ID } from '../../types/category';
import { Button } from '../ui/Button';
import {
  FolderOpen,
  Plus,
  Search,
  ArrowRight,
  ArrowUpDown,
  X,
  Layers,
  KeyRound,
} from 'lucide-react';

interface CategoryLibraryViewProps {
  categories: Category[];
  testCountByCat: Map<string, number>;
  onSelectCategory: (category: Category) => void;
  onCreateAssessment: () => void;
  onManageCategories: () => void;
}

type CategorySortOption = 'name-asc' | 'name-desc' | 'count-desc' | 'count-asc';

export function CategoryLibraryView({
  categories,
  testCountByCat,
  onSelectCategory,
  onCreateAssessment,
  onManageCategories,
}: CategoryLibraryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<CategorySortOption>('name-asc');

  // Filter categories by name and description
  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return categories;

    return categories.filter((cat) => {
      const nameMatch = cat.name.toLowerCase().includes(query);
      const descMatch = cat.description?.toLowerCase().includes(query) || false;
      return nameMatch || descMatch;
    });
  }, [categories, searchQuery]);

  // Sort categories according to selected criteria
  const sortedCategories = useMemo(() => {
    const list = [...filteredCategories];

    list.sort((a, b) => {
      // In alphabetical sorts, keep Uncategorized at the bottom
      if (sortBy === 'name-asc' || sortBy === 'name-desc') {
        if (a.id === DEFAULT_CATEGORY_ID) return 1;
        if (b.id === DEFAULT_CATEGORY_ID) return -1;
      }

      if (sortBy === 'name-asc') {
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      }
      if (sortBy === 'name-desc') {
        return b.name.localeCompare(a.name, undefined, { sensitivity: 'base' });
      }
      if (sortBy === 'count-desc') {
        const countA = testCountByCat.get(a.id) || 0;
        const countB = testCountByCat.get(b.id) || 0;
        if (countB !== countA) return countB - countA;
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'count-asc') {
        const countA = testCountByCat.get(a.id) || 0;
        const countB = testCountByCat.get(b.id) || 0;
        if (countA !== countB) return countA - countB;
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

    return list;
  }, [filteredCategories, sortBy, testCountByCat]);

  // Map category colors to Tailwind styles
  const getCategoryColorStyles = (color?: Category['color']) => {
    switch (color) {
      case 'emerald':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
          hoverBorder: 'hover:border-emerald-300',
        };
      case 'purple':
        return {
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
          dot: 'bg-purple-500',
          hoverBorder: 'hover:border-purple-300',
        };
      case 'amber':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500',
          hoverBorder: 'hover:border-amber-300',
        };
      case 'rose':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500',
          hoverBorder: 'hover:border-rose-300',
        };
      case 'indigo':
        return {
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          dot: 'bg-indigo-500',
          hoverBorder: 'hover:border-indigo-300',
        };
      case 'blue':
        return {
          bg: 'bg-blue-50 text-[#2563EB] border-blue-200',
          dot: 'bg-[#2563EB]',
          hoverBorder: 'hover:border-blue-300',
        };
      case 'slate':
      default:
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-500',
          hoverBorder: 'hover:border-slate-300',
        };
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F6FA] flex flex-col">
      {/* Top Header Bar */}
      <header className="bg-[#FCFCFA] border-b border-[#DCE4EE] shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-13 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1">
              <span className="font-extrabold text-[#173B72] text-sm sm:text-base tracking-tight">
                Assess<span className="text-orange-500">ora</span>
              </span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500 mb-1" />
            </div>
            <span className="text-slate-300">/</span>
            <span className="text-xs sm:text-sm font-semibold text-slate-700">
              Assessments
            </span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="#/test"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#173B72] hover:bg-slate-100/80 px-2.5 py-1 rounded-lg border border-[#DCE4EE] transition-colors cursor-pointer"
              title="Enter student test access code"
            >
              <KeyRound className="w-3.5 h-3.5 text-orange-500" />
              <span className="hidden sm:inline">Student</span>
              <span>Access</span>
            </a>

            <button
              type="button"
              onClick={onManageCategories}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#2563EB] hover:bg-blue-50/60 px-2.5 py-1 rounded-lg border border-[#DCE4EE] transition-colors cursor-pointer"
              title="Organize categories"
            >
              <FolderOpen className="w-3.5 h-3.5 text-[#2563EB]" />
              <span className="hidden sm:inline">Manage</span>
              <span>Categories</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-6 space-y-4">
        {/* Page Heading & Primary Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#173B72]">
              Assessment Library
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Organize and manage your assessments by category.
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<FolderOpen className="w-4 h-4 text-[#2563EB]" />}
              onClick={onManageCategories}
              className="hidden sm:inline-flex shrink-0 shadow-2xs text-xs"
            >
              Manage Categories
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={onCreateAssessment}
              className="shrink-0 whitespace-nowrap shadow-xs"
            >
              Create Assessment
            </Button>
          </div>
        </div>

        {/* Controls Row: Search & Sorting */}
        <div className="bg-[#FCFCFA] rounded-xl border border-[#DCE4EE] p-3 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Category Search Field */}
          <div className="relative w-full sm:max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8.5 pr-8 py-1.5 text-xs sm:text-sm bg-white border border-[#DCE4EE] rounded-lg text-[#172033] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15 focus:border-[#2563EB] shadow-2xs transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear category search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sorting Control */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-2xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 shrink-0">
              <ArrowUpDown className="w-3 h-3 text-slate-400" />
              Sort:
            </span>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as CategorySortOption)}
                aria-label="Sort categories"
                className="pl-2.5 pr-7 py-1.5 text-xs bg-white border border-[#DCE4EE] rounded-lg text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15 focus:border-[#2563EB] shadow-2xs cursor-pointer appearance-none"
              >
                <option value="name-asc">Name A–Z</option>
                <option value="name-desc">Name Z–A</option>
                <option value="count-desc">Most Assessments</option>
                <option value="count-asc">Least Assessments</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Category Cards Section */}
        {categories.length === 0 ? (
          /* Empty Category Library (Section 11) */
          <div className="bg-[#FCFCFA] rounded-2xl border border-[#DCE4EE] p-10 sm:p-12 text-center space-y-4 shadow-xs">
            <div className="w-13 h-13 rounded-2xl bg-blue-50 text-[#2563EB] border border-blue-200 flex items-center justify-center mx-auto shadow-2xs">
              <FolderOpen className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-extrabold text-[#173B72]">
                No assessment categories yet
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                Create a category to organize your assessments.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={onManageCategories}
              className="mx-auto"
            >
              Create Category
            </Button>
          </div>
        ) : sortedCategories.length === 0 ? (
          /* Category Search Empty State (Section 10) */
          <div className="bg-[#FCFCFA] rounded-2xl border border-[#DCE4EE] p-8 text-center space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Search className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-sm sm:text-base font-bold text-[#173B72]">
                No categories found
              </h3>
              <p className="text-xs text-slate-500">
                Try a different search term.
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
          /* Category Cards Responsive Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-4.5">
            {sortedCategories.map((cat) => {
              const count = testCountByCat.get(cat.id) || 0;
              const colorStyles = getCategoryColorStyles(cat.color);

              return (
                <div
                  key={cat.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectCategory(cat)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectCategory(cat);
                    }
                  }}
                  className={`bg-[#FCFCFA] rounded-2xl border border-[#DCE4EE] p-4.5 sm:p-5 shadow-xs transition-all duration-200 hover:shadow-md ${colorStyles.hoverBorder} hover:border-[#2563EB]/40 flex flex-col justify-between text-left cursor-pointer group focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30`}
                  aria-label={`Open category ${cat.name}, contains ${count} assessment${count === 1 ? '' : 's'}`}
                >
                  <div className="space-y-2.5">
                    {/* Top Row: Color indicator & Assessment count pill */}
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-2xs font-bold border ${colorStyles.bg}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${colorStyles.dot}`}
                        />
                        <span>{cat.name}</span>
                      </div>

                      <span className="font-mono text-2xs font-bold text-slate-500 bg-[#F1F5F9] px-2 py-0.5 rounded-md border border-slate-200">
                        {count} {count === 1 ? 'assessment' : 'assessments'}
                      </span>
                    </div>

                    {/* Category Name */}
                    <div>
                      <h2 className="text-base font-extrabold text-[#173B72] group-hover:text-[#2563EB] transition-colors tracking-tight">
                        {cat.name}
                      </h2>
                    </div>

                    {/* Category Description */}
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed min-h-[2rem]">
                      {cat.description || 'No description provided.'}
                    </p>
                  </div>

                  {/* Bottom Row: Navigation affordance */}
                  <div className="pt-3.5 mt-3 border-t border-[#DCE4EE]/70 flex items-center justify-between text-xs font-semibold text-[#2563EB] group-hover:text-blue-700">
                    <span className="text-2xs font-bold uppercase tracking-wider text-slate-400 group-hover:text-[#2563EB] transition-colors">
                      Category
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span>View assessments</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Formal Brand Footer */}
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
    </div>
  );
}
