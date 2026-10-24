import { fireEvent, render, screen } from "@testing-library/react";
import { CategoryEditorialImage } from "./category_editorial_image";

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({
    src,
    alt,
    onError,
    unoptimized,
    sizes,
  }: {
    src: string;
    alt: string;
    onError?: () => void;
    unoptimized?: boolean;
    sizes?: string;
  }) =>
    jest.requireActual<typeof import("react")>("react").createElement("img", {
      src,
      alt,
      onError,
      sizes,
      "data-optimized": unoptimized !== true,
    }),
}));

it("uses the real category image when available and clearly labels illustrative recovery", () => {
  render(
    <CategoryEditorialImage
      src="https://example.com/legacy.png"
      alt="Ropa de cama"
      fallbackAlt="Ambiente ilustrativo"
      fallbackNote="Imagen ilustrativa"
    />,
  );
  expect(screen.getByRole("img", { name: "Ropa de cama" })).toHaveAttribute(
    "src",
    "https://example.com/legacy.png",
  );
  expect(screen.queryByText("Imagen ilustrativa")).not.toBeInTheDocument();
  expect(screen.getByRole("img", { name: "Ropa de cama" })).toHaveAttribute(
    "data-optimized",
    "true",
  );
  expect(screen.getByRole("img", { name: "Ropa de cama" })).toHaveAttribute(
    "sizes",
    "(max-width: 641px) 91vw, (max-width: 975px) 44vw, 420px",
  );
  fireEvent.error(screen.getByRole("img", { name: "Ropa de cama" }));
  expect(
    screen.getByRole("img", { name: "Ambiente ilustrativo" }),
  ).toHaveAttribute("src", "/images/landing/refugio-marfil.webp");
  expect(screen.getByText("Imagen ilustrativa")).toBeInTheDocument();
});

it("labels the fallback immediately for a category without a photo", () => {
  render(
    <CategoryEditorialImage
      src={null}
      alt="Categoría"
      fallbackAlt="Ambiente ilustrativo"
      fallbackNote="Imagen ilustrativa"
    />,
  );
  expect(
    screen.getByRole("img", { name: "Ambiente ilustrativo" }),
  ).toHaveAttribute("src", "/images/landing/refugio-marfil.webp");
  expect(screen.getByText("Imagen ilustrativa")).toBeInTheDocument();
});
