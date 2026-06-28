import { useState } from 'react';
import api from '../api/client';
import type { CalibrationResult } from '../api/types';
import { TASK_TYPE_LABELS } from '../api/labels';

export default function CalibrationPage({ teamId }: { teamId: string }) {
  const [sprintIds, setSprintIds] = useState('');
  const [result, setResult] = useState<CalibrationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [applied, setApplied] = useState(false);

  async function handleCalibrate() {
    const ids = sprintIds.split(',').map(s => s.trim()).filter(Boolean);
    if (ids.length === 0) { setError('En az bir Sprint ID girin'); return; }
    setLoading(true);
    setError('');
    setResult(null);
    setApplied(false);
    try {
      const { data } = await api.post<CalibrationResult>('/calibrate', { teamId, sprintIds: ids });
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
      await api.put(`/teams/${teamId}/config`, { weights: result.suggestedWeights });
      setApplied(true);
    } catch (e: any) {
      setError(e.response?.data?.error || e.message);
    }
  }

  return (
    <div>
      <h2>Kalibrasyon</h2>
      <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1rem' }}>
        Gecmis sprint verilerini analiz ederek tahmin dogrulugunu olcer.
        Sapma yuksekse agirlik guncelleme onerisi uretir.
      </p>

      <div className="form-row">
        <label>Sprint ID'leri (virgulle ayirin)
          <input
            value={sprintIds}
            onChange={e => setSprintIds(e.target.value)}
            placeholder="sprint-1, sprint-2, sprint-3"
          />
        </label>
        <button onClick={handleCalibrate} disabled={loading} className="primary">
          {loading ? 'Analiz ediliyor...' : 'Analiz Et'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {result && (
        <div className="result-card">
          <h3>Sapma Analizi</h3>
          <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
            Tahmin edilen SP ile gerceklesen arasindaki farki gosterir.
          </p>
          <div className="drift-summary">
            <div>
              <strong>Ortalama Sapma:</strong> %{(result.driftAnalysis.overallMeanError * 100).toFixed(1)}
            </div>
            <div>
              <strong>Tahmin Yonu:</strong>{' '}
              <span className={`badge-${result.driftAnalysis.overallDirection === 'balanced' ? 'ok' : 'warn'}`}>
                {result.driftAnalysis.overallDirection === 'over' ? 'Fazla tahmin ediliyor' :
                 result.driftAnalysis.overallDirection === 'under' ? 'Eksik tahmin ediliyor' : 'Dengeli'}
              </span>
            </div>
            <div>
              <strong>Kalibrasyon:</strong>{' '}
              {result.driftAnalysis.shouldCalibrate
                ? <span className="badge-warn">Agirlik guncellemesi onerilir</span>
                : <span className="badge-ok">Gerekli degil</span>}
            </div>
          </div>

          {Object.keys(result.driftAnalysis.byTaskType).length > 0 && (
            <>
              <h4>Gorev Tipi Bazli Sapma</h4>
              <table>
                <thead><tr><th>Gorev Tipi</th><th>Sapma</th><th>Yon</th><th>Ornek Sayisi</th></tr></thead>
                <tbody>
                  {Object.entries(result.driftAnalysis.byTaskType).map(([tt, d]) => (
                    <tr key={tt}>
                      <td>{TASK_TYPE_LABELS[tt] ?? tt}</td>
                      <td>%{(d.meanError * 100).toFixed(1)}</td>
                      <td>{d.direction === 'over' ? 'Fazla' : d.direction === 'under' ? 'Eksik' : 'Dengeli'}</td>
                      <td>{d.sampleCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {result.driftAnalysis.shouldCalibrate && (
            <div className="approve-section">
              <button onClick={handleApplyWeights} disabled={applied} className="primary">
                {applied ? 'Uygulandi' : 'Onerilen Agirliklari Uygula'}
              </button>
              <small style={{ color: '#64748b' }}>
                Mevcut agirliklar sapma yonune gore ayarlanir, oranlar korunur.
              </small>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
