/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Test } from '../../types/test';
import { Category, DEFAULT_CATEGORY_ID } from '../../types/category';
import { loadAllCategories, getCategoryById } from '../../utils/categoryStorage';
import { getTestReports, syncServerSubmissions } from '../../utils/reports';
import { CategoryLibraryView } from './CategoryLibraryView';
import { CategoryDetailView } from './CategoryDetailView';
import { CategoryManagerModal } from '../Categories/CategoryManagerModal';
import { CreateAssessmentModal } from './CreateAssessmentModal';

interface TestListProps {
  tests: Test[];
  onCreateTest: (data?: { title: string; categoryId: string; description: string }) => void;
  onOpenTest: (testId: string, initialTab?: 'questions' | 'settings' | 'share') => void;
  onTakeTest?: (testId: string) => void;
  onOpenReports?: (testId: string) => void;
  onDuplicateTest: (testId: string) => void;
  onDeleteTest: (testId: string) => void;
  onRefreshTests?: () => void;
}

export function TestList({
  tests,
  onCreateTest,
  onOpenTest,
  onTakeTest,
  onOpenReports,
  onDuplicateTest,
  onDeleteTest,
  onRefreshTests,
}: TestListProps) {
  const [categories, setCategories] = useState<Category[]>(() => loadAllCategories());
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createPreselectedCatId, setCreatePreselectedCatId] = useState<string | undefined>(
    undefined
  );
  const [resultsVersion, setResultsVersion] = useState(0);

  // Sync server submissions on mount and listen to results cleared events
  useEffect(() => {
    let isMounted = true;
    const syncAll = async () => {
      let anyUpdated = false;
      for (const t of tests) {
        const updated = await syncServerSubmissions(t.id);
        if (updated) anyUpdated = true;
      }
      if (anyUpdated && isMounted) {
        setResultsVersion((v) => v + 1);
      }
    };
    syncAll();

    const handleResultsCleared = () => {
      if (isMounted) setResultsVersion((v) => v + 1);
    };

    window.addEventListener('assessora_results_cleared', handleResultsCleared);
    return () => {
      isMounted = false;
      window.removeEventListener('assessora_results_cleared', handleResultsCleared);
    };
  }, [tests]);

  // Compute live result count per test
  const resultCountByTest = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tests) {
      const reports = getTestReports(t.id);
      map.set(t.id, reports.length);
    }
    return map;
  }, [tests, resultsVersion]);

  // Compute test count per category
  const testCountByCat = useMemo(() => {
    const map = new Map<string, number>();
    const validCatIds = new Set(categories.map((c) => c.id));

    tests.forEach((t) => {
      const catId = t.categoryId && validCatIds.has(t.categoryId)
        ? t.categoryId
        : DEFAULT_CATEGORY_ID;
      map.set(catId, (map.get(catId) || 0) + 1);
    });

    return map;
  }, [tests, categories]);

  // Synchronize activeCategoryId with URL hash / browser history (Section 14 & 34)
  const syncCategoryFromUrl = useCallback(() => {
    const hash = window.location.hash || '';
    const pathname = window.location.pathname || '';

    // Match patterns:
    // #/assessments/:categoryId or #assessments/:categoryId
    // #/category/:categoryId or #category/:categoryId
    // /assessments/:categoryId
    let targetCatId: string | null = null;

    const hashMatch = hash.match(/^#\/?(?:assessments|category)\/([^/?#&]+)/i);
    if (hashMatch && hashMatch[1]) {
      targetCatId = decodeURIComponent(hashMatch[1]).trim();
    } else if (pathname.match(/^\/?assessments\/([^/?#&]+)/i)) {
      const pathMatch = pathname.match(/^\/?assessments\/([^/?#&]+)/i);
      if (pathMatch && pathMatch[1]) {
        targetCatId = decodeURIComponent(pathMatch[1]).trim();
      }
    }

    if (targetCatId) {
      const allCats = loadAllCategories();
      const found = allCats.find(
        (c) =>
          c.id.toLowerCase() === targetCatId!.toLowerCase() ||
          c.name.toLowerCase() === targetCatId!.toLowerCase()
      );
      if (found) {
        setActiveCategoryId(found.id);
        return;
      }
    }

    // Top-level Assessment Library
    if (
      hash === '#/assessments' ||
      hash === '#assessments' ||
      hash === '#/' ||
      hash === '' ||
      pathname === '/assessments' ||
      pathname === '/'
    ) {
      setActiveCategoryId(null);
    }
  }, []);

  useEffect(() => {
    syncCategoryFromUrl();
    window.addEventListener('hashchange', syncCategoryFromUrl);
    window.addEventListener('popstate', syncCategoryFromUrl);
    return () => {
      window.removeEventListener('hashchange', syncCategoryFromUrl);
      window.removeEventListener('popstate', syncCategoryFromUrl);
    };
  }, [syncCategoryFromUrl]);

  // Navigate to Level 2: Category Detail
  const handleSelectCategory = (cat: Category) => {
    setActiveCategoryId(cat.id);
    const targetHash = `#/assessments/${encodeURIComponent(cat.id)}`;
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
  };

  // Navigate back to Level 1: Assessment Library
  const handleBackToLibrary = () => {
    setActiveCategoryId(null);
    const targetHash = `#/assessments`;
    if (window.location.hash !== targetHash && window.location.hash !== '') {
      window.location.hash = targetHash;
    }
  };

  // Open Create Assessment Modal from Level 1
  const handleOpenCreateTopLevel = () => {
    setCreatePreselectedCatId(undefined);
    setIsCreateModalOpen(true);
  };

  // Open Create Assessment Modal from Level 2 (preselects current category)
  const handleOpenCreateContextual = () => {
    setCreatePreselectedCatId(activeCategoryId || undefined);
    setIsCreateModalOpen(true);
  };

  // Confirm Assessment Creation
  const handleConfirmCreate = (data: {
    title: string;
    categoryId: string;
    description: string;
  }) => {
    setIsCreateModalOpen(false);
    onCreateTest(data);
  };

  // Callback when categories are modified in modal
  const handleCategoriesChanged = () => {
    const updated = loadAllCategories();
    setCategories(updated);
    onRefreshTests?.();

    // If currently viewing a category that was deleted, safely return to library
    if (activeCategoryId && !updated.some((c) => c.id === activeCategoryId)) {
      handleBackToLibrary();
    }
  };

  // Active category object if viewing Level 2
  const activeCategory = useMemo(() => {
    if (!activeCategoryId) return null;
    return getCategoryById(activeCategoryId, categories);
  }, [activeCategoryId, categories]);

  return (
    <>
      {activeCategory ? (
        /* Level 2: Category Detail View (Assessora / Assessments / [Category]) */
        <CategoryDetailView
          category={activeCategory}
          tests={tests}
          resultCountByTest={resultCountByTest}
          onBackToLibrary={handleBackToLibrary}
          onCreateAssessment={handleOpenCreateContextual}
          onOpenTest={onOpenTest}
          onTakeTest={onTakeTest}
          onOpenReports={onOpenReports}
          onDuplicateTest={onDuplicateTest}
          onDeleteTest={onDeleteTest}
          onRefreshTests={onRefreshTests}
        />
      ) : (
        /* Level 1: Assessment Library (Categories Only) */
        <CategoryLibraryView
          categories={categories}
          testCountByCat={testCountByCat}
          onSelectCategory={handleSelectCategory}
          onCreateAssessment={handleOpenCreateTopLevel}
          onManageCategories={() => setIsCategoryModalOpen(true)}
        />
      )}

      {/* Create Assessment Modal (Section 23-27) */}
      <CreateAssessmentModal
        isOpen={isCreateModalOpen}
        categories={categories}
        initialCategoryId={createPreselectedCatId}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleConfirmCreate}
      />

      {/* Category Manager Modal (Section 13) */}
      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        categories={categories}
        tests={tests}
        onClose={() => setIsCategoryModalOpen(false)}
        onCategoriesChanged={handleCategoriesChanged}
        onSelectCategoryFilter={(catId) => {
          setIsCategoryModalOpen(false);
          const cat = categories.find((c) => c.id === catId);
          if (cat) {
            handleSelectCategory(cat);
          }
        }}
      />
    </>
  );
}
