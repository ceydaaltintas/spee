import { useState, useEffect } from 'react';
import api from '../api/client';
import type { EstimateResponse, TaskType, CriteriaValue, BaselineStory } from '../api/types';
import { criteriaLabel, criteriaDescription, TASK_TYPE_LABELS, TECHNIQUE_LABELS } from '../api/labels';
import { getScaleLabel } from '../engine/scale-labels';
import { BOOLEAN_CRITERIA } from '../engine/registry';
import { TEMPLATES } from '../engine/templates';

const COUNT_LIMITS: Record<string, { max: number; hint?: string }> = {
  dependencyCount:    { max: 20, hint: 'maks 20' },
  integrationPoints:  { max: 15, hint: 'maks 15' },
  affectedModuleCount:{ max: 20, hint: 'maks 20' },
  stakeholderCount:   { max: 15, hint: 'maks 15' },
  testCaseCount:      { max: 100, hint: 'maks 100' },
  screenCount:        { max: 20, hint: 'maks 20' },
  teamMemberCount:    { max: 15, hint: 'maks 15' },
};

function CountInput({ value, defaultValue, min, max, onChange }: {
  value: number | undefined;
  defaultValue?: number;
  min: number;
  max?: number;
  onChange: (val: string) => void;
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
    />
  );
}

const TASK_TYPES: { value: TaskType; label: string }[] = (
  ['USER_STORY', 'BUG', 'ANALYSIS', 'TEST_TASK', 'DESIGN', 'DEVOPS', 'SPIKE', 'SUB_TASK'] as TaskType[]
).map(v => ({ value: v, label: TASK_TYPE_LABELS[v] }));


const CRITERIA_BY_TASK_TYPE: Record<string, { key: string; type: 'scale5' | 'count' | 'boolean' }[]> = {
  USER_STORY: [
    { key: 'technicalComplexity', type: 'scale5' },
    { key: 'scopeClarity', type: 'scale5' },
    { key: 'dependencyCount', type: 'count' },
    { key: 'integrationPoints', type: 'count' },
    { key: 'techDebtRisk', type: 'scale5' },
    { key: 'testLoad', type: 'scale5' },
    { key: 'affectedModuleCount', type: 'count' },
    { key: 'domainKnowledge', type: 'scale5' },
    { key: 'hasSimilarHistory', type: 'boolean' },
    { key: 'hasSecurityConstraint', type: 'boolean' },
    { key: 'hasPerformanceConstraint', type: 'boolean' },
    { key: 'teamMemberCount', type: 'count' },
  ],
  BUG: [
    { key: 'reproductionDifficulty', type: 'scale5' },
    { key: 'rootCauseClarity', type: 'scale5' },
    { key: 'fixImpactScope', type: 'scale5' },
    { key: 'regressionRisk', type: 'scale5' },
    { key: 'techDebtRisk', type: 'scale5' },
    { key: 'domainKnowledge', type: 'scale5' },
    { key: 'hasSimilarHistory', type: 'boolean' },
    { key: 'hasSecurityConstraint', type: 'boolean' },
    { key: 'teamMemberCount', type: 'count' },
  ],
  ANALYSIS: [
    { key: 'ambiguityLevel', type: 'scale5' },
    { key: 'scopeClarity', type: 'scale5' },
    { key: 'domainKnowledge', type: 'scale5' },
    { key: 'stakeholderCount', type: 'count' },
    { key: 'dataAccessDifficulty', type: 'scale5' },
    { key: 'outputFormality', type: 'scale5' },
    { key: 'dependencyCount', type: 'count' },
    { key: 'hasSimilarHistory', type: 'boolean' },
    { key: 'teamMemberCount', type: 'count' },
  ],
  TEST_TASK: [
    { key: 'testCaseCount', type: 'count' },
    { key: 'regressionScope', type: 'scale5' },
    { key: 'envSetupComplexity', type: 'scale5' },
    { key: 'testDataComplexity', type: 'scale5' },
    { key: 'automationFeasibility', type: 'scale5' },
    { key: 'scopeClarity', type: 'scale5' },
    { key: 'domainKnowledge', type: 'scale5' },
    { key: 'hasSimilarHistory', type: 'boolean' },
    { key: 'teamMemberCount', type: 'count' },
  ],
  DESIGN: [
    { key: 'screenCount', type: 'count' },
    { key: 'designSystemFit', type: 'scale5' },
    { key: 'platformDiversity', type: 'scale5' },
    { key: 'approvalRounds', type: 'count' },
    { key: 'scopeClarity', type: 'scale5' },
    { key: 'stakeholderCount', type: 'count' },
    { key: 'domainKnowledge', type: 'scale5' },
    { key: 'hasSimilarHistory', type: 'boolean' },
    { key: 'userResearchNeeded', type: 'boolean' },
    { key: 'teamMemberCount', type: 'count' },
  ],
  DEVOPS: [
    { key: 'productionRisk', type: 'scale5' },
    { key: 'rollbackComplexity', type: 'scale5' },
    { key: 'envComplexity', type: 'scale5' },
    { key: 'crossTeamCoordination', type: 'scale5' },
    { key: 'techDebtRisk', type: 'scale5' },
    { key: 'dependencyCount', type: 'count' },
    { key: 'domainKnowledge', type: 'scale5' },
    { key: 'hasSimilarHistory', type: 'boolean' },
    { key: 'requiresDowntime', type: 'boolean' },
    { key: 'teamMemberCount', type: 'count' },
  ],
  SPIKE: [
    { key: 'ambiguityLevel', type: 'scale5' },
    { key: 'domainKnowledge', type: 'scale5' },
    { key: 'dataAccessDifficulty', type: 'scale5' },
    { key: 'scopeClarity', type: 'scale5' },
    { key: 'stakeholderCount', type: 'count' },
    { key: 'teamMemberCount', type: 'count' },
  ],
  SUB_TASK: [
    { key: 'technicalComplexity', type: 'scale5' },
    { key: 'scopeClarity', type: 'scale5' },
    { key: 'domainKnowledge', type: 'scale5' },
    { key: 'teamMemberCount', type: 'count' },
  ],
};

function confidenceColor(score: number): string {
  if (score >= 0.7) return '#6ee7b7';
  if (score >= 0.4) return '#fbbf24';
  return '#fca5a5';
}

// Mevcut kriterler ile baseline snapshot arasında 0–1 benzerlik skoru
function computeSimilarity(
  current: Record<string, CriteriaValue>,
  snapshot: Record<string, { type: string; value: number | boolean }>,
): number {
  const sharedKeys = Object.keys(snapshot).filter(
    k => k in current && snapshot[k].type !== 'boolean',
  );
  if (sharedKeys.length === 0) return 0;

  let totalSim = 0;
  for (const k of sharedKeys) {
    const a = current[k]?.value as number | undefined;
    const b = snapshot[k].value as number;
    if (a == null) continue;
    if (snapshot[k].type === 'scale5') {
      totalSim += 1 - Math.abs(a - b) / 4;
    } else {
      // count: log2 normalize, max=32
      const la = Math.log2((a || 0) + 1) / Math.log2(33);
      const lb = Math.log2(b + 1) / Math.log2(33);
      totalSim += 1 - Math.abs(la - lb);
    }
  }
  return totalSim / sharedKeys.length;
}

const FIBONACCI = [1, 2, 3, 5, 8, 13, 21, 34, 55];
function fibStepsBetween(a: number, b: number): number {
  const ia = FIBONACCI.indexOf(a);
  const ib = FIBONACCI.indexOf(b);
  if (ia === -1 || ib === -1) return Math.abs(a - b) > 5 ? 2 : 1;
  return Math.abs(ia - ib);
}

function BaselineRefs({ baselines, taskType, suggestedSP, currentCriteria, teamId }: {
  baselines: BaselineStory[];
  taskType: string;
  suggestedSP: number | string;
  currentCriteria: Record<string, CriteriaValue>;
  teamId: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [appliedId, setAppliedId] = useState<string | null>(null);

  // Görev tipine özgün önce, sonra genel — sadece ilgili olanlar
  const relevant = [
    ...baselines.filter(b => b.taskType === taskType),
    ...baselines.filter(b => !b.taskType),
  ];
  if (relevant.length === 0) return null;

  return (
    <div style={{ marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {relevant.map(ref => {
        const snap = ref.criteriaSnapshot as Record<string, { type: string; value: number | boolean }> | null;
        const snapEntries = snap ? Object.entries(snap).filter(([, v]) => v.type !== 'boolean') : [];
        const boolEntries = snap ? Object.entries(snap).filter(([, v]) => v.type === 'boolean' && v.value) : [];
        const isOpen = openId === ref.id;
        const diff = typeof suggestedSP === 'number' ? suggestedSP - ref.storyPoints : null;
        const diffColor = diff === null ? '#64748b' : diff > 0 ? '#fbbf24' : diff < 0 ? '#fca5a5' : '#6ee7b7';
        const diffLabel = diff === null ? '' : diff > 0 ? `+${diff} fazla tahmin` : diff < 0 ? `${diff} eksik tahmin` : 'Tam isabet';

        // Benzerlik skoru
        const similarity = snap ? computeSimilarity(currentCriteria, snap) : 0;
        const simPct = Math.round(similarity * 100);
        const spDiffSteps = typeof suggestedSP === 'number' ? fibStepsBetween(suggestedSP, ref.storyPoints) : 0;
        const showCalibrationHint = similarity >= 0.65 && spDiffSteps >= 2 && typeof suggestedSP === 'number' && suggestedSP !== ref.storyPoints;

        return (
          <div key={ref.id} style={{ background: '#0c1e35', border: '1px solid #0369a1', borderRadius: '8px', overflow: 'hidden' }}>
            {/* Başlık satırı */}
            <div
              onClick={() => setOpenId(isOpen ? null : ref.id)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 1rem', cursor: 'pointer', userSelect: 'none' }}
            >
              {/* SP badge */}
              <div style={{ minWidth: '40px', height: '40px', background: '#0c4a6e', border: '2px solid #0284c7', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 700, color: '#38bdf8', flexShrink: 0 }}>
                {ref.storyPoints}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.68rem', color: '#38bdf8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Baz İş {!ref.taskType && '· Genel'}
                  </span>
                  {snap && (
                    <span style={{ fontSize: '0.68rem', background: similarity >= 0.65 ? '#052e16' : '#1c1917', color: similarity >= 0.65 ? '#6ee7b7' : '#64748b', border: `1px solid ${similarity >= 0.65 ? '#166534' : '#334155'}`, padding: '1px 5px', borderRadius: '3px' }}>
                      %{simPct} benzer
                    </span>
                  )}
                  {showCalibrationHint && (
                    <span style={{ fontSize: '0.68rem', background: '#422006', color: '#fbbf24', border: '1px solid #78350f', padding: '1px 5px', borderRadius: '3px' }}>
                      kalibrasyon önerisi
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {ref.title}
                </div>
              </div>

              {/* SP karşılaştırması */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>motor önerisi</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#38bdf8' }}>{suggestedSP} SP</div>
                {diff !== null && diff !== 0 && (
                  <div style={{ fontSize: '0.7rem', color: diffColor, fontWeight: 600 }}>{diffLabel}</div>
                )}
                {diff === 0 && <div style={{ fontSize: '0.7rem', color: '#6ee7b7' }}>Tam isabet ✓</div>}
              </div>

              <span style={{ color: '#334155', fontSize: '0.8rem' }}>{isOpen ? '▲' : '▼'}</span>
            </div>

            {/* Açılır kriter karşılaştırması */}
            {isOpen && (
              <div style={{ borderTop: '1px solid #0369a1', padding: '0.75rem 1rem', background: '#071529' }}>
                {ref.description && (
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.75rem' }}>{ref.description}</div>
                )}
                {snapEntries.length > 0 ? (
                  <>
                    <div style={{ fontSize: '0.72rem', color: '#475569', marginBottom: '0.4rem', fontWeight: 600 }}>
                      BAZ İŞ KRİTER DEĞERLERİ
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: boolEntries.length > 0 ? '0.5rem' : 0 }}>
                      {snapEntries.map(([key, val]) => {
                        const label = val.type === 'scale5'
                          ? getScaleLabel(key, val.value as number).split(' — ')[0]
                          : String(val.value);
                        return (
                          <div key={key} style={{ background: '#0c2540', border: '1px solid #0369a1', borderRadius: '5px', padding: '3px 8px', fontSize: '0.75rem' }}>
                            <span style={{ color: '#64748b' }}>{criteriaLabel(key)}: </span>
                            <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{label}</span>
                          </div>
                        );
                      })}
                    </div>
                    {boolEntries.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {boolEntries.map(([key]) => (
                          <span key={key} style={{ fontSize: '0.72rem', background: '#422006', border: '1px solid #78350f', color: '#fbbf24', borderRadius: '4px', padding: '2px 6px' }}>
                            {criteriaLabel(key)}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ fontSize: '0.78rem', color: '#475569' }}>Bu baz iş için kriter değeri kaydedilmemiş.</div>
                )}
                {showCalibrationHint && (
                  <div style={{ marginTop: '0.75rem', background: '#1c0a00', border: '1px solid #78350f', borderRadius: '8px', padding: '0.75rem 1rem' }}>
                    <div style={{ fontSize: '0.8rem', color: '#fbbf24', fontWeight: 600, marginBottom: '0.4rem' }}>
                      Kalibrasyon Önerisi
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.75rem', lineHeight: 1.6 }}>
                      Girdiğin değerler baz işe <strong style={{ color: '#e2e8f0' }}>%{simPct}</strong> oranında benziyor.
                      Motor <strong style={{ color: '#38bdf8' }}>{suggestedSP} SP</strong> önerdi
                      ama baz işin <strong style={{ color: '#e2e8f0' }}>{ref.storyPoints} SP</strong>.
                      Bu fark, {diff! > 0
                        ? `motorun benzer işleri fazla tahmin ettiğine işaret ediyor. Ağırlıklar düşürülürse öneriler daha düşük SP'ye kayar.`
                        : `motorun benzer işleri eksik tahmin ettiğine işaret ediyor. Ağırlıklar artırılırsa öneriler daha yüksek SP'ye kayar.`}
                    </div>
                    {appliedId === ref.id ? (
                      <div style={{ fontSize: '0.78rem', color: '#6ee7b7', background: '#052e16', border: '1px solid #166534', borderRadius: '6px', padding: '0.5rem 0.75rem' }}>
                        ✓ Baz iş kalibrasyon verisi olarak eklendi. Kalibrasyon ekranından analiz et.
                      </div>
                    ) : (
                      <button
                        disabled={applyingId === ref.id}
                        onClick={async () => {
                          setApplyingId(ref.id);
                          try {
                            // Baz işi onaylı veri olarak kaydet: önce tahmin oluştur, sonra onayla
                            const estRes = await api.post('/estimate', {
                              sourceSystem: 'JIRA',
                              sourceId: `baseline-${ref.id}`,
                              teamId,
                              taskType: ref.taskType ?? taskType,
                              manualCriteria: ref.criteriaSnapshot,
                            });
                            await api.post('/estimate/approve', {
                              estimationId: estRes.data.estimationId,
                              approvedSP: ref.storyPoints,
                            });
                            setAppliedId(ref.id);
                          } catch { /* ignore */ } finally {
                            setApplyingId(null);
                          }
                        }}
                        style={{ fontSize: '0.78rem', background: '#78350f', border: '1px solid #b45309', color: '#fde68a', borderRadius: '6px', padding: '0.4rem 0.85rem', cursor: 'pointer' }}
                      >
                        {applyingId === ref.id ? 'Kaydediliyor...' : 'Baz İşi Kalibrasyon Verisi Olarak Ekle'}
                      </button>
                    )}
                  </div>
                )}
                {!showCalibrationHint && diff !== null && diff !== 0 && snap && (
                  <div style={{ marginTop: '0.75rem', padding: '0.4rem 0.75rem', background: '#0f172a', borderRadius: '6px', fontSize: '0.75rem', color: '#64748b', borderLeft: `3px solid ${diffColor}` }}>
                    Benzerlik %{simPct} — {simPct < 65 ? 'kriterler yeterince benzer değil, kalibrasyon önerilmiyor.' : 'SP farkı küçük, kalibrasyon gerekmiyor.'}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

type TeamSummary = { total: number; approved: number; pending: number; meanError: number | null; direction: 'over' | 'under' | 'balanced' | null };

const DRAFT_KEY = 'spee_estimate_draft';

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveDraft(data: object) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
}

export default function EstimatePage({ teamId, teamConfig }: { teamId: string; teamConfig: { sourceSystem?: string; activeTechnique?: string } | null }) {
  const draft = loadDraft();

  const [sourceSystem, setSourceSystem] = useState<'JIRA' | 'ADO'>(draft?.sourceSystem ?? 'JIRA');
  const [sprintId, setSprintId] = useState<string>(draft?.sprintId ?? '');
  const [summary, setSummary] = useState<TeamSummary | null>(null);

  useEffect(() => {
    if (teamConfig?.sourceSystem && !draft?.sourceSystem) {
      setSourceSystem(teamConfig.sourceSystem as 'JIRA' | 'ADO');
    }
  }, [teamConfig?.sourceSystem]);

  function handleSourceSystemChange(val: 'JIRA' | 'ADO') {
    setSourceSystem(val);
  }
  const [sourceId, setSourceId] = useState<string>(draft?.sourceId ?? '');
  const [taskType, setTaskType] = useState<TaskType>(draft?.taskType ?? 'USER_STORY');
  const [criteria, setCriteria] = useState<Record<string, CriteriaValue>>(draft?.criteria ?? { teamMemberCount: { type: 'count', value: 1 } });
  const [result, setResult] = useState<EstimateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [approveSuccess, setApproveSuccess] = useState<number | null>(null);
  const [sessionHistory, setSessionHistory] = useState<{ id: number; label: string; taskType: string; result: EstimateResponse }[]>([]);
  const [compareId, setCompareId] = useState<number | null>(null);
  const [sessionCounter, setSessionCounter] = useState(1);
  const [baselines, setBaselines] = useState<BaselineStory[]>([]);
  const [activeBaseline, setActiveBaseline] = useState<BaselineStory | null>(null);
  const [baselineDirty, setBaselineDirty] = useState(false);

  useEffect(() => {
    api.get<BaselineStory[]>(`/teams/${teamId}/baselines`).then(r => setBaselines(r.data)).catch(() => {});
    api.get<TeamSummary>(`/history/${teamId}/summary`).then(r => setSummary(r.data)).catch(() => {});
  }, [teamId]);

  useEffect(() => {
    saveDraft({ sourceSystem, sourceId, taskType, sprintId, criteria });
  }, [sourceSystem, sourceId, taskType, sprintId, criteria]);
  const [showTemplates, setShowTemplates] = useState(false);

  const activeCriteria = CRITERIA_BY_TASK_TYPE[taskType] ?? [];

  const nonBooleanFilled = Object.entries(criteria).filter(
    ([k, v]) => v && !BOOLEAN_CRITERIA.includes(k as any),
  ).length;
  const canEstimate = nonBooleanFilled >= 3;

  function setCriterion(key: string, type: 'scale5' | 'count' | 'boolean', raw: string | boolean) {
    setBaselineDirty(true);
    setCriteria(prev => {
      const next = { ...prev };
      if (type === 'boolean') {
        next[key] = { type: 'boolean', value: raw as boolean };
      } else if (raw === '') {
        delete next[key];
      } else {
        next[key] = { type, value: Number(raw) };
      }
      return next;
    });
  }


  function applyTemplate(t: typeof TEMPLATES[0]) {
    setTaskType(t.taskType as TaskType);
    setCriteria(t.criteria as any);
    setResult(null);
    setApproveSuccess(null);
    setShowTemplates(false);
    setActiveBaseline(null);
    setBaselineDirty(false);
  }

  function applyBaseline(b: BaselineStory) {
    if (b.taskType) setTaskType(b.taskType as TaskType);
    const snap = b.criteriaSnapshot as Record<string, CriteriaValue> | null;
    if (snap) setCriteria(snap);
    setResult(null);
    setApproveSuccess(null);
    setShowTemplates(false);
    setActiveBaseline(b);
    setBaselineDirty(false);
  }

  function handleReset() {
    setCriteria({ teamMemberCount: { type: 'count', value: 1 } });
    setSourceId('');
    setResult(null);
    setError('');
    setApproveSuccess(null);
    setSprintId('');
    setActiveBaseline(null);
    setBaselineDirty(false);
    localStorage.removeItem(DRAFT_KEY);
  }

  async function handleEstimate() {
    if (!sourceId.trim()) { setError('İş Kalemi numarası gerekli'); return; }
    if (!canEstimate) { setError('En az 3 kriter doldurulmalı'); return; }
    setLoading(true);
    setError('');
    setResult(null);
    setApproveSuccess(null);
    try {
      const { data } = await api.post<EstimateResponse>('/estimate', {
        sourceSystem,
        sourceId: sourceId.trim(),
        teamId,
        taskType,
        sprintId: sprintId.trim() || undefined,
        manualCriteria: criteria,
      });
      // Baz işten yüklendiyse ve kriter değiştirilmediyse baz işin SP'sini kullan
      if (activeBaseline && !baselineDirty) {
        data.suggestedSP = activeBaseline.storyPoints;
        data.engines.ruleBased.sp = activeBaseline.storyPoints;
      }
      setResult(data);
      setSessionHistory(prev => {
        const entry = {
          id: sessionCounter,
          label: `#${sessionCounter} — ${sourceId.trim() || '?'} — ${data.suggestedSP} SP`,
          taskType,
          result: data,
        };
        setSessionCounter(c => c + 1);
        return [entry, ...prev].slice(0, 20);
      });
    } catch (e: any) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(sp: number) {
    if (!result) return;
    try {
      await api.post('/estimate/approve', {
        estimationId: result.estimationId,
        approvedSP: sp,
      });
      setApproveSuccess(sp);
    } catch (e: any) {
      setError(e.response?.data?.error || e.message);
    }
  }

  const filledCount = Object.keys(criteria).filter(k => activeCriteria.some(c => c.key === k)).length;
  const totalCount = activeCriteria.length;

  return (
    <div>
      <h2>Tahmin Oluştur</h2>

      {summary && summary.total > 0 && (
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <div className="stat-card">
            <div className="stat-label">Toplam Tahmin</div>
            <div className="stat-value">{summary.total}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Onaylanan</div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#6ee7b7' }}>{summary.approved}</div>
          </div>
          {summary.pending > 0 && (
            <div className="stat-card-warn">
              <div className="stat-label">Bekleyen Onay</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#fbbf24' }}>{summary.pending}</div>
            </div>
          )}
          {summary.meanError !== null && (
            <div className="stat-card">
              <div className="stat-label">Ort. Sapma</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: summary.meanError > 0.2 ? '#fbbf24' : '#6ee7b7' }}>
                %{(summary.meanError * 100).toFixed(0)}
                {summary.direction && summary.direction !== 'balanced' && (
                  <span style={{ fontSize: '0.72rem', marginLeft: '4px', color: '#64748b' }}>
                    ({summary.direction === 'over' ? 'fazla' : 'eksik'})
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form alanları — 4 eşit sütun */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', alignItems: 'flex-end' }}>
        <label style={{ flex: 1 }}>Kaynak Sistem
          <select value={sourceSystem} onChange={e => handleSourceSystemChange(e.target.value as 'JIRA' | 'ADO')}>
            <option value="JIRA">JIRA</option>
            <option value="ADO">Azure DevOps</option>
          </select>
        </label>
        <label style={{ flex: 1 }}>İş Kalemi No
          <input value={sourceId} onChange={e => setSourceId(e.target.value)} placeholder="PROJ-123" />
        </label>
        <label style={{ flex: 1 }}>Sprint (isteğe bağlı)
          <input value={sprintId} onChange={e => setSprintId(e.target.value)} placeholder="Sprint-42" />
        </label>
        <label style={{ flex: 1 }}>Görev Tipi
          <select value={taskType} onChange={e => { setTaskType(e.target.value as TaskType); setCriteria({ teamMemberCount: { type: 'count', value: 1 } }); setResult(null); }}>
            {TASK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
      </div>

      {/* Aksiyon butonları */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', alignItems: 'center' }}>
        <button onClick={handleEstimate} disabled={loading || !canEstimate} className="primary">
          {loading ? 'Hesaplanıyor...' : 'Tahmin Et'}
        </button>
        <button onClick={handleReset}>Temizle</button>
        {activeBaseline && (
          <span style={{ fontSize: '0.75rem', background: baselineDirty ? '#1c1917' : '#0c1e35', color: baselineDirty ? '#fbbf24' : '#38bdf8', border: `1px solid ${baselineDirty ? '#78350f' : '#0369a1'}`, borderRadius: '5px', padding: '0.25rem 0.6rem' }}>
            {baselineDirty ? '✎ Baz iş değiştirildi' : `Baz iş: ${activeBaseline.title} (${activeBaseline.storyPoints} SP)`}
          </span>
        )}
        <button onClick={() => setShowTemplates(!showTemplates)} style={{ color: '#38bdf8' }}>
          {showTemplates ? 'Kapat' : 'Şablonlar'}
        </button>
{!canEstimate && (
          <span style={{ fontSize: '0.78rem', color: '#475569', marginLeft: '0.25rem' }}>
            En az 3 kriter doldur ({nonBooleanFilled}/3)
          </span>
        )}
      </div>

      {showTemplates && (
        <div style={{ margin: '0 0 1rem' }}>
          {/* Baz işlerden hızlı seçim */}
          {baselines.length > 0 && (
            <>
              <div style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                Baz İşler
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
                {baselines.map(b => {
                  const snap = b.criteriaSnapshot as Record<string, CriteriaValue> | null;
                  const criteriaCount = snap ? Object.keys(snap).filter(k => !BOOLEAN_CRITERIA.includes(k as any)).length : 0;
                  return (
                    <button
                      key={b.id}
                      onClick={() => applyBaseline(b)}
                      style={{ background: '#0c1e35', border: '2px solid #0369a1', borderRadius: '8px', padding: '0.75rem', textAlign: 'left', cursor: 'pointer', color: '#e2e8f0' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '4px' }}>
                        <span style={{ background: '#0c4a6e', color: '#38bdf8', fontWeight: 700, fontSize: '0.9rem', minWidth: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '5px' }}>
                          {b.storyPoints}
                        </span>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#38bdf8' }}>
                        {b.taskType ? (TASK_TYPE_LABELS[b.taskType] ?? b.taskType) : 'Genel'}
                        {criteriaCount > 0 && <span style={{ color: '#475569', marginLeft: '6px' }}>{criteriaCount} kriter</span>}
                      </div>
                      {b.description && (
                        <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {b.description}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Sistem şablonları */}
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            Sistem Şablonları
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.5rem' }}>
            {TEMPLATES.map((t, i) => (
              <button key={i} onClick={() => applyTemplate(t)}
                style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '0.75rem', textAlign: 'left', cursor: 'pointer', color: '#e2e8f0' }}>
                <div style={{ fontWeight: 600, marginBottom: '4px', fontSize: '0.85rem' }}>{t.name}</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{t.description}</div>
                <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: '4px' }}>{TASK_TYPE_LABELS[t.taskType]}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <h3>
        Kriterler{' '}
        <small style={{ color: '#64748b', fontWeight: 400 }}>({filledCount}/{totalCount} dolduruldu)</small>
        {filledCount > 0 && totalCount > 0 && (
          <div style={{ display: 'inline-block', width: '100px', height: '6px', background: '#334155', borderRadius: '3px', marginLeft: '8px', verticalAlign: 'middle' }}>
            <div style={{ width: `${(filledCount / totalCount) * 100}%`, height: '100%', background: '#38bdf8', borderRadius: '3px', transition: 'width 0.3s' }} />
          </div>
        )}
      </h3>
      <div className="criteria-grid">
        {activeCriteria.map(c => (
          <div key={c.key} className="criterion">
            <label>{criteriaLabel(c.key)}</label>
            <small style={{ color: '#64748b', fontSize: '0.7rem' }}>{criteriaDescription(c.key)}</small>
            {c.type === 'boolean' ? (
              <label style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={(criteria[c.key]?.value as boolean) ?? false}
                  onChange={e => setCriterion(c.key, 'boolean', e.target.checked)}
                />
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  {(criteria[c.key]?.value as boolean) ? 'Evet' : 'Hayır'}
                </span>
              </label>
            ) : c.type === 'scale5' ? (
              <select
                value={(criteria[c.key]?.value as number) ?? ''}
                onChange={e => setCriterion(c.key, 'scale5', e.target.value)}
              >
                <option value="">Seç...</option>
                {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{getScaleLabel(c.key, v)}</option>)}
              </select>
            ) : (
              <>
                <CountInput
                  value={(criteria[c.key]?.value as number) ?? undefined}
                  defaultValue={c.key === 'teamMemberCount' ? 1 : undefined}
                  min={c.key === 'teamMemberCount' ? 1 : 0}
                  max={COUNT_LIMITS[c.key]?.max}
                  onChange={val => setCriterion(c.key, 'count', val)}
                />
                {COUNT_LIMITS[c.key]?.hint && (
                  <span style={{ fontSize: '0.7rem', color: '#475569', marginTop: '2px' }}>
                    {COUNT_LIMITS[c.key]!.hint}
                  </span>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {error && <div className="error">{error}</div>}

      {/* Baz iş referans kartları */}
      {result && <BaselineRefs baselines={baselines} taskType={result.taskType} suggestedSP={result.suggestedSP} currentCriteria={criteria} teamId={teamId} />}

      {result && (
        <div className="result-card">
          <div className="result-header">
            <div className="sp-badge">{result.suggestedSP}</div>
            <div className="result-meta">
              <div><strong>Önerilen Story Point:</strong> {result.suggestedSP}</div>
              <div><strong>Teknik:</strong> {TECHNIQUE_LABELS[result.technique] ?? result.technique}</div>
              <div>
                <strong>Güven Skoru:</strong>{' '}
                <span style={{ color: confidenceColor(result.confidenceScore), fontWeight: 600 }}>
                  %{(result.confidenceScore * 100).toFixed(0)}
                </span>
                {result.confidenceScore < 0.5 && (
                  <span style={{ color: '#fbbf24', fontSize: '0.8rem' }}> — Daha fazla kriter doldurun</span>
                )}
              </div>
              {result.confidenceLow != null && result.confidenceHigh != null && (
                <div>
                  <strong>Tahmin Aralığı:</strong> {result.confidenceLow} – {result.confidenceHigh} SP
                  <small style={{ color: '#64748b', marginLeft: '6px' }}>
                    (güven {result.confidenceScore >= 0.8 ? 'yüksek → ±1' : result.confidenceScore >= 0.5 ? 'orta → ±2' : 'düşük → ±3'} adım)
                  </small>
                </div>
              )}
            </div>
          </div>

          {/* Güven bar */}
          <div style={{ margin: '0.75rem 0' }}>
            <div style={{ width: '100%', height: '8px', background: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                width: `${result.confidenceScore * 100}%`, height: '100%',
                background: 'linear-gradient(90deg, #fca5a5, #fbbf24, #6ee7b7)',
                borderRadius: '4px', transition: 'width 0.5s',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#64748b', marginTop: '2px' }}>
              <span>Düşük</span><span>Orta</span><span>Yüksek</span>
            </div>
          </div>

          {result.missingCriteria.length > 0 && (
            <div className="missing">
              <strong>Eksik kriterler ({result.missingCriteria.length}):</strong>{' '}
              {result.missingCriteria.map(k => criteriaLabel(k)).join(', ')}
            </div>
          )}

          {/* Bar chart + Tahmin/Baz karşılaştırma */}
          {(() => {
            const maxC = Math.max(...Object.values(result.breakdown).filter(x => x.rawValue.type !== 'boolean').map(x => x.contribution), 0.01);
            const rows = Object.entries(result.breakdown)
              .filter(([, b]) => b.rawValue.type !== 'boolean')
              .sort((a, b) => b[1].contribution - a[1].contribution);
            const boolRows = Object.entries(result.breakdown).filter(([, b]) => b.rawValue.type === 'boolean' && b.rawValue.value);
            const topBaseline = baselines
              .filter(b => !b.taskType || b.taskType === result.taskType)
              .map(b => {
                const s = b.criteriaSnapshot as Record<string, { type: string; value: number | boolean }> | null;
                if (!s) return null;
                return { snap: s, sim: computeSimilarity(criteria, s) };
              })
              .filter((x): x is NonNullable<typeof x> => x !== null && x.sim >= 0.4)
              .sort((a, b) => b.sim - a.sim)[0] ?? null;

            const colW = 40;
            const gap = '1rem';

            return (
              <>
                {/* Başlık satırı */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                  <h4 style={{ flex: 1, margin: 0 }}>Kriter Katkıları</h4>
                  {topBaseline && (
                    <div style={{ display: 'flex', gap }}>
                      <div style={{ width: colW, textAlign: 'right', fontSize: '0.68rem', fontWeight: 600, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tahmin</div>
                      <div style={{ width: colW, textAlign: 'right', fontSize: '0.68rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Baz</div>
                    </div>
                  )}
                </div>

                {/* Veri satırları */}
                <div style={{ display: 'flex', gap, marginBottom: '1rem', alignItems: 'flex-start' }}>
                  {/* Bar chart */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {rows.map(([key, b]) => {
                      const pct = (b.contribution / maxC) * 100;
                      return (
                        <div key={key} style={{ display: 'grid', gridTemplateColumns: '150px 1fr', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                          <div style={{ textAlign: 'right', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {criteriaLabel(key)}
                          </div>
                          <div style={{ height: '22px', background: '#0f172a', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #38bdf855, #38bdf8)', borderRadius: '4px', transition: 'width 0.3s' }} />
                            <span style={{ position: 'absolute', right: '6px', top: '3px', fontSize: '0.7rem', color: '#94a3b8' }}>
                              {b.contribution.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {boolRows.map(([key]) => (
                      <div key={key} style={{ display: 'grid', gridTemplateColumns: '150px 1fr', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                        <div style={{ textAlign: 'right', color: '#94a3b8', whiteSpace: 'nowrap' }}>{criteriaLabel(key)}</div>
                        <div style={{ fontSize: '0.75rem', color: '#fbbf24' }}>✕ çarpan olarak uygulandı</div>
                      </div>
                    ))}
                  </div>

                  {/* Tahmin + Baz sütunları */}
                  {topBaseline && (
                    <div style={{ display: 'flex', gap, flexShrink: 0 }}>
                      {/* Tahmin */}
                      <div style={{ width: colW, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {rows.map(([key, b]) => (
                          <div key={key} style={{ height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>
                            {String(b.rawValue.value)}
                          </div>
                        ))}
                      </div>
                      {/* Baz */}
                      <div style={{ width: colW, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {rows.map(([key, b]) => {
                          const bazRaw = topBaseline.snap[key];
                          const isDiff = bazRaw !== undefined && bazRaw.value !== b.rawValue.value;
                          return (
                            <div key={key} style={{ height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontSize: '0.85rem', color: isDiff ? '#fbbf24' : '#334155', fontWeight: isDiff ? 600 : 400 }}>
                              {bazRaw ? String(bazRaw.value) : ''}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </>
            );
          })()}

          <details style={{ fontSize: '0.8rem', color: '#94a3b8', background: '#0f172a', padding: '0.75rem', borderRadius: '6px', cursor: 'pointer', marginBottom: '1rem' }}>
            <summary style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '0.5rem' }}>
              Nasıl hesaplandı? — Ham skor: <strong style={{ color: '#38bdf8' }}>{result.engines.ruleBased.rawScore.toFixed(2)}</strong> / 10.00
              → <strong style={{ color: '#38bdf8' }}>{result.suggestedSP} SP</strong>
            </summary>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem', lineHeight: 1.7 }}>
              <div><strong style={{ color: '#e2e8f0' }}>1. Normalizasyon</strong><div>Her kriter 0–10 aralığına dönüştürülür. Ölçek kriterleri (1–5) iki ile çarpılır → 2–10. Sayısal kriterler logaritmik ölçeklenir (1→2, 3→4, 7→6, 15→8, 31→10).</div></div>
              <div><strong style={{ color: '#e2e8f0' }}>2. Ters kriterler</strong><div>Takım Alan Bilgisi, Kök Neden Netliği ve Otomasyon Kolaylığı ters çevrilir (10 − değer). Yüksek değer "kolay" demektir, bu yüzden düşük katkı verir.</div></div>
              <div><strong style={{ color: '#e2e8f0' }}>3. Ağırlıklı toplam</strong><div>Her kriterin normalize skoru, görev tipine özel ağırlığı ile çarpılır ve toplanır. Ağırlıklar toplamı %100'dür, yani ham skor 0–10 aralığında kalır.</div></div>
              <div><strong style={{ color: '#e2e8f0' }}>4. Boolean çarpanlar</strong><div>Güvenlik kısıtı (×1.20), performans kısıtı (×1.15), kesinti gereksinimi (×1.25) gibi boolean kriterler toplam skoru çarpan olarak artırır. Benzer geçmiş varsa ×0.80 ile azaltır.</div></div>
              <div><strong style={{ color: '#e2e8f0' }}>5. SP eşleme</strong><div>Ham skor, seçili tekniğin eşik tablosuna göre SP değerine dönüştürülür.
                {result.technique === 'FIBONACCI' && <> Fibonacci: &lt;1.5→1, &lt;2.5→2, &lt;3.5→3, &lt;5.0→5, &lt;6.5→8, &lt;7.5→13, &lt;8.5→21, &lt;9.5→34, 9.5+→55</>}
                {result.technique === 'TSHIRT' && <> Tişört: &lt;2.0→XS, &lt;3.5→S, &lt;5.0→M, &lt;7.0→L, &lt;8.5→XL, 8.5+→XXL</>}
                {result.technique === 'POWERS_OF_TWO' && <> İkinin Kuvvetleri: &lt;2.0→1, &lt;3.5→2, &lt;5.5→4, &lt;7.5→8, &lt;9.0→16, 9.0+→32</>}
                {result.technique === 'LINEAR' && <> Doğrusal: &lt;1.0→1, &lt;2.0→2, ... &lt;9.0→9, 9.0+→10</>}
              </div></div>
              <div><strong style={{ color: '#e2e8f0' }}>6. Güven skoru</strong><div>Doldurulan kriter oranı (%50 ağırlık) + kapsam netliği (%20) + benzer geçmiş (%15) ile hesaplanır. Güven düşükse tahmin aralığı genişler.</div></div>
            </div>
          </details>

          {approveSuccess != null ? (
            <div style={{ background: '#065f46', border: '1px solid #6ee7b7', borderRadius: '8px', padding: '0.75rem 1rem', color: '#6ee7b7', marginTop: '1rem' }}>
              ✓ Gerçek SP değeri <strong>{approveSuccess}</strong> olarak kaydedildi. Sistem bu veriyi ilerleyen kalibrasyon için kullanacak.
            </div>
          ) : (
            <div style={{ marginTop: '1.25rem', borderTop: '1px solid #334155', paddingTop: '1rem' }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>Onayla — Gerçek SP değeri neydi?</strong>
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.75rem' }}>
                  Seçiminiz sistemi eğitmek için kaydedilir, gelecek tahminler daha doğru olur.
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {[1, 2, 3, 5, 8, 13, 21, 34, 55].map(sp => (
                  <button
                    key={sp}
                    onClick={() => handleApprove(sp)}
                    style={{
                      width: '48px', height: '40px',
                      background: sp === result.suggestedSP ? '#0c4a6e' : '#1e293b',
                      border: `2px solid ${sp === result.suggestedSP ? '#38bdf8' : '#334155'}`,
                      borderRadius: '8px', color: sp === result.suggestedSP ? '#38bdf8' : '#e2e8f0',
                      fontWeight: sp === result.suggestedSP ? 700 : 400,
                      cursor: 'pointer', fontSize: '0.9rem',
                    }}
                  >
                    {sp}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Karşılaştırma paneli */}
      {result && sessionHistory.length >= 2 && (() => {
        const compareEntry = sessionHistory.find(h => h.id === compareId);
        return (
          <div style={{ marginTop: '2rem' }}>
            <h3>Karşılaştır
              <small style={{ fontWeight: 400, color: '#64748b', marginLeft: '8px', fontSize: '0.8rem' }}>
                Bu oturumdaki tahminlerden biriyle kıyasla
              </small>
            </h3>
            <select
              value={compareId ?? ''}
              onChange={e => setCompareId(e.target.value ? Number(e.target.value) : null)}
              style={{ marginBottom: '0.75rem' }}
            >
              <option value="">Karşılaştırılacak tahmini seç...</option>
              {sessionHistory.filter(h => h.id !== sessionHistory[0]?.id).map(h => (
                <option key={h.id} value={h.id}>{h.label}</option>
              ))}
            </select>

            {compareEntry && (() => {
              const cur = result;
              const prev = compareEntry.result;
              const spCur = typeof cur.suggestedSP === 'number' ? cur.suggestedSP : 0;
              const spPrev = typeof prev.suggestedSP === 'number' ? prev.suggestedSP : 0;
              const spDiff = spCur - spPrev;
              const scoreDiff = (cur.engines.ruleBased.rawScore ?? 0) - (prev.engines.ruleBased.rawScore ?? 0);
              const allKeys = [...new Set([...Object.keys(cur.breakdown), ...Object.keys(prev.breakdown)])];
              function rawValLabel(_key: string, rv: { type: string; value: number | boolean } | undefined): string {
                if (!rv) return '—';
                if (rv.type === 'boolean') return rv.value ? 'Evet' : 'Hayır';
                if (rv.type === 'scale5') {
                  return String(rv.value);
                }
                return String(rv.value);
              }

              const diffs = allKeys
                .filter(k => cur.breakdown[k]?.rawValue.type !== 'boolean' || prev.breakdown[k]?.rawValue.type !== 'boolean')
                .map(k => {
                  const cC = cur.breakdown[k]?.rawValue.type !== 'boolean' ? (cur.breakdown[k]?.contribution ?? 0) : 0;
                  const pC = prev.breakdown[k]?.rawValue.type !== 'boolean' ? (prev.breakdown[k]?.contribution ?? 0) : 0;
                  const curRaw = cur.breakdown[k]?.rawValue;
                  const prevRaw = prev.breakdown[k]?.rawValue;
                  return { key: k, cC, pC, diff: cC - pC, curLabel: rawValLabel(k, curRaw), prevLabel: rawValLabel(k, prevRaw) };
                })
                .filter(d => Math.abs(d.diff) > 0.001)
                .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

              return (
                <div className="result-card">
                  {/* SP özet */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '4px' }}>Mevcut Tahmin</div>
                      <div style={{ fontSize: '2rem', fontWeight: 700, color: '#38bdf8' }}>{cur.suggestedSP} SP</div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        Güven %{(cur.confidenceScore * 100).toFixed(0)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', color: spDiff > 0 ? '#fca5a5' : spDiff < 0 ? '#6ee7b7' : '#64748b' }}>
                        {spDiff > 0 ? '▲' : spDiff < 0 ? '▼' : '='} {Math.abs(spDiff)}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>SP farkı</div>
                    </div>
                    <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '4px' }}>{compareEntry.label}</div>
                      <div style={{ fontSize: '2rem', fontWeight: 700, color: '#38bdf8' }}>{prev.suggestedSP} SP</div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        Güven %{(prev.confidenceScore * 100).toFixed(0)}
                      </div>
                    </div>
                  </div>

                  {/* Kriter farkları */}
                  {diffs.length > 0 && (
                    <>
                      <h4 style={{ marginBottom: '0.5rem' }}>
                        {spDiff > 0 ? 'Bu tahmin neden daha yüksek?' : spDiff < 0 ? 'Bu tahmin neden daha düşük?' : 'Kriter farkları'}
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '160px 20px 1fr 60px 120px', gap: '8px', fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', paddingBottom: '4px', borderBottom: '1px solid #1e293b' }}>
                        <div /><div /><div />
                        <div style={{ color: '#38bdf8', textAlign: 'center' }}>Mevcut</div>
                        <div style={{ color: '#475569', textAlign: 'center' }}>Karşılaştırılan</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {diffs.map(d => (
                          <div key={d.key} style={{ display: 'grid', gridTemplateColumns: '160px 20px 1fr 60px 120px', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                            <div style={{ textAlign: 'right', color: '#94a3b8' }}>{criteriaLabel(d.key)}</div>
                            <div style={{ textAlign: 'center', color: d.diff > 0 ? '#fca5a5' : '#6ee7b7' }}>
                              {d.diff > 0 ? '▲' : '▼'}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{
                                height: '14px', borderRadius: '3px', minWidth: '4px',
                                width: `${Math.min(100, Math.abs(d.diff) * 50)}%`,
                                background: d.diff > 0 ? '#fca5a544' : '#6ee7b744',
                                border: `1px solid ${d.diff > 0 ? '#fca5a5' : '#6ee7b7'}`,
                              }} />
                              <span style={{ color: d.diff > 0 ? '#fca5a5' : '#6ee7b7', fontSize: '0.75rem' }}>
                                {d.diff > 0 ? '+' : ''}{d.diff.toFixed(2)}
                              </span>
                            </div>
                            <div style={{ textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>{d.curLabel}</div>
                            <div style={{ textAlign: 'center', color: '#475569' }}>{d.prevLabel}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                        Toplam skor farkı:{' '}
                        <strong style={{ color: scoreDiff > 0 ? '#fca5a5' : '#6ee7b7' }}>
                          {scoreDiff > 0 ? '+' : ''}{scoreDiff.toFixed(2)}
                        </strong>
                      </div>
                    </>
                  )}
                  {diffs.length === 0 && (
                    <div style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center' }}>
                      Sayısal kriter farkı yok — fark boolean çarpanlardan veya farklı görev tipinden kaynaklanıyor olabilir.
                    </div>
                  )}

                </div>
              );
            })()}
          </div>
        );
      })()}
    </div>
  );
}
