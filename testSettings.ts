/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TestSettings, DEFAULT_TEST_SETTINGS, ValidationError } from '../types/test';

/**
 * Normalizes a settings object, guaranteeing all fields are defined
 * with correct types and sensible defaults for backwards compatibility.
 */
export function normalizeTestSettings(
  rawSettings?: Partial<TestSettings> | null
): TestSettings {
  if (!rawSettings || typeof rawSettings !== 'object') {
    return { ...DEFAULT_TEST_SETTINGS };
  }

  const rawObj = rawSettings as any;

  // Handle timeLimitMinutes / durationMinutes: must be number or null
  let timeLimitMinutes: number | null = DEFAULT_TEST_SETTINGS.timeLimitMinutes;
  const rawDuration = rawObj.timeLimitMinutes !== undefined ? rawObj.timeLimitMinutes : rawObj.durationMinutes;
  if (rawDuration !== undefined && rawDuration !== null) {
    const num = Number(rawDuration);
    timeLimitMinutes = isNaN(num) ? null : num;
  }

  // Handle timeLimitEnabled / timerEnabled
  const timeLimitEnabled = Boolean(
    rawObj.timeLimitEnabled ?? rawObj.timerEnabled ?? DEFAULT_TEST_SETTINGS.timeLimitEnabled
  );

  // Handle attemptsAllowed: must be number
  let attemptsAllowed = DEFAULT_TEST_SETTINGS.attemptsAllowed;
  if (rawSettings.attemptsAllowed !== undefined && rawSettings.attemptsAllowed !== null) {
    const attemptsNum = Number(rawSettings.attemptsAllowed);
    attemptsAllowed = isNaN(attemptsNum) ? DEFAULT_TEST_SETTINGS.attemptsAllowed : attemptsNum;
  }

  return {
    timeLimitEnabled,
    timeLimitMinutes,
    attemptsAllowed,
    shuffleQuestions: Boolean(rawSettings.shuffleQuestions ?? DEFAULT_TEST_SETTINGS.shuffleQuestions),
    shuffleAnswers: Boolean(rawSettings.shuffleAnswers ?? DEFAULT_TEST_SETTINGS.shuffleAnswers),
    showResultsAfterSubmission: Boolean(
      rawSettings.showResultsAfterSubmission ?? DEFAULT_TEST_SETTINGS.showResultsAfterSubmission
    ),
    showCorrectAnswersAfterSubmission: Boolean(
      rawSettings.showCorrectAnswersAfterSubmission ??
        DEFAULT_TEST_SETTINGS.showCorrectAnswersAfterSubmission
    ),
    requireAllQuestions: Boolean(
      rawSettings.requireAllQuestions ?? DEFAULT_TEST_SETTINGS.requireAllQuestions
    ),
  };
}

/**
 * Validates test settings at the data/model level according to Module 3 specifications.
 */
export function validateTestSettings(settings?: TestSettings | null): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!settings) {
    // If settings object is missing, that's invalid in strict validation
    errors.push({
      field: 'settings',
      message: 'Test settings configuration is missing.',
    });
    return errors;
  }

  // 1. Time Limit Validation
  if (settings.timeLimitEnabled) {
    if (settings.timeLimitMinutes === null || settings.timeLimitMinutes === undefined) {
      errors.push({
        field: 'settings_time_limit',
        message: 'Time limit is enabled. Please enter a duration in minutes.',
      });
    } else if (
      typeof settings.timeLimitMinutes !== 'number' ||
      isNaN(settings.timeLimitMinutes)
    ) {
      errors.push({
        field: 'settings_time_limit',
        message: 'Time limit must be a valid number of minutes.',
      });
    } else if (settings.timeLimitMinutes <= 0) {
      errors.push({
        field: 'settings_time_limit',
        message: 'Time limit must be greater than zero minutes.',
      });
    } else if (!Number.isInteger(settings.timeLimitMinutes)) {
      errors.push({
        field: 'settings_time_limit',
        message: 'Time limit must be a whole number of minutes (no decimals).',
      });
    }
  }

  // 2. Attempts Allowed Validation
  if (settings.attemptsAllowed === null || settings.attemptsAllowed === undefined) {
    errors.push({
      field: 'settings_attempts',
      message: 'Attempts allowed is required.',
    });
  } else if (
    typeof settings.attemptsAllowed !== 'number' ||
    isNaN(settings.attemptsAllowed)
  ) {
    errors.push({
      field: 'settings_attempts',
      message: 'Attempts allowed must be a valid number.',
    });
  } else if (settings.attemptsAllowed < 1) {
    errors.push({
      field: 'settings_attempts',
      message: 'Attempts allowed must be at least 1.',
    });
  } else if (!Number.isInteger(settings.attemptsAllowed)) {
    errors.push({
      field: 'settings_attempts',
      message: 'Attempts allowed must be a whole number (no decimals).',
    });
  }

  // 3. Boolean Integrity Check (Ensure no string boolean values leaked in)
  const booleanKeys: (keyof TestSettings)[] = [
    'timeLimitEnabled',
    'shuffleQuestions',
    'shuffleAnswers',
    'showResultsAfterSubmission',
    'showCorrectAnswersAfterSubmission',
    'requireAllQuestions',
  ];

  for (const key of booleanKeys) {
    if (typeof settings[key] !== 'boolean') {
      errors.push({
        field: 'settings',
        message: `Setting "${key}" must be a boolean value.`,
      });
    }
  }

  return errors;
}
