import { createContext, useContext, useState, type ReactNode } from 'react';
import {
  UI, CRITERIA_LABELS_EN, TASK_TYPE_LABELS_EN, TECHNIQUE_LABELS_EN, SCALE5_LABELS_EN,
  type Lang,
} from '../i18n/translations';
import { CRITERIA_LABELS, TASK_TYPE_LABELS, TECHNIQUE_LABELS } from '../api/labels';
import { SCALE5_LABELS } from '../engine/scale-labels';

type LangCtxType = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  criteriaLabel: (key: string) => string;
  criteriaDescription: (key: string) => string;
  taskTypeLabel: (key: string) => string;
  techniqueLabel: (key: string) => string;
  scaleLabel: (key: string, value: number) => string;
};

const LangCtx = createContext<LangCtxType>(null!);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem('spee_lang') as Lang) ?? 'tr';
  });

  function setLang(l: Lang) {
    setLangState(l);
    localStorage.setItem('spee_lang', l);
  }

  function t(key: string): string {
    return UI[lang][key] ?? UI.tr[key] ?? key;
  }

  function criteriaLabel(key: string): string {
    if (lang === 'en') return CRITERIA_LABELS_EN[key]?.label ?? CRITERIA_LABELS[key]?.label ?? key;
    return CRITERIA_LABELS[key]?.label ?? key;
  }

  function criteriaDescription(key: string): string {
    if (lang === 'en') return CRITERIA_LABELS_EN[key]?.description ?? CRITERIA_LABELS[key]?.description ?? '';
    return CRITERIA_LABELS[key]?.description ?? '';
  }

  function taskTypeLabel(key: string): string {
    if (lang === 'en') return TASK_TYPE_LABELS_EN[key] ?? TASK_TYPE_LABELS[key] ?? key;
    return TASK_TYPE_LABELS[key] ?? key;
  }

  function techniqueLabel(key: string): string {
    if (lang === 'en') return TECHNIQUE_LABELS_EN[key] ?? TECHNIQUE_LABELS[key] ?? key;
    return TECHNIQUE_LABELS[key] ?? key;
  }

  function scaleLabel(key: string, value: number): string {
    const labels = lang === 'en'
      ? (SCALE5_LABELS_EN[key] ?? SCALE5_LABELS[key as keyof typeof SCALE5_LABELS])
      : SCALE5_LABELS[key as keyof typeof SCALE5_LABELS];
    if (!labels || value < 1 || value > 5) return String(value);
    return `${value} — ${labels[value - 1]}`;
  }

  return (
    <LangCtx.Provider value={{ lang, setLang, t, criteriaLabel, criteriaDescription, taskTypeLabel, techniqueLabel, scaleLabel }}>
      {children}
    </LangCtx.Provider>
  );
}

export function useLang() {
  return useContext(LangCtx);
}
