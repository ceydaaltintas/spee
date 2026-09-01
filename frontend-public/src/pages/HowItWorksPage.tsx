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

function AnimBar({ label, val, pct, trigger, delay = 0, color = 'var(--accent)' }: {
  label: string; val: string; pct: number; trigger: boolean; delay?: number; color?: string;
}) {
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    const t = setTimeout(() => setW(pct), delay);
    return () => clearTimeout(t);
  }, [trigger, pct, delay]);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 3 }}>
        <span>{label}</span><span style={{ fontWeight: 600 }}>{val}</span>
      </div>
      <div style={{ height: 6, background: 'var(--bg-base)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 4, background: color, width: `${w}%`, transition: 'width .85s cubic-bezier(.22,1,.36,1)' }} />
      </div>
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
   DEMO 1 — Estimation (criteria → SP)
══════════════════════════════════════════════ */
function EstimationDemo({ isTR }: { isTR: boolean }) {
  const { ref, inView } = useInView(0.2);
  const [phase, setPhase] = useState(0);
  const sp = useCountUp(8, phase >= 3, 0);

  useEffect(() => {
    if (!inView) return;
    const ts = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 900),
      setTimeout(() => setPhase(3), 1600),
    ];
    return () => ts.forEach(clearTimeout);
  }, [inView]);

  const TYPES = [
    { k: 'USER_STORY', i: '📋', l: isTR ? 'User Story' : 'User Story', sel: true },
    { k: 'BUG',        i: '🐛', l: isTR ? 'Hata Düzeltme' : 'Bug Fix', sel: false },
    { k: 'DEVOPS',     i: '⚙️', l: 'DevOps', sel: false },
  ];

  const CRITERIA = isTR
    ? [['Teknik Karmaşıklık','4/5',80],['Kapsam Netliği','2/5',40],['Test Yükü','3/5',60],['Alan Bilgisi','3/5',60]]
    : [['Technical Complexity','4/5',80],['Scope Clarity','2/5',40],['Test Load','3/5',60],['Domain Knowledge','3/5',60]];

  return (
    <MockBrowser url="spee.app/estimate">
      <div ref={ref}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8 }}>
          {isTR ? 'Görev Tipi' : 'Task Type'}
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {TYPES.map((t, i) => (
            <div key={t.k} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
              borderRadius: 8,
              border: `1.5px solid ${t.sel ? 'var(--accent)' : 'var(--border)'}`,
              background: t.sel ? 'var(--accent)' : 'var(--bg-surface)',
              color: t.sel ? '#fff' : 'var(--text-primary)',
              fontSize: 12, fontWeight: 600,
              opacity: phase >= 1 ? 1 : 0,
              transform: phase >= 1 ? 'none' : 'translateY(6px)',
              transition: `opacity .3s ${i * 80}ms, transform .3s ${i * 80}ms`,
            }}>
              {t.i} {t.l}
            </div>
          ))}
        </div>

        <div style={{ opacity: phase >= 2 ? 1 : 0, transition: 'opacity .4s' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 10 }}>
            {isTR ? 'Kriterler — User Story' : 'Criteria — User Story'}
          </div>
          {CRITERIA.map(([label, val, pct], i) => (
            <AnimBar key={i} label={label} val={val} pct={pct as number} trigger={phase >= 2} delay={i * 160} />
          ))}
        </div>

        <div style={{
          marginTop: 14, padding: '12px 18px', borderRadius: 10,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: phase >= 3 ? 'var(--accent)' : 'var(--bg-base)',
          transition: 'background .5s',
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: phase >= 3 ? 'rgba(255,255,255,.8)' : 'var(--text-secondary)' }}>
            {isTR ? 'SP Önerisi' : 'SP Suggestion'}
          </span>
          <span style={{ fontSize: 30, fontWeight: 900, color: phase >= 3 ? '#fff' : 'var(--accent)', lineHeight: 1, transition: 'color .5s' }}>
            {phase >= 3 ? sp : '—'}
          </span>
        </div>
      </div>
    </MockBrowser>
  );
}

/* ══════════════════════════════════════════════
   DEMO 2 — Text Analysis (typewriter → auto criteria)
══════════════════════════════════════════════ */
function TextAnalysisDemo({ isTR }: { isTR: boolean }) {
  const { ref, inView } = useInView(0.2);
  const [phase, setPhase] = useState(0);

  const textTR = 'Google OAuth2 entegrasyonu. Session yönetimi ve 2FA desteği. Mevcut auth sistemiyle backward compat zorunlu.';
  const textEN = 'Google OAuth2 integration. Session management and 2FA support. Must maintain backward compat with existing auth.';
  const text = isTR ? textTR : textEN;
  const typed = useTypewriter(text, phase >= 1, 26);
  const sp = useCountUp(8, phase >= 3, 0);

  useEffect(() => {
    if (!inView) return;
    const typeDur = text.length * 26 + 300;
    const ts = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 300 + typeDur),
      setTimeout(() => setPhase(3), 300 + typeDur + 1100),
    ];
    return () => ts.forEach(clearTimeout);
  }, [inView, text]);

  const INFERRED = isTR
    ? [['Teknik Karmaşıklık','4/5',80,'var(--accent)'],['Bağımlılık Sayısı','3/5',60,'var(--accent)'],['Test Yükü','4/5',80,'var(--accent)'],['Alan Bilgisi','3/5',60,'var(--green)']]
    : [['Technical Complexity','4/5',80,'var(--accent)'],['Dependency Count','3/5',60,'var(--accent)'],['Test Load','4/5',80,'var(--accent)'],['Domain Knowledge','3/5',60,'var(--green)']];

  return (
    <MockBrowser url="spee.app/bulk">
      <div ref={ref}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8 }}>
          {isTR ? 'PBI Açıklaması (Türkçe veya İngilizce)' : 'PBI Description (Turkish or English)'}
        </div>
        <div style={{
          background: 'var(--bg-base)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '10px 12px',
          fontSize: 12.5, lineHeight: 1.65, minHeight: 66,
          color: 'var(--text-primary)', fontFamily: 'monospace', marginBottom: 14,
        }}>
          {typed}
          {phase === 1 && (
            <span style={{ display: 'inline-block', width: 2, height: 13, background: 'var(--accent)', verticalAlign: 'middle', marginLeft: 1, animation: 'hiw-blink .7s step-end infinite' }} />
          )}
        </div>

        {phase >= 2 && phase < 3 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
            <div style={{ width: 13, height: 13, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'hiw-spin .7s linear infinite', flexShrink: 0 }} />
            {isTR ? 'Metin analiz ediliyor...' : 'Analysing text...'}
          </div>
        )}

        {phase >= 3 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-text)' }}>
                {isTR ? 'Tespit Edilen Kriterler' : 'Auto-detected Criteria'}
              </div>
              <span style={{ fontSize: 9.5, background: 'var(--accent-dim)', color: 'var(--accent-text)', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>AUTO</span>
            </div>
            {INFERRED.map(([label, val, pct, color], i) => (
              <AnimBar key={i} label={label} val={val} pct={pct as number} color={color} trigger={phase >= 3} delay={i * 140} />
            ))}
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, padding: '9px', background: 'var(--accent)', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{sp}</div>
                <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,.75)', marginTop: 3 }}>Story Points</div>
              </div>
              <div style={{ flex: 1, padding: '9px', background: 'var(--bg-base)', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--green)' }}>82%</div>
                <div style={{ fontSize: 9.5, color: 'var(--text-secondary)', marginTop: 3 }}>{isTR ? 'Güven' : 'Confidence'}</div>
              </div>
            </div>
          </>
        )}
      </div>
    </MockBrowser>
  );
}

/* ══════════════════════════════════════════════
   DEMO 3 — Bulk Estimation (rows appear one by one)
══════════════════════════════════════════════ */
function BulkDemo({ isTR }: { isTR: boolean }) {
  const { ref, inView } = useInView(0.2);
  const [shown, setShown] = useState(0);

  const ROWS = isTR ? [
    { task: 'Google OAuth2 entegrasyonu', type: 'User Story', sp: 8  },
    { task: 'Login hatası düzeltme',      type: 'Bug',        sp: 3  },
    { task: 'CI/CD pipeline güncelleme',  type: 'DevOps',     sp: 5  },
    { task: 'Kullanıcı araştırması',      type: 'Analysis',   sp: 5  },
    { task: 'Ödeme akışı performansı',    type: 'Performance',sp: 13 },
    { task: 'Güvenlik açığı giderme',     type: 'Security',   sp: 8  },
  ] : [
    { task: 'Google OAuth2 integration',  type: 'User Story', sp: 8  },
    { task: 'Fix login bug',              type: 'Bug',        sp: 3  },
    { task: 'Update CI/CD pipeline',      type: 'DevOps',     sp: 5  },
    { task: 'User research session',      type: 'Analysis',   sp: 5  },
    { task: 'Payment flow performance',   type: 'Performance',sp: 13 },
    { task: 'Remediate security vuln',    type: 'Security',   sp: 8  },
  ];

  useEffect(() => {
    if (!inView) return;
    ROWS.forEach((_, i) => setTimeout(() => setShown(i + 1), 300 + i * 380));
  }, [inView]);

  const pct = Math.round((shown / ROWS.length) * 100);

  return (
    <MockBrowser url="spee.app/bulk">
      <div ref={ref}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
            {isTR ? 'Excel Yüklendi' : 'Excel Loaded'}
          </div>
          <span style={{ fontSize: 10.5, background: 'var(--accent-dim)', color: 'var(--accent-text)', fontWeight: 700, padding: '2px 8px', borderRadius: 5 }}>
            backlog_q3.xlsx · {ROWS.length} PBI
          </span>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--text-secondary)', marginBottom: 4 }}>
            <span>{isTR ? 'Toplu analiz çalışıyor' : 'Running batch analysis'}</span>
            <span style={{ fontFamily: 'monospace' }}>{pct}%</span>
          </div>
          <div style={{ height: 5, background: 'var(--bg-base)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: pct === 100 ? 'var(--green)' : 'var(--accent)', borderRadius: 4, width: `${pct}%`, transition: 'width .4s, background .4s' }} />
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {[isTR ? 'Görev' : 'Task', isTR ? 'Tip' : 'Type', 'SP'].map((h, i) => (
                <th key={i} style={{ textAlign: 'left', padding: '4px 8px 7px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 10 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r, i) => (
              <tr key={i} style={{
                borderBottom: i < ROWS.length - 1 ? '1px solid var(--border)' : 'none',
                opacity: i < shown ? 1 : 0,
                transform: i < shown ? 'none' : 'translateY(8px)',
                transition: 'opacity .35s, transform .35s',
              }}>
                <td style={{ padding: '7px 8px', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.task}</td>
                <td style={{ padding: '7px 8px' }}>
                  <span style={{ fontSize: 9.5, fontWeight: 700, background: 'var(--accent-dim)', color: 'var(--accent-text)', padding: '2px 5px', borderRadius: 4 }}>{r.type}</span>
                </td>
                <td style={{ padding: '7px 8px', fontWeight: 900, color: 'var(--accent)', fontFamily: 'monospace', fontSize: 14 }}>{i < shown ? r.sp : '…'}</td>
              </tr>
            ))}
          </tbody>
        </table>

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
   DEMO 4 — Calibration (sprints appear, bars grow)
══════════════════════════════════════════════ */
function CalibrationDemo({ isTR }: { isTR: boolean }) {
  const { ref, inView } = useInView(0.2);
  const [shown, setShown] = useState(0);

  const SPRINTS = [
    { est: 8,  act: 13, acc: 38 },
    { est: 13, act: 13, acc: 62 },
    { est: 5,  act: 8,  acc: 74 },
    { est: 8,  act: 8,  acc: 87 },
    { est: 5,  act: 5,  acc: 95 },
  ];

  useEffect(() => {
    if (!inView) return;
    SPRINTS.forEach((_, i) => setTimeout(() => setShown(i + 1), 200 + i * 520));
  }, [inView]);

  return (
    <MockBrowser url="spee.app/calibration">
      <div ref={ref}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 14 }}>
          {isTR ? 'Kalibrasyon Geçmişi' : 'Calibration History'}
        </div>
        {SPRINTS.map((s, i) => {
          const vis = i < shown;
          const good = s.acc >= 85;
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', borderRadius: 8, marginBottom: 4,
              background: vis && good ? 'rgba(5,150,105,0.08)' : 'transparent',
              opacity: vis ? 1 : 0,
              transform: vis ? 'none' : 'translateX(-10px)',
              transition: 'opacity .35s, transform .35s, background .4s',
            }}>
              <span style={{ fontSize: 10.5, color: 'var(--text-secondary)', fontFamily: 'monospace', minWidth: 54 }}>Sprint {i + 1}</span>
              <span style={{ fontSize: 11, minWidth: 92 }}>
                <span style={{ color: 'var(--text-secondary)' }}>{isTR ? 'Th:' : 'Est:'} </span><strong>{s.est}</strong>
                <span style={{ color: 'var(--text-secondary)', marginLeft: 8 }}>{isTR ? 'Ger:' : 'Act:'} </span>
                <strong style={{ color: s.est === s.act ? 'var(--green)' : 'var(--text-primary)' }}>{s.act}</strong>
              </span>
              <div style={{ flex: 1, height: 6, background: 'var(--bg-base)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 3,
                  background: good ? 'var(--green)' : 'var(--accent)',
                  width: vis ? `${s.acc}%` : '0%',
                  transition: 'width .9s cubic-bezier(.22,1,.36,1)',
                }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, minWidth: 34, textAlign: 'right', color: good ? 'var(--green)' : 'var(--accent-text)' }}>
                {vis ? `${s.acc}%` : '—'}
              </span>
            </div>
          );
        })}
        {shown >= SPRINTS.length && (
          <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--accent-dim)', borderRadius: 8, fontSize: 12, color: 'var(--accent-text)', fontWeight: 700 }}>
            🎯 {isTR ? 'Motor kalibre edildi — %95 isabetlilik' : 'Engine calibrated — 95% accuracy'}
          </div>
        )}
      </div>
    </MockBrowser>
  );
}

/* ══════════════════════════════════════════════
   DEMO 5 — Baselines (reference items)
══════════════════════════════════════════════ */
function BaselinesDemo({ isTR }: { isTR: boolean }) {
  const { ref, inView } = useInView(0.2);
  const [shown, setShown] = useState(0);

  const ITEMS = isTR ? [
    { name: 'Basit API Endpoint',    sp: 2,  type: 'User Story', desc: 'Tek CRUD endpoint, az bağımlılık, bilinen alan' },
    { name: 'Tam CRUD Özelliği',     sp: 8,  type: 'User Story', desc: 'Frontend + backend, form, validasyon, testler' },
    { name: 'Büyük Refaktör',        sp: 21, type: 'User Story', desc: 'Birden çok modülü etkileyen mimari değişiklik' },
    { name: 'Basit Hata Düzeltme',   sp: 1,  type: 'Bug',        desc: 'Nedeni belli, izole bir bug fix' },
    { name: 'Altyapı Geçişi',        sp: 13, type: 'DevOps',     desc: 'Ortam taşıma, downtime riski var' },
  ] : [
    { name: 'Simple API Endpoint',   sp: 2,  type: 'User Story', desc: 'Single CRUD endpoint, few dependencies' },
    { name: 'Full CRUD Feature',     sp: 8,  type: 'User Story', desc: 'Frontend + backend, form, validation, tests' },
    { name: 'Major Refactor',        sp: 21, type: 'User Story', desc: 'Architectural change across multiple modules' },
    { name: 'Simple Bug Fix',        sp: 1,  type: 'Bug',        desc: 'Known root cause, isolated fix' },
    { name: 'Infrastructure Migration',sp:13,type: 'DevOps',     desc: 'Environment migration, downtime risk' },
  ];

  useEffect(() => {
    if (!inView) return;
    ITEMS.forEach((_, i) => setTimeout(() => setShown(i + 1), 150 + i * 280));
  }, [inView]);

  return (
    <MockBrowser url="spee.app/calibration">
      <div ref={ref}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 12 }}>
          {isTR ? 'Baz İşler — Referans Kütüphane' : 'Baselines — Reference Library'}
        </div>
        {ITEMS.map((item, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
            borderRadius: 9, marginBottom: 6,
            border: '1px solid var(--border)', background: 'var(--bg-surface)',
            opacity: i < shown ? 1 : 0,
            transform: i < shown ? 'none' : 'translateY(8px)',
            transition: 'opacity .35s, transform .35s',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 12.5 }}>{item.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{item.desc}</div>
            </div>
            <span style={{ fontSize: 9.5, fontWeight: 700, background: 'var(--accent-dim)', color: 'var(--accent-text)', padding: '2px 6px', borderRadius: 4, flexShrink: 0 }}>{item.type}</span>
            <div style={{ textAlign: 'center', minWidth: 38, flexShrink: 0 }}>
              <div style={{ fontWeight: 900, fontSize: 19, color: 'var(--accent)', fontFamily: 'monospace', lineHeight: 1 }}>{item.sp}</div>
              <div style={{ fontSize: 9, color: 'var(--text-secondary)' }}>SP</div>
            </div>
          </div>
        ))}
        {shown >= ITEMS.length && (
          <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--bg-base)', borderRadius: 8, fontSize: 11.5, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            {isTR ? '↑ Motor yeni tahminlerde bu referanslara bakarak düzeltme yapar' : '↑ Engine consults these references to adjust future estimates'}
          </div>
        )}
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
            {isTR ? <>SPEE ile <span style={{ color: 'var(--accent-text)' }}>her şeyi</span> göster</> : <>See <span style={{ color: 'var(--accent-text)' }}>everything</span> SPEE can do</>}
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
