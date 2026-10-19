/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  maxLength?: number;
  showCharCount?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      helperText,
      required,
      maxLength,
      showCharCount = false,
      value,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const textareaId = id || React.useId();
    const currentLength = typeof value === 'string' ? value.length : 0;

    return (
      <div className="w-full">
        {label && (
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor={textareaId}
              className="block text-sm font-semibold text-slate-800"
            >
              {label}
              {required && <span className="text-rose-500 ml-1">*</span>}
            </label>
            {showCharCount && maxLength && (
              <span className="text-xs text-slate-600 font-mono tabular-nums">
                {currentLength}/{maxLength}
              </span>
            )}
          </div>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          value={value}
          maxLength={maxLength}
          aria-invalid={!!error}
          aria-describedby={error ? `${textareaId}-error` : helperText ? `${textareaId}-desc` : undefined}
          className={`w-full rounded-lg border bg-[#F7F9FC] px-3.5 py-2.5 text-sm text-[#172033] transition-all placeholder:text-slate-400 focus-visible:outline-none focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 ${
            error
              ? 'border-rose-300 bg-rose-50/40 focus-visible:border-rose-500 focus-visible:ring-rose-200'
              : 'border-[#DCE4EE] focus-visible:border-[#2563EB] focus-visible:ring-[#2563EB]/15'
          } ${className}`}
          {...props}
        />
        <div className="flex items-center justify-between mt-1">
          {error ? (
            <p id={`${textareaId}-error`} className="text-xs font-medium text-rose-600">
              {error}
            </p>
          ) : helperText ? (
            <p id={`${textareaId}-desc`} className="text-xs text-slate-500">
              {helperText}
            </p>
          ) : (
            <span />
          )}
          {!label && showCharCount && maxLength && (
            <span className="text-xs text-slate-600 font-mono tabular-nums ml-auto">
              {currentLength}/{maxLength}
            </span>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
