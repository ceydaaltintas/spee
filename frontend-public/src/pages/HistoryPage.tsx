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
  const [completionMap, setCompletionMap] = useState<Record<string, boolean | null>>({});
  const [sprintStats, setSprintStats] = useState<{ sprints: { sprintId: string; plannedSP: number; completedSP: number; notCompletedSP: number }[]; avgCompletedSP: number | null } | null>(null);

  const offsetRef = useRef(0);

  useEffect(() => {
    offsetRef.current = 0;
    loadHistory(0, true);
    api.get<{ sprints: any[]; avgCompletedSP: number | null }>(`/history/${teamId}/sprint-stats`)
      .then(r => setSprintStats(r.data))
      .catch(() => {});
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
      if (replace) {
        const map: Record<string, boolean | null> = {};
        data.estimations.forEach((e: Item) => { map[e.estimationId] = e.outcome?.completedInSprint ?? null; });
        setCompletionMap(map);
      } else {
        setCompletionMap(prev => {
          const next = { ...prev };
          data.estimations.forEach((e: Item) => { next[e.estimationId] = e.outcome?.completedInSprint ?? null; });
          return next;
        });
      }
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
    setTimeout(() => loadHistory(0, true), 0);
  }

  async function handleApprove(estimationId: string, spOverride?: number) {
    const sp = spOverride ?? parseInt(editingSP[estimationId] ?? '', 10);
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

  async function handleCompletion(estimationId: string, value: boolean | null) {
    const oldValue = completionMap[estimationId] ?? null;
    setCompletionMap(prev => ({ ...prev, [estimationId]: value }));
    const item = items.find(i => i.estimationId === estimationId);
    if (item?.approvedSP) {
      setSprintStats(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          sprints: prev.sprints.map(s => {
            if (s.sprintId !== (item as any).sprintId) return s;
            let { completedSP, notCompletedSP } = s;
            if (oldValue === true) completedSP -= item.approvedSP!;
            if (oldValue === false) notCompletedSP -= item.approvedSP!;
            if (value === true) completedSP += item.approvedSP!;
            if (value === false) notCompletedSP += item.approvedSP!;
            return { ...s, completedSP, notCompletedSP };
          }),
        };
      });
    }
    try {
      await api.patch(`/history/${teamId}/${estimationId}/completion`, { completedInSprint: value });
    } catch {
      setCompletionMap(prev => ({ ...prev, [estimationId]: oldValue }));
    }
  }

  async function handleDelete(estimationId: string, sourceId: string) {
    if (!confirm(`"${sourceId}" tahminini silmek istediğine emin misin?`)) return;
    setDeletingId(estimationId);
    try {
      await api.delete(`/history/${teamId}/${estimationId}`, { data: {} });
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
            <div style={{ fontSize: '0.78rem', marginBottom: '0.5rem' }} className="criterion-desc">
              {items.length} / {total} kayıt gösteriliyor
            </div>
          )}
          {filterSprint && items.length > 0 && (() => {
            const sprintStat = sprintStats?.sprints.find(s => s.sprintId === filterSprint.trim());
            const completedCount = items.filter(i => completionMap[i.estimationId] === true).length;
            const notCompletedCount = items.filter(i => completionMap[i.estimationId] === false).length;
            const unmarkedCount = items.length - completedCount - notCompletedCount;
            const completionRate = (completedCount + notCompletedCount) > 0
              ? Math.round(completedCount / (completedCount + notCompletedCount) * 100) : null;
            return (
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                <div className="stat-card"><div className="stat-label">Planlanan SP</div><div className="stat-value">{sprintStat?.plannedSP ?? '—'}</div></div>
                <div className="stat-card"><div className="stat-label">Tamamlanan SP</div><div className="stat-value-green">{sprintStat?.completedSP ?? '—'}</div></div>
                <div className="stat-card"><div className="stat-label">Tamamlanamayan SP</div><div className="stat-value-red">{sprintStat?.notCompletedSP ?? '—'}</div></div>
                {completionRate !== null && (
                  <div className="stat-card">
                    <div className="stat-label">Tamamlanma</div>
                    <div className={completionRate >= 70 ? 'stat-value-green' : completionRate >= 40 ? 'stat-value-amber' : 'stat-value-red'}>
                      %{completionRate}
                    </div>
                  </div>
                )}
                <div className="stat-card"><div className="stat-label">Belirsiz PBI</div><div className="stat-value-muted">{unmarkedCount}</div></div>
              </div>
            );
          })()}
          {!filterSprint && sprintStats && sprintStats.sprints.length > 1 && (
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <div className="stat-card"><div className="stat-label">Sprint Sayısı</div><div className="stat-value">{sprintStats.sprints.length}</div></div>
              {sprintStats.avgCompletedSP !== null && (
                <div className="stat-card"><div className="stat-label">Ort. Velocity</div><div className="stat-value-accent">{sprintStats.avgCompletedSP} SP</div></div>
              )}
            </div>
          )}
          <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Issue</th>
                <th>Sprint</th>
                <th>Görev Tipi</th>
                <th>Önerilen SP</th>
                <th>Onaylanan SP</th>
                <th>Güven</th>
                <th>Durum</th>
                <th>Tarih</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={9} className="criterion-desc">Kayıt bulunamadı</td></tr>}
              {items.map(item => (
                <tr key={item.estimationId}>
                  <td>
                    <strong>{item.sourceId}</strong>
                    {item.title && item.title !== item.sourceId && (
                      <><br /><small className="criterion-desc">{item.title}</small></>
                    )}
                  </td>
                  <td style={{ fontSize: '0.8rem' }} className="criterion-desc">{(item as any).sprintId ?? '–'}</td>
                  <td>{TASK_TYPE_LABELS[item.taskType] ?? item.taskType}</td>
                  <td className="sp">{item.suggestedSP}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {item.approvedSP ? (
                      <span className="sp stat-value-green">{item.approvedSP}</span>
                    ) : (
                      <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={editingSP[item.estimationId] ?? ''}
                          onChange={e => setEditingSP(prev => ({ ...prev, [item.estimationId]: e.target.value.replace(/\D/g, '') }))}
                          onKeyDown={e => e.key === 'Enter' && handleApprove(item.estimationId, editingSP[item.estimationId] ? undefined : item.suggestedSP)}
                          placeholder={String(item.suggestedSP)}
                          style={{ width: '44px', padding: '2px 6px', height: '28px', fontSize: '0.82rem', textAlign: 'center' }}
                        />
                        <button
                          onClick={() => handleApprove(item.estimationId, editingSP[item.estimationId] ? undefined : item.suggestedSP)}
                          disabled={approvingId === item.estimationId}
                          className="btn-approve"
                          style={{ padding: '2px 8px', fontSize: '0.75rem', height: '28px' }}
                        >
                          {approvingId === item.estimationId ? '...' : 'Onayla'}
                        </button>
                      </div>
                    )}
                  </td>
                  <td>%{(item.confidenceScore * 100).toFixed(0)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        className={`completion-toggle${completionMap[item.estimationId] === true ? ' completion-toggle-done' : ''}`}
                        onClick={() => handleCompletion(item.estimationId, completionMap[item.estimationId] === true ? null : true)}
                        title="Tamamlandı"
                      >✓</button>
                      <button
                        className={`completion-toggle${completionMap[item.estimationId] === false ? ' completion-toggle-fail' : ''}`}
                        onClick={() => handleCompletion(item.estimationId, completionMap[item.estimationId] === false ? null : false)}
                        title="Tamamlanamadı"
                      >✕</button>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.8rem' }} className="criterion-desc">
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
          </div>

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
