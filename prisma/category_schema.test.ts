import { readFileSync } from "node:fs";
import { join } from "node:path";

function readPrismaSchema(): string {
  return readFileSync(join(process.cwd(), "prisma", "schema.prisma"), "utf-8");
}

describe("prisma Category schema", () => {
  it("declares Category model with unique slug and self relation", () => {
    const schema = readPrismaSchema();

    expect(schema).toContain("model Category {");
    expect(schema).toContain("slug           String");
    expect(schema).toContain("@unique");
    expect(schema).toContain("parent         Category?");
    expect(schema).toContain("children       Category[]");
  });

  it("declares required catalog indexes for admin category listing", () => {
    const schema = readPrismaSchema();

    expect(schema).toContain("@@index([parentId, sortOrder])");
    expect(schema).toContain("@@index([deletedAt, isActive])");
    expect(schema).toContain("@@index([name])");
  });
});
