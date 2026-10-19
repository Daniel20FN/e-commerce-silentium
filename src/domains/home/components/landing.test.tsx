import { Footer } from "@/components/footer";
import dictionary from "@/dictionary/es.json";
import {
  SALES_WHATSAPP_PHONE,
  salesWhatsAppHref,
} from "@/values/sales_contact";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { LandingSection } from "../services/landing_links";
import { landingHref } from "../services/landing_links";
import { HomePage } from "./home_page";
import { LandingDisclosures } from "./landing_disclosures";

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) =>
    jest
      .requireActual<typeof import("react")>("react")
      .createElement("img", { src, alt }),
}));
const copy = dictionary.landing;
const sections: LandingSection[] = [
  "inicio",
  "productos",
  "nosotros",
  "contacto",
];
describe("lightweight single-page public information", () => {
  beforeEach(() => window.history.replaceState(null, "", "/"));
  afterEach(() => window.history.replaceState(null, "", "/"));
  it("renders a single main/h1, named sections, native disclosures and no fictitious subscription/testimonials", () => {
    const { container } = render(
      <HomePage dictionary={dictionary} categories={[]} products={[]} />,
    );
    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    for (const id of [
      "inicio",
      "productos",
      "colecciones",
      "nosotros",
      "ayuda",
      "como-comprar",
      "contacto",
    ])
      expect(container.querySelector(`#${id}`)).not.toBeNull();
    expect(
      screen.getByRole("region", { name: copy.about.title }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: copy.contact.title }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll("details")).toHaveLength(
      copy.help.items.length,
    );
    expect(container.querySelectorAll("summary")).toHaveLength(
      copy.help.items.length,
    );
    expect(container.querySelector("form")).toBeNull();
    expect(container.textContent).not.toMatch(
      /2010|10%|150\.000|30 dias|Maria Fernanda|Cliente desde|Suscribete/,
    );
  });
  it("separates illustrative hero ambience from real catalog product photos", () => {
    const photo = {
      id: "photo",
      url: "https://images.example.com/real.png",
      alt: "Real bedding photo",
    };
    const { container } = render(
      <HomePage
        dictionary={dictionary}
        categories={[]}
        products={[
          {
            id: "p",
            slug: "real",
            name: "Real product",
            shortDescription: null,
            brand: null,
            image: photo,
            priceCents: 100,
            compareAtPriceCents: null,
            hasMultiplePrices: false,
            available: true,
          },
        ]}
      />,
    );
    expect(container.querySelector("#inicio img")).toHaveAttribute(
      "src",
      "/images/landing/refugio-marfil.webp",
    );
    expect(container.querySelector("#inicio img")).toHaveAttribute("alt", "");
    expect(container.querySelector("#nosotros img")).toHaveAttribute(
      "src",
      photo.url,
    );
    expect(container.querySelector("#inicio button")).toBeNull();
    expect(screen.queryByText("Elige tu ambiente")).not.toBeInTheDocument();
    expect(container.querySelectorAll("#inicio img")).toHaveLength(1);
    expect(screen.getByRole("link", { name: /Real product/ })).toHaveAttribute(
      "href",
      "/productos/real",
    );
  });
  it("links contact to approved WhatsApp and telephone without sending or collecting data", () => {
    const { container } = render(
      <HomePage dictionary={dictionary} categories={[]} products={[]} />,
    );
    const whatsapp = screen.getByRole("link", { name: copy.contact.cta });
    expect(whatsapp).toHaveAttribute(
      "href",
      salesWhatsAppHref(copy.contact.message),
    );
    expect(new URL(whatsapp.getAttribute("href") ?? "").pathname).toBe(
      `/${SALES_WHATSAPP_PHONE}`,
    );
    expect(whatsapp).toHaveAttribute("rel", "noopener noreferrer");
    expect(
      container.querySelector('a[href="tel:+573166218114"]'),
    ).not.toBeNull();
    expect(screen.getByRole("link", { name: copy.hero.about })).toHaveAttribute(
      "href",
      "#nosotros",
    );
  });
  it("opens native details on click without a custom accordion state machine", () => {
    const { container } = render(
      <LandingDisclosures items={copy.help.items} />,
    );
    const detail = container.querySelector("#envios");
    expect(detail).not.toHaveAttribute("open");
    fireEvent.click(screen.getByText(copy.help.items[1].title));
    expect(detail).toHaveAttribute("open");
    fireEvent.click(screen.getByText(copy.help.items[1].title));
    expect(detail).not.toHaveAttribute("open");
  });
  it("opens initial direct-link disclosure and focuses its summary", async () => {
    window.history.replaceState(null, "", "/#pagos");
    const { container } = render(
      <LandingDisclosures items={copy.help.items} />,
    );
    expect(container.querySelector("#pagos")).toHaveAttribute("open");
    await waitFor(() =>
      expect(screen.getByText(copy.help.items[2].title)).toHaveFocus(),
    );
  });
  it("handles hash changes/back links and ignores malformed/unrelated fragments", () => {
    const { container } = render(
      <LandingDisclosures items={copy.help.items} />,
    );
    for (const fragment of ["#%E0%A4%A", "#contacto"]) {
      act(() => {
        window.history.replaceState(null, "", "/" + fragment);
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      });
      expect(container.querySelectorAll("details[open]")).toHaveLength(0);
    }
    act(() => {
      window.history.replaceState(null, "", "/#cambios");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(container.querySelector("#cambios")).toHaveAttribute("open");
  });
  it("gives every footer link a real landing target, no placeholders or unsupported pages", () => {
    const { container } = render(
      <>
        <HomePage dictionary={dictionary} categories={[]} products={[]} />
        <Footer dictionary={dictionary} />
      </>,
    );
    const footer = container.querySelector("footer");
    expect(footer).not.toBeNull();
    for (const link of footer?.querySelectorAll("a") ?? []) {
      const href = link.getAttribute("href");
      expect(href).toMatch(/^\/#.+/);
      expect(
        container.querySelector(href?.slice(1) ?? "missing"),
      ).not.toBeNull();
    }
    expect(footer?.querySelector("button")).toBeNull();
    expect(footer?.textContent).not.toMatch(
      /2010|Blog|Trabaja con|Terminos|PSE/,
    );
  });
  it.each(sections)(
    "returns same-document links on landing and home links from elsewhere: %s",
    (target) => {
      expect(landingHref(target, "/")).toBe(`#${target}`);
      expect(landingHref(target, "/productos/real")).toBe(`/#${target}`);
    },
  );
});
