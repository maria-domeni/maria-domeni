"use client";

import { useState } from "react";
import { Character } from "@/components/avatar/Character";
import { Button, cx } from "@/components/ui/basics";
import { Field, TextInput } from "@/components/ui/fields";
import { Sheet } from "@/components/ui/overlays";
import { navigate } from "@/lib/router";
import { optionalNumber, PRESETS, THEME_PRESETS } from "@/lib/settings";
import { createSemester, saveSettings } from "@/lib/store";
import { DEFAULT_AVATAR, type ThemePreset } from "@/lib/types";

const PRESET_SWATCH: Record<ThemePreset, [string, string, string]> = {
  rose: ["#ffffff", "#c24d78", "#1d1d1f"],
  classico: ["#ffffff", "#0a66d8", "#1d1d1f"],
  notion: ["#ffffff", "#37352f", "#37352f"],
  papel: ["#fbfaf6", "#8c3a5c", "#2f2b25"],
  noite: ["#191919", "#bfa4f5", "#f2f2f3"],
};

export function PresetPicker({ value, onChange }: { value: string; onChange: (preset: ThemePreset) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
      {PRESETS.map((preset) => {
        const [paper, ink, text] = PRESET_SWATCH[preset];
        const selected = value === preset;
        return (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(preset)}
            aria-pressed={selected}
            className={cx(
              "pressable overflow-hidden rounded-[12px] text-left",
              selected ? "ring-2 ring-accent" : "ring-1 ring-sep",
            )}
          >
            <span className="flex h-16 flex-col justify-center gap-1.5 px-3" style={{ background: paper }}>
              <span className="block h-2 w-16 rounded-full" style={{ background: text, opacity: 0.85 }} />
              <span className="block h-1.5 w-24 rounded-full" style={{ background: text, opacity: 0.25 }} />
              <span className="block h-4 w-10 rounded-[5px]" style={{ background: ink }} />
            </span>
            <span className="block border-t border-sep bg-surface px-3 py-2">
              <span className="block text-[14px] font-semibold">{THEME_PRESETS[preset].label}</span>
              <span className="block truncate text-[12px] text-label-2">{THEME_PRESETS[preset].hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Configuração inicial: você, estilo, regras da faculdade e semestre atual. */
export function OnboardingSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <OnboardingForm key={open ? "aberto" : "fechado"} open={open} onClose={onClose} />;
}

function OnboardingForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [course, setCourse] = useState("");
  const [institution, setInstitution] = useState("");
  const [total, setTotal] = useState("10");
  const [preset, setPreset] = useState<ThemePreset>("rose");
  const [absenceLimit, setAbsenceLimit] = useState("");
  const [classesPerDay, setClassesPerDay] = useState("4");
  const [passing, setPassing] = useState("");
  const [gradeMax, setGradeMax] = useState("10");
  const [number, setNumber] = useState("1");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const steps = ["Sobre você", "Seu estilo", "Regras da faculdade", "Semestre atual"];
  const last = step === steps.length - 1;

  async function choosePreset(p: ThemePreset) {
    setPreset(p);
    await saveSettings({ preset: p, ...THEME_PRESETS[p].values });
  }

  async function finish() {
    const semester = await createSemester({
      number: Math.max(1, Number(number) || 1),
      start: start || undefined,
      end: end || undefined,
    });
    await saveSettings({
      onboarded: true,
      profileName: name.trim(),
      course: course.trim(),
      institution: institution.trim(),
      totalSemesters: Math.max(1, Number(total) || 10),
      currentSemesterId: semester.id,
      defaultAbsenceLimit: optionalNumber(absenceLimit, 0, 1000),
      classesPerDay: Math.max(1, Number(classesPerDay) || 4),
      passingGrade: optionalNumber(passing.replace(",", "."), 0, 1000),
      gradeMax: optionalNumber(gradeMax.replace(",", "."), 1, 1000) ?? 10,
      avatar: DEFAULT_AVATAR,
    });
    onClose();
    navigate(`#/semestre/${semester.id}`);
  }

  return (
    <Sheet open={open} onClose={onClose} title={steps[step]}>
      <div className="mb-5 flex gap-1.5">
        {steps.map((s, i) => (
          <span key={s} className={cx("h-1 flex-1 rounded-full", i <= step ? "bg-accent" : "bg-fill-2")} />
        ))}
      </div>

      {step === 0 ? (
        <div className="space-y-4">
          <div className="flex justify-center">
            <Character config={DEFAULT_AVATAR} size={84} mood="feliz" />
          </div>
          <Field label="Como quer ser chamada?">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" autoFocus />
          </Field>
          <Field label="Curso">
            <TextInput value={course} onChange={(e) => setCourse(e.target.value)} placeholder="Ex.: Psicologia" />
          </Field>
          <div className="grid grid-cols-[1fr_120px] gap-3">
            <Field label="Faculdade">
              <TextInput value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="Opcional" />
            </Field>
            <Field label="Nº de semestres">
              <TextInput inputMode="numeric" value={total} onChange={(e) => setTotal(e.target.value.replace(/\D/g, ""))} />
            </Field>
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div>
          <p className="mb-3 text-[15px] text-label-2">Escolha um estilo para começar. Depois dá para mudar cores, fontes e fundo nos Ajustes.</p>
          <PresetPicker value={preset} onChange={(p) => void choosePreset(p)} />
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <p className="text-[15px] leading-[21px] text-label-2">
            Use as regras da <b>sua</b> faculdade. O Domeni só faz as contas: nada aqui é inventado. Dá para mudar
            depois, e cada disciplina pode ter a sua regra.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Faltas permitidas por disciplina" hint="Em aulas. Estágios não contam.">
              <TextInput inputMode="numeric" value={absenceLimit} onChange={(e) => setAbsenceLimit(e.target.value.replace(/\D/g, ""))} placeholder="Ex.: 40" />
            </Field>
            <Field label="Aulas em cada dia de aula">
              <TextInput inputMode="numeric" value={classesPerDay} onChange={(e) => setClassesPerDay(e.target.value.replace(/\D/g, ""))} />
            </Field>
            <Field label="Média para passar" hint="Deixe vazio se não souber">
              <TextInput inputMode="decimal" value={passing} onChange={(e) => setPassing(e.target.value.replace(/[^\d,.]/g, ""))} placeholder="ex.: 6" />
            </Field>
            <Field label="Nota máxima">
              <TextInput inputMode="decimal" value={gradeMax} onChange={(e) => setGradeMax(e.target.value.replace(/[^\d,.]/g, ""))} />
            </Field>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <Field label="Em que semestre você está?">
            <TextInput inputMode="numeric" value={number} onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Começou em">
              <TextInput type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </Field>
            <Field label="Termina em">
              <TextInput type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </Field>
          </div>
          <p className="text-[13.5px] text-label-3">No próximo passo você cadastra as disciplinas, os professores e os horários.</p>
        </div>
      ) : null}

      <div className="mt-6 flex gap-2">
        {step > 0 ? (
          <Button variant="gray" onClick={() => setStep((s) => s - 1)}>
            Voltar
          </Button>
        ) : null}
        <Button block onClick={() => (last ? void finish() : setStep((s) => s + 1))}>
          {last ? "Criar meu semestre" : "Continuar"}
        </Button>
      </div>
    </Sheet>
  );
}
