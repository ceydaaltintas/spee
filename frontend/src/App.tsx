import { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import EstimatePage from './pages/EstimatePage';
import HistoryPage from './pages/HistoryPage';
import TeamConfigPage from './pages/TeamConfigPage';
import CalibrationPage from './pages/CalibrationPage';
import StandalonePage from './pages/StandalonePage';
import './App.css';

export default function App() {
  const [teamId, setTeamId] = useState(() => localStorage.getItem('spee_team_id') || '');

  function handleTeamChange(id: string) {
    setTeamId(id);
    localStorage.setItem('spee_team_id', id);
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/standalone" element={<StandalonePage />} />
        <Route path="*" element={
          <div className="app">
            <header>
              <h1>SPEE</h1>
              <span className="subtitle">Story Point Tahmin Motoru</span>
              <div className="team-select">
                <label>
                  Takım No:
                  <input
                    value={teamId}
                    onChange={e => handleTeamChange(e.target.value)}
                    placeholder="Takım UUID değerini girin"
                  />
                </label>
              </div>
            </header>

            <nav>
              <NavLink to="/">Tahmin</NavLink>
              <NavLink to="/history">Geçmiş</NavLink>
              <NavLink to="/config">Ayarlar</NavLink>
              <NavLink to="/calibration">Kalibrasyon</NavLink>
              <NavLink to="/standalone" style={{ marginLeft: 'auto', color: '#6ee7b7' }}>Bağımsız Mod</NavLink>
            </nav>

            <main>
              {!teamId ? (
                <div className="empty-state">
                  <p>Başlamak için yukarıya bir Takım No girin.</p>
                  <p style={{ marginTop: '1rem' }}>
                    <NavLink to="/standalone" style={{ color: '#38bdf8' }}>
                      → API olmadan bağımsız modu kullan
                    </NavLink>
                  </p>
                </div>
              ) : (
                <Routes>
                  <Route path="/" element={<EstimatePage teamId={teamId} />} />
                  <Route path="/history" element={<HistoryPage teamId={teamId} />} />
                  <Route path="/config" element={<TeamConfigPage teamId={teamId} />} />
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
