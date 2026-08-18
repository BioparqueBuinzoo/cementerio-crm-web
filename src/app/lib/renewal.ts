export const SURCHARGE_RATE = 0.06;

export function surchargeAmount(base: number): number {
  return Math.round((base ?? 0) * SURCHARGE_RATE);
}

export function nextAmount(base: number): number {
  const b = base ?? 0;
  return b + surchargeAmount(b);
}

/** Redondeo legal chileno para pagos en efectivo: se aplica al total final. */
export function roundCashTotalChile(total: number): number {
  const pesos = Math.round(total ?? 0);
  const ultimoDigito = pesos % 10;
  if (ultimoDigito >= 1 && ultimoDigito <= 4) return pesos - ultimoDigito;
  if (ultimoDigito >= 6 && ultimoDigito <= 9) return pesos + (10 - ultimoDigito);
  return pesos;
}
