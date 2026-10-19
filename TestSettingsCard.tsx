/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TestSettings, DEFAULT_TEST_SETTINGS, ValidationError } from '../../types/test';
import {
  Clock,
  RotateCcw,
  Shuffle,
  ListOrdered,
  Award,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Lock,
  Sparkles,
} from 'lucide-react';

interface TestSettingsCardProps {
  settings: TestSettings;
  errors: ValidationError[];
  onChangeSettings: (newSettings: TestSettings) => void;
  onResetDefaults?: () => void;
}

export function TestSettingsCard({
  settings,
  errors,
  onChangeSettings,
  onResetDefaults,
}: TestSettingsCardProps) {
  // Find specific errors for settings
  const timeLimitError = errors.find((e) => e.field === 'settings_time_limit')?.message;
  const attemptsError = errors.find((e) => e.field === 'settings_attempts')?.message;

  const handleToggleTimeLimit = (enabled: boolean) => {
    onChangeSettings({
      ...settings,
      timeLimitEnabled: enabled,
      // If enabling and no minutes set yet, default to 30 minutes, or preserve existing
      timeLimitMinutes: enabled
        ? settings.timeLimitMinutes && settings.timeLimitMinutes > 0
          ? settings.timeLimitMinutes
          : 30
        : settings.timeLimitMinutes,
    });
  };

  const handleChangeTimeLimitMinutes = (val: string) => {
    if (val === '') {
      onChangeSettings({
        ...settings,
        timeLimitMinutes: null,
      });
      return;
    }
    const parsed = Number(val);
    onChangeSettings({
      ...settings,
      timeLimitMinutes: isNaN(parsed) ? null : parsed,
    });
  };

  const handleChangeAttempts = (val: string) => {
    if (val === '') {
      // Empty triggers validation error
      onChangeSettings({
        ...settings,
        attemptsAllowed: NaN,
      });
      return;
    }
    const parsed = Number(val);
    onChangeSettings({
      ...settings,
      attemptsAllowed: parsed,
    });
  };

  const handleToggleShuffleQuestions = (val: boolean) => {
    onChangeSettings({
      ...settings,
      shuffleQuestions: val,
    });
  };

  const handleToggleShuffleAnswers = (val: boolean) => {
    onChangeSettings({
      ...settings,
      shuffleAnswers: val,
    });
  };

  const handleToggleShowResults = (val: boolean) => {
    onChangeSettings({
      ...settings,
      showResultsAfterSubmission: val,
      // Note: We preserve settings.showCorrectAnswersAfterSubmission value
      // but in UI it is disabled when showResultsAfterSubmission is false
    });
  };

  const handleToggleShowCorrectAnswers = (val: boolean) => {
    if (!settings.showResultsAfterSubmission) return;
    onChangeSettings({
      ...settings,
      showCorrectAnswersAfterSubmission: val,
    });
  };

  const handleToggleRequireAll = (val: boolean) => {
    onChangeSettings({
      ...settings,
      requireAllQuestions: val,
    });
  };

  const handleReset = () => {
    if (onResetDefaults) {
      onResetDefaults();
    } else {
      onChangeSettings({ ...DEFAULT_TEST_SETTINGS });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Overview */}
      <div className="bg-[#FCFCFA] rounded-2xl border border-[#DCE4EE] p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#DCE4EE]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              <h1 className="text-lg sm:text-xl font-extrabold text-[#173B72] tracking-tight">
                Test Settings
              </h1>
              <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-[#EEF5FF] text-[#2563EB] border border-blue-200">
                Configuration
              </span>
            </div>
            <p className="text-xs text-slate-500 max-w-xl">
              Configure timing, attempts, question randomization, and post-submission visibility for this assessment.
            </p>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="self-start sm:self-center inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-800 transition-colors cursor-pointer border border-slate-200/80"
            title="Reset all settings to default values"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset to Defaults</span>
          </button>
        </div>

        {/* Quick summary badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4">
          <div className="bg-[#F7F9FC] rounded-xl p-2.5 border border-[#DCE4EE]/70">
            <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">Time Limit</span>
            <span className="text-xs font-bold text-[#173B72]">
              {settings.timeLimitEnabled
                ? `${settings.timeLimitMinutes || 0} min`
                : 'No limit'}
            </span>
          </div>

          <div className="bg-[#F7F9FC] rounded-xl p-2.5 border border-[#DCE4EE]/70">
            <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">Attempts</span>
            <span className="text-xs font-bold text-[#173B72]">
              {isNaN(settings.attemptsAllowed) ? 'Invalid' : `${settings.attemptsAllowed} attempt${settings.attemptsAllowed === 1 ? '' : 's'}`}
            </span>
          </div>

          <div className="bg-[#F7F9FC] rounded-xl p-2.5 border border-[#DCE4EE]/70">
            <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">Randomization</span>
            <span className="text-xs font-bold text-[#173B72]">
              {settings.shuffleQuestions && settings.shuffleAnswers
                ? 'Questions & Answers'
                : settings.shuffleQuestions
                ? 'Questions only'
                : settings.shuffleAnswers
                ? 'Answers only'
                : 'Standard order'}
            </span>
          </div>

          <div className="bg-[#F7F9FC] rounded-xl p-2.5 border border-[#DCE4EE]/70">
            <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">Results View</span>
            <span className="text-xs font-bold text-[#173B72]">
              {!settings.showResultsAfterSubmission
                ? 'Hidden'
                : settings.showCorrectAnswersAfterSubmission
                ? 'Score + Correct answers'
                : 'Score only'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Settings Sections */}
      <div className="space-y-4">
        {/* GROUP A: TIME LIMIT */}
        <div
          id="setting-group-timelimit"
          className={`bg-white rounded-2xl border p-5 sm:p-6 transition-all shadow-2xs space-y-4 ${
            timeLimitError
              ? 'border-rose-300 ring-2 ring-rose-100'
              : 'border-[#DCE4EE]'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#EEF5FF] text-[#2563EB] flex items-center justify-center shrink-0 border border-blue-200/60 mt-0.5">
                <Clock className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-[#173B72]">
                    Time Limit
                  </h2>
                  {settings.timeLimitEnabled && (
                    <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Limit how long a student can spend on the test.
                </p>
              </div>
            </div>

            {/* Enable/Disable Toggle */}
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={settings.timeLimitEnabled}
                onChange={(e) => handleToggleTimeLimit(e.target.checked)}
                className="sr-only peer"
                aria-label="Enable time limit"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2563EB]" />
            </label>
          </div>

          {/* Time limit input when enabled */}
          {settings.timeLimitEnabled ? (
            <div className="pt-2 pl-0 sm:pl-12 border-t border-[#DCE4EE]/60">
              <div className="max-w-xs space-y-1.5">
                <label
                  htmlFor="timeLimitMinutesInput"
                  className="block text-xs font-bold text-[#173B72]"
                >
                  Duration in Minutes <span className="text-rose-500">*</span>
                </label>
                <div className="relative rounded-xl shadow-2xs">
                  <input
                    id="timeLimitMinutesInput"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="e.g. 30"
                    value={
                      settings.timeLimitMinutes === null ||
                      settings.timeLimitMinutes === undefined
                        ? ''
                        : isNaN(settings.timeLimitMinutes)
                        ? ''
                        : settings.timeLimitMinutes
                    }
                    onChange={(e) => handleChangeTimeLimitMinutes(e.target.value)}
                    className={`w-full rounded-xl border px-3 py-2 text-sm text-[#172033] bg-[#FCFCFA] placeholder-slate-400 focus:outline-hidden focus:ring-2 transition-all pr-16 ${
                      timeLimitError
                        ? 'border-rose-400 focus:ring-rose-200 focus:border-rose-500'
                        : 'border-[#DCE4EE] focus:ring-blue-100 focus:border-[#2563EB]'
                    }`}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-xs font-semibold text-slate-400">
                    minutes
                  </div>
                </div>

                {timeLimitError ? (
                  <p className="flex items-center gap-1 text-2xs text-rose-600 font-medium pt-0.5">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{timeLimitError}</span>
                  </p>
                ) : (
                  <p className="text-2xs text-slate-400">
                    Must be a positive whole number (e.g. 15, 30, 60, 90).
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="pt-2 pl-0 sm:pl-12 border-t border-[#DCE4EE]/60">
              <p className="text-xs text-slate-400 italic">
                Untimed assessment. Students can take as long as they need.
              </p>
            </div>
          )}
        </div>

        {/* GROUP B: ATTEMPTS */}
        <div
          id="setting-group-attempts"
          className={`bg-white rounded-2xl border p-5 sm:p-6 transition-all shadow-2xs space-y-4 ${
            attemptsError
              ? 'border-rose-300 ring-2 ring-rose-100'
              : 'border-[#DCE4EE]'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] text-orange-600 flex items-center justify-center shrink-0 border border-orange-200/60 mt-0.5">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-sm sm:text-base font-bold text-[#173B72]">
                  Attempts Allowed
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Choose how many times a student can take this test.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 pl-0 sm:pl-12 border-t border-[#DCE4EE]/60">
            <div className="max-w-xs space-y-1.5">
              <label
                htmlFor="attemptsAllowedInput"
                className="block text-xs font-bold text-[#173B72]"
              >
                Number of Attempts <span className="text-rose-500">*</span>
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <input
                  id="attemptsAllowedInput"
                  type="number"
                  min="1"
                  step="1"
                  value={
                    isNaN(settings.attemptsAllowed) ? '' : settings.attemptsAllowed
                  }
                  onChange={(e) => handleChangeAttempts(e.target.value)}
                  className={`w-full rounded-xl border px-3 py-2 text-sm text-[#172033] bg-[#FCFCFA] placeholder-slate-400 focus:outline-hidden focus:ring-2 transition-all pr-16 ${
                    attemptsError
                      ? 'border-rose-400 focus:ring-rose-200 focus:border-rose-500'
                      : 'border-[#DCE4EE] focus:ring-blue-100 focus:border-[#2563EB]'
                  }`}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-xs font-semibold text-slate-400">
                  {settings.attemptsAllowed === 1 ? 'attempt' : 'attempts'}
                </div>
              </div>

              {attemptsError ? (
                <p className="flex items-center gap-1 text-2xs text-rose-600 font-medium pt-0.5">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{attemptsError}</span>
                </p>
              ) : (
                <p className="text-2xs text-slate-400">
                  Default is 1. Minimum is 1 whole number.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* GROUP C & D: RANDOMIZATION (QUESTION & ANSWER ORDER) */}
        <div className="bg-white rounded-2xl border border-[#DCE4EE] p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EEF5FF] text-[#2563EB] flex items-center justify-center shrink-0 border border-blue-200/60 mt-0.5">
              <Shuffle className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h2 className="text-sm sm:text-base font-bold text-[#173B72]">
                Order & Randomization
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Control the presentation sequence of questions and multiple choice options.
              </p>
            </div>
          </div>

          <div className="pt-2 pl-0 sm:pl-12 border-t border-[#DCE4EE]/60 space-y-3.5">
            {/* C. Shuffle Questions */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F7F9FC] border border-[#DCE4EE] hover:border-blue-200 transition-colors">
              <div className="space-y-0.5 pr-4">
                <span className="text-xs font-bold text-[#173B72] block">
                  Shuffle Questions
                </span>
                <span className="text-2xs text-slate-500 block">
                  Randomize the order of questions for each attempt.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={settings.shuffleQuestions}
                  onChange={(e) => handleToggleShuffleQuestions(e.target.checked)}
                  className="sr-only peer"
                  aria-label="Shuffle questions"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2563EB]" />
              </label>
            </div>

            {/* D. Shuffle Answers */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F7F9FC] border border-[#DCE4EE] hover:border-blue-200 transition-colors">
              <div className="space-y-0.5 pr-4">
                <span className="text-xs font-bold text-[#173B72] block">
                  Shuffle Answers
                </span>
                <span className="text-2xs text-slate-500 block">
                  Randomize the order of answer choices.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={settings.shuffleAnswers}
                  onChange={(e) => handleToggleShuffleAnswers(e.target.checked)}
                  className="sr-only peer"
                  aria-label="Shuffle answers"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2563EB]" />
              </label>
            </div>
          </div>
        </div>

        {/* GROUP E: RESULTS & FEEDBACK */}
        <div className="bg-white rounded-2xl border border-[#DCE4EE] p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] text-orange-600 flex items-center justify-center shrink-0 border border-orange-200/60 mt-0.5">
              <Award className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h2 className="text-sm sm:text-base font-bold text-[#173B72]">
                Results & Review
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Determine what feedback students receive immediately upon finishing.
              </p>
            </div>
          </div>

          <div className="pt-2 pl-0 sm:pl-12 border-t border-[#DCE4EE]/60 space-y-3.5">
            {/* Show results after submission */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F7F9FC] border border-[#DCE4EE] hover:border-blue-200 transition-colors">
              <div className="space-y-0.5 pr-4">
                <span className="text-xs font-bold text-[#173B72] block">
                  Show Results After Submission
                </span>
                <span className="text-2xs text-slate-500 block">
                  Allow students to see their results after submitting.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={settings.showResultsAfterSubmission}
                  onChange={(e) => handleToggleShowResults(e.target.checked)}
                  className="sr-only peer"
                  aria-label="Show results after submission"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2563EB]" />
              </label>
            </div>

            {/* Show correct answers after submission (DEPENDENT) */}
            <div
              className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                settings.showResultsAfterSubmission
                  ? 'bg-[#F7F9FC] border-[#DCE4EE] hover:border-blue-200'
                  : 'bg-slate-50/80 border-slate-200 opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="space-y-0.5 pr-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-[#173B72]">
                    Show Correct Answers
                  </span>
                  {!settings.showResultsAfterSubmission && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-slate-200 text-slate-600 text-3xs font-bold">
                      <Lock className="w-2.5 h-2.5" />
                      Requires Results
                    </span>
                  )}
                </div>
                <span className="text-2xs text-slate-500 block">
                  Allow students to see the correct answers after submitting.
                </span>
              </div>

              <label
                className={`relative inline-flex items-center shrink-0 ${
                  settings.showResultsAfterSubmission
                    ? 'cursor-pointer'
                    : 'cursor-not-allowed pointer-events-none'
                }`}
              >
                <input
                  type="checkbox"
                  disabled={!settings.showResultsAfterSubmission}
                  checked={
                    settings.showResultsAfterSubmission &&
                    settings.showCorrectAnswersAfterSubmission
                  }
                  onChange={(e) => handleToggleShowCorrectAnswers(e.target.checked)}
                  className="sr-only peer"
                  aria-label="Show correct answers after submission"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2563EB]" />
              </label>
            </div>
          </div>
        </div>

        {/* GROUP F: COMPLETION REQUIREMENTS */}
        <div className="bg-white rounded-2xl border border-[#DCE4EE] p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EEF5FF] text-[#2563EB] flex items-center justify-center shrink-0 border border-blue-200/60 mt-0.5">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h2 className="text-sm sm:text-base font-bold text-[#173B72]">
                Completion
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Rules governing unanswered questions and submission readiness.
              </p>
            </div>
          </div>

          <div className="pt-2 pl-0 sm:pl-12 border-t border-[#DCE4EE]/60">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F7F9FC] border border-[#DCE4EE] hover:border-blue-200 transition-colors">
              <div className="space-y-0.5 pr-4">
                <span className="text-xs font-bold text-[#173B72] block">
                  Require All Questions
                </span>
                <span className="text-2xs text-slate-500 block">
                  Require students to answer every question before submitting.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={settings.requireAllQuestions}
                  onChange={(e) => handleToggleRequireAll(e.target.checked)}
                  className="sr-only peer"
                  aria-label="Require all questions to be answered"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2563EB]" />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
