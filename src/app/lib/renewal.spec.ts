import { describe, expect, it } from 'vitest';
import { roundCashTotalChile } from './renewal';

describe('roundCashTotalChile', () => {
  it('redondea el total final a la decena según la regla chilena', () => {
    expect(roundCashTotalChile(81798)).toBe(81800);
    expect(roundCashTotalChile(81794)).toBe(81790);
    expect(roundCashTotalChile(81795)).toBe(81795);
  });
});
