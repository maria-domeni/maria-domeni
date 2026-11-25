"use client";

import NextLink from "next/link";
import { useState, type FormEvent } from "react";

const SEMESTRES = ["1º", "2º", "3º", "4º", "5º", "6º", "7º", "8º", "9º", "10º", "Já me formei"];
const FERRAMENTAS = ["Caderno de papel", "GoodNotes", "Notability", "Notion", "Word/Google Docs", "Outra"];
const PRECO = ["Até R$ 10 por mês", "R$ 10 a R$ 20 por mês", "R$ 20 a R$ 30 por mês", "Só usaria de graça"];

const field =
  "h-11 w-full rounded-[10px] bg-fill px-3.5 text-[15.5px] text-label outline-none placeholder:text-label-3 focus:ring-2 focus:ring-accent";

/** Formulário da lista de lançamento (5 perguntas + consentimento). */
export function Waitlist() {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries()) as Record<string, string | boolean>;
    body.consent = form.get("consent") === "on";
    body.source = new URLSearchParams(window.location.search).get("utm_source") ?? "site";
    setState("sending");
    try {
      const response = await fetch("/api/lista", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(data.message ?? "Não deu certo. Tente de novo.");
      setState("done");
    } catch (error) {
      setMessage((error as Error).message);
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-[16px] bg-fill px-6 py-8 text-center">
        <p className="text-[20px] font-semibold">Você está na lista.</p>
        <p className="mx-auto mt-2 max-w-[420px] text-[15px] text-label-2">
          Obrigada pelas respostas! Elas decidem o que vem primeiro. Em janeiro chega o planner do semestre no seu e-mail.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-medium text-label-2">Seu nome</span>
        <input name="name" autoComplete="given-name" className={field} placeholder="Como te chamamos" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-medium text-label-2">E-mail *</span>
        <input name="email" type="email" required autoComplete="email" className={field} placeholder="voce@email.com" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-medium text-label-2">Em que semestre você está?</span>
        <select name="semestre" className={field} defaultValue="">
          <option value="" disabled>Escolha</option>
          {SEMESTRES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-medium text-label-2">Faculdade e curso</span>
        <input name="faculdade" className={field} placeholder="Ex.: Psicologia na UFX" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-medium text-label-2">O que você usa hoje para estudar?</span>
        <select name="ferramenta" className={field} defaultValue="">
          <option value="" disabled>Escolha</option>
          {FERRAMENTAS.map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-medium text-label-2">Quanto pagaria por um app assim?</span>
        <select name="quanto_pagaria" className={field} defaultValue="">
          <option value="" disabled>Escolha</option>
          {PRECO.map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>
      <label className="block sm:col-span-2">
        <span className="mb-1.5 block text-[13px] font-medium text-label-2">Qual a sua maior dificuldade para estudar hoje?</span>
        <textarea name="dificuldade" rows={3} className={`${field} h-auto py-2.5`} placeholder="Pode ser sincera, é isso que guia o app." />
      </label>
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <label className="flex items-start gap-2.5 text-[13.5px] leading-[19px] text-label-2 sm:col-span-2">
        <input name="consent" type="checkbox" required className="mt-0.5 size-4 accent-[var(--accent)]" />
        <span>
          Quero receber e-mails do Domeni (planner, novidades e o aviso do lançamento). Posso sair quando quiser. Veja a{" "}
          <NextLink href="/privacidade" className="text-accent underline-offset-2 hover:underline">política de privacidade</NextLink>.
        </span>
      </label>
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={state === "sending"}
          className="h-12 w-full rounded-[12px] bg-label text-[16px] font-semibold text-bg disabled:opacity-60 sm:w-auto sm:px-8"
        >
          {state === "sending" ? "Enviando…" : "Entrar na lista"}
        </button>
        {state === "error" ? <p className="mt-2 text-[14px] text-danger" role="alert">{message}</p> : null}
      </div>
    </form>
  );
}
