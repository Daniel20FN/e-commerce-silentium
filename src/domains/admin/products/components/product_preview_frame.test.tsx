import { getDictionary } from "@/dictionary/services/get-dictionary";
import { fireEvent, render, screen } from "@testing-library/react";
import { ProductPreviewFrame } from "./product_preview_frame";

const dictionary = getDictionary("es");
const copy = dictionary.admin.products.publication;

it("offers responsive widths without embedding another document and handles missing products", () => {
  render(
    <ProductPreviewFrame
      dictionary={dictionary}
      productId="qa-product"
      product={null}
      backHref="/admin/productos/qa-product?section=publication"
    />,
  );
  expect(
    screen.getByRole("region", { name: copy.frameTitle }),
  ).toBeInTheDocument();
  expect(screen.getByText(copy.previewUnavailable)).toBeInTheDocument();
  expect(document.querySelector("iframe")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: copy.previewBack })).toHaveAttribute(
    "href",
    "/admin/productos/qa-product?section=publication",
  );
  expect(screen.getByRole("button", { name: copy.mobile })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  fireEvent.click(screen.getByRole("button", { name: copy.desktop }));
  expect(screen.getByRole("button", { name: copy.desktop })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(
    screen.getByRole("button", { name: copy.reloadPreview }),
  ).toBeEnabled();
});
