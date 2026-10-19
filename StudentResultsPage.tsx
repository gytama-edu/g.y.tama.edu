/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { Test, Question } from '../../types/test';
import { TestSession, isQuestionAnswered } from '../../types/student';
import { loadGradingResult } from '../../utils/gradingStorage';
import {
  getStudentAnswerDisplay,
  getCorrectAnswerDisplay,
  formatGradedTimestamp,
} from '../../utils/results';
import { Button } from '../ui/Button';
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  ArrowLeft,
  User,
  Clock,
  FileText,
  FileCheck,
  BookOpen,
  Headphones,
  Layers,
  Tag,
  PenTool,
  AlertCircle,
} from 'lucide-react';
import { resolveSectionsForTest } from '../../utils/sectionHelpers';

interface StudentResultsPageProps {
  test: Test;
  session: TestSession;
  onExit: () => void;
  isSharedStudent?: boolean;
  onViewSubmissionReceipt?: () => void;
}

export function StudentResultsPage({
  test,
  session,
  onExit,
  isSharedStudent,
  onViewSubmissionReceipt,
}: StudentResultsPageProps) {
  const [expandedPassageIds, setExpandedPassageIds] = useState<Record<string, boolean>>({});

  // Locate the saved GradingResult produced by Module 7 using testId and sessionId
  const sessionId =
    session.id ||
    `${session.testId}_${encodeURIComponent(session.studentName)}_${session.startedAt}`;

  const gradingResult = useMemo(() => {
    if (!test || !session) return null;
    const res = loadGradingResult(test.id, sessionId);
    // Ensure the result strictly matches this test and this session
    if (
      res &&
      res.testId === test.id &&
      (res.sessionId === sessionId || res.id === `grading_${sessionId}`)
    ) {
      return res;
    }
    return null;
  }, [test, session, sessionId]);

  const showCorrectAnswers = Boolean(
    test.settings?.showCorrectAnswersAfterSubmission
  );

  // ----------------------------------------------------
  // State 1: Missing or Unmatched Grading Result
  // (Module 8 rule: Do NOT calculate or invent a score)
  // ----------------------------------------------------
  if (!gradingResult) {
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
                Results
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F7F9FC] border border-[#DCE4EE] text-slate-700">
              <User className="w-3.5 h-3.5 text-[#2563EB]" />
              <span className="text-xs font-semibold truncate max-w-[140px]">
                {session.studentName}
              </span>
            </div>
          </div>
        </header>

        {/* Missing State Card */}
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="bg-[#FCFCFA] rounded-2xl border border-[#DCE4EE] p-8 sm:p-10 max-w-md w-full text-center space-y-5 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-2xs">
              <AlertCircle className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h1 className="text-lg sm:text-xl font-extrabold text-[#173B72] tracking-tight">
                Results are not available yet.
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Your submission was recorded, but the grading results for this session have not been finalized or could not be found.
              </p>
            </div>

            <div className="bg-[#F7F9FC] rounded-xl border border-[#DCE4EE] p-3 text-xs text-slate-600 text-left space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Assessment:</span>
                <span className="font-semibold text-slate-700 truncate max-w-[200px]">
                  {test.title || 'Untitled Assessment'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Student:</span>
                <span className="font-semibold text-slate-700">{session.studentName}</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              {onViewSubmissionReceipt && (
                <Button
                  variant="outline"
                  size="md"
                  className="flex-1 justify-center"
                  onClick={onViewSubmissionReceipt}
                  leftIcon={<FileCheck className="w-4 h-4 text-blue-600" />}
                >
                  Submission Receipt
                </Button>
              )}
              <Button
                variant="primary"
                size="md"
                className="flex-1 justify-center"
                onClick={onExit}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                {isSharedStudent ? 'Back to Test Overview' : 'Return to Dashboard'}
              </Button>
            </div>
          </div>
        </main>

        <footer className="py-4 text-center text-3xs text-slate-400 border-t border-[#DCE4EE]/60 bg-[#FCFCFA]">
          Assessora by GYTama EDU — Assessment Evaluation System
        </footer>
      </div>
    );
  }

  // ----------------------------------------------------
  // State 2: Normal Results View
  // ----------------------------------------------------
  const totalPoints = Math.max(0, gradingResult.totalPoints || 0);
  const earnedPoints = Math.max(0, gradingResult.earnedPoints || 0);
  const rawPercentage = typeof gradingResult.percentage === 'number' ? gradingResult.percentage : 0;
  const percentage = isNaN(rawPercentage) ? 0 : rawPercentage;

  const formattedGradedAt = formatGradedTimestamp(
    gradingResult.gradedAt || session.submittedAt
  );

  const questionResultsMap = new Map(
    gradingResult.questionResults.map((qr) => [qr.questionId, qr])
  );

  const totalQuestions = test.questions.length;

  // 1. Unanswered: questions where isQuestionAnswered(...) === false
  const unansweredCount = test.questions.filter(
    (q) => !isQuestionAnswered(session.answers?.[q.id])
  ).length;

  // 2. Answers Submitted: totalQuestions - unansweredCount
  const answeredCount = Math.max(0, totalQuestions - unansweredCount);

  // 3. Pending Review: questions requiring manual grading
  const pendingCount = gradingResult.questionResults.filter(
    (qr) => qr.requiresManualGrading || qr.status === 'pending_review'
  ).length;
  const hasPending = pendingCount > 0;

  // 4. Correct: answered questions where isCorrect === true
  const correctCount = test.questions.filter((q) => {
    const isAnswered = isQuestionAnswered(session.answers?.[q.id]);
    const qr = questionResultsMap.get(q.id);
    return isAnswered && qr?.isCorrect === true;
  }).length;

  // 5. Incorrect: answered questions where isCorrect === false
  const incorrectCount = test.questions.filter((q) => {
    const isAnswered = isQuestionAnswered(session.answers?.[q.id]);
    const qr = questionResultsMap.get(q.id);
    return (
      isAnswered &&
      !qr?.requiresManualGrading &&
      qr?.status !== 'pending_review' &&
      qr?.isCorrect === false
    );
  }).length;

  return (
    <div className="min-h-screen bg-[#F3F6FA] flex flex-col justify-between">
      {/* Persistent Navigation Header */}
      <header className="sticky top-0 z-30 bg-[#FCFCFA] border-b border-[#DCE4EE] shadow-2xs">
        <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-[#173B72] text-sm sm:text-base tracking-tight">
              Assess<span className="text-orange-500">ora</span>
            </span>
            <span className="text-2xs font-semibold px-1.5 py-0.2 rounded-md bg-[#EEF5FF] text-[#2563EB] border border-blue-200">
              Results
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F7F9FC] border border-[#DCE4EE] text-slate-700">
              <User className="w-3.5 h-3.5 text-[#2563EB]" />
              <span className="text-xs font-semibold truncate max-w-[120px] sm:max-w-[160px]">
                {session.studentName}
              </span>
            </div>

            {onViewSubmissionReceipt && (
              <Button
                variant="outline"
                size="sm"
                onClick={onViewSubmissionReceipt}
                leftIcon={<FileCheck className="w-3.5 h-3.5 text-blue-600" />}
                className="text-xs py-1 px-2.5 sm:px-3 h-8"
                title="View Submission Receipt"
              >
                <span className="hidden sm:inline">Receipt</span>
                <span className="sm:hidden">Receipt</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={onExit}
              leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              className="text-xs py-1 px-2.5 sm:px-3 h-8"
              title={isSharedStudent ? 'Back to test overview' : 'Return to dashboard'}
            >
              <span className="hidden sm:inline">
                {isSharedStudent ? 'Back to Overview' : 'Dashboard'}
              </span>
              <span className="sm:hidden">Exit</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* ==================================================== */}
        {/* 1. RESULTS SUMMARY CARD                              */}
        {/* ==================================================== */}
        <section
          aria-labelledby="results-summary-heading"
          className="bg-[#FCFCFA] rounded-2xl border border-[#DCE4EE] p-6 sm:p-8 shadow-xs space-y-6"
        >
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#DCE4EE] pb-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-orange-600 uppercase tracking-wider">
                <span>Assessora</span>
                <span aria-hidden="true">·</span>
                <span>Final Results</span>
              </div>
              <h1
                id="results-summary-heading"
                className="text-xl sm:text-2xl font-extrabold text-[#173B72] tracking-tight leading-snug"
              >
                {test.title || 'Untitled Assessment'}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 pt-0.5">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <strong className="text-slate-700 font-semibold">{session.studentName}</strong>
                </span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span className="flex items-center gap-1 font-mono text-2xs">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Graded: {formattedGradedAt}
                </span>
              </div>
            </div>

            {/* Score Highlight Box */}
            <div className="bg-[#F8FAFC] border border-[#DCE4EE] rounded-xl p-4 sm:p-5 text-center shrink-0 min-w-[180px] shadow-2xs">
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-500 block">
                Total Score
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#173B72] tracking-tight font-mono tabular-nums pt-1">
                {earnedPoints}{' '}
                <span className="text-base sm:text-lg font-medium text-slate-400">
                  / {totalPoints}
                </span>
              </div>
              <div className="mt-1 text-xs font-bold text-[#2563EB] font-mono tabular-nums">
                {percentage}%
              </div>
            </div>
          </div>

          {/* Manual Review Alert Banner */}
          {hasPending && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Manual Review Pending:</span> This assessment contains {pendingCount} open response question{pendingCount > 1 ? 's' : ''} (Essay / Writing) awaiting teacher evaluation. The score shown above currently reflects automatically graded questions.
              </div>
            </div>
          )}

          {/* Quick Metrics Grid */}
          <div
            className={`grid grid-cols-2 ${
              hasPending && pendingCount > 0
                ? 'sm:grid-cols-3 md:grid-cols-5'
                : 'sm:grid-cols-4'
            } gap-3 text-xs`}
          >
            <div className="bg-[#F7F9FC] rounded-xl border border-[#DCE4EE] p-3">
              <span className="text-slate-500 block text-2xs uppercase tracking-wider font-semibold">
                Answers Submitted
              </span>
              <span className="font-extrabold text-[#173B72] text-sm sm:text-base font-mono tabular-nums mt-0.5 block">
                {answeredCount}{' '}
                <span className="text-xs font-medium text-slate-400">/ {totalQuestions}</span>
              </span>
            </div>

            <div className="bg-emerald-50/40 rounded-xl border border-emerald-200/80 p-3">
              <span className="text-emerald-700 block text-2xs uppercase tracking-wider font-semibold">
                Correct
              </span>
              <span className="font-extrabold text-emerald-800 text-sm sm:text-base font-mono tabular-nums mt-0.5 block">
                {correctCount}
              </span>
            </div>

            <div className="bg-rose-50/40 rounded-xl border border-rose-200/80 p-3">
              <span className="text-rose-700 block text-2xs uppercase tracking-wider font-semibold">
                Incorrect
              </span>
              <span className="font-extrabold text-rose-800 text-sm sm:text-base font-mono tabular-nums mt-0.5 block">
                {incorrectCount}
              </span>
            </div>

            <div className="bg-slate-100/60 rounded-xl border border-slate-200 p-3">
              <span className="text-slate-600 block text-2xs uppercase tracking-wider font-semibold">
                Not Answered
              </span>
              <span className="font-extrabold text-slate-700 text-sm sm:text-base font-mono tabular-nums mt-0.5 block">
                {unansweredCount}
              </span>
            </div>

            {hasPending && pendingCount > 0 && (
              <div className="bg-amber-50/60 rounded-xl border border-amber-200 p-3 col-span-2 sm:col-span-1">
                <span className="text-amber-800 block text-2xs uppercase tracking-wider font-semibold">
                  Pending Review
                </span>
                <span className="font-extrabold text-amber-900 text-sm sm:text-base font-mono tabular-nums mt-0.5 block">
                  {pendingCount}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* ==================================================== */}
        {/* 2. QUESTION-BY-QUESTION BREAKDOWN                    */}
        {/* ==================================================== */}
        <section aria-labelledby="question-results-heading" className="space-y-4">
          <div className="flex items-center justify-between gap-3 px-1">
            <div>
              <h2
                id="question-results-heading"
                className="text-base sm:text-lg font-extrabold text-[#173B72] tracking-tight"
              >
                Question Breakdown
              </h2>
              <p className="text-xs text-slate-500">
                Review your answers and performance for each question.
              </p>
            </div>
            {onViewSubmissionReceipt && (
              <button
                type="button"
                onClick={onViewSubmissionReceipt}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Submission Receipt</span>
              </button>
            )}
          </div>

          {/* Zero Questions State */}
          {test.questions.length === 0 ? (
            <div className="bg-[#FCFCFA] rounded-2xl border border-[#DCE4EE] p-8 text-center text-slate-500 text-sm">
              This assessment contains no questions.
            </div>
          ) : (() => {
            const hasSections = Boolean(test.sections && test.sections.length > 0);
            const presSections = resolveSectionsForTest(test);

            const renderQuestionCard = (question: Question, index: number) => {
              const readingSet = question.readingSetId
                ? (test.readingSets || []).find((rs) => rs.id === question.readingSetId)
                : undefined;
              const isFirstInSet =
                readingSet &&
                (index === 0 || test.questions[index - 1]?.readingSetId !== question.readingSetId);
              const setIndex = readingSet
                ? (test.readingSets || []).findIndex((rs) => rs.id === readingSet.id)
                : -1;

              const qResult = questionResultsMap.get(question.id);
              const qEarned = qResult ? qResult.earnedPoints : 0;
              const qMax = qResult
                ? qResult.maxPoints
                : Math.max(0, question.points || 0);

              const studentAnswer = session.answers
                ? session.answers[question.id]
                : undefined;
              const isAnswered = isQuestionAnswered(studentAnswer);
              const studentAnswerText = getStudentAnswerDisplay(
                question,
                studentAnswer
              );
              const isCorrect = Boolean(qResult?.isCorrect);

              const correctAnswerText = showCorrectAnswers
                ? getCorrectAnswerDisplay(question)
                : null;

              // Status styling & icons (accessible: color + icon + text)
              let statusBadge: React.ReactNode;
              let cardBorderClass = 'border-[#DCE4EE]';

              if (qResult?.requiresManualGrading || qResult?.status === 'pending_review') {
                cardBorderClass = 'border-amber-300 ring-1 ring-amber-100';
                statusBadge = (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Pending Review</span>
                    <span aria-hidden="true" className="text-amber-300">·</span>
                    <span className="font-mono tabular-nums text-amber-700">
                      Pending / {qMax} {qMax === 1 ? 'pt' : 'pts'}
                    </span>
                  </div>
                );
              } else if (!isAnswered || qResult?.status === 'unanswered') {
                cardBorderClass = 'border-slate-300';
                statusBadge = (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                    <MinusCircle className="w-4 h-4 text-slate-400" />
                    <span>Not answered</span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="font-mono tabular-nums text-slate-500">
                      0 / {qMax} {qMax === 1 ? 'pt' : 'pts'}
                    </span>
                  </div>
                );
              } else if (isCorrect) {
                cardBorderClass = 'border-emerald-300';
                statusBadge = (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Correct</span>
                    <span aria-hidden="true" className="text-emerald-300">·</span>
                    <span className="font-mono tabular-nums">
                      {qEarned} / {qMax} {qMax === 1 ? 'pt' : 'pts'}
                    </span>
                  </div>
                );
              } else {
                cardBorderClass = 'border-rose-300';
                statusBadge = (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>Incorrect</span>
                    <span aria-hidden="true" className="text-rose-300">·</span>
                    <span className="font-mono tabular-nums">
                      {qEarned} / {qMax} {qMax === 1 ? 'pt' : 'pts'}
                    </span>
                  </div>
                );
              }

              return (
                <React.Fragment key={`res_q_${question.id || index}_${index}`}>
                  {isFirstInSet && readingSet && (
                    <div className="bg-gradient-to-r from-emerald-50 via-teal-50/40 to-white border border-emerald-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs mt-6 first:mt-0 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-3xs font-mono font-extrabold uppercase text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded border border-emerald-300">
                              Reading Passage {setIndex + 1}
                            </span>
                            <h3 className="text-sm font-bold text-[#173B72] mt-0.5">
                              {readingSet.title}
                            </h3>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedPassageIds((prev) => ({
                              ...prev,
                              [readingSet.id]: !prev[readingSet.id],
                            }))
                          }
                          className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 bg-white border border-emerald-300 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-emerald-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                          <span>
                            {expandedPassageIds[readingSet.id]
                              ? 'Hide Passage'
                              : 'Read Passage'}
                          </span>
                        </button>
                      </div>

                      {expandedPassageIds[readingSet.id] && (
                        <div className="pt-3 border-t border-emerald-200/80 space-y-3 font-serif text-slate-800 text-sm leading-relaxed whitespace-pre-line bg-white/80 p-4 rounded-xl border border-emerald-100">
                          {readingSet.instructions && (
                            <p className="font-sans italic text-xs text-emerald-900 bg-emerald-50 p-2 rounded-lg border border-emerald-200/60">
                              {readingSet.instructions}
                            </p>
                          )}
                          <div>{readingSet.passage}</div>
                          {readingSet.source && (
                            <p className="font-sans text-2xs text-slate-500 italic pt-2 border-t border-slate-200">
                              Source: {readingSet.source}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <article
                    className={`bg-[#FCFCFA] rounded-2xl border ${cardBorderClass} p-5 sm:p-6 shadow-2xs space-y-4 transition-all`}
                  >
                    {/* Question Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#DCE4EE]/70 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                          Question {index + 1}
                        </span>
                        {readingSet && (
                          <span className="text-3xs font-mono font-bold uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Reading {setIndex + 1}
                          </span>
                        )}
                      </div>
                      <div>{statusBadge}</div>
                    </div>

                    {/* Question Text */}
                    <div className="text-sm sm:text-base font-semibold text-[#172033] leading-relaxed whitespace-pre-wrap">
                      {question.text || `Question ${index + 1}`}
                    </div>

                    {/* Answers Display Section */}
                    <div className="space-y-2 pt-1 text-xs sm:text-sm">
                      {/* Student's Answer */}
                      <div
                        className={`p-3 sm:p-3.5 rounded-xl border flex flex-col gap-1 sm:gap-2 ${
                          qResult?.requiresManualGrading
                            ? 'bg-amber-50/50 border-amber-200/90 text-amber-950'
                            : !isAnswered
                            ? 'bg-slate-50 border-slate-200 text-slate-500'
                            : isCorrect
                            ? 'bg-emerald-50/40 border-emerald-200/90 text-emerald-950'
                            : 'bg-rose-50/40 border-rose-200/90 text-rose-950'
                        }`}
                      >
                        <span className="font-bold text-slate-600 shrink-0">
                          Your answer:
                        </span>
                        {String(question.type || '').replace(/-/g, '_').toLowerCase() === 'essay' ||
                        String(question.type || '').replace(/-/g, '_').toLowerCase() === 'writing' ||
                        question.requiresManualGrading ? (
                          studentAnswerText ? (
                            <div className="text-sm sm:text-base text-slate-900 bg-white p-3.5 rounded-lg border border-[#DCE4EE] whitespace-pre-wrap font-sans leading-relaxed break-words shadow-2xs mt-1">
                              {studentAnswerText}
                            </div>
                          ) : (
                            <span className="font-medium text-slate-400 italic">
                              (No answer provided)
                            </span>
                          )
                        ) : (
                          <span className="font-medium">
                            {studentAnswerText || '(No answer provided)'}
                          </span>
                        )}
                      </div>

                      {/* Teacher Feedback if available */}
                      {qResult?.feedback && (
                        <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/60 text-blue-950 space-y-1">
                          <span className="font-bold text-2xs uppercase tracking-wider text-blue-700 block">
                            Teacher Feedback:
                          </span>
                          <p className="text-xs sm:text-sm font-medium whitespace-pre-wrap text-[#173B72]">
                            {qResult.feedback}
                          </p>
                        </div>
                      )}

                      {/* Correct Answer (ONLY exposed if test settings allow) */}
                      {showCorrectAnswers && correctAnswerText && (
                        <div className="p-3 sm:p-3.5 rounded-xl border bg-blue-50/40 border-blue-200/80 text-blue-950 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                          <span className="font-bold text-blue-700 shrink-0">
                            Correct answer:
                          </span>
                          <span className="font-medium text-[#173B72]">
                            {correctAnswerText}
                          </span>
                        </div>
                      )}
                    </div>
                  </article>
                </React.Fragment>
              );
            };

            if (hasSections) {
              return (
                <div className="space-y-6">
                  {presSections.map((ps, sIdx) => {
                    const secMaxPoints = ps.questions.reduce(
                      (sum, q) => sum + (q.points || 1),
                      0
                    );
                    const secEarnedPoints = ps.questions.reduce((sum, q) => {
                      const qr = questionResultsMap.get(q.id);
                      return sum + (qr?.earnedPoints || 0);
                    }, 0);
                    const secPercentage =
                      secMaxPoints > 0
                        ? Math.round((secEarnedPoints / secMaxPoints) * 100)
                        : 0;

                    return (
                      <div key={`res_sec_${ps.section.id}`} className="space-y-4">
                        <div className="bg-[#FCFCFA] rounded-xl border border-[#DCE4EE] p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow-2xs">
                          <div className="flex items-center gap-2.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-2xs font-extrabold border bg-blue-50 text-blue-700 border-blue-200">
                              {ps.section.type}
                            </span>
                            <h3 className="text-sm sm:text-base font-extrabold text-[#173B72]">
                              {ps.section.title || `Section ${sIdx + 1}`}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#173B72]">
                            <span>
                              Score: {secEarnedPoints} / {secMaxPoints} pts
                            </span>
                            <span className="text-slate-400">({secPercentage}%)</span>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {ps.questions.map((q) => {
                            const overallIdx = test.questions.findIndex(
                              (item) => item.id === q.id
                            );
                            return renderQuestionCard(
                              q,
                              overallIdx >= 0 ? overallIdx : 0
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {test.questions.map((question: Question, index: number) =>
                  renderQuestionCard(question, index)
                )}
              </div>
            );
          })()}
        </section>

        {/* Bottom Navigation / Action */}
        <div className="pt-4 flex justify-center">
          <Button
            variant="primary"
            size="md"
            onClick={onExit}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            className="w-full sm:w-auto px-8 justify-center shadow-xs"
          >
            {isSharedStudent ? 'Back to Test Overview' : 'Return to Dashboard'}
          </Button>
        </div>
      </main>

      {/* Brand Footer */}
      <footer className="py-5 text-center text-3xs text-slate-400 border-t border-[#DCE4EE]/60 bg-[#FCFCFA]">
        Assessora by GYTama EDU — Automatic Grading & Results Engine
      </footer>
    </div>
  );
}
