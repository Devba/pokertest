

import React from 'react'
import PropTypes from 'prop-types'

const TournamentInfoGrid = ({ tournament = {} }) => {
  return (
    <div style={{ 
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '1.5rem',
      marginBottom: '2rem'
    }}>
      <div style={{ 
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        padding: '1rem',
        borderRadius: '8px'
      }}>
        <div style={{ fontSize: '0.875rem', color: '#aaa', marginBottom: '0.5rem' }}>Buy-in</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>${tournament.buyIn || 0}</div>
      </div>

      <div style={{ 
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        padding: '1rem',
        borderRadius: '8px'
      }}>
        <div style={{ fontSize: '0.875rem', color: '#aaa', marginBottom: '0.5rem' }}>Prize Pool</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#27ae60' }}>${tournament.prizePool || 0}</div>
      </div>

      <div style={{ 
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        padding: '1rem',
        borderRadius: '8px'
      }}>
        <div style={{ fontSize: '0.875rem', color: '#aaa', marginBottom: '0.5rem' }}>Players</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
          {tournament.registeredPlayers?.length || 0} / {tournament.maxPlayers}
        </div>
      </div>

      <div style={{ 
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        padding: '1rem',
        borderRadius: '8px'
      }}>
        <div style={{ fontSize: '0.875rem', color: '#aaa', marginBottom: '0.5rem' }}>Starting Chips</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{(tournament.startingChips || 0).toLocaleString()}</div>
      </div>
    </div>
  )
}

TournamentInfoGrid.propTypes = {
  tournament: PropTypes.object
}

export default TournamentInfoGrid
