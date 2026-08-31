import { useEffect, useState } from 'react';
import api from '../api/client';
import type { BaselineStory, TaskType, CriteriaValue, EstimateResponse } from '../api/types';
import { TASK_TYPE_LABELS, criteriaLabel, criteriaDescription } from '../api/labels';
import { ALL_CRITERIA_BY_TASK_TYPE, BOOLEAN_KEYS } from '../engine/defaults';
import { getScaleLabel } from '../engine/scale-labels';

const TASK_TYPES: TaskType[] = ['USER_STORY', 'BUG', 'ANALYSIS', 'TEST_TASK', 'DESIGN', 'DEVOPS', 'SPIKE', 'SUB_TASK'];
const SP_VALUES = [1, 2, 3, 5, 8, 13, 21, 34, 55];
const FIBS = [1, 2, 3, 5, 8, 13, 21, 34, 55];

function fibSteps(a: number, b: number): number {
  const ai = FIBS.indexOf(a), bi = FIBS.indexOf(b);
  if (ai === -1 || bi === -1) return Math.abs(a - b) > 2 ? 2 : 0;
  return Math.abs(ai - bi);
}

interface CalibrationCheck {
  estimationId: string;
  engineSP: number;
  definedSP: number;
  baselineTitle: string;
}

const COUNT_LIMITS: Record<string, number> = {
  dependencyCount: 20, integrationPoints: 15, affectedModuleCount: 20,
  stakeholderCount: 15, testCaseCount: 100, screenCount: 20, teamMemberCount: 15,
};

function CountInput({ criteriaKey, value, onChange }: { criteriaKey: string; value: number; onChange: (v: number) => void }) {
  const max = COUNT_LIMITS[criteriaKey];
  const [text, setText] = useState(String(value));
  return (
    <input
      type="text" inputMode="numeric"
      value={text}
      onChange={e => {
        const v = e.target.value.replace(/[^0-9]/g, '');
        setText(v);
        if (v) {
          const num = Math.min(Number(v), max ?? Infinity);
          onChange(num);
          if (max && Number(v) > max) setText(String(max));
        }
      }}
      onFocus={e => { setText(String(value)); e.target.select(); }}
      onBlur={() => {
        const num = Number(text);
        if (!text || num < 0) { setText('0'); onChange(0); }
        else if (max && num > max) { setText(String(max)); onChange(max); }
      }}
    />
  );
}

const EMPTY_FORM = {
  taskType: '' as string,
  criteriaTaskType: 'USER_STORY' as string,
  title: '',
  description: '',
  storyPoints: 5,
};

export default function BaselinesSection({ teamId }: { teamId: string }) {
  const [baselines, setBaselines] = useState<BaselineStory[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [criteria, setCriteria] = useState<Record<string, CriteriaValue>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [calibrationCheck, setCalibrationCheck] = useState<CalibrationCheck | null>(null);
  const [calibrating, setCalibrating] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);

  useEffect(() => { load(); }, [teamId]);

  async function load() {
    try {
      const { data } = await api.get<BaselineStory[]>(`/teams/${teamId}/baselines`);
      setBaselines(data);
    } catch { setBaselines([]); }
  }

  const activeCriteriaType = form.taskType || form.criteriaTaskType;
  const activeCriteria = ALL_CRITERIA_BY_TASK_TYPE[activeCriteriaType] ?? [];

  function openNew() {
    setForm({ ...EMPTY_FORM });
    setCriteria({});
    setEditId(null);
    setShowForm(true);
    setError('');
  }

  function openEdit(b: BaselineStory) {
    setForm({
      taskType: b.taskType ?? '',
      criteriaTaskType: b.taskType ?? 'USER_STORY',
      title: b.title,
      description: b.description ?? '',
      storyPoints: b.storyPoints,
    });
    setCriteria((b.criteriaSnapshot as Record<string, CriteriaValue>) ?? {});
    setEditId(b.id);
    setShowForm(true);
    setError('');
  }

  function setCriterion(key: string, type: 'scale5' | 'count' | 'boolean', raw: string | boolean) {
    setCriteria(prev => {
      const next = { ...prev };
      if (type === 'boolean') {
        next[key] = { type: 'boolean', value: raw as boolean };
      } else if (raw === '' || raw === '0') {
        delete next[key];
      } else {
        next[key] = { type, value: Number(raw) };
      }
      return next;
    });
  }

  async function runEngineCheck(baseline: BaselineStory, taskTypeOverride?: string) {
    if (!baseline.criteriaSnapshot || Object.keys(baseline.criteriaSnapshot).length < 2) return;
    const tt = baseline.taskType ?? taskTypeOverride ?? 'USER_STORY';
    setCheckingId(baseline.id);
    try {
      const { data } = await api.post<EstimateResponse>('/estimate', {
        sourceSystem: 'JIRA',
        sourceId: `baseline-${baseline.id}`,
        teamId,
        taskType: tt,
        manualCriteria: baseline.criteriaSnapshot,
      });
      const engineSP = typeof data.suggestedSP === 'number' ? data.suggestedSP : Number(data.suggestedSP);
      if (fibSteps(engineSP, baseline.storyPoints) >= 1) {
        setCalibrationCheck({
          estimationId: data.estimationId,
          engineSP,
          definedSP: baseline.storyPoints,
          baselineTitle: baseline.title,
        });
      } else {
        setCalibrationCheck(null);
        alert(`Motor da aynı fikirde: ${engineSP} SP — kalibrasyon gerekmiyor.`);
      }
    } catch { /* ignore */ } finally {
      setCheckingId(null);
    }
  }

  async function handleCalibrate() {
    if (!calibrationCheck) return;
    setCalibrating(true);
    try {
      await api.post('/estimate/approve', {
        estimationId: calibrationCheck.estimationId,
        approvedSP: calibrationCheck.definedSP,
        approvedBy: 'baseline-definition',
      });
      setCalibrationCheck(null);
      alert('Kalibrasyon verisi kaydedildi. Kalibrasyon sayfasından ağırlıkları güncelleyebilirsin.');
    } catch { /* ignore */ } finally {
      setCalibrating(false);
    }
  }

  async function handleSave() {
    if (!form.title.trim()) { setError('Başlık gerekli'); return; }
    const filledCount = Object.keys(criteria).filter(k => !BOOLEAN_KEYS.has(k)).length;
    if (filledCount < 2) { setError('En az 2 kriter doldurulmalı ki motor öğrenebilsin'); return; }

    setSaving(true);
    setError('');
    try {
      const payload = {
        taskType: form.taskType || null,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        storyPoints: form.storyPoints,
        criteriaSnapshot: criteria,
      };
      let savedId: string;
      if (editId) {
        await api.put(`/teams/${teamId}/baselines/${editId}`, payload);
        savedId = editId;
      } else {
        const { data } = await api.post<BaselineStory>(`/teams/${teamId}/baselines`, payload);
        savedId = data.id;
      }
      setShowForm(false);
      await load();
      const taskTypeForCheck = form.taskType || form.criteriaTaskType;
      await runEngineCheck(
        { id: savedId, storyPoints: form.storyPoints, criteriaSnapshot: criteria, title: form.title.trim(), taskType: form.taskType || null } as BaselineStory,
        taskTypeForCheck,
      );
    } catch (e: any) {
      setError(e.response?.data?.error || 'Hata oluştu');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu baz işi silmek istediğine emin misin?')) return;
    try {
      await api.delete(`/teams/${teamId}/baselines/${id}`);
      setBaselines(prev => prev.filter(b => b.id !== id));
    } catch { /* ignore */ }
  }

  const isGeneral = !form.taskType;
  const filledCount = Object.keys(criteria).filter(k => !BOOLEAN_KEYS.has(k)).length;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
        <h3 style={{ margin: 0 }}>Baz İş Tanımları</h3>
        <button onClick={openNew} className="primary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
          + Yeni Baz İş
        </button>
      </div>
      <p className="criterion-desc" style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>
        Referans iş kalemleri tanımlayın. Kriter değerlerini doldurarak motorun bu işten öğrenmesini sağlayın.
      </p>

      {/* Form */}
      {showForm && (
        <div className="panel" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
          <h4 style={{ marginTop: 0, marginBottom: '1rem' }}>{editId ? 'Baz İşi Düzenle' : 'Yeni Baz İş'}</h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <label>Kapsam
              <select value={form.taskType} onChange={e => {
                const tt = e.target.value;
                setForm(f => ({ ...f, taskType: tt, criteriaTaskType: tt || f.criteriaTaskType }));
                setCriteria({});
              }}>
                <option value="">Genel (tüm görev tipleri)</option>
                {TASK_TYPES.map(t => <option key={t} value={t}>{TASK_TYPE_LABELS[t]}</option>)}
              </select>
              <small className="criterion-desc" style={{ fontSize: '0.72rem', marginTop: '3px', display: 'block' }}>
                {isGeneral ? 'Tüm tahminler için referans olur' : 'Sadece bu görev tipi için geçerli'}
              </small>
            </label>
            <label>Story Point Değeri
              <select value={form.storyPoints} onChange={e => setForm(f => ({ ...f, storyPoints: Number(e.target.value) }))}>
                {SP_VALUES.map(sp => <option key={sp} value={sp}>{sp} SP</option>)}
              </select>
              <small className="criterion-desc" style={{ fontSize: '0.72rem', marginTop: '3px', display: 'block' }}>
                Ekibinizin bu işe verdiği gerçek SP değeri
              </small>
            </label>
          </div>

          {isGeneral && (
            <label style={{ marginBottom: '0.75rem' }}>Kriter Şablonu
              <select value={form.criteriaTaskType} onChange={e => {
                setForm(f => ({ ...f, criteriaTaskType: e.target.value }));
                setCriteria({});
              }}>
                {TASK_TYPES.map(t => <option key={t} value={t}>{TASK_TYPE_LABELS[t]}</option>)}
              </select>
              <small className="criterion-desc" style={{ fontSize: '0.72rem', marginTop: '3px', display: 'block' }}>
                Bu genel baz iş hangi türdeki iş karakteristiğine sahip?
              </small>
            </label>
          )}

          <label style={{ marginBottom: '0.75rem' }}>Başlık
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Örn: Orta karmaşıklıkta kullanıcı hikâyesi"
            />
          </label>

          <label style={{ marginBottom: '1rem' }}>Açıklama (isteğe bağlı)
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Bu baz işin içeriğini kısaca açıklayın..."
              rows={2}
              style={{
                resize: 'vertical',
                padding: '0.5rem 0.75rem',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                fontFamily: 'inherit',
                width: '100%',
                boxSizing: 'border-box',
                lineHeight: 1.5,
              }}
            />
          </label>

          {/* Kriterler */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>Kriter Değerleri</strong>
              <span className={filledCount >= 2 ? 'stat-value-green' : 'criterion-desc'} style={{ fontSize: '0.75rem' }}>
                {filledCount} dolduruldu {filledCount < 2 && '(en az 2 gerekli)'}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '0.5rem' }}>
              {activeCriteria.map(c => (
                <div key={c.key} className="criterion" style={{ border: `1px solid ${criteria[c.key] ? 'var(--accent-border)' : 'var(--border)'}`, background: criteria[c.key] ? 'var(--accent-dim)' : 'var(--bg-surface)', minHeight: '90px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {criteriaLabel(c.key)}
                  </div>
                  <div className="criterion-desc" style={{ fontSize: '0.67rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {criteriaDescription(c.key)}
                  </div>
                  <div style={{ marginTop: 'auto' }}>
                    {c.type === 'boolean' ? (
                      <label style={{ flexDirection: 'row', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>
                        <input
                          type="checkbox"
                          checked={(criteria[c.key]?.value as boolean) ?? false}
                          onChange={e => setCriterion(c.key, 'boolean', e.target.checked)}
                          style={{ width: '14px', height: '14px' }}
                        />
                        <span className="criterion-desc">{(criteria[c.key]?.value as boolean) ? 'Evet' : 'Hayır'}</span>
                      </label>
                    ) : c.type === 'scale5' ? (
                      <select
                        value={(criteria[c.key]?.value as number) ?? ''}
                        onChange={e => setCriterion(c.key, 'scale5', e.target.value)}
                      >
                        <option value="">Seç...</option>
                        {[1, 2, 3, 4, 5].map(v => (
                          <option key={v} value={v}>{getScaleLabel(c.key, v)}</option>
                        ))}
                      </select>
                    ) : (
                      <CountInput
                        criteriaKey={c.key}
                        value={(criteria[c.key]?.value as number) ?? 0}
                        onChange={v => setCriterion(c.key, 'count', String(v))}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && <div className="error">{error}</div>}

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={handleSave} disabled={saving} className="primary">
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
            <button onClick={() => setShowForm(false)}>İptal</button>
          </div>
        </div>
      )}

      {/* Kalibrasyon önerisi */}
      {calibrationCheck && (
        <div className="calib-hint-box" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <span>⚡</span>
            <div style={{ flex: 1 }}>
              <strong style={{ color: 'var(--amber)', fontSize: '0.9rem' }}>Kalibrasyon Önerisi</strong>
              <p style={{ margin: '0.4rem 0 0.75rem', fontSize: '0.83rem', color: 'var(--amber)' }}>
                <strong>"{calibrationCheck.baselineTitle}"</strong> için motor{' '}
                <strong style={{ color: 'var(--text-primary)' }}>{calibrationCheck.engineSP} SP</strong> önerdi,{' '}
                sen <strong style={{ color: 'var(--text-primary)' }}>{calibrationCheck.definedSP} SP</strong> tanımladın.{' '}
                Bu baz işi kalibrasyon verisi olarak ekleyerek motoru eğitebilirsin.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={handleCalibrate} disabled={calibrating} className="primary" style={{ fontSize: '0.8rem' }}>
                  {calibrating ? 'Kaydediliyor...' : 'Kalibrasyon Verisi Olarak Ekle'}
                </button>
                <button onClick={() => setCalibrationCheck(null)} className="btn-muted" style={{ fontSize: '0.8rem' }}>
                  Şimdi Değil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Liste */}
      {baselines.length === 0 && !showForm && (
        <p className="criterion-desc" style={{ fontSize: '0.85rem' }}>Henüz baz iş tanımlanmamış.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {baselines.map(b => {
          const snap = b.criteriaSnapshot as Record<string, CriteriaValue> | null;
          const filledKeys = snap ? Object.keys(snap).filter(k => !BOOLEAN_KEYS.has(k)) : [];
          return (
            <div key={b.id} className="baseline-card">
              {/* SP badge */}
              <div className="baseline-sp-badge">
                {b.storyPoints}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '3px', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{b.title}</strong>
                  {b.taskType
                    ? <span className="badge-amber">{TASK_TYPE_LABELS[b.taskType] ?? b.taskType}</span>
                    : <span className="badge-accent">Genel</span>}
                </div>
                {b.description && (
                  <div className="criterion-desc" style={{ fontSize: '0.78rem', marginBottom: '3px' }}>{b.description}</div>
                )}
                <div style={{ fontSize: '0.72rem' }}>
                  <span className={filledKeys.length >= 2 ? 'stat-value-green' : 'stat-value-amber'} style={{ fontSize: '0.72rem' }}>
                    {filledKeys.length} kriter kaydedildi
                  </span>
                  {filledKeys.length > 0 && (
                    <span className="criterion-desc" style={{ marginLeft: '6px' }}>
                      ({filledKeys.map(k => criteriaLabel(k)).join(', ')})
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0, alignItems: 'center' }}>
                <button
                  onClick={() => runEngineCheck(b, b.taskType ?? 'USER_STORY')}
                  disabled={checkingId === b.id}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', color: 'var(--amber)', borderColor: 'var(--amber-border)', background: 'var(--amber-dim)' }}
                >
                  {checkingId === b.id ? '...' : '⚡ Motor'}
                </button>
                <button onClick={() => openEdit(b)} className="btn-muted" style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}>
                  Düzenle
                </button>
                <button onClick={() => handleDelete(b.id)} className="btn-danger" style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}>
                  Sil
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
