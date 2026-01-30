import React from 'react';

const RegisteredPlayersList = ({ tournament, walletAddress }) => {
  if (!tournament?.registeredPlayers || tournament.registeredPlayers.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: '#aaa', padding: '2rem' }}>
        No players registered yet
      </div>
    );
  }

  const sortedPlayers = tournament.status === 'live'
    ? [...tournament.registeredPlayers].sort((a, b) => (b.chips || 0) - (a.chips || 0))
    : tournament.registeredPlayers;

  return (
    <div>
      <h3 style={{ marginBottom: '1rem' }}>
        Registered Players ({tournament.registeredPlayers.length})
      </h3>
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        padding: '1rem',
        maxHeight: '300px',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {sortedPlayers.map((player, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem',
                backgroundColor: player.walletAddress === walletAddress
                  ? 'rgba(39, 174, 96, 0.1)'
                  : 'rgba(255, 255, 255, 0.03)',
                borderRadius: '4px',
                border: player.walletAddress === walletAddress
                  ? '1px solid rgba(39, 174, 96, 0.3)'
                  : '1px solid transparent'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{
                  color: '#aaa',
                  fontSize: '0.875rem',
                  minWidth: '30px'
                }}>
                  #{index + 1}
                </span>
                <span>{player.name}</span>
                {tournament.status === 'live' && (
                  <span style={{
                    fontSize: '0.95rem',
                    color: '#f39c12',
                    fontWeight: 'bold',
                    marginLeft: '1rem'
                  }}>
                    {player.chips?.toLocaleString() || 0} chips
                  </span>
                )}
                {player.walletAddress === walletAddress && (
                  <span style={{
                    fontSize: '0.75rem',
                    color: '#27ae60',
                    fontWeight: 'bold'
                  }}>
                    (You)
                  </span>
                )}
              </div>
              {player.isBot && (
                <span style={{
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.5rem',
                  backgroundColor: 'rgba(52, 152, 219, 0.2)',
                  color: '#3498db',
                  borderRadius: '4px'
                }}>
                  BOT
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RegisteredPlayersList;