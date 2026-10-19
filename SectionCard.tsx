/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  AssessmentSection,
  SectionType,
  SUPPORTED_SECTION_TYPES,
  Question,
  ReadingSet,
  ValidationError,
  QuestionType,
} from '../../types/test';
import { QuestionCard } from './QuestionCard';
import { ReadingSetCard } from './ReadingSetCard';
import { AssessmentAudioUpload } from './AssessmentAudioUpload';
import { ConfirmModal } from '../ui/ConfirmModal';
import { Button } from '../ui/Button';
import {
  FolderTree,
  ChevronUp,
  ChevronDown,
  Trash2,
  Copy,
  Plus,
  BookOpen,
  Volume2,
  Headphones,
  FileText,
  SpellCheck,
  Languages,
  PenTool,
  Sliders,
  AlertCircle,
  HelpCircle,
  Info,
  Upload,
} from 'lucide-react';

interface SectionCardProps {
  section: AssessmentSection;
  sectionIndex: number;
  totalSections: number;
  questions: Question[];
  allQuestions: Question[];
  readingSets: ReadingSet[];
  allReadingSets: ReadingSet[];
  allSections: AssessmentSection[];
  errors: ValidationError[];
  onUpdateSection: (updated: AssessmentSection) => void;
  onDeleteSection: (sectionId: string) => void;
  onDuplicateSection: (sectionId: string) => void;
  onMoveSectionUp: (index: number) => void;
  onMoveSectionDown: (index: number) => void;
  onAddQuestionToSection: (sectionId: string) => void;
  onAddReadingPassageToSection: (sectionId: string) => void;
  onOpenImportModalToSection?: (sectionId: string) => void;
  onUpdateQuestion: (updated: Question) => void;
  onDuplicateQuestion: (questionId: string) => void;
  onDeleteQuestion: (questionId: string) => void;
  onMoveQuestionUp: (questionId: string) => void;
  onMoveQuestionDown: (questionId: string) => void;
  onRequestChangeType: (question: Question, targetType: QuestionType) => void;
  onMoveQuestionToSection: (questionId: string, targetSectionId: string) => void;
  onUpdateReadingSet: (updated: ReadingSet) => void;
  onDeleteReadingSet: (readingSetId: string) => void;
  onDuplicateReadingSet: (readingSetId: string) => void;
  onMoveReadingSetUp: (index: number) => void;
  onMoveReadingSetDown: (index: number) => void;
  onAddQuestionToSet: (readingSetId: string) => void;
}

interface SectionAddContentMenuProps {
  section: AssessmentSection;
  onAddQuestion: () => void;
  onAddReadingPassage: () => void;
  onOpenImportModal?: () => void;
  onAddAudioTrack: () => void;
}

function SectionAddContentMenu({
  section,
  onAddQuestion,
  onAddReadingPassage,
  onOpenImportModal,
  onAddAudioTrack,
}: SectionAddContentMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [placement, setPlacement] = useState<{
    vertical: 'up' | 'down';
    horizontal: 'left' | 'right';
  }>({ vertical: 'down', horizontal: 'right' });

  const containerRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const menuListRef = React.useRef<HTMLDivElement>(null);

  const isListening = section.type === 'Listening';

  const updatePosition = React.useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuEstimatedHeight = isListening ? 220 : 175;
    const menuEstimatedWidth = 208; // w-52
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    // Open upward if space below is insufficient for menu or if space below is tight (< 220px) and space above is greater
    const vertical =
      spaceBelow < menuEstimatedHeight && spaceAbove > spaceBelow
        ? 'up'
        : spaceBelow < 220 && spaceAbove > 220
        ? 'up'
        : 'down';

    // Horizontal placement: if right-aligned menu would overflow left edge (< 8px), align to left
    const horizontal =
      rect.right - menuEstimatedWidth < 8 && rect.left + menuEstimatedWidth <= window.innerWidth - 8
        ? 'left'
        : 'right';

    setPlacement({ vertical, horizontal });
  }, [isListening]);

  const toggleMenu = () => {
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen((prev) => !prev);
  };

  React.useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        buttonRef.current?.focus();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const menuButtons = menuListRef.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])');
        if (!menuButtons || menuButtons.length === 0) return;
        const buttonsArray = Array.from(menuButtons);
        const activeIndex = buttonsArray.indexOf(document.activeElement as HTMLButtonElement);
        if (e.key === 'ArrowDown') {
          const nextIndex = activeIndex < buttonsArray.length - 1 ? activeIndex + 1 : 0;
          buttonsArray[nextIndex]?.focus();
        } else {
          const prevIndex = activeIndex > 0 ? activeIndex - 1 : buttonsArray.length - 1;
          buttonsArray[prevIndex]?.focus();
        }
      }
    };

    const handleScrollOrResize = () => {
      updatePosition();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, updatePosition]);

  const verticalClass = placement.vertical === 'up' ? 'bottom-full mb-1.5' : 'top-full mt-1.5';
  const horizontalClass = placement.horizontal === 'left' ? 'left-0' : 'right-0';

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <Button
        ref={buttonRef}
        type="button"
        variant="primary"
        size="sm"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={`section-add-content-menu-${section.id}`}
        onClick={toggleMenu}
        leftIcon={<Plus className="w-3.5 h-3.5" />}
        rightIcon={
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        }
        className="bg-orange-600 hover:bg-orange-700 text-white font-semibold cursor-pointer shadow-2xs"
      >
        + Add Content
      </Button>

      {isOpen && (
        <div
          ref={menuListRef}
          id={`section-add-content-menu-${section.id}`}
          role="menu"
          aria-label="Add content options"
          className={`absolute ${horizontalClass} ${verticalClass} w-52 bg-white rounded-xl shadow-xl border border-[#DCE4EE] py-1.5 z-40`}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onAddQuestion();
            }}
            className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:text-orange-700 hover:bg-orange-50 flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-orange-600 shrink-0" />
            <span>Add Question</span>
          </button>

          {onOpenImportModal && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onOpenImportModal();
              }}
              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50 flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4 text-[#2563EB] shrink-0" />
              <span>Import Questions</span>
            </button>
          )}

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onAddReadingPassage();
            }}
            className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Add Reading Passage</span>
          </button>

          {isListening && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onAddAudioTrack();
              }}
              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:text-purple-700 hover:bg-purple-50 flex items-center gap-2.5 transition-colors cursor-pointer border-t border-slate-100 mt-1 pt-2"
            >
              <Headphones className="w-4 h-4 text-purple-600 shrink-0" />
              <span>Add Audio Track</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function SectionCard({
  section,
  sectionIndex,
  totalSections,
  questions,
  allQuestions,
  readingSets,
  allReadingSets,
  allSections,
  errors,
  onUpdateSection,
  onDeleteSection,
  onDuplicateSection,
  onMoveSectionUp,
  onMoveSectionDown,
  onAddQuestionToSection,
  onAddReadingPassageToSection,
  onOpenImportModalToSection,
  onUpdateQuestion,
  onDuplicateQuestion,
  onDeleteQuestion,
  onMoveQuestionUp,
  onMoveQuestionDown,
  onRequestChangeType,
  onMoveQuestionToSection,
  onUpdateReadingSet,
  onDeleteReadingSet,
  onDuplicateReadingSet,
  onMoveReadingSetUp,
  onMoveReadingSetDown,
  onAddQuestionToSet,
}: SectionCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showAudioUpload, setShowAudioUpload] = useState(Boolean(section.audioId));

  // Points in this section
  const sectionPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);

  // Errors for this section
  const sectionErrors = errors.filter(
    (e) => e.sectionId === section.id || (e.field.startsWith('section') && e.sectionId === section.id)
  );
  const titleErrors = sectionErrors.filter((e) => e.field === 'section_title');
  const instructionsErrors = sectionErrors.filter((e) => e.field === 'section_instructions');

  // Type Icon helper
  const getTypeBadge = (type: SectionType) => {
    switch (type) {
      case 'Listening':
        return {
          icon: <Headphones className="w-4 h-4 text-purple-600" />,
          color: 'bg-purple-100/90 text-purple-800 border-purple-300',
          accent: 'border-purple-300',
        };
      case 'Reading':
        return {
          icon: <BookOpen className="w-4 h-4 text-emerald-600" />,
          color: 'bg-emerald-100/90 text-emerald-800 border-emerald-300',
          accent: 'border-emerald-300',
        };
      case 'Grammar':
        return {
          icon: <SpellCheck className="w-4 h-4 text-blue-600" />,
          color: 'bg-blue-100/90 text-blue-800 border-blue-300',
          accent: 'border-blue-300',
        };
      case 'Vocabulary':
        return {
          icon: <Languages className="w-4 h-4 text-amber-600" />,
          color: 'bg-amber-100/90 text-amber-800 border-amber-300',
          accent: 'border-amber-300',
        };
      case 'Writing':
        return {
          icon: <PenTool className="w-4 h-4 text-rose-600" />,
          color: 'bg-rose-100/90 text-rose-800 border-rose-300',
          accent: 'border-rose-300',
        };
      case 'General':
      case 'Custom':
      default:
        return {
          icon: <FolderTree className="w-4 h-4 text-orange-600" />,
          color: 'bg-orange-100/90 text-orange-800 border-orange-300',
          accent: 'border-orange-300',
        };
    }
  };

  const typeConfig = getTypeBadge(section.type);

  // Standalone questions inside this section (not attached to reading sets in this section)
  const standaloneQuestions = questions.filter((q) => !q.readingSetId);

  return (
    <div
      id={`section-${section.id}`}
      className="bg-[#FCFCFA] rounded-2xl border-2 border-orange-200/90 shadow-xs transition-all duration-200"
    >
      {/* Section Header */}
      <div className="bg-[#FAFBFD] border-b border-[#DCE4EE] px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#173B72] text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
            {sectionIndex + 1}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-2xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border flex items-center gap-1.5 ${typeConfig.color}`}
              >
                {typeConfig.icon}
                <span>{section.type}</span>
              </span>
              <span className="text-2xs font-medium text-slate-500 font-mono">
                {questions.length} {questions.length === 1 ? 'question' : 'questions'} · {sectionPoints}{' '}
                {sectionPoints === 1 ? 'pt' : 'pts'}
              </span>
              {section.audioId && (
                <span className="text-3xs font-mono bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded flex items-center gap-1 font-semibold">
                  <Volume2 className="w-3 h-3" />
                  <span>Audio</span>
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-[#173B72] truncate max-w-[280px] sm:max-w-md mt-0.5">
              {section.title.trim() || `Section ${sectionIndex + 1}`}
            </h3>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          {/* Move Section Up */}
          <button
            type="button"
            disabled={sectionIndex === 0}
            onClick={() => onMoveSectionUp(sectionIndex)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Move section up"
          >
            <ChevronUp className="w-4 h-4" />
          </button>

          {/* Move Section Down */}
          <button
            type="button"
            disabled={sectionIndex === totalSections - 1}
            onClick={() => onMoveSectionDown(sectionIndex)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Move section down"
          >
            <ChevronDown className="w-4 h-4" />
          </button>

          {/* Duplicate Section */}
          <button
            type="button"
            onClick={() => onDuplicateSection(section.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
            title="Duplicate section with all questions"
          >
            <Copy className="w-4 h-4" />
          </button>

          {/* Delete Section */}
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            title="Delete section"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Collapse/Expand Toggle */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="ml-1 text-xs font-semibold text-orange-700 hover:text-orange-800 bg-white border border-orange-300 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
          >
            {isCollapsed ? 'Expand' : 'Collapse'}
          </button>
        </div>
      </div>

      {/* Section Content */}
      {!isCollapsed && (
        <div className="p-4 sm:p-6 space-y-6">
          {/* Section Metadata Inputs */}
          <div className="space-y-4 bg-orange-50/20 p-4 sm:p-5 rounded-xl border border-orange-100">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Title */}
              <div className="md:col-span-2">
                <label
                  htmlFor={`section-title-${section.id}`}
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
                >
                  Section Title <span className="text-rose-500">*</span>
                </label>
                <input
                  id={`section-title-${section.id}`}
                  type="text"
                  value={section.title}
                  onChange={(e) =>
                    onUpdateSection({ ...section, title: e.target.value })
                  }
                  placeholder="e.g. Part 1: Listening Comprehension"
                  className={`w-full px-3.5 py-2 text-sm bg-white rounded-xl border focus:outline-none transition-colors font-medium text-slate-800 ${
                    titleErrors.length > 0
                      ? 'border-rose-400 focus:border-rose-500'
                      : 'border-[#DCE4EE] focus:border-orange-500 focus:ring-1 focus:ring-orange-500'
                  }`}
                />
                {titleErrors.map((err, i) => (
                  <p key={i} className="text-xs text-rose-500 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {err.message}
                  </p>
                ))}
              </div>

              {/* Section Type Selector */}
              <div>
                <label
                  htmlFor={`section-type-${section.id}`}
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
                >
                  Section Type
                </label>
                <select
                  id={`section-type-${section.id}`}
                  value={section.type}
                  onChange={(e) => {
                    const newType = e.target.value as SectionType;
                    onUpdateSection({
                      ...section,
                      type: newType,
                    });
                  }}
                  className="w-full px-3.5 py-2 text-sm bg-white rounded-xl border border-[#DCE4EE] focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition-colors font-semibold text-slate-800 cursor-pointer shadow-2xs"
                >
                  {SUPPORTED_SECTION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Instructions */}
            <div>
              <label
                htmlFor={`section-instructions-${section.id}`}
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1"
              >
                Section Instructions <span className="text-slate-400 font-normal lowercase">(optional)</span>
              </label>
              <textarea
                id={`section-instructions-${section.id}`}
                rows={2}
                value={section.instructions || ''}
                onChange={(e) =>
                  onUpdateSection({ ...section, instructions: e.target.value })
                }
                placeholder="Instructions shown to students at the beginning of this section..."
                className="w-full px-3.5 py-2 text-sm bg-white rounded-xl border border-[#DCE4EE] focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition-colors font-medium text-slate-800"
              />
              {instructionsErrors.map((err, i) => (
                <p key={i} className="text-xs text-rose-500 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {err.message}
                </p>
              ))}
            </div>

            {/* Section Audio Track: shown if section has audio or user requested via menu */}
            {(showAudioUpload || section.audioId) && (
              <div className="pt-2">
                <div className="bg-white p-3.5 rounded-xl border border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-purple-800 flex items-center gap-1.5">
                      <Headphones className="w-4 h-4 text-purple-600" />
                      <span>Section Audio Track</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAudioUpload(false);
                        if (section.audioId) {
                          onUpdateSection({
                            ...section,
                            audioId: undefined,
                            audioMetadata: undefined,
                          });
                        }
                      }}
                      className="text-2xs text-rose-600 hover:underline cursor-pointer"
                    >
                      {section.audioId ? 'Remove audio' : 'Cancel'}
                    </button>
                  </div>
                  <AssessmentAudioUpload
                    audioId={section.audioId}
                    audioMetadata={section.audioMetadata}
                    onChangeAudio={(aId, aMeta) =>
                      onUpdateSection({
                        ...section,
                        audioId: aId,
                        audioMetadata: aMeta,
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* Reading Passages attached to this Section */}
          {readingSets.length > 0 && (
            <div className="space-y-4">
              {readingSets.map((rs, rIdx) => {
                const rsChildQuestions = questions.filter((q) => q.readingSetId === rs.id);
                return (
                  <ReadingSetCard
                    key={`rs_${rs.id}`}
                    readingSet={rs}
                    setIndex={rIdx}
                    totalReadingSets={readingSets.length}
                    questions={rsChildQuestions}
                    allReadingSets={allReadingSets}
                    errors={errors}
                    section={section}
                    sectionTotalQuestions={questions.length}
                    sectionTotalPoints={sectionPoints}
                    onUpdateReadingSet={onUpdateReadingSet}
                    onDeleteReadingSet={onDeleteReadingSet}
                    onDuplicateReadingSet={onDuplicateReadingSet}
                    onMoveReadingSetUp={onMoveReadingSetUp}
                    onMoveReadingSetDown={onMoveReadingSetDown}
                    onAddQuestionToSet={onAddQuestionToSet}
                    onUpdateQuestion={onUpdateQuestion}
                    onDuplicateQuestion={onDuplicateQuestion}
                    onDeleteQuestion={onDeleteQuestion}
                    onMoveQuestionUp={onMoveQuestionUp}
                    onMoveQuestionDown={onMoveQuestionDown}
                    onRequestChangeType={onRequestChangeType}
                  />
                );
              })}
            </div>
          )}

          {/* Section Questions Toolbar */}
          <div className="space-y-4">
            {/* If there are standalone questions, show header and single content creation button */}
            {standaloneQuestions.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-[#DCE4EE]/70">
                <span className="text-2xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                  {readingSets.length > 0
                    ? `Additional Questions (${standaloneQuestions.length})`
                    : `Questions (${questions.length})`}
                </span>

                <SectionAddContentMenu
                  section={section}
                  onAddQuestion={() => onAddQuestionToSection(section.id)}
                  onAddReadingPassage={() => onAddReadingPassageToSection(section.id)}
                  onOpenImportModal={
                    onOpenImportModalToSection
                      ? () => onOpenImportModalToSection(section.id)
                      : undefined
                  }
                  onAddAudioTrack={() => setShowAudioUpload(true)}
                />
              </div>
            )}

            {/* When section has reading sets but NO standalone questions, show single toolbar button without repeating question count */}
            {readingSets.length > 0 && standaloneQuestions.length === 0 && (
              <div className="flex items-center justify-end pt-1 border-t border-slate-200/80">
                <SectionAddContentMenu
                  section={section}
                  onAddQuestion={() => onAddQuestionToSection(section.id)}
                  onAddReadingPassage={() => onAddReadingPassageToSection(section.id)}
                  onOpenImportModal={
                    onOpenImportModalToSection
                      ? () => onOpenImportModalToSection(section.id)
                      : undefined
                  }
                  onAddAudioTrack={() => setShowAudioUpload(true)}
                />
              </div>
            )}

            {/* Empty state when zero standalone questions and zero reading passages */}
            {standaloneQuestions.length === 0 && readingSets.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-[#DCE4EE] rounded-xl bg-slate-50/50">
                <p className="text-xs text-slate-500 font-medium">
                  No content in this section yet.
                </p>
                <div className="mt-3 flex items-center justify-center">
                  <SectionAddContentMenu
                    section={section}
                    onAddQuestion={() => onAddQuestionToSection(section.id)}
                    onAddReadingPassage={() => onAddReadingPassageToSection(section.id)}
                    onOpenImportModal={
                      onOpenImportModalToSection
                        ? () => onOpenImportModalToSection(section.id)
                        : undefined
                    }
                    onAddAudioTrack={() => setShowAudioUpload(true)}
                  />
                </div>
              </div>
            )}

            {standaloneQuestions.length > 0 && (
              <div className="space-y-4">
                {standaloneQuestions.map((q) => {
                  const globalIdx = allQuestions.findIndex((aq) => aq.id === q.id);
                  return (
                    <QuestionCard
                      key={q.id}
                      question={q}
                      index={globalIdx >= 0 ? globalIdx : q.order - 1}
                      totalQuestions={allQuestions.length}
                      errors={errors}
                      readingSets={allReadingSets}
                      sections={allSections}
                      onUpdate={onUpdateQuestion}
                      onDuplicate={onDuplicateQuestion}
                      onDelete={onDeleteQuestion}
                      onMoveUp={() => onMoveQuestionUp(q.id)}
                      onMoveDown={() => onMoveQuestionDown(q.id)}
                      onRequestChangeType={onRequestChangeType}
                      onMoveToSection={onMoveQuestionToSection}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete assessment section?"
        description={`Are you sure you want to delete "${
          section.title || `Section ${sectionIndex + 1}`
        }"?\n\nThis section has ${
          questions.length
        } question${
          questions.length === 1 ? '' : 's'
        }.\n\nTo protect against accidental question loss, you can either keep its questions (moving them to another section) or remove the section.`}
        confirmText="Delete Section & Keep Questions"
        cancelText="Cancel"
        confirmVariant="danger"
        onConfirm={() => {
          setShowDeleteConfirm(false);
          onDeleteSection(section.id);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
