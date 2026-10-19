/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MultipleChoiceEditor } from './MultipleChoiceEditor';
import { AnswerOption } from '../../../types/test';

interface MultipleSelectEditorProps {
  options: AnswerOption[];
  questionId: string;
  onChange: (options: AnswerOption[]) => void;
  hasErrors?: boolean;
}

export function MultipleSelectEditor(props: MultipleSelectEditorProps) {
  return <MultipleChoiceEditor {...props} />;
}
