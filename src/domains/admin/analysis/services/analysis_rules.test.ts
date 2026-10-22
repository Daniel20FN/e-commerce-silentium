import {
  analysisDays,
  analysisMoney,
  analysisWindow,
  businessDay,
  fillActivity,
  safeAggregate,
  sumSafe,
} from "./analysis_rules";
it("validates the bounded periods without accepting repeated or injected params", () => {
  expect(analysisDays(undefined)).toBe(30);
  for (const n of ["7", "30", "90"]) expect(analysisDays(n)).toBe(Number(n));
  for (const n of ["0", "365", "7 OR 1=1", ["7", "30"]])
    expect(() => analysisDays(n)).toThrow();
});
it("uses Colombia calendar across UTC midnight and year/month boundaries", () => {
  expect(businessDay(new Date("2026-01-01T04:59:59Z"))).toBe("2025-12-31");
  const w = analysisWindow(7, new Date("2026-01-01T05:00:00Z"));
  expect(w.fromDay).toBe("2025-12-26");
  expect(w.today).toBe("2026-01-01");
  expect(analysisWindow(90, new Date("2026-03-01T05:00:00Z")).fromDay).toBe(
    "2025-12-02",
  );
});
it("fills missing days and retains exact safe aggregates", () => {
  const w = analysisWindow(7, new Date("2026-01-01T05:00:00Z"));
  const p = fillActivity(w, [
    { day: "2025-12-27", count: BigInt(2), cents: BigInt(12345) },
  ]);
  expect(p).toHaveLength(7);
  expect(p[0].count).toBe(0);
  expect(p[1]).toMatchObject({ label: "27/12", count: 2, cents: 12345 });
  expect(p.at(-1)?.id).toBe("2026-01-01");
  expect(() =>
    safeAggregate(BigInt(Number.MAX_SAFE_INTEGER) + BigInt(1)),
  ).toThrow();
  expect(() => safeAggregate(BigInt(-1))).toThrow();
  expect(() => sumSafe([Number.MAX_SAFE_INTEGER, 1])).toThrow();
});
it("formats COP cents without losing precision near the integer limit", () => {
  expect(analysisMoney(12345)).toMatch(/123,45/);
  expect(analysisMoney(Number.MAX_SAFE_INTEGER)).toContain(
    "90.071.992.547.409,91",
  );
  expect(() => analysisMoney(1.5)).toThrow();
});
