import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import api from '../api/client';
import { useLang } from '../contexts/LangContext';
import { friendlyError } from '../utils/friendlyError';

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

function downloadTemplate(lang: 'tr' | 'en') {
  const isTR = lang === 'tr';
  const templateData = isTR
    ? [
        ['başlık', 'açıklama', 'görev tipi', 'sprint', 'id'],
        ['Kullanıcı şifre sıfırlama', 'JWT token ile email üzerinden sıfırlama akışı. Güvenlik kısıtları var.', 'Kullanıcı Hikayesi', 'Sprint-42', 'PROJ-101'],
        ['Login hata mesajı düzeltme', 'Yanlış şifre girildiğinde ekran boş kalıyor', 'Hata', 'Sprint-42', 'PROJ-102'],
        ['Ödeme entegrasyon analizi', 'Stripe ve iyzico karşılaştırması yapılacak', 'Analiz', '', ''],
      ]
    : [
        ['title', 'description', 'task type', 'sprint', 'id'],
        ['User password reset', 'Password reset flow via JWT token and email. Has security constraints.', 'User Story', 'Sprint-42', 'PROJ-101'],
        ['Login error message fix', 'Screen goes blank when wrong password is entered', 'Bug', 'Sprint-42', 'PROJ-102'],
        ['Payment integration analysis', 'Comparing Stripe and other providers', 'Analysis', '', ''],
      ];
  const taskTypeNotes = isTR
    ? [['Görev Tipi Değerleri'], ['Kullanıcı Hikayesi'], ['Hata'], ['Analiz'], ['Test Görevi'], ['Tasarım'], ['DevOps'], ['Spike'], ['Alt Görev']]
    : [['Task Type Values'], ['User Story'], ['Bug'], ['Analysis'], ['Test Task'], ['Design'], ['DevOps'], ['Spike'], ['Sub-task']];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(templateData);
  ws['!cols'] = [{ wch: 40 }, { wch: 60 }, { wch: 20 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws, isTR ? 'PBIler' : 'PBIs');
  const wsNotes = XLSX.utils.aoa_to_sheet(taskTypeNotes);
  wsNotes['!cols'] = [{ wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsNotes, isTR ? 'Görev Tipleri' : 'Task Types');
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

const TASK_TYPE_OPTIONS: { value: TaskType; labelTR: string; labelEN: string }[] = [
  { value: 'USER_STORY', labelTR: 'Kullanıcı Hikayesi', labelEN: 'User Story' },
  { value: 'BUG',        labelTR: 'Hata',               labelEN: 'Bug' },
  { value: 'ANALYSIS',   labelTR: 'Analiz',              labelEN: 'Analysis' },
  { value: 'TEST_TASK',  labelTR: 'Test Görevi',         labelEN: 'Test Task' },
  { value: 'DESIGN',     labelTR: 'Tasarım',             labelEN: 'Design' },
  { value: 'DEVOPS',     labelTR: 'DevOps',              labelEN: 'DevOps' },
  { value: 'SPIKE',      labelTR: 'Spike',               labelEN: 'Spike' },
  { value: 'SUB_TASK',   labelTR: 'Alt Görev',           labelEN: 'Sub-task' },
];

const EMPTY_TABLE_ROW = (): BulkRow => ({ title: '', description: '', taskType: undefined, sprintId: '', itemId: '' });

export default function BulkEstimatePage({ teamId }: { teamId: string }) {
  const { t, lang, taskTypeLabel } = useLang();
  const isTR = lang === 'tr';
  const draft = loadDraft();
  const [inputMode, setInputMode] = useState<'file' | 'table'>('file');
  const [rows, setRows] = useState<BulkRow[]>(draft?.rows ?? []);
  const [results, setResults] = useState<BulkResult[]>(draft?.results ?? []);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState(draft?.fileName ?? '');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [tableRows, setTableRows] = useState<BulkRow[]>(() => Array.from({ length: 10 }, EMPTY_TABLE_ROW));

  function updateTableRow(i: number, field: keyof BulkRow, value: string) {
    setTableRows(prev => {
      const next = [...prev];
      if (field === 'taskType') {
        next[i] = { ...next[i]!, taskType: value as TaskType || undefined };
      } else {
        next[i] = { ...next[i]!, [field]: value };
      }
      return next;
    });
  }

  function addTableRow() {
    setTableRows(prev => prev.length >= 50 ? prev : [...prev, EMPTY_TABLE_ROW()]);
  }

  function removeTableRow(i: number) {
    setTableRows(prev => prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i));
  }

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

  async function handleProcess(overrideRows?: BulkRow[]) {
    const processRows = overrideRows ?? rows;
    if (processRows.length === 0) return;
    setRows(processRows);
    setProcessing(true);
    setProgress(0);
    setResults([]);
    setError('');

    const out: BulkResult[] = [];

    for (let i = 0; i < processRows.length; i++) {
      const row = processRows[i]!;
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
        const msg = friendlyError(e, t);
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
      if (i < processRows.length - 1) await new Promise(r => setTimeout(r, 4000));
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

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: '2px', marginBottom: '1rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '3px', width: 'fit-content' }}>
        {(['file', 'table'] as const).map(mode => (
          <button
            key={mode}
            onClick={() => { setInputMode(mode); setError(''); setResults([]); }}
            style={{
              padding: '5px 16px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
              fontSize: '0.82rem', fontWeight: 600,
              background: inputMode === mode ? 'var(--bg-surface)' : 'transparent',
              color: inputMode === mode ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: inputMode === mode ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {mode === 'file' ? t('bulk_tab_file') : t('bulk_tab_table')}
          </button>
        ))}
      </div>

      {/* Step 1: File */}
      {inputMode === 'file' && <div className="panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
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
          <button onClick={() => downloadTemplate(lang)}>
            {t('bulk_download_template')}
          </button>
          {fileName && (
            <span className="criterion-desc" style={{ fontSize: '0.8rem' }}>✓ {fileName} ({rows.length})</span>
          )}
        </div>
        {error && <div className="error" style={{ marginTop: '0.75rem' }}>{error}</div>}
      </div>}

      {/* Tablo girişi */}
      {inputMode === 'table' && !results.length && (
        <div className="panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', minWidth: 700 }}>
              <thead>
                <tr style={{ background: 'var(--bg-base)' }}>
                  <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>{t('bulk_col_title')} *</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>{t('bulk_col_desc')}</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', width: 160 }}>{t('bulk_col_task_type')}</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', width: 110 }}>{t('bulk_col_sprint')}</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', width: 90 }}>{t('bulk_col_id')}</th>
                  <th style={{ padding: '6px 4px', borderBottom: '1px solid var(--border)', width: 28 }} />
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '4px 6px' }}>
                      <input
                        value={row.title}
                        onChange={e => updateTableRow(i, 'title', e.target.value)}
                        placeholder={isTR ? 'PBI başlığı...' : 'PBI title...'}
                        style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 6px', fontSize: '0.8rem', background: 'var(--bg-surface)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                      />
                    </td>
                    <td style={{ padding: '4px 6px' }}>
                      <input
                        value={row.description ?? ''}
                        onChange={e => updateTableRow(i, 'description', e.target.value)}
                        placeholder={isTR ? 'Açıklama (opsiyonel)...' : 'Description (optional)...'}
                        style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 6px', fontSize: '0.8rem', background: 'var(--bg-surface)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                      />
                    </td>
                    <td style={{ padding: '4px 6px' }}>
                      <select
                        value={row.taskType ?? ''}
                        onChange={e => updateTableRow(i, 'taskType', e.target.value)}
                        style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 6px', fontSize: '0.8rem', background: 'var(--bg-surface)', color: row.taskType ? 'var(--text-primary)' : 'var(--text-muted)', boxSizing: 'border-box' }}
                      >
                        <option value="">{isTR ? 'otomatik' : 'auto'}</option>
                        {TASK_TYPE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{isTR ? opt.labelTR : opt.labelEN}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '4px 6px' }}>
                      <input
                        value={row.sprintId ?? ''}
                        onChange={e => updateTableRow(i, 'sprintId', e.target.value)}
                        placeholder="Sprint-42"
                        style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 6px', fontSize: '0.8rem', background: 'var(--bg-surface)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                      />
                    </td>
                    <td style={{ padding: '4px 6px' }}>
                      <input
                        value={row.itemId ?? ''}
                        onChange={e => updateTableRow(i, 'itemId', e.target.value)}
                        placeholder="PROJ-101"
                        style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 6px', fontSize: '0.8rem', background: 'var(--bg-surface)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                      />
                    </td>
                    <td style={{ padding: '4px 2px', textAlign: 'center' }}>
                      <button
                        onClick={() => removeTableRow(i)}
                        style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: '2px 4px' }}
                        title={isTR ? 'Satırı sil' : 'Remove row'}
                      >×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={addTableRow}
              disabled={tableRows.length >= 50}
              style={{ fontSize: '0.82rem' }}
            >
              {t('bulk_table_add_row')}
            </button>
            {tableRows.length >= 50 && (
              <span className="criterion-desc" style={{ fontSize: '0.78rem' }}>{t('bulk_table_max')}</span>
            )}
            {(() => {
              const validCount = tableRows.filter(r => r.title.trim()).length;
              return validCount > 0 ? (
                <span className="criterion-desc" style={{ fontSize: '0.78rem' }}>
                  {t('bulk_table_valid_rows').replace('{count}', String(validCount))}
                </span>
              ) : null;
            })()}
            <div style={{ flex: 1 }} />
            {processing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className="criterion-desc" style={{ fontSize: '0.8rem' }}>{t('bulk_analyzing')} {progress} / {tableRows.filter(r => r.title.trim()).length}</span>
                <div className="progress-track" style={{ width: 120, height: '6px', display: 'block', marginLeft: 0 }}>
                  <div className="progress-fill" style={{ width: `${(progress / tableRows.filter(r => r.title.trim()).length) * 100}%` }} />
                </div>
              </div>
            ) : (
              <button
                className="primary"
                disabled={!tableRows.some(r => r.title.trim())}
                onClick={() => {
                  const valid = tableRows.filter(r => r.title.trim()).map(r => ({
                    ...r,
                    title: r.title.trim(),
                    description: r.description?.trim() || undefined,
                    sprintId: r.sprintId?.trim() || undefined,
                    itemId: r.itemId?.trim() || undefined,
                  }));
                  handleProcess(valid);
                }}
              >
                {t('bulk_table_start')}
              </button>
            )}
          </div>
          {error && <div className="error" style={{ marginTop: '0.75rem' }}>{error}</div>}
        </div>
      )}

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
              <button onClick={() => handleProcess()} className="primary">
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

          {/* Başarısız satır uyarısı */}
          {(() => {
            const failedCount = results.filter(r => r.error).length;
            if (!failedCount) return null;
            return (
              <div className="error" style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>⚠</span>
                <span>{t('bulk_failed_banner').replace('{count}', String(failedCount))}</span>
              </div>
            );
          })()}

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
