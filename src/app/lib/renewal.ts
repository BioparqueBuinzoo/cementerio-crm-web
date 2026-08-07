export const SURCHARGE_RATE = 0.06;

export function surchargeAmount(base: number): number {
  return Math.round((base ?? 0) * SURCHARGE_RATE);
}

export function nextAmount(base: number): number {
  const b = base ?? 0;
  return b + surchargeAmount(b);
}
