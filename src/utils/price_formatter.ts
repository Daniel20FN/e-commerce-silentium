export function priceFormatter(value: number | bigint | null): string {
  if (!value) return "";

  const formatted = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(value);

  return formatted;
}
