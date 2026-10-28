import { describe, expect, it } from 'vitest';

import { describeWeatherCode } from '../../src/domain/weather-condition.js';

describe('describeWeatherCode', () => {
  it.each([
    [0, 'Despejado'],
    [2, 'Parcialmente nublado'],
    [3, 'Nublado'],
    [45, 'Niebla'],
    [53, 'Llovizna'],
    [63, 'Lluvia'],
    [73, 'Nieve'],
    [95, 'Tormenta'],
  ])('maps WMO code %i to %s', (code, condition) => {
    expect(describeWeatherCode(code)).toBe(condition);
  });

  it('falls back to a default condition for unknown codes', () => {
    expect(describeWeatherCode(999)).toBe('Condición desconocida');
  });
});
