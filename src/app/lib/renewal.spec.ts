import { describe, expect, it } from 'vitest';
import { nextAmount, roundCashTotalChile } from './renewal';

describe('roundCashTotalChile', () => {
  it('redondea el total final a la decena según la regla chilena', () => {
    expect(roundCashTotalChile(81798)).toBe(81800);
    expect(roundCashTotalChile(81794)).toBe(81790);
    expect(roundCashTotalChile(81795)).toBe(81795);
  });
});

describe('nextAmount', () => {
  it('vectores dorados compartidos con los repos hermanos (crm-api y pay-api)', () => {
    expect(nextAmount(77168)).toBe(81798);
    expect(nextAmount(10000, 10)).toBe(9540);
  });
});
