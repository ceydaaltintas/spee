import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import EstimatePage from './pages/EstimatePage';
import HistoryPage from './pages/HistoryPage';
import TeamConfigPage from './pages/TeamConfigPage';
import CalibrationPage from './pages/CalibrationPage';
import StandalonePage from './pages/StandalonePage';
import BulkEstimatePage from './pages/BulkEstimatePage';
import api from './api/client';
import type { TeamConfig } from './api/types';
import './App.css';

const DEMO_TEAM_ID = '407ba291-d355-467e-9c7a-68b213ec1cf2';
const DEMO_TEAM = { id: DEMO_TEAM_ID, name: 'Demo Takım', sourceSystem: 'JIRA' };

type SavedTeam = { id: string; name: string; sourceSystem: string };

function loadSavedTeams(): SavedTeam[] {
  try {
    const raw = localStorage.getItem('spee_teams');
    if (!raw) return [DEMO_TEAM];
    const parsed = JSON.parse(raw) as SavedTeam[];
    if (!parsed.find(t => t.id === DEMO_TEAM_ID)) return [DEMO_TEAM, ...parsed];
    return parsed;
  } catch { return [DEMO_TEAM]; }
}

function saveTeams(teams: SavedTeam[]) {
  localStorage.setItem('spee_teams', JSON.stringify(teams));
}

export default function App() {
  const [teams, setTeams] = useState<SavedTeam[]>(loadSavedTeams);
  const [teamId, setTeamId] = useState(() => localStorage.getItem('spee_team_id') || DEMO_TEAM_ID);
  const [teamConfig, setTeamConfig] = useState<TeamConfig | null>(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('spee_theme') !== 'light');

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSource, setNewSource] = useState<'JIRA' | 'ADO'>('JIRA');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createdCode, setCreatedCode] = useState('');

  const [showJoin, setShowJoin] = useState(false);
  const [joinId, setJoinId] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  const [showTeamMenu, setShowTeamMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.classList.toggle('light-mode', !darkMode);
    localStorage.setItem('spee_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    if (!teamId) return;
    api.get<TeamConfig>(`/teams/${teamId}/config`)
      .then(r => setTeamConfig(r.data))
      .catch(() => setTeamConfig(null));
  }, [teamId]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowTeamMenu(false);
        setShowCreate(false);
        setShowJoin(false);
        setCreatedCode('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function switchTeam(id: string) {
    setTeamId(id);
    setTeamConfig(null);
    localStorage.setItem('spee_team_id', id);
    setShowTeamMenu(false);
  }

  function addAndSwitch(team: SavedTeam) {
    setTeams(prev => {
      const next = prev.find(t => t.id === team.id) ? prev : [team, ...prev];
      saveTeams(next);
      return next;
    });
    switchTeam(team.id);
  }

  function handleConfigSaved(updated: Partial<TeamConfig>) {
    setTeamConfig(prev => prev ? { ...prev, ...updated } : prev);
    if (updated.name || updated.sourceSystem) {
      setTeams(prev => {
        const next = prev.map(t => t.id === teamId ? { ...t, ...updated } : t);
        saveTeams(next);
        return next;
      });
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true); setCreateError('');
    try {
      const res = await api.post<{ id: string; name: string; sourceSystem: string; joinCode: string }>('/teams', {
        name: newName.trim(), sourceSystem: newSource,
      });
      addAndSwitch(res.data);
      setCreatedCode(res.data.joinCode);
      setNewName('');
    } catch { setCreateError('Takım oluşturulamadı.'); }
    finally { setCreating(false); }
  }

  async function handleJoin() {
    if (!joinId.trim()) return;
    setJoining(true); setJoinError('');
    try {
      const res = await api.get<{ id: string; name: string; sourceSystem: string }>(`/teams/join/${joinId.trim()}`);
      addAndSwitch({ id: res.data.id, name: res.data.name, sourceSystem: res.data.sourceSystem });
      setShowJoin(false); setJoinId('');
    } catch { setJoinError('Geçersiz giriş kodu.'); }
    finally { setJoining(false); }
  }

  const currentTeam = teams.find(t => t.id === teamId);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/standalone" element={<StandalonePage />} />
        <Route path="*" element={
          <div className="app">

            {/* ── Header ── */}
            <header>
              <div className="header-brand">
                <div className="header-logo-wrap">
                  <svg width="20" height="20" viewBox="0 0 48 46" fill="none">
                    <path fill="currentColor" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"/>
                  </svg>
                </div>
                <div>
                  <h1>SPEE</h1>
                  <span className="subtitle">Story Point Estimation Engine</span>
                </div>
              </div>

              <div className="header-actions" ref={dropdownRef}>
                <div className="team-chip-wrap">
                  <button
                    className="team-chip"
                    onClick={() => { setShowTeamMenu(v => !v); setShowCreate(false); setShowJoin(false); setCreatedCode(''); }}
                  >
                    <span className="team-chip-dot" />
                    <span className="team-chip-name">{currentTeam?.name ?? '—'}</span>
                    {teamConfig && (
                      <span className="team-chip-meta">{teamConfig.sourceSystem} · {teamConfig.activeTechnique}</span>
                    )}
                    <svg className="team-chip-chevron" width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>

                  {showTeamMenu && !showCreate && !showJoin && (
                    <div className="dropdown-panel">
                      <div className="dropdown-title">Takımlar</div>
                      {teams.map(t => (
                        <button
                          key={t.id}
                          className={`dropdown-team-item${t.id === teamId ? ' active' : ''}`}
                          onClick={() => switchTeam(t.id)}
                        >
                          <span className="team-chip-dot" style={{ background: t.id === teamId ? 'var(--accent)' : 'var(--border-strong)' }} />
                          {t.name}
                        </button>
                      ))}
                      <div className="dropdown-divider" />
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button className="dropdown-action" onClick={() => { setShowCreate(true); setShowTeamMenu(false); }}>
                          + Yeni Takım
                        </button>
                        <button className="dropdown-action" onClick={() => { setShowJoin(true); setShowTeamMenu(false); }}>
                          Kod ile Katıl
                        </button>
                      </div>
                    </div>
                  )}

                  {showCreate && (
                    <div className="dropdown-panel" style={{ minWidth: '280px' }}>
                      <div className="dropdown-title">Yeni Takım Oluştur</div>
                      {createdCode ? (
                        <>
                          <p className="dropdown-hint">Takım oluşturuldu. Giriş kodunu paylaş:</p>
                          <div className="join-code-display">{createdCode}</div>
                          <p className="dropdown-hint" style={{ textAlign: 'center' }}>Takım üyeleri bu kodla katılabilir</p>
                          <button onClick={() => { setShowCreate(false); setCreatedCode(''); }}>Tamam</button>
                        </>
                      ) : (
                        <>
                          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Takım adı" onKeyDown={e => e.key === 'Enter' && handleCreate()} autoFocus />
                          <select value={newSource} onChange={e => setNewSource(e.target.value as 'JIRA' | 'ADO')}>
                            <option value="JIRA">Jira</option>
                            <option value="ADO">Azure DevOps</option>
                          </select>
                          {createError && <p className="dropdown-error">{createError}</p>}
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button className="primary" onClick={handleCreate} disabled={creating || !newName.trim()}>
                              {creating ? '...' : 'Oluştur'}
                            </button>
                            <button onClick={() => { setShowCreate(false); setCreateError(''); }}>İptal</button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {showJoin && (
                    <div className="dropdown-panel" style={{ minWidth: '260px' }}>
                      <div className="dropdown-title">Takıma Katıl</div>
                      <input
                        value={joinId}
                        onChange={e => setJoinId(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                        placeholder="Giriş kodu (AB3X7K)"
                        onKeyDown={e => e.key === 'Enter' && joinId.length === 6 && handleJoin()}
                        autoFocus
                        style={{ letterSpacing: '0.2em', fontWeight: 600, textAlign: 'center' }}
                      />
                      {joinError && <p className="dropdown-error">{joinError}</p>}
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button className="primary" onClick={handleJoin} disabled={joining || joinId.length !== 6}>
                          {joining ? '...' : 'Katıl'}
                        </button>
                        <button onClick={() => { setShowJoin(false); setJoinError(''); setJoinId(''); }}>İptal</button>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  className="theme-toggle"
                  onClick={() => setDarkMode(d => !d)}
                  title={darkMode ? 'Aydınlık mod' : 'Koyu mod'}
                >
                  {darkMode ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                    </svg>
                  )}
                </button>
              </div>
            </header>

            {/* ── Nav ── */}
            <nav>
              <NavLink to="/" end>Tahmin</NavLink>
              <NavLink to="/history">Geçmiş</NavLink>
              <NavLink to="/config">Ayarlar</NavLink>
              <NavLink to="/calibration">Kalibrasyon</NavLink>
              <NavLink to="/bulk">Toplu Tahmin</NavLink>
              <div className="nav-spacer" />
              <NavLink to="/standalone" className="nav-standalone">Bağımsız Mod →</NavLink>
            </nav>

            <main>
              {!teamId ? (
                <div className="empty-state">
                  <p>Başlamak için yukarıdan bir takım seçin.</p>
                </div>
              ) : (
                <Routes>
                  <Route path="/" element={<EstimatePage teamId={teamId} teamConfig={teamConfig} />} />
                  <Route path="/history" element={<HistoryPage teamId={teamId} />} />
                  <Route path="/config" element={<TeamConfigPage teamId={teamId} onConfigSaved={handleConfigSaved} />} />
                  <Route path="/calibration" element={<CalibrationPage teamId={teamId} />} />
                  <Route path="/bulk" element={<BulkEstimatePage teamId={teamId} />} />
                </Routes>
              )}
            </main>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}
