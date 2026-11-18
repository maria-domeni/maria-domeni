import { Fragment, type ReactNode } from "react";
import { cx } from "./basics";

/**
 * Mostra Markdown simples (o que a IA escreve) como elementos React, sem
 * inserir HTML: títulos, listas, negrito, itálico, citações, tabelas e links.
 */

function safeHref(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : null;
  } catch {
    return null;
  }
}

export function inline(text: string, keyBase = "i"): ReactNode[] {
  const out: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|==[^=]+==|\*[^*\s][^*]*\*|_[^_\s][^_]*_|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let n = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) out.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyBase}-${n++}`;
    if (token.startsWith("**")) out.push(<strong key={key}>{inline(token.slice(2, -2), key)}</strong>);
    else if (token.startsWith("==")) out.push(<mark key={key} className="rounded-[0.2em] bg-[var(--hl-amarelo)] px-0.5 text-inherit">{token.slice(2, -2)}</mark>);
    else if (token.startsWith("`")) out.push(<code key={key} className="rounded-md bg-fill px-1 text-[0.9em]">{token.slice(1, -1)}</code>);
    else if (token.startsWith("[")) {
      const m = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token);
      const href = m ? safeHref(m[2]) : null;
      out.push(
        href ? (
          <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2">
            {m?.[1]}
          </a>
        ) : (
          m?.[1] ?? token
        ),
      );
    } else out.push(<em key={key}>{inline(token.slice(1, -1), key)}</em>);
    last = match.index + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type Block =
  | { kind: "h"; level: number; text: string }
  | { kind: "p"; text: string }
  | { kind: "ul" | "ol"; items: string[] }
  | { kind: "quote"; text: string }
  | { kind: "hr" }
  | { kind: "table"; rows: string[][] };

export function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r/g, "").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      i++;
      continue;
    }
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({ kind: "h", level: heading[1].length, text: heading[2] });
      i++;
      continue;
    }
    if (/^\s*([-*_])\s*\1\s*\1[\s\-*_]*$/.test(line)) {
      blocks.push({ kind: "hr" });
      i++;
      continue;
    }
    if (/^\s*\|/.test(line)) {
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        const cells = lines[i].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells);
        i++;
      }
      blocks.push({ kind: "table", rows });
      continue;
    }
    if (/^\s*>/.test(line)) {
      const parts: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) parts.push(lines[i++].replace(/^\s*>\s?/, ""));
      blocks.push({ kind: "quote", text: parts.join(" ") });
      continue;
    }
    if (/^\s*([-*•])\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*•])\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*([-*•])\s+/, ""));
      blocks.push({ kind: "ul", items });
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+[.)]\s+/, ""));
      blocks.push({ kind: "ol", items });
      continue;
    }
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(#{1,4})\s|^\s*>|^\s*([-*•])\s+|^\s*\d+[.)]\s+|^\s*\|/.test(lines[i])
    ) {
      para.push(lines[i++]);
    }
    blocks.push({ kind: "p", text: para.join(" ") });
  }
  return blocks;
}

export function Markdown({ text, compact, className }: { text: string; compact?: boolean; className?: string }) {
  const blocks = parseBlocks(text);
  return (
    <div className={cx(compact ? "space-y-1.5" : "space-y-3 text-[16px] leading-[1.6]", className)}>
      {blocks.map((block, index) => {
        const key = `b${index}`;
        switch (block.kind) {
          case "h": {
            const size =
              block.level === 1 ? "text-[1.5em]" : block.level === 2 ? "text-[1.28em]" : "text-[1.1em]";
            return (
              <p key={key} className={cx("font-display leading-tight font-bold", size, !compact && "pt-2")}>
                {block.level <= 2 ? <span className="marker">{inline(block.text, key)}</span> : inline(block.text, key)}
              </p>
            );
          }
          case "p":
            return <p key={key}>{inline(block.text, key)}</p>;
          case "ul":
            return (
              <ul key={key} className="list-disc space-y-1 pl-5 marker:text-accent">
                {block.items.map((item, j) => (
                  <li key={j}>{inline(item, `${key}-${j}`)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={key} className="list-decimal space-y-1 pl-5 marker:font-bold marker:text-accent">
                {block.items.map((item, j) => (
                  <li key={j}>{inline(item, `${key}-${j}`)}</li>
                ))}
              </ol>
            );
          case "quote":
            return (
              <blockquote key={key} className="rounded-r-xl border-l-4 border-accent bg-accent-faint px-3 py-2">
                {inline(block.text, key)}
              </blockquote>
            );
          case "hr":
            return <hr key={key} className="border-0 border-t-2 border-dashed border-sep" />;
          case "table":
            return (
              <div key={key} className="overflow-x-auto">
                <table className="w-full border-collapse text-[0.92em]">
                  <tbody>
                    {block.rows.map((row, r) => (
                      <tr key={r} className={r === 0 ? "bg-accent-faint font-bold" : "border-t border-sep"}>
                        {row.map((cell, c) => (
                          <td key={c} className="px-2 py-1.5 align-top">
                            <Fragment>{inline(cell, `${key}-${r}-${c}`)}</Fragment>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
        }
      })}
    </div>
  );
}
