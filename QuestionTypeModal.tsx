/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { QuestionType } from '../../types/test';
import {
  CheckCircle2,
  CheckSquare,
  ToggleLeft,
  Edit3,
  Tag,
  ArrowRightLeft,
  ListOrdered,
  FileText,
  PenTool,
  BookOpen,
  X,
} from 'lucide-react';

interface QuestionTypeModalProps {
  isOpen: boolean;
  onSelectType: (type: QuestionType) => void;
  onClose: () => void;
  insertPositionText?: string;
  onSelectReadingPassage?: () => void;
  hideReadingPassage?: boolean;
}

interface TypeOption {
  type: QuestionType | 'reading_passage';
  title: string;
  description: string;
  badge?: string;
  icon: React.ReactNode;
}

const TYPE_OPTIONS: TypeOption[] = [
  {
    type: 'multiple_choice',
    title: 'Multiple Choice',
    description: 'Student selects exactly one answer from multiple choices.',
    icon: <CheckCircle2 className="w-5 h-5 text-slate-700" />,
  },
  {
    type: 'true_false',
    title: 'True / False',
    description: 'Student evaluates whether a statement is true or false.',
    icon: <ToggleLeft className="w-5 h-5 text-slate-700" />,
  },
  {
    type: 'multiple_select',
    title: 'Multiple Select',
    description: 'Student selects one or more correct answers with exact-set matching.',
    icon: <CheckSquare className="w-5 h-5 text-slate-700" />,
  },
  {
    type: 'short_answer',
    title: 'Short Answer',
    description: 'Student types a text response matching accepted answer variations.',
    icon: <Edit3 className="w-5 h-5 text-slate-700" />,
  },
  {
    type: 'fill_blank',
    title: 'Fill in the Blank',
    description: 'Student fills in one or more blanks within the question prompt.',
    icon: <Tag className="w-5 h-5 text-slate-700" />,
  },
  {
    type: 'matching',
    title: 'Matching',
    description: 'Student pairs items from the left column with the right column.',
    icon: <ArrowRightLeft className="w-5 h-5 text-slate-700" />,
  },
  {
    type: 'ordering',
    title: 'Ordering',
    description: 'Student arranges items in the exact required sequence.',
    icon: <ListOrdered className="w-5 h-5 text-slate-700" />,
  },
  {
    type: 'essay',
    title: 'Essay / Long Answer',
    description: 'Open-ended long-form response with teacher manual grading.',
    icon: <FileText className="w-5 h-5 text-slate-700" />,
  },
  {
    type: 'writing',
    title: 'Writing Task',
    description: 'Structured composition (IELTS, TOEFL, Paragraph) with live word count.',
    icon: <PenTool className="w-5 h-5 text-slate-700" />,
  },
  {
    type: 'reading_passage',
    title: 'Reading Passage',
    description: 'Reading passage set with multiple attached comprehension questions.',
    icon: <BookOpen className="w-5 h-5 text-emerald-600" />,
  },
];

export function QuestionTypeModal({
  isOpen,
  onSelectType,
  onClose,
  insertPositionText,
  onSelectReadingPassage,
  hideReadingPassage = false,
}: QuestionTypeModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const availableOptions = hideReadingPassage
    ? TYPE_OPTIONS.filter((opt) => opt.type !== 'reading_passage')
    : TYPE_OPTIONS;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="type-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="w-full max-w-2xl bg-[#FCFCFA] rounded-2xl shadow-xl border border-[#DCE4EE] p-6 text-left my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#DCE4EE]/70">
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-6 rounded-full bg-orange-500 shrink-0" />
            <div>
              <h3 id="type-modal-title" className="text-base font-extrabold text-[#173B72] uppercase tracking-wide">
                Choose Content Type
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                {insertPositionText || 'Select a question format or reading passage set to add:'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-4 max-h-[70vh] overflow-y-auto pr-1">
          {availableOptions.map((item) => (
            <button
              key={item.type}
              type="button"
              onClick={() => {
                if (item.type === 'reading_passage') {
                  if (onSelectReadingPassage) {
                    onSelectReadingPassage();
                  }
                } else {
                  onSelectType(item.type);
                }
              }}
              className={`relative flex flex-col items-start p-3.5 rounded-xl border text-left transition-all group focus-visible:outline-none focus-visible:ring-2 cursor-pointer shadow-2xs hover:shadow-xs ${
                item.type === 'reading_passage'
                  ? 'border-emerald-300 bg-emerald-50/40 hover:border-emerald-500 hover:bg-emerald-50 focus-visible:ring-emerald-500'
                  : 'border-[#DCE4EE] bg-[#F7F9FC] hover:border-orange-400 hover:bg-[#FFF4E8]/60 focus-visible:ring-orange-500'
              }`}
            >
              {item.badge && (
                <span
                  className={`absolute top-2.5 right-2.5 text-3xs font-extrabold uppercase px-1.5 py-0.2 rounded border ${
                    item.type === 'reading_passage'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-orange-100 text-orange-700 border-orange-200'
                  }`}
                >
                  {item.badge}
                </span>
              )}

              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2.5 transition-colors ${
                  item.type === 'reading_passage'
                    ? 'bg-emerald-100/80 group-hover:bg-emerald-200/80'
                    : 'bg-white border border-[#DCE4EE] group-hover:border-orange-300 group-hover:bg-white'
                }`}
              >
                {item.icon}
              </div>

              <span className="font-extrabold text-xs text-[#173B72] group-hover:text-orange-600 transition-colors">
                {item.title}
              </span>

              <p className="text-2xs text-[#64748B] mt-1 leading-relaxed">
                {item.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
