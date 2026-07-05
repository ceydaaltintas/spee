import { useEffect, useState } from 'react';
import api from '../api/client';
import type { TeamConfig, Technique } from '../api/types';
import { criteriaLabel, TECHNIQUE_LABELS, TASK_TYPE_LABELS } from '../api/labels';
import {
  ALL_CRITERIA_BY_TASK_TYPE, DEFAULT_WEIGHTS, BOOLEAN_KEYS, normalizeWeights,
} from '../engine/defaults';
import BaselinesSection from './BaselinesSection';

const TECHNIQUES: { value: Technique; label: string }[] = (
  ['FIBONACCI', 'MODIFIED_FIBONACCI', 'TSHIRT', 'POWERS_OF_TWO', 'LINEAR'] as Technique[]
).map(v => ({ value: v, label: TECHNIQUE_LABELS[v] }));

const TASK_TYPES = Object.keys(ALL_CRITERIA_BY_TASK_TYPE);

// Yerel ağırlık state tipi
type LocalWeights = Record<string, { weight: number; source: string; active: boolean }>;
type AllWeights = Record<string, LocalWeights>; // taskType → criteriaKey → {...}

function buildLocalWeights(
  taskType: string,
  serverWeights: Record<string, number>,
  serverSources: Record<string, string>,
  activeCriteria: string[],
): LocalWeights {
  const allCriteria = ALL_CRITERIA_BY_TASK_TYPE[taskType] ?? [];
  const defaults = DEFAULT_WEIGHTS[taskType] ?? {};
  const result: LocalWeights = {};

  for (const c of allCriteria) {
    if (BOOLEAN_KEYS.has(c.key)) continue; // boolean kriter, ağırlık yok
    const hasServerWeight = c.key in serverWeights;
    result[c.key] = {
      weight: hasServerWeight ? serverWeights[c.key] : (defaults[c.key] ?? 0),
      source: serverSources[c.key] ?? (hasServerWeight ? 'manual' : 'default'),
      active: activeCriteria.includes(c.key),
    };
  }
  return result;
}

function getActiveCriteria(taskType: string, overrides: Record<string, string[]> | null): string[] {
  if (overrides && overrides[taskType]) return overrides[taskType];
  // varsayılan: boolean olmayan tüm kriterler
  return (ALL_CRITERIA_BY_TASK_TYPE[taskType] ?? [])
    .filter(c => !BOOLEAN_KEYS.has(c.key))
    .map(c => c.key);
}

export default function TeamConfigPage({
  teamId, onConfigSaved,
}: {
  teamId: string;
  onConfigSaved?: (updated: Partial<TeamConfig>) => void;
}) {
  const [config, setConfig] = useState<TeamConfig | null>(null);
  const [technique, setTechnique] = useState<Technique>('FIBONACCI');
  const [sourceSystem, setSourceSystem] = useState<'JIRA' | 'ADO'>('JIRA');
  const [allWeights, setAllWeights] = useState<AllWeights>({});
  const [openTaskType, setOpenTaskType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // taskType or 'general'
  const [message, setMessage] = useState('');

  useEffect(() => { loadConfig(); }, [teamId]);

  async function loadConfig() {
    setLoading(true);
    try {
      const { data } = await api.get<TeamConfig>(`/teams/${teamId}/config`);
      setConfig(data);
      setTechnique(data.activeTechnique);
      setSourceSystem(data.sourceSystem as 'JIRA' | 'ADO');

      const built: AllWeights = {};
      for (const tt of TASK_TYPES) {
        const active = getActiveCriteria(tt, data.activeCriteriaOverrides);
        built[tt] = buildLocalWeights(
          tt,
          data.weights[tt] ?? {},
          data.weightSources[tt] ?? {},
          active,
        );
      }
      setAllWeights(built);
    } catch {
      setMessage('Takım yapılandırması yüklenemedi');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveGeneral() {
    setSaving('general');
    setMessage('');
    try {
      await api.put(`/teams/${teamId}/config`, { activeTechnique: technique, sourceSystem });
      setMessage('Kaydedildi');
      onConfigSaved?.({ activeTechnique: technique, sourceSystem });
    } catch (e: any) {
      setMessage(e.response?.data?.error || 'Hata oluştu');
    } finally {
      setSaving(null);
    }
  }

  async function handleSaveWeights(taskType: string) {
    const local = allWeights[taskType];
    if (!local) return;

    const activeKeys = Object.entries(local).filter(([, v]) => v.active).map(([k]) => k);
    const activeWeights: Record<string, number> = {};
    for (const k of activeKeys) activeWeights[k] = local[k].weight;

    // Pasif kriterleri sıfır ağırlıkla gönder
    const allKeys = Object.keys(local);
    const payload: Record<string, number> = {};
    for (const k of allKeys) payload[k] = local[k].active ? local[k].weight : 0;

    setSaving(taskType);
    setMessage('');
    try {
      await api.put(`/teams/${teamId}/config`, {
        weights: { [taskType]: payload },
        weightSource: 'manual',
        activeCriteriaOverrides: { [taskType]: activeKeys },
      });
      // source'ları manual olarak işaretle
      setAllWeights(prev => ({
        ...prev,
        [taskType]: Object.fromEntries(
          Object.entries(prev[taskType]).map(([k, v]) => [k, { ...v, source: v.active ? 'manual' : v.source }])
        ),
      }));
      setMessage(`${TASK_TYPE_LABELS[taskType] ?? taskType} ağırlıkları kaydedildi`);
    } catch (e: any) {
      setMessage(e.response?.data?.error || 'Hata oluştu');
    } finally {
      setSaving(null);
    }
  }

  function handleWeightChange(taskType: string, key: string, newPct: number) {
    const newFrac = Math.max(0, Math.min(99, newPct)) / 100;
    setAllWeights(prev => {
      const current = prev[taskType];
      // Sadece aktif kriterlerin ağırlıklarını normalize et
      const activeWeights: Record<string, number> = {};
      for (const [k, v] of Object.entries(current)) {
        if (v.active) activeWeights[k] = v.weight;
      }
      const normalized = normalizeWeights(activeWeights, key, newFrac);
      return {
        ...prev,
        [taskType]: Object.fromEntries(
          Object.entries(current).map(([k, v]) => [
            k,
            v.active ? { ...v, weight: normalized[k] ?? v.weight } : v,
          ])
        ),
      };
    });
  }

  function handleToggleActive(taskType: string, key: string, active: boolean) {
    setAllWeights(prev => {
      const current = prev[taskType];
      const updated = { ...current, [key]: { ...current[key], active } };
      // Aktif kalan kriterleri yeniden normalize et
      const activeWeights: Record<string, number> = {};
      for (const [k, v] of Object.entries(updated)) {
        if (v.active) activeWeights[k] = v.weight;
      }
      const total = Object.values(activeWeights).reduce((s, w) => s + w, 0);
      if (total > 0) {
        for (const k of Object.keys(activeWeights)) {
          activeWeights[k] = activeWeights[k] / total;
        }
      }
      return {
        ...prev,
        [taskType]: Object.fromEntries(
          Object.entries(updated).map(([k, v]) => [
            k,
            v.active ? { ...v, weight: activeWeights[k] ?? v.weight } : v,
          ])
        ),
      };
    });
  }

  function handleResetDefaults(taskType: string) {
    const defaults = DEFAULT_WEIGHTS[taskType] ?? {};
    setAllWeights(prev => ({
      ...prev,
      [taskType]: Object.fromEntries(
        Object.entries(prev[taskType]).map(([k, v]) => [
          k,
          { ...v, weight: defaults[k] ?? v.weight, active: k in defaults, source: 'default' },
        ])
      ),
    }));
  }

  if (loading) return <p>Yükleniyor...</p>;
  if (!config) return <p>Takım bulunamadı</p>;

  return (
    <div>
      <h2>Takım Ayarları</h2>

      {/* Genel ayarlar */}
      <div className="config-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <h3 style={{ margin: 0 }}>{config.name}</h3>
          {config.joinCode && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.68rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Giriş Kodu</div>
              <div className="panel-deep" style={{ fontSize: '1.2rem', fontWeight: 700, letterSpacing: '0.2em', color: '#38bdf8', border: '1px solid #0369a1', borderRadius: '6px', padding: '2px 12px' }}>
                {config.joinCode}
              </div>
            </div>
          )}
        </div>
        <label>Kaynak Sistem
          <select value={sourceSystem} onChange={e => setSourceSystem(e.target.value as 'JIRA' | 'ADO')}>
            <option value="JIRA">JIRA</option>
            <option value="ADO">Azure DevOps</option>
          </select>
          <small style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
            Tahmin ekranında varsayılan olarak bu sistem seçili gelir.
          </small>
        </label>
        <label>Tahmin Tekniği
          <select value={technique} onChange={e => setTechnique(e.target.value as Technique)}>
            {TECHNIQUES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem', marginBottom: '1rem' }}>
          {technique === 'FIBONACCI' && 'Fibonacci: 1, 2, 3, 5, 8, 13, 21, 34, 55 — En yaygın kullanılan skala'}
          {technique === 'MODIFIED_FIBONACCI' && 'Değiştirilmiş Fibonacci: 1, 2, 3, 5, 8, 13, 20, 40, 100'}
          {technique === 'TSHIRT' && 'Tişört: XS, S, M, L, XL, XXL — Sayı yerine boyut ifadesi'}
          {technique === 'POWERS_OF_TWO' && 'İkinin Kuvvetleri: 1, 2, 4, 8, 16, 32'}
          {technique === 'LINEAR' && 'Doğrusal: 1–10 — Basit ve sezgisel'}
        </div>
        <button onClick={handleSaveGeneral} disabled={saving === 'general'} className="primary">
          {saving === 'general' ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
        {message && <div className="info" style={{ marginTop: '0.75rem' }}>{message}</div>}
      </div>

      {/* Baz iş tanımları */}
      <div style={{ marginBottom: '2rem' }}>
        <BaselinesSection teamId={teamId} />
      </div>

      {/* Görev tipi ağırlık editörü */}
      <h3>Kriter Ağırlıkları</h3>
      <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '1rem' }}>
        Her görev tipi için hangi kriterlerin kullanılacağını ve ağırlıklarını ayarlayın.
        Bir kriteri kapattığınızda ağırlığı diğerlerine orantılı dağıtılır.
        Toplam her zaman %100 olmalıdır.
      </p>

      {TASK_TYPES.map(tt => {
        const local = allWeights[tt] ?? {};
        const defaults = DEFAULT_WEIGHTS[tt] ?? {};
        const isOpen = openTaskType === tt;
        const activeCount = Object.values(local).filter(v => v.active).length;
        const hasChanges = Object.entries(local).some(([k, v]) => {
          const def = defaults[k];
          return def !== undefined && Math.abs(v.weight - def) > 0.005;
        });
        const hasCalibration = Object.entries(local).some(([k, v]) => {
          if (v.source !== 'calibration') return false;
          const def = defaults[k];
          return def === undefined || Math.abs(v.weight - def) > 0.005;
        });

        return (
          <div key={tt} className="panel" style={{ marginBottom: '0.5rem', overflow: 'hidden' }}>
            {/* Başlık satırı */}
            <div
              onClick={() => setOpenTaskType(isOpen ? null : tt)}
              className="accordion-header"
            >
              <span style={{ color: '#38bdf8', fontSize: '0.8rem' }}>{isOpen ? '▼' : '▶'}</span>
              <strong style={{ flex: 1 }}>{TASK_TYPE_LABELS[tt] ?? tt}</strong>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{activeCount} kriter aktif</span>
              {hasCalibration && (
                <span style={{ fontSize: '0.7rem', background: '#0c4a6e', color: '#38bdf8', padding: '2px 6px', borderRadius: '4px' }}>
                  kalibrasyon güncelledi
                </span>
              )}
              {hasChanges && !hasCalibration && (
                <span style={{ fontSize: '0.7rem', background: '#1c1917', color: '#fbbf24', padding: '2px 6px', borderRadius: '4px' }}>
                  değiştirildi
                </span>
              )}
            </div>

            {/* İçerik */}
            {isOpen && (
              <div className="accordion-body" style={{ padding: '1rem' }}>
                <table style={{ marginBottom: '0.75rem' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '32px' }}></th>
                      <th>Kriter</th>
                      <th style={{ width: '80px', textAlign: 'right' }}>Varsayılan</th>
                      <th style={{ width: '80px', textAlign: 'right' }}>Mevcut</th>
                      <th style={{ width: '160px' }}>Ağırlık</th>
                      <th style={{ width: '60px', textAlign: 'right' }}>Fark</th>
                      <th style={{ width: '90px', textAlign: 'center' }}>Kaynak</th>
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
                              <input
                                type="checkbox"
                                checked={val.active}
                                onChange={e => handleToggleActive(tt, key, e.target.checked)}
                                style={{ width: '16px', height: '16px' }}
                              />
                            </td>
                            <td style={{ fontSize: '0.85rem' }}>{criteriaLabel(key)}</td>
                            <td style={{ textAlign: 'right', color: '#64748b', fontSize: '0.8rem' }}>
                              {def !== undefined ? `%${(def * 100).toFixed(0)}` : '—'}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600, fontSize: '0.85rem' }}>
                              {val.active ? `%${(val.weight * 100).toFixed(0)}` : '—'}
                            </td>
                            <td>
                              {val.active && (
                                <input
                                  type="range"
                                  min={1} max={60} step={1}
                                  value={Math.round(val.weight * 100)}
                                  onChange={e => handleWeightChange(tt, key, Number(e.target.value))}
                                  style={{ width: '100%', accentColor: '#38bdf8' }}
                                />
                              )}
                            </td>
                            <td style={{ textAlign: 'right', fontSize: '0.8rem', fontWeight: 600 }}>
                              {diffPct !== null && val.active && Math.abs(diffPct) > 0.5 ? (
                                <span style={{ color: diffPct > 0 ? '#fbbf24' : '#6ee7b7' }}>
                                  {diffPct > 0 ? `+${diffPct.toFixed(0)}` : diffPct.toFixed(0)}%
                                </span>
                              ) : (
                                <span style={{ color: '#334155' }}>—</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {val.source === 'calibration' ? (
                                <span style={{ fontSize: '0.7rem', background: '#0c4a6e', color: '#38bdf8', padding: '1px 5px', borderRadius: '3px' }}>
                                  kalibrasyon
                                </span>
                              ) : val.source === 'manual' ? (
                                <span style={{ fontSize: '0.7rem', color: '#475569' }}>manuel</span>
                              ) : (
                                <span style={{ fontSize: '0.7rem', color: '#334155' }}>varsayılan</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    onClick={() => handleSaveWeights(tt)}
                    disabled={saving === tt}
                    className="primary"
                  >
                    {saving === tt ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                  <button onClick={() => handleResetDefaults(tt)} style={{ color: '#64748b' }}>
                    Varsayılana sıfırla
                  </button>
                  <span style={{ fontSize: '0.75rem', color: '#475569', marginLeft: 'auto' }}>
                    Toplam: %{Object.values(local).filter(v => v.active).reduce((s, v) => s + v.weight, 0).toFixed
                    === undefined ? 0 : (Object.values(local).filter(v => v.active).reduce((s, v) => s + v.weight, 0) * 100).toFixed(0)}
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
