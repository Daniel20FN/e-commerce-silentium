import { publicationReport, savedProduct } from "../__fixtures__/publication";
import { publicationIssues, publicationPayload } from "./publication_rules";

const input = {
  ...publicationReport,
  hasImages: true,
  hasSeo: true,
  hasCosts: true,
};
it("distinguishes visibility conditions from stock and optional recommendations", () => {
  const issues = publicationIssues({
    ...input,
    status: "active",
    visible: true,
    purchasable: false,
    variants: input.variants.map((v) => ({ ...v, stock: 0 })),
    hasImages: false,
    hasCosts: false,
    hasSeo: false,
  });
  expect(issues).not.toEqual(
    expect.arrayContaining([expect.objectContaining({ level: "blocker" })]),
  );
  expect(issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ code: "no_stock", level: "warning" }),
      expect.objectContaining({
        code: "missing_costs",
        level: "recommendation",
      }),
      expect.objectContaining({
        code: "missing_images",
        level: "recommendation",
      }),
      expect.objectContaining({ code: "missing_seo", level: "recommendation" }),
    ]),
  );
});
it("only blocks categories when none are in the visible ancestor forest", () => {
  const hidden = {
    ...input.categories[0],
    id: "hidden",
    visible: false,
    active: false,
  };
  expect(
    publicationIssues({ ...input, categories: [...input.categories, hidden] }),
  ).toContainEqual({
    code: "hidden_categories",
    level: "warning",
    section: "information",
  });
  expect(publicationIssues({ ...input, categories: [hidden] })).toContainEqual({
    code: "no_visible_categories",
    level: "blocker",
    section: "information",
  });
});
it("marks archived/trash and no active variants and explains an unavailable default", () => {
  expect(
    publicationIssues({
      ...input,
      readOnly: true,
      variants: input.variants.map((v) => ({ ...v, inTrash: true })),
    }),
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ code: "read_only", level: "blocker" }),
      expect.objectContaining({ code: "no_active_variants", level: "blocker" }),
      expect.objectContaining({
        code: "default_unavailable",
        level: "warning",
      }),
    ]),
  );
});
it("activates only the saved revision through the existing product contract without changing options", () => {
  expect(publicationPayload(savedProduct)).toMatchObject({
    expectedUpdatedAt: savedProduct.updatedAt,
    status: "active",
    name: savedProduct.name,
    categoryIds: ["cat"],
    primaryCategoryId: "cat",
  });
  expect(publicationPayload(savedProduct)).not.toHaveProperty("options");
});
