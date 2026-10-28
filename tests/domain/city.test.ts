import { describe, expect, it } from 'vitest';

import { validateCity } from '../../src/domain/city.js';
import { InvalidRequestError } from '../../src/errors/app-error.js';

describe('validateCity', () => {
  it('returns the city without surrounding whitespace', () => {
    expect(validateCity('  Bogota ')).toBe('Bogota');
  });

  it.each([
    ['undefined', undefined],
    ['an empty string', ''],
    ['only whitespace', '   '],
    ['a single character', 'B'],
    ['more than 100 characters', 'a'.repeat(101)],
  ])('rejects %s', (_label, input) => {
    expect(() => validateCity(input)).toThrow(InvalidRequestError);
  });
});
