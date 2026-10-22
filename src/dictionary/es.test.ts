import dictionary from "./es.json";

function collectText(value: object | string): string[] {
  if (typeof value === "string") return [value];
  return Object.values(value).flatMap(collectText);
}

describe("Spanish dictionary text integrity", () => {
  it("does not replace accented letters with question marks or replacement characters", () => {
    const damaged = collectText(dictionary).filter((text) =>
      /\uFFFD|\p{L}\?\p{L}/u.test(text),
    );

    expect(damaged).toEqual([]);
  });

  it("preserves accented category form and uploader copy", () => {
    expect(dictionary.admin.categories.form.image).toBe("Imagen de categoría");
    expect(dictionary.admin.categories.form.imageUploader.size).toBe("Tamaño");
    expect(dictionary.admin.categories.formHelp.parent).toContain("vacío");
  });
});
