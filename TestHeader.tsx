/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Button } from '../ui/Button';
import {
  Save,
  Eye,
  Check,
  ChevronLeft,
  Settings as SettingsIcon,
  FileText,
  AlertCircle,
  Play,
  ClipboardList,
  Share2,
} from 'lucide-react';

interface TestHeaderProps {
  testTitle: string;
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;
  activeTab?: 'questions' | 'settings' | 'share';
  questionCount?: number;
  hasSettingsErrors?: boolean;
  onTabChange?: (tab: 'questions' | 'settings' | 'share') => void;
  onSave: () => void;
  onPreview: () => void;
  onTakeTest?: () => void;
  onOpenReports?: () => void;
  onBackToDashboard: () => void;
}

export function TestHeader({
  testTitle,
  isDirty,
  isSaving,
  lastSavedAt,
  activeTab = 'questions',
  questionCount = 0,
  hasSettingsErrors = false,
  onTabChange,
  onSave,
  onPreview,
  onTakeTest,
  onOpenReports,
  onBackToDashboard,
}: TestHeaderProps) {
  const displayTitle = testTitle.trim() || 'Untitled Test';

  return (
    <header className="sticky top-0 z-30 bg-[#FCFCFA] border-b border-[#DCE4EE] shadow-2xs">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Brand Wordmark and Back Link */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors p-2 sm:p-1.5 -ml-1 rounded-lg hover:bg-blue-50/60 cursor-pointer shrink-0 min-h-[40px] min-w-[40px] sm:min-h-0 sm:min-w-0 justify-center"
            title="Return to tests list"
            aria-label="Return to tests list"
          >
            <ChevronLeft className="w-5 h-5 sm:w-4 sm:h-4 text-blue-600" />
            <span className="hidden sm:inline font-semibold">Tests</span>
          </button>

          <span className="text-slate-300 hidden sm:inline">/</span>

          {/* Platform name with orange accent */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1 shrink-0">
              <span className="font-extrabold text-[#173B72] text-sm sm:text-base tracking-tight">
                Assess<span className="text-orange-500">ora</span>
              </span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500 mb-1.5 sm:mb-2" />
            </div>
            <span className="text-slate-300 hidden lg:inline">/</span>
            <span className="hidden lg:inline text-xs sm:text-sm font-semibold text-slate-700 truncate max-w-xs">
              {displayTitle}
            </span>
          </div>
        </div>

        {/* Center: Tabs Switcher (Questions / Test Settings) */}
        {onTabChange && (
          <div className="flex items-center bg-[#F3F6FA] p-1 rounded-xl border border-[#DCE4EE]">
            <button
              type="button"
              onClick={() => onTabChange('questions')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'questions'
                  ? 'bg-white text-[#173B72] shadow-2xs border border-[#DCE4EE]'
                  : 'text-slate-500 hover:text-[#173B72] hover:bg-white/60'
              }`}
              title="View and edit questions"
            >
              <FileText className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Questions</span>
              {questionCount > 0 && (
                <span
                  className={`text-3xs px-1.5 py-0.2 rounded-full font-mono font-semibold ${
                    activeTab === 'questions'
                      ? 'bg-[#EEF5FF] text-[#2563EB]'
                      : 'bg-slate-200/70 text-slate-600'
                  }`}
                >
                  {questionCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onTabChange('settings')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer relative ${
                activeTab === 'settings'
                  ? 'bg-white text-[#173B72] shadow-2xs border border-[#DCE4EE]'
                  : 'text-slate-500 hover:text-[#173B72] hover:bg-white/60'
              }`}
              title="Configure test settings"
            >
              <SettingsIcon className="w-3.5 h-3.5 text-orange-500" />
              <span>Test Settings</span>
              {hasSettingsErrors && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="Configuration errors" />
              )}
            </button>

            <button
              type="button"
              onClick={() => onTabChange('share')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer relative ${
                activeTab === 'share'
                  ? 'bg-white text-[#173B72] shadow-2xs border border-[#DCE4EE]'
                  : 'text-slate-500 hover:text-[#173B72] hover:bg-white/60'
              }`}
              title="Share and access settings"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Share</span>
            </button>
          </div>
        )}

        {/* Right: small save status + Preview + Save Test */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Status Indicator (Shown on tablet and desktop) */}
          <div
            className="hidden sm:flex items-center text-xs"
            title={isSaving ? 'Saving...' : isDirty ? 'Unsaved changes' : 'Saved'}
          >
            {isSaving ? (
              <span className="text-blue-700 flex items-center gap-1.5 font-semibold">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span>Saving...</span>
              </span>
            ) : isDirty ? (
              <span className="text-orange-600 flex items-center gap-1.5 font-semibold">
                <span className="inline-block w-2 h-2 rounded-full bg-orange-500" />
                <span>Unsaved changes</span>
              </span>
            ) : (
              <span className="text-slate-600 flex items-center gap-1.5 font-semibold">
                <Check className="w-3.5 h-3.5 text-blue-600" />
                <span>Saved</span>
              </span>
            )}
          </div>

          {/* Student Reports button (Module 9 Teacher Reporting) */}
          {onOpenReports && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenReports}
              leftIcon={<ClipboardList className="w-3.5 h-3.5 text-blue-600" />}
              title="View student submission reports"
              aria-label="Student Reports"
              className="min-h-[40px] min-w-[40px] p-2 sm:px-3 sm:py-1.5 text-xs justify-center gap-0 sm:gap-1.5"
            >
              <span className="hidden sm:inline">Reports</span>
            </Button>
          )}

          {/* Student View (Full Student Mode) */}
          {onTakeTest && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onTakeTest}
              leftIcon={<Play className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />}
              title="Open full Student Test Page"
              aria-label="Student View"
              className="min-h-[40px] min-w-[40px] p-2 sm:px-3 sm:py-1.5 text-xs justify-center gap-0 sm:gap-1.5 border border-orange-200/80"
            >
              <span className="hidden sm:inline">Student View</span>
            </Button>
          )}

          {/* Preview Button (Secondary) */}
          <Button
            variant="outline"
            size="sm"
            onClick={onPreview}
            leftIcon={<Eye className="w-4 h-4 text-blue-600" />}
            title="Preview test from student's perspective"
            aria-label="Preview test"
            className="min-h-[40px] min-w-[40px] p-2 sm:px-3 sm:py-1.5 text-xs justify-center gap-0 sm:gap-1.5"
          >
            <span className="hidden sm:inline">Preview</span>
          </Button>

          {/* Save Button (Primary Action - Always Save Test) */}
          <Button
            variant="primary"
            size="sm"
            isLoading={isSaving}
            onClick={onSave}
            leftIcon={<Save className="w-4 h-4" />}
            title="Save test"
            aria-label="Save test"
            className="min-h-[40px] min-w-[40px] p-2 sm:px-3 sm:py-1.5 text-xs justify-center gap-0 sm:gap-1.5"
          >
            <span className="hidden sm:inline">Save Test</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
