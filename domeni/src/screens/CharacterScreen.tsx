"use client";

import { Character } from "@/components/avatar/Character";
import { Page } from "@/components/shell/Page";
import { Card, cx } from "@/components/ui/basics";
import { CustomColorSwatch, Field, Switch, TextInput } from "@/components/ui/fields";
import { greeting } from "@/lib/alerts";
import { useNowTime, useSettingsOrDefault } from "@/lib/hooks";
import { AVATAR_ACCESSORIES, AVATAR_EYES, AVATAR_HAIRS, AVATAR_MOUTHS, AVATAR_TONES } from "@/lib/settings";
import { saveSettings } from "@/lib/store";
import type { AvatarConfig, AvatarTone } from "@/lib/types";
import { useBrain } from "@/lib/useBrain";

const SKINS = ["#ffe0c7", "#f2c6a0", "#e0a882", "#c68863", "#a0674a", "#7a4a33", "#5a3424"];
const HAIR_COLORS = ["#2b1b17", "#4a2c22", "#7a4a2c", "#b8743a", "#e6c27a", "#d9d2c9", "#c45b8a", "#7c6be0", "#3d6fd1"];
const OUTFITS = ["#f4a7c0", "#c9b6f0", "#a8d5c2", "#a9c8ee", "#f7d08a", "#8e2f55", "#2b2b30", "#ffffff"];

const LABEL: Record<string, string> = {
  carinhosa: "Carinhosa 💗",
  animada: "Animada ✨",
  direta: "Direta 🎯",
  engracada: "Engraçada 😄",
  calma: "Calma 🌿",
  longo: "Longo",
  curto: "Curto",
  coque: "Coque",
  cacheado: "Cacheado",
  franja: "Franja",
  rabo: "Rabo de cavalo",
  tranca: "Tranças",
  careca: "Sem cabelo",
  redondos: "Redondos",
  felizes: "Felizes",
  estrela: "Estrela",
  sonolentos: "Sonolentos",
  sorriso: "Sorriso",
  aberto: "Risada",
  gatinho: "Gatinho",
  tranquilo: "Tranquilo",
  nenhum: "Nenhum",
  laco: "Laço",
  oculos: "Óculos",
  fones: "Fones",
  flor: "Flor",
  chapeu: "Boina",
};

/** Editor do personagem: rosto, cabelo, roupa, nome e jeito de falar. */
export default function CharacterScreen() {
  const settings = useSettingsOrDefault();
  const nowTime = useNowTime();
  const { mood } = useBrain();
  const avatar = settings.avatar;
  const patch = (p: Partial<AvatarConfig>) => void saveSettings({ avatar: { ...avatar, ...p } });

  const renderOptions = (field: keyof AvatarConfig, values: readonly string[]) => (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => {
        const selected = avatar[field] === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => patch({ [field]: value } as Partial<AvatarConfig>)}
            aria-pressed={selected}
            className={cx("pressable flex flex-col items-center gap-1 rounded-2xl p-1.5 pb-2", selected ? "bg-accent-soft ring-2 ring-accent" : "bg-fill")}
          >
            <Character config={{ ...avatar, [field]: value }} size={64} mood={field === "eyes" || field === "mouth" ? "feliz" : mood} />
            <span className="text-[12px] font-bold">{LABEL[value] ?? value}</span>
          </button>
        );
      })}
    </div>
  );

  const renderColors = (field: "skin" | "hairColor" | "outfit", values: string[]) => (
    <div className="flex flex-wrap gap-2">
      {values.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={`Cor ${color}`}
          onClick={() => patch({ [field]: color })}
          className={cx("pressable size-10 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,.12)]", avatar[field] === color && "ring-[3px] ring-accent ring-offset-2 ring-offset-surface")}
          style={{ background: color }}
        />
      ))}
      <CustomColorSwatch value={avatar[field]} selected={!values.includes(avatar[field])} onChange={(c) => patch({ [field]: c })} label="Outra cor" />
    </div>
  );

  return (
    <Page title="Seu personagem" subtitle="Ele fica no canto da tela, te lembra de tudo e responde suas perguntas." wide>
      <div className="mt-4 grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="lg:sticky lg:top-[calc(var(--nav-h)+16px)] lg:self-start">
          <Card className="flex flex-col items-center px-5 py-6 text-center">
            <Character config={avatar} mood={mood} size={200} background="color-mix(in srgb, var(--accent) 18%, var(--surface))" className="bob" />
            <p className="mt-3 font-display text-[28px] font-bold">{avatar.name}</p>
            <p className="mt-1 rounded-2xl bg-fill px-3 py-2 text-[14.5px]">{greeting(avatar.tone, settings.profileName, nowTime)}</p>
          </Card>
          <Card className="mt-4 space-y-3 px-4 py-4">
            <Field label="Nome">
              <TextInput value={avatar.name} onChange={(e) => patch({ name: e.target.value.slice(0, 24) })} />
            </Field>
            <label className="flex items-center justify-between gap-3 text-[15px] font-semibold">
              Mostrar no canto da tela
              <Switch checked={avatar.visible} onChange={(visible) => patch({ visible })} label="Mostrar no canto da tela" />
            </label>
            <label className="flex items-center justify-between gap-3 text-[15px] font-semibold">
              Bochechas coradas
              <Switch checked={avatar.blush} onChange={(blush) => patch({ blush })} label="Bochechas" />
            </label>
            <div className="flex gap-2">
              {(["direita", "esquerda"] as const).map((side) => (
                <button
                  key={side}
                  type="button"
                  onClick={() => patch({ side })}
                  className={cx("pressable h-9 flex-1 rounded-full text-[14px] font-bold", avatar.side === side ? "bg-accent-solid text-on-accent" : "bg-fill")}
                >
                  Canto {side}
                </button>
              ))}
            </div>
          </Card>
        </div>
        <div className="space-y-5">
          <Card className="px-4 py-4">
            <p className="mb-2 font-bold">Jeito de falar</p>
            <div className="flex flex-wrap gap-2">
              {AVATAR_TONES.map((tone) => (
                <button
                  key={tone}
                  type="button"
                  onClick={() => patch({ tone: tone as AvatarTone })}
                  className={cx("pressable h-10 rounded-full px-4 text-[14.5px] font-bold", avatar.tone === tone ? "bg-accent-solid text-on-accent" : "bg-fill")}
                >
                  {LABEL[tone]}
                </button>
              ))}
            </div>
          </Card>
          <Card className="px-4 py-4">
            <p className="mb-2 font-bold">Pele</p>
            {renderColors("skin", SKINS)}
          </Card>
          <Card className="px-4 py-4">
            <p className="mb-2 font-bold">Cabelo</p>
            {renderOptions("hair", AVATAR_HAIRS)}
            <p className="mt-4 mb-2 font-bold">Cor do cabelo</p>
            {renderColors("hairColor", HAIR_COLORS)}
          </Card>
          <Card className="px-4 py-4">
            <p className="mb-2 font-bold">Olhos</p>
            {renderOptions("eyes", AVATAR_EYES)}
            <p className="mt-4 mb-2 font-bold">Boca</p>
            {renderOptions("mouth", AVATAR_MOUTHS)}
          </Card>
          <Card className="px-4 py-4">
            <p className="mb-2 font-bold">Acessório</p>
            {renderOptions("accessory", AVATAR_ACCESSORIES)}
            <p className="mt-4 mb-2 font-bold">Roupa</p>
            {renderColors("outfit", OUTFITS)}
          </Card>
        </div>
      </div>
    </Page>
  );
}
