/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ParseResult,
  RawParsedQuestion,
  RawParsedOption,
  ImportQuestionType,
  MatchingParsedItem,
  MatchingParsedPair,
} from '../types/questionImport';

export function parseExamText(
  rawInput: string,
  selectedType: ImportQuestionType = 'multiple_choice'
): ParseResult {
  if (selectedType === 'matching') {
    return parseMatchingExamText(rawInput);
  }
  if (selectedType === 'ordering') {
    return parseOrderingExamText(rawInput);
  }
  if (selectedType === 'reading_passage') {
    return parseReadingPassageExamText(rawInput);
  }

  const globalErrors: string[] = [];
  const globalWarnings: string[] = [];
  const questions: RawParsedQuestion[] = [];
  const answerKeyMap: Record<number, string> = {};

  const trimmedInput = rawInput.trim();
  if (!trimmedInput) {
    return {
      questions: [],
      globalErrors: [],
      globalWarnings: [],
      totalDetected: 0,
      readyCount: 0,
      warningCount: 0,
      errorCount: 0,
      hasErrors: false,
      hasWarnings: false,
      answerKeyMap: {},
      selectedType,
    };
  }

  // Split lines and normalize line endings
  const allLines = rawInput.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  // 1. Locate the standalone Answer Key header line if present
  // Matches "ANSWER KEY", "Answer Key", "answers:", but NOT inline "ANSWER: TRUE" or "ANSWER: B"
  const answerKeyHeaderRegex = /^\s*(answer\s*key|answers)\s*:?\s*$/i;
  let answerKeyHeaderIndex = -1;

  for (let i = 0; i < allLines.length; i++) {
    if (answerKeyHeaderRegex.test(allLines[i].trim())) {
      answerKeyHeaderIndex = i;
      break;
    }
  }

  const hasAnswerKey = answerKeyHeaderIndex !== -1;
  const questionLines = hasAnswerKey
    ? allLines.slice(0, answerKeyHeaderIndex)
    : allLines;
  const answerLines = hasAnswerKey
    ? allLines.slice(answerKeyHeaderIndex + 1)
    : [];

  // 2. Parse Bottom Answer Key Section (if present)
  const answerKeyDuplicates = new Set<number>();
  const extraLinesAfterAnswerKey: string[] = [];

  if (hasAnswerKey) {
    for (let i = 0; i < answerLines.length; i++) {
      const line = answerLines[i].trim();
      if (!line) continue;

      // Pattern: <number>. <answer> (e.g. "1. B" or "2. TRUE")
      const entryMatch = line.match(/^(\d+)\.\s*(.+)$/);
      if (entryMatch) {
        const qNum = parseInt(entryMatch[1], 10);
        const rawAnsOrig = entryMatch[2].trim();
        const rawAns = rawAnsOrig.toUpperCase();

        // Check duplicate answer key entry
        if (answerKeyMap[qNum] !== undefined) {
          if (!answerKeyDuplicates.has(qNum)) {
            globalErrors.push(`Duplicate answer-key entry for Question ${qNum}.`);
            answerKeyDuplicates.add(qNum);
          }
        } else {
          if (selectedType === 'true_false') {
            if (rawAns === 'TRUE' || rawAns === 'FALSE') {
              answerKeyMap[qNum] = rawAns;
            } else if (['A', 'B', 'C', 'D'].includes(rawAns)) {
              globalErrors.push(
                `Invalid True/False answer for Question ${qNum}. Expected TRUE or FALSE, not Multiple Choice option (${rawAns}).`
              );
            } else {
              globalErrors.push(
                `Invalid True/False answer for Question ${qNum}. Expected TRUE or FALSE.`
              );
            }
          } else if (selectedType === 'multiple_select') {
            if (rawAns === 'TRUE' || rawAns === 'FALSE') {
              globalErrors.push(
                `Invalid answer for Question ${qNum}. Multiple Select questions expect option letters separated by commas, not True/False.`
              );
            } else {
              answerKeyMap[qNum] = rawAns;
            }
          } else if (selectedType === 'short_answer') {
            if (rawAns === 'TRUE' || rawAns === 'FALSE') {
              globalErrors.push(
                `Invalid answer for Question ${qNum}. Short Answer questions expect a text answer, not True/False.`
              );
            } else if (rawAnsOrig.length > 0) {
              answerKeyMap[qNum] = rawAnsOrig;
            } else {
              globalErrors.push(`Empty answer for Question ${qNum} in answer key.`);
            }
          } else if (selectedType === 'fill_blank') {
            if (rawAns === 'TRUE' || rawAns === 'FALSE') {
              globalErrors.push(
                `Invalid answer for Question ${qNum}. Fill in the Blank questions expect word answers, not True/False.`
              );
            } else if (rawAnsOrig.length > 0) {
              answerKeyMap[qNum] = rawAnsOrig;
            } else {
              globalErrors.push(`Empty answer for Question ${qNum} in answer key.`);
            }
          } else {
            // multiple_choice
            if (['A', 'B', 'C', 'D'].includes(rawAns)) {
              answerKeyMap[qNum] = rawAns;
            } else if (rawAns === 'TRUE' || rawAns === 'FALSE') {
              globalErrors.push(
                `Invalid answer for Question ${qNum}. Multiple Choice questions expect A, B, C, or D, not True/False.`
              );
            } else {
              globalErrors.push(`Invalid answer for Question ${qNum}. Expected A, B, C, or D.`);
            }
          }
        }
      } else {
        extraLinesAfterAnswerKey.push(line);
      }
    }
  }

  // 3. Parse Question Blocks
  // Question start pattern: line starting with digits followed by dot, e.g. "1." or "2. What is..."
  const questionStartRegex = /^\s*(\d+)\.\s*(.*)$/;
  // Option start pattern: line starting with single letter followed by parenthesis or dot, e.g. "A) text" or "A. text"
  const optionStartRegex = /^\s*([A-Za-z])[.)]\s*(.*)$/;
  // Inline answer pattern: "ANSWER: TRUE", "ANSWER: FALSE", "ANSWER: B", "ANSWER: true"
  const inlineAnswerRegex = /^\s*answer\s*:\s*(.*)$/i;

  interface RawQuestionBlock {
    qNum: number;
    headerLineIdx: number;
    textParts: string[];
    options: RawParsedOption[];
    inlineAnswer?: string;
    unexpectedOptionLines: string[];
    trailingExtraLines: string[];
  }

  const questionBlocks: RawQuestionBlock[] = [];
  let currentBlock: RawQuestionBlock | null = null;
  let parsingState: 'TEXT' | 'OPTIONS' | 'ANSWER' = 'TEXT';
  let firstQuestionFound = false;
  const textLinesBeforeFirstQuestion: string[] = [];

  for (let i = 0; i < questionLines.length; i++) {
    const rawLine = questionLines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      continue;
    }

    const qMatch = trimmed.match(questionStartRegex);
    if (qMatch) {
      firstQuestionFound = true;
      const qNum = parseInt(qMatch[1], 10);
      const textAfterDot = qMatch[2].trim();

      currentBlock = {
        qNum,
        headerLineIdx: i,
        textParts: textAfterDot ? [textAfterDot] : [],
        options: [],
        unexpectedOptionLines: [],
        trailingExtraLines: [],
      };
      questionBlocks.push(currentBlock);
      parsingState = 'TEXT';
      continue;
    }

    if (!firstQuestionFound) {
      textLinesBeforeFirstQuestion.push(trimmed);
      continue;
    }

    if (!currentBlock) {
      continue;
    }

    // Check for inline ANSWER: line
    const ansMatch = trimmed.match(inlineAnswerRegex);
    if (ansMatch) {
      parsingState = 'ANSWER';
      currentBlock.inlineAnswer = ansMatch[1].trim();
      continue;
    }

    // Check for option line (A) or A.)
    const optMatch = trimmed.match(optionStartRegex);
    if (optMatch && parsingState !== 'ANSWER') {
      parsingState = 'OPTIONS';
      const rawLabel = optMatch[1];
      const optLabel = rawLabel.toUpperCase();
      const optText = optMatch[2].trim();

      currentBlock.options.push({
        label: optLabel,
        text: optText,
        rawLabel,
      });
      continue;
    }

    // Line is neither a new question header, option, nor answer
    if (parsingState === 'TEXT') {
      // Continuation of multi-line question text (Requirement 8)
      currentBlock.textParts.push(trimmed);
    } else if (parsingState === 'OPTIONS') {
      // Non-empty line in option section that doesn't start with option label
      currentBlock.unexpectedOptionLines.push(trimmed);
    } else if (parsingState === 'ANSWER') {
      // Extra text after ANSWER before the next question starts
      currentBlock.trailingExtraLines.push(trimmed);
    }
  }

  // 4. Validate Global Constraints
  if (questionBlocks.length === 0) {
    if (hasAnswerKey) {
      globalErrors.push('No questions detected before the answer key.');
    } else {
      globalErrors.push('No numbered questions detected. Each question must start with a number (e.g. "1.").');
    }
    return {
      questions: [],
      globalErrors,
      globalWarnings,
      totalDetected: 0,
      readyCount: 0,
      warningCount: 0,
      errorCount: globalErrors.length,
      hasErrors: globalErrors.length > 0,
      hasWarnings: globalWarnings.length > 0,
      answerKeyMap,
      selectedType,
    };
  }

  const firstQuestionNum = questionBlocks[0].qNum;

  // Warning: Text detected before the first question
  if (textLinesBeforeFirstQuestion.length > 0) {
    const textExcerpt = textLinesBeforeFirstQuestion.join('\n');
    globalWarnings.push(
      `Text detected before Question ${firstQuestionNum}:\n"${textExcerpt}"`
    );
  }

  // Warning: Extra text after the answer key
  if (extraLinesAfterAnswerKey.length > 0) {
    const textExcerpt = extraLinesAfterAnswerKey.join('\n');
    globalWarnings.push(
      `Additional text detected after the answer key:\n"${textExcerpt}"`
    );
  }

  // Check duplicate question numbers (Requirement 6)
  const seenQuestionNums = new Set<number>();
  const duplicateNums = new Set<number>();
  for (const block of questionBlocks) {
    if (seenQuestionNums.has(block.qNum)) {
      duplicateNums.add(block.qNum);
    }
    seenQuestionNums.add(block.qNum);
  }

  for (const dupNum of duplicateNums) {
    globalErrors.push(`Duplicate question number: ${dupNum}.`);
  }

  // Warning: Numbering does not start at 1
  if (firstQuestionNum !== 1) {
    globalWarnings.push(`Question numbering starts at ${firstQuestionNum}.`);
  }

  // Warning: Missing sequential number (e.g. 1, 2, 4 -> 3 is missing)
  const allNums = questionBlocks.map((b) => b.qNum);
  const minNum = Math.min(...allNums);
  const maxNum = Math.max(...allNums);
  for (let n = minNum; n <= maxNum; n++) {
    if (!seenQuestionNums.has(n)) {
      globalWarnings.push(`Question number ${n} is missing.`);
    }
  }

  // Warning: Unexpected text detected between questions
  for (let i = 0; i < questionBlocks.length; i++) {
    const block = questionBlocks[i];
    if (block.trailingExtraLines.length > 0) {
      const excerpt = block.trailingExtraLines.join('\n');
      globalWarnings.push(
        `Unexpected text detected after Question ${block.qNum}:\n"${excerpt}"`
      );
    }
  }

  // Check if answer key references nonexistent question
  for (const kNumStr of Object.keys(answerKeyMap)) {
    const kNum = parseInt(kNumStr, 10);
    if (!seenQuestionNums.has(kNum)) {
      globalErrors.push(
        `Answer key references Question ${kNum}, but Question ${kNum} does not exist.`
      );
    }
  }

  // If there's no bottom answer key AND no question has an inline answer, report missing answer key
  const hasAnyInlineAnswer = questionBlocks.some((b) => b.inlineAnswer !== undefined);
  if (!hasAnswerKey && !hasAnyInlineAnswer) {
    globalErrors.push('Answer key not found.');
  }

  // 5. Validate Each Question Block
  for (const block of questionBlocks) {
    const qErrors: string[] = [];
    const qWarnings: string[] = [];
    const qText = block.textParts.join(' ').trim();

    // Error: Missing question text (Requirement 14)
    if (!qText) {
      qErrors.push(`Missing question text for Question ${block.qNum}.`);
    }

    const hasOptions = block.options.length > 0;
    const rawAnswer =
      block.inlineAnswer !== undefined
        ? block.inlineAnswer
        : answerKeyMap[block.qNum];

    const questionType: ImportQuestionType = selectedType;
    let finalAnswer: string | undefined = undefined;
    let finalAnswers: string[] | undefined = undefined;

    if (questionType === 'true_false') {
      // -----------------------------------------------------------------
      // TRUE / FALSE VALIDATION (Requirements 3, 4, 5)
      // -----------------------------------------------------------------
      // True/False questions must NOT contain options
      if (hasOptions) {
        qErrors.push(
          `Question ${block.qNum} does not match True / False format: True / False questions must not contain options.`
        );
      }

      // Check unexpected option lines on a question intended as True/False
      for (const badLine of block.unexpectedOptionLines) {
        qErrors.push(
          `Question ${block.qNum} contains unexpected text:\n"${badLine}"`
        );
      }

      if (rawAnswer === undefined || rawAnswer.trim() === '') {
        qErrors.push(`Missing answer for Question ${block.qNum}.`);
      } else {
        const normAns = rawAnswer.trim().toUpperCase();
        if (normAns === 'TRUE' || normAns === 'FALSE') {
          finalAnswer = normAns;
        } else if (['A', 'B', 'C', 'D'].includes(normAns)) {
          qErrors.push(
            `Invalid True/False answer for Question ${block.qNum}. Expected TRUE or FALSE, not Multiple Choice option (${normAns}).`
          );
          finalAnswer = normAns;
        } else {
          // Reject non-TRUE/FALSE answers (e.g. T, F, YES, NO, 1, 0)
          qErrors.push(
            `Invalid True/False answer for Question ${block.qNum}. Expected TRUE or FALSE.`
          );
          finalAnswer = normAns;
        }
      }
    } else if (questionType === 'multiple_select') {
      // -----------------------------------------------------------------
      // MULTIPLE SELECT VALIDATION
      // -----------------------------------------------------------------
      // Multiple Select questions MUST contain at least 2 options
      if (!hasOptions || block.options.length < 2) {
        qErrors.push(
          `Question ${block.qNum} does not match Multiple Select format. Must have at least 2 options.`
        );
      }

      // Unexpected text inside option section
      for (const badLine of block.unexpectedOptionLines) {
        qErrors.push(
          `Question ${block.qNum} contains unexpected text inside the option section:\n"${badLine}"`
        );
      }

      // Explicitly detect duplicate option labels
      const seenOptionLabels = new Set<string>();
      const duplicateOptionLabels = new Set<string>();
      for (const opt of block.options) {
        if (seenOptionLabels.has(opt.label)) {
          duplicateOptionLabels.add(opt.label);
        }
        seenOptionLabels.add(opt.label);
      }
      for (const dupLabel of duplicateOptionLabels) {
        qErrors.push(
          `Question ${block.qNum} contains duplicate option label ${dupLabel}.`
        );
      }

      // Check valid option labels (single letters A-Z)
      for (const opt of block.options) {
        if (!/^[A-Za-z]$/.test(opt.rawLabel)) {
          qErrors.push(
            `Question ${block.qNum} contains invalid option ${opt.rawLabel}. Expected option letter.`
          );
        }
      }

      // Check option sequence (must appear in alphabetical order: A, B, C...)
      if (block.options.length > 0 && duplicateOptionLabels.size === 0) {
        let isStrictSequence = true;
        for (let idx = 0; idx < block.options.length; idx++) {
          const expectedLetter = String.fromCharCode(65 + idx);
          if (block.options[idx].label !== expectedLetter) {
            isStrictSequence = false;
            break;
          }
        }
        if (!isStrictSequence) {
          qErrors.push(`Question ${block.qNum} options must appear in alphabetical order (A, B, C...).`);
        }
      }

      // Empty options
      for (const opt of block.options) {
        if (!opt.text || opt.text.trim().length === 0) {
          qErrors.push(`Question ${block.qNum} has an empty option ${opt.label}.`);
        }
      }

      // Answer validation for Multiple Select
      if (rawAnswer === undefined || rawAnswer.trim() === '') {
        qErrors.push(`Missing answer for Question ${block.qNum}.`);
      } else {
        const trimmedRaw = rawAnswer.trim();
        if (trimmedRaw.toUpperCase() === 'TRUE' || trimmedRaw.toUpperCase() === 'FALSE') {
          qErrors.push(
            `Invalid answer for Question ${block.qNum}. Multiple Select questions expect option letters separated by commas, not True/False.`
          );
        } else {
          // Parse comma-separated option letters
          const parts = trimmedRaw.split(',').map((p) => p.trim());
          const validParts: string[] = [];
          const seenAnswerLetters = new Set<string>();
          const duplicateAnswerLetters = new Set<string>();
          let hasInvalidLetter = false;

          for (const part of parts) {
            if (!part) {
              qErrors.push(`Question ${block.qNum} contains an empty answer entry.`);
              hasInvalidLetter = true;
              continue;
            }
            const letter = part.toUpperCase();
            if (!/^[A-Z]$/.test(letter)) {
              hasInvalidLetter = true;
              qErrors.push(
                `Invalid answer letter "${part}" for Question ${block.qNum}. Expected option letter.`
              );
              continue;
            }
            if (seenAnswerLetters.has(letter)) {
              duplicateAnswerLetters.add(letter);
            }
            seenAnswerLetters.add(letter);
            validParts.push(letter);
          }

          // Duplicate answer letters
          for (const dupLetter of duplicateAnswerLetters) {
            qErrors.push(
              `Question ${block.qNum} contains duplicate answer letter "${dupLetter}".`
            );
          }

          // Answers referring to nonexistent options
          const availableOptionLabels = new Set(block.options.map((o) => o.label));
          for (const ansLetter of validParts) {
            if (block.options.length > 0 && !availableOptionLabels.has(ansLetter)) {
              qErrors.push(
                `Question ${block.qNum} answer references nonexistent option ${ansLetter}.`
              );
            }
          }

          // At least 2 correct answers are required
          const uniqueValidAnswers = Array.from(new Set(validParts));
          if (uniqueValidAnswers.length < 2 && !hasInvalidLetter) {
            qErrors.push(
              `Question ${block.qNum} must have at least 2 correct answers.`
            );
          }

          finalAnswers = uniqueValidAnswers;
          finalAnswer = uniqueValidAnswers.join(', ');
        }
      }
    } else if (questionType === 'short_answer') {
      // -----------------------------------------------------------------
      // SHORT ANSWER VALIDATION
      // -----------------------------------------------------------------
      // Short Answer questions must NOT contain options
      if (hasOptions) {
        qErrors.push(
          `Question ${block.qNum} does not match Short Answer format: Short Answer questions must not contain options.`
        );
      }

      // Check unexpected option lines on a question intended as Short Answer
      for (const badLine of block.unexpectedOptionLines) {
        qErrors.push(
          `Question ${block.qNum} contains unexpected text:\n"${badLine}"`
        );
      }

      if (rawAnswer === undefined) {
        qErrors.push(`Missing answer for Question ${block.qNum}.`);
      } else {
        const trimmedAns = rawAnswer.trim();
        if (!trimmedAns) {
          qErrors.push(
            `Empty answer for Question ${block.qNum}. Answer cannot be blank.`
          );
        } else if (
          trimmedAns.toUpperCase() === 'TRUE' ||
          trimmedAns.toUpperCase() === 'FALSE'
        ) {
          qErrors.push(
            `Invalid answer for Question ${block.qNum}. Short Answer questions expect a text answer, not True/False.`
          );
        } else {
          finalAnswer = trimmedAns;
          finalAnswers = [trimmedAns];
        }
      }
    } else if (questionType === 'fill_blank') {
      // -----------------------------------------------------------------
      // FILL IN THE BLANK VALIDATION
      // -----------------------------------------------------------------
      // Fill in the Blank questions must NOT contain options
      if (hasOptions) {
        qErrors.push(
          `Question ${block.qNum} does not match Fill in the Blank format: Fill in the Blank questions must not contain options.`
        );
      }

      // Check unexpected option lines on a question intended as Fill in the Blank
      for (const badLine of block.unexpectedOptionLines) {
        qErrors.push(
          `Question ${block.qNum} contains unexpected text:\n"${badLine}"`
        );
      }

      // Detect blanks in question text
      const blankMatches =
        qText.match(
          /(?:_{2,}|\[blank(?::|\s*\d+|_\d+)?\]|\[_+\]|(?<=\s|^)_(?=\s|[.,!?;:]|$))/gi
        ) || [];
      const blankCount = blankMatches.length;

      if (blankCount === 0 && qText.length > 0) {
        qErrors.push(
          `Question ${block.qNum} does not match Fill in the Blank format: No blanks (e.g. ___) detected in question text.`
        );
      }

      if (rawAnswer === undefined) {
        qErrors.push(`Missing answer for Question ${block.qNum}.`);
      } else {
        const trimmedAns = rawAnswer.trim();
        if (!trimmedAns) {
          qErrors.push(
            `Empty answer for Question ${block.qNum}. Answer cannot be blank.`
          );
        } else {
          // Split answers by pipe (|)
          const rawParts = trimmedAns.split('|');
          const trimmedParts = rawParts.map((p) => p.trim());
          let hasEmptyPart = false;

          for (let idx = 0; idx < trimmedParts.length; idx++) {
            if (trimmedParts[idx].length === 0) {
              hasEmptyPart = true;
              qErrors.push(
                `Question ${block.qNum} Blank ${idx + 1} has an empty answer. Answers cannot be blank.`
              );
            }
          }

          if (blankCount > 0 && !hasEmptyPart) {
            if (trimmedParts.length !== blankCount) {
              if (blankCount === 1) {
                qErrors.push(
                  `Question ${block.qNum} contains 1 blank but provided ${trimmedParts.length} answers. Expected 1 answer.`
                );
              } else {
                qErrors.push(
                  `Question ${block.qNum} contains ${blankCount} blanks but provided ${trimmedParts.length} ${
                    trimmedParts.length === 1 ? 'answer' : 'answers'
                  }. Expected ${blankCount} answers separated by |.`
                );
              }
            }
          }

          finalAnswer = trimmedParts.join(' | ');
          finalAnswers = trimmedParts;
        }
      }
    } else {
      // -----------------------------------------------------------------
      // MULTIPLE CHOICE VALIDATION (Requirements 2, 4, 5)
      // -----------------------------------------------------------------
      // Multiple Choice questions MUST contain options A, B, C, D
      if (!hasOptions) {
        qErrors.push(
          `Question ${block.qNum} does not match Multiple Choice format. Missing options (A, B, C, D).`
        );
      }

      // Unexpected text inside option section
      for (const badLine of block.unexpectedOptionLines) {
        qErrors.push(
          `Question ${block.qNum} contains unexpected text inside the option section:\n"${badLine}"`
        );
      }

      // Explicitly detect duplicate option labels
      const seenOptionLabels = new Set<string>();
      const duplicateOptionLabels = new Set<string>();
      for (const opt of block.options) {
        if (seenOptionLabels.has(opt.label)) {
          duplicateOptionLabels.add(opt.label);
        }
        seenOptionLabels.add(opt.label);
      }
      for (const dupLabel of duplicateOptionLabels) {
        qErrors.push(
          `Question ${block.qNum} contains duplicate option label ${dupLabel}.`
        );
      }

      // Check invalid option labels (must be A, B, C, or D)
      const validLabels = ['A', 'B', 'C', 'D'];
      for (const opt of block.options) {
        if (!validLabels.includes(opt.label)) {
          qErrors.push(
            `Question ${block.qNum} contains invalid option ${opt.rawLabel}. Expected A, B, C, or D.`
          );
        }
      }

      // Check option sequence (must appear in A, B, C, D order)
      if (block.options.length > 0 && duplicateOptionLabels.size === 0) {
        let isStrictSequence = true;
        const expectedSeq = ['A', 'B', 'C', 'D'];
        for (let idx = 0; idx < block.options.length; idx++) {
          if (block.options[idx].label !== expectedSeq[idx]) {
            isStrictSequence = false;
            break;
          }
        }
        if (!isStrictSequence && block.options.every((o) => validLabels.includes(o.label))) {
          qErrors.push(`Question ${block.qNum} options must appear in A, B, C, D order.`);
        }
      }

      // Missing options
      const presentLabels = new Set(block.options.map((o) => o.label));
      for (const expected of ['A', 'B', 'C', 'D']) {
        if (!presentLabels.has(expected)) {
          qErrors.push(`Question ${block.qNum} is missing option ${expected}.`);
        }
      }

      // Empty options
      for (const opt of block.options) {
        if (!opt.text || opt.text.trim().length === 0) {
          qErrors.push(`Question ${block.qNum} has an empty option ${opt.label}.`);
        }
      }

      // Answer validation for Multiple Choice
      if (rawAnswer === undefined || rawAnswer.trim() === '') {
        qErrors.push(`Missing answer for Question ${block.qNum}.`);
      } else {
        const normAns = rawAnswer.trim().toUpperCase();
        if (validLabels.includes(normAns)) {
          finalAnswer = normAns;
        } else if (normAns === 'TRUE' || normAns === 'FALSE') {
          qErrors.push(
            `Invalid answer for Question ${block.qNum}. Multiple Choice questions expect A, B, C, or D, not True/False.`
          );
          finalAnswer = normAns;
        } else {
          qErrors.push(
            `Invalid answer for Question ${block.qNum}. Expected A, B, C, or D.`
          );
          finalAnswer = normAns;
        }
      }
    }

    // Determine question status
    let status: 'READY' | 'WARNING' | 'ERROR' = 'READY';
    if (qErrors.length > 0) {
      status = 'ERROR';
    } else if (qWarnings.length > 0) {
      status = 'WARNING';
    }

    questions.push({
      questionNumber: block.qNum,
      type: questionType,
      text: qText,
      options: block.options,
      answer: finalAnswer,
      answers: finalAnswers,
      errors: qErrors,
      warnings: qWarnings,
      status,
    });
  }

  // Count ready, warnings, errors
  const questionErrorsCount = questions.reduce((sum, q) => sum + q.errors.length, 0);
  const totalErrors = globalErrors.length + questionErrorsCount;
  const totalWarnings =
    globalWarnings.length + questions.reduce((sum, q) => sum + q.warnings.length, 0);

  const readyQuestionsCount = questions.filter((q) => q.status === 'READY').length;
  const warningQuestionsCount = questions.filter((q) => q.status === 'WARNING').length;
  const errorQuestionsCount = questions.filter((q) => q.status === 'ERROR').length;

  return {
    questions,
    globalErrors,
    globalWarnings,
    totalDetected: questions.length,
    readyCount: readyQuestionsCount,
    warningCount: warningQuestionsCount,
    errorCount: errorQuestionsCount,
    hasErrors: totalErrors > 0,
    hasWarnings: totalWarnings > 0,
    answerKeyMap,
    selectedType,
  };
}

export function parseMatchingExamText(rawInput: string): ParseResult {
  const globalErrors: string[] = [];
  const globalWarnings: string[] = [];
  const questions: RawParsedQuestion[] = [];

  const trimmedInput = rawInput.trim();
  if (!trimmedInput) {
    return {
      questions: [],
      globalErrors: [],
      globalWarnings: [],
      totalDetected: 0,
      readyCount: 0,
      warningCount: 0,
      errorCount: 0,
      hasErrors: false,
      hasWarnings: false,
      answerKeyMap: {},
      selectedType: 'matching',
    };
  }

  const allLines = rawInput.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  interface RawMatchingBlock {
    qNum: number;
    textParts: string[];
    hasLeftHeader: boolean;
    hasRightHeader: boolean;
    hasAnswerHeader: boolean;
    leftItems: MatchingParsedItem[];
    rightItems: MatchingParsedItem[];
    answerPairs: { left: string; right: string; raw: string }[];
    unexpectedLines: string[];
  }

  const blocks: RawMatchingBlock[] = [];
  let currentBlock: RawMatchingBlock | null = null;
  let sectionState: 'QUESTION_TEXT' | 'LEFT' | 'RIGHT' | 'ANSWER' = 'QUESTION_TEXT';
  let firstQuestionFound = false;
  const textBeforeFirstQuestion: string[] = [];

  const questionStartRegex = /^\s*(\d+)\.\s*(.*)$/;
  const leftHeaderRegex = /^\s*LEFT\s*:?\s*$/i;
  const rightHeaderRegex = /^\s*RIGHT\s*:?\s*$/i;
  const answerHeaderRegex = /^\s*ANSWERS?\s*:?\s*(.*)$/i;

  const leftItemRegex = /^\s*([A-Za-z])[.)]\s*(.*)$/;
  const rightItemRegex = /^\s*(\d+)[.)]\s*(.*)$/;
  const pairMatchRegex = /([A-Za-z])\s*[-–—:>]\s*(\d+)/g;

  for (let i = 0; i < allLines.length; i++) {
    const rawLine = allLines[i];
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Check LEFT: section header
    if (leftHeaderRegex.test(trimmed)) {
      if (currentBlock) {
        currentBlock.hasLeftHeader = true;
        sectionState = 'LEFT';
      } else {
        textBeforeFirstQuestion.push(trimmed);
      }
      continue;
    }

    // Check RIGHT: section header
    if (rightHeaderRegex.test(trimmed)) {
      if (currentBlock) {
        currentBlock.hasRightHeader = true;
        sectionState = 'RIGHT';
      } else {
        textBeforeFirstQuestion.push(trimmed);
      }
      continue;
    }

    // Check ANSWER: section header
    const ansHeaderMatch = trimmed.match(answerHeaderRegex);
    if (ansHeaderMatch) {
      if (currentBlock) {
        currentBlock.hasAnswerHeader = true;
        sectionState = 'ANSWER';

        const inlinePairsStr = ansHeaderMatch[1].trim();
        if (inlinePairsStr) {
          const matches = [...inlinePairsStr.matchAll(pairMatchRegex)];
          if (matches.length > 0) {
            for (const m of matches) {
              currentBlock.answerPairs.push({
                left: m[1].toUpperCase(),
                right: m[2],
                raw: m[0],
              });
            }
          } else {
            currentBlock.unexpectedLines.push(
              `Invalid match pair "${inlinePairsStr}" for Question ${currentBlock.qNum}. Expected format like "A-1".`
            );
          }
        }
      } else {
        textBeforeFirstQuestion.push(trimmed);
      }
      continue;
    }

    // Check for a new numbered question header: e.g. "1. Match words" or "2. Match capitals"
    // While inside sectionState === 'RIGHT', lines starting with \d+[.)] are right items!
    if (sectionState !== 'RIGHT') {
      const qMatch = trimmed.match(questionStartRegex);
      if (qMatch) {
        firstQuestionFound = true;
        const qNum = parseInt(qMatch[1], 10);
        const textAfterDot = qMatch[2].trim();

        currentBlock = {
          qNum,
          textParts: textAfterDot ? [textAfterDot] : [],
          hasLeftHeader: false,
          hasRightHeader: false,
          hasAnswerHeader: false,
          leftItems: [],
          rightItems: [],
          answerPairs: [],
          unexpectedLines: [],
        };
        blocks.push(currentBlock);
        sectionState = 'QUESTION_TEXT';
        continue;
      }
    }

    if (!firstQuestionFound) {
      textBeforeFirstQuestion.push(trimmed);
      continue;
    }

    if (!currentBlock) continue;

    // Handle line based on current section
    if (sectionState === 'QUESTION_TEXT') {
      currentBlock.textParts.push(trimmed);
    } else if (sectionState === 'LEFT') {
      const leftMatch = trimmed.match(leftItemRegex);
      if (leftMatch) {
        currentBlock.leftItems.push({
          label: leftMatch[1].toUpperCase(),
          text: leftMatch[2].trim(),
        });
      } else {
        currentBlock.unexpectedLines.push(
          `Question ${currentBlock.qNum} contains unexpected line in LEFT section: "${trimmed}". Expected letter item like "A. Item".`
        );
      }
    } else if (sectionState === 'RIGHT') {
      const rightMatch = trimmed.match(rightItemRegex);
      if (rightMatch) {
        currentBlock.rightItems.push({
          label: rightMatch[1],
          text: rightMatch[2].trim(),
        });
      } else {
        currentBlock.unexpectedLines.push(
          `Question ${currentBlock.qNum} contains unexpected line in RIGHT section: "${trimmed}". Expected number item like "1. Item".`
        );
      }
    } else if (sectionState === 'ANSWER') {
      const matches = [...trimmed.matchAll(pairMatchRegex)];
      if (matches.length > 0) {
        for (const m of matches) {
          currentBlock.answerPairs.push({
            left: m[1].toUpperCase(),
            right: m[2],
            raw: m[0],
          });
        }
      } else {
        currentBlock.unexpectedLines.push(
          `Invalid match pair "${trimmed}" for Question ${currentBlock.qNum}. Expected format like "A-1".`
        );
      }
    }
  }

  // Global validations
  if (blocks.length === 0) {
    globalErrors.push('No numbered questions detected. Each question must start with a number (e.g. "1.").');
    return {
      questions: [],
      globalErrors,
      globalWarnings,
      totalDetected: 0,
      readyCount: 0,
      warningCount: 0,
      errorCount: globalErrors.length,
      hasErrors: globalErrors.length > 0,
      hasWarnings: globalWarnings.length > 0,
      answerKeyMap: {},
      selectedType: 'matching',
    };
  }

  const seenQuestionNums = new Set<number>();
  const duplicateNums = new Set<number>();
  for (const block of blocks) {
    if (seenQuestionNums.has(block.qNum)) {
      duplicateNums.add(block.qNum);
    }
    seenQuestionNums.add(block.qNum);
  }
  for (const dup of duplicateNums) {
    globalErrors.push(`Duplicate question number: ${dup}.`);
  }

  if (textBeforeFirstQuestion.length > 0) {
    globalWarnings.push(`Text detected before Question ${blocks[0].qNum}:\n"${textBeforeFirstQuestion.join('\n')}"`);
  }

  if (blocks[0].qNum !== 1) {
    globalWarnings.push(`Question numbering starts at ${blocks[0].qNum}.`);
  }

  // Validate each matching block
  for (const block of blocks) {
    const qErrors: string[] = [];
    const qWarnings: string[] = [];
    const qText = block.textParts.join(' ').trim();

    if (!qText) {
      qErrors.push(`Missing question text for Question ${block.qNum}.`);
    }

    // Required sections
    if (!block.hasLeftHeader) {
      qErrors.push(`Question ${block.qNum} is missing LEFT: section.`);
    }
    if (!block.hasRightHeader) {
      qErrors.push(`Question ${block.qNum} is missing RIGHT: section.`);
    }
    if (!block.hasAnswerHeader) {
      qErrors.push(`Question ${block.qNum} is missing ANSWER: section.`);
    }

    // Check empty sections
    if (block.hasLeftHeader && block.leftItems.length === 0) {
      qErrors.push(`Question ${block.qNum} LEFT: section does not contain any items.`);
    }
    if (block.hasRightHeader && block.rightItems.length === 0) {
      qErrors.push(`Question ${block.qNum} RIGHT: section does not contain any items.`);
    }
    if (block.hasAnswerHeader && block.answerPairs.length === 0) {
      qErrors.push(`Question ${block.qNum} ANSWER: section does not contain any match pairs.`);
    }

    // Empty item texts
    for (const item of block.leftItems) {
      if (!item.text.trim()) {
        qErrors.push(`Question ${block.qNum} Left item "${item.label}" has empty text.`);
      }
    }
    for (const item of block.rightItems) {
      if (!item.text.trim()) {
        qErrors.push(`Question ${block.qNum} Right item "${item.label}" has empty text.`);
      }
    }

    // Duplicate left item labels
    const seenLeftLabels = new Set<string>();
    const dupLeftLabels = new Set<string>();
    for (const item of block.leftItems) {
      if (seenLeftLabels.has(item.label)) {
        dupLeftLabels.add(item.label);
      }
      seenLeftLabels.add(item.label);
    }
    for (const dup of dupLeftLabels) {
      qErrors.push(`Question ${block.qNum} contains duplicate left item label "${dup}".`);
    }

    // Duplicate right item labels
    const seenRightLabels = new Set<string>();
    const dupRightLabels = new Set<string>();
    for (const item of block.rightItems) {
      if (seenRightLabels.has(item.label)) {
        dupRightLabels.add(item.label);
      }
      seenRightLabels.add(item.label);
    }
    for (const dup of dupRightLabels) {
      qErrors.push(`Question ${block.qNum} contains duplicate right item label "${dup}".`);
    }

    // Minimum pairs
    if (block.leftItems.length > 0 && block.leftItems.length < 2) {
      qErrors.push(`Question ${block.qNum} requires at least 2 items to match.`);
    }
    if (block.rightItems.length > 0 && block.rightItems.length < 2) {
      qErrors.push(`Question ${block.qNum} requires at least 2 right-side options.`);
    }

    // Left/Right reference validation in answer pairs
    const leftMap = new Map(block.leftItems.map((i) => [i.label, i.text]));
    const rightMap = new Map(block.rightItems.map((i) => [i.label, i.text]));

    const matchedLeftLabels = new Set<string>();
    const dupMatchedLeft = new Set<string>();

    for (const pair of block.answerPairs) {
      if (matchedLeftLabels.has(pair.left)) {
        dupMatchedLeft.add(pair.left);
      }
      matchedLeftLabels.add(pair.left);

      // Check nonexistent left reference
      if (block.leftItems.length > 0 && !leftMap.has(pair.left)) {
        qErrors.push(`Question ${block.qNum} answer references nonexistent left item "${pair.left}".`);
      }

      // Check nonexistent right reference
      if (block.rightItems.length > 0 && !rightMap.has(pair.right)) {
        qErrors.push(`Question ${block.qNum} answer references nonexistent right item "${pair.right}".`);
      }
    }

    // Duplicate left references in answers
    for (const dup of dupMatchedLeft) {
      qErrors.push(`Question ${block.qNum} contains duplicate match for left item "${dup}".`);
    }

    // Missing left references
    for (const item of block.leftItems) {
      if (!matchedLeftLabels.has(item.label)) {
        qErrors.push(
          `Question ${block.qNum} is missing match for left item "${item.label}". Each left item must have exactly one match.`
        );
      }
    }

    // Unexpected lines
    for (const unexp of block.unexpectedLines) {
      qErrors.push(unexp);
    }

    // Build matchingPairs
    const matchedPairs: MatchingParsedPair[] = [];
    for (const pair of block.answerPairs) {
      const leftText = leftMap.get(pair.left) || '';
      const rightText = rightMap.get(pair.right) || '';
      matchedPairs.push({
        leftLabel: pair.left,
        rightLabel: pair.right,
        leftText,
        rightText,
      });
    }

    const pairStrings = block.answerPairs.map((p) => `${p.left}-${p.right}`);
    const finalAnswer = pairStrings.join(', ');

    let status: 'READY' | 'WARNING' | 'ERROR' = 'READY';
    if (qErrors.length > 0) status = 'ERROR';
    else if (qWarnings.length > 0) status = 'WARNING';

    questions.push({
      questionNumber: block.qNum,
      type: 'matching',
      text: qText,
      options: [],
      answer: finalAnswer,
      answers: pairStrings,
      matchingLeft: block.leftItems,
      matchingRight: block.rightItems,
      matchingPairs: matchedPairs,
      errors: qErrors,
      warnings: qWarnings,
      status,
    });
  }

  const questionErrorsCount = questions.reduce((sum, q) => sum + q.errors.length, 0);
  const totalErrors = globalErrors.length + questionErrorsCount;
  const totalWarnings =
    globalWarnings.length + questions.reduce((sum, q) => sum + q.warnings.length, 0);

  return {
    questions,
    globalErrors,
    globalWarnings,
    totalDetected: questions.length,
    readyCount: questions.filter((q) => q.status === 'READY').length,
    warningCount: questions.filter((q) => q.status === 'WARNING').length,
    errorCount: questions.filter((q) => q.status === 'ERROR').length,
    hasErrors: totalErrors > 0,
    hasWarnings: totalWarnings > 0,
    answerKeyMap: {},
    selectedType: 'matching',
  };
}

/**
 * Dedicated Parser and Validator for Ordering Main Format.
 * Format:
 * 1. Question text
 * A. Item 1
 * B. Item 2
 * C. Item 3
 * ANSWER: B, A, C
 */
export function parseOrderingExamText(rawInput: string): ParseResult {
  const globalErrors: string[] = [];
  const globalWarnings: string[] = [];
  const questions: RawParsedQuestion[] = [];

  const trimmedInput = rawInput.trim();
  if (!trimmedInput) {
    return {
      questions: [],
      globalErrors: [],
      globalWarnings: [],
      totalDetected: 0,
      readyCount: 0,
      warningCount: 0,
      errorCount: 0,
      hasErrors: false,
      hasWarnings: false,
      answerKeyMap: {},
      selectedType: 'ordering',
    };
  }

  const allLines = rawInput.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  interface RawOrderingBlock {
    qNum: number;
    textParts: string[];
    hasAnswerHeader: boolean;
    rawAnswerString: string;
    items: { label: string; text: string }[];
    unexpectedLines: string[];
  }

  const blocks: RawOrderingBlock[] = [];
  let currentBlock: RawOrderingBlock | null = null;
  let sectionState: 'QUESTION_TEXT' | 'ITEMS' | 'ANSWER' = 'QUESTION_TEXT';
  let firstQuestionFound = false;
  const textBeforeFirstQuestion: string[] = [];

  const questionStartRegex = /^\s*(\d+)\.\s*(.*)$/;
  const itemRegex = /^\s*([A-Za-z])[.)]\s*(.*)$/;
  const answerHeaderRegex = /^\s*ANSWERS?\s*:?\s*(.*)$/i;

  for (let i = 0; i < allLines.length; i++) {
    const rawLine = allLines[i];
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Check ANSWER: header
    const ansMatch = trimmed.match(answerHeaderRegex);
    if (ansMatch) {
      if (currentBlock) {
        currentBlock.hasAnswerHeader = true;
        sectionState = 'ANSWER';
        const inlineAns = ansMatch[1].trim();
        if (inlineAns) {
          currentBlock.rawAnswerString = inlineAns;
        }
      } else {
        textBeforeFirstQuestion.push(trimmed);
      }
      continue;
    }

    // Check if line starts a new question block: e.g. "1. Put steps in order"
    const qMatch = trimmed.match(questionStartRegex);
    if (qMatch) {
      const qNum = parseInt(qMatch[1], 10);
      const isNewQuestion =
        !firstQuestionFound ||
        sectionState === 'ANSWER' ||
        (currentBlock &&
          (currentBlock.hasAnswerHeader ||
            qNum === currentBlock.qNum + 1 ||
            (currentBlock.items.length >= 2 && qNum > currentBlock.qNum)));

      if (isNewQuestion) {
        firstQuestionFound = true;
        const textAfterDot = qMatch[2].trim();
        currentBlock = {
          qNum,
          textParts: textAfterDot ? [textAfterDot] : [],
          hasAnswerHeader: false,
          rawAnswerString: '',
          items: [],
          unexpectedLines: [],
        };
        blocks.push(currentBlock);
        sectionState = 'QUESTION_TEXT';
        continue;
      }
    }

    if (!firstQuestionFound) {
      textBeforeFirstQuestion.push(trimmed);
      continue;
    }

    if (!currentBlock) continue;

    // If sectionState is ANSWER and rawAnswerString is empty, capture next line as answer
    if (sectionState === 'ANSWER') {
      if (!currentBlock.rawAnswerString) {
        currentBlock.rawAnswerString = trimmed;
      } else {
        currentBlock.unexpectedLines.push(
          `Question ${currentBlock.qNum} contains unexpected line after ANSWER: "${trimmed}".`
        );
      }
      continue;
    }

    // Check if line is lettered item
    const itemMatch = trimmed.match(itemRegex);
    if (itemMatch) {
      sectionState = 'ITEMS';
      currentBlock.items.push({
        label: itemMatch[1].toUpperCase(),
        text: itemMatch[2].trim(),
      });
      continue;
    }

    // If in QUESTION_TEXT, accumulate question text
    if (sectionState === 'QUESTION_TEXT') {
      currentBlock.textParts.push(trimmed);
    } else if (sectionState === 'ITEMS') {
      currentBlock.unexpectedLines.push(
        `Question ${currentBlock.qNum} contains unexpected line: "${trimmed}". Expected lettered item (e.g. "A. Item") or ANSWER line.`
      );
    }
  }

  // Global validations
  if (blocks.length === 0) {
    globalErrors.push('No numbered questions detected. Each question must start with a number (e.g. "1.").');
    return {
      questions: [],
      globalErrors,
      globalWarnings,
      totalDetected: 0,
      readyCount: 0,
      warningCount: 0,
      errorCount: globalErrors.length,
      hasErrors: globalErrors.length > 0,
      hasWarnings: globalWarnings.length > 0,
      answerKeyMap: {},
      selectedType: 'ordering',
    };
  }

  const seenQuestionNums = new Set<number>();
  const duplicateNums = new Set<number>();
  for (const block of blocks) {
    if (seenQuestionNums.has(block.qNum)) {
      duplicateNums.add(block.qNum);
    }
    seenQuestionNums.add(block.qNum);
  }
  for (const dup of duplicateNums) {
    globalErrors.push(`Duplicate question number: ${dup}.`);
  }

  if (textBeforeFirstQuestion.length > 0) {
    globalWarnings.push(
      `Text detected before Question ${blocks[0].qNum}:\n"${textBeforeFirstQuestion.join('\n')}"`
    );
  }

  if (blocks[0].qNum !== 1) {
    globalWarnings.push(`Question numbering starts at ${blocks[0].qNum}.`);
  }

  // Validate each ordering question block
  for (const block of blocks) {
    const qErrors: string[] = [];
    const qWarnings: string[] = [];
    const qText = block.textParts.join(' ').trim();

    // Missing question text
    if (!qText) {
      qErrors.push(`Missing question text for Question ${block.qNum}.`);
    }

    // Unexpected lines
    for (const unexp of block.unexpectedLines) {
      qErrors.push(unexp);
    }

    // Fewer than 2 items
    if (block.items.length === 0) {
      qErrors.push(`Question ${block.qNum} does not contain any items to order.`);
    } else if (block.items.length < 2) {
      qErrors.push(`Question ${block.qNum} requires at least 2 items to order.`);
    }

    // Empty item texts
    for (const item of block.items) {
      if (!item.text.trim()) {
        qErrors.push(`Question ${block.qNum} item "${item.label}" has empty text.`);
      }
    }

    // Duplicate item letters
    const seenItemLabels = new Set<string>();
    const dupItemLabels = new Set<string>();
    for (const item of block.items) {
      if (seenItemLabels.has(item.label)) {
        dupItemLabels.add(item.label);
      }
      seenItemLabels.add(item.label);
    }
    for (const dup of dupItemLabels) {
      qErrors.push(`Question ${block.qNum} contains duplicate item letter "${dup}".`);
    }

    // Missing ANSWER: header or empty answer
    if (!block.hasAnswerHeader) {
      qErrors.push(`Question ${block.qNum} is missing an ANSWER: line.`);
    } else if (!block.rawAnswerString.trim()) {
      qErrors.push(
        `Empty answer for Question ${block.qNum}. Expected sequence of item letters separated by commas.`
      );
    }

    // Parse and validate answer sequence
    const definedItemLabels = new Set(block.items.map((i) => i.label));
    const answerSequence: string[] = [];

    if (block.hasAnswerHeader && block.rawAnswerString.trim()) {
      const rawTokens = block.rawAnswerString.split(',').map((t) => t.trim());
      const seenAnswerLabels = new Set<string>();
      const dupAnswerLabels = new Set<string>();

      for (const token of rawTokens) {
        if (!token) {
          qErrors.push(`Question ${block.qNum} contains an empty item in the answer sequence.`);
          continue;
        }

        // Must be a single letter
        if (!/^[A-Za-z]$/.test(token)) {
          qErrors.push(
            `Invalid item letter "${token}" in answer sequence for Question ${block.qNum}. Expected a letter (e.g. A, B, C).`
          );
          continue;
        }

        const letter = token.toUpperCase();

        // Check extra items (not in defined items)
        if (definedItemLabels.size > 0 && !definedItemLabels.has(letter)) {
          qErrors.push(`Question ${block.qNum} answer references nonexistent item "${letter}".`);
        }

        // Check duplicate answer letters
        if (seenAnswerLabels.has(letter)) {
          dupAnswerLabels.add(letter);
        }
        seenAnswerLabels.add(letter);
        answerSequence.push(letter);
      }

      for (const dup of dupAnswerLabels) {
        qErrors.push(
          `Question ${block.qNum} contains duplicate answer letter "${dup}". Every item must appear exactly once.`
        );
      }

      // Check missing items from answer sequence
      for (const item of block.items) {
        if (!seenAnswerLabels.has(item.label)) {
          qErrors.push(
            `Question ${block.qNum} answer is missing item "${item.label}" from the answer sequence.`
          );
        }
      }
    }

    let status: 'READY' | 'WARNING' | 'ERROR' = 'READY';
    if (qErrors.length > 0) status = 'ERROR';
    else if (qWarnings.length > 0) status = 'WARNING';

    questions.push({
      questionNumber: block.qNum,
      type: 'ordering',
      text: qText,
      options: [],
      answer: answerSequence.join(', ') || block.rawAnswerString,
      answers: answerSequence,
      orderingItems: block.items.map((i) => ({ label: i.label, text: i.text })),
      correctOrder: answerSequence,
      errors: qErrors,
      warnings: qWarnings,
      status,
    });
  }

  const questionErrorsCount = questions.reduce((sum, q) => sum + q.errors.length, 0);
  const totalErrors = globalErrors.length + questionErrorsCount;
  const totalWarnings =
    globalWarnings.length + questions.reduce((sum, q) => sum + q.warnings.length, 0);

  return {
    questions,
    globalErrors,
    globalWarnings,
    totalDetected: questions.length,
    readyCount: questions.filter((q) => q.status === 'READY').length,
    warningCount: questions.filter((q) => q.status === 'WARNING').length,
    errorCount: questions.filter((q) => q.status === 'ERROR').length,
    hasErrors: totalErrors > 0,
    hasWarnings: totalWarnings > 0,
    answerKeyMap: {},
    selectedType: 'ordering',
  };
}

/**
 * Dedicated Parser and Validator for Reading Passage + Questions Format.
 *
 * Structure:
 * PASSAGE:
 * [Passage text with preserved multiple paragraphs]
 *
 * QUESTIONS:
 * 1. Question 1
 * A. Option A
 * B. Option B
 * ANSWER: B
 *
 * 2. Question 2
 * ANSWER: TRUE
 *
 * 3. Question 3
 * A. Option A
 * B. Option B
 * C. Option C
 * ANSWER: A, C
 */
export function parseReadingPassageExamText(rawInput: string): ParseResult {
  const globalErrors: string[] = [];
  const globalWarnings: string[] = [];
  const questions: RawParsedQuestion[] = [];

  const trimmedInput = rawInput.trim();
  if (!trimmedInput) {
    return {
      questions: [],
      globalErrors: [],
      globalWarnings: [],
      totalDetected: 0,
      readyCount: 0,
      warningCount: 0,
      errorCount: 0,
      hasErrors: false,
      hasWarnings: false,
      answerKeyMap: {},
      selectedType: 'reading_passage',
    };
  }

  const allLines = rawInput.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  const titleHeaderRegex = /^\s*TITLE\s*:?\s*(.*)$/i;
  const passageHeaderRegex = /^\s*PASSAGE\s*:?\s*(.*)$/i;
  const questionsHeaderRegex = /^\s*QUESTIONS?\s*:?\s*$/i;

  let detectedTitle: string | undefined = undefined;
  let passageHeaderIndex = -1;
  let passageInlineText = '';
  let questionsHeaderIndex = -1;
  let questionsBeforePassage = false;
  const textBeforePassage: string[] = [];

  for (let i = 0; i < allLines.length; i++) {
    const rawLine = allLines[i];
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    if (passageHeaderIndex === -1) {
      const tMatch = trimmed.match(titleHeaderRegex);
      if (tMatch) {
        if (tMatch[1].trim()) detectedTitle = tMatch[1].trim();
        continue;
      }

      if (questionsHeaderRegex.test(trimmed)) {
        questionsBeforePassage = true;
        continue;
      }

      const pMatch = trimmed.match(passageHeaderRegex);
      if (pMatch) {
        passageHeaderIndex = i;
        passageInlineText = pMatch[1].trim();
        continue;
      }

      textBeforePassage.push(trimmed);
    } else if (questionsHeaderIndex === -1) {
      if (questionsHeaderRegex.test(trimmed)) {
        questionsHeaderIndex = i;
        continue;
      }
    }
  }

  // Global Section Validations
  if (passageHeaderIndex === -1) {
    globalErrors.push('Missing "PASSAGE:" section. The import text must start with a "PASSAGE:" section header.');
  }

  if (questionsBeforePassage) {
    globalErrors.push('Invalid section order: "PASSAGE:" must appear before "QUESTIONS:".');
  } else if (questionsHeaderIndex === -1) {
    globalErrors.push('Missing "QUESTIONS:" section. The import text must include a "QUESTIONS:" section header after the passage.');
  }

  if (textBeforePassage.length > 0 && passageHeaderIndex !== -1) {
    globalWarnings.push(`Text detected before PASSAGE section:\n"${textBeforePassage.join('\n')}"`);
  }

  // Extract Passage Content with Preserved Paragraph Breaks
  let passageText = '';
  if (passageHeaderIndex !== -1 && questionsHeaderIndex !== -1) {
    const rawPassageLines: string[] = [];
    if (passageInlineText) {
      rawPassageLines.push(passageInlineText);
    }
    for (let i = passageHeaderIndex + 1; i < questionsHeaderIndex; i++) {
      rawPassageLines.push(allLines[i]);
    }
    passageText = rawPassageLines.join('\n').trim();

    if (!passageText) {
      globalErrors.push('Passage text is empty. Please provide the reading passage content.');
    }
  }

  // If there are structural errors preventing questions parsing
  if (questionsHeaderIndex === -1 || passageHeaderIndex === -1) {
    return {
      questions: [],
      globalErrors,
      globalWarnings,
      totalDetected: 0,
      readyCount: 0,
      warningCount: 0,
      errorCount: globalErrors.length,
      hasErrors: globalErrors.length > 0,
      hasWarnings: globalWarnings.length > 0,
      answerKeyMap: {},
      selectedType: 'reading_passage',
      readingPassage: passageText ? { title: detectedTitle, passage: passageText } : undefined,
    };
  }

  // Extract Questions Section Lines
  const questionsLines = allLines.slice(questionsHeaderIndex + 1);
  const questionsTextCheck = questionsLines.join('\n').trim();

  if (!questionsTextCheck) {
    globalErrors.push('Missing questions in the "QUESTIONS:" section. At least 1 question is required.');
    return {
      questions: [],
      globalErrors,
      globalWarnings,
      totalDetected: 0,
      readyCount: 0,
      warningCount: 0,
      errorCount: globalErrors.length,
      hasErrors: globalErrors.length > 0,
      hasWarnings: globalWarnings.length > 0,
      answerKeyMap: {},
      selectedType: 'reading_passage',
      readingPassage: { title: detectedTitle, passage: passageText },
    };
  }

  // Chunk Questions Lines into Individual Question Blocks
  interface QuestionChunk {
    qNum: number;
    lines: string[];
  }

  const chunks: QuestionChunk[] = [];
  let currentChunk: QuestionChunk | null = null;
  let inRightSection = false;
  let hasAnswerHeader = false;
  const textBeforeFirstQuestion: string[] = [];

  const questionStartRegex = /^\s*(\d+)\.\s*(.*)$/;
  const rightHeaderRegex = /^\s*RIGHT\s*:?\s*$/i;
  const answerHeaderRegex = /^\s*ANSWERS?\s*:?\s*(.*)$/i;

  for (let i = 0; i < questionsLines.length; i++) {
    const rawLine = questionsLines[i];
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Track state inside matching question
    if (rightHeaderRegex.test(trimmed)) {
      inRightSection = true;
    }
    if (answerHeaderRegex.test(trimmed)) {
      inRightSection = false;
      hasAnswerHeader = true;
    }

    // Check if line starts a new question block
    const qMatch = trimmed.match(questionStartRegex);
    if (qMatch && !inRightSection) {
      const qNum = parseInt(qMatch[1], 10);
      const isNewQuestion =
        !currentChunk ||
        hasAnswerHeader ||
        qNum === currentChunk.qNum + 1 ||
        (currentChunk.lines.length >= 2 && qNum > currentChunk.qNum);

      if (isNewQuestion) {
        currentChunk = {
          qNum,
          lines: [rawLine],
        };
        chunks.push(currentChunk);
        inRightSection = false;
        hasAnswerHeader = false;
        continue;
      }
    }

    if (!currentChunk) {
      textBeforeFirstQuestion.push(trimmed);
      continue;
    }

    currentChunk.lines.push(rawLine);
  }

  if (chunks.length === 0) {
    globalErrors.push('No numbered questions detected in the "QUESTIONS:" section. Each question must start with a number (e.g. "1.").');
  } else {
    if (textBeforeFirstQuestion.length > 0) {
      globalWarnings.push(`Text detected before Question ${chunks[0].qNum}:\n"${textBeforeFirstQuestion.join('\n')}"`);
    }

    const seenQNums = new Set<number>();
    const dupQNums = new Set<number>();
    for (const chunk of chunks) {
      if (seenQNums.has(chunk.qNum)) {
        dupQNums.add(chunk.qNum);
      }
      seenQNums.add(chunk.qNum);
    }
    for (const dup of dupQNums) {
      globalErrors.push(`Duplicate question number: ${dup}.`);
    }
  }

  // Regex helpers for question block parsing
  const leftItemRegex = /^\s*([A-Za-z])[.)]\s*(.*)$/;
  const rightItemRegex = /^\s*(\d+)[.)]\s*(.*)$/;
  const leftHeaderRegex = /^\s*LEFT\s*:?\s*$/i;
  const pairMatchRegex = /([A-Za-z])\s*[-–—]\s*(\d+)/g;

  // Validate each question block against its established Main Format
  for (const chunk of chunks) {
    const qErrors: string[] = [];
    const qWarnings: string[] = [];
    const qNum = chunk.qNum;

    // Determine components in chunk lines
    let firstLineText = '';
    const qStartMatch = chunk.lines[0].trim().match(questionStartRegex);
    if (qStartMatch) {
      firstLineText = qStartMatch[2].trim();
    }

    const textParts: string[] = firstLineText ? [firstLineText] : [];
    const optionItems: { label: string; text: string; rawLabel: string }[] = [];
    let hasAnswer = false;
    let rawAnswerString = '';

    // Check for Matching specific headers
    const hasLeftHeader = chunk.lines.some((l) => leftHeaderRegex.test(l.trim()));
    const hasRightHeader = chunk.lines.some((l) => rightHeaderRegex.test(l.trim()));
    const isMatchingCandidate = hasLeftHeader && hasRightHeader;

    if (isMatchingCandidate) {
      // -------------------------------------------------------------
      // 1. MATCHING QUESTION PARSER & VALIDATOR
      // -------------------------------------------------------------
      const leftItems: { label: string; text: string }[] = [];
      const rightItems: { label: string; text: string }[] = [];
      const answerPairs: { left: string; right: string }[] = [];
      let mSectionState: 'TEXT' | 'LEFT' | 'RIGHT' | 'ANSWER' = 'TEXT';

      for (let li = 1; li < chunk.lines.length; li++) {
        const line = chunk.lines[li].trim();
        if (!line) continue;

        if (leftHeaderRegex.test(line)) {
          mSectionState = 'LEFT';
          continue;
        }
        if (rightHeaderRegex.test(line)) {
          mSectionState = 'RIGHT';
          continue;
        }

        const aMatch = line.match(answerHeaderRegex);
        if (aMatch) {
          hasAnswer = true;
          mSectionState = 'ANSWER';
          const inlineAns = aMatch[1].trim();
          if (inlineAns) {
            const matches = [...inlineAns.matchAll(pairMatchRegex)];
            for (const m of matches) {
              answerPairs.push({ left: m[1].toUpperCase(), right: m[2] });
            }
          }
          continue;
        }

        if (mSectionState === 'TEXT') {
          textParts.push(line);
        } else if (mSectionState === 'LEFT') {
          const lm = line.match(leftItemRegex);
          if (lm) {
            leftItems.push({ label: lm[1].toUpperCase(), text: lm[2].trim() });
          } else {
            qErrors.push(`Question ${qNum} has unexpected line in LEFT section: "${line}".`);
          }
        } else if (mSectionState === 'RIGHT') {
          const rm = line.match(rightItemRegex);
          if (rm) {
            rightItems.push({ label: rm[1], text: rm[2].trim() });
          } else {
            qErrors.push(`Question ${qNum} has unexpected line in RIGHT section: "${line}".`);
          }
        } else if (mSectionState === 'ANSWER') {
          const matches = [...line.matchAll(pairMatchRegex)];
          if (matches.length > 0) {
            for (const m of matches) {
              answerPairs.push({ left: m[1].toUpperCase(), right: m[2] });
            }
          } else {
            qErrors.push(`Question ${qNum} contains invalid match pair: "${line}". Expected format like "A-1".`);
          }
        }
      }

      const qText = textParts.join(' ').trim();
      if (!qText) qErrors.push(`Missing question text for Question ${qNum}.`);
      if (leftItems.length < 2) qErrors.push(`Question ${qNum} requires at least 2 LEFT items.`);
      if (rightItems.length < 2) qErrors.push(`Question ${qNum} requires at least 2 RIGHT items.`);
      if (!hasAnswer) qErrors.push(`Question ${qNum} is missing an ANSWER: section.`);
      else if (answerPairs.length === 0) qErrors.push(`Question ${qNum} has an empty ANSWER: section.`);

      // Validate pair mappings
      const leftSet = new Set(leftItems.map((i) => i.label));
      const rightSet = new Set(rightItems.map((i) => i.label));
      const pairedLefts = new Set<string>();

      for (const pair of answerPairs) {
        if (!leftSet.has(pair.left)) {
          qErrors.push(`Question ${qNum} answer references nonexistent LEFT item "${pair.left}".`);
        }
        if (!rightSet.has(pair.right)) {
          qErrors.push(`Question ${qNum} answer references nonexistent RIGHT item "${pair.right}".`);
        }
        pairedLefts.add(pair.left);
      }

      for (const lItem of leftItems) {
        if (!pairedLefts.has(lItem.label)) {
          qErrors.push(`Question ${qNum} LEFT item "${lItem.label}" is missing a match pair in ANSWER.`);
        }
      }

      let status: 'READY' | 'WARNING' | 'ERROR' = qErrors.length > 0 ? 'ERROR' : 'READY';

      const pairLookup = new Map<string, string>();
      answerPairs.forEach((p) => pairLookup.set(p.left, p.right));
      const rightLookup = new Map<string, string>();
      rightItems.forEach((r) => rightLookup.set(r.label, r.text));

      const matchingPairs = leftItems.map((lItem) => {
        const rightLabel = pairLookup.get(lItem.label) || '';
        const rightText = rightLookup.get(rightLabel) || '';
        return {
          leftLabel: lItem.label,
          rightLabel,
          leftText: lItem.text,
          rightText,
        };
      });

      questions.push({
        questionNumber: qNum,
        type: 'matching',
        text: qText,
        options: [],
        answer: answerPairs.map((p) => `${p.left}-${p.right}`).join(', '),
        matchingLeft: leftItems,
        matchingRight: rightItems,
        matchingPairs,
        errors: qErrors,
        warnings: qWarnings,
        status,
      });
      continue;
    }

    // Non-matching questions: scan lines for question text, options, and ANSWER line
    let inOptions = false;
    for (let li = 1; li < chunk.lines.length; li++) {
      const line = chunk.lines[li].trim();
      if (!line) continue;

      const aMatch = line.match(answerHeaderRegex);
      if (aMatch) {
        hasAnswer = true;
        rawAnswerString = aMatch[1].trim();
        continue;
      }

      const optMatch = line.match(leftItemRegex);
      if (optMatch) {
        inOptions = true;
        optionItems.push({
          label: optMatch[1].toUpperCase(),
          rawLabel: optMatch[1],
          text: optMatch[2].trim(),
        });
        continue;
      }

      if (!inOptions && !hasAnswer) {
        textParts.push(line);
      } else if (hasAnswer && !rawAnswerString) {
        rawAnswerString = line;
      }
    }

    const qText = textParts.join(' ').trim();
    if (!qText) {
      qErrors.push(`Missing question text for Question ${qNum}.`);
    }

    if (!hasAnswer) {
      qErrors.push(`Question ${qNum} is missing an ANSWER: line.`);
    }

    const hasOptions = optionItems.length > 0;
    const cleanAnswer = rawAnswerString.trim();
    const upperAnswer = cleanAnswer.toUpperCase();

    if (hasOptions) {
      // -------------------------------------------------------------
      // 2. QUESTIONS WITH LETTERED OPTIONS: MC, MULTI-SELECT, OR ORDERING
      // -------------------------------------------------------------
      // Check duplicate option labels
      const seenLabels = new Set<string>();
      for (const opt of optionItems) {
        if (seenLabels.has(opt.label)) {
          qErrors.push(`Question ${qNum} contains duplicate option letter "${opt.label}".`);
        }
        seenLabels.add(opt.label);
        if (!opt.text) {
          qErrors.push(`Question ${qNum} option "${opt.label}" has empty text.`);
        }
      }

      if (optionItems.length < 2) {
        qErrors.push(`Question ${qNum} requires at least 2 options.`);
      }

      const answerTokens = cleanAnswer
        ? cleanAnswer.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
        : [];

      // Determine if question is Ordering vs Multiple Select vs Multiple Choice
      const isOrderingKeywords =
        /\b(order|arrange|sequence|chronological|steps|process|put in order)\b/i.test(qText);
      const isPermutation =
        answerTokens.length === optionItems.length &&
        optionItems.length >= 2 &&
        optionItems.every((opt) => answerTokens.includes(opt.label));

      if ((isOrderingKeywords || isPermutation) && answerTokens.length >= 2) {
        // --- ORDERING FORMAT ---
        // Every item must appear exactly once in sequence
        const seenAns = new Set<string>();
        for (const tok of answerTokens) {
          if (!seenLabels.has(tok)) {
            qErrors.push(`Question ${qNum} answer references nonexistent item "${tok}".`);
          }
          if (seenAns.has(tok)) {
            qErrors.push(`Question ${qNum} contains duplicate answer letter "${tok}".`);
          }
          seenAns.add(tok);
        }

        for (const opt of optionItems) {
          if (!seenAns.has(opt.label)) {
            qErrors.push(`Question ${qNum} answer is missing item "${opt.label}" from sequence.`);
          }
        }

        let status: 'READY' | 'WARNING' | 'ERROR' = qErrors.length > 0 ? 'ERROR' : 'READY';
        questions.push({
          questionNumber: qNum,
          type: 'ordering',
          text: qText,
          options: [],
          orderingItems: optionItems.map((o) => ({ label: o.label, text: o.text })),
          correctOrder: answerTokens,
          answer: answerTokens.join(', '),
          answers: answerTokens,
          errors: qErrors,
          warnings: qWarnings,
          status,
        });
      } else if (answerTokens.length > 1) {
        // --- MULTIPLE SELECT FORMAT ---
        for (const tok of answerTokens) {
          if (!seenLabels.has(tok)) {
            qErrors.push(`Question ${qNum} answer references nonexistent option "${tok}".`);
          }
        }

        let status: 'READY' | 'WARNING' | 'ERROR' = qErrors.length > 0 ? 'ERROR' : 'READY';
        questions.push({
          questionNumber: qNum,
          type: 'multiple_select',
          text: qText,
          options: optionItems.map((o) => ({ label: o.label, text: o.text, rawLabel: o.rawLabel })),
          answer: answerTokens.join(', '),
          answers: answerTokens,
          errors: qErrors,
          warnings: qWarnings,
          status,
        });
      } else {
        // --- MULTIPLE CHOICE FORMAT ---
        if (answerTokens.length === 1) {
          const letter = answerTokens[0];
          if (!seenLabels.has(letter)) {
            qErrors.push(`Question ${qNum} answer "${letter}" does not match any available option.`);
          }
        } else if (hasAnswer && !cleanAnswer) {
          qErrors.push(`Question ${qNum} has an empty ANSWER: line.`);
        }

        let status: 'READY' | 'WARNING' | 'ERROR' = qErrors.length > 0 ? 'ERROR' : 'READY';
        questions.push({
          questionNumber: qNum,
          type: 'multiple_choice',
          text: qText,
          options: optionItems.map((o) => ({ label: o.label, text: o.text, rawLabel: o.rawLabel })),
          answer: answerTokens[0] || cleanAnswer,
          errors: qErrors,
          warnings: qWarnings,
          status,
        });
      }
    } else {
      // -------------------------------------------------------------
      // 3. QUESTIONS WITHOUT OPTIONS: TRUE/FALSE, FILL BLANK, SHORT ANSWER
      // -------------------------------------------------------------
      if (upperAnswer === 'TRUE' || upperAnswer === 'FALSE') {
        // --- TRUE / FALSE FORMAT ---
        let status: 'READY' | 'WARNING' | 'ERROR' = qErrors.length > 0 ? 'ERROR' : 'READY';
        questions.push({
          questionNumber: qNum,
          type: 'true_false',
          text: qText,
          options: [],
          answer: upperAnswer,
          errors: qErrors,
          warnings: qWarnings,
          status,
        });
      } else if (/(?:_{2,}|\[blank(?::|\s*\d+|_\d+)?\]|\[_+\])/i.test(qText) || cleanAnswer.includes('|')) {
        // --- FILL IN THE BLANK FORMAT ---
        const answersList = cleanAnswer
          .split('|')
          .map((s) => s.trim())
          .filter(Boolean);
        if (answersList.length === 0 && hasAnswer) {
          qErrors.push(`Question ${qNum} has an empty ANSWER: line.`);
        }

        let status: 'READY' | 'WARNING' | 'ERROR' = qErrors.length > 0 ? 'ERROR' : 'READY';
        questions.push({
          questionNumber: qNum,
          type: 'fill_blank',
          text: qText,
          options: [],
          answer: cleanAnswer,
          answers: answersList,
          errors: qErrors,
          warnings: qWarnings,
          status,
        });
      } else {
        // --- SHORT ANSWER FORMAT ---
        if (!cleanAnswer && hasAnswer) {
          qErrors.push(`Question ${qNum} has an empty ANSWER: line.`);
        }

        let status: 'READY' | 'WARNING' | 'ERROR' = qErrors.length > 0 ? 'ERROR' : 'READY';
        questions.push({
          questionNumber: qNum,
          type: 'short_answer',
          text: qText,
          options: [],
          answer: cleanAnswer,
          answers: cleanAnswer ? [cleanAnswer] : [],
          errors: qErrors,
          warnings: qWarnings,
          status,
        });
      }
    }
  }

  const questionErrorsCount = questions.reduce((sum, q) => sum + q.errors.length, 0);
  const totalErrors = globalErrors.length + questionErrorsCount;
  const totalWarnings =
    globalWarnings.length + questions.reduce((sum, q) => sum + q.warnings.length, 0);

  return {
    questions,
    globalErrors,
    globalWarnings,
    totalDetected: questions.length,
    readyCount: questions.filter((q) => q.status === 'READY').length,
    warningCount: questions.filter((q) => q.status === 'WARNING').length,
    errorCount: questions.filter((q) => q.status === 'ERROR').length,
    hasErrors: totalErrors > 0,
    hasWarnings: totalWarnings > 0,
    answerKeyMap: {},
    selectedType: 'reading_passage',
    readingPassage: {
      title: detectedTitle,
      passage: passageText,
    },
  };
}
