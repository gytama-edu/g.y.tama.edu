/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Test, TestAccess } from '../../types/test';
import {
  generateAccessCode,
  buildShareableUrl,
} from '../../utils/testAccess';
import { loadAllTests } from '../../utils/storage';
import { Button } from '../ui/Button';
import { ConfirmModal } from '../ui/ConfirmModal';
import {
  Share2,
  Copy,
  Check,
  RefreshCw,
  PowerOff,
  Power,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

interface TestSharingPanelProps {
  test: Test;
  onUpdateAccess: (access: TestAccess) => void;
}

export function TestSharingPanel({
  test,
  onUpdateAccess,
}: TestSharingPanelProps) {
  const [copied, setCopied] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

  const access = test.access || {
    enabled: false,
    accessCode: '',
    createdAt: null,
  };

  const isEnabled = Boolean(access.enabled && access.accessCode);
  const shareUrl = access.accessCode ? buildShareableUrl(access.accessCode) : '';

  // 1. Enable Sharing
  const handleEnableSharing = () => {
    let code = access.accessCode;
    if (!code) {
      const allTests = loadAllTests();
      const existingCodes = allTests
        .map((t) => t.access?.accessCode)
        .filter(Boolean) as string[];
      code = generateAccessCode(existingCodes);
    }

    const updated: TestAccess = {
      enabled: true,
      accessCode: code,
      createdAt: access.createdAt || new Date().toISOString(),
    };
    onUpdateAccess(updated);
  };

  // 2. Disable Sharing
  const handleDisableSharing = () => {
    const updated: TestAccess = {
      ...access,
      enabled: false,
    };
    onUpdateAccess(updated);
  };

  // 3. Confirm Regenerate Access Code
  const handleConfirmRegenerate = () => {
    setShowRegenerateConfirm(false);
    const allTests = loadAllTests();
    const existingCodes = allTests
      .map((t) => t.access?.accessCode)
      .filter(Boolean) as string[];
    const newCode = generateAccessCode(existingCodes);

    const updated: TestAccess = {
      enabled: true,
      accessCode: newCode,
      createdAt: new Date().toISOString(),
    };
    onUpdateAccess(updated);
  };

  // 4. Copy Link to clipboard
  const handleCopyLink = async () => {
    if (!shareUrl) return;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        // Fallback for older environments or restricted permissions
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy link to clipboard:', err);
    }
  };

  return (
    <div className="bg-[#FCFCFA] rounded-2xl border border-[#DCE4EE] p-6 sm:p-8 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DCE4EE] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-orange-600 uppercase tracking-wider">
            <span>Assessora</span>
            <span aria-hidden="true">·</span>
            <span>Module 10</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#173B72] tracking-tight">
            Share Test
          </h2>
          <p className="text-xs text-slate-500">
            Control student access through a direct, shareable test link.
          </p>
        </div>

        {/* Status Badge */}
        <div>
          {isEnabled ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Active</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>Disabled</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Body */}
      {!isEnabled ? (
        /* ==================================================== */
        /* STATE 1: Sharing Disabled                            */
        /* ==================================================== */
        <div className="py-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center mx-auto">
            <Share2 className="w-6 h-6" />
          </div>

          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-base font-bold text-slate-800">
              Test sharing is disabled.
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Enable sharing to generate a secure access link for your students to take this assessment.
            </p>
          </div>

          <div className="pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={handleEnableSharing}
              leftIcon={<Power className="w-4 h-4" />}
              className="px-6 justify-center"
            >
              Enable Sharing
            </Button>
          </div>
        </div>
      ) : (
        /* ==================================================== */
        /* STATE 2: Sharing Active                              */
        /* ==================================================== */
        <div className="space-y-6">
          {/* Share Link Field */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Student Access Link
            </label>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1 min-w-0">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="w-full pl-3 pr-24 py-2.5 bg-[#F8FAFC] border border-[#DCE4EE] rounded-xl text-xs font-mono text-[#173B72] truncate focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-3xs font-mono font-bold text-slate-400 uppercase tracking-wider bg-slate-200/60 px-1.5 py-0.5 rounded">
                  {access.accessCode}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={copied ? 'secondary' : 'primary'}
                  size="md"
                  onClick={handleCopyLink}
                  leftIcon={
                    copied ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )
                  }
                  className={`justify-center min-w-[120px] text-xs transition-all ${
                    copied
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : ''
                  }`}
                >
                  {copied ? 'Link copied!' : 'Copy Link'}
                </Button>

                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 border border-[#DCE4EE] bg-white hover:bg-slate-50 text-[#173B72] text-xs font-bold rounded-xl transition-all shadow-2xs shrink-0 cursor-pointer"
                  title="Open student test link in new tab"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                  <span>Open Link</span>
                </a>
              </div>
            </div>

            <p className="text-2xs text-slate-500 flex items-center gap-1.5 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>
                Students can open this link on any device to enter their name and begin the assessment.
              </span>
            </p>
          </div>

          {/* Management Actions */}
          <div className="pt-4 border-t border-[#DCE4EE] flex flex-col sm:flex-row items-center justify-between gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisableSharing}
              leftIcon={<PowerOff className="w-3.5 h-3.5 text-slate-500" />}
              className="text-xs w-full sm:w-auto justify-center"
            >
              Disable Sharing
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRegenerateConfirm(true)}
              leftIcon={<RefreshCw className="w-3.5 h-3.5 text-amber-600" />}
              className="text-xs w-full sm:w-auto justify-center text-amber-800 hover:bg-amber-50/60 border-amber-200"
            >
              Regenerate Link
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Regenerate Link */}
      <ConfirmModal
        isOpen={showRegenerateConfirm}
        title="Regenerate access link?"
        description="Students using the current link will no longer be able to access this test. A new unique access code will be generated immediately."
        confirmText="Regenerate"
        cancelText="Cancel"
        confirmVariant="primary"
        onConfirm={handleConfirmRegenerate}
        onCancel={() => setShowRegenerateConfirm(false)}
      />
    </div>
  );
}
