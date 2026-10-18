import dictionary from "@/dictionary/es.json";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { StorefrontProduct } from "../types/catalog";
import { ProductDetail } from "./product_detail";

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) =>
    jest
      .requireActual<typeof import("react")>("react")
      .createElement("img", { src, alt }),
}));
const general = {
  id: "general",
  url: "https://example.com/general.png",
  alt: "General bedding",
};
const own = {
  id: "own",
  url: "https://example.com/own.png",
  alt: "Own large bedding",
};
const variants = [
  {
    id: "small-red",
    sku: "SMALL-RED",
    optionValueIds: ["small", "red"],
    isDefault: true,
    stock: 3,
    priceCents: 18900000,
    compareAtPriceCents: 20000000,
    images: [],
  },
  {
    id: "large-red",
    sku: "LARGE-RED",
    optionValueIds: ["large", "red"],
    isDefault: false,
    stock: 1,
    priceCents: 21900000,
    compareAtPriceCents: null,
    images: [own],
  },
  {
    id: "large-blue",
    sku: "LARGE-BLUE",
    optionValueIds: ["large", "blue"],
    isDefault: false,
    stock: 0,
    priceCents: 22900000,
    compareAtPriceCents: 21900000,
    images: [],
  },
];
const product: StorefrontProduct = {
  id: "p",
  slug: "bedding",
  name: "Bedding QA",
  brand: null,
  shortDescription: "Soft bedding",
  longDescription: "Long description",
  seoTitle: null,
  seoDescription: null,
  categories: [],
  breadcrumbs: [],
  options: [
    {
      id: "size",
      name: "Size",
      values: [
        { id: "small", value: "Small" },
        { id: "large", value: "Large" },
      ],
    },
    {
      id: "color",
      name: "Color",
      values: [
        { id: "red", value: "Red" },
        { id: "blue", value: "Blue" },
      ],
    },
  ],
  variants,
  images: [general],
  initialVariantId: "small-red",
  image: general,
  priceCents: 18900000,
  compareAtPriceCents: null,
  hasMultiplePrices: true,
  available: true,
};
const copy = dictionary.storefront;

async function choose(label: string, value: string): Promise<void> {
  fireEvent.mouseDown(screen.getByRole("combobox", { name: label }));
  fireEvent.click(await screen.findByRole("option", { name: value }));
}

describe("public product variant selection", () => {
  it("renders the initial variant in COP with general fallback, not a purchase action", () => {
    render(<ProductDetail product={product} dictionary={dictionary} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Bedding QA",
    );
    expect(
      screen
        .getByLabelText(new RegExp(copy.currentPrice))
        .textContent?.replace(/\s/g, ""),
    ).toBe("$189.000");
    expect(screen.getByRole("img", { name: general.alt })).toBeInTheDocument();
    expect(screen.getByText(copy.productGallery)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /carrito|comprar/i }),
    ).not.toBeInTheDocument();
  });
  it("changes price, stock, SKU and own gallery immediately for an exact selection", async () => {
    render(<ProductDetail product={product} dictionary={dictionary} />);
    await choose("Size", "Large");
    expect(
      screen
        .getByLabelText(new RegExp(copy.currentPrice))
        .textContent?.replace(/\s/g, ""),
    ).toBe("$219.000");
    expect(screen.getByText(/LARGE-RED/)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: own.alt })).toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: general.alt }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(copy.variantGallery)).toBeInTheDocument();
    expect(
      screen.queryByLabelText(new RegExp(copy.previousPrice)),
    ).not.toBeInTheDocument();
  });
  it("disables a nonexistent combination and allows clearing constraints", async () => {
    render(<ProductDetail product={product} dictionary={dictionary} />);
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Color" }));
    const list = await screen.findByRole("listbox");
    expect(within(list).getByRole("option", { name: "Blue" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    fireEvent.keyDown(list, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: copy.resetSelection }));
    expect(screen.getByText(copy.partialSelection)).toBeInTheDocument();
    expect(
      screen.queryByLabelText(new RegExp(copy.currentPrice)),
    ).not.toBeInTheDocument();
  });
  it("shows an exhausted real variant without falsely making it purchasable or discounted", async () => {
    render(<ProductDetail product={product} dictionary={dictionary} />);
    await choose("Size", "Large");
    await choose("Color", "Blue");
    expect(screen.getByText(copy.soldOut)).toBeInTheDocument();
    expect(screen.getByText(/LARGE-BLUE/)).toBeInTheDocument();
    expect(
      screen.queryByLabelText(new RegExp(copy.previousPrice)),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: general.alt })).toBeInTheDocument();
  });
  it("keeps a no-image product usable with a clear visual placeholder", () => {
    render(
      <ProductDetail
        product={{
          ...product,
          images: [],
          variants: variants.map((variant) => ({ ...variant, images: [] })),
        }}
        dictionary={dictionary}
      />,
    );
    expect(screen.getByText(copy.noImage)).toBeInTheDocument();
  });
});
