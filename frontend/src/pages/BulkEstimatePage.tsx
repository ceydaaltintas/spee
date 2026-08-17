import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import api from '../api/client';
import { TASK_TYPE_LABELS } from '../api/labels';

type TaskType = 'USER_STORY' | 'BUG' | 'ANALYSIS' | 'TEST_TASK' | 'DESIGN' | 'DEVOPS' | 'SPIKE' | 'SUB_TASK';


interface BulkRow {
  title: string;
  description?: string;
  taskType?: TaskType;
  sprintId?: string;
}

interface BulkResult {
  title: string;
  taskType: string;
  suggestedSP: number;
  confidenceScore: number;
  autoFilledCount: number;
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
  ['başlık', 'açıklama', 'görev tipi', 'sprint'],
  ['Kullanıcı şifre sıfırlama', 'JWT token ile email üzerinden sıfırlama akışı. Güvenlik kısıtları var.', 'Kullanıcı Hikayesi', 'Sprint-42'],
  ['Login hata mesajı düzeltme', 'Yanlış şifre girildiğinde ekran boş kalıyor', 'Hata', 'Sprint-42'],
  ['Ödeme entegrasyon analizi', 'Stripe ve iyzico karşılaştırması yapılacak', 'Analiz', ''],
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
  ws['!cols'] = [{ wch: 40 }, { wch: 60 }, { wch: 20 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws, 'PBIler');
  const wsNotes = XLSX.utils.aoa_to_sheet(TASK_TYPE_NOTES);
  wsNotes['!cols'] = [{ wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsNotes, 'Görev Tipleri');
  XLSX.writeFile(wb, 'spee_bulk_template.xlsx');
}

function downloadResults(results: BulkResult[]) {
  const rows = [
    ['Başlık', 'Görev Tipi', 'Önerilen SP', 'Güven (%)', 'Oto. Kriter', 'Hata'],
    ...results.map(r => [
      r.title,
      TASK_TYPE_LABELS[r.taskType] ?? r.taskType,
      r.suggestedSP ?? '',
      r.confidenceScore != null ? Math.round(r.confidenceScore * 100) : '',
      r.autoFilledCount ?? 0,
      r.error ?? '',
    ]),
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 40 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Sonuçlar');
  XLSX.writeFile(wb, 'spee_bulk_sonuclar.xlsx');
}

function confidenceColor(score: number) {
  if (score >= 0.7) return '#6ee7b7';
  if (score >= 0.4) return '#fbbf24';
  return '#fca5a5';
}

const BULK_DRAFT_KEY = 'spee_bulk_draft';

function loadDraft() {
  try { return JSON.parse(localStorage.getItem(BULK_DRAFT_KEY) ?? 'null'); } catch { return null; }
}

export default function BulkEstimatePage({ teamId }: { teamId: string }) {
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
            };
          })
          .filter(r => r.title.length > 0);

        if (parsed.length === 0) {
          setError('Dosyada geçerli satır bulunamadı. "title" sütunu zorunlu.');
          return;
        }
        if (parsed.length > 50) {
          setError('Maksimum 50 satır destekleniyor.');
          return;
        }
        setRows(parsed);
        saveDraft({ rows: parsed, results: [], fileName: file.name });
      } catch {
        setError('Dosya okunamadı. Lütfen geçerli bir .xlsx veya .csv dosyası yükleyin.');
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
        // 1. Metin analizi
        const analyzeRes = await api.post('/analyze-text', {
          title: row.title,
          description: row.description,
        });
        const { suggestedCriteria, detectedTaskType } = analyzeRes.data;
        const taskType = row.taskType ?? detectedTaskType ?? 'USER_STORY';

        // 2. Tahmin
        const estimateRes = await api.post('/estimate', {
          sourceSystem: 'JIRA',
          sourceId: `bulk-${Date.now()}-${i}`,
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
        });
      } catch (e: any) {
        const status = e.response?.status;
        const msg = status === 429
          ? 'AI kota sınırına ulaşıldı, lütfen 1 dakika bekleyip tekrar deneyin'
          : e.response?.data?.error ?? e.message;
        out.push({
          title: row.title,
          taskType: row.taskType ?? 'USER_STORY',
          suggestedSP: 0,
          confidenceScore: 0,
          autoFilledCount: 0,
          error: msg,
        });
      }

      setProgress(i + 1);
      // Groq rate limit için küçük bekleme
      if (i < rows.length - 1) await new Promise(r => setTimeout(r, 2000));
    }

    setResults(out);
    setProcessing(false);
    saveDraft({ results: out });
  }

  return (
    <div>
      <h2>Toplu Tahmin</h2>
      <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
        Excel dosyasından PBI listesi yükle, her biri için metin analizi + tahmin çalıştır.
      </p>

      {/* Adım 1: Dosya */}
      <div className="panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.75rem' }}>
          1. Excel Dosyası Yükle
        </div>
        <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.75rem' }}>
          Zorunlu: <code style={{ background: '#0f172a', padding: '1px 5px', borderRadius: '3px' }}>başlık</code>
          &nbsp; Opsiyonel: <code style={{ background: '#0f172a', padding: '1px 5px', borderRadius: '3px' }}>açıklama</code>
          <code style={{ background: '#0f172a', padding: '1px 5px', borderRadius: '3px', marginLeft: '4px' }}>görev tipi</code>
          <code style={{ background: '#0f172a', padding: '1px 5px', borderRadius: '3px', marginLeft: '4px' }}>sprint</code>
          <span style={{ marginLeft: '6px' }}>· sprint serbest metin (ör. Sprint-42) · Bilinmeyen görev tipleri Kullanıcı Hikayesi olarak işlenir · Maks. 50 satır</span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => fileRef.current?.click()} className="primary">
            Dosya Seç
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleFile} />
          <button onClick={downloadTemplate} style={{ color: '#38bdf8' }}>
            Şablon İndir
          </button>
          {fileName && (
            <span style={{ fontSize: '0.8rem', color: '#6ee7b7' }}>✓ {fileName} ({rows.length} satır)</span>
          )}
        </div>
        {error && <div className="error" style={{ marginTop: '0.75rem' }}>{error}</div>}
      </div>

      {/* Önizleme */}
      {rows.length > 0 && !results.length && (
        <div className="panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.75rem' }}>
            2. Önizleme — {rows.length} PBI
          </div>
          <table>
            <thead>
              <tr>
                <th>Başlık</th>
                <th>Açıklama</th>
                <th>Görev Tipi</th>
                <th>Sprint</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{r.title}</td>
                  <td style={{ color: '#64748b', fontSize: '0.8rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.description ?? '—'}
                  </td>
                  <td>
                    {r.taskType
                      ? <span style={{ color: '#38bdf8', fontSize: '0.8rem' }}>{TASK_TYPE_LABELS[r.taskType] ?? r.taskType}</span>
                      : <span style={{ color: '#475569', fontSize: '0.8rem' }}>otomatik</span>}
                  </td>
                  <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{r.sprintId ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: '1rem' }}>
            {processing ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>
                  <span>Analiz ediliyor...</span>
                  <span>{progress} / {rows.length}</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: '#1e293b', borderRadius: '3px' }}>
                  <div style={{ width: `${(progress / rows.length) * 100}%`, height: '100%', background: '#38bdf8', borderRadius: '3px', transition: 'width 0.3s' }} />
                </div>
              </div>
            ) : (
              <button onClick={handleProcess} className="primary">
                Tahminleri Başlat
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
              Sonuçlar — {results.length} tahmin
            </div>
            <button onClick={() => downloadResults(results)} style={{ color: '#38bdf8', fontSize: '0.8rem' }}>
              Excel'e Aktar
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
                  <div className="stat-card"><div className="stat-label">Toplam SP</div><div className="stat-value">{totalSP}</div></div>
                  <div className="stat-card"><div className="stat-label">Ort. SP</div><div className="stat-value">{avgSP}</div></div>
                  <div className="stat-card"><div className="stat-label">Ort. Güven</div><div style={{ fontWeight: 700, fontSize: '1.1rem', color: confidenceColor(avgConf) }}>%{Math.round(avgConf * 100)}</div></div>
                </>
              );
            })()}
          </div>

          <table>
            <thead>
              <tr>
                <th>Başlık</th>
                <th>Görev Tipi</th>
                <th style={{ textAlign: 'center' }}>SP</th>
                <th style={{ textAlign: 'center' }}>Güven</th>
                <th style={{ textAlign: 'center' }}>Kriter</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{r.title}</td>
                  <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{TASK_TYPE_LABELS[r.taskType] ?? r.taskType}</td>
                  <td style={{ textAlign: 'center' }}>
                    {r.error
                      ? <span style={{ color: '#fca5a5', fontSize: '0.78rem' }}>hata</span>
                      : <strong style={{ color: '#38bdf8', fontSize: '1rem' }}>{r.suggestedSP}</strong>}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {!r.error && (
                      <span style={{ color: confidenceColor(r.confidenceScore), fontWeight: 600, fontSize: '0.85rem' }}>
                        %{Math.round(r.confidenceScore * 100)}
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
                    {r.error
                      ? <span style={{ color: '#fca5a5' }} title={r.error}>!</span>
                      : r.autoFilledCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => { setRows([]); setResults([]); setFileName(''); localStorage.removeItem(BULK_DRAFT_KEY); if (fileRef.current) fileRef.current.value = ''; }}>
              Temizle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
