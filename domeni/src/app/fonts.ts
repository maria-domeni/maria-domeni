import localFont from "next/font/local";

// Fontes opcionais do app. Ficam junto do código (sem depender de serviços
// externos) e só são baixadas pelo navegador quando escolhidas nos Ajustes.
// O carregador exige as opções escritas por extenso em cada chamada.

const inter = localFont({
  src: "./fonts/inter.woff2",
  weight: "100 900",
  variable: "--font-inter",
  display: "swap",
  preload: false,
});
const nunito = localFont({
  src: "./fonts/nunito.woff2",
  weight: "200 1000",
  variable: "--font-nunito",
  display: "swap",
  preload: false,
});
const lexend = localFont({
  src: "./fonts/lexend.woff2",
  weight: "100 900",
  variable: "--font-lexend",
  display: "swap",
  preload: false,
});
const lora = localFont({
  src: "./fonts/lora.woff2",
  weight: "400 700",
  variable: "--font-lora",
  display: "swap",
  preload: false,
});
const fraunces = localFont({
  src: "./fonts/fraunces.woff2",
  weight: "100 900",
  variable: "--font-fraunces",
  display: "swap",
  preload: false,
});
const caveat = localFont({
  src: "./fonts/caveat.woff2",
  weight: "400 700",
  variable: "--font-caveat",
  display: "swap",
  preload: false,
});

const pacifico = localFont({
  src: "./fonts/pacifico.woff2",
  weight: "400",
  variable: "--font-pacifico",
  display: "swap",
  preload: false,
});
const patrickHand = localFont({
  src: "./fonts/patrick-hand.woff2",
  weight: "400",
  variable: "--font-patrick",
  display: "swap",
  preload: false,
});

export const fontVariables = [inter, nunito, lexend, lora, fraunces, caveat, pacifico, patrickHand]
  .map((font) => font.variable)
  .join(" ");
