"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { ArrowDown, ArrowUp, Ban, Check, Download, Minus, Plus, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ACCENT_SWATCH } from "@/components/forms/Onboarding";
import { Page, ScreenSkeleton } from "@/components/shell/Page";
import { Button, Card, IconButton, cx } from "@/components/ui/basics";
import {
  CustomColorSwatch,
  Segmented,
  Select,
  SettingRow,
  Switch,
  TextInput,
} from "@/components/ui/fields";
import { Avatar, ImageField } from "@/components/ui/media";
import { useConfirm, useToast } from "@/components/ui/overlays";
import {
  BackupError,
  backupSummary,
  deliverBackup,
  eraseEverything,
  exportBackup,
  lastBackupDate,
  parseBackup,
  restoreBackup,
} from "@/lib/backup";
import { db } from "@/lib/db";
import { formatRelative } from "@/lib/dates";
import { useSettings, useToday } from "@/lib/hooks";
import { saveSettings } from "@/lib/store";
import {
  ACCENT_KEYS,
  ACCENT_LABEL,
  COVER_LABEL,
  COVER_PRESETS,
  DEFAULT_SETTINGS,
  FONT_HINT,
  FONT_KEYS,
  FONT_LABEL,
  TITLE_FONT_KEYS,
  TODAY_SECTION_LABEL,
  type BackgroundStyle,
  type Settings,
  type TextScale,
  type ThemeMode,
  type TitleFontKey,
} from "@/lib/types";

const MAX_BACKUP_BYTES = 200 * 1024 * 1024;

/** Família usada para desenhar a amostra de cada fonte. */
const FONT_SAMPLE: Record<TitleFontKey, string> = {
  igual: "var(--f-app)",
  sistema: "var(--f-system)",
  inter: "var(--font-inter), var(--f-system)",
  nunito: "var(--font-nunito), var(--f-system)",
  lexend: "var(--font-lexend), var(--f-system)",
  lora: "var(--font-lora), Georgia, serif",
  fraunces: "var(--font-fraunces), Georgia, serif",
  caveat: "var(--font-caveat), cursive",
};

export default function SettingsScreen() {
  const settings = useSettings();
  const semesters = useLiveQuery(() => db.semesters.orderBy("number").toArray(), [], []);
  if (!settings) return <ScreenSkeleton />;
  return <SettingsBody settings={settings} semesters={semesters} />;
}

function SettingsBody({
  settings,
  semesters,
}: {
  settings: Settings;
  semesters: { id: string; number: number }[];
}) {
  const today = useToday();
  const toast = useToast();
  const confirm = useConfirm();
  const fileInput = useRef<HTMLInputElement>(null);
  const [backupDate, setBackupDate] = useState<string | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const granted = (await navigator.storage?.persisted?.()) ?? null;
      if (!alive) return;
      setBackupDate(lastBackupDate());
      setPersisted(granted);
      setStandalone(
        window.matchMedia("(display-mode: standalone)").matches ||
          (navigator as Navigator & { standalone?: boolean }).standalone === true,
      );
    })();
    return () => {
      alive = false;
    };
  }, []);

  const update = (patch: Partial<Settings>) => void saveSettings(patch);

  async function doExport() {
    const result = await deliverBackup(await exportBackup());
    if (result === "cancelado") return;
    setBackupDate(lastBackupDate());
    toast(result === "baixado" ? "Backup baixado" : "Backup salvo");
  }

  async function doImport(file: File) {
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new BackupError("Arquivo grande demais para um backup do Atlas.");
      const backup = parseBackup(await file.text());
      const ok = await confirm({
        title: "Restaurar este backup?",
        message: `Ele contém ${backupSummary(backup)}. Os dados atuais deste aparelho serão substituídos.`,
        confirmLabel: "Restaurar",
        destructive: true,
      });
      if (!ok) return;
      await restoreBackup(backup);
      toast("Backup restaurado");
    } catch (error) {
      await confirm({
        title: "Não foi possível restaurar",
        message: error instanceof BackupError ? error.message : "O arquivo não pôde ser lido.",
        confirmLabel: "Entendi",
        cancelLabel: "Fechar",
      });
    }
  }

  async function doErase() {
    const ok = await confirm({
      title: "Apagar todos os dados?",
      message:
        "Semestres, disciplinas, aulas, imagens, revisões, prazos e ajustes deste aparelho serão apagados. Não dá para desfazer.",
      confirmLabel: "Apagar tudo",
      destructive: true,
    });
    if (!ok) return;
    await eraseEverything();
    toast("Dados apagados");
  }

  function moveSection(index: number, delta: number) {
    const next = [...settings.todaySections];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    update({ todaySections: next });
  }

  const cover = settings.todayCover;

  return (
    <Page title="Ajustes">
      <Group title="Perfil">
        <div className="flex items-center gap-4 px-4 py-3.5">
          <ImageField
            shape="round"
            label="foto"
            maxEdge={512}
            imageId={settings.avatarImageId}
            onChange={(avatarImageId) => update({ avatarImageId })}
            placeholder={<Avatar imageId={null} name={settings.profileName} size={72} />}
          />
        </div>
        <SettingRow label="Seu nome" htmlFor="perfil-nome">
          <CommitInput
            id="perfil-nome"
            value={settings.profileName}
            placeholder="Opcional"
            onCommit={(value) => update({ profileName: value })}
          />
        </SettingRow>
        <SettingRow label="Curso" htmlFor="perfil-curso">
          <CommitInput id="perfil-curso" value={settings.course} onCommit={(value) => update({ course: value })} />
        </SettingRow>
        <SettingRow label="Instituição" htmlFor="perfil-instituicao">
          <CommitInput
            id="perfil-instituicao"
            value={settings.institution}
            onCommit={(value) => update({ institution: value })}
          />
        </SettingRow>
        <SettingRow label="Semestres do curso">
          <Stepper
            label="Semestres do curso"
            value={settings.totalSemesters}
            min={1}
            max={20}
            onChange={(value) => update({ totalSemesters: value })}
          />
        </SettingRow>
        <SettingRow
          label="Semestre atual"
          description="Define o que aparece na barra lateral e na tela Hoje."
          htmlFor="perfil-semestre"
        >
          <Select
            id="perfil-semestre"
            value={settings.currentSemesterId ?? ""}
            onChange={(e) => update({ currentSemesterId: e.target.value || null })}
            className="!h-10 !w-auto min-w-[150px]"
          >
            <option value="">Automático</option>
            {semesters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.number}º semestre
              </option>
            ))}
          </Select>
        </SettingRow>
      </Group>

      <Group title="Aparência">
        <Block label="Tema">
          <Segmented<ThemeMode>
            label="Tema"
            value={settings.theme}
            onChange={(theme) => update({ theme })}
            options={[
              { value: "auto", label: "Automático" },
              { value: "claro", label: "Claro" },
              { value: "escuro", label: "Escuro" },
            ]}
          />
        </Block>
        <Block label="Cor de destaque">
          <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Cor de destaque">
            {ACCENT_KEYS.map((accent) => {
              const selected = settings.accent === accent;
              return (
                <button
                  key={accent}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={ACCENT_LABEL[accent]}
                  title={ACCENT_LABEL[accent]}
                  onClick={() => update({ accent })}
                  className="pressable inline-flex size-10 items-center justify-center rounded-full text-white"
                  style={{
                    backgroundColor: ACCENT_SWATCH[accent],
                    boxShadow: selected
                      ? `0 0 0 3px var(--surface), 0 0 0 5px ${ACCENT_SWATCH[accent]}`
                      : undefined,
                  }}
                >
                  {selected ? <Check size={19} strokeWidth={3} /> : null}
                </button>
              );
            })}
            <CustomColorSwatch
              value={settings.customAccent}
              selected={settings.accent === "personalizada"}
              onChange={(customAccent) => update({ accent: "personalizada", customAccent })}
              label="Escolher outra cor de destaque"
            />
          </div>
        </Block>
        <Block label="Fundo" hint="Aurora põe um brilho suave na cor de destaque atrás das telas.">
          <Segmented<BackgroundStyle>
            label="Fundo"
            value={settings.background}
            onChange={(background) => update({ background })}
            options={[
              { value: "liso", label: "Liso" },
              { value: "suave", label: "Colorido" },
              { value: "aurora", label: "Aurora" },
            ]}
          />
        </Block>
        <Block label="Fonte do app">
          <FontPicker
            label="Fonte do app"
            options={FONT_KEYS}
            value={settings.fontBody}
            onChange={(fontBody) => update({ fontBody: fontBody as Settings["fontBody"] })}
          />
        </Block>
        <Block label="Fonte dos títulos">
          <FontPicker
            label="Fonte dos títulos"
            options={TITLE_FONT_KEYS}
            value={settings.fontTitle}
            onChange={(fontTitle) => update({ fontTitle })}
          />
        </Block>
        <Block label="Tamanho do texto das anotações">
          <Segmented<TextScale>
            label="Tamanho do texto das anotações"
            value={settings.textScale}
            onChange={(textScale) => update({ textScale })}
            options={[
              { value: "pequeno", label: "Pequeno" },
              { value: "padrao", label: "Padrão" },
              { value: "grande", label: "Grande" },
            ]}
          />
        </Block>
      </Group>

      <Group title="Tela Hoje" footer="Escolha a capa do topo e quais blocos aparecem, na ordem que preferir.">
        <Block label="Capa">
          <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Capa da tela Hoje">
            <button
              type="button"
              role="radio"
              aria-checked={cover.kind === "nenhuma"}
              aria-label="Sem capa"
              title="Sem capa"
              onClick={() => update({ todayCover: { ...cover, kind: "nenhuma" } })}
              className={cx(
                "pressable inline-flex h-12 w-[68px] items-center justify-center rounded-[13px] bg-fill text-label-2",
                cover.kind === "nenhuma" && "shadow-[0_0_0_3px_var(--surface),0_0_0_5px_var(--accent)]",
              )}
            >
              <Ban size={19} strokeWidth={2.2} />
            </button>
            {COVER_PRESETS.map((preset) => {
              const selected = cover.kind === "predefinida" && cover.preset === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={COVER_LABEL[preset]}
                  title={COVER_LABEL[preset]}
                  onClick={() => update({ todayCover: { ...cover, kind: "predefinida", preset } })}
                  className={cx(
                    `cover cover-${preset} pressable inline-flex h-12 w-[68px] items-center justify-center rounded-[13px]`,
                    selected && "shadow-[0_0_0_3px_var(--surface),0_0_0_5px_var(--accent)]",
                  )}
                >
                  {selected ? <Check size={19} strokeWidth={3} /> : null}
                </button>
              );
            })}
          </div>
          <div className="mt-4">
            <p className="mb-2 text-[14px] font-semibold text-label-2">Ou use uma imagem sua</p>
            <ImageField
              label="imagem"
              maxEdge={2000}
              imageId={cover.kind === "imagem" ? cover.imageId : null}
              onChange={(imageId) =>
                update({
                  todayCover: imageId
                    ? { ...cover, kind: "imagem", imageId }
                    : { ...cover, kind: "predefinida", imageId: null },
                })
              }
            />
          </div>
        </Block>
        {settings.todaySections.map((section, index) => (
          <div key={section.key} className="flex min-h-[56px] items-center gap-2 py-1.5 pr-4 pl-2">
            <IconButton
              icon={ArrowUp}
              label={`Subir ${TODAY_SECTION_LABEL[section.key]}`}
              tone="neutral"
              disabled={index === 0}
              onClick={() => moveSection(index, -1)}
              className="!size-9"
            />
            <IconButton
              icon={ArrowDown}
              label={`Descer ${TODAY_SECTION_LABEL[section.key]}`}
              tone="neutral"
              disabled={index === settings.todaySections.length - 1}
              onClick={() => moveSection(index, 1)}
              className="!size-9"
            />
            <span className={cx("min-w-0 flex-1 truncate text-[17px]", !section.visible && "text-label-3")}>
              {TODAY_SECTION_LABEL[section.key]}
            </span>
            <Switch
              label={`Mostrar ${TODAY_SECTION_LABEL[section.key]}`}
              checked={section.visible}
              onChange={(visible) =>
                update({
                  todaySections: settings.todaySections.map((s) =>
                    s.key === section.key ? { ...s, visible } : s,
                  ),
                })
              }
            />
          </div>
        ))}
      </Group>

      <Group
        title="Revisão espaçada"
        footer="Mudar os intervalos reagenda as revisões pendentes de todas as aulas. As já feitas não mudam."
      >
        <IntervalsEditor
          key={settings.reviewIntervals.join(",")}
          intervals={settings.reviewIntervals}
          onChange={(value) => update({ reviewIntervals: value })}
        />
        <SettingRow
          label="Reforço quando for Difícil"
          description="Agenda uma revisão extra ao marcar uma revisão como Difícil."
        >
          <Switch
            label="Reforço quando for Difícil"
            checked={settings.hardReinforceDays > 0}
            onChange={(on) => update({ hardReinforceDays: on ? DEFAULT_SETTINGS.hardReinforceDays : 0 })}
          />
        </SettingRow>
        {settings.hardReinforceDays > 0 ? (
          <SettingRow label="Dias até o reforço">
            <Stepper
              label="Dias até o reforço"
              value={settings.hardReinforceDays}
              min={1}
              max={60}
              onChange={(value) => update({ hardReinforceDays: value })}
            />
          </SettingRow>
        ) : null}
      </Group>

      <Group
        title="Seus dados"
        footer={
          persisted === false
            ? "Tudo fica guardado só neste aparelho. Instale o Atlas na Tela de Início e faça backup com frequência: o navegador pode limpar dados de sites pouco usados."
            : "Tudo fica guardado só neste aparelho. O backup é um arquivo .json, com as imagens, que você pode salvar no app Arquivos, no iCloud ou no computador."
        }
      >
        <SettingRow
          label="Fazer backup"
          description={
            backupDate ? `Último backup ${formatRelative(backupDate, today)}.` : "Nenhum backup feito ainda."
          }
        >
          <Button size="sm" variant="tinted" icon={Download} onClick={() => void doExport()}>
            Exportar
          </Button>
        </SettingRow>
        <SettingRow label="Restaurar backup" description="Substitui os dados deste aparelho pelos do arquivo.">
          <Button size="sm" variant="gray" icon={Upload} onClick={() => fileInput.current?.click()}>
            Escolher arquivo
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label="Arquivo de backup"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void doImport(file);
            }}
          />
        </SettingRow>
        <SettingRow label="Apagar todos os dados">
          <Button size="sm" variant="danger" icon={Trash2} onClick={() => void doErase()}>
            Apagar
          </Button>
        </SettingRow>
      </Group>

      {!standalone ? (
        <Group title="Instalar no iPad ou no celular">
          <ol className="list-decimal space-y-1.5 py-3.5 pr-4 pl-9 text-[16px] leading-[22px]">
            <li>Abra o Atlas no navegador (Safari no iPad e no iPhone).</li>
            <li>Toque em Compartilhar, ou no menu do navegador.</li>
            <li>Escolha “Adicionar à Tela de Início” ou “Instalar app”.</li>
          </ol>
          <p className="px-4 pb-3.5 text-[14px] leading-[19px] text-label-2">
            Instalado, o Atlas abre em tela cheia e funciona sem internet.
          </p>
        </Group>
      ) : null}

      <p className="mt-8 px-1 text-center text-[13px] text-label-3">Atlas</p>
    </Page>
  );
}

function Group({ title, footer, children }: { title: string; footer?: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-2 px-4 text-[13px] font-semibold tracking-[0.03em] text-label-2 uppercase">{title}</h2>
      <Card className="divide-y divide-sep">{children}</Card>
      {footer ? <p className="mt-2 px-4 text-[13.5px] leading-[18px] text-label-2">{footer}</p> : null}
    </section>
  );
}

function Block({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="px-4 py-3.5">
      <p className="mb-2.5 text-[17px]">{label}</p>
      {children}
      {hint ? <p className="mt-2 text-[13.5px] leading-[18px] text-label-2">{hint}</p> : null}
    </div>
  );
}

function FontPicker<T extends TitleFontKey>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pt-1 pb-1.5"
    >
      {options.map((font) => {
        const selected = font === value;
        return (
          <button
            key={font}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(font)}
            className={cx(
              "pressable flex w-[112px] flex-none flex-col items-start rounded-[16px] px-3 pt-2.5 pb-2.5 text-left",
              selected ? "bg-accent-soft shadow-[inset_0_0_0_2px_var(--accent)]" : "bg-fill",
            )}
          >
            <span
              aria-hidden
              className="text-[28px] leading-[34px] font-semibold"
              style={{ fontFamily: FONT_SAMPLE[font] }}
            >
              Aa
            </span>
            <span className="mt-1 w-full truncate text-[14px] leading-[18px] font-semibold">
              {FONT_LABEL[font]}
            </span>
            <span className="w-full truncate text-[12.5px] leading-4 text-label-2">{FONT_HINT[font]}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Campo de texto que só grava ao sair dele ou ao apertar Enter. */
function CommitInput({
  id,
  value,
  placeholder,
  onCommit,
}: {
  id: string;
  value: string;
  placeholder?: string;
  onCommit: (value: string) => void;
}) {
  const [text, setText] = useState(value);
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    setText(value);
  }
  const commit = () => {
    const next = text.trim();
    if (next !== value) onCommit(next);
  };
  return (
    <TextInput
      id={id}
      value={text}
      placeholder={placeholder}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      autoComplete="off"
      className="!h-10 w-[46vw] max-w-[260px] text-right"
    />
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label={label}>
      <IconButton
        icon={Minus}
        label="Diminuir"
        filled
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="!size-9"
      />
      <span className="w-9 text-center text-[17px] font-semibold tabular-nums" aria-live="polite">
        {value}
      </span>
      <IconButton
        icon={Plus}
        label="Aumentar"
        filled
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="!size-9"
      />
    </div>
  );
}

function IntervalsEditor({
  intervals,
  onChange,
}: {
  intervals: number[];
  onChange: (value: number[]) => void;
}) {
  const [values, setValues] = useState(intervals.map(String));

  const parsed = values.map((v) => Math.round(Number(v)));
  const valid =
    parsed.length > 0 &&
    parsed.every((n) => Number.isFinite(n) && n >= 1 && n <= 365) &&
    parsed.every((n, i) => i === 0 || n > parsed[i - 1]);
  const dirty = parsed.join(",") !== intervals.join(",");

  return (
    <div className="px-4 py-3.5">
      <p className="text-[17px]">Intervalos</p>
      <p className="mt-0.5 text-[13.5px] leading-[18px] text-label-2">
        Dias depois da aula em que cada revisão vence.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-2.5">
        {values.map((value, index) => (
          <label key={index} className="block">
            <span className="mb-1 block text-center text-[12.5px] font-semibold text-label-3">R{index + 1}</span>
            <TextInput
              type="number"
              inputMode="numeric"
              min={1}
              max={365}
              value={value}
              aria-label={`Dias até a revisão R${index + 1}`}
              onChange={(e) => setValues((prev) => prev.map((v, i) => (i === index ? e.target.value : v)))}
              className="!h-10 !w-[76px] text-center tabular-nums"
            />
          </label>
        ))}
        <IconButton
          icon={Minus}
          label="Remover a última revisão"
          tone="neutral"
          filled
          disabled={values.length <= 1}
          onClick={() => setValues((prev) => prev.slice(0, -1))}
          className="!size-10"
        />
        <IconButton
          icon={Plus}
          label="Adicionar uma revisão"
          filled
          disabled={values.length >= 8}
          onClick={() =>
            setValues((prev) => [...prev, String((Math.round(Number(prev[prev.length - 1])) || 30) * 2)])
          }
          className="!size-10"
        />
      </div>
      {!valid ? (
        <p className="mt-2 text-[14px] text-danger">Use números de 1 a 365, em ordem crescente e sem repetir.</p>
      ) : null}
      {dirty ? (
        <div className="mt-3 flex gap-2">
          <Button size="sm" disabled={!valid} onClick={() => onChange(parsed)}>
            Aplicar
          </Button>
          <Button size="sm" variant="gray" onClick={() => setValues(intervals.map(String))}>
            Descartar
          </Button>
        </div>
      ) : null}
    </div>
  );
}
