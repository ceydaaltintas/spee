import { useEffect, useState, useRef } from 'react';
import api from '../api/client';
import type { HistoryItem, TaskType } from '../api/types';
import { TASK_TYPE_LABELS } from '../api/labels';

const TASK_TYPES: TaskType[] = ['USER_STORY', 'BUG', 'ANALYSIS', 'TEST_TASK', 'DESIGN', 'DEVOPS', 'SPIKE', 'SUB_TASK'];
const PAGE_SIZE = 20;

type Item = HistoryItem & { sprintId?: string | null };

export default function HistoryPage({ teamId }: { teamId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [filterType, setFilterType] = useState<string>('');
  const [filterSprint, setFilterSprint] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [editingSP, setEditingSP] = useState<Record<string, string>>({});

  const offsetRef = useRef(0);

  useEffect(() => {
    offsetRef.current = 0;
    loadHistory(0, true);
  }, [teamId, filterType]);

  async function loadHistory(offset: number, replace: boolean) {
    replace ? setLoading(true) : setLoadingMore(true);
    try {
      const params = new URLSearchParams();
      if (filterType) params.set('taskType', filterType);
      if (filterSprint.trim()) params.set('sprintId', filterSprint.trim());
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(offset));
      const { data } = await api.get<{ estimations: Item[]; total: number }>(`/history/${teamId}?${params}`);
      setTotal(data.total);
      setItems(prev => replace ? data.estimations : [...prev, ...data.estimations]);
      offsetRef.current = offset + data.estimations.length;
    } catch {
      if (replace) setItems([]);
    } finally {
      replace ? setLoading(false) : setLoadingMore(false);
    }
  }

  function applyFilter() {
    offsetRef.current = 0;
    loadHistory(0, true);
  }

  function clearFilter() {
    setFilterType('');
    setFilterSprint('');
    offsetRef.current = 0;
    // use timeout so state clears before fetch
    setTimeout(() => loadHistory(0, true), 0);
  }

  async function handleApprove(estimationId: string) {
    const sp = parseInt(editingSP[estimationId] ?? '', 10);
    if (!sp || sp <= 0) return;
    setApprovingId(estimationId);
    try {
      await api.patch(`/history/${teamId}/${estimationId}/approve`, { approvedSP: sp });
      setItems(prev => prev.map(i => i.estimationId === estimationId ? { ...i, approvedSP: sp } : i));
      setEditingSP(prev => { const n = { ...prev }; delete n[estimationId]; return n; });
    } catch (e: any) {
      alert(e.response?.data?.error || 'Onay başarısız');
    } finally {
      setApprovingId(null);
    }
  }

  async function handleDelete(estimationId: string, sourceId: string) {
    if (!confirm(`"${sourceId}" tahminini silmek istediğine emin misin?`)) return;
    setDeletingId(estimationId);
    try {
      await api.delete(`/history/${teamId}/${estimationId}`);
      setItems(prev => prev.filter(i => i.estimationId !== estimationId));
      setTotal(t => t - 1);
    } catch (e: any) {
      alert(e.response?.data?.error || 'Silme başarısız');
    } finally {
      setDeletingId(null);
    }
  }

  const hasMore = items.length < total;

  return (
    <div>
      <h2>Tahmin Geçmişi</h2>

      <div className="form-row" style={{ alignItems: 'flex-end' }}>
        <label>Görev Tipi
          <select value={filterType} onChange={e => { setFilterType(e.target.value); }}>
            <option value="">Tümü</option>
            {TASK_TYPES.map(t => <option key={t} value={t}>{TASK_TYPE_LABELS[t]}</option>)}
          </select>
        </label>
        <label>Sprint
          <input
            value={filterSprint}
            onChange={e => setFilterSprint(e.target.value)}
            placeholder="Sprint-42"
            onKeyDown={e => e.key === 'Enter' && applyFilter()}
          />
        </label>
        <button onClick={applyFilter} className="primary">Filtrele</button>
        {(filterType || filterSprint) && (
          <button onClick={clearFilter}>Temizle</button>
        )}
      </div>

      {loading ? <p>Yükleniyor...</p> : (
        <>
          {total > 0 && (
            <div style={{ fontSize: '0.78rem', color: '#475569', marginBottom: '0.5rem' }}>
              {items.length} / {total} kayıt gösteriliyor
            </div>
          )}
          <table>
            <thead>
              <tr>
                <th>Issue</th>
                <th>Sprint</th>
                <th>Görev Tipi</th>
                <th>Önerilen SP</th>
                <th>Onaylanan SP</th>
                <th>Güven</th>
                <th>Tarih</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={8} style={{ color: '#64748b' }}>Kayıt bulunamadı</td></tr>}
              {items.map(item => (
                <tr key={item.estimationId}>
                  <td>
                    <strong>{item.sourceId}</strong>
                    {item.title && item.title !== item.sourceId && (
                      <><br /><small style={{ color: '#64748b' }}>{item.title}</small></>
                    )}
                  </td>
                  <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{(item as any).sprintId ?? '–'}</td>
                  <td>{TASK_TYPE_LABELS[item.taskType] ?? item.taskType}</td>
                  <td className="sp">{item.suggestedSP}</td>
                  <td>
                    {item.approvedSP ? (
                      <span className="sp" style={{ color: '#6ee7b7' }}>{item.approvedSP}</span>
                    ) : (
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={editingSP[item.estimationId] ?? ''}
                          onChange={e => setEditingSP(prev => ({ ...prev, [item.estimationId]: e.target.value.replace(/\D/g, '') }))}
                          onKeyDown={e => e.key === 'Enter' && handleApprove(item.estimationId)}
                          placeholder="SP"
                          style={{ width: '48px', padding: '2px 6px', height: '28px', fontSize: '0.82rem', textAlign: 'center' }}
                        />
                        <button
                          onClick={() => handleApprove(item.estimationId)}
                          disabled={approvingId === item.estimationId || !editingSP[item.estimationId]}
                          className="btn-approve"
                          style={{ padding: '2px 8px', fontSize: '0.75rem', height: '28px' }}
                        >
                          {approvingId === item.estimationId ? '...' : 'Onayla'}
                        </button>
                      </div>
                    )}
                  </td>
                  <td>%{(item.confidenceScore * 100).toFixed(0)}</td>
                  <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    {new Date(item.createdAt).toLocaleDateString('tr-TR')}
                  </td>
                  <td>
                    <button
                      onClick={() => handleDelete(item.estimationId, item.sourceId)}
                      disabled={deletingId === item.estimationId}
                      className="btn-danger"
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                    >
                      {deletingId === item.estimationId ? '...' : 'Sil'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button onClick={() => loadHistory(offsetRef.current, false)} disabled={loadingMore}>
                {loadingMore ? 'Yükleniyor...' : `Daha fazla yükle (${total - items.length} kaldı)`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
