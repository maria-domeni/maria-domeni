import Anthropic from "@anthropic-ai/sdk";
import { timingSafeEqual } from "node:crypto";
import { estimateCost } from "@/lib/aiPricing";
import { isActive, isOwner, limitsFor } from "@/server/plans";
import { supabaseAdmin, userFromRequest } from "@/server/supabase";
import {
  BASE_RULES,
  REPORT_AGENT,
  SCHEMAS,
  TONE_STYLE,
  isJsonAction,
  renderDiscipline,
  renderSources,
  type SourceInput,
} from "@/server/prompts";

/**
 * IA do Domeni. Responde a quem está logado (com cota mensal do plano) ou a
 * quem tem o código de acesso da dona. Cada pedido vem de um botão que a
 * pessoa tocou. A chave da Anthropic fica só aqui (ANTHROPIC_API_KEY).
 */

export const maxDuration = 300;

const MODELS = new Set(["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"]);
const ACTIONS = new Set([
  "resumo",
  "resumo-aesthetic",
  "flashcards",
  "questoes",
  "jogo",
  "aprofundar",
  "explicar",
  "conversa",
  "relatorio",
  "organizar-transcricao",
]);
const MAX_BODY = 600_000;
/** Para quem assina: cerca de 90 mil tokens, abaixo da faixa cara do Haiku. */
const MAX_BODY_PLAN = 320_000;
const DEFAULT_PLAN_MODEL = "claude-haiku-5-5";

type Effort = "low" | "medium" | "high";
const EFFORT: Record<string, Effort> = {
  resumo: "medium",
  "resumo-aesthetic": "medium",
  flashcards: "low",
  questoes: "medium",
  jogo: "low",
  aprofundar: "high",
  explicar: "medium",
  conversa: "low",
  relatorio: "high",
  "organizar-transcricao": "low",
};

/* ---------- limite de pedidos (por instância) ---------- */
const hits = new Map<string, number[]>();
function rateLimited(key: string, max = 40): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < 10 * 60_000);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > max;
}

type Caller =
  | { kind: "codigo" }
  | { kind: "conta"; userId: string; owner: boolean; plan: "gratis" | "plus" };

function planModel(search: boolean): string {
  const wanted = (search ? process.env.AI_MODEL_SEARCH : process.env.AI_MODEL) ?? DEFAULT_PLAN_MODEL;
  return MODELS.has(wanted) ? wanted : DEFAULT_PLAN_MODEL;
}

function sameCode(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function fail(status: number, code: string, message: string) {
  return Response.json({ code, message }, { status });
}

interface Body {
  action: string;
  model: string;
  input: Record<string, unknown>;
}

const text = (v: unknown, max = 20_000) => (typeof v === "string" ? v.slice(0, max) : "");

function sourcesOf(v: unknown): SourceInput[] {
  if (!Array.isArray(v)) return [];
  return v
    .slice(0, 40)
    .map((s) => ({ title: text((s as SourceInput).title, 300), date: text((s as SourceInput).date, 40), text: text((s as SourceInput).text, 60_000) }))
    .filter((s) => s.text);
}

/** Monta o sistema e a mensagem de cada ação. */
function buildPrompt(action: string, input: Record<string, unknown>): { system: string; user: string; web: boolean } {
  const course = text(input.course, 120) || "um curso de graduação";
  const discipline = renderDiscipline(input.discipline as { name?: string; professors?: string[]; ementa?: string });
  const sources = renderSources(sourcesOf(input.sources));
  const library = renderSources(sourcesOf(input.library), "TRECHOS DA BIBLIOTECA DELA (livros e artigos)");
  const topic = text(input.topic, 500);
  const context = [`Curso: ${course}`, discipline, sources, library].filter(Boolean).join("\n\n");
  const count = Math.min(30, Math.max(3, Number(input.count) || 10));
  let system = BASE_RULES;
  let user = "";
  let web = false;

  switch (action) {
    case "resumo":
      user = `${context}\n\nFaça um resumo bem organizado das fontes acima em Markdown: título (##), tópicos e subtópicos, conceitos-chave em **negrito**, exemplos citados em aula e, no fim, "Dúvidas para levar ao professor" se houver lacunas. Marque o que for complemento.`;
      break;
    case "resumo-aesthetic":
      user = `${context}\n\nCrie um resumo "aesthetic" (como os resumos bonitos feitos à mão para estudar) a partir das fontes acima, preenchendo o JSON pedido:
- title: tema em 2 a 5 palavras; subtitle: uma linha que contextualiza;
- definition: 2 a 3 frases;
- keyPoints: 4 a 6 frases curtas; destaque termos importantes com ==termo==;
- sections: 2 ou 3 blocos (ex.: Funções, Características, Autores e conceitos), cada um com emoji e 3 a 5 itens curtos;
- flow: os passos de um processo, se o tema tiver um (senão, steps vazio);
- mnemonic: um truque, sigla ou frase para lembrar, com explicação;
- whyImportant: por que isso importa na prática;
- keywords: 6 a 10 palavras-chave;
- practice: 2 ou 3 questões com 4 alternativas e o índice da correta (0 a 3);
- complement: tudo o que você acrescentou de conhecimento geral (pode ficar vazio).`;
      break;
    case "flashcards":
      user = `${context}\n\nCrie ${count} flashcards a partir das fontes. Frente: pergunta curta ou termo. Verso: resposta em 1 a 3 frases, fiel às fontes. Varie os tipos (definição, exemplo, comparação, autor ↔ conceito, aplicação). title: o tema.`;
      break;
    case "questoes":
      user = `${context}\n\nCrie ${count} questões de múltipla escolha no estilo de prova de faculdade, com 4 alternativas plausíveis, uma correta (answer = índice 0 a 3, variando a posição) e explanation curta dizendo por que a certa está certa. Baseie-se nas fontes. title: o tema.`;
      break;
    case "jogo":
      user = `${context}\n\nMonte um jogo de 10 rodadas para revisar o conteúdo, divertido e desafiador, misturando rodadas "vf" (options ["Verdadeiro","Falso"], answer 0 ou 1) e "quiz" (4 opções, answer 0 a 3). Cada rodada com explanation curta. title: um nome criativo para o jogo.`;
      break;
    case "aprofundar":
      web = true;
      user = `${context}\n\nTema para estudar a fundo: "${topic}".
Ensine este tema de forma completa, indo além do que foi dado em aula. Use a busca na internet para aprofundar, dando preferência a fontes acadêmicas e confiáveis (SciELO, periódicos, CFP/CRPs, livros e universidades). Organize em Markdown:
## O que as suas anotações dizem
## Aprofundando
## Exemplos e aplicação na prática
## Debates, críticas e autores
## Como isso pode cair na prova
## Mini glossário
## Para continuar estudando
Diferencie claramente o que veio das fontes dela e o que é complemento. Nas referências, cite só o que você encontrou na busca (com link) ou o que está nas fontes dela.`;
      break;
    case "explicar":
      user = `${context}\n\nExplique "${topic}" de forma didática: comece simples, use uma analogia e um exemplo prático, depois aprofunde. Ligue com as anotações dela quando houver. Termine com 3 perguntas para ela testar se entendeu.`;
      break;
    case "conversa": {
      const history = Array.isArray(input.history)
        ? (input.history as { role: string; text: string }[])
            .slice(-10)
            .map((t) => `${t.role === "user" ? "Estudante" : "Você"}: ${text(t.text, 4000)}`)
            .join("\n")
        : "";
      const excerpts = Array.isArray(input.context)
        ? (input.context as { kind: string; title: string; where: string; excerpt: string }[])
            .slice(0, 10)
            .map((c) => `- [${text(c.kind, 20)}] ${text(c.title, 200)} (${text(c.where, 200)}): ${text(c.excerpt, 600)}`)
            .join("\n")
        : "";
      if (input.agent === "disciplina") {
        system += `\n\nVocê é o agente especialista da disciplina indicada. Responda como um tutor experiente da área, usando as fontes dela como base.`;
      } else {
        const name = text(input.avatarName, 40) || "a personagem";
        const tone = TONE_STYLE[text(input.tone, 20)] ?? TONE_STYLE.carinhosa;
        system += `\n\nVocê é ${name}, a personagem que acompanha a estudante dentro do app Domeni. Seu jeito é ${tone}. Responda curto (até 150 palavras) e, sempre que der, aponte onde nas coisas dela (anotações e livros listados no contexto) está o assunto.`;
      }
      user = `${context}${excerpts ? `\n\nO QUE A BUSCA NAS COISAS DELA ENCONTROU:\n${excerpts}` : ""}${history ? `\n\nCONVERSA ATÉ AGORA:\n${history}` : ""}\n\nPergunta da estudante: ${text(input.question, 4000)}`;
      break;
    }
    case "relatorio": {
      system = `${BASE_RULES}\n\n${REPORT_AGENT}`;
      const internship = input.internship as Record<string, unknown> | undefined;
      const notes = Array.isArray(input.fieldNotes)
        ? (input.fieldNotes as { date: string; text: string; hours: number }[])
            .slice(0, 200)
            .map((n) => `- ${text(n.date, 20)} (${Number(n.hours) || 0} h): ${text(n.text, 6000)}`)
            .join("\n")
        : "";
      user = [
        internship
          ? `DADOS DO ESTÁGIO:\nNome: ${text(internship.name, 200)}\nLocal/serviço: ${text(internship.place, 300)}\nSupervisor(a): ${text(internship.supervisor, 200)}\nObservações: ${text(internship.notes, 4000)}`
          : "",
        notes ? `DIÁRIO DE CAMPO:\n${notes}` : "",
        text(input.transcript, 120_000) ? `TRANSCRIÇÃO (entrevista/visita):\n${text(input.transcript, 120_000)}` : "",
        text(input.references, 20_000) ? `REFERÊNCIAS QUE ELA QUER USAR:\n${text(input.references, 20_000)}` : "",
        sources,
        text(input.model, 60_000) ? `RELATÓRIO ANTERIOR DELA (use só como modelo de estilo e estrutura, não copie conteúdo):\n${text(input.model, 60_000)}` : "",
        `PEDIDO: ${text(input.request, 4000) || "Escreva o relatório completo."}`,
      ]
        .filter(Boolean)
        .join("\n\n");
      break;
    }
    case "organizar-transcricao":
      user = `${discipline}\n\nTRANSCRIÇÃO DA AULA:\n${text(input.transcript, 120_000)}\n\nTransforme a transcrição em anotações de aula organizadas em Markdown: tema, tópicos, conceitos com explicação, exemplos dados, falas importantes do professor e dúvidas que ficaram. Corrija erros óbvios de reconhecimento de voz, mas não invente nada que não esteja na transcrição.`;
      break;
  }
  return { system, user, web };
}

export async function POST(request: Request): Promise<Response> {
  if (!process.env.ANTHROPIC_API_KEY) return fail(503, "sem-chave", "A IA ainda não foi configurada no servidor (falta a chave da Anthropic).");

  const ip = (request.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  if (rateLimited(`ip:${ip}`)) return fail(429, "limite", "Muitos pedidos seguidos. Espere alguns minutos.");

  /* ---------- quem está pedindo ---------- */
  let caller: Caller;
  const sb = supabaseAdmin();
  if ((request.headers.get("authorization") ?? "").toLowerCase().startsWith("bearer ")) {
    if (!sb) return fail(503, "sem-chave", "As contas ainda não foram configuradas no servidor.");
    const user = await userFromRequest(request);
    if (!user) return fail(401, "sem-sessao", "Sua sessão expirou. Entre na conta de novo.");
    const owner = isOwner(user.email);
    const { data: rows } = await sb.from("entitlements").select("status,period_end").eq("user_id", user.id);
    const plus = owner || (rows ?? []).some((r) => isActive(r as { status: never; period_end: string | null }));
    caller = { kind: "conta", userId: user.id, owner, plan: plus ? "plus" : "gratis" };
    if (rateLimited(`user:${user.id}`, owner ? 200 : 20)) return fail(429, "limite", "Muitos pedidos seguidos. Espere alguns minutos.");
  } else {
    const expected = process.env.DOMENI_ACCESS_CODE;
    const given = request.headers.get("x-domeni-code") ?? "";
    if (!expected || !given) return fail(401, "sem-conta", "Entre na sua conta (é grátis) para usar a IA.");
    if (!sameCode(given, expected)) return fail(401, "codigo", "Código de acesso da IA incorreto. Confira em Ajustes › IA.");
    caller = { kind: "codigo" };
  }
  const unlimited = caller.kind === "codigo" || caller.owner;

  const raw = await request.text();
  if (raw.length > (unlimited ? MAX_BODY : MAX_BODY_PLAN)) return fail(413, "erro", "O conteúdo enviado é grande demais. Escolha menos aulas.");
  let body: Body;
  try {
    body = JSON.parse(raw) as Body;
  } catch {
    return fail(400, "erro", "Pedido inválido.");
  }
  if (!ACTIONS.has(body.action)) return fail(400, "erro", "Ação desconhecida.");
  const search = body.action === "aprofundar";
  const model = unlimited ? (MODELS.has(body.model) ? body.model : "claude-opus-5-5") : planModel(search);
  const input = body.input && typeof body.input === "object" ? body.input : {};
  const { system, user, web } = buildPrompt(body.action, input);
  const schema = isJsonAction(body.action) ? SCHEMAS[body.action] : null;

  /* ---------- cota do mês e teto de gasto ---------- */
  let reservation: number | null = null;
  if (caller.kind === "conta" && sb) {
    const budget = Number(process.env.AI_MONTHLY_BUDGET_USD);
    if (!caller.owner && Number.isFinite(budget) && budget > 0) {
      const { data: spent } = await sb.rpc("month_ai_cost");
      if (Number(spent) >= budget) return fail(503, "pausada", "A IA está pausada até o começo do próximo mês. Seus dados e o resto do app seguem normais.");
    }
    const kind = search ? "pesquisa" : "acao";
    const limit = limitsFor(caller.plan, caller.owner)[kind];
    if (limit === 0) {
      return fail(402, "sem-cota", search
        ? "A pesquisa a fundo com fontes faz parte do Plus."
        : "A IA faz parte do Plus. Assine para continuar.");
    }
    const { data: id, error } = await sb.rpc("reserve_ai", { uid: caller.userId, p_action: body.action, p_kind: kind, p_limit: limit });
    if (error) return fail(503, "erro", "Não consegui conferir sua cota agora. Tente de novo.");
    if (id === null) {
      return fail(429, "cota", caller.plan === "plus"
        ? `Você usou ${search ? "as pesquisas" : "as ações de IA"} deste mês (${limit}). A cota renova no dia 1º.`
        : `Você usou as ${limit} ações grátis deste mês. Assine o Plus para ter mais.`);
    }
    reservation = Number(id);
  }
  const release = async () => {
    if (reservation !== null && sb) await sb.from("ai_usage").delete().eq("id", reservation);
    reservation = null;
  };
  const record = async (servedModel: string, inputTokens: number, outputTokens: number, searches: number) => {
    if (reservation === null || !sb) return;
    await sb
      .from("ai_usage")
      .update({
        model: servedModel,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost_usd: Number(estimateCost(servedModel, inputTokens, outputTokens, searches).toFixed(5)),
      })
      .eq("id", reservation);
  };
  const fallbacks = model === "claude-haiku-5-5" ? {} : { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const };

  const client = new Anthropic();
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      let inputTokens = 0;
      let outputTokens = 0;
      let searches = 0;
      let servedModel = model;
      try {
        const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: user }];
        const tools: Anthropic.Beta.BetaToolUnion[] | undefined = web
          ? [
              model === "claude-haiku-5-5"
                ? { type: "web_search_20250305", name: "web_search", max_uses: 6 }
                : { type: "web_search_20260209", name: "web_search", max_uses: 8 },
            ]
          : undefined;
        let finalText = "";
        const citations = new Map<string, string>();
        for (let turn = 0; turn < 5; turn++) {
          const run = client.beta.messages.stream(
            {
              model,
              max_tokens: schema ? 16000 : web || body.action === "relatorio" ? 32000 : 16000,
              system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
              messages,
              ...(tools ? { tools } : {}),
              output_config: {
                effort: EFFORT[body.action] ?? "medium",
                ...(schema ? { format: { type: "json_schema", schema } } : {}),
              },
              ...fallbacks,
            },
            { signal: request.signal },
          );
          for await (const event of run) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta" && !schema) {
              send({ type: "text", text: event.delta.text });
            }
          }
          const message = await run.finalMessage();
          servedModel = message.model;
          inputTokens += message.usage.input_tokens + (message.usage.cache_read_input_tokens ?? 0) + (message.usage.cache_creation_input_tokens ?? 0);
          outputTokens += message.usage.output_tokens;
          searches += message.usage.server_tool_use?.web_search_requests ?? 0;
          for (const block of message.content) {
            if (block.type === "text") {
              finalText += block.text;
              for (const citation of block.citations ?? []) {
                if (citation.type === "web_search_result_location" && citation.url) citations.set(citation.url, citation.title ?? citation.url);
              }
            }
          }
          if (message.stop_reason === "refusal") {
            await release();
            send({ type: "error", code: "recusa", message: "A IA preferiu não responder a este pedido. Tente reformular." });
            controller.close();
            return;
          }
          if (message.stop_reason === "pause_turn") {
            messages.push({ role: "assistant", content: message.content });
            continue;
          }
          break;
        }
        if (citations.size > 0 && !schema) {
          const list = [...citations].slice(0, 15).map(([url, title]) => `- [${title.replace(/[[\]]/g, "")}](${url})`).join("\n");
          send({ type: "text", text: `\n\n---\n**Fontes da pesquisa:**\n${list}\n` });
        }
        let json: unknown = null;
        if (schema) {
          try {
            json = JSON.parse(finalText);
          } catch {
            await release();
            send({ type: "error", code: "erro", message: "A IA devolveu um formato inesperado. Tente de novo." });
            controller.close();
            return;
          }
        }
        await record(servedModel, inputTokens, outputTokens, searches);
        send({ type: "done", model: servedModel, json, usage: { input: inputTokens, output: outputTokens, searches } });
      } catch (error) {
        if (error instanceof Anthropic.APIUserAbortError || (error as Error)?.name === "AbortError" || request.signal.aborted) {
          // a pessoa cancelou: o que já foi gerado conta na cota
          controller.close();
          return;
        }
        await release().catch(() => undefined);
        let message = "A IA não conseguiu terminar. Tente de novo.";
        let code = "erro";
        if (!unlimited && (error instanceof Anthropic.AuthenticationError || (error instanceof Anthropic.BadRequestError && /credit|balance/i.test(error.message)))) {
          console.error("ia: configuração do servidor", error);
          message = "A IA está indisponível agora. Já fomos avisados; tente mais tarde.";
          code = "pausada";
        } else if (error instanceof Anthropic.AuthenticationError) {
          message = "A chave da Anthropic no servidor é inválida.";
          code = "sem-chave";
        } else if (error instanceof Anthropic.RateLimitError) {
          message = "A IA está com muitos pedidos agora. Espere um pouco.";
          code = "limite";
        } else if (error instanceof Anthropic.BadRequestError) {
          message = /credit|balance/i.test(error.message)
            ? "Os créditos da conta da Anthropic acabaram. Recarregue no console da Anthropic."
            : "O pedido não foi aceito pela IA. Tente com menos conteúdo.";
        } else if (error instanceof Anthropic.APIError) {
          message = `A IA está indisponível agora (erro ${error.status ?? "?"}). Tente daqui a pouco.`;
        }
        send({ type: "error", code, message });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" },
  });
}
