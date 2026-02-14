import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Container from '../components/layout/Container';
import axios from 'axios';
import './AdminMonitor.scss';

// Helper function to format time since last hand
const formatTimeSince = (timestamp) => {
  if (!timestamp) return 'No hand started';
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now - then;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  
  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins}m ${diffSecs % 60}s ago`;
  return `${diffHours}h ${diffMins % 60}m ago`;
};

const AdminMonitor = () => {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [tournamentDetails, setTournamentDetails] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(60);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [nextRefreshTime, setNextRefreshTime] = useState(null);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [lowPowerMode, setLowPowerMode] = useState(false);

  // Cleanup socket connections on mount/unmount to reduce server load
  useEffect(() => {
    return () => {
      // Close any background socket connections when leaving admin monitor
      if (window.socket && window.socket.connected) {
        console.log('Closing socket connections from admin monitor');
        window.socket.emit('CS_DISCONNECT');
        window.socket.close();
      }
    };
  }, []);

  // Fetch all tournaments
  const fetchTournaments = async () => {
    try {
      const { data } = await axios.get('/api/tournaments/list');
      if (data.success) {
        setTournaments(data.tournaments);
        setLastUpdate(new Date());
        setNextRefreshTime(new Date(Date.now() + refreshInterval * 1000));
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      if (error.response?.status === 429) {
        console.warn('Rate limited - slowing down requests');
        setAutoRefresh(false);
      }
    }
  };

  // Fetch tournament details
  const fetchTournamentDetails = async (tournamentId) => {
    try {
      const { data } = await axios.get(`/api/tournaments/${tournamentId}`);
      if (data.success) {
        setTournamentDetails(data.tournament);
      }
    } catch (error) {
      console.error('Error fetching tournament details:', error);
      if (error.response?.status === 429) {
        console.warn('Rate limited - slowing down requests');
        setAutoRefresh(false);
      }
    }
  };

  // Fetch leaderboard
  const fetchLeaderboard = async (tournamentId) => {
    try {
      const { data } = await axios.get(`/api/tournaments/${tournamentId}/leaderboard`);
      if (data.success) {
        setLeaderboard(data.leaderboard);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      if (error.response?.status === 429) {
        console.warn('Rate limited - slowing down requests');
        setAutoRefresh(false);
      }
    }
  };

  const handleStartHand = async (tableId) => {
    if (!selectedTournament) return;

    try {
      await axios.post(`/api/tournaments/${selectedTournament}/tables/${tableId}/start-hand`);
      await new Promise((resolve) => setTimeout(resolve, 500));
      await fetchTournamentDetails(selectedTournament);
      await new Promise((resolve) => setTimeout(resolve, 500));
      await fetchLeaderboard(selectedTournament);
    } catch (error) {
      console.error('Error starting hand:', error);
      if (error.response?.status === 429) {
        console.warn('Rate limited - slowing down requests');
        setAutoRefresh(false);
      }
    }
  };

  // Select tournament
  const handleSelectTournament = async (tournamentId) => {
    setSelectedTournament(tournamentId);
    await new Promise(resolve => setTimeout(resolve, 500));
    await fetchTournamentDetails(tournamentId);
    await new Promise(resolve => setTimeout(resolve, 500));
    await fetchLeaderboard(tournamentId);
  };

  // Auto-refresh effect
  useEffect(() => {
    // Initial fetch with delays to avoid rate limiting
    const initialFetch = async () => {
      await fetchTournaments();
      if (selectedTournament) {
        await new Promise(resolve => setTimeout(resolve, 500));
        await fetchTournamentDetails(selectedTournament);
        await new Promise(resolve => setTimeout(resolve, 500));
        await fetchLeaderboard(selectedTournament);
      }
    };
    
    initialFetch();
    
    if (autoRefresh) {
      const actualInterval = lowPowerMode ? refreshInterval * 2 : refreshInterval;
      setNextRefreshTime(new Date(Date.now() + actualInterval * 1000));
      const interval = setInterval(async () => {
        await fetchTournaments();
        if (selectedTournament) {
          // Add delay between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
          await fetchTournamentDetails(selectedTournament);
          await new Promise(resolve => setTimeout(resolve, 500));
          await fetchLeaderboard(selectedTournament);
        }
      }, actualInterval * 1000);
      
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, selectedTournament, lowPowerMode]);

  // Countdown timer effect
  useEffect(() => {
    if (!autoRefresh || !nextRefreshTime) return;
    
    const countdownInterval = setInterval(() => {
      const now = new Date();
      const diff = Math.max(0, Math.floor((nextRefreshTime - now) / 1000));
      setCountdownSeconds(diff);
    }, 1000);
    
    return () => clearInterval(countdownInterval);
  }, [autoRefresh, nextRefreshTime]);

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'registering': return '#FFA500';
      case 'live': return '#00FF00';
      case 'completed': return '#808080';
      default: return '#FFFFFF';
    }
  };

  return (
    <Container>
      <div className="admin-monitor">
        <div className="admin-header">
          <h1>🎰 Tournament Admin Monitor</h1>
          <div className="header-controls">
            <button onClick={() => navigate('/tournament-lobby')} className="btn-back">
              ← Back to Lobby
            </button>
            <div className="refresh-controls">
              <label>
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                Auto-refresh
              </label>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                disabled={!autoRefresh}
              >
                <option value="60">60s</option>
                <option value="120">2m</option>
                <option value="300">5m</option>
              </select>
              <label style={{ marginLeft: '15px' }}>
                <input
                  type="checkbox"
                  checked={lowPowerMode}
                  onChange={(e) => setLowPowerMode(e.target.checked)}
                  disabled={!autoRefresh}
                />
                Low Power Mode
              </label>
              <button onClick={fetchTournaments} className="btn-refresh">
                🔄 Refresh Now
              </button>
              {autoRefresh && countdownSeconds > 0 && (
                <div className="countdown" style={{ color: '#00CCFF' }}>
                  Next refresh in {countdownSeconds}s
                </div>
              )}
            </div>
          </div>
          {lastUpdate && (
            <div className="last-update">
              Last updated: {formatTime(lastUpdate)}
            </div>
          )}
        </div>

        <div className="admin-content">
          <div className="tournaments-panel">
            <h2>All Tournaments ({tournaments.length})</h2>
            <div className="tournaments-list">
              {tournaments.map((t) => (
                <div
                  key={t.id}
                  className={`tournament-card ${selectedTournament === t.id ? 'selected' : ''}`}
                  onClick={() => handleSelectTournament(t.id)}
                >
                  <div className="tournament-header">
                    <span className="tournament-id">#{t.id}</span>
                    <span
                      className="tournament-status"
                      style={{ color: getStatusColor(t.status) }}
                    >
                      ● {t.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="tournament-name">{t.name}</div>
                  <div className="tournament-stats">
                    <div>👥 {t.registeredPlayers}/{t.maxPlayers}</div>
                    <div>🎚️ Level {t.blindLevel}</div>
                  </div>
                  <div className="tournament-time">
                    Started: {formatTime(t.startTime)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {tournamentDetails && (
            <div className="details-panel">
              <h2>Tournament #{selectedTournament} Details</h2>
              
              <div className="info-section">
                <h3>📊 Overview</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="label">Status:</span>
                    <span className="value" style={{ color: getStatusColor(tournamentDetails.status) }}>
                      {tournamentDetails.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="label">Blind Level:</span>
                    <span className="value">{tournamentDetails.blindLevel}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Active Players:</span>
                    <span className="value">
                      {tournamentDetails.tables?.reduce((sum, t) => sum + t.activePlayers, 0) || 0}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="label">Eliminated:</span>
                    <span className="value">{tournamentDetails.eliminatedPlayers?.length || 0}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Total Tables:</span>
                    <span className="value">{tournamentDetails.tables?.length || 0}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Prize Pool:</span>
                    <span className="value">{tournamentDetails.prizePool}</span>
                  </div>
                </div>
              </div>

              <div className="info-section">
                <h3>🎲 Tables Status</h3>
                <div className="tables-grid">
                  {tournamentDetails.tables?.map((table) => (
                    <div key={table.id} className="table-card">
                      <div className="table-header">
                        <span className="table-name">{table.name}</span>
                        <span className="table-id">{table.id}</span>
                      </div>
                      <div className="table-stats">
                        <div className="stat">
                          <span className="stat-label">Active:</span>
                          <span className="stat-value">{table.activePlayers}/{table.maxPlayers}</span>
                        </div>
                        <div className="stat">
                          <span className="stat-label">Hand #:</span>
                          <span className="stat-value">{table.handSequence || 0}</span>
                        </div>
                        <div className="stat">
                          <span className="stat-label">Last Hand:</span>
                          <span className="stat-value hand-time" style={{
                            color: !table.handStartedAt ? '#888' : 
                                   table.handOver ? '#FFA500' : '#00FF00'
                          }}>
                            {formatTimeSince(table.handStartedAt)}
                          </span>
                        </div>
                        {table.handOver !== undefined && (
                          <div className="stat">
                            <span className="stat-label">Status:</span>
                            <span className="stat-value" style={{
                              color: table.handOver ? '#888' : '#00FF00'
                            }}>
                              {table.handOver ? '⏸ Idle' : '▶ Playing'}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="table-progress">
                        <div
                          className="progress-bar"
                          style={{
                            width: `${(table.activePlayers / table.maxPlayers) * 100}%`,
                            backgroundColor: table.activePlayers > 0 ? '#00FF00' : '#FF0000'
                          }}
                        />
                      </div>
                      <div className="table-actions">
                        <button
                          className="btn-start-hand"
                          onClick={() => handleStartHand(table.id)}
                          disabled={!table.handOver || table.activePlayers < 2}
                          title={
                            table.activePlayers < 2
                              ? 'Need at least 2 active players'
                              : table.handOver
                                ? 'Start new hand'
                                : 'Hand already in progress'
                          }
                        >
                          ▶ Start Hand
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="info-section">
                <h3>🏆 Leaderboard (Top 10)</h3>
                <div className="leaderboard-table">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Player</th>
                        <th>Chips</th>
                        <th>Table</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.slice(0, 10).map((player) => (
                        <tr key={player.walletAddress}>
                          <td className="position">#{player.position}</td>
                          <td className="name">{player.name}</td>
                          <td className="chips">{Math.round(player.chips).toLocaleString()}</td>
                          <td className="table">{player.tableId}</td>
                          <td className="status">
                            <span className={`status-badge ${player.status}`}>
                              {player.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {tournamentDetails.eliminatedPlayers?.length > 0 && (
                <div className="info-section">
                  <h3>💀 Recently Eliminated ({tournamentDetails.eliminatedPlayers.length})</h3>
                  <div className="eliminated-list">
                    {tournamentDetails.eliminatedPlayers.slice(-5).reverse().map((player, idx) => (
                      <div key={idx} className="eliminated-item">
                        <span className="player-name">{player.name || player.id}</span>
                        <span className="elimination-position">
                          Finished: #{tournamentDetails.eliminatedPlayers.length - idx}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!tournamentDetails && (
            <div className="details-panel empty">
              <div className="empty-state">
                <h2>👈 Select a tournament</h2>
                <p>Click on a tournament card to view its details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
};

export default AdminMonitor;
