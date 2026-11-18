"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { FileUp, Plus, ShieldAlert, Sparkles, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Markdown } from "@/components/ui/Markdown";
import { Page, ScreenSkeleton, Tabs } from "@/components/shell/Page";
import { Button, Card, EmptyState, IconButton, Link, ProgressBar, Section } from "@/components/ui/basics";
import { Field, TextArea, TextInput } from "@/components/ui/fields";
import { Sheet, useConfirm, useToast } from "@/components/ui/overlays";
import { AiError, askAi } from "@/lib/ai";
import { deliverFile } from "@/lib/backup";
import { db } from "@/lib/db";
import { formatShort, todayISO } from "@/lib/dates";
import { useSettingsOrDefault, useToday } from "@/lib/hooks";
import { closePdf, extractText, openPdf } from "@/lib/pdf";
import { navigate } from "@/lib/router";
import {
  createFieldNote,
  createInternship,
  deleteFieldNote,
  deleteInternship,
  deleteReport,
  saveReport,
  updateInternship,
} from "@/lib/store";
import type { Internship, Report } from "@/lib/types";

const PRIVACY =
  "Nunca registre nome ou qualquer dado que identifique pessoa atendida (nome, iniciais reais, endereço, telefone, documento, foto). Use descrições genéricas, como “usuária A.”.";

/** Aviso fixo de sigilo, mostrado em toda a área de estágio. */
function PrivacyBanner() {
  return (
    <div className="flex gap-3 rounded-2xl border-2 border-warning/40 bg-warning-soft px-4 py-3 text-[14.5px] leading-[20px]" role="note">
      <ShieldAlert size={22} className="mt-0.5 flex-none text-warning" />
      <p>
        <b>Sigilo:</b> {PRIVACY}
      </p>
    </div>
  );
}

export default function InternshipScreen({ id }: { id: string | null }) {
  if (id) return <InternshipDetail id={id} />;
  return <InternshipList />;
}

function InternshipList() {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const data = useLiveQuery(async () => {
    const [internships, notes] = await Promise.all([db.internships.toArray(), db.fieldNotes.toArray()]);
    return { internships, notes };
  }, []);
  if (!data) return <ScreenSkeleton />;
  return (
    <Page
      title="Estágio"
      subtitle="Diário de campo, horas e relatórios — com um agente especialista em relatório."
      actions={
        <Button size="sm" icon={Plus} onClick={() => setCreating(true)}>
          Estágio
        </Button>
      }
    >
      <div className="mt-3">
        <PrivacyBanner />
      </div>
      {data.internships.length === 0 ? (
        <div className="mt-6">
          <EmptyState emoji="🩺" title="Cadastre o seu estágio" action={<Button onClick={() => setCreating(true)}>Novo estágio</Button>}>
            Ex.: Estágio Básico em Psicologia Social. Você registra as idas a campo, soma as horas e gera o relatório.
          </EmptyState>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {data.internships.map((internship) => {
            const hours = data.notes.filter((n) => n.internshipId === internship.id).reduce((s, n) => s + n.hours, 0);
            return (
              <Link key={internship.id} to={`#/estagio/${internship.id}`} className="lift card block px-5 py-4">
                <p className="text-[17px] font-bold">🩺 {internship.name}</p>
                <p className="text-[13.5px] text-label-2">{internship.place || "Local a definir"}</p>
                <p className="mt-2 text-[14px] font-bold">
                  {hours.toLocaleString("pt-BR")} h{internship.requiredHours ? ` de ${internship.requiredHours} h` : ""}
                </p>
                {internship.requiredHours ? <ProgressBar ratio={hours / internship.requiredHours} className="mt-1.5" /> : null}
              </Link>
            );
          })}
        </div>
      )}
      <Sheet
        open={creating}
        onClose={() => setCreating(false)}
        title="Novo estágio"
        submitLabel="Criar"
        canSubmit={name.trim().length > 0}
        onSubmit={async () => {
          const created = await createInternship({ name });
          setName("");
          navigate(`#/estagio/${created.id}`);
        }}
      >
        <Field label="Nome">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Estágio Básico em Psicologia Social" autoFocus />
        </Field>
      </Sheet>
    </Page>
  );
}

function InternshipDetail({ id }: { id: string }) {
  const today = useToday();
  const confirm = useConfirm();
  const [tab, setTab] = useState<"diario" | "relatorios" | "dados">("diario");
  const [noteText, setNoteText] = useState("");
  const [noteDate, setNoteDate] = useState(todayISO());
  const [noteHours, setNoteHours] = useState("4");
  const [openReport, setOpenReport] = useState<Report | null>(null);
  const [agent, setAgent] = useState(false);
  const data = useLiveQuery(async () => {
    const internship = (await db.internships.get(id)) ?? null;
    const [notes, reports] = await Promise.all([
      db.fieldNotes.where("internshipId").equals(id).toArray(),
      db.reports.where("internshipId").equals(id).toArray(),
    ]);
    notes.sort((a, b) => b.date.localeCompare(a.date));
    reports.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return { internship, notes, reports };
  }, [id]);
  if (!data) return <ScreenSkeleton />;
  if (!data.internship) {
    return (
      <Page title="Estágio" back={{ to: "#/estagio", label: "Estágio" }}>
        <div className="mt-6">
          <EmptyState emoji="🫥" title="Esse estágio não existe mais" />
        </div>
      </Page>
    );
  }
  const internship = data.internship;
  const hours = data.notes.reduce((s, n) => s + n.hours, 0);

  return (
    <Page
      title={internship.name}
      back={{ to: "#/estagio", label: "Estágio" }}
      subtitle={`${hours.toLocaleString("pt-BR")} horas registradas${internship.requiredHours ? ` de ${internship.requiredHours}` : ""}`}
      actions={
        <IconButton
          icon={Trash2}
          label="Apagar estágio"
          tone="neutral"
          onClick={async () => {
            if (!(await confirm({ title: "Apagar este estágio?", message: "O diário de campo será apagado. Os relatórios ficam guardados.", confirmLabel: "Apagar", destructive: true }))) return;
            await deleteInternship(id);
            navigate("#/estagio", { replace: true });
          }}
        />
      }
    >
      {internship.requiredHours ? <ProgressBar ratio={hours / internship.requiredHours} className="mt-1 max-w-[420px]" /> : null}
      <div className="mt-4">
        <PrivacyBanner />
      </div>
      <Tabs
        className="mt-4"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "diario", label: "📓 Diário de campo", badge: data.notes.length || undefined },
          { value: "relatorios", label: "📄 Relatórios", badge: data.reports.length || undefined },
          { value: "dados", label: "⚙️ Dados" },
        ]}
      />

      {tab === "diario" ? (
        <>
          <Card className="mt-4 space-y-3 px-4 py-4">
            <div className="grid grid-cols-2 gap-3 sm:max-w-[360px]">
              <Field label="Data">
                <TextInput type="date" value={noteDate} onChange={(e) => setNoteDate(e.target.value)} />
              </Field>
              <Field label="Horas">
                <TextInput inputMode="decimal" value={noteHours} onChange={(e) => setNoteHours(e.target.value.replace(/[^\d,.]/g, ""))} />
              </Field>
            </div>
            <Field label="O que aconteceu (sem identificar ninguém)">
              <TextArea value={noteText} onChange={(e) => setNoteText(e.target.value)} minRows={4} placeholder="Atividades, observações, falas importantes do profissional, impressões, articulações com a teoria…" />
            </Field>
            <Button
              icon={Plus}
              disabled={!noteText.trim()}
              onClick={async () => {
                await createFieldNote({ internshipId: id, date: noteDate || todayISO(), hours: Number(noteHours.replace(",", ".")) || 0, text: noteText.trim() });
                setNoteText("");
              }}
            >
              Registrar ida a campo
            </Button>
          </Card>
          <div className="mt-4 space-y-3">
            {data.notes.map((note) => (
              <Card key={note.id} className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <p className="flex-1 text-[14px] font-bold text-accent">
                    {formatShort(note.date, today)} · {note.hours.toLocaleString("pt-BR")} h
                  </p>
                  <button type="button" aria-label="Apagar registro" onClick={() => void deleteFieldNote(note.id)} className="pressable inline-flex size-8 items-center justify-center rounded-full text-label-3">
                    <Trash2 size={15} />
                  </button>
                </div>
                <p className="mt-1 text-[15px] leading-[22px] whitespace-pre-wrap">{note.text}</p>
              </Card>
            ))}
          </div>
        </>
      ) : null}

      {tab === "relatorios" ? (
        <>
          <Card className="washi mt-6 overflow-visible px-5 pt-6 pb-5">
            <p className="font-display text-[22px] font-bold">Agente de relatório de estágio</p>
            <p className="mt-1 text-[15px] leading-[22px] text-label-2">
              Já treinado no formato do seu relatório (I – Identificação, II – Descrição da demanda, III – Procedimento,
              IV – Análise, V – Conclusão, Referências e Anexos), com linguagem acadêmica e cuidado ético. Ele usa o seu
              diário de campo, a transcrição e as referências que você indicar — sem inventar dados nem citações.
            </p>
            <Button className="mt-4" icon={Sparkles} onClick={() => setAgent(true)}>
              Escrever relatório com o agente
            </Button>
          </Card>
          <Section title="Relatórios" emoji="📄">
            {data.reports.length === 0 ? (
              <Card className="px-5 py-4 text-[15px] text-label-2">Os relatórios gerados e os que você escrever ficam aqui.</Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {data.reports.map((report) => (
                  <button key={report.id} type="button" onClick={() => setOpenReport(report)} className="lift card px-4 py-3 text-left">
                    <p className="font-bold">📄 {report.title}</p>
                    <p className="text-[13px] text-label-2">atualizado em {formatShort(report.updatedAt.slice(0, 10), today)}</p>
                  </button>
                ))}
              </div>
            )}
          </Section>
        </>
      ) : null}

      {tab === "dados" ? <InternshipData internship={internship} /> : null}

      <ReportAgent open={agent} onClose={() => setAgent(false)} internship={internship} onDone={(r) => setOpenReport(r)} />
      <ReportEditor report={openReport} onClose={() => setOpenReport(null)} />
    </Page>
  );
}

function InternshipData({ internship }: { internship: Internship }) {
  const patch = (p: Partial<Internship>) => void updateInternship(internship.id, p);
  return (
    <Card className="mt-4 grid gap-4 px-4 py-4 sm:grid-cols-2">
      <Field label="Nome">
        <TextInput value={internship.name} onChange={(e) => patch({ name: e.target.value })} />
      </Field>
      <Field label="Local / serviço">
        <TextInput value={internship.place} onChange={(e) => patch({ place: e.target.value })} placeholder="Ex.: Serviço de acolhimento" />
      </Field>
      <Field label="Supervisor(a)">
        <TextInput value={internship.supervisor} onChange={(e) => patch({ supervisor: e.target.value })} placeholder="Nome e CRP" />
      </Field>
      <Field label="Horas exigidas" hint="Conforme a sua faculdade">
        <TextInput inputMode="numeric" value={internship.requiredHours ?? ""} onChange={(e) => patch({ requiredHours: e.target.value ? Number(e.target.value.replace(/\D/g, "")) : null })} />
      </Field>
      <Field label="Início">
        <TextInput type="date" value={internship.start ?? ""} onChange={(e) => patch({ start: e.target.value || null })} />
      </Field>
      <Field label="Fim">
        <TextInput type="date" value={internship.end ?? ""} onChange={(e) => patch({ end: e.target.value || null })} />
      </Field>
      <Field label="Observações" className="sm:col-span-2">
        <TextArea value={internship.notes} onChange={(e) => patch({ notes: e.target.value })} minRows={3} placeholder="Objetivo do estágio, roteiro de entrevista, combinados com o supervisor…" />
      </Field>
    </Card>
  );
}

function ReportAgent({ open, onClose, internship, onDone }: { open: boolean; onClose: () => void; internship: Internship; onDone: (r: Report) => void }) {
  const toast = useToast();
  const settings = useSettingsOrDefault();
  const [request, setRequest] = useState("Escreva o relatório completo.");
  const [transcript, setTranscript] = useState("");
  const [references, setReferences] = useState("");
  const [model, setModel] = useState("");
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadModel(file: File | undefined) {
    if (!file) return;
    try {
      const doc = await openPdf(await file.arrayBuffer());
      const pages = await extractText(doc);
      await closePdf(doc);
      setModel(pages.join("\n\n").slice(0, 60_000));
      toast("Relatório anterior carregado como modelo");
    } catch {
      toast("Não consegui ler este PDF.");
    }
  }

  async function run() {
    setBusy(true);
    setText("");
    try {
      const notes = await db.fieldNotes.where("internshipId").equals(internship.id).toArray();
      const res = await askAi(
        "relatorio",
        {
          course: settings.course,
          internship: { name: internship.name, place: internship.place, supervisor: internship.supervisor, notes: internship.notes },
          fieldNotes: notes.sort((a, b) => a.date.localeCompare(b.date)).map((n) => ({ date: n.date, hours: n.hours, text: n.text })),
          transcript,
          references,
          model,
          request,
        },
        { onText: setText },
      );
      const report = await saveReport({ internshipId: internship.id, title: `Relatório – ${internship.name}`, content: res.text });
      onClose();
      onDone(report);
    } catch (error) {
      toast(error instanceof AiError ? error.message : "O agente não conseguiu terminar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Agente de relatório" wide>
      <div className="space-y-4">
        <PrivacyBanner />
        <Field label="O que você quer?" hint="Ex.: só a Análise; revisar a Conclusão; relatório completo">
          <TextInput value={request} onChange={(e) => setRequest(e.target.value)} />
        </Field>
        <Field label="Transcrição da entrevista/visita (opcional)">
          <TextArea value={transcript} onChange={(e) => setTranscript(e.target.value)} minRows={4} placeholder="Cole aqui a transcrição revisada." />
        </Field>
        <Field label="Referências que quer usar (opcional)" hint="Só estas serão citadas no texto">
          <TextArea value={references} onChange={(e) => setReferences(e.target.value)} minRows={3} placeholder="SAWAIA, B. (org.). As artimanhas da exclusão…" />
        </Field>
        <div className="flex flex-wrap items-center gap-2">
          <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => void loadModel(e.target.files?.[0]).finally(() => (e.target.value = ""))} />
          <Button size="sm" variant="gray" icon={FileUp} onClick={() => fileRef.current?.click()}>
            {model ? "Trocar relatório-modelo" : "Usar um relatório anterior como modelo"}
          </Button>
          {model ? <span className="text-[13px] text-success">modelo carregado ✓</span> : null}
        </div>
        <p className="text-[13px] text-label-3">O diário de campo deste estágio é enviado junto automaticamente. Usa créditos da IA.</p>
        <Button size="lg" icon={Sparkles} disabled={busy} onClick={() => void run()}>
          {busy ? "Escrevendo…" : "Gerar"}
        </Button>
        {text ? (
          <Card className="px-5 py-4">
            <Markdown text={text} />
          </Card>
        ) : null}
      </div>
    </Sheet>
  );
}

function ReportEditor({ report, onClose }: { report: Report | null; onClose: () => void }) {
  const confirm = useConfirm();
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [preview, setPreview] = useState(true);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  if (report && report.id !== loadedId) {
    setLoadedId(report.id);
    setContent(report.content);
    setTitle(report.title);
  }
  return (
    <Sheet open={report !== null} onClose={onClose} title={title || "Relatório"} wide>
      {report ? (
        <div className="space-y-3">
          <div className="no-print flex flex-wrap gap-2">
            <Button size="sm" variant="gray" onClick={() => setPreview((v) => !v)}>
              {preview ? "Editar texto" : "Ver formatado"}
            </Button>
            <Button size="sm" variant="gray" onClick={() => window.print()}>
              Imprimir / PDF
            </Button>
            <Button
              size="sm"
              variant="gray"
              onClick={() => void deliverFile(new File([content], `${title || "relatorio"}.md`, { type: "text/markdown" }))}
            >
              Baixar
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={async () => {
                if (!(await confirm({ title: "Apagar este relatório?", confirmLabel: "Apagar", destructive: true }))) return;
                await deleteReport(report.id);
                onClose();
              }}
            >
              Apagar
            </Button>
          </div>
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => void saveReport({ id: report.id, title, content })} className="no-print" />
          {preview ? (
            <Card className="print-area px-6 py-5">
              <Markdown text={content} />
            </Card>
          ) : (
            <TextArea value={content} onChange={(e) => setContent(e.target.value)} onBlur={() => void saveReport({ id: report.id, title, content })} minRows={20} />
          )}
        </div>
      ) : null}
    </Sheet>
  );
}
