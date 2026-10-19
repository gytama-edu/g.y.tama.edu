/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Test, Question } from '../../types/test';
import { StudentAnswer } from '../../types/student';
import { StudentQuestionView } from '../StudentTest/StudentQuestionView';
import { StudentReadingSetView } from '../StudentTest/StudentReadingSetView';
import { StudentAudioPlayer } from '../StudentTest/StudentAudioPlayer';
import { Button } from '../ui/Button';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  LayoutList,
  BookOpen,
} from 'lucide-react';

interface TestPreviewProps {
  test: Test;
  onClose: () => void;
}

export function TestPreview({ test, onClose }: TestPreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'paginated' | 'all'>('paginated');

  // Simulated student answers for interactive experience during preview
  const [studentAnswers, setStudentAnswers] = useState<
    Record<string, StudentAnswer>
  >({});

  const total = test.questions.length;
  const currentQuestion: Question | undefined = test.questions[currentIndex];

  const handleAnswerChange = (questionId: string, ans: StudentAnswer) => {
    setStudentAnswers((prev) => ({ ...prev, [questionId]: ans }));
  };

  const totalPoints = test.questions.reduce(
    (acc, q) => acc + (q.points || 1),
    0
  );
  const progressPercent =
    total > 0 ? Math.round(((currentIndex + 1) / total) * 100) : 0;

  const currentReadingSet = currentQuestion?.readingSetId
    ? (test.readingSets || []).find((rs) => rs.id === currentQuestion.readingSetId)
    : undefined;
  const readingSetIndex = currentReadingSet
    ? (test.readingSets || []).findIndex((rs) => rs.id === currentReadingSet.id)
    : -1;
  const readingSetQuestions = currentReadingSet
    ? test.questions.filter((q) => q.readingSetId === currentReadingSet.id)
    : [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#F3F6FA] flex flex-col">
      {/* Top Preview Bar */}
      <header className="sticky top-0 z-10 bg-[#FCFCFA] border-b border-[#DCE4EE] px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Back to Editor
          </Button>
          <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-[#64748B] border-l border-[#DCE4EE] pl-3">
            <EyeOff className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Student Preview Mode (Answer keys hidden)</span>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-[#EEF5FF] border border-[#DCE4EE] p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode('paginated')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'paginated'
                ? 'bg-white text-[#173B72] shadow-2xs border border-[#DCE4EE]/70'
                : 'text-[#64748B] hover:text-[#172033]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Step-by-step</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('all')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'all'
                ? 'bg-white text-[#173B72] shadow-2xs border border-[#DCE4EE]/70'
                : 'text-[#64748B] hover:text-[#172033]'
            }`}
          >
            <LayoutList className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>All Questions</span>
          </button>
        </div>
      </header>

      {/* Main Preview Container */}
      <main
        className={`flex-1 w-full mx-auto px-4 py-8 space-y-6 ${
          currentReadingSet && viewMode === 'paginated'
            ? 'max-w-6xl'
            : 'max-w-3xl'
        }`}
      >
        {/* Test Header Card */}
        <div className="bg-[#FCFCFA] rounded-2xl border border-[#DCE4EE] p-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#DCE4EE]/70">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <span className="text-2xs font-extrabold uppercase tracking-wider text-[#64748B]">
                Assessment Preview
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-[#64748B] font-mono">
              <span>{total} questions</span>
              <span>·</span>
              <span>{totalPoints} points</span>
            </div>
          </div>

          <div className="pt-4 space-y-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#173B72] tracking-tight">
              {test.title || 'Untitled Assessment'}
            </h1>
            {test.description && (
              <p className="text-sm text-[#64748B] leading-relaxed">
                {test.description}
              </p>
            )}

            {test.audioId && (
              <div className="pt-2">
                <StudentAudioPlayer
                  key={`preview_audio_${test.audioId}`}
                  audioId={test.audioId}
                  audioMetadata={test.audioMetadata}
                />
              </div>
            )}
          </div>
        </div>

        {total === 0 ? (
          <div className="bg-[#FCFCFA] rounded-2xl border border-[#DCE4EE] p-12 text-center text-slate-500 text-sm">
            This test has no questions yet. Add questions in the editor to
            preview them.
          </div>
        ) : viewMode === 'paginated' && currentQuestion ? (
          /* Step-by-Step Question Presentation */
          <div className="space-y-6">
            {/* Progress bar */}
            <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
              <div
                className="bg-orange-500 h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Render with real student question or reading set renderer */}
            {currentReadingSet ? (
              <StudentReadingSetView
                readingSet={currentReadingSet}
                setIndex={readingSetIndex >= 0 ? readingSetIndex : 0}
                questions={readingSetQuestions}
                allQuestions={test.questions}
                answers={studentAnswers}
                onAnswerChange={handleAnswerChange}
                activeQuestionId={currentQuestion.id}
              />
            ) : (
              <StudentQuestionView
                question={currentQuestion}
                questionNumber={currentIndex + 1}
                totalQuestions={total}
                answer={studentAnswers[currentQuestion.id]}
                onAnswerChange={(ans) =>
                  handleAnswerChange(currentQuestion.id, ans)
                }
              />
            )}

            {/* Pagination Controls */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="md"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                leftIcon={<ChevronLeft className="w-4 h-4" />}
              >
                Previous
              </Button>

              <span className="text-xs text-[#64748B] font-mono font-semibold tabular-nums">
                {currentIndex + 1} / {total}
              </span>

              {currentIndex === total - 1 ? (
                <Button variant="secondary" size="md" onClick={onClose}>
                  End of Test (Back)
                </Button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    setCurrentIndex((prev) => Math.min(total - 1, prev + 1))
                  }
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 shadow-xs hover:shadow-sm transition-all cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ) : (
          /* All Questions in One Continuous Page */
          <div className="space-y-6">
            {test.questions.map((q, idx) => {
              const readingSet = q.readingSetId
                ? (test.readingSets || []).find((rs) => rs.id === q.readingSetId)
                : undefined;
              const isFirstInSet =
                readingSet &&
                (idx === 0 ||
                  test.questions[idx - 1].readingSetId !== q.readingSetId);
              const setIndex = readingSet
                ? (test.readingSets || []).findIndex(
                    (rs) => rs.id === readingSet.id
                  )
                : -1;

              return (
                <React.Fragment key={`prev_all_${q.id}_${idx}`}>
                  {isFirstInSet && readingSet && (
                    <div className="bg-gradient-to-r from-emerald-50 via-teal-50/40 to-white border border-emerald-200/90 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-3 shadow-2xs mt-6 first:mt-0">
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
                    </div>
                  )}

                  <StudentQuestionView
                    question={q}
                    questionNumber={idx + 1}
                    totalQuestions={total}
                    answer={studentAnswers[q.id]}
                    onAnswerChange={(ans) => handleAnswerChange(q.id, ans)}
                  />
                </React.Fragment>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
