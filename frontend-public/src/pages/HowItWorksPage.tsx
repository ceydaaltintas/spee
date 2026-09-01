import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../contexts/LangContext';

/* ── Scroll reveal hook ─────────────────────────────────────── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

/* ── Mini mock-browser wrapper ──────────────────────────────── */
function MockBrowser({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.10)' }}>
      {/* Chrome bar */}
      <div style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--border)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {['#E06060','#E8B462','#4CAF85'].map((c,i) => <div key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />)}
        </div>
        <div style={{ flex: 1, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 5, padding: '3px 10px', fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center', fontFamily: 'monospace' }}>
          {url}
        </div>
      </div>
      <div style={{ padding: '20px 20px' }}>{children}</div>
    </div>
  );
}

/* ── Feature list item ──────────────────────────────────────── */
function FeatItem({ children }: { children: React.ReactNode }) {
  return (
    <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
      <span style={{ color: 'var(--green)', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
      <span>{children}</span>
    </li>
  );
}

/* ── Step card ──────────────────────────────────────────────── */
function StepCard({ num, icon, title, desc, delay }: { num: string; icon: string; title: string; desc: string; delay: number }) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14,
      padding: '28px 24px', position: 'relative', overflow: 'hidden',
      opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(24px)',
      transition: `opacity .6s ${delay}s, transform .6s ${delay}s`,
    }}>
      <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--accent-text)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 24, height: 1, background: 'var(--accent)' }} />
        {num}
      </div>
      <div style={{ fontSize: '1.5rem', marginBottom: 12 }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 7 }}>{title}</div>
      <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{desc}</div>
    </div>
  );
}

/* ── Demo section layout ────────────────────────────────────── */
function DemoSection({ reverse, label, title, desc, features, browser, delay = 0 }: {
  reverse?: boolean; label: string; title: string; desc: string;
  features: React.ReactNode[]; browser: React.ReactNode; delay?: number;
}) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} style={{
      display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: 40,
      alignItems: 'start',
      ...(reverse ? { direction: 'rtl' as const } : {}),
      opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(32px)',
      transition: `opacity .65s ${delay}s, transform .65s ${delay}s`,
    }}>
      <div style={{ direction: 'ltr' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--accent-text)', marginBottom: 10 }}>{label}</div>
        <h3 style={{ fontSize: 'clamp(20px, 2.5vw, 28px)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 12, lineHeight: 1.15 }}>{title}</h3>
        <p style={{ fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 22, maxWidth: 420 }}>{desc}</p>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column' as const, gap: 9 }}>
          {features.map((f, i) => <FeatItem key={i}>{f}</FeatItem>)}
        </ul>
      </div>
      <div style={{ direction: 'ltr' }}>{browser}</div>
    </div>
  );
}

/* ── Scale selector (interactive, matches real SPEE UI feel) ── */
function ScaleRow({ label, desc, value, onChange }: { label: string; desc: string; value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <div>
          <span style={{ fontWeight: 600, fontSize: 12.5 }}>{label}</span>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 6 }}>{desc}</span>
        </div>
        <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--accent-text)' }}>{value}/5</span>
      </div>
      <div style={{ display: 'flex', gap: 5 }}>
        {[1,2,3,4,5].map(v => (
          <button key={v} onClick={() => onChange(v)} style={{
            flex: 1, height: 28, border: `1.5px solid ${v <= value ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 6, background: v <= value ? 'var(--accent)' : 'transparent',
            color: v <= value ? '#fff' : 'var(--text-secondary)', fontSize: 11, fontWeight: 700,
            cursor: 'pointer', transition: 'all .15s',
          }}>{v}</button>
        ))}
      </div>
    </div>
  );
}

/* ── Animated bar ───────────────────────────────────────────── */
function AnimBar({ pct, color = 'var(--accent)', delay = 0, label, val }: { pct: number; color?: string; delay?: number; label: string; val: string }) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 3 }}>
        <span>{label}</span><span style={{ fontWeight: 600 }}>{val}</span>
      </div>
      <div style={{ height: 7, background: 'var(--bg-base)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 4, background: color,
          width: visible ? `${pct}%` : '0%',
          transition: `width .8s cubic-bezier(.22,1,.36,1) ${delay}s`,
        }} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Main page
═══════════════════════════════════════════════════════════════ */
export default function HowItWorksPage() {
  const navigate = useNavigate();
  const { lang, setLang } = useLang();
  const isTR = lang === 'tr';

  /* criteria demo state */
  const [tc, setTc] = useState(3);
  const [sc, setSc] = useState(2);
  const [tl, setTl] = useState(3);
  const [dk, setDk] = useState(2);
  const [selectedType, setSelectedType] = useState('USER_STORY');

  /* hero animate */
  const [heroIn, setHeroIn] = useState(false);
  useEffect(() => { setTimeout(() => setHeroIn(true), 80); }, []);

  /* SP calculation */
  const rawScore = (tc * 0.35 + (6 - sc) * 0.20 + tl * 0.20 + (6 - dk) * 0.25) / 5;
  const spVal = rawScore < 0.25 ? 2 : rawScore < 0.4 ? 3 : rawScore < 0.55 ? 5 : rawScore < 0.7 ? 8 : rawScore < 0.85 ? 13 : 21;
  const confidence = Math.round(55 + rawScore * 35);

  const TASK_TYPES_DEMO = [
    { key: 'USER_STORY', icon: '📋', labelTR: 'User Story',     labelEN: 'User Story' },
    { key: 'BUG',        icon: '🐛', labelTR: 'Hata Düzeltme', labelEN: 'Bug Fix'    },
    { key: 'ANALYSIS',  icon: '🔍', labelTR: 'Analiz',          labelEN: 'Analysis'   },
    { key: 'DEVOPS',    icon: '⚙️', labelTR: 'DevOps',          labelEN: 'DevOps'     },
    { key: 'SPIKE',     icon: '🧪', labelTR: 'Spike',           labelEN: 'Spike'      },
    { key: 'PERFORMANCE',icon:'🚀', labelTR: 'Performans',      labelEN: 'Performance'},
    { key: 'SECURITY',  icon: '🔒', labelTR: 'Güvenlik',        labelEN: 'Security'   },
    { key: 'DESIGN',    icon: '🎨', labelTR: 'Tasarım',         labelEN: 'Design'     },
  ];

  return (
    <>
      <style>{`
        @keyframes hiw-fade-up { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        .hiw-fade-up-1 { animation: hiw-fade-up .6s cubic-bezier(.22,1,.36,1) .1s both; }
        .hiw-fade-up-2 { animation: hiw-fade-up .6s cubic-bezier(.22,1,.36,1) .22s both; }
        .hiw-fade-up-3 { animation: hiw-fade-up .6s cubic-bezier(.22,1,.36,1) .36s both; }
        .hiw-fade-up-4 { animation: hiw-fade-up .6s cubic-bezier(.22,1,.36,1) .5s both; }
        .hiw-full-divider { border: none; border-top: 1px solid var(--border); margin: 0; }
        .hiw-task-pill { border: 1.5px solid var(--border); border-radius: 9px; padding: 8px 12px; cursor: pointer; display: flex; align-items: center; gap: 7px; background: var(--bg-surface); transition: all .15s; }
        .hiw-task-pill:hover { border-color: var(--accent); }
        .hiw-task-pill.sel { border-color: var(--accent); background: var(--accent); color: #fff; }
        .hiw-cal-row { padding: 9px 12px; border-radius: 8px; display: flex; align-items: center; gap: 10px; font-size: 12px; transition: background .2s; }
        .hiw-cal-row.cur { background: var(--accent-dim); }
      `}</style>

      <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)' }}>

        {/* NAV */}
        <nav style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: 'var(--bg-header)', borderBottom: '1px solid var(--border)',
          backdropFilter: 'blur(12px)',
          padding: '0 2rem', height: 56,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <button onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 800, fontSize: 15, letterSpacing: '0.06em' }}>
            <svg width="16" height="16" viewBox="0 0 48 46" fill="none"><path fill="var(--accent)" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"/></svg>
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
        <div style={{ textAlign: 'center', padding: '72px 2rem 56px', maxWidth: 680, margin: '0 auto' }}>
          <div className="hiw-fade-up-1" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', color: 'var(--accent-text)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 14px', borderRadius: 20, marginBottom: 24 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
            {isTR ? 'Adım adım' : 'Step by step'}
          </div>
          <h1 className="hiw-fade-up-2" style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 18 }}>
            {isTR ? <>SPEE <span style={{ color: 'var(--accent-text)' }}>nasıl çalışır?</span></> : <>How does <span style={{ color: 'var(--accent-text)' }}>SPEE work?</span></>}
          </h1>
          <p className="hiw-fade-up-3" style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 32 }}>
            {isTR
              ? 'Görevi tanımla, kriterleri değerlendir, motoru çalıştır. Her sprintle daha isabetli hale gelen kalibre edilmiş bir tahmin sistemi.'
              : 'Define the task, score the criteria, run the engine. A calibrated estimation system that gets more accurate with every sprint.'}
          </p>
          <div className="hiw-fade-up-4" style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={() => navigate('/estimate')} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 28px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              {isTR ? 'Hemen Dene →' : 'Try It Now →'}
            </button>
            <button onClick={() => navigate('/')} style={{ background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 10, padding: '11px 22px', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: 'var(--text-primary)' }}>
              {isTR ? '← Ana Sayfa' : '← Home'}
            </button>
          </div>
        </div>

        <hr className="hiw-full-divider" />

        {/* STEP CARDS */}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '72px 2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {[
              { num:'01', icon:'📋', titleTR:'Görevi Tanımla',       titleEN:'Define the Task',       descTR:'8 görev tipi, her biri kendine özgü kriter seti ile.',    descEN:'8 task types, each with its own criterion set.', delay:0 },
              { num:'02', icon:'⚖️', titleTR:'Kriterleri Değerlendir',titleEN:'Score the Criteria',   descTR:'Her boyutu 1–5 arası puan. Motor ağırlıklı hesaplar.',   descEN:'Score each dimension 1–5. Engine calculates weighted.', delay:.1 },
              { num:'03', icon:'⚡', titleTR:'SP Önerisini Al',       titleEN:'Get the SP Suggestion', descTR:'Deterministik motor anında Fibonacci değeri üretir.',     descEN:'Deterministic engine instantly produces Fibonacci value.', delay:.2 },
              { num:'04', icon:'🎯', titleTR:'Kalibre Et',            titleEN:'Calibrate',             descTR:'Gerçek SP gir, motor bir sonraki tahmin için öğrenir.',  descEN:'Enter actual SP, engine learns for the next estimate.', delay:.3 },
            ].map(s => (
              <StepCard key={s.num} num={s.num} icon={s.icon}
                title={isTR ? s.titleTR : s.titleEN}
                desc={isTR ? s.descTR : s.descEN}
                delay={s.delay} />
            ))}
          </div>
        </div>

        <hr className="hiw-full-divider" />

        {/* ── SECTION 1: Task type ── */}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '72px 2rem' }}>
          <DemoSection
            label={isTR ? 'Adım 01 — Görev Tipi' : 'Step 01 — Task Type'}
            title={isTR ? 'Önce görevi doğru sınıflandır' : 'Start by classifying the task correctly'}
            desc={isTR
              ? 'Bir User Story, bir Bug fix ve bir DevOps görevi tamamen farklı boyutlarda değerlendirilir. SPEE her tip için ayrı bir kriter seti kullanır — yanlış sınıflandırmadan kaynaklanan hatalı tahminler ortadan kalkar.'
              : 'A User Story, a Bug fix and a DevOps task are evaluated on completely different dimensions. SPEE uses a separate criterion set for each type — eliminating wrong estimates from misclassification.'}
            features={isTR ? [
              <><strong>8 farklı görev tipi</strong> — User Story, Bug, Analiz, DevOps, Spike, Performans, Güvenlik, Tasarım</>,
              <><strong>Her tip için özel kriterler</strong> — örneğin Bug için "kök neden netliği", DevOps için "prod riski"</>,
              <><strong>Tip değiştirince</strong> kriter paneli anında güncellenir, önceki puanlar sıfırlanır</>,
            ] : [
              <><strong>8 task types</strong> — User Story, Bug, Analysis, DevOps, Spike, Performance, Security, Design</>,
              <><strong>Custom criteria per type</strong> — e.g. "root cause clarity" for Bug, "production risk" for DevOps</>,
              <><strong>Changing the type</strong> instantly updates the criteria panel and resets previous scores</>,
            ]}
            browser={
              <MockBrowser url="spee.app/estimate">
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 10 }}>
                  {isTR ? 'Görev Tipi' : 'Task Type'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {TASK_TYPES_DEMO.map(tt => (
                    <button key={tt.key}
                      className={`hiw-task-pill${selectedType === tt.key ? ' sel' : ''}`}
                      onClick={() => setSelectedType(tt.key)}
                    >
                      <span style={{ fontSize: '1rem' }}>{tt.icon}</span>
                      <span style={{ fontWeight: 600, fontSize: 12 }}>{isTR ? tt.labelTR : tt.labelEN}</span>
                    </button>
                  ))}
                </div>
                <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--accent-dim)', borderRadius: 8, fontSize: 12, color: 'var(--accent-text)', fontWeight: 600 }}>
                  ✓ {isTR ? `${selectedType === 'USER_STORY' ? 5 : selectedType === 'BUG' ? 4 : selectedType === 'DEVOPS' ? 4 : 3} kriter yüklendi` : `${selectedType === 'USER_STORY' ? 5 : selectedType === 'BUG' ? 4 : selectedType === 'DEVOPS' ? 4 : 3} criteria loaded`}
                </div>
              </MockBrowser>
            }
          />
        </div>

        <hr className="hiw-full-divider" />

        {/* ── SECTION 2: Criteria ── */}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '72px 2rem' }}>
          <DemoSection
            reverse
            label={isTR ? 'Adım 02 — Kriter Değerlendirmesi' : 'Step 02 — Criteria Scoring'}
            title={isTR ? 'Her boyutu ekibinin gözünden puan' : 'Score every dimension through your team\'s lens'}
            desc={isTR
              ? 'Her kriter 1–5 arası puanlanır ve farklı ağırlıklarla birleştirilir. Teknik karmaşıklık mı ağır basıyor yoksa belirsizlik mi? Motor bu denge üzerinden hesaplar.'
              : 'Each criterion is scored 1–5 and combined with different weights. Does technical complexity dominate or uncertainty? The engine calculates based on this balance.'}
            features={isTR ? [
              <><strong>Ağırlıklı hesaplama</strong> — her kriter farklı SP katkısı taşır (örn. teknik karmaşıklık %35)</>,
              <><strong>Anlık geri bildirim</strong> — puanı değiştirdikçe tahmini skor canlı güncellenir</>,
              <><strong>Takım kalibrasyonu</strong> — ağırlıklar zamanla takımın geçmiş verisiyle ayarlanır</>,
            ] : [
              <><strong>Weighted calculation</strong> — each criterion carries different SP contribution (e.g. technical complexity 35%)</>,
              <><strong>Instant feedback</strong> — estimated score updates live as you change values</>,
              <><strong>Team calibration</strong> — weights adjust over time with team's historical data</>,
            ]}
            browser={
              <MockBrowser url="spee.app/estimate">
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 14 }}>
                  {isTR ? 'Kriterler — User Story' : 'Criteria — User Story'}
                </div>
                <ScaleRow label={isTR ? 'Teknik Karmaşıklık' : 'Technical Complexity'} desc={isTR ? '×35%' : '×35%'} value={tc} onChange={setTc} />
                <ScaleRow label={isTR ? 'Kapsam Netliği' : 'Scope Clarity'}          desc={isTR ? '×20%' : '×20%'} value={sc} onChange={setSc} />
                <ScaleRow label={isTR ? 'Test Yükü' : 'Test Load'}                    desc={isTR ? '×20%' : '×20%'} value={tl} onChange={setTl} />
                <ScaleRow label={isTR ? 'Alan Bilgisi' : 'Domain Knowledge'}          desc={isTR ? '×25%' : '×25%'} value={dk} onChange={setDk} />
                <div style={{ marginTop: 14, background: 'var(--bg-base)', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{isTR ? 'Tahmini skor' : 'Estimated score'}</span>
                  <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--accent-text)' }}>{spVal} SP</span>
                </div>
              </MockBrowser>
            }
          />
        </div>

        <hr className="hiw-full-divider" />

        {/* ── SECTION 3: Result ── */}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '72px 2rem' }}>
          <DemoSection
            label={isTR ? 'Adım 03 — SP Önerisi' : 'Step 03 — SP Suggestion'}
            title={isTR ? 'Deterministik motor, Fibonacci skalasında öneri' : 'Deterministic engine, suggestion on Fibonacci scale'}
            desc={isTR
              ? 'Makine öğrenmesi yok, kara kutu yok. Ağırlıklı kriter ortalaması Fibonacci skalasına deterministik olarak eşlenir. Her tahmin açıklanabilir ve tekrarlanabilir.'
              : 'No machine learning, no black box. The weighted criterion average is deterministically mapped to the Fibonacci scale. Every estimate is explainable and repeatable.'}
            features={isTR ? [
              <><strong>Fibonacci skalası</strong> — 1, 2, 3, 5, 8, 13, 21 değerlerinden en uygun seçilir</>,
              <><strong>Güven skoru</strong> — kriterlerin doluluk oranı ve tutarlılığından hesaplanır</>,
              <><strong>Kriter katkı grafiği</strong> — hangi boyutun SP'yi ne kadar etkilediği görülür</>,
              <><strong>Teknik göstergesi</strong> — T-Shirt, Planning Poker, Fibonacci hangi teknik uygulandığı</>,
            ] : [
              <><strong>Fibonacci scale</strong> — most suitable value selected from 1, 2, 3, 5, 8, 13, 21</>,
              <><strong>Confidence score</strong> — calculated from criteria completeness and consistency</>,
              <><strong>Criterion contribution chart</strong> — see how much each dimension affects the SP</>,
              <><strong>Technique indicator</strong> — T-Shirt, Planning Poker, or Fibonacci applied</>,
            ]}
            browser={
              <MockBrowser url="spee.app/estimate">
                <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                  <div style={{ flex: 1, textAlign: 'center', padding: '16px 8px', background: 'var(--bg-base)', borderRadius: 10 }}>
                    <div style={{ fontSize: 40, fontWeight: 900, color: 'var(--accent)', lineHeight: 1 }}>{spVal}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Story Points</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ padding: '10px 14px', background: 'var(--bg-base)', borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--green)' }}>{confidence}%</div>
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{isTR ? 'Güven' : 'Confidence'}</div>
                    </div>
                    <div style={{ padding: '10px 14px', background: 'var(--bg-base)', borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>T-Shirt</div>
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{isTR ? 'Teknik' : 'Technique'}</div>
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8 }}>
                  {isTR ? 'Kriter Katkıları' : 'Criterion Contributions'}
                </div>
                <AnimBar label={isTR ? 'Teknik Karmaşıklık' : 'Technical Complexity'} val={`${tc}/5`} pct={(tc/5)*100} delay={0} />
                <AnimBar label={isTR ? 'Kapsam Netliği' : 'Scope Clarity'}           val={`${sc}/5`} pct={(sc/5)*100} delay={.1} color="var(--green)" />
                <AnimBar label={isTR ? 'Test Yükü' : 'Test Load'}                     val={`${tl}/5`} pct={(tl/5)*100} delay={.2} />
                <AnimBar label={isTR ? 'Alan Bilgisi' : 'Domain Knowledge'}           val={`${dk}/5`} pct={(dk/5)*100} delay={.3} color="var(--green)" />
              </MockBrowser>
            }
          />
        </div>

        <hr className="hiw-full-divider" />

        {/* ── SECTION 4: Calibration ── */}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '72px 2rem' }}>
          <DemoSection
            reverse
            label={isTR ? 'Adım 04 — Kalibrasyon' : 'Step 04 — Calibration'}
            title={isTR ? 'Her sprintle daha isabetli' : 'More accurate with every sprint'}
            desc={isTR
              ? 'Sprint bitiminde gerçek SP\'yi gir. Motor tahmin ile gerçek arasındaki farkı öğrenir ve bir sonraki benzer görevi daha isabetli tahmin eder. Birkaç sprint içinde doğruluk oranı belirgin şekilde artar.'
              : 'Enter the actual SP at sprint end. The engine learns from the difference between estimate and actual, and produces more accurate estimates for similar tasks next time. Accuracy improves noticeably within a few sprints.'}
            features={isTR ? [
              <><strong>Kalibre döngüsü</strong> — Tahmin → Onay → Gerçek SP → Motor güncellenir → Daha iyi tahmin</>,
              <><strong>Baz işler (Baselines)</strong> — Referans iş kalemlerini kaydet, motor benzer işlerde baz alır</>,
              <><strong>Kalibrasyon geçmişi</strong> — Sprint bazında tahmin vs gerçek karşılaştırması ve isabetlilik trendi</>,
              <><strong>Takım bazlı</strong> — Her takım kendi kalibrasyonunu taşır, farklı takımlar birbirini etkilemez</>,
            ] : [
              <><strong>Calibration loop</strong> — Estimate → Approve → Actual SP → Engine updates → Better estimate</>,
              <><strong>Baselines</strong> — Save reference work items; engine uses them as anchors for similar tasks</>,
              <><strong>Calibration history</strong> — Sprint-level estimate vs actual comparison and accuracy trend</>,
              <><strong>Team-scoped</strong> — Each team carries its own calibration, teams don't interfere with each other</>,
            ]}
            browser={
              <MockBrowser url="spee.app/calibration">
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 12 }}>
                  {isTR ? 'Kalibrasyon Geçmişi' : 'Calibration History'}
                </div>
                {[
                  { sprint: 'Sprint 1', est: 8,  act: 13, acc: 38 },
                  { sprint: 'Sprint 2', est: 13, act: 13, acc: 61 },
                  { sprint: 'Sprint 3', est: 5,  act: 8,  acc: 74 },
                  { sprint: 'Sprint 4', est: 8,  act: 8,  acc: 87 },
                  { sprint: 'Sprint 5', est: 5,  act: 5,  acc: 95 },
                ].map((r, i) => (
                  <div key={i} className={`hiw-cal-row${i === 4 ? ' cur' : ''}`}>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', minWidth: 52, fontFamily: 'monospace' }}>{r.sprint}</span>
                    <span style={{ fontSize: 11, minWidth: 80 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{isTR ? 'Th:' : 'Est:'} </span><strong>{r.est}</strong>
                      <span style={{ color: 'var(--text-secondary)', marginLeft: 6 }}>{isTR ? 'Ger:' : 'Act:'} </span>
                      <strong style={{ color: r.est === r.act ? 'var(--green)' : 'var(--text-primary)' }}>{r.act}</strong>
                    </span>
                    <div style={{ flex: 1, height: 5, background: 'var(--bg-base)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${r.acc}%`, background: r.acc >= 85 ? 'var(--green)' : 'var(--accent)', borderRadius: 3, transition: 'width .8s' }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: r.acc >= 85 ? 'var(--green)' : 'var(--accent-text)', minWidth: 34, textAlign: 'right' }}>{r.acc}%</span>
                  </div>
                ))}
                <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--accent-dim)', borderRadius: 8, fontSize: 12, color: 'var(--accent-text)', fontWeight: 600 }}>
                  🎯 {isTR ? 'Sprint 5 — Motor kalibre edildi' : 'Sprint 5 — Engine calibrated'}
                </div>
              </MockBrowser>
            }
          />
        </div>

        <hr className="hiw-full-divider" />

        {/* ── SECTION 5: History ── */}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '72px 2rem' }}>
          <DemoSection
            label={isTR ? 'Geçmiş & Toplu Tahmin' : 'History & Bulk Estimation'}
            title={isTR ? 'Tahmin geçmişi ve toplu backlog analizi' : 'Estimate history and bulk backlog analysis'}
            desc={isTR
              ? 'Geçmiş tüm tahminler kayıt altında. Toplu tahmin modunda Excel\'den PBI listesi yükle, sistem her satır için otomatik metin analizi + tahmin çalıştırır.'
              : 'All past estimates are recorded. In bulk estimation mode, upload a PBI list from Excel and the system runs automatic text analysis + estimation for each row.'}
            features={isTR ? [
              <><strong>Tahmin geçmişi</strong> — her oturum kaydedilir, SP, teknik, tarih bilgisiyle filtrelenebilir</>,
              <><strong>Toplu tahmin (Bulk)</strong> — Excel\'den PBI listesi yükle, tüm backlog için SP önerisi al</>,
              <><strong>Metin analizi</strong> — başlık ve açıklamadan otomatik olarak görev tipi ve kriter tahmini</>,
              <><strong>Excel dışa aktarım</strong> — tahmin sonuçlarını takımla paylaşmak için Excel\'e indir</>,
            ] : [
              <><strong>Estimate history</strong> — every session saved, filterable by SP, technique, date</>,
              <><strong>Bulk estimation</strong> — upload PBI list from Excel, get SP suggestions for entire backlog</>,
              <><strong>Text analysis</strong> — automatic task type and criteria inference from title and description</>,
              <><strong>Excel export</strong> — download estimation results to Excel to share with team</>,
            ]}
            browser={
              <MockBrowser url="spee.app/history">
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 12 }}>
                  {isTR ? 'Son Tahminler' : 'Recent Estimates'}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {[isTR ? 'Görev' : 'Task', isTR ? 'Tip' : 'Type', 'SP', isTR ? 'Tarih' : 'Date'].map((h,i) => (
                        <th key={i} style={{ textAlign: 'left', padding: '4px 8px 8px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 10, letterSpacing: '0.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { task: isTR ? 'Ödeme akışı refaktörü' : 'Payment flow refactor', type: 'User Story', sp: 13, date: '28 Ağu' },
                      { task: isTR ? 'Login hatası düzeltme' : 'Fix login bug',          type: 'Bug',       sp: 3,  date: '26 Ağu' },
                      { task: isTR ? 'CI/CD pipeline güncelleme' : 'CI/CD pipeline update', type: 'DevOps', sp: 8, date: '24 Ağu' },
                      { task: isTR ? 'Kullanıcı araştırması' : 'User research',          type: 'Analysis',  sp: 5,  date: '22 Ağu' },
                    ].map((r, i) => (
                      <tr key={i} style={{ borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
                        <td style={{ padding: '8px', color: 'var(--text-primary)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.task}</td>
                        <td style={{ padding: '8px' }}><span style={{ fontSize: 10, fontWeight: 600, background: 'var(--accent-dim)', color: 'var(--accent-text)', padding: '2px 6px', borderRadius: 4 }}>{r.type}</span></td>
                        <td style={{ padding: '8px', fontWeight: 800, color: 'var(--accent)', fontFamily: 'monospace' }}>{r.sp}</td>
                        <td style={{ padding: '8px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 11 }}>{r.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </MockBrowser>
            }
          />
        </div>

        <hr className="hiw-full-divider" />

        {/* CTA */}
        <div style={{ textAlign: 'center', padding: '72px 2rem 80px' }}>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 14 }}>
            {isTR ? 'İlk tahminini şimdi yap' : 'Make your first estimate now'}
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 28, maxWidth: 400, margin: '0 auto 28px' }}>
            {isTR ? 'Kayıt yok, kurulum yok. Takımını oluştur, hemen başla.' : 'No sign-up, no setup. Create your team and get started.'}
          </p>
          <button onClick={() => navigate('/estimate')} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 12, padding: '13px 36px', fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 20px rgba(79,70,229,0.3)' }}>
            {isTR ? '⚡ Hemen Başla' : '⚡ Get Started'}
          </button>
        </div>

      </div>
    </>
  );
}
