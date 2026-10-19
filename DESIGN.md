# DESIGN.md

## Purpose

This file gives AI agents a stable UI target for **e-commerce-silentium**. It is **structure-first**, not palette-first.

- **Storefront shell** = Apple-inspired spatial rhythm, premium calm, product storytelling.
- **Storefront retail modules** = Meta-inspired merchandising, discoverability, conversion-friendly grids.
- **Admin workspace** = Linear-inspired clarity, compact density, operational precision.

Use this with `AGENTS.md`.

## Design References

Primary inspiration sources used to define this project's UI direction:

- **Apple** — https://getdesign.md/apple/design-md
- **Meta** — https://getdesign.md/meta/design-md
- **Linear** — https://getdesign.md/linear.app/design-md

These references inform layout rhythm, hierarchy, merchandising structure, and operational UI patterns.
They are inspiration sources, not literal copy instructions.

---

## Project-Specific Context

- Stack: **Next.js App Router, React 19, TypeScript, MUI 7**.
- Shared UI belongs in `src/components`.
- Domain UI belongs in `src/domains/*/components`.
- User-facing copy is **dictionary-driven** and **Spanish-first**.
- Current storefront entry already composes `Navbar`, `HomePage`, and `Footer`.
- Current home flow already stacks: hero, categories, featured products, benefits, testimonials, newsletter.
- Current admin shell already uses a compact sidebar + app bar model; reinforce that direction instead of replacing it.

Design work in this repo should extend existing structure instead of inventing a disconnected visual language.

---

## Design Thesis

### Approved public landing: Refugio inmersivo

- Official brief copy is part of the identity, not optional inspiration: hero H1 “Convertimos tu hogar en un reflejo de quién eres.” and supporting hero paragraph “No vendemos productos, creamos experiencias que transforman espacios.” Keep them dictionary-driven and preserve the original “para mi hogar” vector signature.

- The approved opening is an immersive photographic room: billowing pale curtain in the foreground, midnight navy wall and warm bedding. Keep the room as an optimized image plate, with semantic Cormorant Garamond headings and Manrope copy/actions above it; never bake UI into the photograph.
- Carry this world through warm editorial category imagery, actual product photography and COP pricing, a spacious buying guide, celeste/blue image-led brand story, native FAQ, warm contact close and theme-aware blue/chocolate footer. Do not invent categories to fill a mockup.
- Landing styling is scoped to the homepage; catalog/admin retain their task-focused UI. Preserve light/dark themes, mobile navigation, same-page information anchors and guest cart to WhatsApp.
- Motion has one finite photographic arrival, restrained feedback and bounded material depth while scrolling. Reduced motion shows the finished composition with no spatial animation. The hero uses one illustrative atmospheric image, not a photograph of a specific SKU; no ambient selector is displayed.

### Storefront

The storefront should feel like a **premium bedding brand**: serene, spacious, tactile, and editorial. It should sell through confidence, comfort, and presentation rather than noisy urgency.

Primary qualities:

- Calm whitespace
- Strong section rhythm
- Large product imagery
- Short polished copy
- Clear trust cues
- Product-first storytelling

### Retail Sections

Discovery-heavy sections should feel like a modern retail catalog:

- Readable category cards
- Clean merchandising rows
- Predictable product grids
- Straightforward CTA placement
- Scannable promotional modules

### Admin

The admin should feel like a **work tool**, not a marketing page:

- Dense but breathable
- Fast to scan
- Minimal chrome
- Precise hierarchy
- Strong active states
- Information over decoration

---

## Storefront vs Admin Split

Do not blend these modes.

### Storefront is for

- persuasion
- inspiration
- product trust
- category browsing
- premium merchandising

### Admin is for

- task completion
- monitoring
- data comparison
- navigation efficiency
- repeated daily use

If a screen helps customers choose or feel the brand, use the **storefront language**. If a screen helps staff operate the business, use the **admin language**.

---

## Layout Principles

### 1. Rhythm

Storefront pages should alternate between:

1. **breathing sections** with generous vertical spacing
2. **structured retail sections** with tighter grid logic

This contrast creates the premium feel. If every section is equally dense, the storefront starts looking generic.

### 2. Containers

- Use centered containers by default.
- Hero and storytelling modules can run visually wider.
- Merchandising grids should be slightly more constrained for easier scanning.
- Footer and utility zones may stretch wider, but inner groups must stay aligned.

### 3. Section Composition

Prefer this order inside major storefront sections:

1. context label or eyebrow when useful
2. strong heading
3. short supporting copy
4. action if needed
5. visual or grid content

Avoid long intros before users can see products.

---

## Spacing & Density

### Storefront Density

- Spacious by default
- Large gaps between major sections
- Medium gaps inside content groups
- Tight spacing only inside cards, badges, or metadata rows

Storefront should feel **expensive because it is restrained**.

### Admin Density

- Compact by default
- Shorter vertical rhythm in toolbars, lists, and panels
- Dense tables and filter bars, but never cramped
- Smaller gaps between actions and controls

Admin should feel **fast and precise**, not airy for aesthetic theater.

### MUI Guidance

- Prefer consistent steps from `theme.spacing(...)`.
- Reuse the same paddings across sibling sections.
- Do not patch alignment with one-off margins.

---

## Typography Intent

Typography should communicate hierarchy more than personality.

### Storefront Hierarchy

- Hero headlines: large, calm, editorial, short
- Section titles: premium and direct, never shouty
- Supporting copy: concise and easy to scan
- Product metadata: clearly secondary
- Trust/support copy: small but highly legible

### Admin Hierarchy

- Page titles: compact and strong
- Panel headings: functional and direct
- Table labels: neutral and readable
- Supporting metadata: visibly secondary
- KPI/status values: strong contrast and quick recognition

### Copy Rules

- Spanish-first wording
- Short sentences beat clever ones
- All UI text must come from the dictionary layer
- Prefer concrete retail language over abstract slogans

---

## Official Brand Identity

- Source of truth: `docs/BRIEF.pdf`. Preserve its original wordmark, crescent/stars and handwritten tagline as vector artwork, never recreate them with a substitute font.
- Official primitives: ivory `#FEFAF9`, beige `#CFB59E`, celeste `#BAD9EB`, chocolate `#6E4E37`. Map them through `src/styles/brand_colors.ts`, not independent component palettes.
- Light: ivory canvas, warm secondary surfaces, chocolate ink/actions, celeste story/action fields. Beige is not a sufficient background for ordinary chocolate body text; use derived lighter surfaces or darker ink.
- Dark: brown remains principal: canvas `#211B17`, panels/header `#302720`, ivory text. Official celeste `#BAD9EB` breaks monotony through primary actions, one full brand-story field (with chocolate ink), active FAQ text and the footer signature. Footer returns to deep brown. User clarified that more blue meant celeste accents on a brown base, NOT blue as the main canvas. Keep this balance; do not replace the warm dark identity wholesale.
- Approved free web alternatives: self-hosted Cormorant Garamond for display, Manrope for body/UI (including Spanish). Original Catchye/Nudista font files are unavailable. Keep the original handwritten tagline in the vector signature; no third font is loaded.
- Variable WOFF2 assets include weights 400–700, Latin/Spanish and punctuation; keep the OFL notices in `src/styles/fonts/`. No runtime font CDN calls.
- `BrandLogo` uses the exact PDF outlines as a current-color mask, with fixed aspect ratio and an accessible brand label. Wordmark in navbar/mobile drawer, signature in footer, original isotype in app icons/favicon. Brand mark is not a heading.
- Admin keeps compact Manrope headings and existing operational layouts; global palette/fonts change without importing landing composition.
- Preserve the approved room photograph, layout, anchors, reduced-motion behavior and guest cart/WhatsApp flow. Photographic wall colors are not UI palette tokens.

## Semantic Color Roles

Map the official palette to semantic roles:

- **Canvas**: main page background
- **Elevated Surface**: cards, drawers, app bars, panels
- **Primary Text**: headings and key labels
- **Secondary Text**: support copy and metadata
- **Divider / Border**: quiet structure
- **Accent**: primary CTA, selected state, key emphasis
- **Success / Warning / Error / Info**: semantic feedback only

Rules:

- Storefront accent usage should stay restrained.
- Admin accent usage should support orientation and selection.
- Never rely on color alone to communicate meaning.

---

## Navigation Behavior

### Storefront Navigation

The current navbar pattern is correct in spirit:

- fixed top navigation
- visible brand mark
- direct category/section links
- auth actions available
- account/admin access present but not dominant

Future storefront nav should remain calm, lightweight, and wayfinding-first. Avoid crowded utility bars or too many competing actions.

### Admin Navigation

The current admin shell is the correct base:

- compact sidebar
- top app bar for page context and user presence
- expandable/collapsible navigation
- strong active and hover states

Future admin nav should optimize for frequent reuse, not flourish.

---

## Component Behavior

### Buttons

- Primary buttons should feel decisive, not oversized everywhere.
- Secondary buttons should reduce emphasis without disappearing.
- Storefront hero may use two CTAs: one primary, one quieter companion.
- Admin actions should favor compact height and explicit labels.

### Cards

- Storefront cards should prioritize image, title, short support info, then CTA.
- Category cards should read instantly at a glance.
- Product cards must align consistently across rows.
- Admin cards should behave like information panels, not promo tiles.

### Forms

- Use MUI-first inputs and predictable label/help/error structure.
- Storefront forms should feel simple and reassuring.
- Admin forms should optimize editing speed and scanning.
- Do not create decorative form layouts that hurt legibility.

### Tables & Data Views

- Tables belong primarily to admin surfaces.
- Prioritize scanning, sorting, filtering, and row actions.
- Keep headers obvious and alignment strong.
- Empty, loading, and error states must be explicit.

---

## Imagery & Content Priorities

### Storefront

Imagery should do heavy lifting.

- Prefer large premium product photography
- Show material, texture, comfort, and detail
- Let visuals lead before long explanations
- Use copy to support imagery, not compete with it

For bedding and home comfort products, tactile trust matters more than feature overload.

### Admin

Imagery is secondary.

- Favor icons, labels, structured data, and state clarity
- Use avatars or thumbnails only when they help recognition
- Remove decorative visuals that slow scanning

---

## Responsive Behavior

### Storefront

- Preserve premium rhythm on mobile; do not collapse into a dense feed.
- Hero should simplify without losing hierarchy.
- Category and product grids should reduce columns cleanly.
- Footer groups may stack, but information architecture must stay obvious.

### Admin

- Sidebar should collapse gracefully.
- Toolbars should preserve the most important actions first.
- Dense data may become cards or stacked rows on smaller widths.
- Do not hide critical operational actions behind unclear overflow patterns.

Touch targets must remain comfortable even when density increases.

---

## Accessibility & Interaction Guardrails

- Use semantic MUI components first.
- Keep visible focus states on all interactive elements.
- Preserve keyboard access for nav, drawers, menus, and forms.
- Icon-only buttons need accessible labels.
- Maintain clear heading hierarchy on every page.
- Motion should be subtle and never required for comprehension.

Premium does **not** mean minimal to the point of ambiguity.

---

## Do / Don't

### Do

- Keep storefront calm, confident, and image-led.
- Use retail grids for categories and featured products.
- Keep admin compact, crisp, and operational.
- Favor strong alignment and repeatable spacing.
- Keep copy concise and dictionary-backed.
- Put shared patterns in `src/components` and domain-specific UI in `src/domains`.

### Don't

- Don't turn the storefront into a dashboard.
- Don't turn the admin into a marketing page.
- Don't overuse accents, shadows, or decorative gradients.
- Don't hardcode user-facing text.
- Don't create wildly different button/card styles between adjacent sections.
- Don't force dense multi-column layouts on mobile without a strong reason.

---

## Agent Heuristics

### If building storefront, ask

- Does this feel premium and spacious?
- Is the product or category visible quickly?
- Is the CTA hierarchy obvious but restrained?
- Is the copy short enough?

### If building admin, ask

- Is this fast to scan?
- Are primary actions obvious?
- Is chrome minimized?
- Would this still feel usable after hours of repeated work?

If unclear, simplify the surface.

---

## Default Visual Target

If an agent needs the fastest mental model, use this blend:

- **Storefront hero** = Apple
- **Storefront category/product merchandising** = Meta Store
- **Admin shell and operational surfaces** = Linear

That is the design center for **e-commerce-silentium**.

## Approved mobile extension: Entre telas

- Below 600px, use the approved portrait bedroom and separate real-alpha sheer curtain; keep Refugio inmersivo unchanged on tablet/desktop.
- The exact official slogan remains the sole semantic h1, with the brand statement below it. The approved three-line mobile display is a deliberate exception to generic two-line headline guidance.
- Reading area stays upper-left; curtain is offset 24px right to protect small-screen text contrast. Celeste primary CTA precedes the quiet about link. Both remain above the fold at 320x568.
- The scene may continue below the first viewport (940px minimum) rather than shrinking typography or hiding the bedding. No internal scroll or scroll hijacking.
- Motion: one finite reveal, at most 3% curtain scroll travel through CSS view timeline; reduced motion disables animation. No new client JavaScript or video.
- Responsive picture art direction loads one room image, not separate hidden desktop/mobile images. CSS curtain assets exist only in the phone media query. Illustrative atmosphere never replaces actual catalog photography.

## Theme default and section motion

- New visitors start in light mode, including when their operating system prefers dark. A valid explicit theme cookie still wins. Dark mode remains available.
- Scroll entrances follow the observed Sage reference: brief opacity/vertical settling when a meaningful content group enters the viewport, once per mount. Photography settles slightly; purchase steps have a short capped stagger. The approved hero remains the focal scene.
- One IntersectionObserver and native Web Animations, inside the existing LandingShell client boundary; no animation dependency or scroll listener. Only transform/opacity animate, with no layout shift.
- Server-rendered content is always visible. Unsupported APIs and reduced motion leave the static page intact. Runtime preference changes cancel effects; hash targets and focused controls bypass motion.
