import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import api from '../api/client';
import { useLang } from '../contexts/LangContext';

type TaskType = 'USER_STORY' | 'BUG' | 'ANALYSIS' | 'TEST_TASK' | 'DESIGN' | 'DEVOPS' | 'SPIKE' | 'SUB_TASK';


interface BulkRow {
  title: string;
  description?: string;
  taskType?: TaskType;
  sprintId?: string;
  itemId?: string;
}

interface BulkResult {
  title: string;
  taskType: string;
  suggestedSP: number;
  confidenceScore: number;
  autoFilledCount: number;
  sourceId: string;
  error?: string;
}

const VALID_TASK_TYPES = new Set<string>([
  'USER_STORY', 'BUG', 'ANALYSIS', 'TEST_TASK', 'DESIGN', 'DEVOPS', 'SPIKE', 'SUB_TASK',
]);

const TASK_TYPE_FROM_TR: Record<string, TaskType> = {
  'kullanıcı hikayesi': 'USER_STORY',
  'kullanıcı hikâyesi': 'USER_STORY',
  'özellik': 'USER_STORY',
  'user story': 'USER_STORY',
  'hata': 'BUG',
  'bug': 'BUG',
  'kusur': 'BUG',
  'analiz': 'ANALYSIS',
  'araştırma': 'ANALYSIS',
  'analysis': 'ANALYSIS',
  'test görevi': 'TEST_TASK',
  'test': 'TEST_TASK',
  'tasarım': 'DESIGN',
  'design': 'DESIGN',
  'altyapı': 'DEVOPS',
  'devops': 'DEVOPS',
  'spike': 'SPIKE',
  'alt görev': 'SUB_TASK',
  'alt gorev': 'SUB_TASK',
};

const TEMPLATE_DATA = [
  ['başlık', 'açıklama', 'görev tipi', 'sprint', 'id'],
  ['Kullanıcı şifre sıfırlama', 'JWT token ile email üzerinden sıfırlama akışı. Güvenlik kısıtları var.', 'Kullanıcı Hikayesi', 'Sprint-42', 'PROJ-101'],
  ['Login hata mesajı düzeltme', 'Yanlış şifre girildiğinde ekran boş kalıyor', 'Hata', 'Sprint-42', 'PROJ-102'],
  ['Ödeme entegrasyon analizi', 'Stripe ve iyzico karşılaştırması yapılacak', 'Analiz', '', ''],
];

const TASK_TYPE_NOTES = [
  ['Görev Tipi Değerleri'],
  ['Kullanıcı Hikayesi'],
  ['Hata'],
  ['Analiz'],
  ['Test Görevi'],
  ['Tasarım'],
  ['DevOps'],
  ['Spike'],
  ['Alt Görev'],
];

function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(TEMPLATE_DATA);
  ws['!cols'] = [{ wch: 40 }, { wch: 60 }, { wch: 20 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws, 'PBIler');
  const wsNotes = XLSX.utils.aoa_to_sheet(TASK_TYPE_NOTES);
  wsNotes['!cols'] = [{ wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsNotes, 'Görev Tipleri');
  XLSX.writeFile(wb, 'spee_bulk_template.xlsx');
}

function downloadResults(results: BulkResult[], taskTypeLabelFn: (key: string) => string) {
  const rows = [
    ['ID', 'Title', 'Task Type', 'Suggested SP', 'Confidence (%)', 'Auto Criteria', 'Error'],
    ...results.map(r => [
      r.sourceId,
      r.title,
      taskTypeLabelFn(r.taskType),
      r.suggestedSP ?? '',
      r.confidenceScore != null ? Math.round(r.confidenceScore * 100) : '',
      r.autoFilledCount ?? 0,
      r.error ?? '',
    ]),
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 20 }, { wch: 40 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Results');
  XLSX.writeFile(wb, 'spee_bulk_results.xlsx');
}

function confidenceClass(score: number): string {
  if (score >= 0.7) return 'stat-value-green';
  if (score >= 0.4) return 'stat-value-amber';
  return 'stat-value-red';
}

const BULK_DRAFT_KEY = 'spee_bulk_draft';

function loadDraft() {
  try { return JSON.parse(localStorage.getItem(BULK_DRAFT_KEY) ?? 'null'); } catch { return null; }
}

export default function BulkEstimatePage({ teamId }: { teamId: string }) {
  const { t, taskTypeLabel } = useLang();
  const draft = loadDraft();
  const [rows, setRows] = useState<BulkRow[]>(draft?.rows ?? []);
  const [results, setResults] = useState<BulkResult[]>(draft?.results ?? []);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState(draft?.fileName ?? '');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function saveDraft(update: { rows?: BulkRow[]; results?: BulkResult[]; fileName?: string }) {
    const current = loadDraft() ?? {};
    localStorage.setItem(BULK_DRAFT_KEY, JSON.stringify({ ...current, ...update }));
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError('');
    setResults([]);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]!]!;
        const data = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });

        const parsed: BulkRow[] = data
          .map(r => {
            const rawTaskType = String(r['görev tipi'] ?? r['Görev Tipi'] ?? r['taskType'] ?? '').trim();
            const upper = rawTaskType.toUpperCase();
            const taskType: TaskType | undefined =
              VALID_TASK_TYPES.has(upper)
                ? upper as TaskType
                : TASK_TYPE_FROM_TR[rawTaskType.toLowerCase()] ?? undefined;
            return {
              title: String(r['başlık'] ?? r['Başlık'] ?? r['title'] ?? '').trim(),
              description: String(r['açıklama'] ?? r['Açıklama'] ?? r['description'] ?? '').trim() || undefined,
              taskType,
              sprintId: String(r['sprint'] ?? r['Sprint'] ?? r['sprintId'] ?? '').trim() || undefined,
              itemId: String(r['id'] ?? r['ID'] ?? r['Id'] ?? '').trim() || undefined,
            };
          })
          .filter(r => r.title.length > 0);

        if (parsed.length === 0) {
          setError(t('bulk_error_empty'));
          return;
        }
        if (parsed.length > 50) {
          setError(t('bulk_error_max'));
          return;
        }
        setRows(parsed);
        saveDraft({ rows: parsed, results: [], fileName: file.name });
      } catch {
        setError(t('bulk_error_read'));
      }
    };
    reader.readAsBinaryString(file);
  }

  async function handleProcess() {
    if (rows.length === 0) return;
    setProcessing(true);
    setProgress(0);
    setResults([]);
    setError('');

    const out: BulkResult[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      try {
        const analyzeRes = await api.post('/analyze-text', {
          title: row.title,
          description: row.description,
          ...(row.taskType ? { taskType: row.taskType } : {}),
        });
        const { suggestedCriteria, detectedTaskType } = analyzeRes.data;
        const taskType = row.taskType ?? detectedTaskType ?? 'USER_STORY';

        const sourceId = row.itemId && row.sprintId
          ? `${row.sprintId}#${row.itemId}`
          : row.itemId ?? `bulk-${Date.now()}-${i}`;

        const estimateRes = await api.post('/estimate', {
          sourceSystem: 'JIRA',
          sourceId,
          teamId,
          taskType,
          sprintId: row.sprintId,
          manualCriteria: {
            teamMemberCount: { type: 'count', value: 1 },
            ...suggestedCriteria,
          },
        });

        out.push({
          title: row.title,
          taskType,
          suggestedSP: estimateRes.data.suggestedSP,
          confidenceScore: estimateRes.data.confidenceScore,
          autoFilledCount: Object.keys(suggestedCriteria).length,
          sourceId,
        });
      } catch (e: any) {
        const status = e.response?.status;
        const msg = status === 429
          ? 'AI kota sınırına ulaşıldı, lütfen 1 dakika bekleyip tekrar deneyin'
          : e.response?.data?.error ?? e.message;
        const fallbackSourceId = row.itemId && row.sprintId
          ? `${row.sprintId}#${row.itemId}`
          : row.itemId ?? `bulk-${Date.now()}-${i}`;
        out.push({
          title: row.title,
          taskType: row.taskType ?? 'USER_STORY',
          suggestedSP: 0,
          confidenceScore: 0,
          autoFilledCount: 0,
          sourceId: fallbackSourceId,
          error: msg,
        });
      }

      setProgress(i + 1);
      if (i < rows.length - 1) await new Promise(r => setTimeout(r, 4000));
    }

    setResults(out);
    setProcessing(false);
    saveDraft({ results: out });
  }

  return (
    <div>
      <h2>{t('bulk_title')}</h2>
      <p className="criterion-desc" style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>
        {t('bulk_desc')}
      </p>

      {/* Step 1: File */}
      <div className="panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.75rem' }}>
          {t('bulk_step1')}
        </div>
        <p className="criterion-desc" style={{ fontSize: '0.78rem', marginBottom: '0.75rem' }}>
          {t('bulk_step1_hint')}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => fileRef.current?.click()} className="primary">
            {t('bulk_select_file')}
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleFile} />
          <button onClick={downloadTemplate}>
            {t('bulk_download_template')}
          </button>
          {fileName && (
            <span className="criterion-desc" style={{ fontSize: '0.8rem' }}>✓ {fileName} ({rows.length})</span>
          )}
        </div>
        {error && <div className="error" style={{ marginTop: '0.75rem' }}>{error}</div>}
      </div>

      {/* Önizleme */}
      {rows.length > 0 && !results.length && (
        <div className="panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.75rem' }}>
            {t('bulk_preview_title').replace('{count}', String(rows.length))}
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('bulk_col_title')}</th>
                  <th>{t('bulk_col_desc')}</th>
                  <th>{t('bulk_col_task_type')}</th>
                  <th>{t('bulk_col_sprint')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{r.title}</td>
                    <td className="criterion-desc" style={{ fontSize: '0.8rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.description ?? '—'}
                    </td>
                    <td>
                      {r.taskType
                        ? <span className="badge-accent">{taskTypeLabel(r.taskType)}</span>
                        : <span className="criterion-desc" style={{ fontSize: '0.8rem' }}>{t('bulk_auto')}</span>}
                    </td>
                    <td className="criterion-desc" style={{ fontSize: '0.8rem' }}>{r.sprintId ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '1rem' }}>
            {processing ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }} className="criterion-desc">
                  <span>{t('bulk_analyzing')}</span>
                  <span>{progress} / {rows.length}</span>
                </div>
                <div className="progress-track" style={{ width: '100%', height: '6px', display: 'block', marginLeft: 0 }}>
                  <div className="progress-fill" style={{ width: `${(progress / rows.length) * 100}%` }} />
                </div>
              </div>
            ) : (
              <button onClick={handleProcess} className="primary">
                {t('bulk_start')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sonuçlar */}
      {results.length > 0 && (
        <div className="panel" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
              {t('bulk_results_title').replace('{count}', String(results.length))}
            </div>
            <button onClick={() => downloadResults(results, taskTypeLabel)} style={{ fontSize: '0.8rem' }}>
              {t('bulk_export')}
            </button>
          </div>

          {/* Özet */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {(() => {
              const ok = results.filter(r => !r.error);
              const avgSP = ok.length ? Math.round(ok.reduce((s, r) => s + r.suggestedSP, 0) / ok.length) : 0;
              const totalSP = ok.reduce((s, r) => s + r.suggestedSP, 0);
              const avgConf = ok.length ? ok.reduce((s, r) => s + r.confidenceScore, 0) / ok.length : 0;
              return (
                <>
                  <div className="stat-card"><div className="stat-label">{t('bulk_total_sp')}</div><div className="stat-value">{totalSP}</div></div>
                  <div className="stat-card"><div className="stat-label">{t('bulk_avg_sp')}</div><div className="stat-value">{avgSP}</div></div>
                  <div className="stat-card"><div className="stat-label">{t('bulk_avg_conf')}</div><div className={confidenceClass(avgConf)}>%{Math.round(avgConf * 100)}</div></div>
                </>
              );
            })()}
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('bulk_col_title')}</th>
                  <th>{t('bulk_col_task_type')}</th>
                  <th style={{ textAlign: 'center' }}>{t('bulk_col_sp')}</th>
                  <th style={{ textAlign: 'center' }}>{t('bulk_col_confidence')}</th>
                  <th style={{ textAlign: 'center' }}>{t('bulk_col_criteria')}</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>
                      {r.title}
                      {r.sourceId && !r.sourceId.startsWith('bulk-') && (
                        <><br /><small className="criterion-desc" style={{ fontWeight: 400 }}>{r.sourceId}</small></>
                      )}
                    </td>
                    <td className="criterion-desc" style={{ fontSize: '0.8rem' }}>{taskTypeLabel(r.taskType)}</td>
                    <td style={{ textAlign: 'center' }}>
                      {r.error
                        ? <><span className="stat-value-red" style={{ fontSize: '0.78rem' }}>!</span><br /><small className="stat-value-red" style={{ fontSize: '0.7rem', opacity: 0.8 }}>{r.error}</small></>
                        : <strong className="stat-value-accent">{r.suggestedSP}</strong>}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {!r.error && (
                        <span className={confidenceClass(r.confidenceScore)} style={{ fontSize: '0.85rem' }}>
                          %{Math.round(r.confidenceScore * 100)}
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center', fontSize: '0.8rem' }} className="criterion-desc">
                      {r.error
                        ? <span className="stat-value-red" title={r.error}>!</span>
                        : r.autoFilledCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => { setRows([]); setResults([]); setFileName(''); localStorage.removeItem(BULK_DRAFT_KEY); if (fileRef.current) fileRef.current.value = ''; }}>
              {t('estimate_clear')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
