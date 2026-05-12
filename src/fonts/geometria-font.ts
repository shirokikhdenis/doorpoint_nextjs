import localFont from "next/font/local";

/** Geometria (local). Light is the default (400); Medium/Bold/Extrabold for heavier utilities. */
export const geometria = localFont({
  src: [
    {
      path: "./geometria/geometria_light.woff",
      weight: "400",
      style: "normal",
    },
    {
      path: "./geometria/geometria_lightitalic.woff",
      weight: "400",
      style: "italic",
    },
    {
      path: "./geometria/geometria_medium.woff",
      weight: "500",
      style: "normal",
    },
    {
      path: "./geometria/geometria_mediumitalic.woff",
      weight: "500",
      style: "italic",
    },
    {
      path: "./geometria/geometria_bold.woff",
      weight: "700",
      style: "normal",
    },
    {
      path: "./geometria/geometria_bolditalic.woff",
      weight: "700",
      style: "italic",
    },
    {
      path: "./geometria/geometria_extrabold.woff",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--font-geometria",
  display: "swap",
});
