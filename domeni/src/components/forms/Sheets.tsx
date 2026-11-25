"use client";

import { Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Button, cx, safeUrl } from "@/components/ui/basics";
import { ColorPicker, Field, Segmented, Select, Switch, TextArea, TextInput } from "@/components/ui/fields";
import { EmojiPicker } from "@/components/ui/media";
import { Sheet, useConfirm, useToast } from "@/components/ui/overlays";
import { addDays, todayISO, weekdayOf } from "@/lib/dates";
import { newId } from "@/lib/ids";
import { navigate } from "@/lib/router";
import { optionalNumber } from "@/lib/settings";
import {
  createDiscipline,
  createLesson,
  createSemester,
  createTask,
  deleteDiscipline,
  deleteSemester,
  deleteTask,
  updateDiscipline,
  updateSemester,
  updateTask,
} from "@/lib/store";
import {
  LESSON_TYPE_LABEL,
  STATUS_LABEL,
  TASK_TYPE_EMOJI,
  TASK_TYPE_LABEL,
  WEEKDAY_LONG,
  type ClassSlot,
  type Discipline,
  type DisciplineKind,
  type DisciplineStatus,
  type ISODate,
  type LessonType,
  type Semester,
  type Task,
  type TaskType,
} from "@/lib/types";

/* ---------- Semestre ---------- */

export function SemesterSheet(props: {
  open: boolean;
  onClose: () => void;
  semester?: Semester;
  suggestedNumber: number;
  maxNumber: number;
}) {
  return <SemesterForm key={props.open ? (props.semester?.id ?? "novo") : "fechado"} {...props} />;
}

function SemesterForm({
  open,
  onClose,
  semester,
  suggestedNumber,
  maxNumber,
}: {
  open: boolean;
  onClose: () => void;
  semester?: Semester;
  suggestedNumber: number;
  maxNumber: number;
}) {
  const confirm = useConfirm();
  const [number, setNumber] = useState(String(semester?.number ?? suggestedNumber));
  const [start, setStart] = useState(semester?.start ?? "");
  const [end, setEnd] = useState(semester?.end ?? "");
  const n = Number(number);
  const valid = Number.isInteger(n) && n >= 1 && n <= Math.max(maxNumber, 20) && (!start || !end || start <= end);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={semester ? "Editar semestre" : "Novo semestre"}
      submitLabel={semester ? "Salvar" : "Criar"}
      canSubmit={valid}
      onSubmit={async () => {
        if (semester) await updateSemester(semester.id, { number: n, start: start || undefined, end: end || undefined });
        else {
          const created = await createSemester({ number: n, start: start || undefined, end: end || undefined });
          navigate(`#/semestre/${created.id}`);
        }
      }}
    >
      <div className="space-y-4">
        <Field label="Qual semestre?">
          <TextInput inputMode="numeric" value={number} onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Começa em">
            <TextInput type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="Termina em">
            <TextInput type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
        <p className="text-[13.5px] text-label-3">As datas servem para mostrar o progresso do semestre e só contar aulas dentro do período.</p>
        {semester ? (
          <Button
            variant="danger"
            icon={Trash2}
            onClick={async () => {
              const ok = await confirm({
                title: `Apagar o ${semester.number}º semestre?`,
                message: "Todas as disciplinas, aulas, faltas e notas dele serão apagadas.",
                confirmLabel: "Apagar",
                destructive: true,
              });
              if (!ok) return;
              await deleteSemester(semester.id);
              onClose();
              navigate("#/cadernos", { replace: true });
            }}
          >
            Apagar semestre
          </Button>
        ) : null}
      </div>
    </Sheet>
  );
}

/* ---------- Disciplina ---------- */

export function DisciplineSheet(props: {
  open: boolean;
  onClose: () => void;
  semesterId: string;
  discipline?: Discipline;
}) {
  return <DisciplineForm key={props.open ? (props.discipline?.id ?? "nova") : "fechada"} {...props} />;
}

function emptySlot(professor = "", classes = 4): ClassSlot {
  return { id: newId(), weekday: 1, start: "19:00", end: "22:30", professor, room: "", classes };
}

function DisciplineForm({
  open,
  onClose,
  semesterId,
  discipline,
}: {
  open: boolean;
  onClose: () => void;
  semesterId: string;
  discipline?: Discipline;
}) {
  const confirm = useConfirm();
  const toast = useToast();
  const [name, setName] = useState(discipline?.name ?? "");
  const [kind, setKind] = useState<DisciplineKind>(discipline?.kind ?? "regular");
  const [emoji, setEmoji] = useState(discipline?.emoji ?? "");
  const [color, setColor] = useState(discipline?.color ?? "");
  const [professors, setProfessors] = useState<string[]>(discipline?.professors.length ? discipline.professors : [""]);
  const [slots, setSlots] = useState<ClassSlot[]>(discipline?.slots ?? []);
  const [status, setStatus] = useState<DisciplineStatus>(discipline?.status ?? "andamento");
  const [absenceLimit, setAbsenceLimit] = useState(discipline?.absenceLimit?.toString() ?? "");
  const [passingGrade, setPassingGrade] = useState(discipline?.passingGrade?.toString().replace(".", ",") ?? "");
  const [ementa, setEmenta] = useState(discipline?.ementa ?? "");
  const [notebookLm, setNotebookLm] = useState(discipline?.notebookLmUrl ?? "");
  const [thea, setThea] = useState(discipline?.theaUrl ?? "");
  const [more, setMore] = useState(false);

  const professorNames = professors.map((p) => p.trim()).filter(Boolean);
  const valid = name.trim().length > 0 && slots.every((s) => !s.start || !s.end || s.start < s.end);

  const updateSlot = (id: string, patch: Partial<ClassSlot>) =>
    setSlots((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={discipline ? "Editar disciplina" : "Nova disciplina"}
      submitLabel={discipline ? "Salvar" : "Criar"}
      canSubmit={valid}
      wide
      onSubmit={async () => {
        const data = {
          name,
          kind,
          emoji,
          professors: professorNames,
          slots: slots.map((s) => ({ ...s, professor: s.professor.trim(), room: s.room.trim() })),
          status,
          absenceLimit: optionalNumber(absenceLimit, 0, 1000),
          passingGrade: optionalNumber(passingGrade.replace(",", "."), 0, 1000),
          ementa,
          notebookLmUrl: safeUrl(notebookLm) ?? "",
          theaUrl: safeUrl(thea) ?? "",
          ...(color ? { color } : {}),
        };
        if (discipline) {
          await updateDiscipline(discipline.id, data);
          toast("Disciplina salva");
        } else {
          const created = await createDiscipline({ semesterId, ...data });
          navigate(`#/disciplina/${created.id}`);
        }
      }}
    >
      <div className="space-y-5">
        <Field label="Nome da disciplina">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Psicodinâmica" autoFocus={!discipline} />
        </Field>

        <Segmented
          label="Tipo"
          value={kind}
          onChange={setKind}
          options={[
            { value: "regular", label: "Disciplina" },
            { value: "estagio", label: "Estágio" },
          ]}
        />
        {kind === "estagio" ? (
          <p className="-mt-2 rounded-2xl bg-yellow-soft px-3.5 py-2.5 text-[14px] leading-5">
            Estágios não entram na conta de faltas. Nunca registre nome ou dado que identifique pessoa atendida.
          </p>
        ) : null}

        <div>
          <p className="mb-1.5 px-0.5 text-[14px] font-semibold text-label-2">Professores</p>
          <div className="space-y-2">
            {professors.map((professor, index) => (
              <div key={index} className="flex gap-2">
                <TextInput
                  value={professor}
                  onChange={(e) => setProfessors((list) => list.map((p, i) => (i === index ? e.target.value : p)))}
                  placeholder={index === 0 ? "Ex.: Profa. Ana" : "Outro professor"}
                />
                {professors.length > 1 ? (
                  <button
                    type="button"
                    aria-label="Tirar professor"
                    onClick={() => setProfessors((list) => list.filter((_, i) => i !== index))}
                    className="pressable inline-flex size-11 flex-none items-center justify-center rounded-full bg-fill text-label-2"
                  >
                    <X size={17} strokeWidth={2.5} />
                  </button>
                ) : null}
              </div>
            ))}
            <Button variant="tinted" size="sm" icon={Plus} onClick={() => setProfessors((list) => [...list, ""])}>
              Mais um professor
            </Button>
          </div>
        </div>

        <div>
          <p className="mb-1.5 px-0.5 text-[14px] font-semibold text-label-2">Horários das aulas</p>
          <div className="space-y-3">
            {slots.map((slot) => (
              <div key={slot.id} className="rounded-2xl bg-fill p-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Select value={slot.weekday} onChange={(e) => updateSlot(slot.id, { weekday: Number(e.target.value) })} aria-label="Dia da semana" className="bg-surface">
                    {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                      <option key={d} value={d}>
                        {WEEKDAY_LONG[d]}
                      </option>
                    ))}
                  </Select>
                  <TextInput type="time" value={slot.start} onChange={(e) => updateSlot(slot.id, { start: e.target.value })} aria-label="Começa" className="bg-surface" />
                  <TextInput type="time" value={slot.end} onChange={(e) => updateSlot(slot.id, { end: e.target.value })} aria-label="Termina" className="bg-surface" />
                  <Select
                    value={slot.classes}
                    onChange={(e) => updateSlot(slot.id, { classes: Number(e.target.value) })}
                    aria-label="Aulas nesse dia"
                    className="bg-surface"
                  >
                    {[1, 2, 3, 4, 5, 6, 8].map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? "aula" : "aulas"}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="mt-2 flex gap-2">
                  {professorNames.length > 0 ? (
                    <Select value={slot.professor} onChange={(e) => updateSlot(slot.id, { professor: e.target.value })} aria-label="Professor" className="bg-surface">
                      <option value="">Professor…</option>
                      {professorNames.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </Select>
                  ) : null}
                  <TextInput value={slot.room} onChange={(e) => updateSlot(slot.id, { room: e.target.value })} placeholder="Sala" className="bg-surface" />
                  <button
                    type="button"
                    aria-label="Tirar horário"
                    onClick={() => setSlots((list) => list.filter((s) => s.id !== slot.id))}
                    className="pressable inline-flex size-11 flex-none items-center justify-center rounded-full bg-surface text-danger"
                  >
                    <Trash2 size={17} strokeWidth={2.3} />
                  </button>
                </div>
              </div>
            ))}
            <Button
              variant="tinted"
              size="sm"
              icon={Plus}
              onClick={() => setSlots((list) => [...list, emptySlot(professorNames[list.length % Math.max(1, professorNames.length)] ?? "", list.at(-1)?.classes ?? 4)])}
            >
              Adicionar dia de aula
            </Button>
          </div>
        </div>

        <Field label="Cor">
          <ColorPicker value={color} onChange={setColor} />
        </Field>
        <Field label="Símbolo">
          <EmojiPicker value={emoji} onChange={setEmoji} />
        </Field>

        <button type="button" onClick={() => setMore((v) => !v)} className="text-[15px] font-semibold text-accent">
          {more ? "Menos opções" : "Mais opções (faltas, nota, links)"}
        </button>
        {more ? (
          <div className="space-y-4">
            <Segmented
              label="Situação"
              value={status}
              onChange={setStatus}
              options={(["andamento", "futura", "concluida"] as DisciplineStatus[]).map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
            />
            {kind === "regular" ? (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Limite de faltas (aulas)" hint="Vazio = o padrão dos Ajustes">
                  <TextInput inputMode="numeric" value={absenceLimit} onChange={(e) => setAbsenceLimit(e.target.value.replace(/\D/g, ""))} />
                </Field>
                <Field label="Média para passar" hint="Vazio = a dos Ajustes">
                  <TextInput inputMode="decimal" value={passingGrade} onChange={(e) => setPassingGrade(e.target.value.replace(/[^\d,.]/g, ""))} />
                </Field>
              </div>
            ) : null}
            <Field label="Ementa ou objetivos">
              <TextArea value={ementa} onChange={(e) => setEmenta(e.target.value)} minRows={3} />
            </Field>
            <Field label="Link do NotebookLM">
              <TextInput value={notebookLm} onChange={(e) => setNotebookLm(e.target.value)} inputMode="url" placeholder="https://notebooklm.google.com/…" />
            </Field>
            <Field label="Link do Thea">
              <TextInput value={thea} onChange={(e) => setThea(e.target.value)} inputMode="url" />
            </Field>
          </div>
        ) : null}

        {discipline ? (
          <Button
            variant="danger"
            icon={Trash2}
            onClick={async () => {
              const ok = await confirm({
                title: `Apagar ${discipline.name}?`,
                message: "Aulas, faltas, notas, flashcards e materiais desta disciplina serão apagados.",
                confirmLabel: "Apagar",
                destructive: true,
              });
              if (!ok) return;
              await deleteDiscipline(discipline.id);
              onClose();
              navigate(`#/semestre/${discipline.semesterId}`, { replace: true });
            }}
          >
            Apagar disciplina
          </Button>
        ) : null}
      </div>
    </Sheet>
  );
}

/* ---------- Aula ---------- */

/** Próxima data com aula a partir de hoje (inclusive), pelos dias da grade. */
export function nextClassDate(weekdays: number[], from: ISODate = todayISO()): ISODate {
  if (weekdays.length === 0) return from;
  for (let i = 0; i < 7; i++) {
    const date = addDays(from, i);
    if (weekdays.includes(weekdayOf(date))) return date;
  }
  return from;
}

export function LessonSheet(props: { open: boolean; onClose: () => void; discipline: Discipline }) {
  return <LessonForm key={props.open ? "aberta" : "fechada"} {...props} />;
}

function LessonForm({ open, onClose, discipline }: { open: boolean; onClose: () => void; discipline: Discipline }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(nextClassDate(discipline.slots.map((s) => s.weekday)));
  const [type, setType] = useState<LessonType>("teorica");
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Nova aula"
      submitLabel="Criar"
      onSubmit={async () => {
        const lesson = await createLesson({ disciplineId: discipline.id, title, date: date || null, type });
        navigate(`#/aula/${lesson.id}`);
      }}
    >
      <div className="space-y-4">
        <Field label="Tema da aula" hint="Pode deixar em branco e preencher durante a aula">
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Posição esquizoparanoide" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data">
            <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Tipo">
            <Select value={type} onChange={(e) => setType(e.target.value as LessonType)}>
              {(Object.keys(LESSON_TYPE_LABEL) as LessonType[]).map((t) => (
                <option key={t} value={t}>
                  {LESSON_TYPE_LABEL[t]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>
    </Sheet>
  );
}

/* ---------- Compromissos (provas, entregas, lembretes) ---------- */

const REMIND_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Sem aviso" },
  { value: "0", label: "Na hora" },
  { value: "30", label: "30 min antes" },
  { value: "60", label: "1 hora antes" },
  { value: "1440", label: "1 dia antes" },
  { value: "4320", label: "3 dias antes" },
  { value: "10080", label: "1 semana antes" },
];

export function TaskSheet(props: {
  open: boolean;
  onClose: () => void;
  task?: Task;
  disciplines: Discipline[];
  defaultDisciplineId?: string | null;
  defaultDate?: ISODate;
  defaultType?: TaskType;
}) {
  return <TaskForm key={props.open ? (props.task?.id ?? "novo") : "fechado"} {...props} />;
}

function TaskForm({
  open,
  onClose,
  task,
  disciplines,
  defaultDisciplineId = null,
  defaultDate,
  defaultType = "prova",
}: {
  open: boolean;
  onClose: () => void;
  task?: Task;
  disciplines: Discipline[];
  defaultDisciplineId?: string | null;
  defaultDate?: ISODate;
  defaultType?: TaskType;
}) {
  const confirm = useConfirm();
  const [title, setTitle] = useState(task?.title ?? "");
  const [type, setType] = useState<TaskType>(task?.type ?? defaultType);
  const [disciplineId, setDisciplineId] = useState(task?.disciplineId ?? defaultDisciplineId ?? "");
  const [dueDate, setDueDate] = useState(task?.dueDate ?? defaultDate ?? addDays(todayISO(), 7));
  const [time, setTime] = useState(task?.time ?? "");
  const [remind, setRemind] = useState(task?.remindMinutes?.toString() ?? "1440");
  const [countdown, setCountdown] = useState(task?.countdown ?? true);
  const [notes, setNotes] = useState(task?.notes ?? "");
  const valid = title.trim().length > 0 && !!dueDate;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={task ? "Editar compromisso" : "Novo compromisso"}
      submitLabel={task ? "Salvar" : "Criar"}
      canSubmit={valid}
      onSubmit={async () => {
        const data = {
          title,
          type,
          disciplineId: disciplineId || null,
          dueDate,
          time,
          remindMinutes: remind === "" ? null : Number(remind),
          countdown,
          notes,
        };
        if (task) await updateTask(task.id, data);
        else await createTask(data);
      }}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(TASK_TYPE_LABEL) as TaskType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              aria-pressed={type === t}
              className={cx(
                "pressable inline-flex h-9 items-center gap-1 rounded-[8px] px-3 text-[14px] font-semibold",
                type === t ? "bg-accent-solid text-on-accent" : "bg-fill text-label-2",
              )}
            >
              <span>{TASK_TYPE_EMOJI[t]}</span>
              {TASK_TYPE_LABEL[t]}
            </button>
          ))}
        </div>
        <Field label="O quê?">
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Prova P1, Entrega do relatório" autoFocus={!task} />
        </Field>
        <Field label="Disciplina">
          <Select value={disciplineId} onChange={(e) => setDisciplineId(e.target.value)}>
            <option value="">Nenhuma</option>
            {disciplines.map((d) => (
              <option key={d.id} value={d.id}>
                {d.emoji ? `${d.emoji} ` : ""}
                {d.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data">
            <TextInput type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
          <Field label="Hora" hint="Vazio = dia todo">
            <TextInput type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>
        <Field label="Me avisar">
          <Select value={remind} onChange={(e) => setRemind(e.target.value)}>
            {REMIND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <label className="flex items-center justify-between gap-3 rounded-2xl bg-fill px-3.5 py-2.5 text-[15px] font-semibold">
          Contagem regressiva na tela Hoje
          <Switch checked={countdown} onChange={setCountdown} label="Contagem regressiva" />
        </label>
        <Field label="Observações">
          <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} minRows={2} placeholder="Conteúdo da prova, formato da entrega…" />
        </Field>
        {task ? (
          <Button
            variant="danger"
            icon={Trash2}
            onClick={async () => {
              const ok = await confirm({ title: "Apagar compromisso?", confirmLabel: "Apagar", destructive: true });
              if (!ok) return;
              await deleteTask(task.id);
              onClose();
            }}
          >
            Apagar
          </Button>
        ) : null}
      </div>
    </Sheet>
  );
}
