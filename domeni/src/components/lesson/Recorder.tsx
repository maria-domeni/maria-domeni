"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Mic, Square, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, Card, cx } from "@/components/ui/basics";
import { useConfirm, useToast } from "@/components/ui/overlays";
import { db } from "@/lib/db";
import { newId, nowStamp } from "@/lib/ids";
import { saveFile, updateLesson } from "@/lib/store";
import type { Lesson } from "@/lib/types";

/* Tipos mínimos do reconhecimento de voz do navegador */
interface SpeechResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechEvent {
  resultIndex: number;
  results: ArrayLike<SpeechResult>;
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
}

function createRecognition(): Recognition | null {
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Grava a aula (áudio fica no aparelho) e transcreve ao vivo com o
 * reconhecimento de voz do próprio navegador — de graça, sem IA.
 */
export function Recorder({ lesson }: { lesson: Lesson }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [interim, setInterim] = useState("");
  const [finalText, setFinalText] = useState("");
  const media = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const recognition = useRef<Recognition | null>(null);
  const active = useRef(false);
  const startedAt = useRef(0);
  const transcriptRef = useRef("");

  const recordings = useLiveQuery(() => db.recordings.where("lessonId").equals(lesson.id).toArray(), [lesson.id], []);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setSeconds(Math.round((Date.now() - startedAt.current) / 1000)), 500);
    return () => window.clearInterval(timer);
  }, [recording]);

  useEffect(
    () => () => {
      active.current = false;
      recognition.current?.stop();
      media.current?.stream.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast("Este navegador não permite gravar áudio.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      toast("Sem acesso ao microfone. Permita nas configurações do navegador.");
      return;
    }
    chunks.current = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.current.push(e.data);
    };
    recorder.start(10_000);
    media.current = recorder;
    startedAt.current = Date.now();
    transcriptRef.current = "";
    setFinalText("");
    setInterim("");
    setSeconds(0);
    active.current = true;
    setRecording(true);

    const rec = createRecognition();
    if (rec) {
      rec.lang = "pt-BR";
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (event) => {
        let temp = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) transcriptRef.current += `${result[0].transcript.trim()} `;
          else temp += result[0].transcript;
        }
        setFinalText(transcriptRef.current);
        setInterim(temp);
      };
      // O Safari para de ouvir depois de um silêncio: recomeça enquanto grava
      rec.onend = () => {
        if (active.current) {
          try {
            rec.start();
          } catch {
            // já estava rodando
          }
        }
      };
      rec.onerror = (event) => {
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          toast("A transcrição ao vivo não está disponível aqui. O áudio continua sendo gravado.");
          active.current = active.current && false;
        }
      };
      try {
        rec.start();
        recognition.current = rec;
      } catch {
        recognition.current = null;
      }
    } else {
      toast("Este navegador não transcreve ao vivo; o áudio será gravado mesmo assim.");
    }
  }

  async function stop() {
    active.current = false;
    recognition.current?.stop();
    recognition.current = null;
    const recorder = media.current;
    setRecording(false);
    if (!recorder) return;
    const done = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });
    recorder.stop();
    recorder.stream.getTracks().forEach((t) => t.stop());
    await done;
    const blob = new Blob(chunks.current, { type: recorder.mimeType || "audio/mp4" });
    const ext = (recorder.mimeType || "").includes("webm") ? "webm" : "m4a";
    const file = await saveFile(blob, `aula-${lesson.date ?? "sem-data"}.${ext}`);
    await db.recordings.add({
      id: newId(),
      lessonId: lesson.id,
      fileId: file.id,
      durationSec: Math.round((Date.now() - startedAt.current) / 1000),
      createdAt: nowStamp(),
    });
    const text = transcriptRef.current.trim();
    if (text) {
      const current = (await db.lessons.get(lesson.id))?.transcript ?? "";
      await updateLesson(lesson.id, { transcript: current ? `${current}\n\n${text}` : text });
    }
    media.current = null;
    toast(text ? "Gravação e transcrição salvas" : "Gravação salva");
  }

  return (
    <div className="space-y-3">
      <p className="rounded-2xl bg-yellow-soft px-4 py-3 text-[14px] leading-5">
        🎙️ Grave só com autorização do professor. O áudio fica guardado no seu aparelho; a transcrição ao vivo usa o
        reconhecimento de voz do próprio navegador (sem custo).
      </p>
      <Card className="flex flex-wrap items-center gap-4 px-4 py-4">
        {recording ? (
          <Button variant="danger" icon={Square} onClick={() => void stop()}>
            Parar · {clock(seconds)}
          </Button>
        ) : (
          <Button icon={Mic} onClick={() => void start()}>
            Gravar aula
          </Button>
        )}
        {recording ? (
          <span className="inline-flex items-center gap-2 text-[14px] font-bold text-danger">
            <span className="size-2.5 animate-pulse rounded-full bg-danger" /> gravando
          </span>
        ) : null}
      </Card>
      {recording && (finalText || interim) ? (
        <Card className="max-h-[260px] overflow-y-auto px-4 py-3 text-[15px] leading-[22px]">
          {finalText}
          <span className="text-label-3">{interim}</span>
        </Card>
      ) : null}
      {recordings.length > 0 ? (
        <div className="space-y-2">
          {recordings.map((r) => (
            <RecordingRow
              key={r.id}
              fileId={r.fileId}
              label={`${new Date(r.createdAt).toLocaleString("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · ${clock(r.durationSec)}`}
              onDelete={async () => {
                if (!(await confirm({ title: "Apagar esta gravação?", confirmLabel: "Apagar", destructive: true }))) return;
                await db.files.delete(r.fileId);
                await db.recordings.delete(r.id);
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RecordingRow({ fileId, label, onDelete }: { fileId: string; label: string; onDelete: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let revoked = false;
    let objectUrl: string | null = null;
    void db.files.get(fileId).then((file) => {
      if (!file || revoked) return;
      objectUrl = URL.createObjectURL(new Blob([file.data], { type: file.type }));
      setUrl(objectUrl);
    });
    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileId]);
  return (
    <Card className={cx("flex items-center gap-3 px-4 py-2.5")}>
      <span className="text-[13.5px] font-bold whitespace-nowrap">{label}</span>
      {url ? <audio controls src={url} className="h-9 min-w-0 flex-1" /> : <span className="flex-1" />}
      <button type="button" aria-label="Apagar gravação" onClick={onDelete} className="pressable inline-flex size-9 items-center justify-center rounded-full text-label-3">
        <Trash2 size={16} />
      </button>
    </Card>
  );
}
