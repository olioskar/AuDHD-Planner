/**
 * Validation utilities tests
 */

import { describe, it, expect } from 'vitest';
import {
  ValidationError,
  validateNonEmptyString,
  validateStringLength,
  validateNonEmptyTrimmedString,
  validateBoolean,
  validateNumber,
  validatePositiveNumber,
  validateNumberRange,
  validateArray,
  validateArrayLength,
  validatePattern,
  validateEnum,
  validateTimestamp,
  collectErrors,
  createValidationResult,
  throwIfErrors,
  sanitizeString,
  truncateString,
  validateId,
} from '@/utils/validation';

describe('Validation Utilities', () => {
  describe('ValidationError', () => {
    it('should create error with message and errors array', () => {
      const errors = ['Error 1', 'Error 2'];
      const error = new ValidationError('Validation failed', errors);

      expect(error.message).toBe('Validation failed');
      expect(error.errors).toEqual(errors);
      expect(error.name).toBe('ValidationError');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('validateNonEmptyString()', () => {
    it('should return null for non-empty string', () => {
      expect(validateNonEmptyString('hello', 'field')).toBeNull();
    });

    it('should return error for non-string', () => {
      expect(validateNonEmptyString(123, 'field')).toBe('field must be a string');
    });

    it('should return error for empty string', () => {
      expect(validateNonEmptyString('', 'field')).toBe('field cannot be empty');
    });
  });

  describe('validateStringLength()', () => {
    it('should return null for string within range', () => {
      expect(validateStringLength('hello', 'field', 1, 10)).toBeNull();
    });

    it('should return error for string too short', () => {
      expect(validateStringLength('hi', 'field', 5, 10)).toBe(
        'field must be at least 5 characters'
      );
    });

    it('should return error for string too long', () => {
      expect(validateStringLength('hello world', 'field', 1, 5)).toBe(
        'field must be less than 5 characters'
      );
    });

    it('should return error for non-string', () => {
      expect(validateStringLength(123, 'field', 1, 10)).toBe('field must be a string');
    });

    it('should handle singular character message', () => {
      expect(validateStringLength('', 'field', 1, 10)).toBe(
        'field must be at least 1 character'
      );
    });
  });

  describe('validateNonEmptyTrimmedString()', () => {
    it('should return null for non-empty trimmed string', () => {
      expect(validateNonEmptyTrimmedString('  hello  ', 'field')).toBeNull();
    });

    it('should return error for whitespace-only string', () => {
      expect(validateNonEmptyTrimmedString('   ', 'field')).toBe(
        'field cannot be empty or whitespace-only'
      );
    });

    it('should return error for empty string', () => {
      expect(validateNonEmptyTrimmedString('', 'field')).toBe(
        'field cannot be empty or whitespace-only'
      );
    });
  });

  describe('validateBoolean()', () => {
    it('should return null for boolean', () => {
      expect(validateBoolean(true, 'field')).toBeNull();
      expect(validateBoolean(false, 'field')).toBeNull();
    });

    it('should return error for non-boolean', () => {
      expect(validateBoolean('true', 'field')).toBe('field must be a boolean');
      expect(validateBoolean(1, 'field')).toBe('field must be a boolean');
    });
  });

  describe('validateNumber()', () => {
    it('should return null for valid number', () => {
      expect(validateNumber(42, 'field')).toBeNull();
      expect(validateNumber(0, 'field')).toBeNull();
      expect(validateNumber(-5, 'field')).toBeNull();
    });

    it('should return error for non-number', () => {
      expect(validateNumber('42', 'field')).toBe('field must be a number');
    });

    it('should return error for NaN', () => {
      expect(validateNumber(NaN, 'field')).toBe('field cannot be NaN');
    });
  });

  describe('validatePositiveNumber()', () => {
    it('should return null for positive number', () => {
      expect(validatePositiveNumber(42, 'field')).toBeNull();
      expect(validatePositiveNumber(0, 'field')).toBeNull();
    });

    it('should return error for negative number', () => {
      expect(validatePositiveNumber(-5, 'field')).toBe(
        'field must be a positive number'
      );
    });

    it('should return error for non-number', () => {
      expect(validatePositiveNumber('42', 'field')).toBe('field must be a number');
    });
  });

  describe('validateNumberRange()', () => {
    it('should return null for number in range', () => {
      expect(validateNumberRange(5, 'field', 0, 10)).toBeNull();
      expect(validateNumberRange(0, 'field', 0, 10)).toBeNull();
      expect(validateNumberRange(10, 'field', 0, 10)).toBeNull();
    });

    it('should return error for number below range', () => {
      expect(validateNumberRange(-5, 'field', 0, 10)).toBe('field must be at least 0');
    });

    it('should return error for number above range', () => {
      expect(validateNumberRange(15, 'field', 0, 10)).toBe('field must be at most 10');
    });
  });

  describe('validateArray()', () => {
    it('should return null for array', () => {
      expect(validateArray([], 'field')).toBeNull();
      expect(validateArray([1, 2, 3], 'field')).toBeNull();
    });

    it('should return error for non-array', () => {
      expect(validateArray('array', 'field')).toBe('field must be an array');
      expect(validateArray({}, 'field')).toBe('field must be an array');
    });
  });

  describe('validateArrayLength()', () => {
    it('should return null for array within range', () => {
      expect(validateArrayLength([1, 2, 3], 'field', 1, 5)).toBeNull();
    });

    it('should return error for array too short', () => {
      expect(validateArrayLength([1], 'field', 2, 5)).toBe(
        'field must have at least 2 elements'
      );
    });

    it('should return error for array too long', () => {
      expect(validateArrayLength([1, 2, 3, 4, 5, 6], 'field', 1, 5)).toBe(
        'field must have at most 5 elements'
      );
    });

    it('should handle singular element message', () => {
      expect(validateArrayLength([], 'field', 1, 5)).toBe(
        'field must have at least 1 element'
      );
    });

    it('should handle optional min/max', () => {
      expect(validateArrayLength([1, 2], 'field')).toBeNull();
      expect(validateArrayLength([1, 2], 'field', 1)).toBeNull();
      expect(validateArrayLength([1, 2], 'field', undefined, 5)).toBeNull();
    });
  });

  describe('validatePattern()', () => {
    it('should return null for matching pattern', () => {
      expect(validatePattern('test@example.com', 'email', /@/, 'email format')).toBeNull();
    });

    it('should return error for non-matching pattern', () => {
      expect(validatePattern('invalid', 'email', /@/, 'email format')).toBe(
        'email must match email format'
      );
    });

    it('should return error for non-string', () => {
      expect(validatePattern(123, 'field', /\d+/, 'pattern')).toBe(
        'field must be a string'
      );
    });
  });

  describe('validateEnum()', () => {
    it('should return null for allowed value', () => {
      expect(validateEnum('red', 'color', ['red', 'green', 'blue'])).toBeNull();
    });

    it('should return error for disallowed value', () => {
      const error = validateEnum('yellow', 'color', ['red', 'green', 'blue']);
      expect(error).toBe('color must be one of: "red", "green", "blue"');
    });

    it('should work with numbers', () => {
      expect(validateEnum(2, 'value', [1, 2, 3])).toBeNull();
      expect(validateEnum(4, 'value', [1, 2, 3])).toBe(
        'value must be one of: "1", "2", "3"'
      );
    });
  });

  describe('validateTimestamp()', () => {
    it('should return null for valid timestamp', () => {
      expect(validateTimestamp(Date.now(), 'timestamp')).toBeNull();
    });

    it('should return error for negative timestamp', () => {
      expect(validateTimestamp(-1, 'timestamp')).toBe(
        'timestamp must be a positive number'
      );
    });

    it('should return null for timestamp after reference', () => {
      expect(validateTimestamp(2000, 'updatedAt', 1000, 'createdAt')).toBeNull();
    });

    it('should return error for timestamp before reference', () => {
      const error = validateTimestamp(1000, 'updatedAt', 2000, 'createdAt');
      expect(error).toBe('updatedAt cannot be before createdAt');
    });

    it('should handle missing afterFieldName', () => {
      const error = validateTimestamp(1000, 'timestamp', 2000);
      expect(error).toBe('timestamp cannot be before the reference timestamp');
    });
  });

  describe('collectErrors()', () => {
    it('should collect non-null errors', () => {
      const errors = collectErrors('Error 1', null, 'Error 2', null, 'Error 3');
      expect(errors).toEqual(['Error 1', 'Error 2', 'Error 3']);
    });

    it('should return empty array for all null', () => {
      const errors = collectErrors(null, null, null);
      expect(errors).toEqual([]);
    });
  });

  describe('createValidationResult()', () => {
    it('should create valid result for no errors', () => {
      const result = createValidationResult([]);
      expect(result).toEqual({ valid: true, errors: [] });
    });

    it('should create invalid result for errors', () => {
      const result = createValidationResult(['Error 1', 'Error 2']);
      expect(result).toEqual({
        valid: false,
        errors: ['Error 1', 'Error 2'],
      });
    });
  });

  describe('throwIfErrors()', () => {
    it('should not throw for empty errors', () => {
      expect(() => throwIfErrors([], 'Entity')).not.toThrow();
    });

    it('should throw ValidationError for errors', () => {
      const errors = ['Error 1', 'Error 2'];
      expect(() => throwIfErrors(errors, 'Entity')).toThrow(ValidationError);
      expect(() => throwIfErrors(errors, 'Entity')).toThrow(
        'Entity validation failed: Error 1, Error 2'
      );
    });
  });

  describe('sanitizeString()', () => {
    it('should remove script tags', () => {
      const input = 'Hello <script>alert("xss")</script> World';
      expect(sanitizeString(input)).toBe('Hello  World');
    });

    it('should remove iframe tags', () => {
      const input = 'Hello <iframe src="evil.com"></iframe> World';
      expect(sanitizeString(input)).toBe('Hello  World');
    });

    it('should trim whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });

    it('should leave safe content unchanged', () => {
      expect(sanitizeString('Hello World')).toBe('Hello World');
    });
  });

  describe('truncateString()', () => {
    it('should not truncate short strings', () => {
      expect(truncateString('Hello', 10)).toBe('Hello');
    });

    it('should truncate long strings', () => {
      expect(truncateString('Hello World', 8)).toBe('Hello...');
    });

    it('should use custom ellipsis', () => {
      expect(truncateString('Hello World', 8, '…')).toBe('Hello W…');
    });

    it('should handle exact length', () => {
      expect(truncateString('Hello', 5)).toBe('Hello');
    });
  });

  describe('validateId()', () => {
    it('should return null for valid ID', () => {
      expect(validateId('item-123-abc', 'id')).toBeNull();
    });

    it('should return error for empty ID', () => {
      expect(validateId('', 'id')).toBe('id cannot be empty');
    });

    it('should return null for ID with correct prefix', () => {
      expect(validateId('item-123', 'id', 'item-')).toBeNull();
    });

    it('should return error for ID with wrong prefix', () => {
      expect(validateId('section-123', 'id', 'item-')).toBe(
        'id must start with "item-"'
      );
    });
  });
});
