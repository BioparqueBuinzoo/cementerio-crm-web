export const SURCHARGE_RATE = 0.06;

export function surchargeAmount(base: number): number {
  return Math.round((base ?? 0) * SURCHARGE_RATE);
}

/** Monto final de renovación: primero el recargo fijo del 6%, y si el contrato
 *  tiene un descuento especial asignado, este se aplica sobre ese resultado
 *  (no reemplaza el recargo, se aplica encima). */
export function nextAmount(base: number, descuentoPorcentaje?: number | null): number {
  const b = base ?? 0;
  const conRecargo = b + surchargeAmount(b);
  if (descuentoPorcentaje != null) {
    return Math.round(conRecargo * (1 - descuentoPorcentaje / 100));
  }
  return conRecargo;
}

/** Diferencia entre el monto final y el monto base: positiva si es recargo, negativa si es descuento. */
export function adjustmentAmount(base: number, descuentoPorcentaje?: number | null): number {
  return nextAmount(base, descuentoPorcentaje) - (base ?? 0);
}

/** Redondeo legal chileno para pagos en efectivo: se aplica al total final. */
export function roundCashTotalChile(total: number): number {
  const pesos = Math.round(total ?? 0);
  const ultimoDigito = pesos % 10;
  if (ultimoDigito >= 1 && ultimoDigito <= 4) return pesos - ultimoDigito;
  if (ultimoDigito >= 6 && ultimoDigito <= 9) return pesos + (10 - ultimoDigito);
  return pesos;
}
