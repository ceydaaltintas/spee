import { useEffect, useState } from 'react';
import api from '../api/client';
import type { TeamConfig, Technique } from '../api/types';
import { useLang } from '../contexts/LangContext';
import {
  ALL_CRITERIA_BY_TASK_TYPE, DEFAULT_WEIGHTS, BOOLEAN_KEYS, normalizeWeights,
} from '../engine/defaults';
import BaselinesSection from './BaselinesSection';

const TECHNIQUE_KEYS = ['FIBONACCI', 'MODIFIED_FIBONACCI', 'TSHIRT', 'POWERS_OF_TWO', 'LINEAR'] as Technique[];

const TASK_TYPES = Object.keys(ALL_CRITERIA_BY_TASK_TYPE);

type LocalWeights = Record<string, { weight: number; source: string; active: boolean }>;
type AllWeights = Record<string, LocalWeights>;

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
    if (BOOLEAN_KEYS.has(c.key)) continue;
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
  const { t, criteriaLabel, taskTypeLabel, techniqueLabel } = useLang();
  const [config, setConfig] = useState<TeamConfig | null>(null);
  const [technique, setTechnique] = useState<Technique>('FIBONACCI');
  const [sourceSystem, setSourceSystem] = useState<'JIRA' | 'ADO'>('JIRA');
  const [allWeights, setAllWeights] = useState<AllWeights>({});
  const [openTaskType, setOpenTaskType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
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
      setMessage(t('config_load_error'));
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
    const payload: Record<string, number> = {};
    for (const k of Object.keys(local)) payload[k] = local[k].active ? local[k].weight : 0;

    setSaving(taskType);
    setMessage('');
    try {
      await api.put(`/teams/${teamId}/config`, {
        weights: { [taskType]: payload },
        weightSource: 'manual',
        activeCriteriaOverrides: { [taskType]: activeKeys },
      });
      setAllWeights(prev => ({
        ...prev,
        [taskType]: Object.fromEntries(
          Object.entries(prev[taskType]).map(([k, v]) => [k, { ...v, source: v.active ? 'manual' : v.source }])
        ),
      }));
      setMessage(`${taskTypeLabel(taskType)} ${t('config_weights_saved')}`);
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

  if (loading) return <p>{t('loading')}</p>;
  if (!config) return <p>{t('not_found')}</p>;

  return (
    <div>
      <h2>{t('config_title')}</h2>

      <div className="config-card" style={{ marginBottom: '1.5rem' }}>
        {/* Takım başlığı + giriş kodu yan yana, kompakt */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{config.name}</span>
          {config.joinCode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span className="criterion-desc" style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('config_join_code')}</span>
              <span style={{
                fontFamily: "'SF Mono', ui-monospace, monospace",
                fontWeight: 700,
                fontSize: '0.85rem',
                letterSpacing: '0.15em',
                color: 'var(--accent-text)',
                background: 'var(--accent-dim)',
                border: '1px solid var(--accent-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '2px 10px',
              }}>{config.joinCode}</span>
            </div>
          )}
        </div>

        {/* Ayarlar — 2 sütun (mobilde 1) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem 1.5rem' }}>
          <label>{t('config_source_system')}
            <select value={sourceSystem} onChange={e => setSourceSystem(e.target.value as 'JIRA' | 'ADO')}>
              <option value="JIRA">JIRA</option>
              <option value="ADO">Azure DevOps</option>
            </select>
            <small style={{ fontSize: '0.72rem', marginTop: '3px', display: 'block' }} className="criterion-desc">
              {t('config_source_hint')}
            </small>
          </label>
          <label>{t('config_technique')}
            <select value={technique} onChange={e => setTechnique(e.target.value as Technique)}>
              {TECHNIQUE_KEYS.map(k => <option key={k} value={k}>{techniqueLabel(k)}</option>)}
            </select>
            <small style={{ fontSize: '0.72rem', marginTop: '3px', display: 'block' }} className="criterion-desc">
              {technique === 'FIBONACCI' && '1, 2, 3, 5, 8, 13, 21, 34, 55'}
              {technique === 'MODIFIED_FIBONACCI' && '1, 2, 3, 5, 8, 13, 20, 40, 100'}
              {technique === 'TSHIRT' && 'XS, S, M, L, XL, XXL'}
              {technique === 'POWERS_OF_TWO' && '1, 2, 4, 8, 16, 32'}
              {technique === 'LINEAR' && `1–10, ${t('config_linear_hint')}`}
            </small>
          </label>
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={handleSaveGeneral} disabled={saving === 'general'} className="primary">
            {saving === 'general' ? t('saving') : t('save')}
          </button>
          {message && <span className="criterion-desc" style={{ fontSize: '0.8rem' }}>{message}</span>}
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <BaselinesSection teamId={teamId} />
      </div>

      <h3>{t('config_weights_title')}</h3>
      <p style={{ fontSize: '0.8rem', marginBottom: '1rem' }} className="criterion-desc">
        {t('config_weights_desc')}
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
            <div onClick={() => setOpenTaskType(isOpen ? null : tt)} className="accordion-header">
              <span className="accordion-chevron">{isOpen ? '▼' : '▶'}</span>
              <strong style={{ flex: 1 }}>{taskTypeLabel(tt)}</strong>
              <span style={{ fontSize: '0.75rem' }} className="criterion-desc">{activeCount} {t('config_criteria_active')}</span>
              {hasCalibration && <span className="tag-calibration">{t('config_calib_updated')}</span>}
              {hasChanges && !hasCalibration && <span className="tag-modified">{t('config_modified')}</span>}
            </div>

            {isOpen && (
              <div className="accordion-body" style={{ padding: '1rem' }}>
                <div className="table-wrap" style={{ marginBottom: '0.75rem' }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '32px' }}></th>
                      <th>{t('config_col_criterion')}</th>
                      <th style={{ width: '80px', textAlign: 'right' }}>{t('config_col_default')}</th>
                      <th style={{ width: '80px', textAlign: 'right' }}>{t('config_col_current')}</th>
                      <th style={{ width: '160px' }}>{t('config_col_weight')}</th>
                      <th style={{ width: '60px', textAlign: 'right' }}>{t('config_col_diff')}</th>
                      <th style={{ width: '90px', textAlign: 'center' }}>{t('config_col_source')}</th>
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
                            <td style={{ textAlign: 'right', fontSize: '0.8rem' }} className="criterion-desc">
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
                                  style={{ width: '100%' }}
                                />
                              )}
                            </td>
                            <td style={{ textAlign: 'right', fontSize: '0.8rem', fontWeight: 600 }}>
                              {diffPct !== null && val.active && Math.abs(diffPct) > 0.5 ? (
                                <span className={diffPct > 0 ? 'stat-value-amber' : 'stat-value-green'}>
                                  {diffPct > 0 ? `+${diffPct.toFixed(0)}` : diffPct.toFixed(0)}%
                                </span>
                              ) : (
                                <span className="criterion-desc">—</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {val.source === 'calibration' ? (
                                <span className="tag-calibration">{t('config_source_calib')}</span>
                              ) : val.source === 'manual' ? (
                                <span style={{ fontSize: '0.7rem' }} className="criterion-desc">{t('config_source_manual')}</span>
                              ) : (
                                <span style={{ fontSize: '0.7rem' }} className="stat-value-muted">{t('config_source_default')}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button onClick={() => handleSaveWeights(tt)} disabled={saving === tt} className="primary">
                    {saving === tt ? t('saving') : t('save')}
                  </button>
                  <button onClick={() => handleResetDefaults(tt)} className="btn-muted">
                    {t('config_reset')}
                  </button>
                  <span style={{ fontSize: '0.75rem', marginLeft: 'auto' }} className="criterion-desc">
                    {t('config_total')} %{(Object.values(local).filter(v => v.active).reduce((s, v) => s + v.weight, 0) * 100).toFixed(0)}
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
