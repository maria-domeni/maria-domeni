"use client";

import { Character } from "@/components/avatar/Character";
import { Page } from "@/components/shell/Page";
import { Card, cx } from "@/components/ui/basics";
import { CustomColorSwatch, Field, Switch, TextInput } from "@/components/ui/fields";
import { greeting } from "@/lib/alerts";
import { useNowTime, useSettingsOrDefault } from "@/lib/hooks";
import { AVATAR_ACCESSORIES, AVATAR_EYES, AVATAR_SPECIES, AVATAR_TONES } from "@/lib/settings";
import { saveSettings } from "@/lib/store";
import type { AvatarConfig, AvatarTone } from "@/lib/types";
import { useBrain } from "@/lib/useBrain";

const COLORS = ["#efe4d8", "#f7f5f2", "#c9c9cf", "#4a4a50", "#2f3440", "#d9a066", "#f2b8a0", "#f2c4d0", "#cdbfe8", "#bfe0cf", "#bcd7ef"];

const LABEL: Record<string, string> = {
  carinhosa: "Carinhosa",
  animada: "Animada",
  direta: "Direta",
  engracada: "Engraçada",
  calma: "Calma",
  gato: "Gato",
  coelho: "Coelho",
  urso: "Urso",
  raposa: "Raposa",
  pinguim: "Pinguim",
  bolinha: "Bolinha",
  pontinhos: "Pontinhos",
  felizes: "Felizes",
  sonolentos: "Sonolentos",
  brilhantes: "Brilhantes",
  nenhum: "Nenhum",
  laco: "Laço",
  oculos: "Óculos",
  fones: "Fones",
  cachecol: "Cachecol",
  boina: "Boina",
  flor: "Flor",
};

/** Editor do bichinho: espécie, cor, olhos, acessório, nome e jeito de falar. */
export default function CharacterScreen() {
  const settings = useSettingsOrDefault();
  const nowTime = useNowTime();
  const { mood } = useBrain();
  const avatar = settings.avatar;
  const patch = (p: Partial<AvatarConfig>) => void saveSettings({ avatar: { ...avatar, ...p } });

  const renderOptions = (field: "species" | "eyes" | "accessory", values: readonly string[]) => (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {values.map((value) => {
        const selected = avatar[field] === value;
        const preview: AvatarConfig = {
          ...avatar,
          [field]: value,
          ...(field === "species" && value === "pinguim" && avatar.species !== "pinguim" ? { color: "#2f3440" } : {}),
        };
        return (
          <button
            key={value}
            type="button"
            onClick={() => patch(field === "species" && value === "pinguim" && avatar.species !== "pinguim" ? { species: "pinguim", color: "#2f3440" } : { [field]: value })}
            aria-pressed={selected}
            className={cx(
              "pressable flex flex-col items-center gap-1 rounded-[12px] px-1 pt-2 pb-2",
              selected ? "bg-accent-soft ring-2 ring-accent" : "bg-fill",
            )}
          >
            <Character config={preview} size={56} />
            <span className="text-[12.5px] font-medium">{LABEL[value] ?? value}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <Page title="Seu bichinho" subtitle="Ele fica no canto da tela, avisa o que importa e procura nas suas anotações." wide>
      <div className="mt-4 grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="lg:sticky lg:top-[calc(var(--nav-h)+16px)] lg:self-start">
          <Card className="flex flex-col items-center px-5 py-6 text-center">
            <Character config={avatar} mood={mood} size={168} background="var(--fill)" className="bob" />
            <p className="mt-3 text-[22px] font-semibold tracking-[-0.02em]">{avatar.name}</p>
            <p className="mt-1 text-[14px] text-label-2">{greeting(avatar.tone, settings.profileName, nowTime)}</p>
          </Card>
          <Card className="mt-4 space-y-3 px-4 py-4">
            <Field label="Nome">
              <TextInput value={avatar.name} onChange={(e) => patch({ name: e.target.value.slice(0, 24) })} />
            </Field>
            <label className="flex items-center justify-between gap-3 text-[15px] font-medium">
              Mostrar no canto da tela
              <Switch checked={avatar.visible} onChange={(visible) => patch({ visible })} label="Mostrar no canto da tela" />
            </label>
            <label className="flex items-center justify-between gap-3 text-[15px] font-medium">
              Bochechas rosadas
              <Switch checked={avatar.blush} onChange={(blush) => patch({ blush })} label="Bochechas rosadas" />
            </label>
            <div className="grid grid-cols-2 gap-0.5 rounded-[10px] bg-fill p-[3px]">
              {(["esquerda", "direita"] as const).map((side) => (
                <button
                  key={side}
                  type="button"
                  onClick={() => patch({ side })}
                  className={cx(
                    "h-8 rounded-[8px] text-[13.5px]",
                    avatar.side === side ? "bg-(--thumb) font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.12)]" : "font-medium text-label-2",
                  )}
                >
                  Canto {side}
                </button>
              ))}
            </div>
          </Card>
        </div>
        <div className="space-y-4">
          <Card className="px-4 py-4">
            <p className="mb-3 text-[14px] font-semibold">Bichinho</p>
            {renderOptions("species", AVATAR_SPECIES)}
          </Card>
          <Card className="px-4 py-4">
            <p className="mb-3 text-[14px] font-semibold">Cor</p>
            <div className="flex flex-wrap gap-2.5">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Cor ${color}`}
                  onClick={() => patch({ color })}
                  className={cx(
                    "pressable size-9 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,.12)]",
                    avatar.color === color && "ring-2 ring-accent ring-offset-2 ring-offset-surface",
                  )}
                  style={{ background: color }}
                />
              ))}
              <CustomColorSwatch value={avatar.color} selected={!COLORS.includes(avatar.color)} onChange={(color) => patch({ color })} label="Outra cor" />
            </div>
          </Card>
          <Card className="px-4 py-4">
            <p className="mb-3 text-[14px] font-semibold">Olhos</p>
            {renderOptions("eyes", AVATAR_EYES)}
          </Card>
          <Card className="px-4 py-4">
            <p className="mb-3 text-[14px] font-semibold">Acessório</p>
            {renderOptions("accessory", AVATAR_ACCESSORIES)}
          </Card>
          <Card className="px-4 py-4">
            <p className="mb-3 text-[14px] font-semibold">Jeito de falar</p>
            <div className="flex flex-wrap gap-2">
              {AVATAR_TONES.map((tone) => (
                <button
                  key={tone}
                  type="button"
                  onClick={() => patch({ tone: tone as AvatarTone })}
                  className={cx(
                    "pressable h-9 rounded-[10px] px-3.5 text-[14px] font-medium",
                    avatar.tone === tone ? "bg-accent-solid text-on-accent" : "bg-fill",
                  )}
                >
                  {LABEL[tone]}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </Page>
  );
}
