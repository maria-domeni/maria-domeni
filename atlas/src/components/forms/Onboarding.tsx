"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/shell/Shell";
import { Button, cx } from "@/components/ui/basics";
import { Field, Segmented, TextInput } from "@/components/ui/fields";
import { Sheet } from "@/components/ui/overlays";
import { navigate } from "@/lib/router";
import { createSemester, saveSettings } from "@/lib/store";
import {
  ACCENT_KEYS,
  ACCENT_LABEL,
  type AccentKey,
  type Settings,
  type ThemeMode,
} from "@/lib/types";

export const ACCENT_SWATCH: Record<AccentKey, string> = {
  indigo: "#4f46e5",
  azul: "#0a66d6",
  rosa: "#cf2f66",
  verde: "#17804a",
  laranja: "#c2500a",
  lilas: "#8f33c4",
};

/** Configuração inicial: quem é a pessoa, o estilo do app e o primeiro semestre. */
export function OnboardingSheet({
  open,
  onClose,
  settings,
}: {
  open: boolean;
  onClose: () => void;
  settings: Settings;
}) {
  return <OnboardingForm key={open ? "aberto" : "fechado"} open={open} onClose={onClose} settings={settings} />;
}

function OnboardingForm({
  open,
  onClose,
  settings,
}: {
  open: boolean;
  onClose: () => void;
  settings: Settings;
}) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(settings.profileName);
  const [course, setCourse] = useState(settings.course);
  const [institution, setInstitution] = useState(settings.institution);
  const [total, setTotal] = useState(String(settings.totalSemesters));
  const [number, setNumber] = useState("1");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const totalN = Math.round(Number(total));
  const numberN = Math.round(Number(number));
  const totalOk = Number.isFinite(totalN) && totalN >= 1 && totalN <= 20;
  const numberOk = Number.isFinite(numberN) && numberN >= 1 && numberN <= (totalOk ? totalN : 20);
  const datesOk = !start || !end || start <= end;
  const canAdvance = step === 0 ? totalOk : step === 1 ? true : numberOk && datesOk;

  async function submit(): Promise<false | void> {
    if (step === 0) {
      await saveSettings({
        profileName: name.trim(),
        course: course.trim(),
        institution: institution.trim(),
        totalSemesters: totalN,
      });
      setStep(1);
      return false;
    }
    if (step === 1) {
      setStep(2);
      return false;
    }
    const semester = await createSemester({ number: numberN, start: start || undefined, end: end || undefined });
    await saveSettings({ onboarded: true, currentSemesterId: semester.id });
    navigate("#/cadernos");
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={["Sobre você", "Seu estilo", "Semestre atual"][step]}
      submitLabel={step === 2 ? "Concluir" : "Continuar"}
      onSubmit={submit}
      canSubmit={canAdvance}
    >
      <div className="mb-5 flex items-center gap-1.5" aria-label={`Passo ${step + 1} de 3`}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cx(
              "h-1.5 flex-1 rounded-full transition-colors duration-300",
              i <= step ? "bg-accent" : "bg-fill-2",
            )}
          />
        ))}
      </div>

      {step === 0 ? (
        <div className="fade-in flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <Logo size={44} />
            <div>
              <p className="font-display text-[22px] leading-7 font-bold tracking-[-0.02em]">Boas-vindas ao Atlas</p>
              <p className="text-[15px] leading-5 text-label-2">Leva um minuto. Dá para mudar tudo depois.</p>
            </div>
          </div>
          <Field label="Como quer ser chamado(a)?">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" autoFocus />
          </Field>
          <Field label="Curso">
            <TextInput
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              placeholder="Ex.: Psicologia"
              autoComplete="off"
            />
          </Field>
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <Field label="Instituição">
              <TextInput value={institution} onChange={(e) => setInstitution(e.target.value)} autoComplete="off" />
            </Field>
            <Field label="Semestres do curso">
              <TextInput
                type="number"
                inputMode="numeric"
                min={1}
                max={20}
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                className="!w-[132px]"
              />
            </Field>
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="fade-in flex flex-col gap-6">
          <div>
            <p className="mb-2 px-0.5 text-[14px] font-semibold text-label-2">Tema</p>
            <Segmented<ThemeMode>
              label="Tema"
              value={settings.theme}
              onChange={(theme) => void saveSettings({ theme })}
              options={[
                { value: "auto", label: "Automático" },
                { value: "claro", label: "Claro" },
                { value: "escuro", label: "Escuro" },
              ]}
            />
          </div>
          <div>
            <p className="mb-2.5 px-0.5 text-[14px] font-semibold text-label-2">Cor de destaque</p>
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
                    onClick={() => void saveSettings({ accent })}
                    className="pressable inline-flex size-11 items-center justify-center rounded-full text-white"
                    style={{
                      backgroundColor: ACCENT_SWATCH[accent],
                      boxShadow: selected
                        ? `0 0 0 3px var(--surface), 0 0 0 5px ${ACCENT_SWATCH[accent]}`
                        : undefined,
                    }}
                  >
                    {selected ? <Check size={20} strokeWidth={3} /> : null}
                  </button>
                );
              })}
            </div>
          </div>
          <p className="text-[14px] leading-[19px] text-label-2">
            Em Ajustes você também escolhe qualquer outra cor, as fontes, o fundo, a capa da tela Hoje e a sua
            foto.
          </p>
          <Button variant="plain" className="self-start" onClick={() => setStep(0)}>
            Voltar
          </Button>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="fade-in flex flex-col gap-5">
          <Field label="Em que semestre você está?" hint={totalOk ? `De 1 a ${totalN}.` : undefined}>
            <TextInput
              type="number"
              inputMode="numeric"
              min={1}
              max={totalOk ? totalN : 20}
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              autoFocus
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Início das aulas">
              <TextInput type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </Field>
            <Field label="Fim das aulas">
              <TextInput type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} />
            </Field>
          </div>
          {!datesOk ? (
            <p className="-mt-2 text-[14px] text-danger">O fim precisa ser depois do início.</p>
          ) : (
            <p className="-mt-2 text-[13px] leading-[18px] text-label-3">
              As datas são opcionais. Com elas, a tela Hoje mostra em que semana do semestre você está.
            </p>
          )}
          <Button variant="plain" className="self-start" onClick={() => setStep(1)}>
            Voltar
          </Button>
        </div>
      ) : null}
    </Sheet>
  );
}
