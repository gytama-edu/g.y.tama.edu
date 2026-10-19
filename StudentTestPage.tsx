/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Test, Question } from '../../types/test';
import {
  TestSession,
  StudentAnswer,
  isQuestionAnswered,
  calculateRemainingSeconds,
  formatTimerDisplay,
} from '../../types/student';
import {
  createTestSession,
  loadActiveStudentSession,
  saveActiveStudentSession,
  clearActiveStudentSession,
  validateAndSanitizeSession,
  submitTestSession,
  canSubmitSession,
} from '../../utils/studentSession';
import { StudentStartScreen } from './StudentStartScreen';
import { StudentQuestionView } from './StudentQuestionView';
import { StudentReadingSetView } from './StudentReadingSetView';
import { StudentSubmissionSuccess } from './StudentSubmissionSuccess';
import { StudentResultsPage } from './StudentResultsPage';
import { StudentAudioPlayer } from './StudentAudioPlayer';
import { gradeTestSession } from '../../utils/grading';
import { saveGradingResult } from '../../utils/gradingStorage';
import { evaluateWordCount } from '../../utils/wordCount';
import { resolveSectionsForTest, PresentationalSection } from '../../utils/sectionHelpers';
import { Button } from '../ui/Button';
import { ConfirmModal } from '../ui/ConfirmModal';
import {
  ChevronLeft,
  ChevronRight,
  User,
  AlertCircle,
  ArrowLeft,
  Clock,
  CheckCircle2,
  BookOpen,
  LogOut,
  ListFilter,
  X,
  Menu,
  Headphones,
  FileCheck,
  Layers,
  Tag,
  PenTool,
  Info,
} from 'lucide-react';

function getSectionIcon(type: string, isCurrentSec: boolean = false) {
  const norm = (type || 'General').toLowerCase();
  const iconClass = `w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${isCurrentSec ? 'text-white' : ''}`;
  switch (norm) {
    case 'listening':
      return <Headphones className={isCurrentSec ? iconClass : 'w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-blue-600'} />;
    case 'reading':
      return <BookOpen className={isCurrentSec ? iconClass : 'w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-emerald-600'} />;
    case 'grammar':
      return <FileCheck className={isCurrentSec ? iconClass : 'w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-purple-600'} />;
    case 'vocabulary':
      return <Tag className={isCurrentSec ? iconClass : 'w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-amber-600'} />;
    case 'writing':
      return <PenTool className={isCurrentSec ? iconClass : 'w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-orange-600'} />;
    case 'general':
    case 'custom':
    default:
      return <Layers className={isCurrentSec ? iconClass : 'w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-slate-600'} />;
  }
}

function getSectionTypeBadgeClass(type: string): string {
  const norm = (type || 'General').toLowerCase();
  switch (norm) {
    case 'listening':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'reading':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'grammar':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'vocabulary':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'writing':
      return 'bg-orange-50 text-orange-800 border-orange-200';
    case 'general':
    case 'custom':
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

interface StudentTestPageProps {
  test: Test | null;
  onExit: () => void;
  isSharedStudent?: boolean;
  shareCode?: string | null;
}

export function StudentTestPage({
  test,
  onExit,
  isSharedStudent = false,
  shareCode,
}: StudentTestPageProps) {
  // ----------------------------------------------------
  // 1. ALL REACT HOOKS CALLED UNCONDITIONALLY AT THE TOP
  // ----------------------------------------------------

  // Active student session state
  const [session, setSession] = useState<TestSession | null>(() => {
    if (!test) return null;
    return loadActiveStudentSession(test);
  });

  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitWarningModal, setShowSubmitWarningModal] = useState(false);
  const [submitWarning, setSubmitWarning] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showResultsView, setShowResultsView] = useState<boolean>(() => {
    return (
      typeof window !== 'undefined' &&
      (window.location.hash.endsWith('/results') || window.location.hash === '#results')
    );
  });

  // Keep showResultsView in sync with browser hash (e.g. Back/Forward button navigation)
  useEffect(() => {
    const handleHashChange = () => {
      setShowResultsView(
        window.location.hash.endsWith('/results') || window.location.hash === '#results'
      );
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Remaining seconds state for countdown timer
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    if (!test) return 0;
    const initialSession = loadActiveStudentSession(test);
    return calculateRemainingSeconds(initialSession?.timer?.expiresAt || null);
  });

  // Sync / validate active session if the target test changes
  useEffect(() => {
    if (!test) {
      setSession(null);
      setRemainingSeconds(0);
      return;
    }
    // If the active session is for a different test or needs re-sanitization
    if (!session || session.testId !== test.id) {
      const existing = loadActiveStudentSession(test);
      setSession(existing);
      setRemainingSeconds(
        calculateRemainingSeconds(existing?.timer?.expiresAt || null)
      );
    } else {
      // Re-validate active session against updated test settings (e.g. if timeLimitEnabled changed)
      const revalidated = validateAndSanitizeSession(session, test);
      if (
        revalidated &&
        (revalidated.timer?.enabled !== session.timer?.enabled ||
          revalidated.timer?.status !== session.timer?.status ||
          revalidated.timer?.expiresAt !== session.timer?.expiresAt ||
          revalidated.status !== session.status)
      ) {
        setSession(revalidated);
        setRemainingSeconds(
          revalidated.timer?.enabled
            ? calculateRemainingSeconds(revalidated.timer.expiresAt)
            : 0
        );
      }
    }
  }, [test]);

  // Sync session state to sessionStorage whenever it changes
  useEffect(() => {
    if (session && test && session.testId === test.id) {
      saveActiveStudentSession(session);
    }
  }, [session, test]);

  // Single interval timer effect for countdown
  useEffect(() => {
    if (
      !session?.timer?.enabled ||
      session.timer.status !== 'running' ||
      session.status === 'submitted'
    ) {
      if (session?.timer?.status === 'expired') {
        setRemainingSeconds(0);
      }
      return;
    }

    const checkTimer = () => {
      const left = calculateRemainingSeconds(session.timer?.expiresAt || null);
      setRemainingSeconds(left);

      if (left <= 0) {
        setSession((prev) => {
          if (!prev || !prev.timer || prev.timer.status === 'expired') return prev;
          return {
            ...prev,
            status: prev.status === 'submitted' ? 'submitted' : 'expired',
            timer: {
              ...prev.timer,
              status: 'expired',
            },
          };
        });
      }
    };

    checkTimer();
    const intervalId = setInterval(checkTimer, 1000);

    return () => clearInterval(intervalId);
  }, [session?.timer?.enabled, session?.timer?.expiresAt, session?.timer?.status, session?.status]);

  // MODULE 17: Section Resolution & Compatibility
  const presSections = useMemo<PresentationalSection[]>(() => {
    if (!test) return [];
    return resolveSectionsForTest(test);
  }, [test]);

  const hasSections = Boolean(test?.sections && test.sections.length > 0);

  const orderedQuestions = useMemo<Question[]>(() => {
    if (!test) return [];
    if (!hasSections) return test.questions || [];
    return presSections.flatMap((ps: PresentationalSection) => ps.questions);
  }, [test, hasSections, presSections]);

  // ----------------------------------------------------
  // 2. CONDITIONAL ERROR & EMPTY STATES (AFTER ALL HOOKS)
  // ----------------------------------------------------

  // State A: Test Not Found / Invalid Test ID
  if (!test) {
    return (
      <div className="min-h-screen bg-[#F3F6FA] flex flex-col items-center justify-center p-4">
        <div className="bg-[#FCFCFA] rounded-2xl border border-[#DCE4EE] p-8 max-w-md w-full text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto shadow-2xs">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-extrabold text-[#173B72]">
              Test Not Found
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              The requested assessment could not be located. It may have been removed or the link is invalid.
            </p>
          </div>
          <div className="pt-2">
            {isSharedStudent ? (
              <Button
                variant="outline"
                size="md"
                className="w-full justify-center text-xs"
                onClick={() => window.location.reload()}
              >
                Retry Access Link
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                className="w-full justify-center"
                onClick={onExit}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Return to Dashboard
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const totalQuestions = orderedQuestions.length;
  const isZeroQuestions = totalQuestions === 0;

  // State B: Session Not Started or Zero Questions -> StudentStartScreen
  if (!session || isZeroQuestions) {
    const effectiveShareCode = shareCode || test.access?.accessCode || null;
    return (
      <StudentStartScreen
        test={test}
        onStartTest={(studentName) => {
          const freshSession = createTestSession(test.id, studentName, test);
          setSession(freshSession);
          saveActiveStudentSession(freshSession);
          if (freshSession.timer?.enabled) {
            setRemainingSeconds(freshSession.timer.durationSeconds);
          }
        }}
        onExit={onExit}
        isSharedStudent={isSharedStudent}
        shareCode={effectiveShareCode}
        onResumeSession={(resumedSession) => {
          setSession(resumedSession);
          saveActiveStudentSession(resumedSession);
          if (resumedSession.timer?.enabled && resumedSession.timer.expiresAt) {
            setRemainingSeconds(calculateRemainingSeconds(resumedSession.timer.expiresAt));
          }
        }}
      />
    );
  }

  // State C: Session Already Submitted -> StudentResultsPage or StudentSubmissionSuccess
  if (session.status === 'submitted') {
    const effectiveShareCode = shareCode || test.access?.accessCode;

    if (test.settings?.showResultsAfterSubmission && showResultsView) {
      return (
        <StudentResultsPage
          test={test}
          session={session}
          onExit={onExit}
          isSharedStudent={isSharedStudent}
          onViewSubmissionReceipt={() => {
            setShowResultsView(false);
            if (isSharedStudent && effectiveShareCode) {
              if (window.location.pathname.startsWith('/test/')) {
                if (window.location.hash) {
                  history.pushState('', document.title, window.location.pathname);
                }
              } else {
                window.location.hash = `#/test/${encodeURIComponent(effectiveShareCode)}`;
              }
            } else {
              window.location.hash = `student/${test.id}`;
            }
          }}
        />
      );
    }

    return (
      <StudentSubmissionSuccess
        test={test}
        session={session}
        onExit={onExit}
        isSharedStudent={isSharedStudent}
        onViewResults={
          test.settings?.showResultsAfterSubmission
            ? () => {
                setShowResultsView(true);
                if (isSharedStudent && effectiveShareCode) {
                  if (window.location.pathname.startsWith('/test/')) {
                    window.location.hash = 'results';
                  } else {
                    window.location.hash = `#/test/${encodeURIComponent(effectiveShareCode)}/results`;
                  }
                } else {
                  window.location.hash = `student/${test.id}/results`;
                }
              }
            : undefined
        }
      />
    );
  }

  // ----------------------------------------------------
  // 3. ACTIVE STUDENT TEST UI
  // ----------------------------------------------------

  // Expiration calculation
  const isExpired = Boolean(
    session.status === 'expired' ||
      (session.timer?.enabled &&
        (session.timer.status === 'expired' || remainingSeconds <= 0))
  );

  const isLowTime = Boolean(
    session.timer?.enabled && !isExpired && remainingSeconds <= 60
  );

  const timerDisplayText = formatTimerDisplay(
    remainingSeconds,
    session.timer?.durationSeconds
  );

  // Safely clamp index in case questions were modified in editor
  const currentIndex = Math.max(
    0,
    Math.min(session.currentQuestionIndex, totalQuestions - 1)
  );
  const currentQuestion = orderedQuestions[currentIndex];

  // MODULE 17: Current Section Resolution
  const currentSectionIndex = (() => {
    if (!currentQuestion) return 0;
    const idx = presSections.findIndex((ps: PresentationalSection) =>
      ps.questions.some((q: Question) => q.id === currentQuestion.id)
    );
    return idx >= 0 ? idx : 0;
  })();

  const currentPresentationalSection = presSections[currentSectionIndex];
  const currentSection = currentPresentationalSection?.section;
  const currentSectionQuestions = currentPresentationalSection?.questions || [];

  // Calculate answered count based on valid questions
  const answeredCount = orderedQuestions.filter((q: Question) =>
    isQuestionAnswered(session.answers[q.id])
  ).length;

  const currentSectionAnsweredCount = currentSectionQuestions.filter((q: Question) =>
    isQuestionAnswered(session.answers[q.id])
  ).length;

  // Handle student answer change
  const handleAnswerChange = (answer: StudentAnswer) => {
    if (session?.status === 'submitted' || isExpired || !currentQuestion) return;
    setSession((prev) => {
      if (!prev || prev.status === 'submitted') return prev;
      return {
        ...prev,
        answers: {
          ...prev.answers,
          [currentQuestion.id]: answer,
        },
      };
    });
  };

  const handleSpecificAnswerChange = (questionId: string, answer: StudentAnswer) => {
    if (session?.status === 'submitted' || isExpired) return;
    setSession((prev) => {
      if (!prev || prev.status === 'submitted') return prev;
      return {
        ...prev,
        answers: {
          ...prev.answers,
          [questionId]: answer,
        },
      };
    });
  };

  // Navigation handlers
  const handlePrevious = () => {
    if (session?.status === 'submitted' || isExpired) return;
    if (currentIndex > 0) {
      const targetIdx = currentIndex - 1;
      setSession((prev) => {
        if (!prev || prev.status === 'submitted') return prev;
        return {
          ...prev,
          currentQuestionIndex: targetIdx,
        };
      });
      const targetQ = orderedQuestions[targetIdx];
      const curQ = orderedQuestions[currentIndex];
      setTimeout(() => {
        if (targetQ && curQ && targetQ.readingSetId && targetQ.readingSetId === curQ.readingSetId) {
          const el = document.getElementById(`student-question-${targetQ.id}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return;
          }
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 60);
    }
  };

  const handleNext = () => {
    if (session?.status === 'submitted' || isExpired) return;
    if (currentIndex < totalQuestions - 1) {
      const targetIdx = currentIndex + 1;
      setSession((prev) => {
        if (!prev || prev.status === 'submitted') return prev;
        return {
          ...prev,
          currentQuestionIndex: targetIdx,
        };
      });
      const targetQ = orderedQuestions[targetIdx];
      const curQ = orderedQuestions[currentIndex];
      setTimeout(() => {
        if (targetQ && curQ && targetQ.readingSetId && targetQ.readingSetId === curQ.readingSetId) {
          const el = document.getElementById(`student-question-${targetQ.id}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return;
          }
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 60);
    }
  };

  const handleJumpToQuestion = (idx: number) => {
    if (session?.status === 'submitted' || isExpired) return;
    if (idx >= 0 && idx < totalQuestions) {
      setSession((prev) => {
        if (!prev || prev.status === 'submitted') return prev;
        return {
          ...prev,
          currentQuestionIndex: idx,
        };
      });
      const targetQ = orderedQuestions[idx];
      setTimeout(() => {
        const el = document.getElementById(`student-question-${targetQ.id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 60);
    }
  };

  const handleSelectSection = (secIdx: number) => {
    if (isExpired || session?.status === 'submitted') return;
    const targetPs = presSections[secIdx];
    if (!targetPs || targetPs.questions.length === 0) return;
    const firstQ = targetPs.questions[0];
    const targetOverallIdx = orderedQuestions.findIndex((q: Question) => q.id === firstQ.id);
    if (targetOverallIdx >= 0) {
      handleJumpToQuestion(targetOverallIdx);
    }
  };

  // Submission Handlers
  const handleOpenSubmit = () => {
    if (!session || session.status === 'submitted') return;
    const validation = canSubmitSession(session, test);
    if (!validation.canSubmit) {
      if (validation.reason) {
        setValidationError(validation.reason);
      }
      return;
    }

    // Module 13: Check minimum word count warnings for writing questions
    let wordCountWarning: string | null = null;
    orderedQuestions.forEach((q: Question, idx: number) => {
      const norm = String(q.type).replace(/-/g, '_').toLowerCase();
      if (norm === 'writing' && q.writingConfig?.minimumWords) {
        const studentAns = session.answers ? session.answers[q.id] : undefined;
        const text = studentAns && studentAns.type === 'writing' ? studentAns.text : '';
        const evalResult = evaluateWordCount(text, q.writingConfig.minimumWords, q.writingConfig.maximumWords);
        if (!evalResult.meetsMinimum) {
          wordCountWarning = `Your response to Question ${idx + 1} contains ${evalResult.count} words. The minimum required is ${evalResult.minRequired} words.`;
        }
      }
    });

    if (wordCountWarning) {
      setSubmitWarning(wordCountWarning);
      setShowSubmitWarningModal(true);
      return;
    }

    setShowSubmitConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    if (isSubmitting || !session || session.status === 'submitted') return;
    setIsSubmitting(true);
    setShowSubmitConfirm(false);

    try {
      const submitted = submitTestSession(session);
      setSession(submitted);
      saveActiveStudentSession(submitted);

      // Module 7 & 10: Authoritative Server-side Grading & Cross-Device Persistence
      let graded = false;
      try {
        const res = await fetch('/api/tests/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            testId: test.id,
            accessCode: test.access?.accessCode,
            sessionId: submitted.id,
            studentName: submitted.studentName,
            startedAt: submitted.startedAt,
            submittedAt: submitted.submittedAt,
            answers: submitted.answers,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.gradingResult) {
            saveGradingResult(data.gradingResult);
            graded = true;
          }
        }
      } catch (err) {
        console.warn('[StudentTest] Server submission network error, falling back to local grading:', err);
      }

      if (!graded) {
        try {
          const gradingResult = gradeTestSession(test, submitted);
          saveGradingResult(gradingResult);
        } catch (err) {
          console.error('Failed to grade submitted session locally:', err);
        }
      }

      // REQUIREMENT: SUBMISSION MUST NEVER AUTOMATICALLY NAVIGATE DIRECTLY TO RESULTS.
      // The Submission Receipt from Module 6 must always be the immediate post-submission page.
      setShowResultsView(false);
      const effectiveShareCode = shareCode || test.access?.accessCode;
      if (isSharedStudent && effectiveShareCode) {
        if (window.location.pathname.startsWith('/test/')) {
          if (window.location.hash) {
            history.pushState('', document.title, window.location.pathname);
          }
        } else {
          window.location.hash = `#/test/${encodeURIComponent(effectiveShareCode)}`;
        }
      } else {
        window.location.hash = `student/${test.id}`;
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmExit = () => {
    if (test) {
      clearActiveStudentSession(test.id);
    }
    setSession(null);
    setShowExitConfirm(false);
    onExit();
  };

  const isFirstQuestion = currentIndex === 0;
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const progressPercent =
    totalQuestions > 0 ? Math.round(((currentIndex + 1) / totalQuestions) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#F3F6FA] flex flex-col justify-between">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-[#FCFCFA] border-b border-[#DCE4EE] shadow-2xs">
        <div className="max-w-6xl w-full mx-auto px-3 sm:px-6 h-13 sm:h-16 flex items-center justify-between gap-2 sm:gap-3">
          {/* Brand + Test Title (Desktop & Mobile) */}
          <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="font-extrabold text-[#173B72] text-sm sm:text-base tracking-tight">
                Assess<span className="text-orange-500">ora</span>
              </span>
              <span className="text-2xs font-semibold px-2 py-0.5 rounded-md bg-[#EEF5FF] text-[#2563EB] border border-blue-200 hidden sm:inline-block">
                Student
              </span>
            </div>
            <span className="text-slate-300 hidden sm:inline">|</span>
            <span className="text-xs sm:text-base font-bold text-slate-800 truncate max-w-[110px] xs:max-w-[140px] sm:max-w-xs md:max-w-md lg:max-w-xl">
              {test.title || 'Assessment'}
            </span>
          </div>

          {/* Center/Right: Timer, Compact Submit, Student Menu */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Countdown Timer Widget */}
            {session.timer?.enabled && (
              <div
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-lg sm:rounded-xl border font-mono font-bold text-xs sm:text-sm tracking-wide transition-all shadow-2xs ${
                  isExpired
                    ? 'bg-rose-100 text-rose-700 border-rose-300'
                    : isLowTime
                    ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                    : 'bg-[#F7F9FC] text-[#173B72] border-[#DCE4EE]'
                }`}
                title={
                  isExpired
                    ? "Time's up! Assessment is locked."
                    : isLowTime
                    ? 'Less than 1 minute remaining!'
                    : 'Time remaining'
                }
              >
                <Clock
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${
                    isExpired || isLowTime ? 'text-rose-600' : 'text-[#2563EB]'
                  }`}
                />
                <span>{timerDisplayText}</span>
                {isExpired && (
                  <span className="text-3xs uppercase tracking-wider px-1 py-0.2 rounded bg-rose-200 text-rose-800 font-sans hidden sm:inline">
                    Time&apos;s Up
                  </span>
                )}
              </div>
            )}

            {/* Submit button: Responsive on mobile & desktop */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleOpenSubmit}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold cursor-pointer transition-colors shadow-2xs disabled:opacity-50"
              title="Submit test"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Submit</span>
            </button>

            {/* Desktop Student Name Badge */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F7F9FC] border border-[#DCE4EE] text-slate-700">
              <User className="w-3.5 h-3.5 text-[#2563EB]" />
              <span className="text-xs font-semibold truncate max-w-[120px]">
                {session.studentName}
              </span>
            </div>

            {/* Desktop Exit Button */}
            <button
              type="button"
              onClick={() => {
                if (answeredCount > 0 && !isExpired) {
                  setShowExitConfirm(true);
                } else {
                  handleConfirmExit();
                }
              }}
              className="hidden md:inline-block text-xs font-semibold text-slate-500 hover:text-rose-600 transition-colors cursor-pointer px-2.5 py-1 rounded-lg hover:bg-slate-100"
              title="Leave assessment"
            >
              Exit
            </button>

            {/* Mobile Actions Menu Trigger */}
            <div className="relative md:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="p-1.5 rounded-lg border border-[#DCE4EE] bg-[#F7F9FC] text-slate-700 hover:bg-slate-100 cursor-pointer flex items-center justify-center"
                aria-label="Student menu"
                title="Student options"
              >
                <Menu className="w-4 h-4" />
              </button>

              {/* Mobile Popover Menu */}
              {mobileMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-black/20"
                    onClick={() => setMobileMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-1.5 w-48 bg-white border border-[#DCE4EE] rounded-xl shadow-lg z-50 p-2 space-y-1">
                    <div className="px-2.5 py-1.5 border-b border-slate-100 text-2xs">
                      <div className="text-slate-400 font-medium">Student</div>
                      <div className="font-bold text-[#173B72] truncate">{session.studentName}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setMobileNavOpen(true);
                      }}
                      className="w-full text-left px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2"
                    >
                      <ListFilter className="w-3.5 h-3.5 text-[#2563EB]" />
                      <span>Question List</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        if (answeredCount > 0 && !isExpired) {
                          setShowExitConfirm(true);
                        } else {
                          handleConfirmExit();
                        }
                      }}
                      className="w-full text-left px-2.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-500" />
                      <span>Exit Assessment</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Progress Strip */}
        <div className="border-t border-[#DCE4EE]/70 bg-white">
          <div className="max-w-6xl w-full mx-auto px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-extrabold text-[#173B72] text-xs sm:text-sm">
                Question {currentIndex + 1} of {totalQuestions}
              </span>
              {currentQuestion?.readingSetId && (
                <span className="text-3xs font-mono font-bold uppercase text-emerald-800 bg-emerald-100/90 px-1.5 sm:px-2 py-0.5 rounded border border-emerald-300 inline-flex items-center gap-1">
                  <BookOpen className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-700" />
                  <span>Passage</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Question overview button for quick mobile jumping */}
              {totalQuestions > 1 && (
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(true)}
                  className="sm:hidden px-2 py-0.5 text-2xs font-bold text-[#2563EB] bg-[#EEF5FF] border border-blue-200 rounded-md hover:bg-blue-100 cursor-pointer flex items-center gap-1"
                >
                  <ListFilter className="w-3 h-3" />
                  <span>All ({answeredCount}/{totalQuestions})</span>
                </button>
              )}

              <span className="text-slate-500 text-xs hidden sm:inline">
                Answered:{' '}
                <span className="font-bold text-[#173B72] font-mono">
                  {answeredCount} / {totalQuestions}
                </span>
              </span>
            </div>
          </div>

          {/* Progress bar line */}
          <div className="h-1.5 w-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isExpired ? 'bg-rose-500' : 'bg-[#2563EB]'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </header>

      {/* Main Test Area */}
      {(() => {
        const currentReadingSet = currentQuestion?.readingSetId
          ? (test.readingSets || []).find((rs) => rs.id === currentQuestion.readingSetId)
          : undefined;
        const readingSetIndex = currentReadingSet
          ? (test.readingSets || []).findIndex((rs) => rs.id === currentReadingSet.id)
          : -1;
        const readingSetQuestions = currentReadingSet
          ? (hasSections && currentPresentationalSection
              ? currentPresentationalSection.questions.filter((q: Question) => q.readingSetId === currentReadingSet.id)
              : orderedQuestions.filter((q: Question) => q.readingSetId === currentReadingSet.id))
          : [];

        return (
          <main
            className={`flex-1 w-full mx-auto px-2.5 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6 ${
              currentReadingSet ? 'max-w-6xl' : 'max-w-4xl'
            }`}
          >
            {/* Expiration Banner if Timer Expired */}
            {isExpired && (
              <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 sm:p-6 text-center space-y-3 shadow-xs">
                <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-rose-100 text-rose-600 mb-1 shadow-2xs">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
                </div>
                <h2 className="text-base sm:text-xl font-extrabold text-rose-800 tracking-tight">
                  TIME&apos;S UP
                </h2>
                <p className="text-xs sm:text-sm font-bold text-rose-700">
                  Your time for this test has ended.
                </p>
                <p className="text-2xs sm:text-xs text-rose-600 max-w-md mx-auto">
                  Your answers have been preserved. Editing and question navigation are now locked. You can now submit your assessment.
                </p>
                <div className="pt-2 flex justify-center">
                  <Button
                    variant="primary"
                    size="md"
                    disabled={isSubmitting}
                    onClick={handleOpenSubmit}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold border-emerald-700 shadow-sm"
                    leftIcon={<CheckCircle2 className="w-4 h-4" />}
                  >
                    Submit Test
                  </Button>
                </div>
              </div>
            )}

            {/* MODULE 17: Section Navigation Tabs (When assessment has sections) */}
            {hasSections && presSections.length > 0 && (
              <div className="bg-[#FCFCFA] rounded-xl sm:rounded-2xl border border-[#DCE4EE] p-2 sm:p-2.5 shadow-2xs">
                <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-thin pb-0.5">
                  {presSections.map((ps: PresentationalSection, secIdx: number) => {
                    const isCurrentSec = secIdx === currentSectionIndex;
                    const secAnswered = ps.questions.filter((q: Question) =>
                      isQuestionAnswered(session.answers[q.id])
                    ).length;
                    const secTotal = ps.questions.length;
                    const isAllAnswered = secTotal > 0 && secAnswered === secTotal;

                    return (
                      <button
                        key={`sec_tab_${ps.section.id}`}
                        type="button"
                        disabled={isExpired}
                        onClick={() => handleSelectSection(secIdx)}
                        className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                          isCurrentSec
                            ? 'bg-[#173B72] text-white shadow-xs ring-2 ring-blue-300'
                            : isAllAnswered
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100/70'
                            : 'bg-white text-slate-700 border border-[#DCE4EE] hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        {getSectionIcon(ps.section.type, isCurrentSec)}
                        <span className="truncate max-w-[130px] sm:max-w-none">
                          {ps.section.title || `Section ${secIdx + 1}`}
                        </span>
                        <span
                          className={`text-2xs font-mono font-semibold px-1.5 py-0.5 rounded-full ${
                            isCurrentSec
                              ? 'bg-white/20 text-white'
                              : isAllAnswered
                              ? 'bg-emerald-200/60 text-emerald-900'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {secAnswered}/{secTotal}
                        </span>
                        {isAllAnswered && !isCurrentSec && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* MODULE 17: Current Section Header Card with Section Audio */}
            {hasSections && currentSection && (
              <div className="bg-[#FCFCFA] rounded-xl sm:rounded-2xl border border-[#DCE4EE] p-4 sm:p-5 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-2xs font-bold border ${getSectionTypeBadgeClass(
                        currentSection.type
                      )}`}
                    >
                      {getSectionIcon(currentSection.type)}
                      <span>{currentSection.type}</span>
                    </span>
                    <h2 className="text-base sm:text-lg font-extrabold text-[#173B72] tracking-tight">
                      {currentSection.title}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2 text-2xs text-slate-500 shrink-0 font-medium font-mono">
                    <span>
                      Section {currentSectionIndex + 1}/{presSections.length}
                    </span>
                    <span>•</span>
                    <span className="text-[#173B72] font-bold">
                      {currentSectionQuestions.length} Qs
                    </span>
                    <span>•</span>
                    <span>
                      {currentPresentationalSection?.totalPoints} pts
                    </span>
                  </div>
                </div>

                {/* Section Instructions if present */}
                {currentSection.instructions && (
                  <div className="bg-[#F8FAFC] border border-[#DCE4EE]/80 rounded-xl p-3 text-xs text-slate-600 leading-relaxed flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <p className="whitespace-pre-line">{currentSection.instructions}</p>
                  </div>
                )}

                {/* Section-Level Audio Player: Rendered ONLY in its associated section! */}
                {currentSection.audioId && (
                  <div className="pt-1">
                    <StudentAudioPlayer
                      key={`sec_audio_${currentSection.id}_${currentSection.audioId}`}
                      audioId={currentSection.audioId}
                      audioMetadata={currentSection.audioMetadata}
                      instructions="Audio recording for this section"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Question Quick Jump Ribbon */}
            {totalQuestions > 1 && (
              <div className="bg-[#FCFCFA] rounded-xl border border-[#DCE4EE] p-2 sm:p-3 shadow-2xs">
                <div className="flex items-center justify-between pb-1 sm:hidden text-2xs text-slate-500 font-semibold px-1">
                  <span>
                    {hasSections && currentSection ? currentSection.title : 'Questions'} (
                    {hasSections ? currentSectionAnsweredCount : answeredCount}/
                    {hasSections ? currentSectionQuestions.length : totalQuestions} answered)
                  </span>
                  <button
                    type="button"
                    onClick={() => setMobileNavOpen(true)}
                    className="text-[#2563EB] font-bold flex items-center gap-0.5"
                  >
                    <ListFilter className="w-3 h-3" />
                    <span>Grid View</span>
                  </button>
                </div>
                {hasSections ? (
                  <div className="flex items-center gap-3 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
                    {presSections.map((ps: PresentationalSection, secIdx: number) => {
                      const isCurrentSec = secIdx === currentSectionIndex;
                      return (
                        <div
                          key={`jump_group_${ps.section.id}`}
                          className="flex items-center gap-1.5 shrink-0 pl-2 border-l-2 first:border-l-0 border-[#DCE4EE]"
                        >
                          <button
                            type="button"
                            onClick={() => handleSelectSection(secIdx)}
                            className={`text-3xs font-extrabold uppercase font-mono px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                              isCurrentSec
                                ? 'bg-[#173B72] text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            title={`Switch to ${ps.section.title}`}
                          >
                            S{secIdx + 1}
                          </button>
                          {ps.questions.map((q: Question) => {
                            const overallIdx = orderedQuestions.findIndex(
                              (item: Question) => item.id === q.id
                            );
                            const isCurrent = overallIdx === currentIndex;
                            const isAnswered = isQuestionAnswered(session.answers[q.id]);
                            const isReadingQ = Boolean(q.readingSetId);

                            return (
                              <button
                                key={`jump_${q.id || overallIdx}`}
                                type="button"
                                disabled={isExpired}
                                onClick={() => handleJumpToQuestion(overallIdx)}
                                className={`min-w-[32px] h-8 sm:min-w-[40px] sm:h-10 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold font-mono shrink-0 transition-all flex items-center justify-center relative cursor-pointer ${
                                  isExpired
                                    ? 'cursor-not-allowed opacity-60 bg-slate-100 text-slate-400 border border-slate-200'
                                    : isCurrent
                                    ? 'bg-[#173B72] text-white shadow-2xs ring-2 ring-blue-300'
                                    : isAnswered
                                    ? 'bg-[#EEF5FF] text-[#2563EB] border border-blue-200 hover:bg-blue-100/70'
                                    : isReadingQ
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:border-emerald-300'
                                    : 'bg-white text-slate-600 border border-[#DCE4EE] hover:border-slate-300'
                                }`}
                                title={
                                  isExpired
                                    ? 'Test is locked'
                                    : `Question ${overallIdx + 1}${
                                        isReadingQ ? ' (Reading)' : ''
                                      }${isAnswered ? ' (Answered)' : ' (Unanswered)'}`
                                }
                              >
                                <span>{overallIdx + 1}</span>
                                {isAnswered && !isCurrent && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] absolute top-1 right-1 sm:top-1.5 sm:right-1.5" />
                                )}
                                {isReadingQ && !isCurrent && !isAnswered && (
                                  <span className="w-1 h-1 rounded-full bg-emerald-500 absolute top-1 right-1 sm:top-1.5 sm:right-1.5" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
                    {orderedQuestions.map((q: Question, idx: number) => {
                      const isCurrent = idx === currentIndex;
                      const isAnswered = isQuestionAnswered(session.answers[q.id]);
                      const isReadingQ = Boolean(q.readingSetId);

                      return (
                        <button
                          key={`jump_${q.id || idx}_${idx}`}
                          type="button"
                          disabled={isExpired}
                          onClick={() => handleJumpToQuestion(idx)}
                          className={`min-w-[32px] h-8 sm:min-w-[40px] sm:h-10 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold font-mono shrink-0 transition-all flex items-center justify-center relative ${
                            isExpired
                              ? 'cursor-not-allowed opacity-60 bg-slate-100 text-slate-400 border border-slate-200'
                              : isCurrent
                              ? 'bg-[#173B72] text-white shadow-2xs ring-2 ring-blue-300 cursor-pointer'
                              : isAnswered
                              ? 'bg-[#EEF5FF] text-[#2563EB] border border-blue-200 hover:bg-blue-100/70 cursor-pointer'
                              : isReadingQ
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:border-emerald-300 cursor-pointer'
                              : 'bg-white text-slate-600 border border-[#DCE4EE] hover:border-slate-300 cursor-pointer'
                          }`}
                          title={
                            isExpired
                              ? 'Test is locked'
                              : `Question ${idx + 1}${isReadingQ ? ' (Reading)' : ''}${
                                  isAnswered ? ' (Answered)' : ' (Unanswered)'
                                }`
                          }
                        >
                          <span>{idx + 1}</span>
                          {isAnswered && !isCurrent && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] absolute top-1 right-1 sm:top-1.5 sm:right-1.5" />
                          )}
                          {isReadingQ && !isCurrent && !isAnswered && (
                            <span className="w-1 h-1 rounded-full bg-emerald-500 absolute top-1 right-1 sm:top-1.5 sm:right-1.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Legacy Assessment Audio Player: Only if test has NO sections and test.audioId exists */}
            {!hasSections && test.audioId && (
              <StudentAudioPlayer
                key={`audio_player_${test.audioId}`}
                audioId={test.audioId}
                audioMetadata={test.audioMetadata}
                instructions={test.description}
                className="mb-1"
              />
            )}

            {/* Content View: Either Reading Passage Set or Standalone Question */}
            {currentReadingSet ? (
              <StudentReadingSetView
                key={`rs_view_${currentReadingSet.id}`}
                readingSet={currentReadingSet}
                setIndex={readingSetIndex >= 0 ? readingSetIndex : 0}
                questions={readingSetQuestions}
                allQuestions={orderedQuestions}
                answers={session.answers}
                disabled={isExpired}
                onAnswerChange={handleSpecificAnswerChange}
                activeQuestionId={currentQuestion?.id}
                onSelectQuestion={(qId) => {
                  const targetIdx = orderedQuestions.findIndex((q) => q.id === qId);
                  if (targetIdx >= 0) handleJumpToQuestion(targetIdx);
                }}
              />
            ) : (
              currentQuestion && (
                <StudentQuestionView
                  key={currentQuestion.id}
                  question={currentQuestion}
                  questionNumber={currentIndex + 1}
                  totalQuestions={totalQuestions}
                  answer={session.answers[currentQuestion.id]}
                  disabled={isExpired}
                  onAnswerChange={handleAnswerChange}
                />
              )
            )}

            {/* Navigation Buttons Controls */}
            <div className="flex items-center justify-between pt-2 gap-2">
              {/* Previous Button */}
              <Button
                variant="outline"
                size="md"
                disabled={isFirstQuestion || isExpired}
                onClick={handlePrevious}
                className="px-3 sm:px-4 text-xs sm:text-sm font-bold min-h-[42px] touch-manipulation"
                leftIcon={<ChevronLeft className="w-4 h-4 shrink-0" />}
              >
                Previous
              </Button>

              {/* Current Question Indicator */}
              <div className="text-center text-xs sm:text-sm font-semibold text-slate-600 px-1">
                <span className="hidden xs:inline">Question </span>
                <span className="font-extrabold text-[#173B72]">{currentIndex + 1}</span>
                <span className="text-slate-400 font-normal"> / </span>
                <span className="font-extrabold text-[#173B72]">{totalQuestions}</span>
              </div>

              {/* Next Button or Submit Test */}
              {isExpired ? (
                <Button
                  variant="primary"
                  size="md"
                  disabled={isSubmitting}
                  onClick={handleOpenSubmit}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold border-emerald-700 shadow-sm px-3 sm:px-4 text-xs sm:text-sm min-h-[42px] touch-manipulation"
                  leftIcon={<CheckCircle2 className="w-4 h-4 shrink-0" />}
                >
                  Submit
                </Button>
              ) : isLastQuestion ? (
                <Button
                  variant="primary"
                  size="md"
                  disabled={isSubmitting}
                  onClick={handleOpenSubmit}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold border-emerald-700 shadow-sm px-3 sm:px-4 text-xs sm:text-sm min-h-[42px] touch-manipulation"
                  leftIcon={<CheckCircle2 className="w-4 h-4 shrink-0" />}
                >
                  Submit
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  disabled={isExpired}
                  onClick={handleNext}
                  className="px-3.5 sm:px-5 text-xs sm:text-sm font-bold min-h-[42px] touch-manipulation"
                  rightIcon={<ChevronRight className="w-4 h-4 shrink-0" />}
                >
                  Next
                </Button>
              )}
            </div>
          </main>
        );
      })()}

      {/* Footer info */}
      <footer className="py-4 text-center text-3xs text-slate-400 border-t border-[#DCE4EE]/60 bg-[#FCFCFA]">
        Assessora by GYTama EDU — Answers are preserved locally during your session
      </footer>

      {/* Confirm Exit Modal */}
      <ConfirmModal
        isOpen={showExitConfirm}
        title="Leave Assessment?"
        description="You have answered questions in this session. If you leave now, you will return to the student start screen."
        confirmText="Leave Test"
        cancelText="Continue Test"
        confirmVariant="danger"
        onConfirm={handleConfirmExit}
        onCancel={() => setShowExitConfirm(false)}
      />

      {/* Submit Confirmation Modal */}
      <ConfirmModal
        isOpen={showSubmitConfirm}
        title="Submit your test?"
        description={
          answeredCount < totalQuestions
            ? `You have answered ${answeredCount} of ${totalQuestions} questions (${totalQuestions - answeredCount} unanswered). Are you sure you want to submit? You will not be able to change your answers after submission.`
            : `All ${totalQuestions} questions have been answered. Are you sure you want to submit? You will not be able to change your answers after submission.`
        }
        confirmText={isSubmitting ? 'Submitting...' : 'Submit Test'}
        cancelText="Cancel"
        confirmVariant="primary"
        isLoading={isSubmitting}
        onConfirm={handleConfirmSubmit}
        onCancel={() => {
          if (!isSubmitting) setShowSubmitConfirm(false);
        }}
      />

      {/* Word Count Warning Modal (Module 13) */}
      <ConfirmModal
        isOpen={showSubmitWarningModal}
        title="Word Count Requirement Warning"
        description={submitWarning || 'One or more written responses do not meet the minimum required word count.'}
        confirmText="Submit Anyway"
        cancelText="Continue Writing"
        confirmVariant="primary"
        onConfirm={() => {
          setShowSubmitWarningModal(false);
          setSubmitWarning(null);
          handleConfirmSubmit();
        }}
        onCancel={() => {
          setShowSubmitWarningModal(false);
          setSubmitWarning(null);
        }}
      />

      {/* Validation Warning Modal (e.g. requireAllQuestions active) */}
      <ConfirmModal
        isOpen={Boolean(validationError)}
        title="Incomplete Assessment"
        description={validationError || ''}
        confirmText="Return to Test"
        cancelText=""
        confirmVariant="primary"
        onConfirm={() => setValidationError(null)}
        onCancel={() => setValidationError(null)}
      />

      {/* Mobile Question Navigator Sheet (for 320-430px viewports) */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="relative bg-white rounded-t-2xl shadow-xl border-t border-[#DCE4EE] max-h-[85vh] flex flex-col z-10 animate-in slide-in-from-bottom duration-200">
            {/* Sheet Header */}
            <div className="p-4 border-b border-[#DCE4EE] flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-[#173B72] text-sm">Question Navigator</h3>
                <p className="text-2xs text-slate-500 font-medium">
                  {answeredCount} of {totalQuestions} answered ({totalQuestions - answeredCount} remaining)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
                aria-label="Close question selector"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Questions Grid */}
            <div className="p-4 overflow-y-auto max-h-[55vh] scrollbar-thin">
              {hasSections ? (
                <div className="space-y-4">
                  {presSections.map((ps: PresentationalSection, secIdx: number) => {
                    const secAnswered = ps.questions.filter((q: Question) =>
                      isQuestionAnswered(session.answers[q.id])
                    ).length;

                    return (
                      <div key={`mob_sec_${ps.section.id}`} className="space-y-2">
                        <div className="flex items-center justify-between text-2xs font-bold text-[#173B72] border-b border-slate-200 pb-1">
                          <div className="flex items-center gap-1.5">
                            {getSectionIcon(ps.section.type)}
                            <span>{ps.section.title || `Section ${secIdx + 1}`}</span>
                          </div>
                          <span className="text-slate-400 font-mono">
                            {secAnswered}/{ps.questions.length} answered
                          </span>
                        </div>
                        <div className="grid grid-cols-5 gap-2.5">
                          {ps.questions.map((q: Question) => {
                            const overallIdx = orderedQuestions.findIndex(
                              (item: Question) => item.id === q.id
                            );
                            const isCurrent = overallIdx === currentIndex;
                            const isAnswered = isQuestionAnswered(session.answers[q.id]);
                            const isReadingQ = Boolean(q.readingSetId);

                            return (
                              <button
                                key={`mob_nav_q_${q.id || overallIdx}`}
                                type="button"
                                disabled={isExpired}
                                onClick={() => {
                                  handleJumpToQuestion(overallIdx);
                                  setMobileNavOpen(false);
                                }}
                                className={`h-11 rounded-xl text-sm font-bold font-mono transition-all flex flex-col items-center justify-center relative touch-manipulation cursor-pointer ${
                                  isExpired
                                    ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-400'
                                    : isCurrent
                                    ? 'bg-[#173B72] text-white shadow-sm ring-2 ring-blue-300'
                                    : isAnswered
                                    ? 'bg-[#EEF5FF] text-[#2563EB] border border-blue-200'
                                    : isReadingQ
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : 'bg-[#F7F9FC] text-slate-600 border border-[#DCE4EE]'
                                }`}
                              >
                                <span>{overallIdx + 1}</span>
                                <span className="text-3xs font-sans font-medium opacity-80 leading-none">
                                  {isAnswered ? 'Done' : '—'}
                                </span>
                                {isReadingQ && !isCurrent && !isAnswered && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute top-1 right-1" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-2.5">
                  {orderedQuestions.map((q: Question, idx: number) => {
                    const isCurrent = idx === currentIndex;
                    const isAnswered = isQuestionAnswered(session.answers[q.id]);
                    const isReadingQ = Boolean(q.readingSetId);

                    return (
                      <button
                        key={`mob_nav_q_${q.id || idx}`}
                        type="button"
                        disabled={isExpired}
                        onClick={() => {
                          handleJumpToQuestion(idx);
                          setMobileNavOpen(false);
                        }}
                        className={`h-11 rounded-xl text-sm font-bold font-mono transition-all flex flex-col items-center justify-center relative touch-manipulation cursor-pointer ${
                          isExpired
                            ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-400'
                            : isCurrent
                            ? 'bg-[#173B72] text-white shadow-sm ring-2 ring-blue-300'
                            : isAnswered
                            ? 'bg-[#EEF5FF] text-[#2563EB] border border-blue-200'
                            : isReadingQ
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-[#F7F9FC] text-slate-600 border border-[#DCE4EE]'
                        }`}
                      >
                        <span>{idx + 1}</span>
                        <span className="text-3xs font-sans font-medium opacity-80 leading-none">
                          {isAnswered ? 'Done' : '—'}
                        </span>
                        {isReadingQ && !isCurrent && !isAnswered && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute top-1 right-1" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sheet Footer */}
            <div className="p-3 border-t border-[#DCE4EE] bg-[#F7F9FC] flex items-center justify-between text-2xs text-slate-500">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#173B72]" /> Current
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#2563EB]" /> Answered
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-300" /> Empty
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="font-bold text-[#2563EB] px-2 py-1"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
