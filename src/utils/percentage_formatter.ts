export function percentageFormatter(value: number | bigint): string {
  const formatted = new Intl.NumberFormat("es-ES", {
    style: "percent",
    maximumFractionDigits: 2,
  }).format(Number(value) / 100);

  return formatted;
}
