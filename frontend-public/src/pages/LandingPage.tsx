import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../contexts/LangContext';

const FEATURES_TR = [
  {
    icon: '⚡',
    title: 'Akıllı Tahmin',
    desc: 'Görev tipine özel kriterlerle dakikalar içinde güvenilir SP önerisi al. Kural tabanlı motor + AI analizi.',
  },
  {
    icon: '🎯',
    title: 'Kalibrasyon',
    desc: 'Sistem onayladığın gerçek SP\'lerden öğrenir. Her sprint sonrası tahminler daha isabetli hale gelir.',
  },
  {
    icon: '📊',
    title: 'Toplu Tahmin',
    desc: 'Excel\'den PBI listesini yükle, tüm backlog için otomatik metin analizi + tahmin çalıştır.',
  },
  {
    icon: '📌',
    title: 'Baz İşler',
    desc: 'Referans iş kalemleri tanımla. Motor bu geçmişten öğrenerek benzer işlerde daha doğru tahmin üretir.',
  },
];

const FEATURES_EN = [
  {
    icon: '⚡',
    title: 'Smart Estimation',
    desc: 'Get reliable SP suggestions in minutes with task-type-specific criteria. Rule-based engine + AI analysis.',
  },
  {
    icon: '🎯',
    title: 'Calibration',
    desc: 'The system learns from actual approved SPs. Estimates get more accurate after every sprint.',
  },
  {
    icon: '📊',
    title: 'Bulk Estimation',
    desc: 'Upload your PBI list from Excel and run automated text analysis + estimation across the whole backlog.',
  },
  {
    icon: '📌',
    title: 'Baselines',
    desc: 'Define reference work items. The engine learns from them and produces more accurate estimates for similar tasks.',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { lang, setLang } = useLang();
  const [visible, setVisible] = useState(false);
  const isTR = lang === 'tr';
  const features = isTR ? FEATURES_TR : FEATURES_EN;

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <style>{`
        @keyframes lp-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33%       { transform: translateY(-18px) rotate(1.5deg); }
          66%       { transform: translateY(-8px) rotate(-1deg); }
        }
        @keyframes lp-pulse-ring {
          0%   { transform: scale(1);   opacity: 0.35; }
          70%  { transform: scale(1.9); opacity: 0; }
          100% { transform: scale(1.9); opacity: 0; }
        }
        @keyframes lp-slide-up {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes lp-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes lp-shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        @keyframes lp-bar-grow {
          from { width: 0; }
          to   { width: 100%; }
        }
        .lp-hero-enter { animation: lp-fade-in 0.7s ease both; }
        .lp-tagline-enter { animation: lp-slide-up 0.7s cubic-bezier(.22,1,.36,1) 0.15s both; }
        .lp-sub-enter { animation: lp-slide-up 0.7s cubic-bezier(.22,1,.36,1) 0.28s both; }
        .lp-cta-enter { animation: lp-slide-up 0.7s cubic-bezier(.22,1,.36,1) 0.42s both; }
        .lp-cards-enter { animation: lp-slide-up 0.8s cubic-bezier(.22,1,.36,1) 0.55s both; }
        .lp-feature-card:hover {
          transform: translateY(-4px) scale(1.015);
          box-shadow: 0 12px 40px rgba(0,0,0,0.13);
          border-color: var(--accent-border);
        }
        .lp-cta-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(79,70,229,0.45);
          filter: brightness(1.08);
        }
        .lp-cta-btn:active { transform: translateY(0); }
        .lp-secondary-btn:hover {
          background: var(--accent-dim);
          border-color: var(--accent-border);
          color: var(--accent-text);
        }
        .lp-orb {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(60px);
          opacity: 0.18;
          animation: lp-float 9s ease-in-out infinite;
        }
        .lp-orb-2 { animation-delay: -3.5s; animation-duration: 11s; }
        .lp-orb-3 { animation-delay: -6s; animation-duration: 13s; }
        .lp-stat { text-align: center; }
        .lp-stat-num { font-size: 2rem; font-weight: 800; color: var(--accent-text); line-height: 1; }
        .lp-stat-label { font-size: 0.78rem; color: var(--text-secondary, #6b7280); margin-top: 4px; }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-base)',
        color: 'var(--text-primary)',
        fontFamily: 'inherit',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Decorative orbs */}
        <div className="lp-orb" style={{ width: 520, height: 520, background: 'var(--accent)', top: -120, left: -100 }} />
        <div className="lp-orb lp-orb-2" style={{ width: 380, height: 380, background: 'var(--green)', top: 200, right: -80 }} />
        <div className="lp-orb lp-orb-3" style={{ width: 260, height: 260, background: 'var(--accent)', bottom: 60, left: '40%' }} />

        {/* Top bar */}
        <div style={{
          position: 'relative', zIndex: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.25rem 2rem',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-header)',
          backdropFilter: 'blur(12px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <svg width="22" height="22" viewBox="0 0 48 46" fill="none">
              <path fill="var(--accent)" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"/>
            </svg>
            <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '0.08em' }}>SPEE</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={() => setLang(isTR ? 'en' : 'tr')}
              style={{
                background: 'transparent', border: '1px solid var(--border)',
                borderRadius: '6px', padding: '4px 10px',
                fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                color: 'var(--text-primary)',
              }}
            >
              {isTR ? 'EN' : 'TR'}
            </button>
            <button
              onClick={() => navigate('/estimate')}
              style={{
                background: 'var(--accent)', color: '#fff',
                border: 'none', borderRadius: '8px',
                padding: '6px 18px', fontWeight: 700,
                fontSize: '0.85rem', cursor: 'pointer',
              }}
            >
              {isTR ? 'Uygulamaya Gir' : 'Open App'}
            </button>
          </div>
        </div>

        {/* Hero */}
        <div style={{
          position: 'relative', zIndex: 5,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          textAlign: 'center', padding: '5rem 1.5rem 3.5rem',
          maxWidth: '820px', margin: '0 auto',
        }}>
          {/* Logo badge */}
          <div className={visible ? 'lp-hero-enter' : ''} style={{ marginBottom: '2rem', position: 'relative', display: 'inline-block' }}>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'var(--accent)', animation: 'lp-pulse-ring 2.4s cubic-bezier(.215,.61,.355,1) infinite',
            }} />
            <div style={{
              position: 'relative', width: 80, height: 80, borderRadius: '50%',
              background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 40px rgba(79,70,229,0.4)',
            }}>
              <svg width="36" height="34" viewBox="0 0 48 46" fill="none">
                <path fill="#ffffff" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"/>
              </svg>
            </div>
          </div>

          {/* Tagline */}
          <h1 className={visible ? 'lp-tagline-enter' : ''} style={{
            fontSize: 'clamp(2rem, 6vw, 3.5rem)',
            fontWeight: 900, lineHeight: 1.1, margin: '0 0 1.25rem',
            letterSpacing: '-0.03em',
          }}>
            {isTR ? (
              <>Takımınızı tanıyan<br /><span style={{ color: 'var(--accent-text)' }}>tahmin motoru</span></>
            ) : (
              <>The estimation engine<br /><span style={{ color: 'var(--accent-text)' }}>that knows your team</span></>
            )}
          </h1>

          <p className={visible ? 'lp-sub-enter' : ''} style={{
            fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
            color: 'var(--text-secondary, #6b7280)',
            maxWidth: '560px', lineHeight: 1.65, margin: '0 0 2.5rem',
          }}>
            {isTR
              ? 'Geçmiş veriden öğrenen, her tahminle daha isabetli hale gelen akıllı bir tahmin motoru. Takımınıza özel kalibrasyon, metin analizi ve çok boyutlu kriter değerlendirmesi.'
              : 'An intelligent estimation engine that learns from historical data and improves with every estimate. Team-specific calibration, text analysis, and multi-dimensional criteria scoring.'}
          </p>

          {/* CTA buttons */}
          <div className={visible ? 'lp-cta-enter' : ''} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              className="lp-cta-btn"
              onClick={() => navigate('/estimate')}
              style={{
                background: 'var(--accent)', color: '#fff',
                border: 'none', borderRadius: '12px',
                padding: '0.85rem 2.25rem', fontWeight: 800,
                fontSize: '1rem', cursor: 'pointer',
                transition: 'all 0.18s ease',
                boxShadow: '0 4px 20px rgba(79,70,229,0.35)',
              }}
            >
              {isTR ? 'Hemen Başla' : 'Get Started'}
            </button>
            <button
              className="lp-secondary-btn"
              onClick={() => navigate('/how')}
              style={{
                background: 'transparent',
                border: '1.5px solid var(--border-strong)',
                borderRadius: '12px',
                padding: '0.85rem 2rem', fontWeight: 700,
                fontSize: '1rem', cursor: 'pointer', color: 'var(--text-primary)',
                transition: 'all 0.18s ease',
              }}
            >
              {isTR ? 'Nasıl Çalışır?' : 'How It Works'}
            </button>
          </div>

          {/* Stats bar */}
          <div className={visible ? 'lp-cards-enter' : ''} style={{
            display: 'flex', gap: '2.5rem', marginTop: '3.5rem',
            padding: '1.5rem 2.5rem',
            background: 'var(--bg-surface)',
            borderRadius: '16px', border: '1px solid var(--border)',
            boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
            flexWrap: 'wrap', justifyContent: 'center',
          }}>
            {[
              { num: '8', label: isTR ? 'Görev Tipi' : 'Task Types' },
              { num: '30+', label: isTR ? 'Kriter Boyutu' : 'Criteria Dimensions' },
              { num: '5', label: isTR ? 'Tahmin Tekniği' : 'Estimation Techniques' },
              { num: '∞', label: isTR ? 'Kalibrasyon Döngüsü' : 'Calibration Cycles' },
            ].map((s, i) => (
              <div key={i} className="lp-stat">
                <div className="lp-stat-num">{s.num}</div>
                <div className="lp-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature cards */}
        <div className={visible ? 'lp-cards-enter' : ''} style={{
          position: 'relative', zIndex: 5,
          maxWidth: '960px', margin: '0 auto',
          padding: '0 1.5rem 5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
          gap: '1rem',
        }}>
          {features.map((f, i) => (
            <div
              key={i}
              className="lp-feature-card"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: '16px', padding: '1.5rem',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                animationDelay: `${0.6 + i * 0.1}s`,
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem', lineHeight: 1 }}>{f.icon}</div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.5rem' }}>{f.title}</div>
              <div style={{ fontSize: '0.82rem', lineHeight: 1.6, color: 'var(--text-secondary, #6b7280)' }}>{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Bottom CTA band */}
        <div style={{
          position: 'relative', zIndex: 5,
          background: 'var(--accent)', color: '#fff',
          textAlign: 'center', padding: '3rem 1.5rem',
        }}>
          <div style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)', fontWeight: 800, marginBottom: '1rem' }}>
            {isTR ? 'Takımınız için daha doğru tahminler.' : 'More accurate estimates for your team.'}
          </div>
          <div style={{ fontSize: '1rem', opacity: 0.85, marginBottom: '1.75rem' }}>
            {isTR ? 'Ücretsiz başla, takımını oluştur, ilk tahmini yap.' : 'Start free, create your team, make your first estimate.'}
          </div>
          <button
            onClick={() => navigate('/estimate')}
            style={{
              background: '#fff', color: 'var(--accent-hover, #4338ca)',
              border: 'none', borderRadius: '12px',
              padding: '0.85rem 2.5rem', fontWeight: 800,
              fontSize: '1rem', cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              transition: 'transform 0.15s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = '')}
          >
            {isTR ? 'Hemen Başla →' : 'Get Started →'}
          </button>
        </div>
      </div>
    </>
  );
}
