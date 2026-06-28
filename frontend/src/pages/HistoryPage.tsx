import { useEffect, useState } from 'react';
import api from '../api/client';
import type { HistoryItem, TaskType } from '../api/types';
import { TASK_TYPE_LABELS } from '../api/labels';

const TASK_TYPES: TaskType[] = ['USER_STORY', 'BUG', 'ANALYSIS', 'TEST_TASK', 'DESIGN', 'DEVOPS', 'SPIKE', 'SUB_TASK'];

export default function HistoryPage({ teamId }: { teamId: string }) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [filterType, setFilterType] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [teamId, filterType]);

  async function loadHistory() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType) params.set('taskType', filterType);
      params.set('limit', '50');
      const { data } = await api.get(`/history/${teamId}?${params}`);
      setItems(data.estimations);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2>Tahmin Gecmisi</h2>

      <div className="form-row">
        <label>Gorev Tipi Filtresi
          <select value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">Tumu</option>
            {TASK_TYPES.map(t => <option key={t} value={t}>{TASK_TYPE_LABELS[t]}</option>)}
          </select>
        </label>
      </div>

      {loading ? <p>Yukleniyor...</p> : (
        <table>
          <thead>
            <tr>
              <th>Issue</th>
              <th>Gorev Tipi</th>
              <th>Onerilen SP</th>
              <th>Onaylanan SP</th>
              <th>Guven</th>
              <th>Aralik</th>
              <th>Sprint Durumu</th>
              <th>Tarih</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={8}>Kayit bulunamadi</td></tr>}
            {items.map(item => (
              <tr key={item.estimationId}>
                <td><strong>{item.sourceId}</strong><br/><small>{item.title}</small></td>
                <td>{TASK_TYPE_LABELS[item.taskType] ?? item.taskType}</td>
                <td className="sp">{item.suggestedSP}</td>
                <td className="sp">{item.approvedSP ?? '–'}</td>
                <td>%{(item.confidenceScore * 100).toFixed(0)}</td>
                <td>{item.confidenceLow != null ? `${item.confidenceLow}–${item.confidenceHigh}` : '–'}</td>
                <td>
                  {item.outcome ? (
                    <span className={item.outcome.completedInSprint ? 'badge-ok' : 'badge-warn'}>
                      {item.outcome.completedInSprint ? 'Tamamlandi' : 'Tasma'}
                    </span>
                  ) : '–'}
                </td>
                <td>{new Date(item.createdAt).toLocaleDateString('tr-TR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
