/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Question,
  QuestionType,
  AnswerOption,
  BlankItem,
  MatchingPair,
  OrderingItem,
  WritingConfig,
} from '../types/test';
import { createQuestionId, createOptionId } from './id';

export function createDefaultOptionsForType(type: QuestionType): AnswerOption[] {
  const norm = String(type).replace(/-/g, '_').toLowerCase();

  if (norm === 'true_false') {
    return [
      { id: createOptionId(), text: 'True', isCorrect: true },
      { id: createOptionId(), text: 'False', isCorrect: false },
    ];
  }

  if (norm === 'single_choice' || norm === 'multiple_choice') {
    return [
      { id: createOptionId(), text: '', isCorrect: true },
      { id: createOptionId(), text: '', isCorrect: false },
      { id: createOptionId(), text: '', isCorrect: false },
      { id: createOptionId(), text: '', isCorrect: false },
    ];
  }

  if (norm === 'multiple_select') {
    return [
      { id: createOptionId(), text: '', isCorrect: true },
      { id: createOptionId(), text: '', isCorrect: true },
      { id: createOptionId(), text: '', isCorrect: false },
      { id: createOptionId(), text: '', isCorrect: false },
    ];
  }

  return [];
}

export function createNewQuestion(type: QuestionType, order: number): Question {
  const norm = String(type).replace(/-/g, '_').toLowerCase();

  const base: Question = {
    id: createQuestionId(),
    type,
    text: '',
    points: 1,
    order,
  };

  switch (norm) {
    case 'multiple_choice':
    case 'single_choice':
      base.points = 1;
      base.options = createDefaultOptionsForType('multiple_choice');
      break;

    case 'true_false':
      base.points = 1;
      base.options = createDefaultOptionsForType('true_false');
      break;

    case 'multiple_select':
      base.points = 2;
      base.options = createDefaultOptionsForType('multiple_select');
      break;

    case 'short_answer':
      base.points = 1;
      base.acceptedAnswers = [''];
      break;

    case 'fill_blank':
      base.points = 2;
      base.text = 'She [blank_1] to school [blank_2] Monday.';
      base.blanks = [
        { id: 'b1', acceptedAnswers: ['goes', 'walks'] },
        { id: 'b2', acceptedAnswers: ['on', 'every'] },
      ];
      break;

    case 'matching':
      base.points = 3;
      base.matchingPairs = [
        { id: 'p1', left: 'Huge', right: 'Very large' },
        { id: 'p2', left: 'Tiny', right: 'Very small' },
        { id: 'p3', left: 'Rapid', right: 'Very fast' },
      ];
      break;

    case 'ordering':
      base.points = 3;
      base.orderingItems = [
        { id: 'ord_1', text: 'Turn on the computer' },
        { id: 'ord_2', text: 'Open the browser' },
        { id: 'ord_3', text: 'Go to the website' },
        { id: 'ord_4', text: 'Log in' },
      ];
      break;

    case 'essay':
      base.points = 10;
      base.requiresManualGrading = true;
      base.maxWords = null;
      break;

    case 'writing':
      base.points = 10;
      base.requiresManualGrading = true;
      base.writingConfig = {
        instructions: 'Write at least 250 words. Give reasons and examples to support your ideas.',
        writingType: 'General Writing',
        minimumWords: 250,
        maximumWords: 350,
        showWordCount: true,
      };
      break;

    default:
      base.options = createDefaultOptionsForType(type);
  }

  return base;
}

export function convertQuestionType(original: Question, newType: QuestionType): Question {
  if (original.type === newType) return { ...original };

  const normOld = String(original.type).replace(/-/g, '_').toLowerCase();
  const normNew = String(newType).replace(/-/g, '_').toLowerCase();

  const updated: Question = {
    id: original.id,
    type: newType,
    text: original.text,
    points: original.points,
    order: original.order,
  };

  // Convert between Multiple Choice and Multiple Select (options can be preserved)
  if (
    (normOld === 'multiple_choice' || normOld === 'single_choice' || normOld === 'multiple_select') &&
    (normNew === 'multiple_choice' || normNew === 'single_choice' || normNew === 'multiple_select')
  ) {
    const existing = original.options || [];
    if (existing.length >= 2) {
      if (normNew === 'multiple_choice' || normNew === 'single_choice') {
        // Guarantee only 1 correct
        let hasCorrect = false;
        updated.options = existing.map((opt) => {
          if (opt.isCorrect && !hasCorrect) {
            hasCorrect = true;
            return { ...opt, id: opt.id || createOptionId() };
          }
          return { ...opt, id: opt.id || createOptionId(), isCorrect: false };
        });
        if (!hasCorrect && updated.options.length > 0) {
          updated.options[0].isCorrect = true;
        }
      } else {
        // multiple_select
        updated.options = existing.map((opt) => ({
          ...opt,
          id: opt.id || createOptionId(),
        }));
      }
    } else {
      updated.options = createDefaultOptionsForType(newType);
    }
    return updated;
  }

  // Handle initialization for each target type
  switch (normNew) {
    case 'multiple_choice':
    case 'single_choice':
    case 'multiple_select':
      updated.options = createDefaultOptionsForType(newType);
      break;

    case 'true_false':
      updated.options = createDefaultOptionsForType('true_false');
      break;

    case 'short_answer':
      updated.acceptedAnswers = original.acceptedAnswers?.length ? [...original.acceptedAnswers] : [''];
      break;

    case 'fill_blank':
      updated.blanks = [
        { id: 'b1', acceptedAnswers: [''] },
        { id: 'b2', acceptedAnswers: [''] },
      ];
      break;

    case 'matching':
      updated.matchingPairs = [
        { id: 'p1', left: '', right: '' },
        { id: 'p2', left: '', right: '' },
      ];
      break;

    case 'ordering':
      updated.orderingItems = [
        { id: 'ord_1', text: '' },
        { id: 'ord_2', text: '' },
      ];
      break;

    case 'essay':
      updated.requiresManualGrading = true;
      updated.maxWords = null;
      break;

    case 'writing':
      updated.requiresManualGrading = true;
      updated.writingConfig = {
        instructions: '',
        writingType: 'General Writing',
        minimumWords: null,
        maximumWords: null,
        showWordCount: true,
      };
      break;

    default:
      break;
  }

  return updated;
}
