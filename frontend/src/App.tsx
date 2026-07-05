import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import EstimatePage from './pages/EstimatePage';
import HistoryPage from './pages/HistoryPage';
import TeamConfigPage from './pages/TeamConfigPage';
import CalibrationPage from './pages/CalibrationPage';
import StandalonePage from './pages/StandalonePage';
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
  } catch {
    return [DEMO_TEAM];
  }
}

function saveTeams(teams: SavedTeam[]) {
  localStorage.setItem('spee_teams', JSON.stringify(teams));
}

export default function App() {
  const [teams, setTeams] = useState<SavedTeam[]>(loadSavedTeams);
  const [teamId, setTeamId] = useState(() => localStorage.getItem('spee_team_id') || DEMO_TEAM_ID);
  const [teamConfig, setTeamConfig] = useState<TeamConfig | null>(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('spee_theme') !== 'light');

  // create form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSource, setNewSource] = useState<'JIRA' | 'ADO'>('JIRA');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createdCode, setCreatedCode] = useState('');

  // join by code
  const [showJoin, setShowJoin] = useState(false);
  const [joinId, setJoinId] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

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

  function switchTeam(id: string) {
    setTeamId(id);
    setTeamConfig(null);
    localStorage.setItem('spee_team_id', id);
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
    setCreating(true);
    setCreateError('');
    try {
      const res = await api.post<{ id: string; name: string; sourceSystem: string; joinCode: string }>('/teams', {
        name: newName.trim(),
        sourceSystem: newSource,
      });
      addAndSwitch(res.data);
      setCreatedCode(res.data.joinCode);
      setNewName('');
    } catch {
      setCreateError('Takım oluşturulamadı.');
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin() {
    if (!joinId.trim()) return;
    setJoining(true);
    setJoinError('');
    try {
      const res = await api.get<{ id: string; name: string; sourceSystem: string; joinCode: string }>(`/teams/join/${joinId.trim()}`);
      addAndSwitch({ id: res.data.id, name: res.data.name, sourceSystem: res.data.sourceSystem });
      setShowJoin(false);
      setJoinId('');
    } catch {
      setJoinError('Geçersiz giriş kodu.');
    } finally {
      setJoining(false);
    }
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/standalone" element={<StandalonePage />} />
        <Route path="*" element={
          <div className="app">
            <header>
              <h1>SPEE</h1>
              <span className="subtitle">Story Point Estimation Engine</span>

              <div className="team-select" ref={dropdownRef}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className="team-name">
                    {teams.find(t => t.id === teamId)?.name ?? '—'}
                  </span>
                  <button
                    onClick={() => { setShowCreate(v => !v); setShowJoin(false); }}
                    style={{ fontSize: '0.75rem', padding: '4px 10px', whiteSpace: 'nowrap' }}
                  >
                    + Yeni
                  </button>
                  <button
                    onClick={() => { setShowJoin(v => !v); setShowCreate(false); setCreatedCode(''); }}
                    style={{ fontSize: '0.75rem', padding: '4px 10px', whiteSpace: 'nowrap' }}
                  >
                    Kod ile Katıl
                  </button>
                </div>
                {teamConfig && (
                  <span style={{ fontSize: '0.72rem', color: '#6ee7b7', marginTop: '3px', display: 'block' }}>
                    {teamConfig.sourceSystem} · {teamConfig.activeTechnique}
                  </span>
                )}

                {showCreate && (
                  <div className="dropdown-panel" style={{ minWidth: '260px' }}>
                    <div className="dropdown-title" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>Yeni Takım Oluştur</div>
                    {createdCode ? (
                      <>
                        <div style={{ fontSize: '0.78rem', color: '#6ee7b7' }}>Takım oluşturuldu. Giriş kodunu paylaş:</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '0.25em', color: '#38bdf8', textAlign: 'center', padding: '0.5rem', background: '#0f172a', borderRadius: '6px', border: '1px solid #0369a1' }}>
                          {createdCode}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#475569', textAlign: 'center' }}>Takım üyeleri bu kodla katılabilir</div>
                        <button onClick={() => { setShowCreate(false); setCreatedCode(''); }}>Tamam</button>
                      </>
                    ) : (
                      <>
                        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Takım adı" onKeyDown={e => e.key === 'Enter' && handleCreate()} autoFocus />
                        <select value={newSource} onChange={e => setNewSource(e.target.value as 'JIRA' | 'ADO')}>
                          <option value="JIRA">Jira</option>
                          <option value="ADO">Azure DevOps</option>
                        </select>
                        {createError && <div style={{ fontSize: '0.78rem', color: '#fca5a5' }}>{createError}</div>}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                  <div className="dropdown-panel" style={{ minWidth: '240px' }}>
                    <div className="dropdown-title" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>Takıma Katıl</div>
                    <input
                      value={joinId}
                      onChange={e => setJoinId(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                      placeholder="Giriş kodu (örn: AB3X7K)"
                      onKeyDown={e => e.key === 'Enter' && joinId.length === 6 && handleJoin()}
                      autoFocus
                      style={{ letterSpacing: '0.2em', fontWeight: 600, fontSize: '1rem', textAlign: 'center' }}
                    />
                    {joinError && <div style={{ fontSize: '0.78rem', color: '#fca5a5' }}>{joinError}</div>}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="primary" onClick={handleJoin} disabled={joining || joinId.length !== 6}>
                        {joining ? '...' : 'Katıl'}
                      </button>
                      <button onClick={() => { setShowJoin(false); setJoinError(''); setJoinId(''); }}>İptal</button>
                    </div>
                  </div>
                )}
              </div>
            </header>

            <nav>
              <NavLink to="/">Tahmin</NavLink>
              <NavLink to="/history">Geçmiş</NavLink>
              <NavLink to="/config">Ayarlar</NavLink>
              <NavLink to="/calibration">Kalibrasyon</NavLink>
              <NavLink to="/standalone" style={{ marginLeft: 'auto', color: '#6ee7b7' }}>Bağımsız Mod</NavLink>
              <button
                onClick={() => setDarkMode(d => !d)}
                style={{ marginLeft: '0.5rem', fontSize: '0.8rem', padding: '4px 10px' }}
                title={darkMode ? 'Aydınlık moda geç' : 'Koyu moda geç'}
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
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
                </Routes>
              )}
            </main>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}
