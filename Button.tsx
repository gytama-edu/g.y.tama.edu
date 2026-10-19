/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'secondary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-150 select-none rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap shrink-0';

    const sizeStyles = {
      sm: 'text-xs px-3 py-1.5 gap-1.5',
      md: 'text-sm px-4 py-2 gap-2',
      lg: 'text-base px-5 py-2.5 gap-2.5',
    }[size];

    const variantStyles = {
      primary:
        'bg-orange-500 text-white hover:bg-orange-600 shadow-xs active:bg-orange-700 focus-visible:ring-orange-500',
      secondary:
        'bg-[#EEF5FF] text-[#173B72] hover:bg-blue-100 active:bg-blue-200 border border-[#DCE4EE] focus-visible:ring-[#2563EB]',
      outline:
        'border border-[#2563EB] bg-[#FCFCFA] text-[#2563EB] hover:bg-[#EEF5FF] shadow-2xs active:bg-blue-100 focus-visible:ring-[#2563EB]',
      ghost:
        'text-[#64748B] hover:text-[#2563EB] hover:bg-[#EEF5FF] active:bg-blue-100 focus-visible:ring-[#2563EB]',
      danger:
        'bg-rose-600 text-white hover:bg-rose-700 shadow-xs active:bg-rose-800 focus-visible:ring-rose-500',
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
        {...props}
      >
        {isLoading ? (
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          leftIcon
        )}
        {children !== undefined && children !== null && <span>{children}</span>}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
