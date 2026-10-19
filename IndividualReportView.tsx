/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useEffect } from 'react';
import {
  getStudentReport,
  formatReportDate,
  clearIndividualStudentResult,
  saveManualGrade,
  syncServerSubmissions,
} from '../../utils/reports';
import { evaluateWordCount } from '../../utils/wordCount';
import { Button } from '../ui/Button';
import { ConfirmModal } from '../ui/ConfirmModal';
import {
  ArrowLeft,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  MinusCircle,
  AlertCircle,
  FileText,
  Trash2,
  BookOpen,
  Check,
  Save,
  PenTool,
} from 'lucide-react';

interface IndividualReportViewProps {
  testId: string;
  sessionId: string;
  onBackToReports: () => void;
  onBackToDashboard: () => void;
}

export function IndividualReportView({
  testId,
  sessionId,
  onBackToReports,
  onBackToDashboard,
}: IndividualReportViewProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);
  const [expandedPassageIds, setExpandedPassageIds] = useState<Record<string, boolean>>({});
  const [refreshKey, setRefreshKey] = useState(0);

  // Manual grading local state per question
  const [gradeInputs, setGradeInputs] = useState<
    Record<string, { score: string; feedback: string }>
  >({});
  const [savingQuestionId, setSavingQuestionId] = useState<string | null>(null);
  const [savedSuccessQuestionId, setSavedSuccessQuestionId] = useState<string | null>(null);
  const [gradeErrors, setGradeErrors] = useState<Record<string, string>>({});

  // Sync server submissions on mount and listen to result updates
  useEffect(() => {
    let isMounted = true;
    syncServerSubmissions(testId).then((updated) => {
      if (updated && isMounted) {
        setRefreshKey((v) => v + 1);
      }
    });

    const handleUpdate = () => {
      if (isMounted) setRefreshKey((v) => v + 1);
    };

    window.addEventListener('assessora_results_updated', handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('assessora_results_updated', handleUpdate);
    };
  }, [testId]);

  // Load authoritative combined report data via dedicated lookup logic
  const report = useMemo(() => {
    return getStudentReport(testId, sessionId);
  }, [testId, sessionId, refreshKey]);

  // 1. Missing Report Data Handling (Requirement 13)
  if (!report) {
    return (
      <div className="min-h-screen bg-[#F3F6FA] flex flex-col justify-between">
        <header className="bg-[#FCFCFA] border-b border-[#DCE4EE] shadow-2xs">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[#173B72] text-base tracking-tight">
                Assess<span className="text-orange-500">ora</span>
              </span>
              <span className="text-2xs font-semibold px-2 py-0.5 rounded-md bg-[#EEF5FF] text-[#2563EB] border border-blue-200">
                Student Report
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onBackToReports}
              leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
            >
              Reports
            </Button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="bg-[#FCFCFA] rounded-2xl border border-[#DCE4EE] p-8 max-w-md w-full text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-extrabold text-[#173B72]">
              Report data is not available.
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              This submission does not have a saved grading result or could not be found for the requested test and session.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <Button
                variant="outline"
                size="md"
                onClick={onBackToDashboard}
                className="flex-1 justify-center"
              >
                Dashboard
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={onBackToReports}
                className="flex-1 justify-center"
              >
                Back to Reports
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

  const { test, session, gradingResult, questionReports } = report;

  // Authoritative scores directly from GradingResult (Requirement 6 & 10)
  const totalPoints = Math.max(0, gradingResult.totalPoints || 0);
  const earnedPoints = Math.max(0, gradingResult.earnedPoints || 0);
  const rawPercentage = typeof gradingResult.percentage === 'number' ? gradingResult.percentage : 0;
  const percentage = isNaN(rawPercentage) || !isFinite(rawPercentage) ? 0 : rawPercentage;

  const formattedDate = formatReportDate(session.submittedAt || gradingResult.gradedAt);

  // Quick Metrics
  const totalQuestions = questionReports.length;
  const correctCount = questionReports.filter((q) => q.status === 'correct').length;
  const incorrectCount = questionReports.filter((q) => q.status === 'incorrect').length;
  const unansweredCount = questionReports.filter((q) => q.status === 'not-answered').length;
  const pendingCount = questionReports.filter((q) => q.status === 'pending_review').length;

  const handleScoreChange = (qId: string, val: string) => {
    setGradeInputs((prev) => ({
      ...prev,
      [qId]: {
        score: val,
        feedback: prev[qId]?.feedback ?? '',
      },
    }));
    if (gradeErrors[qId]) {
      setGradeErrors((prev) => {
        const copy = { ...prev };
        delete copy[qId];
        return copy;
      });
    }
  };

  const handleFeedbackChange = (qId: string, val: string) => {
    setGradeInputs((prev) => ({
      ...prev,
      [qId]: {
        score: prev[qId]?.score ?? '',
        feedback: val,
      },
    }));
  };

  const handleSaveManualGrade = async (questionId: string, maxPoints: number) => {
    const currentInput = gradeInputs[questionId];
    const qr = gradingResult.questionResults?.find((r) => r.questionId === questionId);
    const rawScoreStr =
      currentInput?.score !== undefined
        ? currentInput.score
        : qr?.status === 'graded' && typeof qr.earnedPoints === 'number'
        ? String(qr.earnedPoints)
        : '';
    const feedback =
      currentInput?.feedback !== undefined ? currentInput.feedback : qr?.feedback || '';

    if (rawScoreStr === '' || rawScoreStr === undefined || rawScoreStr === null) {
      setGradeErrors((prev) => ({
        ...prev,
        [questionId]: `Please enter a score between 0 and ${maxPoints}.`,
      }));
      return;
    }

    const numScore = parseFloat(rawScoreStr);
    if (isNaN(numScore) || numScore < 0 || numScore > maxPoints) {
      setGradeErrors((prev) => ({
        ...prev,
        [questionId]: `Score must be between 0 and ${maxPoints} points.`,
      }));
      return;
    }

    setGradeErrors((prev) => {
      const copy = { ...prev };
      delete copy[questionId];
      return copy;
    });

    setSavingQuestionId(questionId);
    try {
      const updated = await saveManualGrade(
        testId,
        sessionId,
        questionId,
        numScore,
        feedback
      );

      if (updated) {
        setRefreshKey((v) => v + 1);
        setSavedSuccessQuestionId(questionId);
        setTimeout(() => {
          setSavedSuccessQuestionId((curr) => (curr === questionId ? null : curr));
        }, 3000);
      } else {
        setGradeErrors((prev) => ({
          ...prev,
          [questionId]: 'Failed to save grade. Please try again.',
        }));
      }
    } catch (err: any) {
      setGradeErrors((prev) => ({
        ...prev,
        [questionId]: err?.message || 'Failed to save grade.',
      }));
    } finally {
      setSavingQuestionId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F6FA] flex flex-col justify-between">
      {/* Top Header */}
      <header className="bg-[#FCFCFA] border-b border-[#DCE4EE] shadow-2xs sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onBackToReports}
              leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              className="text-xs h-8 px-2.5 sm:px-3"
            >
              <span className="hidden sm:inline">Student Reports</span>
              <span className="sm:hidden">Reports</span>
            </Button>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-semibold text-[#173B72] truncate max-w-[140px] sm:max-w-[200px]">
              {session.studentName}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowClearConfirm(true);
                setClearError(null);
              }}
              leftIcon={<Trash2 className="w-3.5 h-3.5 text-rose-600" />}
              className="text-xs h-8 px-2.5 sm:px-3 text-rose-700 border-rose-200 hover:bg-rose-50"
              title="Delete this student response"
            >
              Delete Response
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onBackToDashboard}
              className="text-xs h-8 px-3"
            >
              Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* ==================================================== */}
        {/* 1. REPORT SUMMARY CARD (Requirement 6 & 10)          */}
        {/* ==================================================== */}
        <section
          aria-labelledby="report-summary-heading"
          className="bg-[#FCFCFA] rounded-2xl border border-[#DCE4EE] p-6 sm:p-8 shadow-xs space-y-6"
        >
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#DCE4EE] pb-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-orange-600 uppercase tracking-wider">
                <span>Assessora</span>
                <span aria-hidden="true">·</span>
                <span>Individual Student Report</span>
              </div>
              <h1
                id="report-summary-heading"
                className="text-xl sm:text-2xl font-extrabold text-[#173B72] tracking-tight leading-snug"
              >
                Student Report
              </h1>

              <div className="space-y-1 pt-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium">Test:</span>
                  <strong className="text-slate-800 font-bold">
                    {test.title || 'Untitled Assessment'}
                  </strong>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium">Student:</span>
                  <span className="flex items-center gap-1.5 font-bold text-[#173B72]">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    {session.studentName}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium">Submitted:</span>
                  <span className="flex items-center gap-1 font-mono text-2xs text-slate-600">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {formattedDate}
                  </span>
                </div>
              </div>
            </div>

            {/* Score Highlight Box */}
            <div className="bg-[#F8FAFC] border border-[#DCE4EE] rounded-xl p-4 sm:p-5 text-center shrink-0 min-w-[180px] shadow-2xs">
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-500 block">
                Final Score
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

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-[#F7F9FC] rounded-xl border border-[#DCE4EE] p-3">
              <span className="text-slate-500 block text-2xs uppercase tracking-wider font-semibold">
                Questions
              </span>
              <span className="font-extrabold text-slate-800 text-sm sm:text-base font-mono tabular-nums mt-0.5 block">
                {totalQuestions}
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
          </div>
        </section>

        {/* ==================================================== */}
        {/* 2. QUESTION-BY-QUESTION PERFORMANCE (Requirement 7-9)*/}
        {/* ==================================================== */}
        <section aria-labelledby="question-breakdown-heading" className="space-y-4">
          <div className="px-1">
            <h2
              id="question-breakdown-heading"
              className="text-base sm:text-lg font-extrabold text-[#173B72] tracking-tight"
            >
              Question-by-Question Breakdown
            </h2>
            <p className="text-xs text-slate-500">
              Questions are listed in the assessment's original question order.
            </p>
          </div>

          {questionReports.length === 0 ? (
            <div className="bg-[#FCFCFA] rounded-2xl border border-[#DCE4EE] p-8 text-center text-slate-500 text-sm">
              This assessment contains no questions.
            </div>
          ) : (
            <div className="space-y-4">
              {questionReports.map((item, idx) => {
                const {
                  questionNumber,
                  question,
                  studentAnswerText,
                  correctAnswerText,
                  earnedPoints: qEarned,
                  maxPoints: qMax,
                  status,
                } = item;

                const readingSet = question.readingSetId
                  ? (test.readingSets || []).find((rs) => rs.id === question.readingSetId)
                  : undefined;
                const isFirstInSet =
                  readingSet &&
                  (idx === 0 || questionReports[idx - 1].question.readingSetId !== question.readingSetId);
                const setIndex = readingSet
                  ? (test.readingSets || []).findIndex((rs) => rs.id === readingSet.id)
                  : -1;

                const rawType = String(question.type || '').replace(/-/g, '_').toLowerCase();
                const isEssayOrWriting =
                  rawType === 'essay' || rawType === 'writing' || Boolean(question.requiresManualGrading);
                const qr = item.questionResult;
                const isGraded = qr?.status === 'graded';

                let statusBadge: React.ReactNode;
                let cardBorderClass = 'border-[#DCE4EE]';

                if (isEssayOrWriting) {
                  if (isGraded) {
                    cardBorderClass = 'border-emerald-300';
                    statusBadge = (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Graded</span>
                        <span aria-hidden="true" className="text-emerald-300">·</span>
                        <span className="font-mono tabular-nums">
                          {qEarned} / {qMax} {qMax === 1 ? 'point' : 'points'}
                        </span>
                      </div>
                    );
                  } else {
                    cardBorderClass = 'border-amber-300 ring-1 ring-amber-100';
                    statusBadge = (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <span>Pending Review</span>
                        <span aria-hidden="true" className="text-amber-300">·</span>
                        <span className="font-mono tabular-nums text-amber-700">
                          Needs Grading · Max {qMax} {qMax === 1 ? 'pt' : 'pts'}
                        </span>
                      </div>
                    );
                  }
                } else if (status === 'not-answered') {
                  cardBorderClass = 'border-slate-300';
                  statusBadge = (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                      <MinusCircle className="w-4 h-4 text-slate-400" />
                      <span>Not Answered</span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span className="font-mono tabular-nums text-slate-500">
                        0 / {qMax} {qMax === 1 ? 'point' : 'points'}
                      </span>
                    </div>
                  );
                } else if (status === 'correct') {
                  cardBorderClass = 'border-emerald-300';
                  statusBadge = (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Correct</span>
                      <span aria-hidden="true" className="text-emerald-300">·</span>
                      <span className="font-mono tabular-nums">
                        {qEarned} / {qMax} {qMax === 1 ? 'point' : 'points'}
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
                        {qEarned} / {qMax} {qMax === 1 ? 'point' : 'points'}
                      </span>
                    </div>
                  );
                }

                return (
                  <React.Fragment key={`irv_q_${question.id || questionNumber}_${questionNumber}`}>
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
                      className={`bg-[#FCFCFA] rounded-2xl border ${cardBorderClass} p-5 sm:p-6 shadow-2xs space-y-4`}
                    >
                      {/* Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#DCE4EE]/70 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                            Question {questionNumber}
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
                      {question.text || `Question ${questionNumber}`}
                    </div>

                    {/* Answers Box */}
                    {isEssayOrWriting ? (
                      <div className="space-y-4 pt-1">
                        {/* Preserved Student Response */}
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-700 uppercase tracking-wider text-2xs flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-slate-500" />
                              <span>Student Submitted Response</span>
                            </span>
                            {studentAnswerText && (
                              <span className="font-mono text-2xs text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                                {evaluateWordCount(studentAnswerText).count} words
                              </span>
                            )}
                          </div>

                          {studentAnswerText ? (
                            <div className="text-sm sm:text-base text-slate-900 bg-white p-4 rounded-lg border border-slate-200 whitespace-pre-wrap font-sans leading-relaxed break-words shadow-2xs">
                              {studentAnswerText}
                            </div>
                          ) : (
                            <div className="p-3 bg-slate-100 rounded-lg text-slate-400 italic text-xs">
                              (No response provided by student)
                            </div>
                          )}
                        </div>

                        {/* Teacher Manual Grading Panel */}
                        <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] space-y-3.5 shadow-2xs">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#DCE4EE] pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-[#173B72] text-xs uppercase tracking-wider flex items-center gap-1.5">
                                <PenTool className="w-3.5 h-3.5 text-orange-500" />
                                <span>Teacher Manual Grading</span>
                              </span>
                              {isGraded ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Graded
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-300">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  Pending Review
                                </span>
                              )}
                            </div>

                            <div className="text-xs text-slate-600 font-medium">
                              Maximum Points: <strong className="font-mono text-[#173B72] font-extrabold text-sm">{qMax}</strong>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* Score Input */}
                            <div className="sm:col-span-1 space-y-1">
                              <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wide">
                                Score (0 - {qMax})
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={0}
                                  max={qMax}
                                  step="any"
                                  placeholder={`0 - ${qMax}`}
                                  value={
                                    gradeInputs[question.id]?.score !== undefined
                                      ? gradeInputs[question.id].score
                                      : qr?.status === 'graded' && typeof qr.earnedPoints === 'number'
                                      ? String(qr.earnedPoints)
                                      : ''
                                  }
                                  onChange={(e) => handleScoreChange(question.id, e.target.value)}
                                  className="w-full px-3 py-2 text-sm font-mono font-bold rounded-lg border border-[#DCE4EE] bg-white text-slate-900 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                                />
                                <span className="text-xs font-mono text-slate-500 font-semibold shrink-0">
                                  / {qMax} pts
                                </span>
                              </div>
                            </div>

                            {/* Optional Feedback */}
                            <div className="sm:col-span-2 space-y-1">
                              <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wide">
                                Teacher Feedback (Optional)
                              </label>
                              <input
                                type="text"
                                placeholder="Add comments or feedback for the student..."
                                value={
                                  gradeInputs[question.id]?.feedback !== undefined
                                    ? gradeInputs[question.id].feedback
                                    : qr?.feedback || ''
                                }
                                onChange={(e) => handleFeedbackChange(question.id, e.target.value)}
                                className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE4EE] bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                              />
                            </div>
                          </div>

                          {/* Validation error message */}
                          {gradeErrors[question.id] && (
                            <p className="text-2xs text-rose-600 font-semibold">{gradeErrors[question.id]}</p>
                          )}

                          {/* Action footer */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-[#DCE4EE]/70">
                            <div className="text-2xs text-slate-500 font-mono">
                              {isGraded && qr?.gradedAt && (
                                <span>Graded: {formatReportDate(qr.gradedAt)}</span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-auto">
                              {savedSuccessQuestionId === question.id && (
                                <span className="text-2xs font-bold text-emerald-700 flex items-center gap-1 animate-in fade-in">
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  Grading saved!
                                </span>
                              )}
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleSaveManualGrade(question.id, qMax)}
                                isLoading={savingQuestionId === question.id}
                                leftIcon={<Save className="w-3.5 h-3.5" />}
                                className="text-xs px-3.5 py-1.5 h-8 bg-[#173B72] hover:bg-[#1f4a8a]"
                              >
                                {isGraded ? 'Update Grade' : 'Save Grade'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-1 text-xs sm:text-sm">
                        {/* Student's answer */}
                        <div
                          className={`p-3 sm:p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 ${
                            status === 'not-answered'
                              ? 'bg-slate-50 border-slate-200 text-slate-500'
                              : status === 'correct'
                              ? 'bg-emerald-50/40 border-emerald-200/90 text-emerald-950'
                              : 'bg-rose-50/40 border-rose-200/90 text-rose-950'
                          }`}
                        >
                          <span className="font-bold text-slate-600 shrink-0">
                            Student answer:
                          </span>
                          <span className="font-medium">
                            {studentAnswerText || '(Not answered)'}
                          </span>
                        </div>

                        {/* Correct answer (always displayed in teacher reports, Requirement 21!) */}
                        {correctAnswerText && (
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
                    )}
                  </article>
                </React.Fragment>
              );
            })}
            </div>
          )}
        </section>

        {/* Footer Navigation Button */}
        <div className="pt-4 flex justify-center">
          <Button
            variant="primary"
            size="md"
            onClick={onBackToReports}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            className="w-full sm:w-auto px-8 justify-center shadow-xs"
          >
            Back to Student Reports
          </Button>
        </div>
      </main>

      {/* Brand Footer */}
      <footer className="py-5 text-center text-3xs text-slate-400 border-t border-[#DCE4EE]/60 bg-[#FCFCFA]">
        Assessora by GYTama EDU — Teacher Reporting Engine
      </footer>

      {/* MODULE 14: Delete Individual Student Response Confirmation Modal */}
      <ConfirmModal
        isOpen={showClearConfirm}
        title="Delete student response?"
        description={`Are you sure you want to delete the response submitted by ${
          session.studentName || 'this student'
        } for "${
          test.title || 'this assessment'
        }"?\n\nTheir answers and scores will be permanently removed. This action cannot be undone.`}
        confirmText="Delete Response"
        cancelText="Cancel"
        confirmVariant="danger"
        isLoading={isClearing}
        error={clearError}
        onConfirm={async () => {
          if (isClearing) return;
          setIsClearing(true);
          setClearError(null);
          const res = await clearIndividualStudentResult(testId, sessionId);
          setIsClearing(false);
          if (res.success) {
            onBackToReports();
          } else {
            setClearError(res.error || 'Failed to delete student response. Please try again.');
          }
        }}
        onCancel={() => {
          if (!isClearing) {
            setShowClearConfirm(false);
            setClearError(null);
          }
        }}
      />
    </div>
  );
}
