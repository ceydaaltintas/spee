import { useState } from 'react';
import api from '../api/client';
import type { CalibrationResult } from '../api/types';
import { TASK_TYPE_LABELS } from '../api/labels';

export default function CalibrationPage({ teamId }: { teamId: string }) {
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
      <h2>Kalibrasyon</h2>
      <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1rem' }}>
        Sistemin tahminleri ile takımın onayladığı gerçek SP değerlerini karşılaştırır.
        Belirli bir sprint girerek o sprinte ait işleri filtrele, ya da tümünü analiz et.
      </p>

      <div className="panel" style={{ padding: '1rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
        <strong>Nasıl çalışır?</strong>
        <ol style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem', lineHeight: 2 }}>
          <li>Tahmin ekranında iş no + sprint bilgisiyle tahmin yap</li>
          <li>Tahmin sonucunda <strong>Onayla</strong> butonuyla gerçek SP değerini kaydet</li>
          <li>Buraya sprint adını girerek o sprintteki işlerin analizini gör</li>
          <li>Sapma yüksekse ağırlık güncellemesi öneri gelir — onaylayınca uygulanır</li>
        </ol>
      </div>

      <div className="form-row" style={{ alignItems: 'flex-end' }}>
        <label>Sprint Filtresi
          <input
            value={sprintFilter}
            onChange={e => setSprintFilter(e.target.value)}
            placeholder="Sprint-42 (boş bırakırsan tümü)"
          />
          <small style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
            Virgülle birden fazla sprint girebilirsin
          </small>
        </label>
        <button onClick={handleCalibrate} disabled={loading} className="primary">
          {loading ? 'Analiz ediliyor...' : 'Analiz Et'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {result && (
        <div>
          {/* Özet */}
          <div className="result-card">
            <h3>Sapma Analizi
              <small style={{ fontWeight: 400, color: '#64748b', marginLeft: '8px', fontSize: '0.8rem' }}>
                {estimations.length} onaylı tahmin
              </small>
            </h3>
            {estimations.length === 0 ? (
              <p style={{ color: '#64748b' }}>
                Bu filtre için onaylanmış tahmin bulunamadı.
                Tahmin ekranında sprint bilgisi girerek onaylama yapın.
              </p>
            ) : (
              <>
                <div className="drift-summary">
                  <div>
                    <strong>Ortalama Sapma:</strong> %{(result.driftAnalysis.overallMeanError * 100).toFixed(1)}
                  </div>
                  <div>
                    <strong>Tahmin Yönü:</strong>{' '}
                    <span className={`badge-${result.driftAnalysis.overallDirection === 'balanced' ? 'ok' : 'warn'}`}>
                      {result.driftAnalysis.overallDirection === 'over' ? 'Fazla tahmin ediliyor'
                        : result.driftAnalysis.overallDirection === 'under' ? 'Eksik tahmin ediliyor'
                        : 'Dengeli'}
                    </span>
                  </div>
                  <div>
                    <strong>Kalibrasyon:</strong>{' '}
                    {result.driftAnalysis.shouldCalibrate
                      ? <span className="badge-warn">Ağırlık güncellemesi önerilir</span>
                      : <span className="badge-ok">Gerekli değil</span>}
                  </div>
                </div>

                {/* Sprint bazlı iş listesi */}
                <h4 style={{ marginTop: '1.25rem' }}>İş Bazlı Karşılaştırma</h4>
                <table>
                  <thead>
                    <tr>
                      <th>İş No</th>
                      <th>Sprint</th>
                      <th>Görev Tipi</th>
                      <th>Motor Önerisi</th>
                      <th>Onaylanan SP</th>
                      <th>Fark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estimations.map(e => {
                      const diff = e.suggestedSP - e.approvedSP;
                      return (
                        <tr key={e.estimationId}>
                          <td><strong>{e.sourceId}</strong></td>
                          <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{e.sprintId ?? '—'}</td>
                          <td>{TASK_TYPE_LABELS[e.taskType] ?? e.taskType}</td>
                          <td style={{ textAlign: 'center' }}>{e.suggestedSP}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>{e.approvedSP}</td>
                          <td style={{ textAlign: 'center', color: diff > 0 ? '#fbbf24' : diff < 0 ? '#fca5a5' : '#6ee7b7', fontWeight: 600 }}>
                            {diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : '='}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
                  + = motor fazla tahmin etti &nbsp;·&nbsp; − = motor az tahmin etti &nbsp;·&nbsp; = = tam isabet
                </div>

                {/* Görev tipi bazlı */}
                {Object.keys(result.driftAnalysis.byTaskType).length > 0 && (
                  <>
                    <h4 style={{ marginTop: '1.25rem' }}>Görev Tipi Bazlı Sapma</h4>
                    <table>
                      <thead><tr><th>Görev Tipi</th><th>Sapma</th><th>Yön</th><th>Örnek</th></tr></thead>
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
                  <div className="approve-section" style={{ marginTop: '1.25rem' }}>
                    {applied ? (
                      <div style={{ background: '#065f46', border: '1px solid #6ee7b7', borderRadius: '8px', padding: '0.75rem 1rem', color: '#6ee7b7' }}>
                        ✓ Ağırlıklar güncellendi. Bir sonraki tahminlerden itibaren geçerli olacak.
                      </div>
                    ) : (
                      <>
                        <button onClick={handleApplyWeights} className="primary">
                          Önerilen Ağırlıkları Uygula
                        </button>
                        <small style={{ color: '#64748b' }}>
                          Mevcut ağırlıklar sapma yönüne göre ayarlanır, oranlar korunur.
                        </small>
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
