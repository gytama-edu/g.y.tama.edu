/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Test } from '../../types/test';
import { TestSession } from '../../types/student';
import { Button } from '../ui/Button';
import { getCategoryById } from '../../utils/categoryStorage';
import {
  loadActiveStudentSession,
  loadAllSessionsForTest,
} from '../../utils/studentSession';
import { formatAccessCodeDisplay } from '../../utils/testAccess';
import {
  ArrowRight,
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Clock,
  CheckCircle2,
  FileText,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Layers,
  KeyRound,
  Headphones,
} from 'lucide-react';

interface StudentStartScreenProps {
  test: Test;
  onStartTest: (studentName: string) => void;
  onExit: () => void;
  isSharedStudent?: boolean;
  shareCode?: string | null;
  onResumeSession?: (session: TestSession) => void;
}

const LOCAL_STORAGE_STUDENT_NAME_KEY = 'assessora_student_name';

export function StudentStartScreen({
  test,
  onStartTest,
  onExit,
  isSharedStudent,
  shareCode,
  onResumeSession,
}: StudentStartScreenProps) {
  // Prepopulate student name from localStorage if available
  const [name, setName] = useState<string>(() => {
    try {
      return localStorage.getItem(LOCAL_STORAGE_STUDENT_NAME_KEY) || '';
    } catch {
      return '';
    }
  });

  const [error, setError] = useState<string | null>(null);

  // Look up Category information for display
  const category = useMemo(() => {
    if (!test.categoryId) return null;
    return getCategoryById(test.categoryId);
  }, [test.categoryId]);

  // Check for any existing active/in-progress session
  const activeSession = useMemo(() => {
    return loadActiveStudentSession(test);
  }, [test]);

  // Check for past sessions
  const pastSessions = useMemo(() => {
    const all = loadAllSessionsForTest(test.id);
    return all.filter((s) => s.status === 'submitted');
  }, [test.id]);

  const questionCount = test.questions.length;
  const totalPoints = test.questions.reduce((sum, q) => sum + (q.points || 1), 0);
  const isZeroQuestions = questionCount === 0;

  const readingSetsCount = test.readingSets?.length || 0;
  const isTimed = Boolean(
    test.settings?.timeLimitEnabled &&
      typeof test.settings?.timeLimitMinutes === 'number' &&
      test.settings.timeLimitMinutes > 0
  );

  const displayCode = formatAccessCodeDisplay(
    shareCode || test.access?.accessCode || null
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isZeroQuestions) return;

    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter your full name before starting the assessment.');
      return;
    }

    try {
      localStorage.setItem(LOCAL_STORAGE_STUDENT_NAME_KEY, trimmed);
    } catch {
      // storage quota safe
    }

    setError(null);
    onStartTest(trimmed);
  };

  const handleResume = () => {
    if (activeSession && onResumeSession) {
      onResumeSession(activeSession);
    } else if (activeSession) {
      onStartTest(activeSession.studentName || name.trim() || 'Student');
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F6FA] flex flex-col justify-between p-3 sm:p-6 lg:p-8 w-full max-w-full overflow-x-hidden">
      {/* Top Header */}
      <header className="max-w-2xl w-full mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3 py-1.5 sm:py-2">
        {/* Branding & Status (Desktop: Right / Mobile: Top) */}
        <div className="flex items-center justify-between sm:justify-end gap-1.5 order-1 sm:order-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="font-extrabold text-[#173B72] text-sm sm:text-base tracking-tight">
              Assess<span className="text-orange-500">ora</span>
            </span>
            <span className="hidden sm:inline-flex text-3xs sm:text-2xs font-semibold px-1.5 py-0.5 rounded bg-[#EEF5FF] text-[#2563EB] border border-blue-200">
              Student Assessment
            </span>
            <span className="sm:hidden text-3xs font-semibold px-1.5 py-0.5 rounded bg-[#EEF5FF] text-[#2563EB] border border-blue-200">
              Student
            </span>
          </div>

          {!isSharedStudent && (
            <button
              type="button"
              onClick={onExit}
              className="sm:hidden inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-[#173B72] transition-colors cursor-pointer p-1 rounded-lg hover:bg-slate-200/60"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Exit</span>
            </button>
          )}
        </div>

        {/* Access Code Display / Exit (Desktop: Left / Mobile: Bottom) */}
        {isSharedStudent ? (
          <div className="flex items-center justify-between sm:justify-start gap-2 order-2 sm:order-1 w-full sm:w-auto">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-[#DCE4EE] shadow-2xs shrink-0 max-w-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-2xs sm:text-xs font-mono font-bold text-[#173B72] truncate select-all">
                {displayCode ? `Code: ${displayCode}` : 'Live Link'}
              </span>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={onExit}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#173B72] transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-slate-200/60 order-2 sm:order-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Exit to Dashboard</span>
          </button>
        )}
      </header>

      {/* Main Card */}
      <main className="max-w-xl w-full mx-auto my-auto py-3 sm:py-6">
        <div className="bg-[#FCFCFA] rounded-2xl border border-[#DCE4EE] p-4 sm:p-8 shadow-xs space-y-4 sm:space-y-6 w-full">
          {/* Category & Status Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {category ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-2xs font-bold bg-[#EEF5FF] text-[#2563EB] border border-blue-200">
                <BookOpen className="w-3 h-3" />
                <span>{category.name}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-bold text-orange-600 bg-orange-50 border border-orange-200 uppercase tracking-wider">
                <span>Assessment Briefing</span>
              </span>
            )}

            {isSharedStudent && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>Verified Access</span>
              </span>
            )}

            {test.sections && test.sections.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-bold text-[#173B72] bg-[#EEF5FF] border border-blue-200">
                <Layers className="w-3 h-3 text-[#2563EB]" />
                <span>
                  {test.sections.length} {test.sections.length === 1 ? 'Section' : 'Sections'}
                </span>
              </span>
            )}
          </div>

          {/* Title & Description */}
          <div className="space-y-2 text-center">
            <h1 className="text-lg sm:text-2xl font-extrabold text-[#173B72] tracking-tight leading-snug break-words">
              {test.title || 'Untitled Assessment'}
            </h1>

            {test.description ? (
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto whitespace-pre-line break-words">
                {test.description}
              </p>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Read each question carefully and provide your best answer.
              </p>
            )}
          </div>

          {/* Test Meta Info (Questions, Time Limit, Total Points, Attempts) */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-3 py-3 border-y border-[#DCE4EE]">
            <div className="text-center p-2 sm:p-2.5 rounded-xl bg-[#F7F9FC] border border-[#DCE4EE]/70 flex flex-col justify-between">
              <span className="text-3xs font-bold uppercase tracking-wider text-slate-400 block leading-tight break-words">
                Questions
              </span>
              <span className="text-xs sm:text-base font-extrabold text-[#173B72] font-mono leading-tight my-0.5">
                {questionCount}
              </span>
              {readingSetsCount > 0 ? (
                <span className="block text-3xs text-blue-600 font-semibold leading-tight break-words">
                  +{readingSetsCount} Passage{readingSetsCount > 1 ? 's' : ''}
                </span>
              ) : (
                <span className="block text-3xs text-slate-400 leading-tight">
                  Total
                </span>
              )}
            </div>

            <div className="text-center p-2 sm:p-2.5 rounded-xl bg-[#F7F9FC] border border-[#DCE4EE]/70 flex flex-col justify-between">
              <span className="text-3xs font-bold uppercase tracking-wider text-slate-400 block leading-tight break-words">
                Time Limit
              </span>
              <span className="text-xs sm:text-base font-extrabold text-[#173B72] font-mono leading-tight my-0.5">
                {isTimed ? `${test.settings?.timeLimitMinutes} min` : 'Untimed'}
              </span>
              <span className="block text-3xs text-slate-400 leading-tight break-words">
                {isTimed ? 'Continuous' : 'Self-paced'}
              </span>
            </div>

            <div className="text-center p-2 sm:p-2.5 rounded-xl bg-[#F7F9FC] border border-[#DCE4EE]/70 flex flex-col justify-between">
              <span className="text-3xs font-bold uppercase tracking-wider text-slate-400 block leading-tight break-words">
                Total Value
              </span>
              <span className="text-xs sm:text-base font-extrabold text-[#173B72] font-mono leading-tight my-0.5">
                {totalPoints} {totalPoints === 1 ? 'pt' : 'pts'}
              </span>
              <span className="block text-3xs text-slate-400 leading-tight break-words">
                {test.settings?.attemptsAllowed
                  ? `${test.settings.attemptsAllowed} attempt`
                  : 'Single try'}
              </span>
            </div>
          </div>

          {/* Important Guidelines & Rules Box */}
          <div className="bg-[#F8FAFC] rounded-xl border border-[#DCE4EE]/80 p-3.5 space-y-2 text-left">
            <span className="text-2xs font-bold text-[#173B72] uppercase tracking-wider block">
              Test Guidelines
            </span>
            <ul className="space-y-1.5 text-2xs sm:text-xs text-slate-600">
              {isTimed && (
                <li className="flex items-start gap-2">
                  <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Timed Assessment:</strong> Countdown starts immediately once you click Start Test and cannot be paused.
                  </span>
                </li>
              )}
              {test.settings?.requireAllQuestions ? (
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>All Questions Required:</strong> Every question must be answered before submission.
                  </span>
                </li>
              ) : (
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Free Navigation:</strong> You can move forward and backward between questions at any time.
                  </span>
                </li>
              )}
              {test.settings?.shuffleQuestions && (
                <li className="flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Randomized:</strong> Question order is randomized for each student.
                  </span>
                </li>
              )}
              <li className="flex items-start gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Automatic Saving:</strong> Your answers are saved automatically as you navigate.
                </span>
              </li>
            </ul>
          </div>

          {/* In-Progress Session Resume Banner */}
          {activeSession && activeSession.status === 'active' && (
            <div className="rounded-xl border border-blue-200 bg-[#EEF5FF] p-3.5 text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-bold uppercase tracking-wider text-[#2563EB]">
                  In-Progress Assessment Found
                </span>
                <span className="text-3xs text-slate-500 font-medium">
                  {Object.keys(activeSession.answers || {}).length} of {questionCount} answered
                </span>
              </div>
              <p className="text-xs text-[#173B72]">
                You have an active session in progress for <strong>{activeSession.studentName}</strong>. You can resume where you left off.
              </p>
              <div className="pt-1 flex gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleResume}
                  className="flex-1 justify-center text-xs"
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Resume Assessment
                </Button>
              </div>
            </div>
          )}

          {/* Zero questions warning */}
          {isZeroQuestions ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center space-y-2">
              <div className="flex items-center justify-center gap-1.5 text-amber-800 font-bold text-xs">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>This test has no questions yet.</span>
              </div>
              <p className="text-2xs text-amber-700">
                The author has not added questions to this assessment yet. Please contact your instructor.
              </p>
              <div className="pt-2">
                {isSharedStudent ? (
                  <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                    Refresh Assessment
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={onExit}>
                    Return to Dashboard
                  </Button>
                )}
              </div>
            </div>
          ) : (
            /* Student Name Input Form */
            <form onSubmit={handleSubmit} className="space-y-4 pt-1">
              <div className="space-y-1.5 text-left">
                <label
                  htmlFor="studentNameInput"
                  className="block text-xs font-bold text-[#173B72]"
                >
                  Enter Your Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="studentNameInput"
                  type="text"
                  autoFocus={!name}
                  placeholder="e.g. Alex Morgan"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError(null);
                  }}
                  className={`w-full px-3.5 py-2.5 text-sm bg-white border rounded-xl text-[#172033] placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                    error
                      ? 'border-rose-400 focus:ring-rose-200 focus:border-rose-500'
                      : 'border-[#DCE4EE] focus:ring-blue-100 focus:border-[#2563EB]'
                  }`}
                />
                {error ? (
                  <p className="flex items-center gap-1 text-2xs text-rose-600 font-medium pt-0.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{error}</span>
                  </p>
                ) : (
                  <p className="text-3xs text-slate-400">
                    Your name will appear on your test results and instructor reports.
                  </p>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full justify-center text-sm font-bold shadow-xs cursor-pointer"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                {activeSession ? 'Start Fresh Assessment' : 'Start Test'}
              </Button>
            </form>
          )}
        </div>
      </main>

      {/* Brand Footer */}
      <footer className="text-center py-3 sm:py-4 text-3xs text-slate-400">
        Assessora by GYTama EDU — Confidential Student Examination
      </footer>
    </div>
  );
}
