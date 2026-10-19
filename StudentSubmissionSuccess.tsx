/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Test } from '../../types/test';
import { TestSession, isQuestionAnswered } from '../../types/student';
import { Button } from '../ui/Button';
import { CheckCircle2, ArrowLeft, ArrowRight, User, Calendar, FileText } from 'lucide-react';

interface StudentSubmissionSuccessProps {
  test: Test;
  session: TestSession;
  onExit: () => void;
  isSharedStudent?: boolean;
  onViewResults?: () => void;
}

export function StudentSubmissionSuccess({
  test,
  session,
  onExit,
  isSharedStudent,
  onViewResults,
}: StudentSubmissionSuccessProps) {
  const formattedSubmissionDate = session.submittedAt
    ? new Date(session.submittedAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : new Date().toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });

  const canShowResults = Boolean(test.settings?.showResultsAfterSubmission && onViewResults);

  const totalQuestions = test.questions.length;
  const answeredCount = test.questions.filter((q) =>
    isQuestionAnswered(session.answers?.[q.id])
  ).length;

  return (
    <div className="min-h-screen bg-[#F3F6FA] flex flex-col justify-between">
      {/* Header */}
      <header className="bg-[#FCFCFA] border-b border-[#DCE4EE] shadow-2xs">
        <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-[#173B72] text-sm sm:text-base tracking-tight">
              Assess<span className="text-orange-500">ora</span>
            </span>
            <span className="text-2xs font-semibold px-1.5 py-0.2 rounded-md bg-[#EEF5FF] text-[#2563EB] border border-blue-200">
              Student
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F7F9FC] border border-[#DCE4EE] text-slate-700">
            <User className="w-3.5 h-3.5 text-[#2563EB]" />
            <span className="text-xs font-semibold truncate max-w-[120px] sm:max-w-[160px]">
              {session.studentName}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="bg-[#FCFCFA] rounded-2xl border border-[#DCE4EE] p-6 sm:p-10 max-w-lg w-full text-center space-y-6 shadow-sm">
          {/* Success Icon */}
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-2xs ring-8 ring-emerald-50/60">
            <CheckCircle2 className="w-9 h-9 stroke-[2.2]" />
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            <span className="text-2xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded-full border border-emerald-200/80">
              Submission Confirmed
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#173B72] tracking-tight pt-1">
              Test Submitted
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
              Your test has been successfully submitted and your answers have been recorded.
            </p>
          </div>

          {/* Summary Details Grid */}
          <div className="bg-[#F7F9FC] rounded-xl border border-[#DCE4EE] p-4 text-left space-y-3">
            <div className="flex items-start justify-between gap-3 text-xs py-1 border-b border-[#DCE4EE]/70">
              <span className="text-slate-500 flex items-center gap-1.5 shrink-0">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Student Name
              </span>
              <span className="font-bold text-[#173B72] text-right truncate">
                {session.studentName}
              </span>
            </div>

            <div className="flex items-start justify-between gap-3 text-xs py-1 border-b border-[#DCE4EE]/70">
              <span className="text-slate-500 flex items-center gap-1.5 shrink-0">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Assessment
              </span>
              <span className="font-bold text-[#173B72] text-right truncate">
                {test.title || 'Untitled Assessment'}
              </span>
            </div>

            <div className="flex items-start justify-between gap-3 text-xs py-1 border-b border-[#DCE4EE]/70">
              <span className="text-slate-500 flex items-center gap-1.5 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                Answers Submitted
              </span>
              <span className="font-bold text-[#173B72] text-right font-mono">
                {answeredCount} / {totalQuestions}
              </span>
            </div>

            <div className="flex items-start justify-between gap-3 text-xs py-1">
              <span className="text-slate-500 flex items-center gap-1.5 shrink-0">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Submitted At
              </span>
              <span className="font-bold text-[#173B72] text-right">
                {formattedSubmissionDate}
              </span>
            </div>
          </div>

          {!canShowResults && (
            <p className="text-3xs sm:text-2xs text-slate-400 leading-relaxed max-w-sm mx-auto">
              Results for this assessment will be reviewed by your teacher and are not published immediately.{' '}
              {isSharedStudent
                ? 'Your test submission is complete.'
                : 'You may now safely return to the dashboard.'}
            </p>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            {canShowResults && (
              <Button
                variant="primary"
                size="md"
                className="w-full sm:flex-1 justify-center"
                onClick={onViewResults}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                View Results
              </Button>
            )}
            <Button
              variant={canShowResults ? 'outline' : 'primary'}
              size="md"
              className={canShowResults ? 'w-full sm:flex-1 justify-center' : 'w-full justify-center'}
              onClick={onExit}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              {isSharedStudent ? 'Back to Test Overview' : 'Return to Dashboard'}
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-3xs text-slate-400 border-t border-[#DCE4EE]/60 bg-[#FCFCFA]">
        Assessora by GYTama EDU — Submission recorded securely
      </footer>
    </div>
  );
}
