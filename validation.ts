/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Test, Question, ValidationError, ValidationResult } from '../types/test';
import { validateTestSettings, normalizeTestSettings } from './testSettings';

export function validateQuestion(question: Question, index: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const qNum = index + 1;

  // Question text validation
  if (!question.text || question.text.trim().length === 0) {
    errors.push({
      field: 'question_text',
      questionId: question.id,
      message: `Question ${qNum} requires question text.`,
    });
  } else if (question.text.length > 5000) {
    errors.push({
      field: 'question_text',
      questionId: question.id,
      message: `Question ${qNum} text exceeds the 5,000 character limit.`,
    });
  }

  // Points validation
  if (
    typeof question.points !== 'number' ||
    isNaN(question.points) ||
    !Number.isInteger(question.points) ||
    question.points < 1 ||
    question.points > 100
  ) {
    errors.push({
      field: 'points',
      questionId: question.id,
      message: `Question ${qNum} points must be a whole number between 1 and 100.`,
    });
  }

  // Type specific validation
  const rawType = String(question.type || 'single-choice').replace(/-/g, '_').toLowerCase();

  if (rawType === 'single_choice' || rawType === 'multiple_choice') {
    const options = question.options || [];
    if (options.length < 2) {
      errors.push({
        field: 'options',
        questionId: question.id,
        message: `Question ${qNum} needs at least two answer options.`,
      });
    } else if (options.length > 10) {
      errors.push({
        field: 'options',
        questionId: question.id,
        message: `Question ${qNum} cannot exceed 10 answer options.`,
      });
    }

    let emptyOptionFound = false;
    let correctCount = 0;

    options.forEach((opt) => {
      if (!opt.text || opt.text.trim().length === 0) {
        emptyOptionFound = true;
      }
      if (opt.isCorrect) {
        correctCount++;
      }
    });

    if (emptyOptionFound) {
      errors.push({
        field: 'options',
        questionId: question.id,
        message: `Question ${qNum} has empty answer options. All options must have text.`,
      });
    }

    if (correctCount === 0) {
      errors.push({
        field: 'correct_answer',
        questionId: question.id,
        message: `Question ${qNum} must have one correct answer selected.`,
      });
    } else if (correctCount > 1) {
      errors.push({
        field: 'correct_answer',
        questionId: question.id,
        message: `Question ${qNum} can only have exactly one correct answer in multiple choice mode.`,
      });
    }
  } else if (rawType === 'multiple_select') {
    const options = question.options || [];
    if (options.length < 2) {
      errors.push({
        field: 'options',
        questionId: question.id,
        message: `Question ${qNum} needs at least two answer options.`,
      });
    } else if (options.length > 10) {
      errors.push({
        field: 'options',
        questionId: question.id,
        message: `Question ${qNum} cannot exceed 10 answer options.`,
      });
    }

    let emptyOptionFound = false;
    let correctCount = 0;

    options.forEach((opt) => {
      if (!opt.text || opt.text.trim().length === 0) {
        emptyOptionFound = true;
      }
      if (opt.isCorrect) {
        correctCount++;
      }
    });

    if (emptyOptionFound) {
      errors.push({
        field: 'options',
        questionId: question.id,
        message: `Question ${qNum} has empty answer options. All options must have text.`,
      });
    }

    if (correctCount === 0) {
      errors.push({
        field: 'correct_answer',
        questionId: question.id,
        message: `Question ${qNum} must have at least one correct answer selected.`,
      });
    }
  } else if (rawType === 'true_false') {
    const options = question.options || [];
    if (options.length !== 2) {
      errors.push({
        field: 'options',
        questionId: question.id,
        message: `Question ${qNum} must have exactly True and False options.`,
      });
    }

    const correctCount = options.filter((opt) => opt.isCorrect).length;
    if (correctCount !== 1) {
      errors.push({
        field: 'correct_answer',
        questionId: question.id,
        message: `Question ${qNum} must have one correct answer selected (True or False).`,
      });
    }
  } else if (rawType === 'short_answer') {
    const accepted = question.acceptedAnswers || [];
    const validAnswers = accepted.filter((a) => a && a.trim().length > 0);

    if (validAnswers.length === 0) {
      errors.push({
        field: 'accepted_answers',
        questionId: question.id,
        message: `Question ${qNum} needs at least one accepted answer.`,
      });
    } else if (accepted.some((a) => !a || a.trim().length === 0)) {
      errors.push({
        field: 'accepted_answers',
        questionId: question.id,
        message: `Question ${qNum} contains empty accepted answers. Please remove or fill them.`,
      });
    }
  } else if (rawType === 'fill_blank') {
    const blanks = question.blanks || [];
    if (blanks.length === 0) {
      errors.push({
        field: 'blanks',
        questionId: question.id,
        message: `Question ${qNum} requires at least one blank.`,
      });
    } else {
      blanks.forEach((blank, bIdx) => {
        const accepted = (blank.acceptedAnswers || []).filter((a) => a && a.trim().length > 0);
        if (accepted.length === 0) {
          errors.push({
            field: 'blanks',
            questionId: question.id,
            message: `Question ${qNum}, Blank ${bIdx + 1} requires at least one accepted answer.`,
          });
        }
      });
    }
  } else if (rawType === 'matching') {
    const pairs = question.matchingPairs || [];
    if (pairs.length < 2) {
      errors.push({
        field: 'matching_pairs',
        questionId: question.id,
        message: `Question ${qNum} requires at least two matching pairs.`,
      });
    } else {
      let emptyPairFound = false;
      pairs.forEach((pair) => {
        if (!pair.left || pair.left.trim().length === 0 || !pair.right || pair.right.trim().length === 0) {
          emptyPairFound = true;
        }
      });
      if (emptyPairFound) {
        errors.push({
          field: 'matching_pairs',
          questionId: question.id,
          message: `Question ${qNum} has incomplete matching pairs. Both sides must be filled.`,
        });
      }
    }
  } else if (rawType === 'ordering') {
    const items = question.orderingItems || question.items || [];
    if (items.length < 2) {
      errors.push({
        field: 'ordering_items',
        questionId: question.id,
        message: `Question ${qNum} requires at least two ordering items.`,
      });
    } else {
      const hasEmptyItem = items.some((item) => !item.text || item.text.trim().length === 0);
      if (hasEmptyItem) {
        errors.push({
          field: 'ordering_items',
          questionId: question.id,
          message: `Question ${qNum} has empty ordering items. All items must have text.`,
        });
      }
    }
  } else if (rawType === 'essay') {
    if (question.maxWords !== undefined && question.maxWords !== null) {
      if (typeof question.maxWords !== 'number' || isNaN(question.maxWords) || question.maxWords <= 0) {
        errors.push({
          field: 'writing_config',
          questionId: question.id,
          message: `Question ${qNum} maximum word count must be a positive number if provided.`,
        });
      }
    }
  } else if (rawType === 'writing') {
    const cfg = question.writingConfig;
    if (cfg?.minimumWords !== undefined && cfg?.minimumWords !== null) {
      if (typeof cfg.minimumWords !== 'number' || isNaN(cfg.minimumWords) || cfg.minimumWords <= 0) {
        errors.push({
          field: 'writing_config',
          questionId: question.id,
          message: `Question ${qNum} minimum word count must be a positive number if provided.`,
        });
      }
    }
    if (cfg?.maximumWords !== undefined && cfg?.maximumWords !== null) {
      if (typeof cfg.maximumWords !== 'number' || isNaN(cfg.maximumWords) || cfg.maximumWords <= 0) {
        errors.push({
          field: 'writing_config',
          questionId: question.id,
          message: `Question ${qNum} maximum word count must be a positive number if provided.`,
        });
      }
    }
    if (
      typeof cfg?.minimumWords === 'number' &&
      typeof cfg?.maximumWords === 'number' &&
      cfg.minimumWords > 0 &&
      cfg.maximumWords > 0 &&
      cfg.minimumWords > cfg.maximumWords
    ) {
      errors.push({
        field: 'writing_config',
        questionId: question.id,
        message: `Question ${qNum} minimum word count cannot exceed maximum word count.`,
      });
    }
  }

  return errors;
}

export function validateTest(test: Test): ValidationResult {
  const errors: ValidationError[] = [];

  // Title validation
  const trimmedTitle = (test.title || '').trim();
  if (!trimmedTitle) {
    errors.push({
      field: 'title',
      message: 'Test title is required.',
    });
  } else if (trimmedTitle.length < 3) {
    errors.push({
      field: 'title',
      message: 'Test title must be at least 3 characters long.',
    });
  } else if (trimmedTitle.length > 150) {
    errors.push({
      field: 'title',
      message: 'Test title cannot exceed 150 characters.',
    });
  }

  // Description validation
  if (test.description && test.description.length > 1000) {
    errors.push({
      field: 'description',
      message: 'Description cannot exceed 1,000 characters.',
    });
  }

  // Questions count validation
  if (!test.questions || test.questions.length === 0) {
    errors.push({
      field: 'questions',
      message: 'Test must contain at least one question.',
    });
  } else {
    // Validate each question
    test.questions.forEach((q, index) => {
      const qErrors = validateQuestion(q, index);
      errors.push(...qErrors);
    });
  }

  // MODULE 15: Reading Sets Validation
  if (test.readingSets && test.readingSets.length > 0) {
    test.readingSets.forEach((rs, rsIndex) => {
      const setNum = rsIndex + 1;
      const title = (rs.title || '').trim();
      const passage = (rs.passage || '').trim();

      if (!title) {
        errors.push({
          field: 'reading_set_title',
          message: `Reading Passage ${setNum} title is required.`,
        });
      } else if (title.length > 150) {
        errors.push({
          field: 'reading_set_title',
          message: `Reading Passage ${setNum} title cannot exceed 150 characters.`,
        });
      }

      if (!passage) {
        errors.push({
          field: 'reading_set_passage',
          message: `Reading Passage ${setNum} ("${title || 'Untitled'}") passage text is required.`,
        });
      }

      // Check that at least one question belongs to this reading set (Sections 32, 33, 34)
      const hasQuestions = (test.questions || []).some((q) => q.readingSetId === rs.id);
      if (!hasQuestions) {
        errors.push({
          field: 'reading_set_questions',
          message: `Reading Passage ${setNum} ("${title || 'Untitled'}") must contain at least one question.`,
        });
      }
    });
  }

  // MODULE 17: Assessment Sections Validation
  if (test.sections && test.sections.length > 0) {
    const seenSectionIds = new Set<string>();
    test.sections.forEach((sec, secIndex) => {
      const sNum = secIndex + 1;
      const title = (sec.title || '').trim();

      if (!title) {
        errors.push({
          field: 'section_title',
          sectionId: sec.id,
          message: `Section ${sNum} title is required.`,
        });
      } else if (title.length > 150) {
        errors.push({
          field: 'section_title',
          sectionId: sec.id,
          message: `Section ${sNum} title cannot exceed 150 characters.`,
        });
      }

      if (sec.instructions && sec.instructions.length > 2000) {
        errors.push({
          field: 'section_instructions',
          sectionId: sec.id,
          message: `Section ${sNum} instructions cannot exceed 2,000 characters.`,
        });
      }

      if (seenSectionIds.has(sec.id)) {
        errors.push({
          field: 'sections',
          sectionId: sec.id,
          message: `Duplicate section identifier detected for Section ${sNum}.`,
        });
      }
      seenSectionIds.add(sec.id);
    });
  }

  // Settings validation (Module 3)
  const normalizedSettings = normalizeTestSettings(test.settings);
  const settingsErrors = validateTestSettings(normalizedSettings);
  errors.push(...settingsErrors);

  return {
    isValid: errors.length === 0,
    errors,
  };
}
