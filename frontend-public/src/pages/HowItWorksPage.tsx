import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../contexts/LangContext';

/* ══════════════════════════════════════════════
   HOOKS
══════════════════════════════════════════════ */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, inView };
}

function useTypewriter(text: string, trigger: boolean, speed = 28) {
  const [out, setOut] = useState('');
  useEffect(() => {
    if (!trigger) { setOut(''); return; }
    let i = 0;
    const id = setInterval(() => { i++; setOut(text.slice(0, i)); if (i >= text.length) clearInterval(id); }, speed);
    return () => clearInterval(id);
  }, [trigger, text]);
  return out;
}

function useCountUp(target: number, trigger: boolean, delay = 0) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    const t = setTimeout(() => {
      const start = Date.now();
      const tick = () => {
        const p = Math.min((Date.now() - start) / 1000, 1);
        setVal(Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(t);
  }, [trigger, target, delay]);
  return val;
}

/* ══════════════════════════════════════════════
   SHARED UI
══════════════════════════════════════════════ */
function MockBrowser({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,.09)' }}>
      <div style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--border)', padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {['#E06060','#E8B462','#4CAF85'].map((c,i) => <div key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />)}
        </div>
        <div style={{ flex: 1, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 4, padding: '3px 10px', fontSize: 10.5, color: 'var(--text-secondary)', textAlign: 'center', fontFamily: 'monospace' }}>{url}</div>
      </div>
      <div style={{ padding: '18px 20px' }}>{children}</div>
    </div>
  );
}


function Section({ reverse, label, title, desc, features, browser }: {
  reverse?: boolean; label: string; title: string; desc: string;
  features: string[]; browser: React.ReactNode;
}) {
  const { ref, inView } = useInView();
  return (
    <div ref={ref} style={{
      maxWidth: 1100, margin: '0 auto', padding: '72px 2rem',
      display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: 52,
      alignItems: 'start',
      direction: reverse ? 'rtl' : 'ltr',
      opacity: inView ? 1 : 0,
      transform: inView ? 'none' : 'translateY(28px)',
      transition: 'opacity .65s, transform .65s',
    }}>
      <div style={{ direction: 'ltr' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--accent-text)', marginBottom: 10 }}>{label}</div>
        <h3 style={{ fontSize: 'clamp(20px,2.5vw,28px)', fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.15, marginBottom: 14 }}>{title}</h3>
        <p style={{ fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 22, maxWidth: 420 }}>{desc}</p>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
          {features.map((f, i) => (
            <li key={i} style={{ display: 'flex', gap: 9, fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--green)', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
              <span dangerouslySetInnerHTML={{ __html: f }} />
            </li>
          ))}
        </ul>
      </div>
      <div style={{ direction: 'ltr' }}>{browser}</div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   DEMO 1 — Estimation (real SPEE UI: select + scale buttons + result card)
══════════════════════════════════════════════ */
function EstimationDemo({ isTR }: { isTR: boolean }) {
  const { ref, inView } = useInView(0.2);
  const [phase, setPhase] = useState(0);
  const [activeScale, setActiveScale] = useState([0, 0, 0, 0]);

  const CRITERIA = isTR
    ? [
        { key: 'Teknik Karmaşıklık', desc: 'Mimari etki ve kod karmaşıklığı', active: 4 },
        { key: 'Kapsam Netliği',     desc: 'Gereksinimlerin ne kadar belirli olduğu', active: 2 },
        { key: 'Test Yükü',          desc: 'Test senaryosu sayısı ve zorluğu', active: 3 },
        { key: 'Alan Bilgisi',       desc: 'Ekibin bu alandaki deneyimi', active: 3 },
      ]
    : [
        { key: 'Technical Complexity', desc: 'Architectural impact and code complexity', active: 4 },
        { key: 'Scope Clarity',        desc: 'How well-defined the requirements are', active: 2 },
        { key: 'Test Load',            desc: 'Number and complexity of test scenarios', active: 3 },
        { key: 'Domain Knowledge',     desc: 'Team experience in this area', active: 3 },
      ];

  const sp = useCountUp(8, phase >= 3, 0);
  const confidence = useCountUp(78, phase >= 3, 200);

  useEffect(() => {
    if (!inView) return;
    const ts = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 700),
      setTimeout(() => setPhase(3), 2000),
    ];
    return () => ts.forEach(clearTimeout);
  }, [inView]);

  useEffect(() => {
    if (phase < 2) return;
    CRITERIA.forEach((c, i) => {
      setTimeout(() => setActiveScale(prev => { const n = [...prev]; n[i] = c.active; return n; }), i * 260);
    });
  }, [phase]);

  return (
    <MockBrowser url="spee.app/estimate">
      <div ref={ref}>
        {/* Task type select */}
        <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4, opacity: phase >= 1 ? 1 : 0, transition: 'opacity .3s' }}>
          {isTR ? 'Görev Tipi' : 'Task Type'}
        </label>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px',
          background: 'var(--bg-surface)', fontSize: 13, fontWeight: 500, marginBottom: 14,
          opacity: phase >= 1 ? 1 : 0, transition: 'opacity .3s',
        }}>
          <span>📋 {isTR ? 'User Story' : 'User Story'}</span>
          <span style={{ color: 'var(--text-secondary)', fontSize: 9 }}>▼</span>
        </div>

        {/* Criteria rows */}
        <div style={{ opacity: phase >= 2 ? 1 : 0, transition: 'opacity .4s', marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>{isTR ? 'Kriterler' : 'Criteria'}</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontFamily: 'monospace', fontSize: 10 }}>4/12</span>
          </div>
          {CRITERIA.map((c, ci) => (
            <div key={ci} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              borderBottom: ci < CRITERIA.length - 1 ? '1px solid var(--border)' : 'none',
              padding: '8px 4px',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.key}</div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 1 }}>{c.desc}</div>
              </div>
              <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                {[1,2,3,4,5].map(v => (
                  <div key={v} style={{
                    width: 24, height: 24, borderRadius: '50%',
                    border: `1.5px solid ${activeScale[ci] === v ? 'transparent' : 'var(--border)'}`,
                    background: activeScale[ci] === v ? 'var(--accent)' : 'var(--bg-base)',
                    color: activeScale[ci] === v ? '#fff' : 'var(--text-secondary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10.5, fontWeight: activeScale[ci] === v ? 700 : 400,
                    transition: 'all .3s',
                  }}>{v}</div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Result card */}
        {phase >= 3 && (
          <div style={{ padding: '12px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
              <div style={{ width: 54, height: 54, borderRadius: 8, background: 'var(--accent-dim)', border: '2px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>{sp}</span>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.85 }}>
                <div><strong style={{ color: 'var(--text-primary)' }}>{isTR ? 'Önerilen:' : 'Suggested:'}</strong> {sp} SP</div>
                <div><strong style={{ color: 'var(--text-primary)' }}>{isTR ? 'Teknik:' : 'Technique:'}</strong> Fibonacci</div>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>{isTR ? 'Güven:' : 'Confidence:'}</strong>{' '}
                  <span style={{ color: 'var(--green)', fontWeight: 700 }}>%{confidence}</span>
                </div>
              </div>
            </div>
            <div style={{ height: 5, background: 'var(--bg-base)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'var(--green)', width: `${confidence}%`, borderRadius: 3, transition: 'width 1.2s' }} />
            </div>
          </div>
        )}
      </div>
    </MockBrowser>
  );
}

/* ══════════════════════════════════════════════
   DEMO 2 — Text Analysis (real SPEE autofill panel UI)
══════════════════════════════════════════════ */
function TextAnalysisDemo({ isTR }: { isTR: boolean }) {
  const { ref, inView } = useInView(0.2);
  const [phase, setPhase] = useState(0);
  const [activeScale, setActiveScale] = useState([0, 0, 0, 0]);

  const titleTR = 'Google OAuth2 entegrasyonu, 2FA ve session yönetimi';
  const titleEN = 'Google OAuth2 integration, 2FA and session management';
  const titleText = isTR ? titleTR : titleEN;
  const typed = useTypewriter(titleText, phase >= 2, 34);

  const CRITERIA = isTR
    ? [
        { key: 'Teknik Karmaşıklık', active: 4, source: 'AI'   },
        { key: 'Bağımlılık Sayısı',  active: 3, source: 'AI'   },
        { key: 'Test Yükü',          active: 4, source: 'auto' },
        { key: 'Alan Bilgisi',       active: 3, source: 'auto' },
      ]
    : [
        { key: 'Technical Complexity', active: 4, source: 'AI'   },
        { key: 'Dependency Count',     active: 3, source: 'AI'   },
        { key: 'Test Load',            active: 4, source: 'auto' },
        { key: 'Domain Knowledge',     active: 3, source: 'auto' },
      ];

  useEffect(() => {
    if (!inView) return;
    const typeDur = titleText.length * 34 + 400;
    const ts = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 600),
      setTimeout(() => setPhase(3), 600 + typeDur),
      setTimeout(() => setPhase(4), 600 + typeDur + 1000),
    ];
    return () => ts.forEach(clearTimeout);
  }, [inView, titleText]);

  useEffect(() => {
    if (phase < 4) return;
    CRITERIA.forEach((c, i) => {
      setTimeout(() => setActiveScale(prev => { const n = [...prev]; n[i] = c.active; return n; }), i * 200);
    });
  }, [phase]);

  return (
    <MockBrowser url="spee.app/estimate">
      <div ref={ref}>
        {/* Collapsible panel button */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px',
          borderRadius: 6, background: 'var(--bg-surface)', border: '1px solid var(--border)',
          fontSize: 12, fontWeight: 600, marginBottom: phase >= 1 ? 8 : 0, cursor: 'pointer',
        }}>
          <span style={{ fontSize: 8, color: 'var(--text-secondary)' }}>{phase >= 1 ? '▲' : '▼'}</span>
          {isTR ? 'PBI Metinden Otomatik Doldur' : 'Auto-fill from PBI Text'}
          {phase >= 4 && (
            <span style={{ fontSize: 9.5, background: 'var(--accent-dim)', color: 'var(--accent-text)', fontWeight: 700, padding: '1px 6px', borderRadius: 4, marginLeft: 4 }}>
              · 4 {isTR ? 'kriter dolduruldu' : 'criteria filled'}
            </span>
          )}
        </div>

        {/* Panel body */}
        {phase >= 1 && (
          <div style={{ marginBottom: 12, padding: '10px', background: 'var(--bg-base)', borderRadius: 8, border: '1px solid var(--border)' }}>
            <input
              readOnly value={typed}
              placeholder={isTR ? 'PBI başlığı...' : 'PBI title...'}
              style={{ width: '100%', boxSizing: 'border-box', border: '1px solid var(--border)', borderRadius: 5, padding: '6px 10px', fontSize: 11.5, background: 'var(--bg-surface)', color: 'var(--text-primary)', fontFamily: 'inherit', marginBottom: 6 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, height: 30, border: '1px solid var(--border)', borderRadius: 5, background: 'var(--bg-surface)', fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', padding: '0 10px' }}>
                {phase >= 2 ? (isTR ? 'Güvenlik kısıtları var...' : 'Security constraints apply...') : ''}
              </div>
              <button style={{ padding: '0 14px', borderRadius: 5, border: 'none', background: phase === 3 ? 'var(--bg-elevated)' : 'var(--accent)', color: phase === 3 ? 'var(--text-secondary)' : '#fff', fontWeight: 700, fontSize: 11.5, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                {phase === 3 && <span style={{ width: 10, height: 10, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'hiw-spin .7s linear infinite', display: 'inline-block' }} />}
                {phase === 3 ? (isTR ? 'Analiz...' : 'Analysing...') : (isTR ? 'Analiz Et' : 'Analyse')}
              </button>
            </div>
          </div>
        )}

        {/* Criteria with AI/auto badge */}
        {phase >= 4 && (
          <>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>{isTR ? 'Kriterler' : 'Criteria'}</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontFamily: 'monospace', fontSize: 10 }}>4/12</span>
            </div>
            {CRITERIA.map((c, ci) => (
              <div key={ci} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                borderBottom: ci < CRITERIA.length - 1 ? '1px solid var(--border)' : 'none',
                padding: '7px 4px',
                opacity: phase >= 4 ? 1 : 0,
                transition: `opacity .3s ${ci * 100}ms`,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                    {c.key}
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: c.source === 'AI' ? 'rgba(5,150,105,0.15)' : 'var(--accent-dim)', color: c.source === 'AI' ? 'var(--green)' : 'var(--accent-text)' }}>
                      {c.source}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                  {[1,2,3,4,5].map(v => (
                    <div key={v} style={{
                      width: 22, height: 22, borderRadius: '50%',
                      border: `1.5px solid ${activeScale[ci] === v ? 'transparent' : 'var(--border)'}`,
                      background: activeScale[ci] === v ? 'var(--accent)' : 'var(--bg-base)',
                      color: activeScale[ci] === v ? '#fff' : 'var(--text-secondary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: activeScale[ci] === v ? 700 : 400,
                      transition: 'all .3s',
                    }}>{v}</div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </MockBrowser>
  );
}

/* ══════════════════════════════════════════════
   DEMO 3 — Bulk Estimation (real table: title | type | SP | confidence)
══════════════════════════════════════════════ */
function BulkDemo({ isTR }: { isTR: boolean }) {
  const { ref, inView } = useInView(0.2);
  const [shown, setShown] = useState(0);

  const ROWS = isTR ? [
    { task: 'Google OAuth2 entegrasyonu', type: 'User Story', sp: 8,  conf: 85 },
    { task: 'Login hatası düzeltme',      type: 'Bug',        sp: 3,  conf: 92 },
    { task: 'CI/CD pipeline güncelleme',  type: 'DevOps',     sp: 5,  conf: 71 },
    { task: 'Kullanıcı araştırması',      type: 'Analysis',   sp: 5,  conf: 68 },
    { task: 'Ödeme akışı performansı',    type: 'User Story', sp: 13, conf: 79 },
  ] : [
    { task: 'Google OAuth2 integration',  type: 'User Story', sp: 8,  conf: 85 },
    { task: 'Fix login bug',              type: 'Bug',        sp: 3,  conf: 92 },
    { task: 'Update CI/CD pipeline',      type: 'DevOps',     sp: 5,  conf: 71 },
    { task: 'User research session',      type: 'Analysis',   sp: 5,  conf: 68 },
    { task: 'Payment flow performance',   type: 'User Story', sp: 13, conf: 79 },
  ];

  useEffect(() => {
    if (!inView) return;
    ROWS.forEach((_, i) => setTimeout(() => setShown(i + 1), 400 + i * 400));
  }, [inView]);

  const pct = Math.round((shown / ROWS.length) * 100);

  return (
    <MockBrowser url="spee.app/bulk">
      <div ref={ref}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
            {isTR ? 'Excel Yüklendi' : 'Excel Loaded'}
          </span>
          <span style={{ fontSize: 10.5, background: 'var(--accent-dim)', color: 'var(--accent-text)', fontWeight: 700, padding: '2px 8px', borderRadius: 5 }}>
            backlog_q3.xlsx · {ROWS.length} PBI
          </span>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--text-secondary)', marginBottom: 4 }}>
            <span>{isTR ? 'Toplu analiz çalışıyor' : 'Running batch analysis'}</span>
            <span style={{ fontFamily: 'monospace' }}>{pct}%</span>
          </div>
          <div style={{ height: 5, background: 'var(--bg-base)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: pct === 100 ? 'var(--green)' : 'var(--accent)', borderRadius: 4, width: `${pct}%`, transition: 'width .4s, background .4s' }} />
          </div>
        </div>

        <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: 'var(--bg-base)' }}>
                {[isTR?'Başlık':'Title', isTR?'Tip':'Type', 'SP', isTR?'Güven':'Conf.'].map((h, i) => (
                  <th key={i} style={{ padding: '6px 8px', textAlign: 'left', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r, i) => (
                <tr key={i} style={{
                  borderBottom: i < ROWS.length - 1 ? '1px solid var(--border)' : 'none',
                  opacity: i < shown ? 1 : 0,
                  transform: i < shown ? 'none' : 'translateY(6px)',
                  transition: 'opacity .3s, transform .3s',
                }}>
                  <td style={{ padding: '7px 8px', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11.5 }}>{r.task}</td>
                  <td style={{ padding: '7px 8px' }}>
                    <span style={{ fontSize: 9.5, fontWeight: 700, background: 'var(--accent-dim)', color: 'var(--accent-text)', padding: '2px 5px', borderRadius: 4 }}>{r.type}</span>
                  </td>
                  <td style={{ padding: '7px 8px', fontWeight: 800, color: 'var(--accent)', fontFamily: 'monospace', fontSize: 13 }}>{r.sp}</td>
                  <td style={{ padding: '7px 8px', fontWeight: 600, color: r.conf >= 80 ? 'var(--green)' : 'var(--accent-text)', fontSize: 11 }}>%{r.conf}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {shown >= ROWS.length && (
          <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(5,150,105,0.1)', border: '1px solid var(--green)', borderRadius: 8, fontSize: 12, color: 'var(--green)', fontWeight: 700 }}>
            ✓ {isTR ? `${ROWS.length} PBI analiz edildi — Excel indir` : `${ROWS.length} PBIs analysed — Download Excel`}
          </div>
        )}
      </div>
    </MockBrowser>
  );
}

/* ══════════════════════════════════════════════
   DEMO 4 — Calibration (real SPEE table: issue | sprint | type | engine | approved | diff)
══════════════════════════════════════════════ */
function CalibrationDemo({ isTR }: { isTR: boolean }) {
  const { ref, inView } = useInView(0.2);
  const [phase, setPhase] = useState(0);
  const [shownRows, setShownRows] = useState(0);

  const ROWS = [
    { id: 'PROJ-101', sprint: 'Sprint-40', type: isTR ? 'User Story' : 'User Story', engine: 8,  approved: 13, diff: +5 },
    { id: 'PROJ-102', sprint: 'Sprint-40', type: isTR ? 'Bug' : 'Bug',               engine: 3,  approved: 3,  diff: 0  },
    { id: 'PROJ-103', sprint: 'Sprint-41', type: isTR ? 'User Story' : 'User Story', engine: 13, approved: 8,  diff: -5 },
    { id: 'PROJ-104', sprint: 'Sprint-41', type: isTR ? 'DevOps' : 'DevOps',         engine: 5,  approved: 5,  diff: 0  },
    { id: 'PROJ-105', sprint: 'Sprint-42', type: isTR ? 'User Story' : 'User Story', engine: 8,  approved: 8,  diff: 0  },
  ];

  useEffect(() => {
    if (!inView) return;
    const ts = [
      setTimeout(() => setPhase(1), 300),
      ...ROWS.map((_, i) => setTimeout(() => setShownRows(i + 1), 900 + i * 350)),
    ];
    return () => ts.forEach(clearTimeout);
  }, [inView]);

  return (
    <MockBrowser url="spee.app/calibration">
      <div ref={ref}>
        {/* Sprint filter + button */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'flex-end', opacity: phase >= 1 ? 1 : 0, transition: 'opacity .3s' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 3 }}>{isTR ? 'Sprint Filtresi' : 'Sprint Filter'}</div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 5, padding: '6px 10px', fontSize: 11, background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
              Sprint-40, Sprint-41, Sprint-42
            </div>
          </div>
          <div style={{ padding: '7px 14px', background: 'var(--accent)', borderRadius: 5, fontSize: 11.5, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {isTR ? 'Analiz Et' : 'Analyse'}
          </div>
        </div>

        {/* Drift summary */}
        {shownRows >= ROWS.length && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 10, padding: '8px 10px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 10.5, flexWrap: 'wrap' }}>
            <div><strong>{isTR ? 'Ort. Hata:' : 'Avg Error:'}</strong> <span style={{ color: 'var(--accent-text)', fontWeight: 700 }}>%22</span></div>
            <div><strong>{isTR ? 'Yön:' : 'Direction:'}</strong> <span style={{ background: 'rgba(245,158,11,0.15)', color: '#d97706', fontWeight: 700, padding: '1px 5px', borderRadius: 3, fontSize: 9.5 }}>{isTR ? 'Düşük Tahmin' : 'Under-estimate'}</span></div>
            <div><strong>{isTR ? 'Durum:' : 'Status:'}</strong> <span style={{ background: 'rgba(245,158,11,0.15)', color: '#d97706', fontWeight: 700, padding: '1px 5px', borderRadius: 3, fontSize: 9.5 }}>{isTR ? 'Kalibre gerekiyor' : 'Needs calibration'}</span></div>
          </div>
        )}

        {/* Table */}
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: 'var(--bg-base)' }}>
                {['Issue', isTR?'Sprint':'Sprint', isTR?'Tip':'Type', isTR?'Motor':'Engine', isTR?'Onay':'Approved', isTR?'Fark':'Diff'].map((h, i) => (
                  <th key={i} style={{ padding: '6px 7px', textAlign: 'left', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r, i) => (
                <tr key={i} style={{
                  borderBottom: i < ROWS.length - 1 ? '1px solid var(--border)' : 'none',
                  opacity: i < shownRows ? 1 : 0,
                  transform: i < shownRows ? 'none' : 'translateY(6px)',
                  transition: 'opacity .3s, transform .3s',
                }}>
                  <td style={{ padding: '6px 7px', fontWeight: 600, fontSize: 11 }}>{r.id}</td>
                  <td style={{ padding: '6px 7px', color: 'var(--text-secondary)', fontSize: 10 }}>{r.sprint}</td>
                  <td style={{ padding: '6px 7px', fontSize: 10.5 }}>{r.type}</td>
                  <td style={{ padding: '6px 7px', textAlign: 'center', fontSize: 11 }}>{r.engine}</td>
                  <td style={{ padding: '6px 7px', textAlign: 'center', fontWeight: 700, fontSize: 11 }}>{r.approved}</td>
                  <td style={{ padding: '6px 7px', textAlign: 'center', fontWeight: 700, fontSize: 11, color: r.diff > 0 ? '#d97706' : r.diff < 0 ? '#ef4444' : 'var(--green)' }}>
                    {r.diff > 0 ? `+${r.diff}` : r.diff < 0 ? String(r.diff) : '='}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </MockBrowser>
  );
}

/* ══════════════════════════════════════════════
   DEMO 5 — Baselines (real template-baseline-btn grid)
══════════════════════════════════════════════ */
function BaselinesDemo({ isTR }: { isTR: boolean }) {
  const { ref, inView } = useInView(0.2);
  const [shown, setShown] = useState(0);

  const ITEMS = isTR ? [
    { name: 'Basit API Endpoint',    sp: 2,  type: 'User Story', count: 9,  desc: 'Tek CRUD endpoint, az bağımlılık' },
    { name: 'Tam CRUD Özelliği',     sp: 8,  type: 'User Story', count: 9,  desc: 'Frontend + backend, form, testler' },
    { name: 'Büyük Refaktör',        sp: 21, type: 'User Story', count: 10, desc: 'Mimari değişiklik, birden çok modül' },
    { name: 'Basit Hata Düzeltme',   sp: 1,  type: 'Bug',        count: 7,  desc: 'Nedeni belli, izole bir bug fix' },
  ] : [
    { name: 'Simple API Endpoint',   sp: 2,  type: 'User Story', count: 9,  desc: 'Single CRUD, few dependencies' },
    { name: 'Full CRUD Feature',     sp: 8,  type: 'User Story', count: 9,  desc: 'Frontend + backend, forms, tests' },
    { name: 'Major Refactor',        sp: 21, type: 'User Story', count: 10, desc: 'Arch. change, multiple modules' },
    { name: 'Simple Bug Fix',        sp: 1,  type: 'Bug',        count: 7,  desc: 'Known root cause, isolated' },
  ];

  useEffect(() => {
    if (!inView) return;
    ITEMS.forEach((_, i) => setTimeout(() => setShown(i + 1), 200 + i * 300));
  }, [inView]);

  return (
    <MockBrowser url="spee.app/calibration">
      <div ref={ref}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 10 }}>
          {isTR ? 'Baz İşler' : 'Baselines'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {ITEMS.map((item, i) => (
            <div key={i} style={{
              padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8,
              background: 'var(--bg-surface)', cursor: 'pointer',
              opacity: i < shown ? 1 : 0,
              transform: i < shown ? 'none' : 'translateY(10px)',
              transition: 'opacity .35s, transform .35s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <span style={{ background: 'var(--accent)', color: '#fff', fontWeight: 800, fontSize: 13, width: 30, height: 30, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'monospace' }}>
                  {item.sp}
                </span>
                <span style={{ fontWeight: 600, fontSize: 11, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
              </div>
              <div style={{ fontSize: 9.5, color: 'var(--accent-text)', fontWeight: 600 }}>
                {item.type}
                <span style={{ color: 'var(--text-secondary)', marginLeft: 5, fontWeight: 400 }}>· {item.count} {isTR ? 'kriter' : 'criteria'}</span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-secondary)', fontStyle: 'italic', padding: '8px 10px', background: 'var(--bg-base)', borderRadius: 8 }}>
          {isTR ? '↑ Tahmin sırasında benzer baz işler otomatik karşılaştırılır' : '↑ Similar baselines are automatically compared during estimation'}
        </div>
      </div>
    </MockBrowser>
  );
}

/* ══════════════════════════════════════════════
   STEP CARD
══════════════════════════════════════════════ */
function StepCard({ num, icon, title, desc, delay }: { num: string; icon: string; title: string; desc: string; delay: number }) {
  const { ref, inView } = useInView(0.1);
  return (
    <div ref={ref} style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14,
      padding: '26px 22px', position: 'relative', overflow: 'hidden',
      opacity: inView ? 1 : 0,
      transform: inView ? 'none' : 'translateY(22px)',
      transition: `opacity .6s ${delay}s, transform .6s ${delay}s`,
    }}>
      <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--accent-text)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 22, height: 1, background: 'var(--accent)' }} />{num}
      </div>
      <div style={{ fontSize: '1.5rem', marginBottom: 10 }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 7 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{desc}</div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════ */
export default function HowItWorksPage() {
  const navigate = useNavigate();
  const { lang, setLang } = useLang();
  const isTR = lang === 'tr';

  return (
    <>
      <style>{`
        @keyframes hiw-blink { 50% { opacity: 0; } }
        @keyframes hiw-spin  { to  { transform: rotate(360deg); } }
        @keyframes hiw-fade-up { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:none; } }
        .hiw-hero-1 { animation: hiw-fade-up .6s .1s both; }
        .hiw-hero-2 { animation: hiw-fade-up .6s .22s both; }
        .hiw-hero-3 { animation: hiw-fade-up .6s .36s both; }
        .hiw-hero-4 { animation: hiw-fade-up .6s .5s both; }
        .hiw-divider { border: none; border-top: 1px solid var(--border); margin: 0; }
      `}</style>

      <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)' }}>

        {/* NAV */}
        <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--bg-header)', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(12px)', padding: '0 2rem', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 800, fontSize: 15, letterSpacing: '0.06em' }}>
            <svg width="15" height="15" viewBox="0 0 48 46" fill="none"><path fill="var(--accent)" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"/></svg>
            SPEE
          </button>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => setLang(isTR ? 'en' : 'tr')} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', color: 'var(--text-primary)' }}>
              {isTR ? 'EN' : 'TR'}
            </button>
            <button onClick={() => navigate('/estimate')} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 16px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>
              {isTR ? 'Uygulamayı Aç →' : 'Open App →'}
            </button>
          </div>
        </nav>

        {/* HERO */}
        <div style={{ textAlign: 'center', padding: '72px 2rem 56px', maxWidth: 700, margin: '0 auto' }}>
          <div className="hiw-hero-1" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', color: 'var(--accent-text)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 14px', borderRadius: 20, marginBottom: 24 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', animation: 'hiw-blink 1.8s ease-in-out infinite' }} />
            {isTR ? 'Ürün Turu' : 'Product Tour'}
          </div>
          <h1 className="hiw-hero-2" style={{ fontSize: 'clamp(30px,5vw,50px)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 18 }}>
            {isTR ? <>SPEE'nin yapabildiği <span style={{ color: 'var(--accent-text)' }}>her şeyi</span> gör</> : <>See <span style={{ color: 'var(--accent-text)' }}>everything</span> SPEE can do</>}
          </h1>
          <p className="hiw-hero-3" style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 32 }}>
            {isTR
              ? 'Tekli tahmin, metin analizi, toplu backlog işleme, kalibrasyon ve baz işler — tüm modülleri canlı örneklerle keşfet.'
              : 'Single estimation, text analysis, bulk backlog processing, calibration and baselines — explore every module with live examples.'}
          </p>
          <div className="hiw-hero-4" style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/estimate')} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 28px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              {isTR ? '⚡ Hemen Dene' : '⚡ Try It Now'}
            </button>
            <button onClick={() => navigate('/')} style={{ background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 10, padding: '11px 22px', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: 'var(--text-primary)' }}>
              {isTR ? '← Ana Sayfa' : '← Home'}
            </button>
          </div>
        </div>

        <hr className="hiw-divider" />

        {/* STEP CARDS */}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14 }}>
            {[
              { num:'01', icon:'📋', tTR:'Görev Tipi',       tEN:'Task Type',       dTR:'8 farklı tip, her birinde ayrı kriter seti',   dEN:'8 task types, each with unique criteria', delay:0 },
              { num:'02', icon:'⚖️', tTR:'Kriter Skoru',     tEN:'Criteria Score',  dTR:'Her boyut 1–5 arası puanlanır ve ağırlıklanır',dEN:'Each dimension scored 1–5 and weighted',   delay:.08 },
              { num:'03', icon:'🤖', tTR:'Metin Analizi',    tEN:'Text Analysis',   dTR:'Açıklamadan otomatik kriter tespiti',          dEN:'Auto-detect criteria from description',    delay:.16 },
              { num:'04', icon:'📊', tTR:'Toplu Tahmin',     tEN:'Bulk Estimation', dTR:'Excel\'den tüm backlog için SP önerisi',       dEN:'SP suggestions for entire backlog from Excel',delay:.24 },
              { num:'05', icon:'🎯', tTR:'Kalibrasyon',      tEN:'Calibration',     dTR:'Gerçek SP\'lerden öğrenir, her sprintte iyileşir',dEN:'Learns from actual SPs, improves each sprint',delay:.32 },
            ].map(s => (
              <StepCard key={s.num} num={s.num} icon={s.icon}
                title={isTR ? s.tTR : s.tEN}
                desc={isTR ? s.dTR : s.dEN}
                delay={s.delay}
              />
            ))}
          </div>
        </div>

        <hr className="hiw-divider" />

        {/* ── 1. Tahmin ── */}
        <Section
          label={isTR ? 'Modül 01 — Tekli Tahmin' : 'Module 01 — Single Estimation'}
          title={isTR ? 'Görevi tanımla, kriterleri puan, SP al' : 'Define task, score criteria, get SP'}
          desc={isTR
            ? 'Görev tipini seçince motor o tipe özel kriter setini yükler. Her kriter 1–5 arası puanlanır, ağırlıklı ortalama Fibonacci skalasına eşlenir. Deterministik, açıklanabilir, tekrarlanabilir.'
            : 'Selecting the task type loads the engine\'s criteria set for that type. Each criterion is scored 1–5, the weighted average maps to the Fibonacci scale. Deterministic, explainable, repeatable.'}
          features={isTR ? [
            '<strong>8 görev tipi</strong> — User Story, Bug, Analiz, DevOps, Spike, Performans, Güvenlik, Tasarım',
            '<strong>Her tip farklı kriterler</strong> — Bug\'da "kök neden netliği", DevOps\'ta "prod riski"',
            '<strong>Anlık hesaplama</strong> — her puanlamada tahmin canlı güncellenir',
            '<strong>Fibonacci çıktısı</strong> — 1, 2, 3, 5, 8, 13, 21 skalasında öneri',
          ] : [
            '<strong>8 task types</strong> — User Story, Bug, Analysis, DevOps, Spike, Performance, Security, Design',
            '<strong>Different criteria per type</strong> — "root cause clarity" for Bug, "production risk" for DevOps',
            '<strong>Live calculation</strong> — estimate updates with every score change',
            '<strong>Fibonacci output</strong> — suggestion on 1, 2, 3, 5, 8, 13, 21 scale',
          ]}
          browser={<EstimationDemo isTR={isTR} />}
        />

        <hr className="hiw-divider" />

        {/* ── 2. Text Analysis ── */}
        <Section
          reverse
          label={isTR ? 'Modül 02 — Metin Analizi' : 'Module 02 — Text Analysis'}
          title={isTR ? 'Açıklamadan otomatik kriter tespiti' : 'Auto-detect criteria from description'}
          desc={isTR
            ? 'PBI başlığını ve açıklamasını yapıştır. Motor Türkçe ve İngilizce metni analiz ederek teknik karmaşıklık, bağımlılık ve diğer kriterleri otomatik doldurur. Manuel puanlama gerektirmez.'
            : 'Paste the PBI title and description. The engine analyses Turkish and English text to auto-fill technical complexity, dependencies and other criteria. No manual scoring needed.'}
          features={isTR ? [
            '<strong>Türkçe ve İngilizce</strong> anahtar kelime haritası ile çalışır',
            '<strong>Teknik terimlerden</strong> kriter skoru otomatik çıkar — "OAuth2", "migration", "2FA" gibi',
            '<strong>Güven skoru</strong> — metnin yeterliliğine göre tahmin güveni raporlanır',
            '<strong>Toplu tahminle entegre</strong> — Excel\'deki açıklamalar da aynı motordan geçer',
          ] : [
            '<strong>Turkish and English</strong> keyword map — both languages supported',
            '<strong>Technical terms</strong> auto-translate to criterion scores — "OAuth2", "migration", "2FA" etc.',
            '<strong>Confidence score</strong> — estimate confidence reported based on text richness',
            '<strong>Integrated with bulk</strong> — Excel descriptions pass through the same engine',
          ]}
          browser={<TextAnalysisDemo isTR={isTR} />}
        />

        <hr className="hiw-divider" />

        {/* ── 3. Bulk ── */}
        <Section
          label={isTR ? 'Modül 03 — Toplu Tahmin' : 'Module 03 — Bulk Estimation'}
          title={isTR ? 'Tüm backlog için tek seferde SP' : 'SP for the entire backlog in one go'}
          desc={isTR
            ? 'Excel şablonunu indir, PBI listeni doldur, yükle. Motor her satır için metin analizi ve kriter puanlamasını otomatik çalıştırır. Sprint planlamasını dakikalar içinde tamamla.'
            : 'Download the Excel template, fill in your PBI list, upload. The engine runs text analysis and criterion scoring automatically for each row. Complete sprint planning in minutes.'}
          features={isTR ? [
            '<strong>Excel şablonu</strong> — başlık ve açıklama sütunlarıyla standart format',
            '<strong>Otomatik analiz</strong> — her satır için metin → görev tipi → kriter → SP zinciri',
            '<strong>Satır satır ilerleme</strong> — canlı progress bar ve satır bazlı sonuç',
            '<strong>Excel dışa aktarım</strong> — SP önerileriyle dolu listeyi takımla paylaş',
          ] : [
            '<strong>Excel template</strong> — standard format with title and description columns',
            '<strong>Auto analysis</strong> — per row: text → task type → criteria → SP chain',
            '<strong>Row-by-row progress</strong> — live progress bar and per-row results',
            '<strong>Excel export</strong> — share the SP-filled list with your team',
          ]}
          browser={<BulkDemo isTR={isTR} />}
        />

        <hr className="hiw-divider" />

        {/* ── 4. Calibration ── */}
        <Section
          reverse
          label={isTR ? 'Modül 04 — Kalibrasyon' : 'Module 04 — Calibration'}
          title={isTR ? 'Her sprintle %95\'e yaklaşan isabetlilik' : 'Accuracy approaching 95% with every sprint'}
          desc={isTR
            ? 'Tahmin onaylandıktan sonra gerçek SP\'yi gir. Motor tahmin ile gerçek arasındaki farktan öğrenir ve benzer görevlerde daha isabetli tahmin üretir. Birkaç sprint sonra fark görülür.'
            : 'After an estimate is approved, enter the actual SP. The engine learns from the gap between estimate and actual, and produces more accurate estimates for similar tasks. The difference is noticeable within a few sprints.'}
          features={isTR ? [
            '<strong>Sprint bazlı öğrenme</strong> — her sprint bitiminde tek tıkla kalibre et',
            '<strong>İsabetlilik trendi</strong> — sprint geçmişinde tahmin vs gerçek görselleştirilir',
            '<strong>Takım bazlı</strong> — her takımın kendi kalibrasyon verisi ayrı tutulur',
            '<strong>Baz işlerle entegre</strong> — referans işler kalibrasyonu güçlendirir',
          ] : [
            '<strong>Sprint-based learning</strong> — calibrate with one click at each sprint end',
            '<strong>Accuracy trend</strong> — estimate vs actual visualised in sprint history',
            '<strong>Team-scoped</strong> — each team\'s calibration data kept separate',
            '<strong>Integrated with baselines</strong> — reference items reinforce calibration',
          ]}
          browser={<CalibrationDemo isTR={isTR} />}
        />

        <hr className="hiw-divider" />

        {/* ── 5. Baselines ── */}
        <Section
          label={isTR ? 'Modül 05 — Baz İşler' : 'Module 05 — Baselines'}
          title={isTR ? 'Referans iş kütüphanesi' : 'Reference work library'}
          desc={isTR
            ? 'Ekibin anlaştığı baz iş kalemlerini kaydet. Motor yeni bir tahmin yaparken benzer işlerle karşılaştırarak daha tutarlı çıktı üretir. "Bu iş tam CRUD özelliğine benziyor, o 8 SP\'ydi." mantığı otomatikleşir.'
            : 'Save baseline work items your team has agreed on. The engine compares against similar items when estimating to produce more consistent output. "This task looks like the full CRUD feature, that was 8 SP" logic becomes automatic.'}
          features={isTR ? [
            '<strong>Hazır şablonlar</strong> — Basit API, CRUD, Büyük Refaktör, Altyapı Geçişi ve daha fazlası',
            '<strong>Özelleştirilebilir</strong> — takımın kendi referans işlerini ekle ve düzenle',
            '<strong>Görev tipi bazlı</strong> — her tip için ayrı referans seti',
            '<strong>Motor entegrasyonu</strong> — yeni tahminlerde baz işler otomatik referans alınır',
          ] : [
            '<strong>Ready-made templates</strong> — Simple API, CRUD, Major Refactor, Infrastructure Migration and more',
            '<strong>Customisable</strong> — add and edit your team\'s own reference items',
            '<strong>Per task type</strong> — separate reference set for each type',
            '<strong>Engine integration</strong> — baselines automatically referenced in new estimates',
          ]}
          browser={<BaselinesDemo isTR={isTR} />}
        />

        <hr className="hiw-divider" />

        {/* CTA */}
        <div style={{ textAlign: 'center', padding: '72px 2rem 80px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent-text)', marginBottom: 16 }}>
            {isTR ? 'Hazır mısın?' : 'Ready?'}
          </div>
          <h2 style={{ fontSize: 'clamp(26px,4vw,42px)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 14 }}>
            {isTR ? 'İlk tahminini şimdi yap' : 'Make your first estimate now'}
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 28, maxWidth: 380, margin: '0 auto 28px' }}>
            {isTR ? 'Kayıt yok, kurulum yok. Takımını oluştur ve hemen başla.' : 'No sign-up, no setup. Create your team and get started.'}
          </p>
          <button onClick={() => navigate('/estimate')} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 12, padding: '13px 36px', fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 20px rgba(79,70,229,.3)' }}>
            {isTR ? '⚡ Uygulamayı Aç' : '⚡ Open the App'}
          </button>
        </div>

      </div>
    </>
  );
}
