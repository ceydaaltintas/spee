import { useEffect, useState } from 'react';
import api from '../api/client';
import type { TeamConfig, Technique } from '../api/types';
import { criteriaLabel, TECHNIQUE_LABELS, TASK_TYPE_LABELS } from '../api/labels';

const TECHNIQUES: { value: Technique; label: string }[] = (
  ['FIBONACCI', 'MODIFIED_FIBONACCI', 'TSHIRT', 'POWERS_OF_TWO', 'LINEAR'] as Technique[]
).map(v => ({ value: v, label: TECHNIQUE_LABELS[v] }));

export default function TeamConfigPage({ teamId }: { teamId: string }) {
  const [config, setConfig] = useState<TeamConfig | null>(null);
  const [technique, setTechnique] = useState<Technique>('FIBONACCI');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadConfig();
  }, [teamId]);

  async function loadConfig() {
    setLoading(true);
    try {
      const { data } = await api.get<TeamConfig>(`/teams/${teamId}/config`);
      setConfig(data);
      setTechnique(data.activeTechnique);
    } catch {
      setMessage('Takim yapilandirmasi yuklenemedi');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage('');
    try {
      await api.put(`/teams/${teamId}/config`, { activeTechnique: technique });
      setMessage('Kaydedildi');
      await loadConfig();
    } catch (e: any) {
      setMessage(e.response?.data?.error || 'Hata olustu');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Yukleniyor...</p>;
  if (!config) return <p>Takim bulunamadi</p>;

  return (
    <div>
      <h2>Takim Ayarlari</h2>

      <div className="config-card">
        <h3>{config.name}</h3>
        <p>Kaynak Sistem: {config.sourceSystem} | Ortalama Velocity: {config.velocityAvg ?? 'Henuz veri yok'}</p>

        <label>Tahmin Teknigi
          <select value={technique} onChange={e => setTechnique(e.target.value as Technique)}>
            {TECHNIQUES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>

        <button onClick={handleSave} disabled={saving} className="primary">
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
        {message && <div className="info">{message}</div>}
      </div>

      {Object.keys(config.weights).length > 0 && (
        <div className="weights-section">
          <h3>Mevcut Agirliklar</h3>
          <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '1rem' }}>
            Her gorev tipi icin kriterlerin tahmine ne kadar etki ettigini gosteren agirliklar. Toplam her zaman %100'dur.
          </p>
          {Object.entries(config.weights).map(([taskType, weights]) => (
            <div key={taskType} className="weight-group">
              <h4>{TASK_TYPE_LABELS[taskType] ?? taskType}</h4>
              <table>
                <thead><tr><th>Kriter</th><th>Agirlik</th><th>Etki Orani</th></tr></thead>
                <tbody>
                  {Object.entries(weights).sort((a, b) => b[1] - a[1]).map(([key, w]) => (
                    <tr key={key}>
                      <td>{criteriaLabel(key)}</td>
                      <td>%{(w * 100).toFixed(0)}</td>
                      <td><div className="weight-bar" style={{ width: `${w * 100 * 3}px` }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
