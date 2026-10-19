/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Category } from '../../types/category';
import { Tag } from 'lucide-react';

interface CategoryBadgeProps {
  category: Category;
  size?: 'sm' | 'md';
  onClick?: () => void;
  className?: string;
}

const COLOR_MAP: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200/90 hover:bg-blue-100/70',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/90 hover:bg-emerald-100/70',
  purple: 'bg-purple-50 text-purple-700 border-purple-200/90 hover:bg-purple-100/70',
  amber: 'bg-amber-50 text-amber-800 border-amber-200/90 hover:bg-amber-100/70',
  rose: 'bg-rose-50 text-rose-700 border-rose-200/90 hover:bg-rose-100/70',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200/90 hover:bg-indigo-100/70',
  slate: 'bg-slate-100 text-slate-700 border-slate-200/90 hover:bg-slate-200/70',
};

export function CategoryBadge({
  category,
  size = 'sm',
  onClick,
  className = '',
}: CategoryBadgeProps) {
  const colorClass = COLOR_MAP[category.color || 'slate'] || COLOR_MAP.slate;
  const sizeClass = size === 'sm' ? 'text-2xs px-2 py-0.5' : 'text-xs px-2.5 py-1';

  const content = (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-md border tracking-tight transition-colors ${colorClass} ${sizeClass} ${className} ${
        onClick ? 'cursor-pointer' : ''
      }`}
      title={category.description || category.name}
    >
      <Tag className="w-2.5 h-2.5 opacity-70 shrink-0" />
      <span className="truncate max-w-[130px]">{category.name}</span>
    </span>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="focus:outline-none"
      >
        {content}
      </button>
    );
  }

  return content;
}
