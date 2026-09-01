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

function CountInput({ value, defaultValue, min, max, onChange, style }: {
  value: number | undefined;
  defaultValue?: number;
  min: number;
  max?: number;
  onChange: (val: string) => void;
  style?: React.CSSProperties;
}) {
  const [text, setText] = useState(String(value ?? defaultValue ?? ''));
  const [focused, setFocused] = useState(false);
  const shown = focused ? text : String(value ?? defaultValue ?? '');
  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      style={style}
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

function confidenceClass(score: number): string {
  if (score >= 0.7) return 'stat-value-green';
  if (score >= 0.4) return 'stat-value-amber';
  return 'stat-value-red';
}

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
        const diffClass = diff === null ? 'stat-value-muted' : diff > 0 ? 'stat-value-amber' : diff < 0 ? 'stat-value-red' : 'stat-value-green';
        const diffLabel = diff === null ? '' : diff > 0 ? `+${diff} fazla tahmin` : diff < 0 ? `${diff} eksik tahmin` : 'Tam isabet';

        const similarity = snap ? computeSimilarity(currentCriteria, snap) : 0;
        const simPct = Math.round(similarity * 100);
        const spDiffSteps = typeof suggestedSP === 'number' ? fibStepsBetween(suggestedSP, ref.storyPoints) : 0;
        const showCalibrationHint = similarity >= 0.65 && spDiffSteps >= 2 && typeof suggestedSP === 'number' && suggestedSP !== ref.storyPoints;

        return (
          <div key={ref.id} className="baseline-item">
            <div className="baseline-item-head" onClick={() => setOpenId(isOpen ? null : ref.id)}>
              <div className="baseline-sp-badge">{ref.storyPoints}</div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2px' }}>
                  <span className="baseline-tag baseline-tag-accent">Baz İş {!ref.taskType && '· Genel'}</span>
                  {snap && (
                    <span className={`baseline-tag ${similarity >= 0.65 ? 'baseline-tag-match' : 'baseline-tag-muted'}`}>
                      %{simPct} benzer
                    </span>
                  )}
                  {showCalibrationHint && (
                    <span className="baseline-tag baseline-tag-warn">kalibrasyon önerisi</span>
                  )}
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  className="team-name">
                  {ref.title}
                </div>
              </div>

              <div className="baseline-sp-compare">
                <div style={{ fontSize: '0.7rem' }} className="criterion-desc">motor önerisi</div>
                <div style={{ fontSize: '1rem', fontWeight: 700 }} className="stat-value-accent">{suggestedSP} SP</div>
                {diff !== null && diff !== 0 && (
                  <div style={{ fontSize: '0.7rem', fontWeight: 600 }} className={diffClass}>{diffLabel}</div>
                )}
                {diff === 0 && <div style={{ fontSize: '0.7rem' }} className="stat-value-green">Tam isabet ✓</div>}
              </div>

              <span style={{ fontSize: '0.8rem' }} className="criterion-desc">{isOpen ? '▲' : '▼'}</span>
            </div>

            {isOpen && (
              <div className="baseline-item-body">
                {ref.description && (
                  <div style={{ fontSize: '0.78rem', marginBottom: '0.75rem' }} className="criterion-desc">{ref.description}</div>
                )}
                {snapEntries.length > 0 ? (
                  <>
                    <div style={{ fontSize: '0.72rem', marginBottom: '0.4rem' }} className="section-label-muted">
                      BAZ İŞ KRİTER DEĞERLERİ
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: boolEntries.length > 0 ? '0.5rem' : 0 }}>
                      {snapEntries.map(([key, val]) => {
                        const label = val.type === 'scale5'
                          ? getScaleLabel(key, val.value as number).split(' — ')[0]
                          : String(val.value);
                        return (
                          <div key={key} className="criteria-chip">
                            <span className="criteria-chip-key">{criteriaLabel(key)}: </span>
                            <span className="criteria-chip-val">{label}</span>
                          </div>
                        );
                      })}
                    </div>
                    {boolEntries.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {boolEntries.map(([key]) => (
                          <span key={key} className="badge-amber">{criteriaLabel(key)}</span>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ fontSize: '0.78rem' }} className="criterion-desc">Bu baz iş için kriter değeri kaydedilmemiş.</div>
                )}
                {showCalibrationHint && (
                  <div className="calib-hint-box">
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }} className="stat-value-amber">
                      Kalibrasyon Önerisi
                    </div>
                    <div style={{ fontSize: '0.78rem', marginBottom: '0.75rem', lineHeight: 1.6 }} className="criterion-desc">
                      Girdiğin değerler baz işe <strong style={{ color: 'var(--text-primary)' }}>%{simPct}</strong> oranında benziyor.
                      Motor <strong style={{ color: 'var(--accent-text)' }}>{suggestedSP} SP</strong> önerdi
                      ama baz işin <strong style={{ color: 'var(--text-primary)' }}>{ref.storyPoints} SP</strong>.
                      {diff! > 0
                        ? ' Motorun benzer işleri fazla tahmin ettiğine işaret ediyor.'
                        : ' Motorun benzer işleri eksik tahmin ettiğine işaret ediyor.'}
                    </div>
                    {appliedId === ref.id ? (
                      <div className="calib-applied">
                        ✓ Baz iş kalibrasyon verisi olarak eklendi. Kalibrasyon ekranından analiz et.
                      </div>
                    ) : (
                      <button
                        className="btn-approve"
                        disabled={applyingId === ref.id}
                        onClick={async () => {
                          setApplyingId(ref.id);
                          try {
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
                      >
                        {applyingId === ref.id ? 'Kaydediliyor...' : 'Baz İşi Kalibrasyon Verisi Olarak Ekle'}
                      </button>
                    )}
                  </div>
                )}
                {!showCalibrationHint && diff !== null && diff !== 0 && snap && (
                  <div className="diff-note" style={{ borderLeftColor: diff > 0 ? 'var(--amber-border)' : 'var(--red-border)' }}>
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

  const [sourceSystem, setSourceSystem] = useState<'JIRA' | 'ADO'>(
    (teamConfig?.sourceSystem as 'JIRA' | 'ADO') ?? 'JIRA'
  );
  const [sprintId, setSprintId] = useState<string>(draft?.sprintId ?? '');
  const [summary, setSummary] = useState<TeamSummary | null>(null);

  useEffect(() => {
    if (teamConfig?.sourceSystem) {
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
    saveDraft({ sourceSystem, sourceId, taskType, sprintId, criteria, pbiTitle, pbiDesc, autoFilledKeys });
  }, [sourceSystem, sourceId, taskType, sprintId, criteria]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSourcePanel, setShowSourcePanel] = useState(false);
  const [showAnalyzePanel, setShowAnalyzePanel] = useState(false);
  const [pbiTitle, setPbiTitle] = useState<string>(draft?.pbiTitle ?? '');
  const [pbiDesc, setPbiDesc] = useState<string>(draft?.pbiDesc ?? '');
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState('');
  const [autoFilledKeys, setAutoFilledKeys] = useState<Record<string, 'regex' | 'llm'>>(draft?.autoFilledKeys ?? {});

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
    setPbiTitle('');
    setPbiDesc('');
    setAutoFilledKeys({});
    localStorage.removeItem(DRAFT_KEY);
  }

  async function handleAnalyze() {
    if (!pbiTitle.trim()) { setAnalyzeError('PBI başlığı gerekli'); return; }
    setAnalyzing(true);
    setAnalyzeError('');
    try {
      const { data } = await api.post('/analyze-text', { title: pbiTitle.trim(), description: pbiDesc.trim() || undefined });
      if (data.detectedTaskType) {
        setTaskType(data.detectedTaskType as TaskType);
        setCriteria({ teamMemberCount: { type: 'count', value: 1 } });
      }
      if (Object.keys(data.suggestedCriteria).length > 0) {
        setCriteria(prev => ({ ...prev, ...data.suggestedCriteria }));
        setAutoFilledKeys(data.sources ?? {});
      }
    } catch (e: any) {
      setAnalyzeError(e.response?.data?.error || e.message);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleEstimate() {
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
      if (activeBaseline && !baselineDirty) {
        data.suggestedSP = activeBaseline.storyPoints;
        data.engines.ruleBased.sp = activeBaseline.storyPoints;
      }
      setResult(data);
      setSessionHistory(prev => {
        const entry = {
          id: sessionCounter,
          label: `#${sessionCounter} — ${sourceId.trim() || TASK_TYPE_LABELS[taskType] || taskType} — ${data.suggestedSP} SP`,
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
            <div className="stat-value-green">{summary.approved}</div>
          </div>
          {summary.pending > 0 && (
            <div className="stat-card">
              <div className="stat-label">Bekleyen Onay</div>
              <div className="stat-value-amber">{summary.pending}</div>
            </div>
          )}
          {summary.meanError !== null && (
            <div className="stat-card">
              <div className="stat-label">Ort. Sapma</div>
              <div className={summary.meanError > 0.2 ? 'stat-value-amber' : 'stat-value-green'}>
                %{(summary.meanError * 100).toFixed(0)}
                {summary.direction && summary.direction !== 'balanced' && (
                  <span style={{ fontSize: '0.72rem', marginLeft: '4px' }} className="criterion-desc">
                    ({summary.direction === 'over' ? 'fazla' : 'eksik'})
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* PBI Metin Analizi */}
      <div style={{ marginBottom: '0.5rem' }}>
        <button className="collapsible-btn" onClick={() => setShowAnalyzePanel(p => !p)}>
          <span style={{ fontSize: '0.65rem' }}>{showAnalyzePanel ? '▲' : '▼'}</span>
          Metinden Otomatik Doldur
          {Object.keys(autoFilledKeys).length > 0 && (
            <span className="collapsible-filled">· {Object.keys(autoFilledKeys).length} kriter dolduruldu</span>
          )}
        </button>
        {showAnalyzePanel && (
          <div style={{ marginTop: '0.6rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <input
                value={pbiTitle}
                onChange={e => setPbiTitle(e.target.value)}
                placeholder="PBI başlığı (zorunlu)"
              />
              <textarea
                value={pbiDesc}
                onChange={e => setPbiDesc(e.target.value)}
                placeholder="Açıklama / acceptance criteria (isteğe bağlı)"
                rows={2}
                style={{ resize: 'vertical', padding: '0.5rem', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '0.85rem' }}
              />
              {analyzeError && <div className="error" style={{ margin: 0 }}>{analyzeError}</div>}
            </div>
            <button
              onClick={handleAnalyze}
              disabled={analyzing || !pbiTitle.trim()}
              className="primary"
              style={{ flexShrink: 0, alignSelf: 'flex-start' }}
            >
              {analyzing ? 'Analiz ediliyor...' : 'Analiz Et'}
            </button>
          </div>
        )}
      </div>

      {/* Collapsible kaynak panel */}
      <div style={{ marginBottom: '0.75rem' }}>
        <button className="collapsible-btn" onClick={() => setShowSourcePanel(p => !p)}>
          <span style={{ fontSize: '0.65rem' }}>{showSourcePanel ? '▲' : '▼'}</span>
          Kaynak Sistem / İş Kalemi / Sprint
          {(sourceId || sprintId) && (
            <span className="collapsible-filled">
              {[sourceId, sprintId].filter(Boolean).join(' · ')}
            </span>
          )}
        </button>
        {showSourcePanel && (
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.6rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <label style={{ flex: '0 0 130px' }}>Kaynak Sistem
              <select value={sourceSystem} onChange={e => handleSourceSystemChange(e.target.value as 'JIRA' | 'ADO')}>
                <option value="JIRA">JIRA</option>
                <option value="ADO">Azure DevOps</option>
              </select>
            </label>
            <label style={{ flex: 1, minWidth: '130px' }}>İş Kalemi No
              <input value={sourceId} onChange={e => setSourceId(e.target.value)} placeholder="PROJ-123" />
            </label>
            <label style={{ flex: 1, minWidth: '130px' }}>Sprint (isteğe bağlı)
              <input value={sprintId} onChange={e => setSprintId(e.target.value)} placeholder="Sprint-42" />
            </label>
          </div>
        )}
      </div>

      {/* Görev Tipi + Aksiyon butonları */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <label style={{ flex: '1 1 180px', minWidth: 0 }}>Görev Tipi
          <select value={taskType} onChange={e => {
            const newType = e.target.value as TaskType;
            const newKeys = new Set((CRITERIA_BY_TASK_TYPE[newType] ?? []).map(c => c.key));
            setTaskType(newType);
            setCriteria(prev => {
              const kept: typeof prev = { teamMemberCount: { type: 'count', value: 1 } };
              for (const [k, v] of Object.entries(prev)) {
                if (newKeys.has(k)) kept[k] = v;
              }
              return kept;
            });
            setAutoFilledKeys(prev => Object.fromEntries(Object.entries(prev).filter(([k]) => newKeys.has(k))));
            setResult(null);
          }}>
            {TASK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', paddingBottom: '2px', flexWrap: 'wrap' }}>
          <button onClick={handleEstimate} disabled={loading || !canEstimate} className="primary">
            {loading ? 'Hesaplanıyor...' : 'Tahmin Et'}
          </button>
          <button onClick={handleReset}>Temizle</button>
          <button onClick={() => setShowTemplates(!showTemplates)} className={showTemplates ? 'active' : ''}>
            {showTemplates ? 'Kapat' : 'Şablonlar'}
          </button>
          {activeBaseline && (
            <span className={`active-baseline-chip ${baselineDirty ? 'dirty' : 'clean'}`}>
              {baselineDirty ? '✎ Baz iş değiştirildi' : `Baz iş: ${activeBaseline.title} (${activeBaseline.storyPoints} SP)`}
            </span>
          )}
          {!canEstimate && (
            <span style={{ fontSize: '0.78rem' }} className="criterion-desc">
              En az 3 kriter doldur ({nonBooleanFilled}/3)
            </span>
          )}
        </div>
      </div>

      {showTemplates && (
        <div style={{ margin: '0 0 1rem' }}>
          {baselines.length > 0 && (
            <>
              <div className="section-label-accent">Baz İşler</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
                {baselines.map(b => {
                  const snap = b.criteriaSnapshot as Record<string, CriteriaValue> | null;
                  const criteriaCount = snap ? Object.keys(snap).filter(k => !BOOLEAN_CRITERIA.includes(k as any)).length : 0;
                  return (
                    <button key={b.id} onClick={() => applyBaseline(b)} className="template-baseline-btn">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '4px' }}>
                        <span className="template-sp-pill">{b.storyPoints}</span>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</span>
                      </div>
                      <div style={{ fontSize: '0.72rem' }} className="stat-value-accent">
                        {b.taskType ? (TASK_TYPE_LABELS[b.taskType] ?? b.taskType) : 'Genel'}
                        {criteriaCount > 0 && <span style={{ marginLeft: '6px' }} className="criterion-desc">{criteriaCount} kriter</span>}
                      </div>
                      {b.description && (
                        <div style={{ fontSize: '0.72rem', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} className="criterion-desc">
                          {b.description}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className="section-label-muted">Sistem Şablonları</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.5rem' }}>
            {TEMPLATES.map((t, i) => (
              <button key={i} onClick={() => applyTemplate(t)} className="template-system-btn">
                <div style={{ fontWeight: 600, marginBottom: '4px', fontSize: '0.85rem' }}>{t.name}</div>
                <div style={{ fontSize: '0.72rem' }} className="criterion-desc">{t.description}</div>
                <div style={{ fontSize: '0.7rem', marginTop: '4px' }} className="stat-value-muted">{TASK_TYPE_LABELS[t.taskType]}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <h3>
        Kriterler{' '}
        <small style={{ fontWeight: 400 }} className="criterion-desc">({filledCount}/{totalCount} dolduruldu)</small>
        {filledCount > 0 && totalCount > 0 && (
          <span className="progress-track">
            <span className="progress-fill" style={{ width: `${(filledCount / totalCount) * 100}%` }} />
          </span>
        )}
      </h3>
      <div className="criteria-list">
        {activeCriteria.map((c, i) => {
          const selectedVal = criteria[c.key]?.value;
          const col = i % 2;
          const row = Math.floor(i / 2);
          const totalRows = Math.ceil(activeCriteria.length / 2);
          const isLastRow = row === totalRows - 1;
          const isLastAndAlone = i === activeCriteria.length - 1 && activeCriteria.length % 2 !== 0;
          return (
            <div key={c.key}
              className={`criteria-row${col === 0 ? ' left-col' : ''}${isLastRow ? ' last-row' : ''}`}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.55rem 0.9rem',
                gridColumn: isLastAndAlone ? 'span 2' : undefined,
                minWidth: 0,
              }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="criterion-name" style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {criteriaLabel(c.key)}
                  {autoFilledKeys[c.key] && (
                    <span className={autoFilledKeys[c.key] === 'llm' ? 'badge-green' : 'badge-accent'}>
                      {autoFilledKeys[c.key] === 'llm' ? 'AI' : 'auto'}
                    </span>
                  )}
                </div>
                <div className="criterion-desc" style={{ fontSize: '0.67rem', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {criteriaDescription(c.key)}
                  {c.type === 'count' && COUNT_LIMITS[c.key]?.hint && (
                    <span style={{ marginLeft: '4px' }}>· {COUNT_LIMITS[c.key]!.hint}</span>
                  )}
                </div>
              </div>

              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                {c.type === 'scale5' && [1, 2, 3, 4, 5].map(v => {
                  const active = selectedVal === v;
                  return (
                    <button
                      key={v}
                      className={`scale-btn${active ? ' scale-btn-active' : ''}`}
                      onClick={() => setCriterion(c.key, 'scale5', selectedVal === v ? '' : String(v))}
                      title={getScaleLabel(c.key, v)}
                      style={{
                        width: '28px', height: '28px', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: active ? 700 : 400,
                        fontSize: '0.78rem', cursor: 'pointer',
                        flexShrink: 0, padding: 0,
                      }}
                    >
                      {v}
                    </button>
                  );
                })}

                {c.type === 'count' && (
                  <div style={{ width: '80px', flexShrink: 0 }}>
                    <CountInput
                      value={(selectedVal as number) ?? undefined}
                      defaultValue={c.key === 'teamMemberCount' ? 1 : undefined}
                      min={c.key === 'teamMemberCount' ? 1 : 0}
                      max={COUNT_LIMITS[c.key]?.max}
                      onChange={val => setCriterion(c.key, 'count', val)}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                )}

                {c.type === 'boolean' && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={(selectedVal as boolean) ?? false}
                      onChange={e => setCriterion(c.key, 'boolean', e.target.checked)}
                    />
                    <span style={{ fontSize: '0.78rem', minWidth: '36px' }} className="criterion-desc">
                      {(selectedVal as boolean) ? 'Evet' : 'Hayır'}
                    </span>
                  </label>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && <div className="error">{error}</div>}

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
                <span className={`${confidenceClass(result.confidenceScore)}`} style={{ fontWeight: 600 }}>
                  %{(result.confidenceScore * 100).toFixed(0)}
                </span>
                {result.confidenceScore < 0.5 && (
                  <span className="stat-value-amber" style={{ fontSize: '0.8rem' }}> — Daha fazla kriter doldurun</span>
                )}
              </div>
              {result.confidenceLow != null && result.confidenceHigh != null && (
                <div>
                  <strong>Tahmin Aralığı:</strong> {result.confidenceLow} – {result.confidenceHigh} SP
                  <small className="criterion-desc" style={{ marginLeft: '6px' }}>
                    (güven {result.confidenceScore >= 0.8 ? 'yüksek → ±1' : result.confidenceScore >= 0.5 ? 'orta → ±2' : 'düşük → ±3'} adım)
                  </small>
                </div>
              )}
            </div>
          </div>

          <div className="confidence-track">
            <div className="confidence-fill" style={{ width: `${result.confidenceScore * 100}%` }} />
          </div>
          <div className="confidence-labels">
            <span>Düşük</span><span>Orta</span><span>Yüksek</span>
          </div>

          {result.missingCriteria.length > 0 && (
            <div className="missing">
              <strong>Eksik kriterler ({result.missingCriteria.length}):</strong>{' '}
              {result.missingCriteria.map(k => criteriaLabel(k)).join(', ')}
            </div>
          )}

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
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                  <h4 style={{ flex: 1, margin: 0 }}>Kriter Katkıları</h4>
                  {topBaseline && (
                    <div style={{ display: 'flex', gap }}>
                      <div style={{ width: colW, textAlign: 'right', fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="stat-value-accent">Tahmin</div>
                      <div style={{ width: colW, textAlign: 'right', fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="criterion-desc">Baz</div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap, marginBottom: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {rows.map(([key, b]) => {
                      const pct = (b.contribution / maxC) * 100;
                      return (
                        <div key={key} style={{ display: 'grid', gridTemplateColumns: '150px 1fr', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                          <div style={{ textAlign: 'right' }} className="criterion-desc">
                            {criteriaLabel(key)}
                          </div>
                          <div className="breakdown-track">
                            <div className="breakdown-fill" style={{ width: `${pct}%` }} />
                            <span style={{ position: 'absolute', right: '6px', top: '3px', fontSize: '0.7rem' }} className="criterion-desc">
                              {b.contribution.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {boolRows.map(([key]) => (
                      <div key={key} style={{ display: 'grid', gridTemplateColumns: '150px 1fr', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                        <div style={{ textAlign: 'right' }} className="criterion-desc">{criteriaLabel(key)}</div>
                        <div style={{ fontSize: '0.75rem' }} className="stat-value-amber">✕ çarpan olarak uygulandı</div>
                      </div>
                    ))}
                  </div>

                  {topBaseline && (
                    <div style={{ display: 'flex', gap, flexShrink: 0 }}>
                      <div style={{ width: colW, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {rows.map(([key, b]) => (
                          <div key={key} style={{ height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontSize: '0.85rem', fontWeight: 500 }} className="criterion-desc">
                            {String(b.rawValue.value)}
                          </div>
                        ))}
                      </div>
                      <div style={{ width: colW, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {rows.map(([key, b]) => {
                          const bazRaw = topBaseline.snap[key];
                          const isDiff = bazRaw !== undefined && bazRaw.value !== b.rawValue.value;
                          return (
                            <div key={key} style={{ height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontSize: '0.85rem', fontWeight: isDiff ? 600 : 400 }}
                              className={isDiff ? 'stat-value-amber' : 'criterion-desc'}>
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

          <details className="explanation-panel">
            <summary>
              Nasıl hesaplandı? — Ham skor: <strong style={{ color: 'var(--accent-text)' }}>{result.engines.ruleBased.rawScore.toFixed(2)}</strong> / 10.00
              → <strong style={{ color: 'var(--accent-text)' }}>{result.suggestedSP} SP</strong>
            </summary>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem', lineHeight: 1.7 }}>
              <div><strong style={{ color: 'var(--text-primary)' }}>1. Normalizasyon</strong><div>Her kriter 0–10 aralığına dönüştürülür. Ölçek kriterleri (1–5) iki ile çarpılır → 2–10. Sayısal kriterler logaritmik ölçeklenir (1→2, 3→4, 7→6, 15→8, 31→10).</div></div>
              <div><strong style={{ color: 'var(--text-primary)' }}>2. Ters kriterler</strong><div>Takım Alan Bilgisi, Kök Neden Netliği ve Otomasyon Kolaylığı ters çevrilir (10 − değer). Yüksek değer "kolay" demektir, bu yüzden düşük katkı verir.</div></div>
              <div><strong style={{ color: 'var(--text-primary)' }}>3. Ağırlıklı toplam</strong><div>Her kriterin normalize skoru, görev tipine özel ağırlığı ile çarpılır ve toplanır. Ağırlıklar toplamı %100'dür, yani ham skor 0–10 aralığında kalır.</div></div>
              <div><strong style={{ color: 'var(--text-primary)' }}>4. Boolean çarpanlar</strong><div>Güvenlik kısıtı (×1.20), performans kısıtı (×1.15), kesinti gereksinimi (×1.25) gibi boolean kriterler toplam skoru çarpan olarak artırır. Benzer geçmiş varsa ×0.80 ile azaltır.</div></div>
              <div><strong style={{ color: 'var(--text-primary)' }}>5. SP eşleme</strong><div>Ham skor, seçili tekniğin eşik tablosuna göre SP değerine dönüştürülür.
                {result.technique === 'FIBONACCI' && <> Fibonacci: &lt;1.5→1, &lt;2.5→2, &lt;3.5→3, &lt;5.0→5, &lt;6.5→8, &lt;7.5→13, &lt;8.5→21, &lt;9.5→34, 9.5+→55</>}
                {result.technique === 'TSHIRT' && <> Tişört: &lt;2.0→XS, &lt;3.5→S, &lt;5.0→M, &lt;7.0→L, &lt;8.5→XL, 8.5+→XXL</>}
                {result.technique === 'POWERS_OF_TWO' && <> İkinin Kuvvetleri: &lt;2.0→1, &lt;3.5→2, &lt;5.5→4, &lt;7.5→8, &lt;9.0→16, 9.0+→32</>}
                {result.technique === 'LINEAR' && <> Doğrusal: &lt;1.0→1, &lt;2.0→2, ... &lt;9.0→9, 9.0+→10</>}
              </div></div>
              <div><strong style={{ color: 'var(--text-primary)' }}>6. Güven skoru</strong><div>Doldurulan kriter oranı (%50 ağırlık) + kapsam netliği (%20) + benzer geçmiş (%15) ile hesaplanır. Güven düşükse tahmin aralığı genişler.</div></div>
            </div>
          </details>

          {approveSuccess != null ? (
            <div className="approve-success">
              ✓ Gerçek SP değeri <strong>{approveSuccess}</strong> olarak kaydedildi. Sistem bu veriyi ilerleyen kalibrasyon için kullanacak.
            </div>
          ) : (
            <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>Onayla — Gerçek SP değeri neydi?</strong>
                <span style={{ fontSize: '0.75rem', marginLeft: '0.75rem' }} className="criterion-desc">
                  Seçiminiz sistemi eğitmek için kaydedilir, gelecek tahminler daha doğru olur.
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {[1, 2, 3, 5, 8, 13, 21, 34, 55].map(sp => (
                  <button
                    key={sp}
                    onClick={() => handleApprove(sp)}
                    className={`approve-sp-btn${sp === result.suggestedSP ? ' is-suggested' : ''}`}
                  >
                    {sp}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {result && sessionHistory.length >= 2 && (() => {
        const compareEntry = sessionHistory.find(h => h.id === compareId);
        return (
          <div style={{ marginTop: '2rem' }}>
            <h3>Karşılaştır
              <small style={{ fontWeight: 400, marginLeft: '8px', fontSize: '0.8rem' }} className="criterion-desc">
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
                    <div className="compare-box">
                      <div style={{ fontSize: '0.7rem', marginBottom: '4px' }} className="criterion-desc">Mevcut Tahmin</div>
                      <div className="compare-sp">{cur.suggestedSP} SP</div>
                      <div style={{ fontSize: '0.8rem' }} className="criterion-desc">Güven %{(cur.confidenceScore * 100).toFixed(0)}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem' }} className={spDiff > 0 ? 'stat-value-red' : spDiff < 0 ? 'stat-value-green' : 'criterion-desc'}>
                        {spDiff > 0 ? '▲' : spDiff < 0 ? '▼' : '='} {Math.abs(spDiff)}
                      </div>
                      <div style={{ fontSize: '0.7rem' }} className="criterion-desc">SP farkı</div>
                    </div>
                    <div className="compare-box">
                      <div style={{ fontSize: '0.7rem', marginBottom: '4px' }} className="criterion-desc">{compareEntry.label}</div>
                      <div className="compare-sp">{prev.suggestedSP} SP</div>
                      <div style={{ fontSize: '0.8rem' }} className="criterion-desc">Güven %{(prev.confidenceScore * 100).toFixed(0)}</div>
                    </div>
                  </div>

                  {diffs.length > 0 && (
                    <>
                      <h4 style={{ marginBottom: '0.5rem' }}>
                        {spDiff > 0 ? 'Bu tahmin neden daha yüksek?' : spDiff < 0 ? 'Bu tahmin neden daha düşük?' : 'Kriter farkları'}
                      </h4>
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Kriter</th>
                              <th style={{ width: '20px' }}></th>
                              <th>Etki</th>
                              <th style={{ textAlign: 'center', width: '64px', color: 'var(--accent-text)' }}>Şu An</th>
                              <th style={{ textAlign: 'center', width: '64px' }}>Önceki</th>
                            </tr>
                          </thead>
                          <tbody>
                            {diffs.map(d => (
                              <tr key={d.key}>
                                <td className="criterion-desc" style={{ fontSize: '0.8rem' }}>{criteriaLabel(d.key)}</td>
                                <td style={{ textAlign: 'center' }} className={d.diff > 0 ? 'stat-value-red' : 'stat-value-green'}>
                                  {d.diff > 0 ? '▲' : '▼'}
                                </td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <div style={{
                                      height: '10px', borderRadius: '3px', minWidth: '4px', flexShrink: 0,
                                      width: `${Math.min(60, Math.abs(d.diff) * 30)}px`,
                                      background: d.diff > 0 ? 'var(--red-dim)' : 'var(--green-dim)',
                                      border: `1px solid ${d.diff > 0 ? 'var(--red-border)' : 'var(--green-border)'}`,
                                    }} />
                                    <span style={{ fontSize: '0.72rem', whiteSpace: 'nowrap' }} className={d.diff > 0 ? 'stat-value-red' : 'stat-value-green'}>
                                      {d.diff > 0 ? '+' : ''}{d.diff.toFixed(2)}
                                    </span>
                                  </div>
                                </td>
                                <td style={{ textAlign: 'center', fontWeight: 600 }} className="criterion-desc">{d.curLabel}</td>
                                <td style={{ textAlign: 'center' }} className="criterion-desc">{d.prevLabel}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div style={{ marginTop: '0.5rem', fontSize: '0.75rem' }} className="criterion-desc">
                        Toplam skor farkı:{' '}
                        <strong className={scoreDiff > 0 ? 'stat-value-red' : 'stat-value-green'}>
                          {scoreDiff > 0 ? '+' : ''}{scoreDiff.toFixed(2)}
                        </strong>
                      </div>
                    </>
                  )}
                  {diffs.length === 0 && (
                    <div style={{ fontSize: '0.85rem', textAlign: 'center' }} className="criterion-desc">
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
