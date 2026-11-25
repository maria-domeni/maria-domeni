"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Bell, Download, ExternalLink, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { PresetPicker } from "@/components/forms/Onboarding";
import { Page } from "@/components/shell/Page";
import { Button, Card, Link, cx } from "@/components/ui/basics";
import { CustomColorSwatch, Field, Segmented, Select, Switch, TextInput } from "@/components/ui/fields";
import { ImageField } from "@/components/ui/media";
import { useConfirm, useToast } from "@/components/ui/overlays";
import { monthCost } from "@/lib/ai";
import { useAccount } from "@/lib/cloud/account";
import { backupSummary, BackupError, deliverBackup, eraseEverything, exportBackup, lastBackupDate, parseBackup, restoreBackup } from "@/lib/backup";
import { isGoogleIcsUrl } from "@/lib/calendar";
import { db } from "@/lib/db";
import { formatShort } from "@/lib/dates";
import { useSettingsOrDefault, useToday } from "@/lib/hooks";
import { cleanUrl, optionalNumber, THEME_PRESETS } from "@/lib/settings";
import { saveSettings } from "@/lib/store";
import { spotifyEmbedUrl } from "@/components/shell/music";
import {
  ACCENT_KEYS,
  ACCENT_LABEL,
  AI_MODEL_LABEL,
  FONT_HINT,
  FONT_KEYS,
  FONT_LABEL,
  PAPER_LABEL,
  TITLE_FONT_KEYS,
  TONES,
  TONE_LABEL,
  type AccentKey,
  type AiModel,
  type PaperStyle,
  type Settings,
  type TextScale,
  type ThemeMode,
} from "@/lib/types";

const ACCENT_SWATCH: Record<AccentKey, string> = {
  rosa: "#c24d78",
  cereja: "#8c3a5c",
  lilas: "#7d56c2",
  indigo: "#4b54c9",
  azul: "#0a66d8",
  verde: "#24804a",
  laranja: "#b9560e",
  grafite: "#1d1d1f",
};
const TONE_SWATCH: Record<string, string> = {
  neutro: "#ffffff",
  quente: "#f7f7f5",
  papel: "#f3f1ea",
};

function Group({ id, title, children, hint }: { id: string; title: string; children: ReactNode; hint?: string }) {
  return (
    <section id={`ajuste-${id}`} className="mt-8 scroll-mt-24">
      <h2 className="mb-1 text-[17px] font-semibold">{title}</h2>
      {hint ? <p className="mb-3 text-[14px] leading-5 text-label-2">{hint}</p> : <div className="mb-3" />}
      <Card className="space-y-5 px-4 py-5 sm:px-5">{children}</Card>
    </section>
  );
}

/** Campo numérico que salva ao sair (aceita vazio = não configurado). */
function NumberSetting({
  label,
  hint,
  value,
  onSave,
  decimal,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: number | null;
  onSave: (value: number | null) => void;
  decimal?: boolean;
  placeholder?: string;
}) {
  const [text, setText] = useState(value === null ? "" : String(value).replace(".", ","));
  return (
    <Field label={label} hint={hint}>
      <TextInput
        inputMode={decimal ? "decimal" : "numeric"}
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value.replace(decimal ? /[^\d,.]/g : /\D/g, ""))}
        onBlur={() => onSave(optionalNumber(text.replace(",", "."), 0, 10000))}
      />
    </Field>
  );
}

export default function SettingsScreen({ section }: { section: string | null }) {
  const settings = useSettingsOrDefault();
  const today = useToday();
  const toast = useToast();
  const confirm = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);
  const [cost, setCost] = useState<{ usd: number; calls: number } | null>(null);
  const [notifications, setNotifications] = useState<string>(() =>
    typeof Notification !== "undefined" ? Notification.permission : "default",
  );
  const save = (patch: Partial<Settings>) => void saveSettings(patch);
  const custom = (patch: Partial<Settings>) => save({ ...patch, preset: "personalizado" });
  const counts = useLiveQuery(async () => ({ images: await db.images.count(), files: await db.files.count() }), []);
  const account = useAccount();
  // modelo, código de acesso e gasto: só para a dona (ou sem contas configuradas)
  const ownerMode = account.status === "off" || (account.status === "signed-in" && !!account.info?.owner);

  useEffect(() => {
    void monthCost().then(setCost);
  }, []);

  useEffect(() => {
    if (!section) return;
    const t = window.setTimeout(() => document.getElementById(`ajuste-${section}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 250);
    return () => window.clearTimeout(t);
  }, [section]);

  async function restore(file: File | undefined) {
    if (!file) return;
    try {
      const backup = parseBackup(await file.text());
      const ok = await confirm({
        title: "Restaurar este backup?",
        message: `Os dados atuais serão trocados por: ${backupSummary(backup)}.`,
        confirmLabel: "Restaurar",
        destructive: true,
      });
      if (!ok) return;
      await restoreBackup(backup);
      toast("Backup restaurado");
    } catch (error) {
      toast(error instanceof BackupError ? error.message : "Não foi possível ler este arquivo.");
    }
  }

  const lastBackup = typeof window === "undefined" ? null : lastBackupDate();

  return (
    <Page title="Ajustes" subtitle="Deixe o Domeni do seu jeito. Tudo fica salvo no seu aparelho.">
      {account.status !== "off" ? (
        <Link to="#/conta" className="card row-pressable mt-6 flex items-center gap-3 px-4 py-3.5">
          <span className="flex size-9 flex-none items-center justify-center rounded-full bg-fill text-[15px] font-semibold uppercase">
            {account.status === "signed-in" ? account.user.email.slice(0, 1) : "?"}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15.5px] font-semibold">
              {account.status === "signed-in" ? account.user.email : "Entrar ou criar conta"}
            </span>
            <span className="block text-[13px] text-label-2">
              {account.status === "signed-in"
                ? account.info?.plan === "plus"
                  ? "Plus · sincronização e IA"
                  : "Grátis · conheça o Plus"
                : "Grátis. Para usar a IA e sincronizar aparelhos."}
            </span>
          </span>
          <span className="text-[13px] font-medium text-accent">Conta</span>
        </Link>
      ) : null}
      <Group id="perfil" title="Perfil">
        <ImageField imageId={settings.avatarImageId} onChange={(avatarImageId) => save({ avatarImageId })} maxEdge={512} label="foto" shape="round" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome">
            <TextInput defaultValue={settings.profileName} onBlur={(e) => save({ profileName: e.target.value.trim() })} />
          </Field>
          <Field label="Curso">
            <TextInput defaultValue={settings.course} onBlur={(e) => save({ course: e.target.value.trim() })} />
          </Field>
          <Field label="Faculdade">
            <TextInput defaultValue={settings.institution} onBlur={(e) => save({ institution: e.target.value.trim() })} />
          </Field>
          <Field label="Total de semestres do curso">
            <TextInput type="number" inputMode="numeric" defaultValue={settings.totalSemesters} onBlur={(e) => save({ totalSemesters: Number(e.target.value) || 10 })} />
          </Field>
        </div>
        <Link to="#/personagem" className="pressable inline-flex h-9 items-center rounded-[10px] bg-fill px-3.5 text-[14.5px] font-medium">
          Editar personagem ({settings.avatar.name}) →
        </Link>
      </Group>

      <Group id="aparencia" title="Aparência" hint="Escolha um estilo pronto e ajuste cada detalhe como quiser.">
        <PresetPicker
          value={settings.preset}
          onChange={(preset) => save({ preset, ...THEME_PRESETS[preset].values })}
        />
        <Segmented
          label="Tema"
          value={settings.theme}
          onChange={(theme: ThemeMode) => custom({ theme })}
          options={[
            { value: "auto", label: "Automático" },
            { value: "claro", label: "Claro" },
            { value: "escuro", label: "Escuro" },
          ]}
        />
        <div>
          <p className="mb-2 text-[13px] font-medium text-label-2">Tom</p>
          <div className="flex flex-wrap gap-2">
            {TONES.map((tone) => (
              <button
                key={tone}
                type="button"
                onClick={() => custom({ tone })}
                className={cx("pressable flex items-center gap-2 rounded-[10px] py-1.5 pr-3 pl-1.5 text-[14px] font-medium", settings.tone === tone ? "ring-2 ring-accent" : "bg-fill")}
              >
                <span className="size-6 rounded-[6px] shadow-[inset_0_0_0_1px_rgba(0,0,0,.15)]" style={{ background: TONE_SWATCH[tone] }} />
                {TONE_LABEL[tone]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-[13px] font-medium text-label-2">Cor de destaque</p>
          <div className="flex flex-wrap gap-2.5">
            {ACCENT_KEYS.map((accent) => (
              <button
                key={accent}
                type="button"
                aria-label={ACCENT_LABEL[accent]}
                title={ACCENT_LABEL[accent]}
                onClick={() => custom({ accent })}
                className={cx("pressable size-9 rounded-full", settings.accent === accent && "ring-2 ring-accent ring-offset-2 ring-offset-surface")}
                style={{ background: ACCENT_SWATCH[accent] }}
              />
            ))}
            <CustomColorSwatch
              value={settings.customAccent}
              selected={settings.accent === "personalizada"}
              onChange={(customAccent) => custom({ accent: "personalizada", customAccent })}
              label="Qualquer cor"
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fonte do texto">
            <Select value={settings.fontBody} onChange={(e) => custom({ fontBody: e.target.value as Settings["fontBody"] })}>
              {FONT_KEYS.map((f) => (
                <option key={f} value={f}>
                  {FONT_LABEL[f]}: {FONT_HINT[f]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Fonte dos títulos">
            <Select value={settings.fontTitle} onChange={(e) => custom({ fontTitle: e.target.value as Settings["fontTitle"] })}>
              {TITLE_FONT_KEYS.map((f) => (
                <option key={f} value={f}>
                  {FONT_LABEL[f]}: {FONT_HINT[f]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Folha das anotações" hint="Quadriculado, pautado ou pontilhado aparecem só nas aulas">
            <Select value={settings.paper} onChange={(e) => custom({ paper: e.target.value as PaperStyle })}>
              {(Object.keys(PAPER_LABEL) as PaperStyle[]).map((p) => (
                <option key={p} value={p}>
                  {PAPER_LABEL[p]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Segmented
          label="Tamanho do texto das anotações"
          value={settings.textScale}
          onChange={(textScale: TextScale) => save({ textScale })}
          options={[
            { value: "pequeno", label: "Pequeno" },
            { value: "padrao", label: "Padrão" },
            { value: "grande", label: "Grande" },
          ]}
        />
        <label className="flex items-center justify-between gap-3 text-[15px] font-medium">
          <span>
            Na folha, só a Apple Pencil escreve
            <span className="block text-[13px] font-normal text-label-2">O dedo rola a página; desligue para escrever com o dedo.</span>
          </span>
          <Switch checked={settings.pencilOnly} onChange={(pencilOnly) => save({ pencilOnly })} label="Só a Apple Pencil escreve" />
        </label>
      </Group>

      <Group
        id="regras"
        title="Regras da faculdade"
       
        hint="Use as regras da sua faculdade. O Domeni só faz as contas, e cada disciplina também pode ter a sua regra."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberSetting key={`Faltas permitidas por disciplina (aulas)-${String(settings.defaultAbsenceLimit)}`} label="Faltas permitidas por disciplina (aulas)" hint="Estágios não contam" value={settings.defaultAbsenceLimit} onSave={(v) => save({ defaultAbsenceLimit: v })} placeholder="ex.: 40" />
          <NumberSetting key={`Aulas em cada dia de aula-${String(settings.classesPerDay)}`} label="Aulas em cada dia de aula" value={settings.classesPerDay} onSave={(v) => save({ classesPerDay: v ?? 4 })} />
          <NumberSetting key={`Média para passar-${String(settings.passingGrade)}`} label="Média para passar" value={settings.passingGrade} onSave={(v) => save({ passingGrade: v })} decimal placeholder="ex.: 6" />
          <NumberSetting key={`Nota máxima-${String(settings.gradeMax)}`} label="Nota máxima" value={settings.gradeMax} onSave={(v) => save({ gradeMax: v ?? 10 })} decimal />
          <NumberSetting key={`Horas complementares exigidas-${String(settings.requiredComplementary)}`} label="Horas complementares exigidas" value={settings.requiredComplementary} onSave={(v) => save({ requiredComplementary: v })} />
          <NumberSetting key={`Horas de extensão exigidas-${String(settings.requiredExtension)}`} label="Horas de extensão exigidas" value={settings.requiredExtension} onSave={(v) => save({ requiredExtension: v })} />
        </div>
        <Field label="Revisões das aulas (dias depois da aula)" hint="Separe por vírgula. Padrão: 1, 7, 30">
          <TextInput
            defaultValue={settings.reviewIntervals.join(", ")}
            onBlur={(e) => save({ reviewIntervals: e.target.value.split(/[,;\s]+/).map(Number).filter((n) => n > 0) })}
          />
        </Field>
      </Group>

      <Group id="integracoes" title="Integrações">
        <Field
          label="Google Agenda (endereço secreto no formato iCal)"
          hint="No computador: Google Agenda › Configurações › sua agenda › “Endereço secreto no formato iCal”. Fica só no seu aparelho."
        >
          <TextInput
            defaultValue={settings.googleIcsUrl}
            placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
            onBlur={(e) => {
              const value = cleanUrl(e.target.value);
              if (e.target.value.trim() && !isGoogleIcsUrl(value)) {
                toast("Esse não parece o endereço iCal do Google Agenda (termina em .ics).");
                return;
              }
              save({ googleIcsUrl: value });
            }}
          />
        </Field>
        <Field label="Spotify (link de playlist, álbum ou podcast)" hint="No Spotify: Compartilhar › Copiar link. Para ouvir completo, entre na sua conta do Spotify neste navegador.">
          <TextInput
            defaultValue={settings.spotifyUrl}
            placeholder="https://open.spotify.com/playlist/…"
            onBlur={(e) => {
              const value = cleanUrl(e.target.value);
              if (e.target.value.trim() && !spotifyEmbedUrl(value)) {
                toast("Cole um link do open.spotify.com");
                return;
              }
              save({ spotifyUrl: value });
            }}
          />
        </Field>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="tinted"
            icon={Bell}
            onClick={async () => {
              if (typeof Notification === "undefined") {
                toast("Este navegador não mostra notificações. No iPad, instale o Domeni na tela de início.");
                return;
              }
              setNotifications(await Notification.requestPermission());
            }}
          >
            {notifications === "granted" ? "Notificações ligadas" : "Ligar notificações"}
          </Button>
          <span className="text-[13px] text-label-2">Avisos chegam com o Domeni aberto. Com ele fechado, use o Google Agenda.</span>
        </div>
      </Group>

      <Group id="ia" title="IA" hint="A IA só roda quando você toca num botão. Nada é feito em segundo plano.">
        <label className="flex items-center justify-between gap-3 text-[15px] font-medium">
          IA ligada
          <Switch checked={settings.aiEnabled} onChange={(aiEnabled) => save({ aiEnabled })} label="IA ligada" />
        </label>
        {ownerMode ? (
          <>
        <div>
          <p className="mb-2 text-[13px] font-medium text-label-2">Modelo</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(AI_MODEL_LABEL) as AiModel[]).map((model) => (
              <button
                key={model}
                type="button"
                onClick={() => save({ aiModel: model })}
                className={cx("pressable rounded-[10px] px-4 py-3 text-left", settings.aiModel === model ? "ring-2 ring-accent" : "bg-fill")}
              >
                <span className="block font-semibold">{AI_MODEL_LABEL[model].name}</span>
                <span className="block text-[13px] text-label-2">{AI_MODEL_LABEL[model].hint}</span>
              </button>
            ))}
          </div>
        </div>
        <Field label="Código de acesso da IA" hint="O mesmo código colocado no servidor (DOMENI_ACCESS_CODE). Protege seus créditos.">
          <TextInput type="password" defaultValue={settings.aiAccessCode} onBlur={(e) => save({ aiAccessCode: e.target.value.trim() })} autoComplete="off" />
        </Field>
        <div className="rounded-[10px] bg-fill px-4 py-3 text-[14px] leading-5">
          <p>
            <b>Gasto estimado este mês:</b> US$ {(cost?.usd ?? 0).toFixed(2)} em {cost?.calls ?? 0} pedidos.
          </p>
          <p className="mt-1 text-label-2">
            A IA usa a API da Anthropic, cobrada à parte do Claude Pro (pré-pago, no console da Anthropic). Dá para pôr um limite de gasto lá.
          </p>
          <a href="https://console.anthropic.com/settings/limits" target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 font-semibold text-accent">
            Limites no console <ExternalLink size={13} />
          </a>
        </div>
          </>
        ) : (
          <div className="rounded-[10px] bg-fill px-4 py-3 text-[14px] leading-5">
            {account.status === "signed-in" && account.info ? (
              <p>
                <b>Este mês:</b> {account.info.usage.acao}
                {account.info.limits.acao >= 0 ? ` de ${account.info.limits.acao}` : ""} ações de IA
                {account.info.limits.pesquisa > 0 ? ` e ${account.info.usage.pesquisa} de ${account.info.limits.pesquisa} pesquisas` : ""}.
              </p>
            ) : (
              <p>Entre na sua conta para usar a IA.</p>
            )}
            <Link to="#/conta" className="mt-1 inline-flex font-semibold text-accent">
              Ver conta e plano
            </Link>
          </div>
        )}
      </Group>

      <Group id="dados" title="Seus dados" hint="Tudo fica no seu aparelho. Faça backup de vez em quando (inclui fotos, PDFs e gravações).">
        <p className="text-[14.5px] text-label-2">
          {lastBackup ? `Último backup: ${formatShort(lastBackup, today)}.` : "Você ainda não fez backup."} {counts ? `${counts.images} imagens e ${counts.files} arquivos guardados.` : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            icon={Download}
            onClick={async () => {
              const result = await deliverBackup(await exportBackup());
              if (result !== "cancelado") toast("Backup pronto");
            }}
          >
            Fazer backup
          </Button>
          <Button variant="gray" icon={Upload} onClick={() => fileRef.current?.click()}>
            Restaurar
          </Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void restore(e.target.files?.[0]).finally(() => (e.target.value = ""))} />
          <Button
            variant="danger"
            icon={Trash2}
            onClick={async () => {
              const ok = await confirm({
                title: "Apagar tudo deste aparelho?",
                message: "Semestres, aulas, livros, gravações e ajustes serão apagados. Faça um backup antes.",
                confirmLabel: "Apagar tudo",
                destructive: true,
              });
              if (!ok) return;
              await eraseEverything();
              toast("Tudo apagado");
            }}
          >
            Apagar tudo
          </Button>
        </div>
      </Group>

      <Group id="instalar" title="Instalar no iPad e no celular">
        <ol className="list-decimal space-y-1.5 pl-5 text-[15px] leading-[22px]">
          <li>Abra o Domeni no Safari.</li>
          <li>Toque em Compartilhar (quadrado com a seta para cima).</li>
          <li>Escolha “Adicionar à Tela de Início”.</li>
          <li>Abra pelo ícone novo: ele funciona em tela cheia e sem internet.</li>
        </ol>
        <p className="text-[13.5px] text-label-2">No computador (Chrome ou Edge), use o ícone de instalar na barra de endereço.</p>
      </Group>
      <div className="h-10" />
    </Page>
  );
}
