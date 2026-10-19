import { CompanyValues } from "@/values/app_values";
import { render, screen } from "@testing-library/react";
import { BrandLogo } from "./brand_logo";

describe("official brand artwork", () => {
  it.each(["wordmark", "signature", "isotype"] as const)(
    "renders an accessible %s without replacing lettering with text",
    (variant) => {
      render(<BrandLogo variant={variant} />);
      const logo = screen.getByRole("img", { name: CompanyValues.name });
      expect(logo).toBeVisible();
      expect(logo).toBeEmptyDOMElement();
      expect(logo).toHaveStyle({
        mask: `url(/brand/${variant}.svg) center/contain no-repeat`,
      });
    },
  );
});
