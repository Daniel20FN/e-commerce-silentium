/** @jest-environment node */
import dictionary from "@/dictionary/es.json";
import { prisma } from "@/lib/prisma";
import { Prisma, PrismaClient } from "@prisma/client";
import { analysisWindow } from "./analysis_rules";
import { getAnalysis } from "./analysis_service";
jest.mock("server-only", () => ({}));
jest.mock("@/lib/prisma", () => ({ prisma: { $transaction: jest.fn() } }));
const c = dictionary.admin.analysis,
  w = analysisWindow(7, new Date("2026-01-01T06:00:00Z"));
it("bounds daily results, parameterizes Colombia cutoffs and selects no customer or cost fields", async () => {
  const query = jest
    .fn()
    .mockResolvedValue([
      { day: "2026-01-01", count: BigInt(2), cents: BigInt(12345) },
    ]);
  jest.mocked(prisma.$transaction).mockImplementation(async (cb) => {
    if (typeof cb !== "function") throw Error();
    return cb(Object.assign(new PrismaClient(), { $queryRaw: query }));
  });
  const r = await getAnalysis("activity", w, false, c);
  expect(r).toMatchObject({ ok: true, data: { total: 2, cents: 12345 } });
  expect(r.ok && r.data.points).toHaveLength(7);
  const sql: Prisma.Sql = query.mock.calls[0][0];
  expect(sql.text).toContain('MIN(e."createdAt")');
  expect(sql.text).toContain("o.status='confirmed'");
  expect(sql.text).not.toContain("customer");
  expect(sql.text).not.toContain("Cost");
  expect(sql.text).not.toContain("shippingCents");
  expect(sql.values).toContain("America/Bogota");
  expect(sql.values).toContain(w.fromDay);
  expect(prisma.$transaction).toHaveBeenCalledWith(
    expect.any(Function),
    expect.objectContaining({
      timeout: 15000,
      isolationLevel: "RepeatableRead",
    }),
  );
});
it("returns a failed block instead of fabricating zero on SQL errors", async () => {
  const log = jest.spyOn(console, "error").mockImplementation(() => {});
  jest
    .mocked(prisma.$transaction)
    .mockRejectedValueOnce(Error("database unavailable"));
  expect(await getAnalysis("aging", w, false, c)).toEqual({ ok: false });
  log.mockRestore();
});
it("rejects unsafe aggregate totals instead of rounding them", async () => {
  const log = jest.spyOn(console, "error").mockImplementation(() => {});
  jest.mocked(prisma.$transaction).mockImplementation(async (cb) => {
    if (typeof cb !== "function") throw Error();
    return cb(
      Object.assign(new PrismaClient(), {
        $queryRaw: jest.fn().mockResolvedValue([
          {
            day: w.today,
            count: BigInt(Number.MAX_SAFE_INTEGER) + BigInt(1),
            cents: BigInt(0),
          },
        ]),
      }),
    );
  });
  expect(await getAnalysis("activity", w, false, c)).toEqual({ ok: false });
  log.mockRestore();
});
