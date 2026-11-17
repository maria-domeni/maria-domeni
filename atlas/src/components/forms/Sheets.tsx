"use client";

import { useState } from "react";
import { Button, safeUrl } from "@/components/ui/basics";
import {
  ColorPicker,
  Field,
  Select,
  TextArea,
  TextInput,
  WeekdayPicker,
} from "@/components/ui/fields";
import { EmojiPicker, ImageField } from "@/components/ui/media";
import { Sheet, useConfirm, useToast } from "@/components/ui/overlays";
import { addDays, todayISO, weekdayOf } from "@/lib/dates";
import { navigate } from "@/lib/router";
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
  TASK_TYPE_LABEL,
  type Discipline,
  type DisciplineStatus,
  type ISODate,
  type LessonType,
  type Semester,
  type Task,
  type TaskType,
} from "@/lib/types";

/* ---------- Semestre ---------- */

export function SemesterSheet({
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
  return (
    <SemesterForm
      key={open ? (semester?.id ?? "novo") : "fechado"}
      open={open}
      onClose={onClose}
      semester={semester}
      suggestedNumber={suggestedNumber}
      maxNumber={maxNumber}
    />
  );
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
  const toast = useToast();
  const [number, setNumber] = useState(String(semester?.number ?? suggestedNumber));
  const [start, setStart] = useState(semester?.start ?? "");
  const [end, setEnd] = useState(semester?.end ?? "");

  const parsed = Math.round(Number(number));
  const numberOk = Number.isFinite(parsed) && parsed >= 1 && parsed <= Math.max(maxNumber, 1);
  const datesOk = !start || !end || start <= end;

  async function submit() {
    const data = { number: parsed, start: start || undefined, end: end || undefined };
    if (semester) await updateSemester(semester.id, data);
    else await createSemester(data);
  }

  async function remove() {
    if (!semester) return;
    const ok = await confirm({
      title: `Apagar o ${semester.number}º semestre?`,
      message: "As disciplinas, aulas, revisões e prazos deste semestre também serão apagados.",
      confirmLabel: "Apagar semestre",
      destructive: true,
    });
    if (!ok) return;
    await deleteSemester(semester.id);
    toast("Semestre apagado");
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={semester ? "Editar semestre" : "Novo semestre"}
      submitLabel="Salvar"
      onSubmit={submit}
      canSubmit={numberOk && datesOk}
    >
      <div className="flex flex-col gap-5">
        <Field label="Número do semestre" hint={`De 1 a ${maxNumber}. O total do curso fica em Ajustes.`}>
          <TextInput
            type="number"
            inputMode="numeric"
            min={1}
            max={maxNumber}
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            autoFocus={!semester}
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
        {semester ? (
          <Button variant="danger" block onClick={remove} className="mt-2">
            Apagar semestre
          </Button>
        ) : null}
      </div>
    </Sheet>
  );
}

/* ---------- Disciplina ---------- */

export function DisciplineSheet({
  open,
  onClose,
  discipline,
  semesterId,
}: {
  open: boolean;
  onClose: () => void;
  discipline?: Discipline;
  semesterId: string;
}) {
  return (
    <DisciplineForm
      key={open ? (discipline?.id ?? `novo-${semesterId}`) : "fechado"}
      open={open}
      onClose={onClose}
      discipline={discipline}
      semesterId={semesterId}
    />
  );
}

function DisciplineForm({
  open,
  onClose,
  discipline,
  semesterId,
}: {
  open: boolean;
  onClose: () => void;
  discipline?: Discipline;
  semesterId: string;
}) {
  const confirm = useConfirm();
  const toast = useToast();
  const [name, setName] = useState(discipline?.name ?? "");
  const [professor, setProfessor] = useState(discipline?.professor ?? "");
  const [color, setColor] = useState<string | null>(discipline?.color ?? null);
  const [emoji, setEmoji] = useState(discipline?.emoji ?? "");
  const [coverImageId, setCoverImageId] = useState<string | null>(discipline?.coverImageId ?? null);
  const [weekdays, setWeekdays] = useState<number[]>(discipline?.weekdays ?? []);
  const [startTime, setStartTime] = useState(discipline?.startTime ?? "");
  const [endTime, setEndTime] = useState(discipline?.endTime ?? "");
  const [room, setRoom] = useState(discipline?.room ?? "");
  const [status, setStatus] = useState<DisciplineStatus>(discipline?.status ?? "andamento");
  const [notebookLmUrl, setNotebookLmUrl] = useState(discipline?.notebookLmUrl ?? "");
  const [theaUrl, setTheaUrl] = useState(discipline?.theaUrl ?? "");
  const [ementa, setEmenta] = useState(discipline?.ementa ?? "");

  const urlOk = (value: string) => value.trim() === "" || safeUrl(value) !== null;
  const canSubmit = name.trim() !== "" && urlOk(notebookLmUrl) && urlOk(theaUrl);

  async function submit() {
    const data = {
      name,
      professor: professor.trim(),
      weekdays,
      startTime,
      endTime,
      room: room.trim(),
      status,
      notebookLmUrl: safeUrl(notebookLmUrl) ?? "",
      theaUrl: safeUrl(theaUrl) ?? "",
      ementa,
      emoji,
      coverImageId,
    };
    if (discipline) {
      await updateDiscipline(discipline.id, { ...data, color: color ?? discipline.color });
    } else {
      await createDiscipline({ semesterId, ...data, ...(color ? { color } : {}) });
    }
  }

  async function remove() {
    if (!discipline) return;
    const ok = await confirm({
      title: `Apagar ${discipline.name}?`,
      message: "As aulas, anotações, revisões e prazos desta disciplina também serão apagados.",
      confirmLabel: "Apagar disciplina",
      destructive: true,
    });
    if (!ok) return;
    await deleteDiscipline(discipline.id);
    toast("Disciplina apagada");
    onClose();
    navigate("#/cadernos", { replace: true });
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={discipline ? "Editar disciplina" : "Nova disciplina"}
      submitLabel="Salvar"
      onSubmit={submit}
      canSubmit={canSubmit}
    >
      <div className="flex flex-col gap-5">
        <Field label="Nome da disciplina">
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Metodologia de Pesquisa"
            autoFocus={!discipline}
            autoComplete="off"
          />
        </Field>
        <Field label="Professor(a)">
          <TextInput value={professor} onChange={(e) => setProfessor(e.target.value)} autoComplete="off" />
        </Field>
        <div>
          <span className="mb-1.5 block px-0.5 text-[14px] font-semibold text-label-2">Dias de aula</span>
          <WeekdayPicker value={weekdays} onChange={setWeekdays} />
          <p className="mt-1.5 px-0.5 text-[13px] leading-[17px] text-label-3">
            Nesses dias a tela Hoje oferece criar a aula com um toque.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Começa às">
            <TextInput type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </Field>
          <Field label="Termina às">
            <TextInput type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sala">
            <TextInput value={room} onChange={(e) => setRoom(e.target.value)} autoComplete="off" />
          </Field>
          <Field label="Situação">
            <Select value={status} onChange={(e) => setStatus(e.target.value as DisciplineStatus)}>
              {(Object.keys(STATUS_LABEL) as DisciplineStatus[]).map((key) => (
                <option key={key} value={key}>
                  {STATUS_LABEL[key]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div>
          <span className="mb-2 block px-0.5 text-[14px] font-semibold text-label-2">Cor</span>
          <ColorPicker value={color ?? discipline?.color ?? "indigo"} onChange={setColor} />
          {!discipline && !color ? (
            <p className="mt-2 px-0.5 text-[13px] text-label-3">
              Se você não escolher, o Atlas usa uma cor ainda livre no semestre.
            </p>
          ) : null}
        </div>
        <div>
          <span className="mb-2 block px-0.5 text-[14px] font-semibold text-label-2">Símbolo</span>
          <EmojiPicker value={emoji} onChange={setEmoji} />
        </div>
        <div>
          <span className="mb-2 block px-0.5 text-[14px] font-semibold text-label-2">Capa</span>
          <ImageField
            imageId={coverImageId}
            onChange={setCoverImageId}
            maxEdge={1600}
            label="capa"
          />
          <p className="mt-1.5 px-0.5 text-[13px] leading-[17px] text-label-3">
            Opcional. Sem imagem, a capa usa a cor da disciplina.
          </p>
        </div>
        <Field
          label="Link do caderno no NotebookLM"
          hint={urlOk(notebookLmUrl) ? undefined : "Esse endereço não parece válido."}
        >
          <TextInput
            type="url"
            inputMode="url"
            value={notebookLmUrl}
            onChange={(e) => setNotebookLmUrl(e.target.value)}
            placeholder="https://notebooklm.google.com/…"
            autoCapitalize="off"
            autoCorrect="off"
          />
        </Field>
        <Field label="Link do Study Kit no Thea" hint={urlOk(theaUrl) ? undefined : "Esse endereço não parece válido."}>
          <TextInput
            type="url"
            inputMode="url"
            value={theaUrl}
            onChange={(e) => setTheaUrl(e.target.value)}
            placeholder="https://…"
            autoCapitalize="off"
            autoCorrect="off"
          />
        </Field>
        <Field label="Ementa">
          <TextArea
            value={ementa}
            onChange={(e) => setEmenta(e.target.value)}
            minRows={3}
            placeholder="Cole aqui a ementa ou o plano de ensino."
          />
        </Field>
        {discipline ? (
          <Button variant="danger" block onClick={remove} className="mt-2">
            Apagar disciplina
          </Button>
        ) : null}
      </div>
    </Sheet>
  );
}

/* ---------- Nova aula ---------- */

/** Próxima data de aula a partir de hoje, pela grade da disciplina. */
export function nextClassDate(weekdays: number[], from: ISODate = todayISO()): ISODate {
  if (weekdays.length === 0) return from;
  for (let offset = 0; offset < 7; offset++) {
    const candidate = addDays(from, offset);
    if (weekdays.includes(weekdayOf(candidate))) return candidate;
  }
  return from;
}

export function LessonSheet({
  open,
  onClose,
  discipline,
}: {
  open: boolean;
  onClose: () => void;
  discipline: Discipline;
}) {
  return (
    <LessonForm key={open ? "aberto" : "fechado"} open={open} onClose={onClose} discipline={discipline} />
  );
}

function LessonForm({
  open,
  onClose,
  discipline,
}: {
  open: boolean;
  onClose: () => void;
  discipline: Discipline;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => nextClassDate(discipline.weekdays));
  const [type, setType] = useState<LessonType>("teorica");

  async function submit() {
    const lesson = await createLesson({
      disciplineId: discipline.id,
      title,
      date: date || null,
      type,
    });
    navigate(`#/aula/${lesson.id}`);
  }

  return (
    <Sheet open={open} onClose={onClose} title="Nova aula" submitLabel="Criar" onSubmit={submit}>
      <div className="flex flex-col gap-5">
        <Field label="Tema da aula" hint="Pode deixar em branco e preencher depois.">
          <TextInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Introdução ao tema"
            autoFocus
            autoComplete="off"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data">
            <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Tipo">
            <Select value={type} onChange={(e) => setType(e.target.value as LessonType)}>
              {(Object.keys(LESSON_TYPE_LABEL) as LessonType[]).map((key) => (
                <option key={key} value={key}>
                  {LESSON_TYPE_LABEL[key]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <p className="-mt-2 text-[13px] leading-[18px] text-label-3">
          {type === "prova"
            ? "Aulas do tipo Prova não entram na revisão espaçada."
            : "As revisões são agendadas sozinhas a partir da data da aula."}
        </p>
      </div>
    </Sheet>
  );
}

/* ---------- Prazo ---------- */

export function TaskSheet({
  open,
  onClose,
  task,
  disciplineId,
  disciplines,
}: {
  open: boolean;
  onClose: () => void;
  task?: Task;
  /** Disciplina fixa (quando o prazo é criado dentro de uma disciplina). */
  disciplineId?: string;
  /** Lista para escolher a disciplina (quando criado fora de uma). */
  disciplines?: Discipline[];
}) {
  return (
    <TaskForm
      key={open ? (task?.id ?? "novo") : "fechado"}
      open={open}
      onClose={onClose}
      task={task}
      disciplineId={disciplineId}
      disciplines={disciplines}
    />
  );
}

function TaskForm({
  open,
  onClose,
  task,
  disciplineId,
  disciplines,
}: {
  open: boolean;
  onClose: () => void;
  task?: Task;
  disciplineId?: string;
  disciplines?: Discipline[];
}) {
  const toast = useToast();
  const [title, setTitle] = useState(task?.title ?? "");
  const [type, setType] = useState<TaskType>(task?.type ?? "prova");
  const [dueDate, setDueDate] = useState(task?.dueDate ?? "");
  const [chosen, setChosen] = useState(task?.disciplineId ?? disciplineId ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");

  async function submit() {
    const data = {
      title,
      type,
      dueDate,
      notes,
      disciplineId: chosen || null,
    };
    if (task) await updateTask(task.id, data);
    else await createTask(data);
  }

  async function remove() {
    if (!task) return;
    await deleteTask(task.id);
    toast("Prazo apagado");
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={task ? "Editar prazo" : "Novo prazo"}
      submitLabel="Salvar"
      onSubmit={submit}
      canSubmit={title.trim() !== "" && dueDate !== ""}
    >
      <div className="flex flex-col gap-5">
        <Field label="O que é">
          <TextInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Prova P2, entrega do trabalho"
            autoFocus={!task}
            autoComplete="off"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data">
            <TextInput type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
          <Field label="Tipo">
            <Select value={type} onChange={(e) => setType(e.target.value as TaskType)}>
              {(Object.keys(TASK_TYPE_LABEL) as TaskType[]).map((key) => (
                <option key={key} value={key}>
                  {TASK_TYPE_LABEL[key]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {disciplines ? (
          <Field label="Disciplina">
            <Select value={chosen} onChange={(e) => setChosen(e.target.value)}>
              <option value="">Nenhuma</option>
              {disciplines.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
        <Field label="Observações">
          <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} minRows={2} />
        </Field>
        {task ? (
          <Button variant="danger" block onClick={remove} className="mt-2">
            Apagar prazo
          </Button>
        ) : null}
      </div>
    </Sheet>
  );
}
