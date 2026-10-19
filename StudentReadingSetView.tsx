/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ReadingSet, Question } from '../../types/test';
import { StudentAnswer } from '../../types/student';
import { StudentQuestionView } from './StudentQuestionView';
import { StudentAudioPlayer } from './StudentAudioPlayer';
import { BookOpen, Info, Quote, Type, X, ChevronDown, ChevronUp, Maximize2 } from 'lucide-react';

interface StudentReadingSetViewProps {
  readingSet: ReadingSet;
  setIndex: number;
  questions: Question[];
  allQuestions: Question[];
  answers: Record<string, StudentAnswer>;
  disabled?: boolean;
  onAnswerChange: (questionId: string, answer: StudentAnswer) => void;
  activeQuestionId?: string;
  onSelectQuestion?: (questionId: string) => void;
}

export function StudentReadingSetView({
  readingSet,
  setIndex,
  questions,
  allQuestions,
  answers,
  disabled = false,
  onAnswerChange,
  activeQuestionId,
  onSelectQuestion,
}: StudentReadingSetViewProps) {
  const [fontSize, setFontSize] = useState<'normal' | 'large'>('normal');
  const [mobilePassageOpen, setMobilePassageOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'passage' | 'question'>('question');
  const [viewMode, setViewMode] = useState<'focus' | 'all'>('focus');

  // Identify active question
  const currentQ = useMemo(() => {
    return questions.find((q) => q.id === activeQuestionId) || questions[0];
  }, [questions, activeQuestionId]);

  // Auto-scroll to active question if in all questions view
  useEffect(() => {
    if (activeQuestionId && viewMode === 'all') {
      const el = document.getElementById(`student-question-${activeQuestionId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [activeQuestionId, viewMode]);

  // Calculate question range (e.g. Questions 2–5)
  const questionIndices = questions.map((q) => {
    const idx = allQuestions.findIndex((item) => item.id === q.id);
    return idx >= 0 ? idx + 1 : q.order || 1;
  });
  const minQNum = questionIndices.length > 0 ? Math.min(...questionIndices) : 1;
  const maxQNum = questionIndices.length > 0 ? Math.max(...questionIndices) : 1;
  const rangeText =
    minQNum === maxQNum
      ? `Question ${minQNum}`
      : `Questions ${minQNum}–${maxQNum}`;

  const wordCount = (readingSet.passage || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return (
    <div className="w-full relative space-y-4">
      {/* Mobile Tab Switcher (Passage vs Question) */}
      <div className="lg:hidden flex items-center p-1 bg-slate-200/80 rounded-xl border border-slate-300">
        <button
          type="button"
          onClick={() => setMobileTab('passage')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === 'passage'
              ? 'bg-white text-[#173B72] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-4 h-4 text-emerald-600" />
          <span>Read Passage</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('question')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === 'question'
              ? 'bg-white text-[#173B72] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Answer Question</span>
          <span className="w-2 h-2 rounded-full bg-blue-600" />
        </button>
      </div>

      {/* Main Grid: Desktop 2-columns (Passage + Questions) / Mobile single-column */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ==================================================== */}
        {/* LEFT COLUMN: READING PASSAGE (Sticky on Desktop)     */}
        {/* ==================================================== */}
        <section
          aria-labelledby={`reading-heading-${readingSet.id}`}
          className={`lg:col-span-5 xl:col-span-5 bg-[#FCFCFA] rounded-2xl border border-emerald-200 shadow-2xs lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-8rem)] flex flex-col overflow-hidden ${
            mobileTab === 'passage' ? 'block' : 'hidden lg:flex'
          }`}
        >
          {/* Passage Header */}
          <div className="bg-gradient-to-r from-emerald-50 via-[#FCFCFA] to-white border-b border-emerald-200 p-4 sm:p-5 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-3xs font-mono font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded border border-emerald-300">
                    Passage {setIndex + 1}
                  </span>
                  <span className="text-3xs font-mono text-slate-500 font-semibold">
                    {rangeText}
                  </span>
                </div>
                <h2
                  id={`reading-heading-${readingSet.id}`}
                  className="text-base sm:text-lg font-extrabold text-[#173B72] tracking-tight truncate mt-0.5"
                >
                  {readingSet.title}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Accessibility text resize */}
              <button
                type="button"
                onClick={() =>
                  setFontSize((prev) => (prev === 'normal' ? 'large' : 'normal'))
                }
                title={
                  fontSize === 'normal'
                    ? 'Increase reading font size'
                    : 'Reset font size'
                }
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors flex items-center gap-1 text-xs font-mono cursor-pointer"
              >
                <Type className="w-3.5 h-3.5" />
                <span className="text-3xs font-bold">
                  {fontSize === 'normal' ? 'A+' : 'A'}
                </span>
              </button>
            </div>
          </div>

          {/* Optional Instructions */}
          {readingSet.instructions && (
            <div className="bg-emerald-50/60 px-4 sm:px-5 py-2.5 border-b border-emerald-100 text-xs text-emerald-900 flex items-start gap-2 shrink-0">
              <Info className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span className="italic leading-relaxed">{readingSet.instructions}</span>
            </div>
          )}

          {/* Attached Passage Audio (Module 16) */}
          {readingSet.audioId && (
            <div className="p-3 border-b border-emerald-100 bg-emerald-50/30">
              <StudentAudioPlayer
                key={`rs_audio_${readingSet.id}_${readingSet.audioId}`}
                audioId={readingSet.audioId}
                audioMetadata={readingSet.audioMetadata}
                instructions="Audio for this passage"
              />
            </div>
          )}

          {/* Scrollable Passage Body */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 scrollbar-thin">
            <div
              className={`text-slate-800 whitespace-pre-wrap leading-relaxed select-text font-serif ${
                fontSize === 'large'
                  ? 'text-base sm:text-lg space-y-4'
                  : 'text-sm sm:text-base space-y-3'
              }`}
            >
              {readingSet.passage}
            </div>

            {/* Optional Source Citation */}
            {readingSet.source && (
              <div className="mt-6 pt-4 border-t border-slate-200/80 flex items-start gap-2 text-2xs text-slate-500 italic">
                <Quote className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                <span>Source: {readingSet.source}</span>
              </div>
            )}

            {/* Word count indicator */}
            {wordCount > 0 && (
              <div className="mt-4 pt-2 text-right">
                <span className="text-3xs font-mono text-slate-400">
                  {wordCount} words
                </span>
              </div>
            )}
          </div>

          {/* Mobile Bottom Switcher Button */}
          <div className="lg:hidden p-3 bg-white border-t border-emerald-200">
            <button
              type="button"
              onClick={() => setMobileTab('question')}
              className="w-full py-2.5 bg-[#173B72] hover:bg-[#122e59] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Answer Question Now</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* ==================================================== */}
        {/* RIGHT COLUMN: QUESTIONS                             */}
        {/* ==================================================== */}
        <section
          aria-label={`Questions for ${readingSet.title}`}
          className={`lg:col-span-7 xl:col-span-7 space-y-4 ${
            mobileTab === 'question' ? 'block' : 'hidden lg:block'
          }`}
        >
          {/* Quick Passage Reference Strip on Mobile */}
          <div className="lg:hidden bg-emerald-50/90 border border-emerald-200 rounded-xl p-3 flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <BookOpen className="w-4 h-4 text-emerald-700 shrink-0" />
              <span className="text-xs font-bold text-[#173B72] truncate">
                {readingSet.title}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setMobilePassageOpen(true)}
              className="px-2.5 py-1 bg-white border border-emerald-300 text-emerald-800 text-2xs font-bold rounded-lg shrink-0 hover:bg-emerald-50 cursor-pointer shadow-2xs"
            >
              Read Passage
            </button>
          </div>

          {/* Questions Tabs Toolbar */}
          <div className="bg-[#FCFCFA] rounded-xl border border-[#DCE4EE] p-3 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0">
              <span className="text-2xs font-extrabold uppercase text-[#173B72] tracking-wider mr-1 hidden sm:inline">
                Passage Questions:
              </span>
              {questions.map((q, qIdx) => {
                const globalIndex = allQuestions.findIndex((item) => item.id === q.id);
                const displayQNum = globalIndex >= 0 ? globalIndex + 1 : q.order || qIdx + 1;
                const isSelected = q.id === currentQ?.id;
                const isAnswered = Boolean(answers[q.id]);

                return (
                  <button
                    key={`passage_tab_${q.id}`}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      if (onSelectQuestion) {
                        onSelectQuestion(q.id);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-[#173B72] text-white shadow-2xs ring-2 ring-blue-300'
                        : isAnswered
                        ? 'bg-blue-50 text-[#2563EB] border border-blue-200 hover:bg-blue-100'
                        : 'bg-white text-slate-600 border border-[#DCE4EE] hover:bg-slate-50'
                    }`}
                    title={`Question ${displayQNum}${isAnswered ? ' (Answered)' : ' (Unanswered)'}`}
                  >
                    <span>Q{displayQNum}</span>
                    {isAnswered && !isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Toggle: Focus View vs View All */}
            <button
              type="button"
              onClick={() => setViewMode(viewMode === 'focus' ? 'all' : 'focus')}
              className="text-2xs font-semibold text-slate-500 hover:text-[#173B72] transition-colors cursor-pointer px-2 py-0.5 rounded hover:bg-slate-100"
            >
              {viewMode === 'focus' ? 'View all questions' : 'Focus single question'}
            </button>
          </div>

          {/* Focused Question View (Default) */}
          {viewMode === 'focus' && currentQ ? (
            <div id={`student-question-${currentQ.id}`}>
              <StudentQuestionView
                key={currentQ.id}
                question={currentQ}
                questionNumber={
                  allQuestions.findIndex((item) => item.id === currentQ.id) + 1 ||
                  currentQ.order ||
                  1
                }
                totalQuestions={allQuestions.length}
                answer={answers[currentQ.id]}
                disabled={disabled}
                onAnswerChange={(ans) => onAnswerChange(currentQ.id, ans)}
              />
            </div>
          ) : (
            /* All Questions View */
            <div className="space-y-6">
              {questions.map((question, qIdx) => {
                const globalIndex = allQuestions.findIndex(
                  (item) => item.id === question.id
                );
                const displayQNum =
                  globalIndex >= 0 ? globalIndex + 1 : question.order || qIdx + 1;
                const isTargeted = activeQuestionId === question.id;

                return (
                  <div
                    key={question.id}
                    id={`student-question-${question.id}`}
                    className={`transition-all duration-200 rounded-2xl ${
                      isTargeted
                        ? 'ring-2 ring-emerald-500 ring-offset-2'
                        : ''
                    }`}
                  >
                    <StudentQuestionView
                      question={question}
                      questionNumber={displayQNum}
                      totalQuestions={allQuestions.length}
                      answer={answers[question.id]}
                      disabled={disabled}
                      onAnswerChange={(ans) => onAnswerChange(question.id, ans)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Floating Action Button on Mobile to Reopen Reading Passage Drawer */}
      <div className="lg:hidden fixed bottom-5 right-5 z-40">
        <button
          type="button"
          onClick={() => setMobilePassageOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-lg rounded-full px-4 py-2.5 flex items-center gap-2 font-bold text-xs border border-emerald-500 transition-all cursor-pointer"
        >
          <BookOpen className="w-4 h-4" />
          <span>View Passage</span>
          <Maximize2 className="w-3.5 h-3.5 text-emerald-200" />
        </button>
      </div>

      {/* Mobile Reading Passage Drawer / Modal */}
      {mobilePassageOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#FCFCFA] rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl border-t border-emerald-300 overflow-hidden">
            {/* Drawer Header */}
            <div className="p-4 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 border-b border-emerald-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-3xs font-mono font-extrabold uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                    Reading {setIndex + 1}
                  </span>
                  <h3 className="text-sm font-bold text-[#173B72] truncate mt-0.5">
                    {readingSet.title}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setFontSize((prev) =>
                      prev === 'normal' ? 'large' : 'normal'
                    )
                  }
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-emerald-50 text-xs font-mono font-bold"
                  title="Toggle font size"
                >
                  {fontSize === 'normal' ? 'A+' : 'A'}
                </button>
                <button
                  type="button"
                  onClick={() => setMobilePassageOpen(false)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                  aria-label="Close passage modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Instructions */}
            {readingSet.instructions && (
              <div className="bg-emerald-50/60 px-4 py-2 border-b border-emerald-100 text-xs text-emerald-900 flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="italic">{readingSet.instructions}</span>
              </div>
            )}

            {/* Drawer Passage Text */}
            <div className="p-5 overflow-y-auto flex-1 font-serif text-slate-900 whitespace-pre-line leading-relaxed select-text text-sm sm:text-base space-y-3">
              {readingSet.passage}

              {readingSet.source && (
                <div className="mt-5 pt-3 border-t border-slate-200 text-2xs text-slate-500 italic flex items-center gap-1.5">
                  <Quote className="w-3 h-3 text-slate-400" />
                  <span>Source: {readingSet.source}</span>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between">
              <span className="text-3xs font-mono text-slate-400">
                {wordCount} words
              </span>
              <button
                type="button"
                onClick={() => setMobilePassageOpen(false)}
                className="px-4 py-1.5 bg-[#173B72] hover:bg-[#122e59] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                Back to Questions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
