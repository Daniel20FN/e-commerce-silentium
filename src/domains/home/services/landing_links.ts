export type LandingSection =
  | "inicio"
  | "colecciones"
  | "productos"
  | "nosotros"
  | "como-comprar"
  | "ayuda"
  | "contacto";

export function landingHref(section: LandingSection, pathname: string): string {
  return `${pathname === "/" ? "" : "/"}#${section}`;
}

export const sectionAnchorSx = { scrollMarginTop: { xs: 88, md: 104 } };
