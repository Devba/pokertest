import React, { useContext, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import socketContext from '../../../context/websocket/socketContext'

const WREliminatedPlayers = ({ tournament }) => {
  const { socket } = useContext(socketContext)
  const [eliminatedPlayers, setEliminatedPlayers] = useState(() =>
    Array.isArray(tournament?.eliminatedPlayers) ? tournament.eliminatedPlayers : []
  )

  useEffect(() => {
    if (!Array.isArray(tournament?.eliminatedPlayers)) return

    setEliminatedPlayers((prev) => {
      if (prev.length === tournament.eliminatedPlayers.length) {
        return prev
      }
      return tournament.eliminatedPlayers
    })
  }, [tournament?.eliminatedPlayers])

  // Listen for TOURNAMENT_UPDATE events to track eliminations
  useEffect(() => {
    if (!socket || !tournament) {
      return
    }

    const handler = (updatedTournament) => {
      // Only process updates for our tournament
      if (updatedTournament.id !== tournament.id) {
        return
      }

      if (updatedTournament.eliminatedPlayers && Array.isArray(updatedTournament.eliminatedPlayers)) {
        setEliminatedPlayers((prev) => {
          if (prev.length === updatedTournament.eliminatedPlayers.length) {
            return prev
          }
          return [...updatedTournament.eliminatedPlayers]
        })
      }
    }

    socket.on('TOURNAMENT_UPDATE', handler)
    return () => socket.off('TOURNAMENT_UPDATE', handler)
  }, [socket, tournament?.id])

  if (!tournament) {
    return null
  }

  // Always show the panel when tournament is live, even with 0 eliminations
  if (tournament.status !== 'live' && eliminatedPlayers.length === 0) {
    return null
  }

  // Sort by position (lower position = eliminated later = finished higher)
  const sortedEliminated = [...eliminatedPlayers].sort((a, b) => a.position - b.position)

  return (
    <div style={{
      backgroundColor: '#1a1d29',
      borderRadius: '8px',
      padding: '16px',
      marginTop: '16px',
      border: '1px solid #2d3142'
    }}>
      <h3 style={{
        color: '#ff6b6b',
        margin: '0 0 12px 0',
        fontSize: '16px',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        💀 Eliminated Players ({eliminatedPlayers.length})
      </h3>
      
      <div style={{
        maxHeight: '300px',
        overflowY: 'auto'
      }}>
        {sortedEliminated.map((eliminated, index) => {
          // Get player name from different possible fields
          const playerName = eliminated.playerName || 
                           eliminated.name || 
                           (eliminated.player?.name) || 
                           (eliminated.player?.username) ||
                           `Player ${eliminated.player || eliminated.playerId}`
          
          const position = eliminated.position
          const eliminatedAt = eliminated.eliminatedAt ? new Date(eliminated.eliminatedAt).toLocaleTimeString() : ''

          return (
            <div
              key={`eliminated-${index}-${position}`}
              style={{
                backgroundColor: '#252836',
                borderRadius: '6px',
                padding: '10px 12px',
                marginBottom: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: '1px solid #2d3142',
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: position === 1 ? '#ffd700' :
                         position === 2 ? '#c0c0c0' :
                         position === 3 ? '#cd7f32' :
                         '#888',
                  minWidth: '30px'
                }}>
                  #{position}
                </span>
                <span style={{
                  color: '#e0e0e0',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  {playerName}
                </span>
              </div>
              
              {eliminatedAt && (
                <span style={{
                  color: '#888',
                  fontSize: '12px'
                }}>
                  {eliminatedAt}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

WREliminatedPlayers.propTypes = {
  tournament: PropTypes.object
}

export default WREliminatedPlayers
