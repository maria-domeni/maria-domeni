import { createElement as h } from "react";
import { ImageResponse } from "next/og";

export const alt = "Domeni: sua faculdade inteira num caderno só";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  const logo = h(
    "div",
    {
      style: {
        width: 72, height: 72, borderRadius: 18, background: "#1d1d1f", display: "flex",
        alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 44, fontWeight: 700, position: "relative",
      },
    },
    "D",
    h("div", { style: { position: "absolute", top: 0, right: 12, width: 12, height: 22, background: "#d48aa3" } }),
  );
  return new ImageResponse(
    h(
      "div",
      {
        style: {
          width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between",
          background: "#ffffff", padding: "72px 80px", color: "#1d1d1f",
        },
      },
      h("div", { style: { display: "flex", alignItems: "center", gap: 20 } }, logo, h("div", { style: { fontSize: 40, fontWeight: 600 } }, "Domeni")),
      h(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: 20 } },
        h("div", { style: { fontSize: 76, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05 } }, "Sua faculdade inteira num caderno só."),
        h("div", { style: { fontSize: 32, color: "#6e6e73" } }, "Aulas com caneta, PDFs, agenda, notas e faltas. IA só quando você pede."),
      ),
      h(
        "div",
        { style: { display: "flex", gap: 16, fontSize: 26, color: "#6e6e73" } },
        h("span", null, "iPad"), h("span", null, "·"), h("span", null, "celular"), h("span", null, "·"), h("span", null, "computador"),
      ),
    ),
    size,
  );
}
