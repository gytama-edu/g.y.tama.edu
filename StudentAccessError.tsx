/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { cleanAccessCodeInput } from '../../utils/testAccess';
import {
  Lock,
  FileQuestion,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  KeyRound,
  RefreshCw,
} from 'lucide-react';

export type StudentAccessErrorType = 'disabled' | 'not-found' | 'invalid-code';

interface StudentAccessErrorProps {
  errorType: StudentAccessErrorType;
  attemptedCode?: string | null;
  isSharedStudent?: boolean;
  onExit?: () => void;
  onEnterCode?: (code: string) => void;
  onOpenPortal?: () => void;
}

export function StudentAccessError({
  errorType,
  attemptedCode,
  isSharedStudent,
  onExit,
  onEnterCode,
  onOpenPortal,
}: StudentAccessErrorProps) {
  const [newCode, setNewCode] = useState('');
  const [inlineError, setInlineError] = useState<string | null>(null);

  let title = 'Assessment Not Found';
  let message =
    'This assessment link or code could not be found. It may have expired or been removed.';
  let icon = <FileQuestion className="w-7 h-7 text-amber-600" />;
  let iconBg = 'bg-amber-50 border-amber-200';

  if (errorType === 'disabled') {
    title = 'Assessment Access Closed';
    message =
      'This assessment is currently disabled by the instructor. Access is not active at this time.';
    icon = <Lock className="w-7 h-7 text-slate-600" />;
    iconBg = 'bg-slate-100 border-slate-200';
  } else if (errorType === 'invalid-code') {
    title = 'Invalid Access Code';
    message =
      'The access code or URL format is malformed or invalid. Please check with your instructor.';
    icon = <AlertCircle className="w-7 h-7 text-rose-600" />;
    iconBg = 'bg-rose-50 border-rose-200';
  }

  const handleInlineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = cleanAccessCodeInput(newCode);
    if (!cleaned) {
      setInlineError('Please enter a valid access code.');
      return;
    }
    setInlineError(null);
    if (onEnterCode) {
      onEnterCode(cleaned);
    } else {
      window.location.hash = `#/test/${cleaned}`;
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F6FA] flex flex-col justify-between">
      {/* Top Header */}
      <header className="bg-[#FCFCFA] border-b border-[#DCE4EE] shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-[#173B72] text-base tracking-tight">
              Assess<span className="text-orange-500">ora</span>
            </span>
            <span className="hidden sm:inline-block text-2xs font-semibold px-2 py-0.5 rounded-md bg-[#EEF5FF] text-[#2563EB] border border-blue-200">
              Student Assessment
            </span>
            <span className="sm:hidden text-3xs font-semibold px-1.5 py-0.5 rounded-md bg-[#EEF5FF] text-[#2563EB] border border-blue-200">
              Student
            </span>
          </div>

          {!isSharedStudent && onExit && (
            <button
              type="button"
              onClick={onExit}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#173B72] transition-colors cursor-pointer px-2.5 py-1 rounded-lg hover:bg-slate-200/50"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="bg-[#FCFCFA] rounded-2xl border border-[#DCE4EE] p-6 sm:p-8 max-w-md w-full text-center space-y-6 shadow-xs">
          <div
            className={`w-14 h-14 rounded-2xl border flex items-center justify-center mx-auto shadow-2xs ${iconBg}`}
          >
            {icon}
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl font-extrabold text-[#173B72] tracking-tight">
              {title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">
              {message}
            </p>
            {attemptedCode && (
              <div className="pt-1">
                <span className="inline-block text-3xs font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200">
                  Attempted Code: {attemptedCode}
                </span>
              </div>
            )}
          </div>

          {/* Quick Code Entry Form so student is never stranded */}
          <div className="bg-[#F7F9FC] rounded-xl border border-[#DCE4EE] p-4 text-left space-y-3">
            <label
              htmlFor="reenterCodeInput"
              className="block text-2xs font-bold text-[#173B72] uppercase tracking-wider"
            >
              Have a different access code?
            </label>
            <form onSubmit={handleInlineSubmit} className="space-y-2">
              <div className="flex gap-2">
                <input
                  id="reenterCodeInput"
                  type="text"
                  placeholder="Enter access code"
                  value={newCode}
                  onChange={(e) => {
                    setNewCode(cleanAccessCodeInput(e.target.value));
                    if (inlineError) setInlineError(null);
                  }}
                  className="flex-1 px-3 py-2 text-xs font-mono font-bold uppercase bg-white border border-[#DCE4EE] rounded-lg text-[#172033] placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2563EB]"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!newCode.trim()}
                  className="shrink-0"
                >
                  Join
                </Button>
              </div>
              {inlineError && (
                <p className="text-3xs text-rose-600 font-medium">{inlineError}</p>
              )}
            </form>
          </div>

          {/* Primary Action Buttons */}
          <div className="pt-1 flex flex-col gap-2.5">
            {onOpenPortal ? (
              <Button
                variant="outline"
                size="md"
                onClick={onOpenPortal}
                leftIcon={<KeyRound className="w-4 h-4" />}
                className="w-full justify-center text-xs"
              >
                Go to Access Portal
              </Button>
            ) : (
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  window.location.hash = '#/test';
                }}
                leftIcon={<KeyRound className="w-4 h-4" />}
                className="w-full justify-center text-xs"
              >
                Go to Access Portal
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.reload()}
              leftIcon={<RefreshCw className="w-3.5 h-3.5 text-slate-400" />}
              className="w-full justify-center text-2xs text-slate-500 hover:text-slate-700"
            >
              Refresh Page
            </Button>

            {!isSharedStudent && onExit && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExit}
                leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
                className="w-full justify-center text-xs mt-1"
              >
                Return to Dashboard
              </Button>
            )}
          </div>
        </div>
      </main>

      {/* Brand Footer */}
      <footer className="py-4 text-center text-3xs text-slate-400 border-t border-[#DCE4EE]/60 bg-[#FCFCFA]">
        Assessora by GYTama EDU — Assessment Evaluation System
      </footer>
    </div>
  );
}
