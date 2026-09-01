import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../contexts/LangContext';

/* ─── Types ─────────────────────────────────────────────────── */
type TaskKey = 'USER_STORY' | 'BUG' | 'ANALYSIS' | 'DEVOPS' | 'SPIKE' | 'PERFORMANCE' | 'SECURITY' | 'DESIGN';

interface CriterionDef {
  key: string;
  labelTR: string;
  labelEN: string;
  descTR: string;
  descEN: string;
  weight: number;
  inverted?: boolean;
}

const TASK_TYPES: { key: TaskKey; icon: string; labelTR: string; labelEN: string; descTR: string; descEN: string }[] = [
  { key: 'USER_STORY', icon: '📋', labelTR: 'User Story', labelEN: 'User Story', descTR: 'Yeni özellik geliştirme', descEN: 'New feature development' },
  { key: 'BUG',        icon: '🐛', labelTR: 'Hata Düzeltme', labelEN: 'Bug Fix', descTR: 'Mevcut davranış hatası', descEN: 'Existing behaviour defect' },
  { key: 'ANALYSIS',  icon: '🔍', labelTR: 'Analiz', labelEN: 'Analysis', descTR: 'Araştırma & dokümantasyon', descEN: 'Research & documentation' },
  { key: 'DEVOPS',    icon: '⚙️', labelTR: 'DevOps', labelEN: 'DevOps', descTR: 'Altyapı & pipeline işleri', descEN: 'Infrastructure & pipeline' },
  { key: 'SPIKE',     icon: '🧪', labelTR: 'Spike', labelEN: 'Spike', descTR: 'Teknik keşif & PoC', descEN: 'Technical exploration & PoC' },
  { key: 'PERFORMANCE',icon:'🚀',labelTR: 'Performans', labelEN: 'Performance', descTR: 'Hız & ölçek optimizasyonu', descEN: 'Speed & scale optimisation' },
  { key: 'SECURITY',  icon: '🔒', labelTR: 'Güvenlik', labelEN: 'Security', descTR: 'Güvenlik açığı & sertleştirme', descEN: 'Vulnerability & hardening' },
  { key: 'DESIGN',    icon: '🎨', labelTR: 'Tasarım', labelEN: 'Design', descTR: 'UI/UX & araştırma', descEN: 'UI/UX & research' },
];

const CRITERIA_MAP: Record<TaskKey, CriterionDef[]> = {
  USER_STORY: [
    { key:'tc', labelTR:'Teknik Karmaşıklık', labelEN:'Technical Complexity',   descTR:'Mimari zorluk seviyesi',       descEN:'Architectural difficulty',    weight:0.35 },
    { key:'sc', labelTR:'Kapsam Netliği',    labelEN:'Scope Clarity',           descTR:'Gereksinimlerin berraklığı',   descEN:'Requirements clarity',        weight:0.20, inverted:true },
    { key:'dc', labelTR:'Bağımlılık Sayısı', labelEN:'Dependencies',            descTR:'Dış servis / modül sayısı',   descEN:'External services / modules', weight:0.15 },
    { key:'tl', labelTR:'Test Yükü',         labelEN:'Test Load',               descTR:'Yazılacak test kapsamı',       descEN:'Test coverage scope',         weight:0.15 },
    { key:'dk', labelTR:'Alan Bilgisi',      labelEN:'Domain Knowledge',        descTR:'Ekibin bu alandaki deneyimi', descEN:'Team experience in domain',   weight:0.15, inverted:true },
  ],
  BUG: [
    { key:'rd', labelTR:'Tekrarlanabilirlik', labelEN:'Reproduction Difficulty', descTR:'Bug\'ı üretmenin zorluğu',    descEN:'How hard to reproduce',       weight:0.25 },
    { key:'rc', labelTR:'Kök Neden Netliği', labelEN:'Root Cause Clarity',      descTR:'Nedenin bilinirliği',          descEN:'Clarity of root cause',       weight:0.30, inverted:true },
    { key:'fi', labelTR:'Düzeltme Etkisi',   labelEN:'Fix Impact Scope',        descTR:'Kaç modülü etkiliyor',        descEN:'Modules affected',            weight:0.25 },
    { key:'rr', labelTR:'Regresyon Riski',   labelEN:'Regression Risk',         descTR:'Yan etki ihtimali',            descEN:'Risk of side effects',        weight:0.20 },
  ],
  ANALYSIS: [
    { key:'al', labelTR:'Belirsizlik',       labelEN:'Ambiguity Level',         descTR:'Sonucun ne kadar belirsiz',   descEN:'How unclear the outcome is',  weight:0.30 },
    { key:'sc', labelTR:'Kapsam Netliği',    labelEN:'Scope Clarity',           descTR:'Analizin sınırları',           descEN:'Boundaries of the analysis',  weight:0.25, inverted:true },
    { key:'da', labelTR:'Veri Erişimi',      labelEN:'Data Access Difficulty',  descTR:'Kaynağa ulaşma güçlüğü',     descEN:'Difficulty accessing sources',weight:0.20 },
    { key:'of', labelTR:'Çıktı Resmiyeti',  labelEN:'Output Formality',        descTR:'Rapor / sunum gereksinimleri',descEN:'Report / presentation needs', weight:0.25 },
  ],
  DEVOPS: [
    { key:'pr', labelTR:'Prod Riski',        labelEN:'Production Risk',         descTR:'Prod ortamına etkisi',         descEN:'Impact on production',        weight:0.30 },
    { key:'rb', labelTR:'Geri Alma Karmaşıklığı',labelEN:'Rollback Complexity', descTR:'Rollback ne kadar zor',       descEN:'Complexity of rollback',      weight:0.25 },
    { key:'ec', labelTR:'Ortam Karmaşıklığı',labelEN:'Env Complexity',          descTR:'Farklı ortam sayısı',          descEN:'Number of environments',      weight:0.25 },
    { key:'ct', labelTR:'Koordinasyon',      labelEN:'Cross-team Coordination', descTR:'Kaç takım dahil',              descEN:'Teams involved',              weight:0.20 },
  ],
  SPIKE: [
    { key:'tc', labelTR:'Teknik Belirsizlik',labelEN:'Technical Uncertainty',   descTR:'Çözümün ne kadar bilinmez',  descEN:'How unknown the solution is', weight:0.40 },
    { key:'sc', labelTR:'Kapsam Netliği',    labelEN:'Scope Clarity',           descTR:'Araştırma sınırları',          descEN:'Research boundaries',         weight:0.35, inverted:true },
    { key:'dk', labelTR:'Alan Bilgisi',      labelEN:'Domain Knowledge',        descTR:'Ekibin geçmiş deneyimi',      descEN:'Team\'s prior experience',    weight:0.25, inverted:true },
  ],
  PERFORMANCE: [
    { key:'tc', labelTR:'Teknik Karmaşıklık',labelEN:'Technical Complexity',    descTR:'Optimizasyonun zorluğu',      descEN:'Optimisation difficulty',     weight:0.35 },
    { key:'sc', labelTR:'Kapsam Netliği',    labelEN:'Scope Clarity',           descTR:'Hangi metrik hedefleniyor',   descEN:'Which metric is targeted',    weight:0.25, inverted:true },
    { key:'pr', labelTR:'Prod Riski',        labelEN:'Production Risk',         descTR:'Canlıya etkisi',               descEN:'Impact on live system',       weight:0.25 },
    { key:'tl', labelTR:'Test Yükü',         labelEN:'Test Load',               descTR:'Benchmark / profiling yükü',  descEN:'Benchmark / profiling load',  weight:0.15 },
  ],
  SECURITY: [
    { key:'sv', labelTR:'Güvenlik Açığı Seviyesi',labelEN:'Vulnerability Severity',descTR:'CVSS / etki boyutu',       descEN:'CVSS / impact scope',         weight:0.40 },
    { key:'fi', labelTR:'Düzeltme Etkisi',   labelEN:'Fix Impact Scope',        descTR:'Değiştirilecek yüzeyler',     descEN:'Surfaces to be changed',      weight:0.30 },
    { key:'ct', labelTR:'Koordinasyon',      labelEN:'Coordination',            descTR:'Uyumluluk / hukuki gerekleri',descEN:'Compliance / legal needs',    weight:0.30 },
  ],
  DESIGN: [
    { key:'al', labelTR:'Belirsizlik',       labelEN:'Ambiguity Level',         descTR:'Tasarım yönünün netliği',     descEN:'Clarity of design direction', weight:0.30 },
    { key:'sc', labelTR:'Kapsam Netliği',    labelEN:'Scope Clarity',           descTR:'Kaç akış kapsanıyor',          descEN:'Number of flows covered',     weight:0.25, inverted:true },
    { key:'sh', labelTR:'Paydaş Sayısı',     labelEN:'Stakeholder Count',       descTR:'Geri bildirim verecek kişi',  descEN:'People giving feedback',      weight:0.25 },
    { key:'of', labelTR:'Çıktı Resmiyeti',  labelEN:'Output Formality',        descTR:'Prototype / handoff detayı',  descEN:'Prototype / handoff detail',  weight:0.20 },
  ],
};

const FIBONACCI = [1, 2, 3, 5, 8, 13, 21];

function scoreToFib(score: number): number {
  if (score < 0.18) return 1;
  if (score < 0.32) return 2;
  if (score < 0.48) return 3;
  if (score < 0.62) return 5;
  if (score < 0.76) return 8;
  if (score < 0.88) return 13;
  return 21;
}

function calcScore(criteria: CriterionDef[], vals: Record<string, number>): number {
  let total = 0, wSum = 0;
  criteria.forEach(c => {
    const v = vals[c.key] ?? 3;
    const norm = c.inverted ? (6 - v) / 5 : (v - 1) / 4;
    total += norm * c.weight;
    wSum += c.weight;
  });
  return total / wSum;
}

/* ─── Calibration round data ─────────────────────────────────── */
const CAL_ROUNDS = [
  { sprint: 1, estimated: 8,  actual: 13, accuracy: 38 },
  { sprint: 2, estimated: 13, actual: 13, accuracy: 62 },
  { sprint: 3, estimated: 5,  actual: 8,  accuracy: 74 },
  { sprint: 4, estimated: 8,  actual: 8,  accuracy: 87 },
  { sprint: 5, estimated: 5,  actual: 5,  accuracy: 95 },
];

/* ─── Component ──────────────────────────────────────────────── */
export default function HowItWorksPage() {
  const navigate = useNavigate();
  const { lang, setLang } = useLang();
  const isTR = lang === 'tr';

  const [step, setStep] = useState(0);
  const [taskType, setTaskType] = useState<TaskKey>('USER_STORY');
  const [vals, setVals] = useState<Record<string, number>>({});
  const [revealed, setRevealed] = useState(false);
  const [counting, setCounting] = useState(0);
  const [calRound, setCalRound] = useState(0);
  const [calAnimating, setCalAnimating] = useState(false);
  const [stepVisible, setStepVisible] = useState(true);
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const criteria = CRITERIA_MAP[taskType];
  const score = calcScore(criteria, vals);
  const sp = scoreToFib(score);
  const confidence = Math.round(40 + score * 50 + (Object.keys(vals).length / criteria.length) * 10);

  function getVal(key: string) { return vals[key] ?? 3; }
  function setVal(key: string, v: number) { setVals(prev => ({ ...prev, [key]: v })); }

  function goStep(n: number) {
    setStepVisible(false);
    setTimeout(() => { setStep(n); setStepVisible(true); }, 220);
    if (n === 2) { setRevealed(false); setCounting(0); }
  }

  // Count-up animation for SP
  useEffect(() => {
    if (step !== 2 || !revealed) return;
    if (countRef.current) clearInterval(countRef.current);
    let cur = 0;
    countRef.current = setInterval(() => {
      cur++;
      setCounting(cur);
      if (cur >= sp && countRef.current) { clearInterval(countRef.current); setCounting(sp); }
    }, 60);
    return () => { if (countRef.current) clearInterval(countRef.current); };
  }, [revealed, sp, step]);

  function handleReveal() {
    setRevealed(true);
    setCounting(0);
  }

  function handleCalibrate() {
    if (calRound >= CAL_ROUNDS.length - 1 || calAnimating) return;
    setCalAnimating(true);
    setTimeout(() => { setCalRound(r => r + 1); setCalAnimating(false); }, 700);
  }

  const STEPS_TR = ['Görev Tipini Seç', 'Kriterleri Değerlendir', 'SP Önerisini Al', 'Kalibrasyonu Anla'];
  const STEPS_EN = ['Select Task Type', 'Score the Criteria', 'Get SP Suggestion', 'Understand Calibration'];
  const steps = isTR ? STEPS_TR : STEPS_EN;

  const accentColor = 'var(--accent)';

  return (
    <>
      <style>{`
        @keyframes hiw-slide-in {
          from { opacity: 0; transform: translateX(28px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes hiw-fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes hiw-bar-grow {
          from { width: 0; }
        }
        @keyframes hiw-pop {
          0%   { transform: scale(0.7); opacity: 0; }
          60%  { transform: scale(1.12); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes hiw-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes hiw-shimmer {
          0%   { opacity: 0.4; }
          50%  { opacity: 1; }
          100% { opacity: 0.4; }
        }
        .hiw-step-visible { animation: hiw-slide-in 0.25s cubic-bezier(.22,1,.36,1) both; }
        .hiw-step-hidden  { opacity: 0; }

        .hiw-task-card {
          border: 1.5px solid var(--border);
          border-radius: 12px;
          padding: 0.75rem 1rem;
          cursor: pointer;
          display: flex; align-items: center; gap: 0.6rem;
          transition: border-color 0.15s, background 0.15s, transform 0.15s;
          background: var(--bg-surface);
        }
        .hiw-task-card:hover { border-color: var(--accent-border); transform: translateY(-1px); }
        .hiw-task-card.active { border-color: var(--accent); background: var(--accent-dim); }

        .hiw-dot-row { display: flex; gap: 6px; align-items: center; }
        .hiw-dot {
          width: 22px; height: 22px; border-radius: 50%;
          border: 2px solid var(--border-strong);
          cursor: pointer; transition: all 0.15s; flex-shrink: 0;
          background: transparent;
          display: flex; align-items: center; justify-content: center;
        }
        .hiw-dot.filled { background: var(--accent); border-color: var(--accent); }
        .hiw-dot:hover  { border-color: var(--accent); transform: scale(1.15); }

        .hiw-bar-wrap { background: var(--bg-base); border-radius: 6px; height: 8px; overflow: hidden; }
        .hiw-bar      { height: 100%; border-radius: 6px; background: var(--accent); animation: hiw-bar-grow 0.6s cubic-bezier(.22,1,.36,1) both; }

        .hiw-reveal-btn {
          background: var(--accent); color: #fff; border: none;
          border-radius: 10px; padding: 0.75rem 2rem;
          font-weight: 700; font-size: 0.95rem; cursor: pointer;
          transition: transform 0.15s, filter 0.15s;
        }
        .hiw-reveal-btn:hover { transform: translateY(-2px); filter: brightness(1.08); }

        .hiw-sp-bubble {
          animation: hiw-pop 0.5s cubic-bezier(.22,1,.36,1) both;
          font-size: 5rem; font-weight: 900; color: var(--accent);
          line-height: 1; letter-spacing: -0.04em;
        }

        .hiw-nav-btn {
          border: 1.5px solid var(--border-strong); border-radius: 10px;
          padding: 0.6rem 1.4rem; font-weight: 700; cursor: pointer;
          background: var(--bg-surface); color: var(--text-primary);
          font-size: 0.88rem; transition: all 0.15s;
        }
        .hiw-nav-btn:hover { border-color: var(--accent); color: var(--accent-text); }
        .hiw-nav-btn.primary { background: var(--accent); color: #fff; border-color: var(--accent); }
        .hiw-nav-btn.primary:hover { filter: brightness(1.08); }

        .hiw-cal-row {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.5rem 0.75rem; border-radius: 8px;
          transition: background 0.3s;
        }
        .hiw-cal-row.active { background: var(--accent-dim); }

        .hiw-acc-bar-wrap { flex: 1; height: 6px; background: var(--bg-base); border-radius: 4px; overflow: hidden; }
        .hiw-acc-bar { height: 100%; border-radius: 4px; background: var(--green); transition: width 0.6s cubic-bezier(.22,1,.36,1); }
      `}</style>

      <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>

        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 1.75rem',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-header)',
          position: 'sticky', top: 0, zIndex: 20,
        }}>
          <button onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 800, fontSize: '1rem', letterSpacing: '0.06em' }}>
            <svg width="18" height="18" viewBox="0 0 48 46" fill="none">
              <path fill={accentColor} d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"/>
            </svg>
            SPEE
          </button>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button onClick={() => setLang(isTR ? 'en' : 'tr')} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 10px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', color: 'var(--text-primary)' }}>
              {isTR ? 'EN' : 'TR'}
            </button>
            <button onClick={() => navigate('/estimate')} style={{ background: accentColor, color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 16px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>
              {isTR ? 'Uygulamayı Aç →' : 'Open App →'}
            </button>
          </div>
        </div>

        {/* Step progress */}
        <div style={{ padding: '1.5rem 1.75rem 0', maxWidth: 900, margin: '0 auto', width: '100%' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--accent-text)', marginBottom: '1rem', textTransform: 'uppercase' }}>
            {isTR ? 'Nasıl Çalışır?' : 'How It Works'}
          </p>
          <div style={{ display: 'flex', gap: '0', position: 'relative' }}>
            {steps.map((s, i) => (
              <button
                key={i}
                onClick={() => goStep(i)}
                style={{
                  flex: 1, background: 'transparent', border: 'none', cursor: 'pointer',
                  textAlign: 'center', padding: '0 0.25rem 0.75rem',
                  borderBottom: `2.5px solid ${i === step ? 'var(--accent)' : i < step ? 'var(--green)' : 'var(--border)'}`,
                  transition: 'border-color 0.25s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.65rem', fontWeight: 800,
                    background: i === step ? 'var(--accent)' : i < step ? 'var(--green)' : 'var(--border)',
                    color: i <= step ? '#fff' : 'var(--text-secondary)',
                    transition: 'background 0.25s',
                  }}>
                    {i < step ? '✓' : i + 1}
                  </div>
                </div>
                <div style={{ fontSize: '0.72rem', fontWeight: i === step ? 700 : 500, color: i === step ? 'var(--text-primary)' : 'var(--text-secondary)', lineHeight: 1.3 }}>{s}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, maxWidth: 900, margin: '0 auto', width: '100%', padding: '1.5rem 1.75rem 3rem' }}>
          <div className={stepVisible ? 'hiw-step-visible' : 'hiw-step-hidden'} style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '2rem', alignItems: 'start' }}>

            {/* ── Left panel ── */}
            <div style={{ paddingTop: '0.5rem' }}>
              <div style={{ fontSize: '4rem', fontWeight: 900, color: 'var(--border)', lineHeight: 1, marginBottom: '0.5rem', userSelect: 'none' }}>
                0{step + 1}
              </div>
              {step === 0 && <>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>{isTR ? 'Önce görevi tanımla' : 'Start by defining the task'}</h2>
                <p style={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  {isTR
                    ? 'SPEE 8 farklı görev tipi için ayrı kriter setleri kullanır. User Story\'nin kriterleri bir bug fix\'ten tamamen farklıdır — motor her tipte farklı boyutları değerlendirir.'
                    : 'SPEE uses separate criterion sets for 8 task types. User Story criteria are completely different from a bug fix — the engine evaluates different dimensions for each type.'}
                </p>
                <div style={{ padding: '0.875rem 1rem', background: 'var(--bg-surface)', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  💡 {isTR ? 'Sağdaki kartlardan bir görev tipi seç. Motor o tipe özel kriter setini yükleyecek.' : 'Select a task type from the cards on the right. The engine will load the criteria set for that type.'}
                </div>
              </>}
              {step === 1 && <>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>{isTR ? 'Her kriteri ekibinin gözünden değerlendir' : 'Score each criterion from your team\'s perspective'}</h2>
                <p style={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  {isTR
                    ? 'Her kriter 1-5 arası puanlanır. Puanlar ağırlıklı olarak birleştirilir. Deneyimli takımlar zamanla hangi kriterin ne ağırlık taşıdığını da kalibre eder.'
                    : 'Each criterion is scored 1–5. Scores are combined with weights. Experienced teams also calibrate which criterion carries what weight over time.'}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {criteria.map(c => (
                    <div key={c.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{isTR ? c.labelTR : c.labelEN}</span>
                      <span style={{ fontWeight: 700, color: 'var(--accent-text)' }}>×{Math.round(c.weight * 100)}%</span>
                    </div>
                  ))}
                </div>
              </>}
              {step === 2 && <>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>{isTR ? 'Kural tabanlı motor devreye giriyor' : 'The rule-based engine kicks in'}</h2>
                <p style={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  {isTR
                    ? 'Motor ağırlıklı ortalamayı Fibonacci skalasına dönüştürür. Makine öğrenmesi yok — deterministik, açıklanabilir, takım kalibrasyonuyla gelişen bir sistem.'
                    : 'The engine maps the weighted average to the Fibonacci scale. No machine learning — deterministic, explainable, and improved by team calibration.'}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '1rem' }}>
                  {FIBONACCI.map(f => (
                    <div key={f} style={{
                      padding: '0.3rem 0.65rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.88rem',
                      background: f === sp ? 'var(--accent)' : 'var(--bg-surface)',
                      color: f === sp ? '#fff' : 'var(--text-secondary)',
                      border: `1.5px solid ${f === sp ? 'var(--accent)' : 'var(--border)'}`,
                      transition: 'all 0.3s',
                    }}>{f}</div>
                  ))}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
                  {isTR ? '↑ Motor bu skalada en uygun değeri önerir' : '↑ Engine suggests the most fitting value on this scale'}
                </p>
              </>}
              {step === 3 && <>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>{isTR ? 'Her sprintle daha isabetli' : 'More accurate with every sprint'}</h2>
                <p style={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  {isTR
                    ? 'Tahmin onaylandıktan sonra gerçek SP girilir. Motor bu farktan öğrenir. Birkaç sprint içinde tahminler takımın gerçek hızına uyum sağlar.'
                    : 'After an estimate is approved, the actual SP is entered. The engine learns from the difference. Within a few sprints, estimates align with the team\'s real velocity.'}
                </p>
                <div style={{ padding: '0.875rem 1rem', background: 'var(--bg-surface)', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '0.82rem', lineHeight: 1.65, color: 'var(--text-secondary)' }}>
                  {isTR
                    ? '🔁 Kalibrasyon döngüsü: Tahmin → Onay → Gerçek SP → Kalibrasyon → Daha iyi tahmin'
                    : '🔁 Calibration loop: Estimate → Approve → Actual SP → Calibration → Better estimate'}
                </div>
              </>}
            </div>

            {/* ── Right panel (demo) ── */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem', minHeight: '380px' }}>

              {/* Step 0: Task type selection */}
              {step === 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    {isTR ? 'Görev Tipi' : 'Task Type'}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    {TASK_TYPES.map(tt => (
                      <button
                        key={tt.key}
                        className={`hiw-task-card${taskType === tt.key ? ' active' : ''}`}
                        onClick={() => { setTaskType(tt.key); setVals({}); }}
                      >
                        <span style={{ fontSize: '1.2rem' }}>{tt.icon}</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>{isTR ? tt.labelTR : tt.labelEN}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{isTR ? tt.descTR : tt.descEN}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                  {taskType && (
                    <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--accent-dim)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--accent-text)', fontWeight: 600 }}>
                      ✓ {isTR ? `${CRITERIA_MAP[taskType].length} kriter yüklendi` : `${CRITERIA_MAP[taskType].length} criteria loaded`}
                    </div>
                  )}
                </div>
              )}

              {/* Step 1: Criteria scoring */}
              {step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    {isTR ? 'Kriterler' : 'Criteria'} · {TASK_TYPES.find(t => t.key === taskType)?.[isTR ? 'labelTR' : 'labelEN']}
                  </div>
                  {criteria.map((c, i) => (
                    <div key={c.key} style={{ animation: `hiw-fade-up 0.3s ${i * 0.07}s both` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{isTR ? c.labelTR : c.labelEN}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginLeft: '0.4rem' }}>{isTR ? c.descTR : c.descEN}</span>
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--accent-text)', minWidth: 24, textAlign: 'right' }}>{getVal(c.key)}</span>
                      </div>
                      <div className="hiw-dot-row">
                        {[1,2,3,4,5].map(v => (
                          <div key={v} className={`hiw-dot${getVal(c.key) >= v ? ' filled' : ''}`} onClick={() => setVal(c.key, v)} />
                        ))}
                        <div className="hiw-bar-wrap" style={{ flex: 1 }}>
                          <div className="hiw-bar" style={{ width: `${((getVal(c.key) - 1) / 4) * 100}%`, transition: 'width 0.2s' }} />
                        </div>
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: '0.25rem', padding: '0.6rem 0.75rem', background: 'var(--bg-base)', borderRadius: '8px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {isTR ? `Ham skor: ${(score * 100).toFixed(0)}/100 → Fibonacci: ${sp} SP` : `Raw score: ${(score * 100).toFixed(0)}/100 → Fibonacci: ${sp} SP`}
                  </div>
                </div>
              )}

              {/* Step 2: Result reveal */}
              {step === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '340px', gap: '1.25rem' }}>
                  {!revealed ? (
                    <>
                      <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                        {isTR ? 'Kriterler ağırlıklı şekilde hesaplandı.' : 'Criteria have been weighted and calculated.'}
                        <br />{isTR ? 'Sonucu hazır mısın?' : 'Ready to see the result?'}
                      </div>
                      <button className="hiw-reveal-btn" onClick={handleReveal}>
                        {isTR ? '⚡ Tahmini Göster' : '⚡ Reveal Estimate'}
                      </button>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {criteria.map(c => (
                          <div key={c.key} style={{ textAlign: 'center' }}>
                            <div style={{ width: 6, height: `${getVal(c.key) * 12}px`, background: 'var(--accent)', borderRadius: 3, margin: '0 auto 4px', opacity: 0.5, transition: 'height 0.3s' }} />
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', maxWidth: 40, textAlign: 'center' }}>{getVal(c.key)}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="hiw-sp-bubble">{counting}</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Story Points</div>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                        <div style={{ textAlign: 'center', padding: '0.6rem 1rem', background: 'var(--bg-base)', borderRadius: '10px' }}>
                          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--green)' }}>{confidence}%</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{isTR ? 'Güven' : 'Confidence'}</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '0.6rem 1rem', background: 'var(--bg-base)', borderRadius: '10px' }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>T-Shirt</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{isTR ? 'Teknik' : 'Technique'}</div>
                        </div>
                      </div>
                      <div style={{ width: '100%', marginTop: '0.5rem' }}>
                        {criteria.map((c, i) => (
                          <div key={c.key} style={{ marginBottom: '0.4rem', animation: `hiw-fade-up 0.3s ${i * 0.1}s both` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                              <span>{isTR ? c.labelTR : c.labelEN}</span>
                              <span>{getVal(c.key)}/5</span>
                            </div>
                            <div className="hiw-bar-wrap">
                              <div className="hiw-bar" style={{ width: `${(getVal(c.key) / 5) * 100}%`, animationDelay: `${i * 0.1}s` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Step 3: Calibration */}
              {step === 3 && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '1rem' }}>
                    {isTR ? 'Kalibrasyon Geçmişi' : 'Calibration History'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {CAL_ROUNDS.slice(0, calRound + 1).map((r, i) => (
                      <div key={r.sprint} className={`hiw-cal-row${i === calRound ? ' active' : ''}`} style={{ animation: `hiw-fade-up 0.3s ${i === calRound ? '0s' : '0s'} both` }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', minWidth: 52 }}>Sprint {r.sprint}</div>
                        <div style={{ fontSize: '0.78rem', minWidth: 80 }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{isTR ? 'Tahmin' : 'Est.'}: </span>
                          <span style={{ fontWeight: 700 }}>{r.estimated}</span>
                          <span style={{ color: 'var(--text-secondary)', marginLeft: '0.4rem' }}>{isTR ? 'Gerçek' : 'Act.'}: </span>
                          <span style={{ fontWeight: 700, color: r.estimated === r.actual ? 'var(--green)' : 'var(--text-primary)' }}>{r.actual}</span>
                        </div>
                        <div className="hiw-acc-bar-wrap">
                          <div className="hiw-acc-bar" style={{ width: `${r.accuracy}%` }} />
                        </div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--green)', minWidth: 36, textAlign: 'right' }}>{r.accuracy}%</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {calRound < CAL_ROUNDS.length - 1 ? (
                      <button
                        className="hiw-reveal-btn"
                        style={{ opacity: calAnimating ? 0.6 : 1 }}
                        onClick={handleCalibrate}
                        disabled={calAnimating}
                      >
                        {calAnimating ? '...' : isTR ? `Sprint ${calRound + 2} → Kalibre Et` : `Sprint ${calRound + 2} → Calibrate`}
                      </button>
                    ) : (
                      <div style={{ padding: '0.6rem 1rem', background: 'var(--accent-dim)', borderRadius: '10px', color: 'var(--accent-text)', fontWeight: 700, fontSize: '0.88rem' }}>
                        🎯 {isTR ? '%95 isabetlilik — motor kalibre edildi!' : '95% accuracy — engine calibrated!'}
                      </div>
                    )}
                    {calRound > 0 && (
                      <button onClick={() => setCalRound(0)} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem 0.8rem', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {isTR ? 'Sıfırla' : 'Reset'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', alignItems: 'center' }}>
            <button className="hiw-nav-btn" onClick={() => step > 0 ? goStep(step - 1) : navigate('/')} style={{ visibility: step === 0 ? 'hidden' : 'visible' }}>
              ← {isTR ? 'Önceki' : 'Previous'}
            </button>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{step + 1} / {steps.length}</div>
            {step < steps.length - 1 ? (
              <button className="hiw-nav-btn primary" onClick={() => goStep(step + 1)}>
                {isTR ? 'Sonraki' : 'Next'} →
              </button>
            ) : (
              <button className="hiw-nav-btn primary" onClick={() => navigate('/estimate')}>
                {isTR ? 'Dene →' : 'Try It →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
