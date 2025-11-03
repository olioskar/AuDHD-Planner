/**
 * Validation utility functions
 * Shared validation logic used across models
 */

import type { ValidationResult } from '@/types/models';

/**
 * Validation error class for better error handling
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: string[]
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate that a value is a non-empty string
 *
 * @param value - Value to validate
 * @param fieldName - Name of the field being validated
 * @returns Validation error message, or null if valid
 */
export function validateNonEmptyString(value: unknown, fieldName: string): string | null {
  if (typeof value !== 'string') {
    return `${fieldName} must be a string`;
  }
  if (value.length === 0) {
    return `${fieldName} cannot be empty`;
  }
  return null;
}

/**
 * Validate that a value is a string within length constraints
 *
 * @param value - Value to validate
 * @param fieldName - Name of the field being validated
 * @param minLength - Minimum length (inclusive)
 * @param maxLength - Maximum length (inclusive)
 * @returns Validation error message, or null if valid
 */
export function validateStringLength(
  value: unknown,
  fieldName: string,
  minLength: number,
  maxLength: number
): string | null {
  if (typeof value !== 'string') {
    return `${fieldName} must be a string`;
  }

  if (value.length < minLength) {
    return `${fieldName} must be at least ${minLength} character${minLength !== 1 ? 's' : ''}`;
  }

  if (value.length > maxLength) {
    return `${fieldName} must be less than ${maxLength} character${maxLength !== 1 ? 's' : ''}`;
  }

  return null;
}

/**
 * Validate that a trimmed string is not empty
 *
 * @param value - Value to validate
 * @param fieldName - Name of the field being validated
 * @returns Validation error message, or null if valid
 */
export function validateNonEmptyTrimmedString(
  value: unknown,
  fieldName: string
): string | null {
  if (typeof value !== 'string') {
    return `${fieldName} must be a string`;
  }

  if (value.trim().length === 0) {
    return `${fieldName} cannot be empty or whitespace-only`;
  }

  return null;
}

/**
 * Validate that a value is a boolean
 *
 * @param value - Value to validate
 * @param fieldName - Name of the field being validated
 * @returns Validation error message, or null if valid
 */
export function validateBoolean(value: unknown, fieldName: string): string | null {
  if (typeof value !== 'boolean') {
    return `${fieldName} must be a boolean`;
  }
  return null;
}

/**
 * Validate that a value is a number
 *
 * @param value - Value to validate
 * @param fieldName - Name of the field being validated
 * @returns Validation error message, or null if valid
 */
export function validateNumber(value: unknown, fieldName: string): string | null {
  if (typeof value !== 'number') {
    return `${fieldName} must be a number`;
  }
  if (isNaN(value)) {
    return `${fieldName} cannot be NaN`;
  }
  return null;
}

/**
 * Validate that a value is a positive number (>= 0)
 *
 * @param value - Value to validate
 * @param fieldName - Name of the field being validated
 * @returns Validation error message, or null if valid
 */
export function validatePositiveNumber(value: unknown, fieldName: string): string | null {
  const numberError = validateNumber(value, fieldName);
  if (numberError) return numberError;

  if ((value as number) < 0) {
    return `${fieldName} must be a positive number`;
  }

  return null;
}

/**
 * Validate that a value is within a numeric range
 *
 * @param value - Value to validate
 * @param fieldName - Name of the field being validated
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns Validation error message, or null if valid
 */
export function validateNumberRange(
  value: unknown,
  fieldName: string,
  min: number,
  max: number
): string | null {
  const numberError = validateNumber(value, fieldName);
  if (numberError) return numberError;

  const num = value as number;

  if (num < min) {
    return `${fieldName} must be at least ${min}`;
  }

  if (num > max) {
    return `${fieldName} must be at most ${max}`;
  }

  return null;
}

/**
 * Validate that a value is an array
 *
 * @param value - Value to validate
 * @param fieldName - Name of the field being validated
 * @returns Validation error message, or null if valid
 */
export function validateArray(value: unknown, fieldName: string): string | null {
  if (!Array.isArray(value)) {
    return `${fieldName} must be an array`;
  }
  return null;
}

/**
 * Validate that an array's length is within constraints
 *
 * @param value - Value to validate
 * @param fieldName - Name of the field being validated
 * @param minLength - Minimum length (inclusive, optional)
 * @param maxLength - Maximum length (inclusive, optional)
 * @returns Validation error message, or null if valid
 */
export function validateArrayLength(
  value: unknown,
  fieldName: string,
  minLength?: number,
  maxLength?: number
): string | null {
  const arrayError = validateArray(value, fieldName);
  if (arrayError) return arrayError;

  const arr = value as unknown[];

  if (minLength !== undefined && arr.length < minLength) {
    return `${fieldName} must have at least ${minLength} element${minLength !== 1 ? 's' : ''}`;
  }

  if (maxLength !== undefined && arr.length > maxLength) {
    return `${fieldName} must have at most ${maxLength} element${maxLength !== 1 ? 's' : ''}`;
  }

  return null;
}

/**
 * Validate that a value matches a regular expression
 *
 * @param value - Value to validate
 * @param fieldName - Name of the field being validated
 * @param pattern - Regular expression pattern
 * @param patternDescription - Human-readable description of the pattern
 * @returns Validation error message, or null if valid
 */
export function validatePattern(
  value: unknown,
  fieldName: string,
  pattern: RegExp,
  patternDescription: string
): string | null {
  if (typeof value !== 'string') {
    return `${fieldName} must be a string`;
  }

  if (!pattern.test(value)) {
    return `${fieldName} must match ${patternDescription}`;
  }

  return null;
}

/**
 * Validate that a value is one of allowed values
 *
 * @param value - Value to validate
 * @param fieldName - Name of the field being validated
 * @param allowedValues - Array of allowed values
 * @returns Validation error message, or null if valid
 */
export function validateEnum<T>(
  value: unknown,
  fieldName: string,
  allowedValues: readonly T[]
): string | null {
  if (!allowedValues.includes(value as T)) {
    const valuesList = allowedValues.map((v) => `"${v}"`).join(', ');
    return `${fieldName} must be one of: ${valuesList}`;
  }
  return null;
}

/**
 * Validate that a timestamp is valid (after another timestamp)
 *
 * @param timestamp - Timestamp to validate
 * @param fieldName - Name of the field being validated
 * @param afterTimestamp - Timestamp that this must be after or equal to
 * @param afterFieldName - Name of the field to compare against
 * @returns Validation error message, or null if valid
 */
export function validateTimestamp(
  timestamp: unknown,
  fieldName: string,
  afterTimestamp?: number,
  afterFieldName?: string
): string | null {
  const positiveError = validatePositiveNumber(timestamp, fieldName);
  if (positiveError) return positiveError;

  const ts = timestamp as number;

  if (afterTimestamp !== undefined && ts < afterTimestamp) {
    const afterName = afterFieldName ?? 'the reference timestamp';
    return `${fieldName} cannot be before ${afterName}`;
  }

  return null;
}

/**
 * Collect validation errors from multiple validators
 *
 * @param validators - Array of validator functions that return error messages or null
 * @returns Array of error messages (empty if all valid)
 */
export function collectErrors(...validators: Array<string | null>): string[] {
  return validators.filter((error): error is string => error !== null);
}

/**
 * Create a validation result from errors
 *
 * @param errors - Array of error messages
 * @returns ValidationResult object
 */
export function createValidationResult(errors: string[]): ValidationResult {
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Throw a ValidationError if there are any errors
 *
 * @param errors - Array of error messages
 * @param entityName - Name of the entity being validated
 * @throws {ValidationError} If there are validation errors
 */
export function throwIfErrors(errors: string[], entityName: string): void {
  if (errors.length > 0) {
    throw new ValidationError(
      `${entityName} validation failed: ${errors.join(', ')}`,
      errors
    );
  }
}

/**
 * Sanitize a string for safe display (remove potentially dangerous content)
 *
 * @param value - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(value: string): string {
  // Basic sanitization - remove any potential script tags
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .trim();
}

/**
 * Truncate a string to a maximum length
 *
 * @param value - String to truncate
 * @param maxLength - Maximum length
 * @param ellipsis - String to append if truncated (default: '...')
 * @returns Truncated string
 */
export function truncateString(
  value: string,
  maxLength: number,
  ellipsis = '...'
): string {
  if (value.length <= maxLength) {
    return value;
  }
  return value.substring(0, maxLength - ellipsis.length) + ellipsis;
}

/**
 * Validate an ID format (non-empty string matching expected pattern)
 *
 * @param value - Value to validate
 * @param fieldName - Name of the field being validated
 * @param prefix - Expected prefix (optional)
 * @returns Validation error message, or null if valid
 */
export function validateId(
  value: unknown,
  fieldName: string,
  prefix?: string
): string | null {
  const stringError = validateNonEmptyString(value, fieldName);
  if (stringError) return stringError;

  const id = value as string;

  if (prefix && !id.startsWith(prefix)) {
    return `${fieldName} must start with "${prefix}"`;
  }

  return null;
}
