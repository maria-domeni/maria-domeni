import localFont from "next/font/local";

// O app usa as fontes do próprio aparelho (SF Pro, New York e SF Mono no
// iPad e no Mac). Inter e Lora ficam junto do código para quem prefere uma
// fonte igual em todo aparelho, ou como serifa onde o sistema não tem uma.
// O carregador exige as opções escritas por extenso em cada chamada.

const inter = localFont({
  src: "./fonts/inter.woff2",
  weight: "100 900",
  variable: "--font-inter",
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

export const fontVariables = [inter, lora].map((font) => font.variable).join(" ");
