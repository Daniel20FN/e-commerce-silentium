export function priceFormatter(value: number | bigint | null): string {
  if (value === null) return "";

  const formatted = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);

  return formatted;
}
