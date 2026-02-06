import React, { useState, useEffect } from 'react'
import Button from '../buttons/Button'

const TournamentList = ({
  tournaments,
  selectedTournament,
  setSelectedTournament,
  navigate,
  getStatusBadge,
  filter
}) => {
  const [hiddenSet, setHiddenSet] = useState(() => {
    try {
      const raw = localStorage.getItem('hiddenTournaments')
      return raw ? new Set(JSON.parse(raw)) : new Set()
    } catch (e) {
      return new Set()
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('hiddenTournaments', JSON.stringify(Array.from(hiddenSet)))
    } catch (e) {
      // ignore
    }
  }, [hiddenSet])

  const toggleHidden = (id, e) => {
    if (e && e.stopPropagation) e.stopPropagation()
    setHiddenSet(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {tournaments.map((tournament) => {
        const isHidden = hiddenSet.has(tournament.id)
        if (isHidden) {
          return (
            <div
              key={tournament.id}
              style={{
                backgroundColor: '#0f1724',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.02)'
              }}
              onClick={() => setSelectedTournament(tournament)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ color: '#aaa' }}>{tournament.name} — hidden</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    small
                    secondary
                    onClick={(e) => toggleHidden(tournament.id, e)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '86px' }}
                  >
                    <span>Show</span>
                    <span style={{ fontSize: '1rem', lineHeight: 1 }}>▸</span>
                  </Button>
                </div>
              </div>
            </div>
          )
        }

        return (
          <div
            key={tournament.id}
            style={{
              backgroundColor: '#16213e',
              padding: '1.5rem',
              borderRadius: '8px',
              border: selectedTournament?.id === tournament.id ? '2px solid #007bff' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            onClick={() => setSelectedTournament(tournament)}
          >
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto',
              gap: '1rem',
              alignItems: 'center'
            }}>
              {/* Tournament Info */}
              <div>
                <h3 style={{ margin: '0 0 8px 0' }}>{tournament.name}</h3>
                <p style={{ margin: 0, color: '#aaa', fontSize: '14px' }}>{tournament.structure}</p>
              </div>

              {/* Buy-in */}
              <div>
                <p style={{ margin: 0, color: '#aaa', fontSize: '12px' }}>Buy-in</p>
                <p style={{ margin: 0, fontWeight: 'bold' }}>{tournament.buyIn === 0 ? 'FREE' : `$${tournament.buyIn}`}</p>
              </div>

              {/* Prize Pool */}
              <div>
                <p style={{ margin: 0, color: '#aaa', fontSize: '12px' }}>Prize Pool</p>
                <p style={{ margin: 0, fontWeight: 'bold', color: '#28a745' }}>${tournament.prizePool}</p>
              </div>

              {/* Players */}
              <div>
                <p style={{ margin: 0, color: '#aaa', fontSize: '12px' }}>Players</p>
                <p style={{ margin: 0, fontWeight: 'bold' }}>{tournament.registeredPlayers?.length || 0}/{tournament.maxPlayers}</p>
                <div style={{ width: '100%', height: '4px', backgroundColor: '#333', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${((tournament.registeredPlayers?.length || 0) / tournament.maxPlayers) * 100}%`, height: '100%', backgroundColor: '#007bff' }} />
                </div>
              </div>

              {/* Start Time / Status */}
              <div>
                { (tournament.status === 'registering' || tournament.status === 'upcoming') ? (
                  <>
                    <p style={{ margin: 0, color: '#aaa', fontSize: '12px' }}>Starts in</p>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>{tournament.startTime ? Math.max(0, Math.round((new Date(tournament.startTime) - new Date()) / 60000)) : 0} min</p>
                  </>
                ) : tournament.status === 'live' ? (
                  <>
                    <p style={{ margin: 0, color: '#aaa', fontSize: '12px' }}>Level</p>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>{tournament.blindLevel || 1}</p>
                  </>
                ) : null }
                <div style={{ marginTop: '4px' }}>{getStatusBadge(tournament.status)}</div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button small secondary onClick={(e) => { e.stopPropagation(); navigate(`/tournament/${tournament.id}/waiting`) }}>Waiting Room</Button>
                { (tournament.status === 'registering' || tournament.status === 'upcoming') && (
                  <Button small onClick={(e) => { e.stopPropagation(); navigate(`/tournament/${tournament.id}/waitingxx`) }}>View Tournament</Button>
                ) }
                { tournament.status === 'live' && (
                  <Button small secondary onClick={(e) => { e.stopPropagation(); navigate(`/tournament/${tournament.id}?mode=spectator`) }}>Watch</Button>
                ) }
                <Button
                  small
                  secondary
                  onClick={(e) => { e.stopPropagation(); toggleHidden(tournament.id, e) }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '86px' }}
                >
                  <span>{hiddenSet.has(tournament.id) ? 'Show' : 'Hide'}</span>
                  <span style={{ fontSize: '1rem', lineHeight: 1 }}>
                    {hiddenSet.has(tournament.id) ? '▸' : '▾'}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default TournamentList