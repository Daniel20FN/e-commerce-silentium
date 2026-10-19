import localFont from "next/font/local";

export const displayFont = localFont({
  src: "./fonts/cormorant-garamond-latin-variable.woff2",
  weight: "400 700",
  display: "swap",
  fallback: ["Georgia", "serif"],
});

export const textFont = localFont({
  src: "./fonts/manrope-latin-variable.woff2",
  weight: "400 700",
  display: "swap",
  fallback: ["Arial", "sans-serif"],
});
