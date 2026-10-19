# Web typography

User-approved alternatives to the unavailable Catchye and Nudista originals:

- Cormorant Garamond: display headings, weights 400–700.
- Manrope: body, controls, prices and compact admin headings, weights 400–700.

Both are distributed under SIL OFL 1.1; retain the adjacent copyright/license files.
Sources: https://github.com/google/fonts/tree/main/ofl/cormorantgaramond and https://github.com/google/fonts/tree/main/ofl/manrope.

The WOFF2 variable subsets retain Latin/Spanish, Latin Extended-A, general punctuation, euro, trademark and minus. They were generated from the upstream variable TTFs with FontTools (weight range 400–700, all layout features retained). Keep diacritics and Spanish inverted punctuation when regenerating. `next/font/local` self-hosts them with swap and metric-adjusted fallbacks; visitors make no Google Fonts requests.

The original logo and handwritten tagline are PDF-derived outlines, not recreated using these substitute fonts. See `public/brand/provenance.json`.
