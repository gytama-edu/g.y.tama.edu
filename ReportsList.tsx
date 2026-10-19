/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useEffect } from 'react';
import { Test } from '../../types/test';
import { StudentReportSummary } from '../../types/report';
import {
  getTestReports,
  formatReportDate,
  syncServerSubmissions,
  clearAllStudentResults,
  clearIndividualStudentResult,
} from '../../utils/reports';
import { Button } from '../ui/Button';
import { ConfirmModal } from '../ui/ConfirmModal';
import {
  ArrowLeft,
  Search,
  FileText,
  User,
  Clock,
  ChevronRight,
  AlertCircle,
  Inbox,
  Eye,
  Trash2,
  RotateCcw,
  CheckCircle2,
  X,
} from 'lucide-react';

interface ReportsListProps {
  test: Test | null;
  onViewReport: (sessionId: string) => void;
  onBackToDashboard: () => void;
  onBackToEditor?: () => void;
}

export function ReportsList({
  test,
  onViewReport,
  onBackToDashboard,
  onBackToEditor,
}: ReportsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [syncVersion, setSyncVersion] = useState(0);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [targetSingleReport, setTargetSingleReport] = useState<StudentReportSummary | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Auto-dismiss success toast after 4 seconds
  useEffect(() => {
    if (!successToast) return;
    const timer = setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [successToast]);

  useEffect(() => {
    if (!test?.id) return;
    let isMounted = true;
    syncServerSubmissions(test.id).then((updated) => {
      if (updated && isMounted) {
        setSyncVersion((v) => v + 1);
      }
    });

    const handleCleared = () => {
      if (isMounted) setSyncVersion((v) => v + 1);
    };

    window.addEventListener('assessora_results_cleared', handleCleared);
    window.addEventListener('assessora_results_updated', handleCleared);
    return () => {
      isMounted = false;
      window.removeEventListener('assessora_results_cleared', handleCleared);
      window.removeEventListener('assessora_results_updated', handleCleared);
    };
  }, [test?.id]);

  // 1. Invalid Test State (Requirement 15)
  if (!test) {
    return (
      <div className="min-h-screen bg-[#F3F6FA] flex flex-col justify-between">
        <header className="bg-[#FCFCFA] border-b border-[#DCE4EE] shadow-2xs">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[#173B72] text-base tracking-tight">
                Assess<span className="text-orange-500">ora</span>
              </span>
              <span className="text-2xs font-semibold px-2 py-0.5 rounded-md bg-[#EEF5FF] text-[#2563EB] border border-blue-200">
                Teacher Reports
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onBackToDashboard}
              leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
            >
              Dashboard
            </Button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="bg-[#FCFCFA] rounded-2xl border border-[#DCE4EE] p-8 max-w-md w-full text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-extrabold text-[#173B72]">Test not found.</h1>
            <p className="text-xs text-slate-500">
              The requested assessment does not exist or has been removed.
            </p>
            <Button
              variant="primary"
              size="md"
              onClick={onBackToDashboard}
              className="w-full justify-center"
            >
              Return to Dashboard
            </Button>
          </div>
        </main>

        <footer className="py-4 text-center text-3xs text-slate-400 border-t border-[#DCE4EE]/60 bg-[#FCFCFA]">
          Assessora by GYTama EDU — Assessment Evaluation System
        </footer>
      </div>
    );
  }

  // 2. Load submitted reports for this test (Requirement 3, 5, 11)
  const reports = useMemo(() => {
    return getTestReports(test.id);
  }, [test.id, syncVersion]);

  // Filter by search query (student name)
  const filteredReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter((r) => r.studentName.toLowerCase().includes(q));
  }, [reports, searchQuery]);

  return (
    <div className="min-h-screen bg-[#F3F6FA] flex flex-col justify-between">
      {/* Top Header */}
      <header className="bg-[#FCFCFA] border-b border-[#DCE4EE] shadow-2xs sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="font-extrabold text-[#173B72] text-base tracking-tight">
                Assess<span className="text-orange-500">ora</span>
              </span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500 mb-2" />
            </div>
            <span className="text-slate-300">/</span>
            <span className="text-xs sm:text-sm font-semibold text-[#2563EB] bg-[#EEF5FF] px-2.5 py-1 rounded-md border border-blue-200">
              Student Reports
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {onBackToEditor && (
              <Button
                variant="outline"
                size="sm"
                onClick={onBackToEditor}
                leftIcon={<FileText className="w-3.5 h-3.5 text-blue-600" />}
                className="text-xs hidden sm:inline-flex"
              >
                Edit Test
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onBackToDashboard}
              leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Title and Context */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DCE4EE] pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-orange-600 uppercase tracking-wider">
              <span>Assessora</span>
              <span aria-hidden="true">·</span>
              <span>Teacher Reports</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#173B72]">
              Student Reports
            </h1>
            <p className="text-sm font-semibold text-slate-600 truncate max-w-xl">
              {test.title || 'Untitled Assessment'}
            </p>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex items-center gap-3">
            <div className="bg-[#FCFCFA] border border-[#DCE4EE] rounded-xl px-4 py-2 text-center min-w-[120px] shadow-2xs">
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-400 block">
                Total Attempts
              </span>
              <span className="text-xl font-extrabold text-[#173B72] font-mono tabular-nums">
                {reports.length}
              </span>
            </div>

            {reports.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowClearAllConfirm(true);
                  setClearError(null);
                }}
                leftIcon={<RotateCcw className="w-3.5 h-3.5 text-amber-600" />}
                className="text-xs text-amber-800 border-amber-300 hover:bg-amber-50 h-9 px-3"
                title="Clear all student attempts for this test"
              >
                Clear All Results
              </Button>
            )}
          </div>
        </div>

        {/* Search bar when reports exist */}
        {reports.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student name..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#DCE4EE] bg-[#FCFCFA] text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all shadow-2xs"
              />
            </div>

            <div className="text-2xs text-slate-500 self-end sm:self-auto font-medium">
              Showing {filteredReports.length} of {reports.length} submission{reports.length === 1 ? '' : 's'} (newest first)
            </div>
          </div>
        )}

        {/* 3. Empty State (Requirement 14) */}
        {reports.length === 0 ? (
          <div className="bg-[#FCFCFA] rounded-2xl border border-[#DCE4EE] p-12 text-center space-y-4 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#2563EB] border border-blue-200 flex items-center justify-center mx-auto shadow-2xs">
              <Inbox className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-extrabold text-[#173B72]">
                No Student Reports Yet
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                Submitted student attempts will appear here once students complete this test.
              </p>
            </div>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="bg-[#FCFCFA] rounded-2xl border border-[#DCE4EE] p-10 text-center space-y-3">
            <p className="text-sm font-semibold text-slate-700">
              No matching student reports found for "{searchQuery}".
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchQuery('')}
            >
              Clear Search
            </Button>
          </div>
        ) : (
          /* 4. Reports Table on Desktop & Stacked Cards on Mobile (Requirement 2 & 24) */
          <div className="space-y-4">
            {/* Desktop Table */}
            <div className="hidden md:block bg-[#FCFCFA] rounded-2xl border border-[#DCE4EE] shadow-xs overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#DCE4EE] bg-[#F7F9FC]/80 text-2xs font-extrabold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4 sm:px-6">Student</th>
                    <th className="py-3.5 px-4">Submitted</th>
                    <th className="py-3.5 px-4">Score</th>
                    <th className="py-3.5 px-4">Percentage</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCE4EE] text-xs">
                  {filteredReports.map((report, rIdx) => (
                    <tr
                      key={`rep_row_${report.sessionId}_${rIdx}`}
                      className="hover:bg-[#F8FAFC] transition-colors group"
                    >
                      <td className="py-4 px-4 sm:px-6 font-semibold text-[#173B72]">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#EFF6FF] border border-blue-200 text-[#2563EB] flex items-center justify-center font-bold text-2xs shrink-0">
                            <User className="w-3.5 h-3.5" />
                          </div>
                          <span className="truncate max-w-[200px]">{report.studentName}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-slate-500 font-mono text-2xs">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatReportDate(report.submittedAt)}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4 font-mono font-bold text-slate-800 tabular-nums">
                        {report.earnedPoints}{' '}
                        <span className="text-slate-400 font-normal">/ {report.totalPoints}</span>
                      </td>

                      <td className="py-4 px-4 font-mono font-bold text-[#2563EB] tabular-nums">
                        {report.percentage}%
                      </td>

                      <td className="py-4 px-4">
                        {report.hasPendingManualGrading ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                            Pending Review
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Graded
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewReport(report.sessionId)}
                            leftIcon={<Eye className="w-3.5 h-3.5 text-blue-600" />}
                            className="text-xs h-7.5 px-3 group-hover:border-blue-300 group-hover:bg-blue-50/50"
                          >
                            View Report
                          </Button>
                          <button
                            type="button"
                            onClick={() => {
                              setTargetSingleReport(report);
                              setClearError(null);
                            }}
                            title={`Delete response from ${report.studentName}`}
                            aria-label={`Delete response from ${report.studentName}`}
                            className="p-1.5 rounded-lg border border-[#DCE4EE] text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards (Requirement 24) */}
            <div className="md:hidden space-y-3">
              {filteredReports.map((report, rIdx) => (
                <article
                  key={`rep_card_${report.sessionId}_${rIdx}`}
                  className="bg-[#FCFCFA] rounded-2xl border border-[#DCE4EE] p-4.5 shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-[#DCE4EE]/70 pb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[#EFF6FF] border border-blue-200 text-[#2563EB] flex items-center justify-center font-bold text-xs shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-bold text-sm text-[#173B72] truncate">
                          {report.studentName}
                        </h2>
                        <span className="flex items-center gap-1 text-3xs text-slate-400 font-mono">
                          <Clock className="w-3 h-3" />
                          {formatReportDate(report.submittedAt)}
                        </span>
                      </div>
                    </div>

                    {report.hasPendingManualGrading ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                        Pending Review
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                        Graded
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-[#F7F9FC] rounded-xl p-3 border border-[#DCE4EE]">
                    <div>
                      <span className="text-3xs uppercase tracking-wider text-slate-400 block font-semibold">
                        Score
                      </span>
                      <span className="font-extrabold text-[#173B72] font-mono tabular-nums text-sm">
                        {report.earnedPoints}{' '}
                        <span className="text-slate-400 text-xs font-normal">
                          / {report.totalPoints}
                        </span>
                      </span>
                    </div>

                    <div>
                      <span className="text-3xs uppercase tracking-wider text-slate-400 block font-semibold">
                        Percentage
                      </span>
                      <span className="font-extrabold text-[#2563EB] font-mono tabular-nums text-sm">
                        {report.percentage}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 justify-center text-xs h-8"
                      onClick={() => onViewReport(report.sessionId)}
                      rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                    >
                      View Report
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        setTargetSingleReport(report);
                        setClearError(null);
                      }}
                      title={`Delete response from ${report.studentName}`}
                      aria-label={`Delete response from ${report.studentName}`}
                      className="px-2.5 py-1 text-xs rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 font-semibold transition-colors cursor-pointer h-8 flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Brand Footer */}
      <footer className="py-5 text-center text-3xs text-slate-400 border-t border-[#DCE4EE]/60 bg-[#FCFCFA]">
        Assessora by GYTama EDU — Teacher Reporting & Assessment Evaluation
      </footer>

      {/* MODULE 14: Clear All Results Confirmation Modal */}
      <ConfirmModal
        isOpen={showClearAllConfirm}
        title="Clear all results?"
        description={`This will permanently remove all student submissions and results for "${
          test.title || 'this assessment'
        }". The test, questions, settings, category, and share link will remain unchanged.\n\n${
          reports.length
        } student result${reports.length === 1 ? '' : 's'} will be removed.\n\nThis action cannot be undone.`}
        confirmText="Clear Results"
        cancelText="Cancel"
        confirmVariant="danger"
        isLoading={isClearing}
        error={clearError}
        onConfirm={async () => {
          if (isClearing) return;
          setIsClearing(true);
          setClearError(null);
          const res = await clearAllStudentResults(test.id);
          setIsClearing(false);
          if (res.success) {
            setSuccessToast('All student results cleared successfully.');
            setShowClearAllConfirm(false);
            setSyncVersion((v) => v + 1);
          } else {
            setClearError(res.error || 'Failed to clear student results. Please try again.');
          }
        }}
        onCancel={() => {
          if (!isClearing) {
            setShowClearAllConfirm(false);
            setClearError(null);
          }
        }}
      />

      {/* MODULE 14: Delete Individual Student Response Confirmation Modal */}
      <ConfirmModal
        isOpen={!!targetSingleReport}
        title="Delete student response?"
        description={`Are you sure you want to delete the response submitted by ${
          targetSingleReport?.studentName || 'this student'
        } for "${
          test.title || 'this assessment'
        }"?\n\nTheir answers and scores will be permanently removed. This action cannot be undone.`}
        confirmText="Delete Response"
        cancelText="Cancel"
        confirmVariant="danger"
        isLoading={isClearing}
        error={clearError}
        onConfirm={async () => {
          if (!targetSingleReport || isClearing) return;
          setIsClearing(true);
          setClearError(null);
          const res = await clearIndividualStudentResult(test.id, targetSingleReport.sessionId);
          setIsClearing(false);
          if (res.success) {
            setSuccessToast(`Response from "${targetSingleReport.studentName}" deleted successfully.`);
            setTargetSingleReport(null);
            setSyncVersion((v) => v + 1);
          } else {
            setClearError(res.error || 'Failed to delete student response. Please try again.');
          }
        }}
        onCancel={() => {
          if (!isClearing) {
            setTargetSingleReport(null);
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
            className="ml-2 text-white/60 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
