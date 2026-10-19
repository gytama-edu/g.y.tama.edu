/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Question, QuestionType } from '../../types/test';
import { ConfirmModal } from '../ui/ConfirmModal';

interface TypeChangeModalProps {
  pendingChange: {
    question: Question;
    targetType: QuestionType;
  } | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function getQuestionTypeName(type: QuestionType): string {
  const norm = String(type).replace(/-/g, '_').toLowerCase();
  switch (norm) {
    case 'multiple_choice':
    case 'single_choice':
      return 'Multiple Choice';
    case 'true_false':
      return 'True / False';
    case 'multiple_select':
      return 'Multiple Select';
    case 'short_answer':
      return 'Short Answer';
    case 'fill_blank':
      return 'Fill in the Blank';
    case 'matching':
      return 'Matching';
    case 'ordering':
      return 'Ordering';
    case 'essay':
      return 'Essay / Long Answer';
    case 'writing':
      return 'Writing Task';
    default:
      return String(type);
  }
}

export function TypeChangeModal({
  pendingChange,
  onConfirm,
  onCancel,
}: TypeChangeModalProps) {
  if (!pendingChange) return null;

  const currentName = getQuestionTypeName(pendingChange.question.type);
  const targetName = getQuestionTypeName(pendingChange.targetType);

  return (
    <ConfirmModal
      isOpen={true}
      title="Change Question Type?"
      description={`Changing this question from ${currentName} to ${targetName} may adapt or reset format-specific settings (such as answer options or matching pairs). Question text and points will be preserved.`}
      confirmText="Change Type"
      cancelText="Cancel"
      confirmVariant="primary"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
