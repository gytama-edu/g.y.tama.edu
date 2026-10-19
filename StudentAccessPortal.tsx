/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { cleanAccessCodeInput } from '../../utils/testAccess';
import {
  KeyRound,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  BookOpen,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

interface StudentAccessPortalProps {
  onAccessCode: (code: string) => void;
  isLoading?: boolean;
  errorMessage?: string | null;
  onExitToDashboard?: () => void;
}

export function StudentAccessPortal({
  onAccessCode,
  isLoading = false,
  errorMessage = null,
  onExitToDashboard,
}: StudentAccessPortalProps) {
  const [code, setCode] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = cleanAccessCodeInput(code);

    if (!cleaned) {
      setValidationError('Please enter your assessment access code.');
      return;
    }

    if (cleaned.length < 4) {
      setValidationError('Access codes are at least 6 to 8 characters long.');
      return;
    }

    setValidationError(null);
    onAccessCode(cleaned);
  };

  const displayError = validationError || errorMessage;

  return (
    <div className="min-h-screen bg-[#F3F6FA] flex flex-col justify-between">
      {/* Top Header */}
      <header className="bg-[#FCFCFA] border-b border-[#DCE4EE] shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-[#173B72] text-base tracking-tight">
              Assess<span className="text-orange-500">ora</span>
            </span>
            <span className="text-2xs font-semibold px-2 py-0.5 rounded-md bg-[#EEF5FF] text-[#2563EB] border border-blue-200">
              Student Portal
            </span>
          </div>

          {onExitToDashboard && (
            <button
              type="button"
              onClick={onExitToDashboard}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#173B72] transition-colors cursor-pointer px-2.5 py-1 rounded-lg hover:bg-slate-200/50"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Teacher View</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="bg-[#FCFCFA] rounded-2xl border border-[#DCE4EE] p-6 sm:p-8 max-w-md w-full text-center space-y-6 shadow-xs">
          {/* Icon Badge */}
          <div className="w-14 h-14 rounded-2xl bg-[#EEF5FF] text-[#2563EB] border border-blue-200/80 flex items-center justify-center mx-auto shadow-2xs">
            <KeyRound className="w-7 h-7 stroke-[2]" />
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            <span className="text-2xs font-bold text-orange-600 uppercase tracking-widest block">
              Student Assessment Access
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#173B72] tracking-tight">
              Enter Access Code
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">
              Enter the unique access code provided by your instructor to open your assessment.
            </p>
          </div>

          {/* Code Entry Form */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5 text-left">
              <label
                htmlFor="accessCodeInput"
                className="block text-xs font-bold text-[#173B72]"
              >
                Assessment Access Code
              </label>

              <div className="relative">
                <input
                  id="accessCodeInput"
                  type="text"
                  autoFocus
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="e.g. 8K2P9M4Z"
                  value={code}
                  onChange={(e) => {
                    const cleaned = cleanAccessCodeInput(e.target.value);
                    setCode(cleaned);
                    if (validationError) setValidationError(null);
                  }}
                  disabled={isLoading}
                  className={`w-full px-4 py-3 text-center font-mono text-lg sm:text-xl font-bold tracking-widest uppercase bg-white border rounded-xl text-[#172033] placeholder:text-slate-300 placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:ring-2 transition-all ${
                    displayError
                      ? 'border-rose-400 focus:ring-rose-200 focus:border-rose-500'
                      : 'border-[#DCE4EE] focus:ring-blue-100 focus:border-[#2563EB]'
                  }`}
                />
              </div>

              {displayError ? (
                <div className="flex items-start gap-1.5 text-2xs text-rose-600 font-medium pt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{displayError}</span>
                </div>
              ) : (
                <p className="text-3xs text-slate-400 text-center pt-0.5">
                  Codes are typically 8 characters (letters and numbers).
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isLoading || !code.trim()}
              className="w-full justify-center text-sm font-bold shadow-xs cursor-pointer"
              rightIcon={
                isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )
              }
            >
              {isLoading ? 'Connecting to Assessment...' : 'Access Assessment'}
            </Button>
          </form>

          {/* Secure Information Note */}
          <div className="pt-2 border-t border-[#DCE4EE]/70 flex items-center justify-center gap-2 text-3xs text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Secure Student Assessment • Responses saved continuously</span>
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
