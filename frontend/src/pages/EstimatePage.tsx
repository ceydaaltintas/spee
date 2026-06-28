import { useState } from 'react';
import api from '../api/client';
import type { EstimateResponse, TaskType, CriteriaValue } from '../api/types';
import { criteriaLabel, criteriaDescription, TASK_TYPE_LABELS, TECHNIQUE_LABELS } from '../api/labels';

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

export default function EstimatePage({ teamId }: { teamId: string }) {
  const [sourceSystem, setSourceSystem] = useState<'JIRA' | 'ADO'>('JIRA');
  const [sourceId, setSourceId] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('USER_STORY');
  const [criteria, setCriteria] = useState<Record<string, CriteriaValue>>({});
  const [result, setResult] = useState<EstimateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const activeCriteria = CRITERIA_BY_TASK_TYPE[taskType] ?? [];

  function setCriterion(key: string, type: 'scale5' | 'count' | 'boolean', raw: string | boolean) {
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

  async function handleEstimate() {
    if (!sourceId.trim()) { setError('İş Kalemi numarası gerekli'); return; }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const { data } = await api.post<EstimateResponse>('/estimate', {
        sourceSystem,
        sourceId: sourceId.trim(),
        teamId,
        taskType,
        manualCriteria: criteria,
      });
      setResult(data);
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
      setResult(prev => prev ? { ...prev, approvedSP: sp } as any : null);
    } catch (e: any) {
      setError(e.response?.data?.error || e.message);
    }
  }

  const filledCount = Object.keys(criteria).length;
  const totalCount = activeCriteria.length;

  return (
    <div>
      <h2>Tahmin Oluştur</h2>

      <div className="form-row">
        <label>Kaynak Sistem
          <select value={sourceSystem} onChange={e => setSourceSystem(e.target.value as any)}>
            <option value="JIRA">JIRA</option>
            <option value="ADO">Azure DevOps</option>
          </select>
        </label>

        <label>İş Kalemi No
          <input value={sourceId} onChange={e => setSourceId(e.target.value)} placeholder="örnek: PROJ-123" />
        </label>

        <label>Görev Tipi
          <select value={taskType} onChange={e => { setTaskType(e.target.value as TaskType); setCriteria({}); }}>
            {TASK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
      </div>

      <h3>Kriterler <small style={{ color: '#64748b', fontWeight: 400 }}>({filledCount}/{totalCount} dolduruldu)</small></h3>
      <div className="criteria-grid">
        {activeCriteria.map(c => (
          <div key={c.key} className="criterion" title={criteriaDescription(c.key)}>
            <label>{criteriaLabel(c.key)}</label>
            <small style={{ color: '#64748b', fontSize: '0.7rem' }}>{criteriaDescription(c.key)}</small>
            {c.type === 'boolean' ? (
              <input
                type="checkbox"
                checked={(criteria[c.key]?.value as boolean) ?? false}
                onChange={e => setCriterion(c.key, 'boolean', e.target.checked)}
              />
            ) : c.type === 'scale5' ? (
              <select
                value={(criteria[c.key]?.value as number) ?? ''}
                onChange={e => setCriterion(c.key, 'scale5', e.target.value)}
              >
                <option value="">Seç...</option>
                {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            ) : (
              <input
                type="number"
                min={0}
                value={(criteria[c.key]?.value as number) ?? ''}
                onChange={e => setCriterion(c.key, 'count', e.target.value)}
                placeholder="0"
              />
            )}
          </div>
        ))}
      </div>

      <button onClick={handleEstimate} disabled={loading} className="primary">
        {loading ? 'Hesaplanıyor...' : 'Tahmin Et'}
      </button>

      {error && <div className="error">{error}</div>}

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
                <div><strong>Tahmin Aralığı:</strong> {result.confidenceLow} – {result.confidenceHigh} SP</div>
              )}
            </div>
          </div>

          {result.missingCriteria.length > 0 && (
            <div className="missing">
              <strong>Eksik kriterler ({result.missingCriteria.length}):</strong>{' '}
              {result.missingCriteria.map(k => criteriaLabel(k)).join(', ')}
            </div>
          )}

          <h4>Skor Detayı — Her kriterin tahmine katkısı</h4>
          <table>
            <thead>
              <tr>
                <th>Kriter</th>
                <th>Girilen Değer</th>
                <th>Normalize Skor (0-10)</th>
                <th>Ağırlıklı Katkı</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(result.breakdown).map(([key, b]) => (
                <tr key={key}>
                  <td>
                    <div>{criteriaLabel(key)}</div>
                    <small style={{ color: '#64748b' }}>{criteriaDescription(key)}</small>
                  </td>
                  <td>
                    {b.rawValue.type === 'boolean'
                      ? (b.rawValue.value ? 'Evet' : 'Hayır')
                      : b.rawValue.value}
                    {b.rawValue.type === 'boolean' && b.rawValue.value && (
                      <small style={{ color: '#64748b' }}> (çarpan)</small>
                    )}
                  </td>
                  <td>{b.rawValue.type === 'boolean' ? '—' : b.normalizedScore.toFixed(2)}</td>
                  <td>
                    {b.rawValue.type === 'boolean'
                      ? <span style={{ color: '#64748b' }}>çarpan olarak uygulanır</span>
                      : b.contribution.toFixed(3)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.5rem 0 1rem', background: '#0f172a', padding: '0.75rem', borderRadius: '6px' }}>
            <strong>Hesaplama Açıklaması</strong>
            <ul style={{ margin: '0.5rem 0', paddingLeft: '1.2rem', lineHeight: 2 }}>
              <li>Her kriter 0–10 arasına normalize edilir ve ağırlığı ile çarpılır</li>
              <li><strong>Ters kriterler</strong> (Alan Bilgisi, Kök Neden Netliği, Otomasyon Kolaylığı): Yüksek değer = kolay → düşük katkı. Örneğin Alan Bilgisi=5 (takım uzman) → normalize=0</li>
              <li><strong>Sayısal kriterler</strong> (Bağımlılık, Paydaş Sayısı, Çalışan Kişi vb.): Logaritmik ölçeklenir. 1→2, 3→4, 7→6, 15→8, 31→10</li>
              <li><strong>Boolean kriterler</strong> (Güvenlik, Performans vb.): Toplama girmez, çarpan olarak uygulanır</li>
            </ul>
            <div style={{ marginTop: '0.5rem' }}>
              Ham skor: <strong style={{ color: '#38bdf8' }}>{result.engines.ruleBased.rawScore.toFixed(2)}</strong> / 10.00
              {' → '}{TECHNIQUE_LABELS[result.technique]} eşikleri: {'{ '}
              {result.technique === 'FIBONACCI' && '<1.5→1, <2.5→2, <3.5→3, <5.0→5, <6.5→8, <7.5→13, <8.5→21, <9.5→34, 9.5+→55'}
              {result.technique === 'TSHIRT' && '<1.0→XS, <2.0→S, <3.5→M, <5.0→L, <7.0→XL, 7.0+→XXL'}
              {result.technique === 'POWERS_OF_TWO' && '<1.0→1, <2.0→2, <3.5→4, <5.5→8, <7.5→16, 7.5+→32'}
              {result.technique === 'LINEAR' && '<0.5→1, <1.0→2, ... <8.5→9, 8.5+→10'}
              {' }'} → <strong style={{ color: '#38bdf8' }}>{result.engines.ruleBased.sp} SP</strong>
            </div>
          </div>

          <div className="approve-section">
            <strong>Onayla (gerçek SP değeri seç):</strong>
            {[1, 2, 3, 5, 8, 13, 21, 34, 55].map(sp => (
              <button key={sp} onClick={() => handleApprove(sp)} className={sp === result.suggestedSP ? 'active' : ''}>
                {sp}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
