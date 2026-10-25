import { render } from "@testing-library/react";
import { StructuredData } from "./structured_data";

it("renders one parseable inert JSON-LD script without creating executable markup", () => {
  const { container, rerender } = render(
    <StructuredData
      data={{
        "@context": "https://schema.org",
        "@type": "Product",
        name: "</script><img src=x onerror=alert(1)>",
      }}
    />,
  );
  expect(container.querySelectorAll("script")).toHaveLength(1);
  const script = container.querySelector('script[type="application/ld+json"]');
  expect(JSON.parse(script?.textContent ?? "{}").name).toContain("</script>");
  expect(container.querySelector("img")).toBeNull();
  rerender(<StructuredData data={null} />);
  expect(container.querySelector("script")).toBeNull();
});
