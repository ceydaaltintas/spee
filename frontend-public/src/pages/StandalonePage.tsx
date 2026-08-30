import { useState } from 'react';
import { estimate } from '../engine/engine';
import { TASK_TYPE_REGISTRY, TECHNIQUE_REGISTRY, BOOLEAN_CRITERIA } from '../engine/registry';
import { criteriaLabel, criteriaDescription, TECHNIQUE_LABELS, TASK_TYPE_LABELS } from '../api/labels';
import { getScaleLabel } from '../engine/scale-labels';
import { TEMPLATES } from '../engine/templates';
import { ALL_CRITERIA_BY_TASK_TYPE, BOOLEAN_KEYS, DEFAULT_WEIGHTS, normalizeWeights } from '../engine/defaults';
import type { CriteriaInput, EstimationResult } from '../engine/types';

const CONFIG_KEY = 'spee_standalone_config';

type LocalWeights = Record<string, { weight: number; active: boolean }>;
type AllWeights = Record<string, LocalWeights>;

type SavedConfig = {
  weights: Record<string, Record<string, number>>;
  activeCriteria: Record<string, string[]>;
};

function buildLocalWeights(tt: string, saved: Partial<SavedConfig>): LocalWeights {
  const allCriteria = ALL_CRITERIA_BY_TASK_TYPE[tt] ?? [];
  const defaults = DEFAULT_WEIGHTS[tt] ?? {};
  const savedW = saved.weights?.[tt] ?? {};
  const savedActive = saved.activeCriteria?.[tt] ?? null;
  const result: LocalWeights = {};
  for (const c of allCriteria) {
    if (BOOLEAN_KEYS.has(c.key)) continue;
    const active = savedActive ? savedActive.includes(c.key) : c.key in defaults;
    result[c.key] = {
      weight: savedW[c.key] ?? defaults[c.key] ?? 0,
      active,
    };
  }
  return result;
}

function loadAllWeights(): AllWeights {
  let saved: Partial<SavedConfig> = {};
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) saved = JSON.parse(raw) as SavedConfig;
  } catch { /* */ }
  const result: AllWeights = {};
  for (const tt of Object.keys(ALL_CRITERIA_BY_TASK_TYPE)) {
    result[tt] = buildLocalWeights(tt, saved);
  }
  return result;
}

function persistWeights(tt: string, local: LocalWeights) {
  let saved: Partial<SavedConfig> = {};
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) saved = JSON.parse(raw) as SavedConfig;
  } catch { /* */ }
  const weights = { ...(saved.weights ?? {}), [tt]: Object.fromEntries(Object.entries(local).map(([k, v]) => [k, v.weight])) };
  const activeCriteria = { ...(saved.activeCriteria ?? {}), [tt]: Object.entries(local).filter(([, v]) => v.active).map(([k]) => k) };
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ weights, activeCriteria }));
}

const TASK_TYPES = Object.entries(TASK_TYPE_REGISTRY).map(([k, v]) => ({ value: k, label: v.label }));
const TECHNIQUES = Object.entries(TECHNIQUE_REGISTRY).map(([k, v]) => ({ value: k, label: v.label }));

const COUNT_LIMITS: Record<string, { max: number; hint?: string }> = {
  dependencyCount:     { max: 20,  hint: 'maks 20' },
  integrationPoints:   { max: 15,  hint: 'maks 15' },
  affectedModuleCount: { max: 20,  hint: 'maks 20' },
  stakeholderCount:    { max: 15,  hint: 'maks 15' },
  testCaseCount:       { max: 100, hint: 'maks 100' },
  screenCount:         { max: 20,  hint: 'maks 20' },
  approvalRounds:      { max: 10,  hint: 'maks 10' },
  teamMemberCount:     { max: 15,  hint: 'maks 15' },
};

function CountInput({ value, defaultValue, min, max, onChange, style }: {
  value: number | undefined;
  defaultValue?: number;
  min: number;
  max?: number;
  onChange: (val: string) => void;
  style: React.CSSProperties;
}) {
  const [text, setText] = useState(String(value ?? defaultValue ?? ''));
  const [focused, setFocused] = useState(false);

  const shown = focused ? text : String(value ?? defaultValue ?? '');

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={shown}
      onChange={e => {
        const v = e.target.value.replace(/[^0-9]/g, '');
        setText(v);
        if (v !== '') {
          const num = Number(v);
          const clamped = max !== undefined && num > max ? String(max) : v;
          onChange(clamped);
          if (clamped !== v) setText(clamped);
        }
      }}
      onFocus={e => { setFocused(true); setText(String(value ?? defaultValue ?? '')); e.target.select(); }}
      onBlur={() => {
        setFocused(false);
        const num = Number(text);
        if (text === '' || num < min) {
          const fallback = String(defaultValue ?? min);
          setText(fallback);
          onChange(fallback);
        } else if (max !== undefined && num > max) {
          setText(String(max));
          onChange(String(max));
        }
      }}
      placeholder={String(defaultValue ?? '0')}
      style={style}
    />
  );
}

function getCriteriaType(key: string): 'scale5' | 'count' | 'boolean' {
  if (BOOLEAN_CRITERIA.includes(key as any)) return 'boolean';
  if (['dependencyCount', 'integrationPoints', 'affectedModuleCount', 'stakeholderCount',
    'testCaseCount', 'screenCount', 'approvalRounds', 'teamMemberCount'].includes(key)) return 'count';
  return 'scale5';
}

function confidenceColor(s: number) {
  if (s >= 0.7) return '#6ee7b7';
  if (s >= 0.4) return '#fbbf24';
  return '#fca5a5';
}

function spColor(sp: number | string) {
  const n = typeof sp === 'number' ? sp : 0;
  if (n <= 3) return '#6ee7b7';
  if (n <= 8) return '#38bdf8';
  if (n <= 21) return '#fbbf24';
  return '#fca5a5';
}

interface HistoryEntry {
  id: number;
  taskType: string;
  technique: string;
  sp: number | string;
  rawScore: number;
  confidence: number;
  criteria: CriteriaInput;
  result: EstimationResult;
  date: string;
}

export default function StandalonePage() {
  const [taskType, setTaskType] = useState('USER_STORY');
  const [technique, setTechnique] = useState('FIBONACCI');
  const [criteria, setCriteria] = useState<CriteriaInput>({ teamMemberCount: { type: 'count', value: 1 } });
  const [result, setResult] = useState<EstimationResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [compareIdx, setCompareIdx] = useState<number | null>(null);
  const [darkMode, setDarkMode] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [counter, setCounter] = useState(1);
  const [activeTab, setActiveTab] = useState<'tahmin' | 'ayarlar'>('tahmin');
  const [allWeights, setAllWeights] = useState<AllWeights>(loadAllWeights);
  const [openTaskType, setOpenTaskType] = useState<string | null>('USER_STORY');

  const taskConfig = TASK_TYPE_REGISTRY[taskType];
  const activeCriteria = [...new Set(taskConfig?.activeCriteria ?? [])];
  const filledCount = Object.keys(criteria).filter(k => activeCriteria.includes(k as any)).length;
  const totalCount = activeCriteria.length;

  function setCriterion(key: string, type: 'scale5' | 'count' | 'boolean', raw: string | boolean) {
    setCriteria(prev => {
      const next = { ...prev };
      if (type === 'boolean') {
        (next as any)[key] = { type: 'boolean', value: raw as boolean };
      } else if (raw === '') {
        delete (next as any)[key];
      } else {
        (next as any)[key] = { type, value: Number(raw) };
      }
      return next;
    });
  }

  const nonBooleanFilled = Object.entries(criteria).filter(
    ([k, v]) => v && !BOOLEAN_CRITERIA.includes(k as any),
  ).length;
  const canEstimate = nonBooleanFilled >= 3;

  function handleWeightChange(tt: string, key: string, newPct: number) {
    const newFrac = Math.max(0, Math.min(99, newPct)) / 100;
    setAllWeights(prev => {
      const current = prev[tt];
      const activeWeights: Record<string, number> = {};
      for (const [k, v] of Object.entries(current)) {
        if (v.active) activeWeights[k] = v.weight;
      }
      const normalized = normalizeWeights(activeWeights, key, newFrac);
      return {
        ...prev,
        [tt]: Object.fromEntries(
          Object.entries(current).map(([k, v]) => [k, v.active ? { ...v, weight: normalized[k] ?? v.weight } : v])
        ),
      };
    });
  }

  function handleToggleActive(tt: string, key: string, active: boolean) {
    setAllWeights(prev => {
      const current = prev[tt];
      const updated = { ...current, [key]: { ...current[key], active } };
      const activeWeights: Record<string, number> = {};
      for (const [k, v] of Object.entries(updated)) {
        if (v.active) activeWeights[k] = v.weight;
      }
      const total = Object.values(activeWeights).reduce((s, w) => s + w, 0);
      if (total > 0) for (const k of Object.keys(activeWeights)) activeWeights[k] /= total;
      return {
        ...prev,
        [tt]: Object.fromEntries(
          Object.entries(updated).map(([k, v]) => [k, v.active ? { ...v, weight: activeWeights[k] ?? v.weight } : v])
        ),
      };
    });
  }

  function handleSaveWeights(tt: string) {
    persistWeights(tt, allWeights[tt] ?? {});
  }

  function handleResetDefaults(tt: string) {
    const defaults = DEFAULT_WEIGHTS[tt] ?? {};
    setAllWeights(prev => ({
      ...prev,
      [tt]: Object.fromEntries(
        Object.entries(prev[tt]).map(([k, v]) => [k, { ...v, weight: defaults[k] ?? v.weight, active: k in defaults }])
      ),
    }));
  }

  function handleEstimate() {
    if (!canEstimate) return;
    const local = allWeights[taskType];
    const customWeights = local
      ? Object.fromEntries(Object.entries(local).map(([k, v]) => [k, v.active ? v.weight : 0]))
      : undefined;
    const res = estimate(taskType, technique, criteria, customWeights);
    setResult(res);
    setHistory(prev => [{
      id: counter,
      taskType, technique,
      sp: res.suggestedSP, rawScore: res.rawScore,
      confidence: res.confidenceScore,
      criteria: { ...criteria }, result: res,
      date: new Date().toLocaleTimeString('tr-TR'),
    }, ...prev].slice(0, 30));
    setCounter(c => c + 1);
  }

  function handleReset() {
    setCriteria({ teamMemberCount: { type: 'count', value: 1 } });
    setResult(null);
    setCompareIdx(null);
  }

  function applyTemplate(t: typeof TEMPLATES[0]) {
    setTaskType(t.taskType);
    setCriteria(t.criteria);
    setResult(null);
    setShowTemplates(false);
  }

  function exportResult() {
    if (!result) return;
    const lines = [
      `## Story Point Tahmini`,
      ``,
      `**Görev Tipi:** ${TASK_TYPE_LABELS[taskType] ?? taskType}`,
      `**Teknik:** ${TECHNIQUE_LABELS[technique] ?? technique}`,
      `**Önerilen SP:** ${result.suggestedSP}`,
      `**Güven Skoru:** %${(result.confidenceScore * 100).toFixed(0)}`,
      `**Tahmin Aralığı:** ${result.confidenceLow} – ${result.confidenceHigh} SP`,
      `**Ham Skor:** ${result.rawScore.toFixed(2)} / 10.00`,
      ``,
      `### Kriter Detayları`,
      `| Kriter | Değer | Katkı |`,
      `|--------|-------|-------|`,
      ...Object.entries(result.breakdown).map(([key, b]) =>
        `| ${criteriaLabel(key)} | ${b.rawValue.type === 'boolean' ? (b.rawValue.value ? 'Evet' : 'Hayır') : b.rawValue.value} | ${b.rawValue.type === 'boolean' ? 'çarpan' : b.contribution.toFixed(3)} |`
      ),
      ``,
      `---`,
      `*SPEE — Story Point Tahmin Motoru ile oluşturuldu*`,
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    alert('Tahmin detayı panoya kopyalandı! JIRA, Confluence veya herhangi bir yere yapıştırabilirsiniz.');
  }

  const compareEntry = compareIdx !== null ? history.find(h => h.id === compareIdx) : null;

  const theme = darkMode ? {
    bg: '#0f172a', card: '#1e293b', border: '#334155',
    text: '#e2e8f0', textMuted: '#94a3b8', textDim: '#64748b',
    accent: '#38bdf8', accentBg: '#0c4a6e',
  } : {
    bg: '#f8fafc', card: '#ffffff', border: '#e2e8f0',
    text: '#1e293b', textMuted: '#475569', textDim: '#94a3b8',
    accent: '#0369a1', accentBg: '#e0f2fe',
  };

  return (
    <div style={{ background: theme.bg, color: theme.text, minHeight: '100vh' }}>
      <div className="app">
        <header style={{ borderColor: theme.border }}>
          <h1 style={{ color: theme.accent }}>SPEE</h1>
          <span className="subtitle" style={{ color: theme.textDim }}>Story Point Estimation Engine — Bağımsız Mod</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ color: '#6ee7b7', fontSize: '0.75rem', background: '#065f46', padding: '2px 8px', borderRadius: '4px' }}>
              Çevrimdışı
            </span>
            <a
              href="/"
              style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '6px', border: `1px solid ${theme.border}`, background: theme.card, color: theme.textMuted, textDecoration: 'none', whiteSpace: 'nowrap' }}
            >
              ← Ana Uygulama
            </a>
            <button
              onClick={() => setDarkMode(!darkMode)}
              style={{ background: theme.card, border: `1px solid ${theme.border}`, color: theme.text, padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              {darkMode ? '☀️ Açık' : '🌙 Koyu'}
            </button>
          </div>
        </header>

        <nav style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${theme.border}`, marginBottom: '1rem' }}>
          {(['tahmin', 'ayarlar'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === tab ? theme.accent : 'transparent'}`,
              color: activeTab === tab ? theme.accent : theme.textDim,
              fontWeight: activeTab === tab ? 600 : 400,
              padding: '0.5rem 1.25rem', cursor: 'pointer', fontSize: '0.9rem', borderRadius: 0,
            }}>
              {tab === 'tahmin' ? 'Tahmin' : 'Ayarlar'}
            </button>
          ))}
        </nav>

        <main>
          {activeTab === 'ayarlar' && (
            <div>
              <h2 style={{ color: theme.text }}>Kriter Ağırlıkları</h2>
              <p style={{ color: theme.textDim, fontSize: '0.8rem', marginBottom: '1rem' }}>
                Her görev tipi için hangi kriterlerin kullanılacağını ve ağırlıklarını ayarla.
                Bir kriteri kapattığında ağırlığı diğerlerine orantılı dağıtılır. Kaydet butonuna basınca tarayıcıya kaydedilir.
              </p>
              {Object.keys(ALL_CRITERIA_BY_TASK_TYPE).map(tt => {
                const local = allWeights[tt] ?? {};
                const defaults = DEFAULT_WEIGHTS[tt] ?? {};
                const isOpen = openTaskType === tt;
                const activeCount = Object.values(local).filter(v => v.active).length;
                const hasChanges = Object.entries(local).some(([k, v]) => {
                  const def = defaults[k];
                  return def !== undefined && (Math.abs(v.weight - def) > 0.005 || v.active !== (k in defaults));
                });
                return (
                  <div key={tt} style={{ marginBottom: '0.5rem', overflow: 'hidden', border: `1px solid ${theme.border}`, borderRadius: '8px' }}>
                    <div onClick={() => setOpenTaskType(isOpen ? null : tt)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: theme.card, cursor: 'pointer', userSelect: 'none' }}>
                      <span style={{ color: theme.accent, fontSize: '0.8rem' }}>{isOpen ? '▼' : '▶'}</span>
                      <strong style={{ flex: 1, color: theme.text }}>{TASK_TYPE_LABELS[tt] ?? tt}</strong>
                      <span style={{ fontSize: '0.75rem', color: theme.textDim }}>{activeCount} kriter aktif</span>
                      {hasChanges && (
                        <span style={{ fontSize: '0.7rem', background: darkMode ? '#1c1917' : '#fef3c7', color: '#b45309', padding: '2px 6px', borderRadius: '4px' }}>
                          değiştirildi
                        </span>
                      )}
                    </div>
                    {isOpen && (
                      <div style={{ padding: '1rem', background: darkMode ? '#0f172a' : '#ffffff' }}>
                        <table style={{ marginBottom: '0.75rem' }}>
                          <thead>
                            <tr>
                              <th style={{ width: '32px' }}></th>
                              <th>Kriter</th>
                              <th style={{ width: '80px', textAlign: 'right' }}>Varsayılan</th>
                              <th style={{ width: '64px', textAlign: 'right' }}>Mevcut</th>
                              <th style={{ width: '150px' }}>Ağırlık</th>
                              <th style={{ width: '60px', textAlign: 'right' }}>Fark</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(local)
                              .sort((a, b) => (b[1].active ? 1 : 0) - (a[1].active ? 1 : 0) || b[1].weight - a[1].weight)
                              .map(([key, val]) => {
                                const def = defaults[key];
                                const diff = def !== undefined ? val.weight - def : null;
                                const diffPct = diff !== null ? diff * 100 : null;
                                return (
                                  <tr key={key} style={{ opacity: val.active ? 1 : 0.4 }}>
                                    <td>
                                      <input type="checkbox" checked={val.active}
                                        onChange={e => handleToggleActive(tt, key, e.target.checked)}
                                        style={{ width: '16px', height: '16px' }} />
                                    </td>
                                    <td style={{ fontSize: '0.85rem', color: theme.text }}>{criteriaLabel(key)}</td>
                                    <td style={{ textAlign: 'right', color: theme.textDim, fontSize: '0.8rem' }}>
                                      {def !== undefined ? `%${(def * 100).toFixed(0)}` : '—'}
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 600, fontSize: '0.85rem', color: theme.text }}>
                                      {val.active ? `%${(val.weight * 100).toFixed(0)}` : '—'}
                                    </td>
                                    <td>
                                      {val.active && (
                                        <input type="range" min={1} max={60} step={1}
                                          value={Math.round(val.weight * 100)}
                                          onChange={e => handleWeightChange(tt, key, Number(e.target.value))}
                                          style={{ width: '100%', accentColor: theme.accent }} />
                                      )}
                                    </td>
                                    <td style={{ textAlign: 'right', fontSize: '0.8rem', fontWeight: 600 }}>
                                      {diffPct !== null && val.active && Math.abs(diffPct) > 0.5 ? (
                                        <span style={{ color: diffPct > 0 ? '#fbbf24' : '#6ee7b7' }}>
                                          {diffPct > 0 ? `+${diffPct.toFixed(0)}` : diffPct.toFixed(0)}%
                                        </span>
                                      ) : <span style={{ color: theme.border }}>—</span>}
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <button onClick={() => handleSaveWeights(tt)} className="primary">Kaydet</button>
                          <button onClick={() => handleResetDefaults(tt)} style={{ color: theme.textDim, background: 'transparent', borderColor: theme.border }}>
                            Varsayılana sıfırla
                          </button>
                          <span style={{ fontSize: '0.75rem', color: theme.textDim, marginLeft: 'auto' }}>
                            Toplam: %{(Object.values(local).filter(v => v.active).reduce((s, v) => s + v.weight, 0) * 100).toFixed(0)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'tahmin' && <>
          {/* Üst kontroller */}
          <div className="form-row" style={{ flexWrap: 'wrap' }}>
            <label style={{ color: theme.textMuted }}>Görev Tipi
              <select value={taskType} onChange={e => { setTaskType(e.target.value); setCriteria({ teamMemberCount: { type: 'count', value: 1 } }); setResult(null); }}
                style={{ background: theme.card, color: theme.text, borderColor: theme.border }}>
                {TASK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>

            <label style={{ color: theme.textMuted }}>Tahmin Tekniği
              <select value={technique} onChange={e => { setTechnique(e.target.value); setResult(null); }}
                style={{ background: theme.card, color: theme.text, borderColor: theme.border }}>
                {TECHNIQUES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
              <button onClick={handleEstimate} className="primary" disabled={!canEstimate}>
                {canEstimate ? 'Tahmin Et' : `En az 3 kriter doldurun (${nonBooleanFilled}/3)`}
              </button>
              <button onClick={handleReset} style={{ background: theme.card, borderColor: theme.border, color: theme.text }}>Temizle</button>
              <button onClick={() => setShowTemplates(!showTemplates)}
                style={{ background: theme.card, borderColor: theme.border, color: theme.accent }}>
                {showTemplates ? 'Kapat' : '📋 Şablonlar'}
              </button>
            </div>
          </div>

          {/* Şablonlar */}
          {showTemplates && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem', margin: '1rem 0' }}>
              {TEMPLATES.map((t, i) => (
                <button key={i} onClick={() => applyTemplate(t)}
                  style={{
                    background: theme.card, border: `1px solid ${theme.border}`, borderRadius: '8px',
                    padding: '0.75rem', textAlign: 'left', cursor: 'pointer', color: theme.text,
                  }}>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>{t.name}</div>
                  <div style={{ fontSize: '0.75rem', color: theme.textDim }}>{t.description}</div>
                  <div style={{ fontSize: '0.7rem', color: theme.accent, marginTop: '4px' }}>
                    {TASK_TYPE_LABELS[t.taskType]}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Kriterler */}
          <h3 style={{ color: theme.text }}>
            Kriterler{' '}
            <small style={{ color: theme.textDim, fontWeight: 400 }}>({filledCount}/{totalCount} dolduruldu)</small>
            {filledCount > 0 && totalCount > 0 && (
              <div style={{ display: 'inline-block', width: '100px', height: '6px', background: theme.border, borderRadius: '3px', marginLeft: '8px', verticalAlign: 'middle' }}>
                <div style={{ width: `${(filledCount / totalCount) * 100}%`, height: '100%', background: theme.accent, borderRadius: '3px', transition: 'width 0.3s' }} />
              </div>
            )}
          </h3>
          <div className="criteria-grid">
            {activeCriteria.map(c => {
              const type = getCriteriaType(c);
              return (
                <div key={c} className="criterion" style={{ background: theme.card, borderColor: theme.border }}>
                  <label style={{ color: theme.textMuted }}>{criteriaLabel(c)}</label>
                  <small style={{ color: theme.textDim, fontSize: '0.7rem' }}>{criteriaDescription(c)}</small>
                  {type === 'boolean' ? (
                    <label style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input type="checkbox"
                        checked={((criteria as any)[c]?.value as boolean) ?? false}
                        onChange={e => setCriterion(c, 'boolean', e.target.checked)} />
                      <span style={{ fontSize: '0.8rem', color: theme.textMuted }}>
                        {((criteria as any)[c]?.value) ? 'Evet' : 'Hayır'}
                      </span>
                    </label>
                  ) : type === 'scale5' ? (
                    <select
                      value={((criteria as any)[c]?.value as number) ?? ''}
                      onChange={e => setCriterion(c, 'scale5', e.target.value)}
                      style={{ background: theme.bg, color: theme.text, borderColor: theme.border }}>
                      <option value="">Seç...</option>
                      {[1, 2, 3, 4, 5].map(v => (
                        <option key={v} value={v}>{getScaleLabel(c, v)}</option>
                      ))}
                    </select>
                  ) : (
                    <>
                      <CountInput
                        value={(criteria as any)[c]?.value as number | undefined}
                        defaultValue={c === 'teamMemberCount' ? 1 : undefined}
                        min={c === 'teamMemberCount' ? 1 : 0}
                        max={COUNT_LIMITS[c]?.max}
                        onChange={val => setCriterion(c, 'count', val)}
                        style={{ background: theme.bg, color: theme.text, borderColor: theme.border }}
                      />
                      {COUNT_LIMITS[c]?.hint && (
                        <small style={{ color: theme.textDim, fontSize: '0.7rem' }}>{COUNT_LIMITS[c].hint}</small>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sonuç */}
          {result && (
            <div className="result-card" style={{ background: theme.card, borderColor: theme.border }}>
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
                {/* SP Badge büyük */}
                <div style={{
                  width: '100px', height: '100px', borderRadius: '16px',
                  background: `linear-gradient(135deg, ${spColor(result.suggestedSP)}33, ${spColor(result.suggestedSP)}11)`,
                  border: `2px solid ${spColor(result.suggestedSP)}`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 700, color: spColor(result.suggestedSP), lineHeight: 1 }}>
                    {result.suggestedSP}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: theme.textDim }}>Story Point</div>
                </div>

                {/* Güven gauge */}
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>Güven Skoru</strong>
                    <span style={{ color: confidenceColor(result.confidenceScore), fontWeight: 700, marginLeft: '8px', fontSize: '1.2rem' }}>
                      %{(result.confidenceScore * 100).toFixed(0)}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '10px', background: theme.border, borderRadius: '5px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${result.confidenceScore * 100}%`, height: '100%',
                      background: `linear-gradient(90deg, #fca5a5, #fbbf24, #6ee7b7)`,
                      borderRadius: '5px', transition: 'width 0.5s',
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: theme.textDim, marginTop: '2px' }}>
                    <span>Düşük</span><span>Orta</span><span>Yüksek</span>
                  </div>

                  <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: theme.textMuted }}>
                    <strong>Teknik:</strong> {TECHNIQUE_LABELS[technique] ?? technique}
                    {' · '}
                    <strong>Aralık:</strong> {result.confidenceLow} – {result.confidenceHigh} SP
                  </div>
                </div>

                {/* Aksiyon butonları */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button onClick={exportResult} style={{ background: theme.bg, borderColor: theme.border, color: theme.accent, fontSize: '0.8rem' }}>
                    📋 Kopyala
                  </button>
                </div>
              </div>

              {result.missingCriteria.length > 0 && (
                <div className="missing">
                  <strong>Eksik kriterler ({result.missingCriteria.length}):</strong>{' '}
                  {result.missingCriteria.map(k => criteriaLabel(k)).join(', ')}
                </div>
              )}

              {/* Kriter katkı bar chart */}
              <h4 style={{ color: theme.text }}>Kriter Katkıları</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '1rem' }}>
                {Object.entries(result.breakdown)
                  .filter(([, b]) => b.rawValue.type !== 'boolean')
                  .sort((a, b) => b[1].contribution - a[1].contribution)
                  .map(([key, b]) => {
                    const maxContribution = Math.max(...Object.values(result.breakdown).filter(x => x.rawValue.type !== 'boolean').map(x => x.contribution));
                    const pct = maxContribution > 0 ? (b.contribution / maxContribution) * 100 : 0;
                    return (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                        <div style={{ width: '160px', textAlign: 'right', color: theme.textMuted, flexShrink: 0 }}>
                          {criteriaLabel(key)}
                        </div>
                        <div style={{ flex: 1, height: '20px', background: theme.bg, borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                          <div style={{
                            width: `${pct}%`, height: '100%',
                            background: `linear-gradient(90deg, ${theme.accent}88, ${theme.accent})`,
                            borderRadius: '4px', transition: 'width 0.3s',
                          }} />
                          <span style={{
                            position: 'absolute', right: '6px', top: '2px',
                            fontSize: '0.7rem', color: theme.textMuted,
                          }}>
                            {b.contribution.toFixed(2)}
                          </span>
                        </div>
                        <div style={{ width: '70px', fontSize: '0.7rem', color: theme.textDim }}>
                          {b.rawValue.type === 'scale5' ? getScaleLabel(key, b.rawValue.value as number).split(' — ')[1] ?? b.rawValue.value : b.rawValue.value}
                        </div>
                      </div>
                    );
                  })}
                {Object.entries(result.breakdown)
                  .filter(([, b]) => b.rawValue.type === 'boolean' && b.rawValue.value)
                  .map(([key]) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                      <div style={{ width: '160px', textAlign: 'right', color: theme.textMuted }}>{criteriaLabel(key)}</div>
                      <div style={{ fontSize: '0.75rem', color: '#fbbf24' }}>✕ çarpan olarak uygulandı</div>
                    </div>
                  ))}
              </div>

              <details style={{ fontSize: '0.8rem', color: theme.textMuted, background: theme.bg, padding: '0.75rem', borderRadius: '6px', cursor: 'pointer' }}>
                <summary style={{ fontWeight: 600, color: theme.text, marginBottom: '0.5rem' }}>
                  Nasıl hesaplandı? — Ham skor: <strong style={{ color: theme.accent }}>{result.rawScore.toFixed(2)}</strong> / 10.00
                  → <strong style={{ color: theme.accent }}>{result.suggestedSP} SP</strong>
                </summary>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem', lineHeight: 1.7 }}>
                  <div>
                    <strong style={{ color: theme.text }}>1. Normalizasyon</strong>
                    <div>Her kriter 0–10 aralığına dönüştürülür. Ölçek kriterleri (1–5) iki ile çarpılır → 2–10. Sayısal kriterler logaritmik ölçeklenir (1→2, 3→4, 7→6, 15→8, 31→10).</div>
                  </div>
                  <div>
                    <strong style={{ color: theme.text }}>2. Ters kriterler</strong>
                    <div>Takım Alan Bilgisi, Kök Neden Netliği ve Otomasyon Kolaylığı ters çevrilir (10 − değer). Yüksek değer "kolay" demektir, bu yüzden düşük katkı verir.</div>
                  </div>
                  <div>
                    <strong style={{ color: theme.text }}>3. Ağırlıklı toplam</strong>
                    <div>Her kriterin normalize skoru, görev tipine özel ağırlığı ile çarpılır ve toplanır. Ağırlıklar toplamı %100'dür, yani ham skor 0–10 aralığında kalır.</div>
                  </div>
                  <div>
                    <strong style={{ color: theme.text }}>4. Boolean çarpanlar</strong>
                    <div>Güvenlik kısıtı (×1.20), performans kısıtı (×1.15), kesinti gereksinimi (×1.25) gibi boolean kriterler toplam skoru çarpan olarak artırır. Benzer geçmiş varsa ×0.80 ile azaltır.</div>
                  </div>
                  <div>
                    <strong style={{ color: theme.text }}>5. SP eşleme</strong>
                    <div>Ham skor, seçili tekniğin eşik tablosuna göre SP değerine dönüştürülür.
                    {technique === 'FIBONACCI' && <> Fibonacci: &lt;1.5→1, &lt;2.5→2, &lt;3.5→3, &lt;5.0→5, &lt;6.5→8, &lt;7.5→13, &lt;8.5→21, &lt;9.5→34, 9.5+→55</>}
                    {technique === 'TSHIRT' && <> Tişört: &lt;2.0→XS, &lt;3.5→S, &lt;5.0→M, &lt;7.0→L, &lt;8.5→XL, 8.5+→XXL</>}
                    {technique === 'POWERS_OF_TWO' && <> İkinin Kuvvetleri: &lt;2.0→1, &lt;3.5→2, &lt;5.5→4, &lt;7.5→8, &lt;9.0→16, 9.0+→32</>}
                    {technique === 'LINEAR' && <> Doğrusal: &lt;1.0→1, &lt;2.0→2, ... &lt;9.0→9, 9.0+→10</>}
                    </div>
                  </div>
                  <div>
                    <strong style={{ color: theme.text }}>6. Güven skoru</strong>
                    <div>Doldurulan kriter oranı (%50 ağırlık) + kapsam netliği (%20) + benzer geçmiş (%15) ile hesaplanır. Güven düşükse tahmin aralığı genişler.</div>
                  </div>
                </div>
              </details>
            </div>
          )}

          {/* Karşılaştırma */}
          {history.length >= 2 && result && (
            <div style={{ marginTop: '2rem' }}>
              <h3 style={{ color: theme.text }}>
                Karşılaştır
                <small style={{ color: theme.textDim, fontWeight: 400, marginLeft: '8px' }}>Geçmiş bir tahmini seçerek mevcut sonuçla kıyasla</small>
              </h3>
              <div className="form-row">
                <select value={compareIdx ?? ''} onChange={e => setCompareIdx(e.target.value ? Number(e.target.value) : null)}
                  style={{ background: theme.card, color: theme.text, borderColor: theme.border }}>
                  <option value="">Seç...</option>
                  {history.filter(h => h.id !== history[0]?.id).map(h => (
                    <option key={h.id} value={h.id}>#{h.id} — {TASK_TYPE_LABELS[h.taskType]} — {h.sp} SP (%{(h.confidence * 100).toFixed(0)}) — {h.date}</option>
                  ))}
                </select>
              </div>

              {compareEntry && result && (() => {
                const cur = result;
                const prev = compareEntry.result;
                const scoreDiff = cur.rawScore - prev.rawScore;
                const spCur = typeof cur.suggestedSP === 'number' ? cur.suggestedSP : 0;
                const spPrev = typeof prev.suggestedSP === 'number' ? prev.suggestedSP : 0;
                const spDiff = spCur - spPrev;

                const allKeys = [...new Set([...Object.keys(cur.breakdown), ...Object.keys(prev.breakdown)])];

                function rawLabel(rv: { type: string; value: number | boolean } | undefined): string {
                  if (!rv) return '—';
                  if (rv.type === 'boolean') return rv.value ? 'Evet' : 'Hayır';
                  return String(rv.value);
                }

                const diffs = allKeys
                  .filter(k => cur.breakdown[k]?.rawValue.type !== 'boolean' || prev.breakdown[k]?.rawValue.type !== 'boolean')
                  .map(k => {
                    const curVal = cur.breakdown[k];
                    const prevVal = prev.breakdown[k];
                    const curContrib = curVal?.rawValue.type !== 'boolean' ? (curVal?.contribution ?? 0) : 0;
                    const prevContrib = prevVal?.rawValue.type !== 'boolean' ? (prevVal?.contribution ?? 0) : 0;
                    return {
                      key: k, curContrib, prevContrib, diff: curContrib - prevContrib,
                      curLabel: rawLabel(curVal?.rawValue), prevLabel: rawLabel(prevVal?.rawValue),
                    };
                  })
                  .filter(d => Math.abs(d.diff) > 0.001)
                  .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

                return (
                  <div style={{ marginTop: '0.75rem' }}>
                    {/* Özet kartlar */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.75rem', alignItems: 'center' }}>
                      <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: theme.textDim, marginBottom: '4px' }}>Mevcut Tahmin</div>
                        <div style={{ fontSize: '2rem', fontWeight: 700, color: spColor(cur.suggestedSP) }}>{cur.suggestedSP} SP</div>
                        <div style={{ color: theme.textMuted, fontSize: '0.8rem' }}>
                          Güven: %{(cur.confidenceScore * 100).toFixed(0)} · Skor: {cur.rawScore.toFixed(2)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', color: spDiff > 0 ? '#fca5a5' : spDiff < 0 ? '#6ee7b7' : theme.textDim }}>
                          {spDiff > 0 ? '▲' : spDiff < 0 ? '▼' : '='} {Math.abs(spDiff)}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: theme.textDim }}>SP farkı</div>
                      </div>
                      <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: theme.textDim, marginBottom: '4px' }}>#{compareEntry.id} — {compareEntry.date}</div>
                        <div style={{ fontSize: '2rem', fontWeight: 700, color: spColor(prev.suggestedSP) }}>{prev.suggestedSP} SP</div>
                        <div style={{ color: theme.textMuted, fontSize: '0.8rem' }}>
                          Güven: %{(prev.confidenceScore * 100).toFixed(0)} · Skor: {prev.rawScore.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Neden fark var? */}
                    {diffs.length > 0 && (
                      <div style={{ marginTop: '1rem' }}>
                        <h4 style={{ color: theme.text, marginBottom: '0.5rem' }}>
                          {spDiff > 0 ? 'Bu tahmin neden daha yüksek?' : spDiff < 0 ? 'Bu tahmin neden daha düşük?' : 'Kriter farkları'}
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '160px 20px 1fr 50px 90px', gap: '8px', fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', paddingBottom: '4px', borderBottom: `1px solid ${theme.border}` }}>
                          <div /><div /><div />
                          <div style={{ color: theme.accent, textAlign: 'center' }}>Mevcut</div>
                          <div style={{ color: theme.textDim, textAlign: 'center' }}>Karşılaştırılan</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {diffs.map(d => {
                            const isHigher = d.diff > 0;
                            return (
                              <div key={d.key} style={{ display: 'grid', gridTemplateColumns: '160px 20px 1fr 50px 90px', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                                <div style={{ textAlign: 'right', color: theme.textMuted }}>
                                  {criteriaLabel(d.key)}
                                </div>
                                <div style={{ textAlign: 'center', fontSize: '0.9rem', color: isHigher ? '#fca5a5' : '#6ee7b7' }}>
                                  {isHigher ? '▲' : '▼'}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <div style={{
                                    height: '14px', borderRadius: '3px',
                                    width: `${Math.min(100, Math.abs(d.diff) * 50)}%`,
                                    background: isHigher ? '#fca5a544' : '#6ee7b744',
                                    border: `1px solid ${isHigher ? '#fca5a5' : '#6ee7b7'}`,
                                    minWidth: '4px',
                                  }} />
                                  <span style={{ color: isHigher ? '#fca5a5' : '#6ee7b7', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                                    {isHigher ? '+' : ''}{d.diff.toFixed(2)}
                                  </span>
                                </div>
                                <div style={{ textAlign: 'center', color: theme.textMuted, fontWeight: 600 }}>{d.curLabel}</div>
                                <div style={{ textAlign: 'center', color: theme.textDim }}>{d.prevLabel}</div>
                              </div>
                            );
                          })}
                        </div>
                        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: theme.textDim }}>
                          Toplam skor farkı: <strong style={{ color: scoreDiff > 0 ? '#fca5a5' : '#6ee7b7' }}>{scoreDiff > 0 ? '+' : ''}{scoreDiff.toFixed(2)}</strong>
                        </div>
                      </div>
                    )}

                    {diffs.length === 0 && (
                      <div style={{ marginTop: '0.75rem', color: theme.textDim, fontSize: '0.85rem', textAlign: 'center' }}>
                        İki tahmin arasında sayısal kriter farkı yok — fark boolean çarpanlardan veya farklı görev tipinden kaynaklanıyor olabilir.
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Geçmiş */}
          {history.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <h3 style={{ color: theme.text }}>Bu Oturumdaki Tahminler</h3>
              <table>
                <thead>
                  <tr><th>#</th><th>Saat</th><th>Görev Tipi</th><th>SP</th><th>Skor</th><th>Güven</th></tr>
                </thead>
                <tbody>
                  {history.map(h => (
                    <tr key={h.id}>
                      <td style={{ color: theme.textDim }}>{h.id}</td>
                      <td>{h.date}</td>
                      <td>{TASK_TYPE_LABELS[h.taskType] ?? h.taskType}</td>
                      <td><span style={{ color: spColor(h.sp), fontWeight: 700, fontSize: '1.1rem' }}>{h.sp}</span></td>
                      <td style={{ color: theme.textMuted }}>{h.rawScore.toFixed(2)}</td>
                      <td><span style={{ color: confidenceColor(h.confidence) }}>%{(h.confidence * 100).toFixed(0)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </>}
        </main>
      </div>
    </div>
  );
}
