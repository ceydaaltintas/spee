import { useState } from 'react';
import api from '../api/client';
import type { CalibrationResult } from '../api/types';
import { useLang } from '../contexts/LangContext';

export default function CalibrationPage({ teamId }: { teamId: string }) {
  const { t, taskTypeLabel } = useLang();
  const [sprintFilter, setSprintFilter] = useState('');
  const [result, setResult] = useState<CalibrationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [applied, setApplied] = useState(false);

  async function handleCalibrate() {
    setLoading(true);
    setError('');
    setResult(null);
    setApplied(false);
    try {
      const sprintIds = sprintFilter.trim()
        ? sprintFilter.split(',').map(s => s.trim()).filter(Boolean)
        : ['all'];
      const { data } = await api.post<CalibrationResult>('/calibrate', { teamId, sprintIds });
      setResult(data);
    } catch (e: any) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleApplyWeights() {
    if (!result) return;
    try {
      await api.put(`/teams/${teamId}/config`, { weights: result.suggestedWeights, weightSource: 'calibration' });
      setApplied(true);
    } catch (e: any) {
      setError(e.response?.data?.error || e.message);
    }
  }

  const estimations = result?.driftAnalysis.estimations ?? [];

  return (
    <div>
      <h2>{t('calib_title')}</h2>
      <p className="criterion-desc" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
        {t('calib_desc')}
      </p>

      <div className="panel" style={{ padding: '1rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
        <strong>{t('calib_how_title')}</strong>
        <ol style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem', lineHeight: 2 }}>
          <li>{t('calib_step1')}</li>
          <li>{t('calib_step2')}</li>
          <li>{t('calib_step3')}</li>
          <li>{t('calib_step4')}</li>
        </ol>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
        <label style={{ flex: 1, minWidth: '200px' }}>{t('calib_sprint_filter')}
          <input
            value={sprintFilter}
            onChange={e => setSprintFilter(e.target.value)}
            placeholder={t('calib_sprint_placeholder')}
            style={{ width: '100%' }}
          />
        </label>
        <button onClick={handleCalibrate} disabled={loading} className="primary" style={{ height: '38px', whiteSpace: 'nowrap' }}>
          {loading ? t('calib_analyzing') : t('calib_analyze_btn')}
        </button>
      </div>
      <p className="criterion-desc" style={{ fontSize: '0.75rem', marginBottom: '1rem' }}>
        {t('calib_multi_sprint_hint')}
      </p>

      {error && <div className="error">{error}</div>}

      {result && (
        <div>
          {/* Özet */}
          <div className="result-card">
            <h3>{t('calib_drift_title')}
              <small style={{ fontWeight: 400, marginLeft: '8px', fontSize: '0.8rem' }} className="criterion-desc">
                {estimations.length} {t('calib_estimations_count')}
              </small>
            </h3>
            {estimations.length === 0 ? (
              <p className="criterion-desc">{t('calib_no_estimations')}</p>
            ) : (
              <>
                <div className="drift-summary">
                  <div>
                    <strong>{t('calib_avg_error')}</strong> %{(result.driftAnalysis.overallMeanError * 100).toFixed(1)}
                  </div>
                  <div>
                    <strong>{t('calib_direction')}</strong>{' '}
                    <span className={`badge-${result.driftAnalysis.overallDirection === 'balanced' ? 'ok' : 'warn'}`}>
                      {result.driftAnalysis.overallDirection === 'over' ? t('calib_direction_over')
                        : result.driftAnalysis.overallDirection === 'under' ? t('calib_direction_under')
                        : t('calib_direction_balanced')}
                    </span>
                  </div>
                  <div>
                    <strong>{t('calib_calibration')}</strong>{' '}
                    {result.driftAnalysis.shouldCalibrate
                      ? <span className="badge-warn">{t('calib_needs_update')}</span>
                      : <span className="badge-ok">{t('calib_no_need')}</span>}
                  </div>
                </div>

                <h4 style={{ marginTop: '1.25rem' }}>{t('calib_comparison_title')}</h4>
                <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t('calib_col_issue')}</th>
                      <th>{t('calib_col_sprint')}</th>
                      <th>{t('calib_col_task_type')}</th>
                      <th>{t('calib_col_engine')}</th>
                      <th>{t('calib_col_approved')}</th>
                      <th>{t('calib_col_diff')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estimations.map(e => {
                      const diff = e.suggestedSP - e.approvedSP;
                      return (
                        <tr key={e.estimationId}>
                          <td><strong>{e.sourceId}</strong></td>
                          <td className="criterion-desc" style={{ fontSize: '0.8rem' }}>{e.sprintId ?? '—'}</td>
                          <td>{taskTypeLabel(e.taskType)}</td>
                          <td style={{ textAlign: 'center' }}>{e.suggestedSP}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>{e.approvedSP}</td>
                          <td style={{ textAlign: 'center', fontWeight: 600 }} className={diff > 0 ? 'stat-value-amber' : diff < 0 ? 'stat-value-red' : 'stat-value-green'}>
                            {diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : '='}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
                <div className="criterion-desc" style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
                  {t('calib_legend')}
                </div>

                {Object.keys(result.driftAnalysis.byTaskType).length > 0 && (
                  <>
                    <h4 style={{ marginTop: '1.25rem' }}>{t('calib_by_task_type')}</h4>
                    <div className="table-wrap">
                    <table>
                      <thead><tr><th>{t('calib_col_task_type')}</th><th>{t('calib_col_deviation')}</th><th>{t('calib_col_direction')}</th><th>{t('calib_col_sample')}</th></tr></thead>
                      <tbody>
                        {Object.entries(result.driftAnalysis.byTaskType).map(([tt, d]) => (
                          <tr key={tt}>
                            <td>{taskTypeLabel(tt)}</td>
                            <td>%{(d.meanError * 100).toFixed(1)}</td>
                            <td>{d.direction === 'over' ? t('calib_dir_over') : d.direction === 'under' ? t('calib_dir_under') : t('calib_dir_balanced')}</td>
                            <td>{d.sampleCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </>
                )}

                {result.driftAnalysis.shouldCalibrate && (
                  <div className="approve-section" style={{ marginTop: '1.25rem' }}>
                    {applied ? (
                      <div className="approve-success">{t('calib_applied')}</div>
                    ) : (
                      <>
                        <button onClick={handleApplyWeights} className="primary">
                          {t('calib_apply_weights')}
                        </button>
                        <small className="criterion-desc">{t('calib_apply_hint')}</small>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
