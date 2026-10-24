import { Footer } from "@/components/footer";
import dictionary from "@/dictionary/es.json";
import type { StorefrontCategory } from "@/domains/storefront/types/catalog";
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
import { CategoriesSection } from "./sections/categories_section";

jest.mock("next/image", () => ({
  __esModule: true,
  getImageProps:
    jest.requireActual<typeof import("next/image")>("next/image").getImageProps,
  default: ({
    src,
    alt,
    loading,
    fetchPriority,
  }: {
    src: string;
    alt: string;
    loading?: "eager" | "lazy";
    fetchPriority?: "high" | "low" | "auto";
  }) =>
    jest
      .requireActual<typeof import("react")>("react")
      .createElement("img", { src, alt, loading, fetchPriority }),
}));
const copy = dictionary.landing;
const sections: LandingSection[] = [
  "inicio",
  "productos",
  "nosotros",
  "contacto",
];
describe("lightweight single-page public information", () => {
  it("previews three categories and links to the complete category index", () => {
    const categories: StorefrontCategory[] = Array.from(
      { length: 5 },
      (_, index) => ({
        id: `category-${index}`,
        name: `Category ${index}`,
        slug: `category-${index}`,
        parentId: null,
        description: null,
        imageUrl: null,
        sortOrder: index,
        seoTitle: null,
        seoDescription: null,
      }),
    );
    const { container } = render(
      <CategoriesSection dictionary={dictionary} categories={categories} />,
    );
    expect(container.querySelectorAll(".categoryGrid > a")).toHaveLength(3);
    expect(
      screen.getByRole("link", {
        name: dictionary.storefront.viewAllCategories,
      }),
    ).toHaveAttribute("href", "/categorias");
    expect(
      container.querySelector('a[href="/categorias/category-2"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('a[href="/categorias/category-3"]'),
    ).toBeNull();
  });
  it("does not offer an empty category index when the public catalog has no categories", () => {
    render(<CategoriesSection dictionary={dictionary} categories={[]} />);
    expect(
      screen.queryByRole("link", {
        name: dictionary.storefront.viewAllCategories,
      }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      dictionary.storefront.emptyCategories,
    );
  });
  it("keeps merchandising order and tells the story without tabs or fake cart actions", () => {
    const { container } = render(
      <HomePage dictionary={dictionary} categories={[]} products={[]} />,
    );
    expect(
      [...container.querySelectorAll("main > section")]
        .map((section) => section.id)
        .slice(0, 3),
    ).toEqual(["inicio", "productos", "colecciones"]);
    expect(
      container.querySelectorAll(
        "#como-comprar button, #como-comprar [role=tab], #nosotros button",
      ),
    ).toHaveLength(0);
    expect(container.querySelectorAll("#como-comprar ol li")).toHaveLength(3);
    expect(
      container.querySelector("#como-comprar figcaption"),
    ).toHaveTextContent(copy.howTo.example);
    expect(container.querySelector("#como-comprar")).not.toHaveTextContent(
      "$0",
    );
    expect(container.querySelectorAll("#nosotros p")).toHaveLength(1);
    expect(container.querySelector("#nosotros")).not.toHaveTextContent(
      copy.about.description,
    );
    expect(container.querySelector("#nosotros h2")).toHaveTextContent(
      copy.about.title,
    );
    for (const image of container.querySelectorAll(
      "#nosotros img, #como-comprar img",
    ))
      expect(image).toHaveAttribute("loading", "lazy");
  });
  beforeEach(() => window.history.replaceState(null, "", "/"));
  afterEach(() => window.history.replaceState(null, "", "/"));
  it("art-directs one eager hero image for phones without duplicating semantic content", () => {
    const { container } = render(
      <HomePage dictionary={dictionary} categories={[]} products={[]} />,
    );
    const picture = container.querySelector("#inicio picture");
    expect(picture?.querySelectorAll("source")).toHaveLength(1);
    expect(picture?.querySelector("source")).toHaveAttribute(
      "media",
      "(max-width: 599.95px)",
    );
    expect(picture?.querySelector("source")).toHaveAttribute(
      "srcset",
      expect.stringContaining(
        "%2Fimages%2Flanding%2Fentre-telas-room-800.webp",
      ),
    );
    expect(picture?.querySelector("img")).toHaveAttribute("loading", "eager");
    expect(picture?.querySelector("img")).toHaveAttribute(
      "fetchpriority",
      "high",
    );
    expect(container.querySelectorAll("#inicio img")).toHaveLength(1);
    const curtainPreload = document.querySelector(
      'link[rel="preload"][as="image"][imagesrcset^="/images/landing/entre-telas-curtain-480.webp"]',
    );
    expect(curtainPreload).toHaveAttribute("media", "(max-width: 599.95px)");
    expect(curtainPreload).toHaveAttribute("fetchpriority", "high");
    expect(curtainPreload).toHaveAttribute(
      "imagesrcset",
      "/images/landing/entre-telas-curtain-480.webp 1x, /images/landing/entre-telas-curtain-800.webp 2x",
    );
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });
  it("uses the official brief headline, slogan and brand statement", () => {
    const { container } = render(
      <HomePage dictionary={dictionary} categories={[]} products={[]} />,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Convertimos tu hogar en un reflejo de quién eres.",
    );
    expect(container.querySelector("#inicio p")).toHaveTextContent(
      "No vendemos productos, creamos experiencias que transforman espacios.",
    );
    expect(container.querySelector("#nosotros")).not.toHaveTextContent(
      "No vendemos productos, creamos experiencias que transforman espacios.",
    );
  });
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
    expect(container.querySelectorAll("#ayuda details")).toHaveLength(
      copy.help.items.length,
    );
    expect(container.querySelectorAll("#ayuda summary")).toHaveLength(
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
    expect(
      container.querySelector("#como-comprar .slipPhoto img"),
    ).toHaveAttribute("src", photo.url);
    expect(container.querySelector("#nosotros img")).toHaveAttribute(
      "src",
      "/images/landing/story-white-bedding.jpg",
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
