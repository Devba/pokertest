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
  const [now, setNow] = useState(Date.now())
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

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(interval)
  }, [])

  const formatDuration = (minutes) => {
    const safeMinutes = Math.max(0, Number.isFinite(minutes) ? Math.round(minutes) : 0)
    const hours = Math.floor(safeMinutes / 60)
    const mins = safeMinutes % 60

    if (hours > 0) {
      return `${hours}h ${mins}m`
    }

    return `${mins} min`
  }

  const getRegisteredCount = (tournament) => {
    if (Array.isArray(tournament.registeredPlayers)) {
      return tournament.registeredPlayers.length
    }

    if (typeof tournament.registeredPlayers === 'number') {
      return tournament.registeredPlayers
    }

    return 0
  }

  const getActivePlayersCount = (tournament) => {
    if (typeof tournament.activePlayers === 'number') {
      return tournament.activePlayers
    }

    const registeredCount = getRegisteredCount(tournament)
    const eliminatedCount = Array.isArray(tournament.eliminatedPlayers)
      ? tournament.eliminatedPlayers.length
      : 0

    if (tournament.status === 'live') {
      return Math.max(0, registeredCount - eliminatedCount)
    }

    return 0
  }

  const getTimingInfo = (tournament) => {
    if (tournament.status === 'registering' || tournament.status === 'upcoming') {
      const startsInMinutes = tournament.startTime
        ? Math.max(0, Math.round((new Date(tournament.startTime).getTime() - now) / 60000))
        : 0

      return {
        label: 'Starts in',
        value: formatDuration(startsInMinutes)
      }
    }

    if (tournament.status === 'live') {
      const startReference = tournament.actualStartTime || tournament.startTime
      const runningMinutes = startReference
        ? Math.max(0, Math.round((now - new Date(startReference).getTime()) / 60000))
        : 0

      return {
        label: 'Running for',
        value: formatDuration(runningMinutes)
      }
    }

    return {
      label: 'Status',
      value: '-'
    }
  }

  const getEliminatedPlayersCount = (tournament) => {
    if (Array.isArray(tournament.eliminatedPlayers)) {
      return tournament.eliminatedPlayers.length
    }

    const registeredCount = getRegisteredCount(tournament)
    const activePlayersCount = getActivePlayersCount(tournament)

    if (tournament.status === 'live') {
      return Math.max(0, registeredCount - activePlayersCount)
    }

    return 0
  }

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
        const registeredCount = getRegisteredCount(tournament)
        const activePlayersCount = getActivePlayersCount(tournament)
        const eliminatedPlayersCount = getEliminatedPlayersCount(tournament)
        const timing = getTimingInfo(tournament)
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
              gridTemplateColumns: 'minmax(240px, 2.1fr) minmax(520px, 3fr) auto',
              alignItems: 'center',
              gap: '1.25rem'
            }}>
              {/* Left: Tournament Info */}
              <div style={{ minWidth: 0 }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.3rem', lineHeight: 1.15 }}>{tournament.name}</h3>
                <p style={{ margin: 0, color: '#aaa', fontSize: '14px' }}>{tournament.structure}</p>
              </div>

              {/* Middle: Tournament Stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, minmax(56px, 1fr))',
                gap: '1rem',
                alignItems: 'center',
                minWidth: 0
              }}>
                <div>
                  <p style={{ margin: 0, color: '#aaa', fontSize: '12px' }}>Buy-in</p>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>{tournament.buyIn === 0 ? 'FREE' : `$${tournament.buyIn}`}</p>
                </div>

                <div>
                  <p style={{ margin: 0, color: '#aaa', fontSize: '12px' }}>Prize Pool</p>
                  <p style={{ margin: 0, fontWeight: 'bold', color: '#28a745' }}>${tournament.prizePool}</p>
                </div>

                <div>
                  <p style={{ margin: 0, color: '#aaa', fontSize: '12px' }}>Players</p>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>{registeredCount}/{tournament.maxPlayers}</p>
                  <div style={{ width: '100%', height: '4px', backgroundColor: '#333', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${(registeredCount / tournament.maxPlayers) * 100}%`, height: '100%', backgroundColor: '#007bff' }} />
                  </div>
                </div>

                <div>
                  <p style={{ margin: 0, color: '#aaa', fontSize: '12px' }}>Active</p>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>{activePlayersCount}</p>
                  {tournament.status === 'live' && (
                    <p style={{ margin: '4px 0 0 0', color: '#aaa', fontSize: '12px' }}>Lvl {tournament.blindLevel || 1}</p>
                  )}
                </div>

                <div>
                  <p style={{ margin: 0, color: '#aaa', fontSize: '12px' }}>Eliminated</p>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>{eliminatedPlayersCount}</p>
                </div>

                <div>
                  <p style={{ margin: 0, color: '#aaa', fontSize: '12px' }}>{timing.label}</p>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>{timing.value}</p>
                  <div style={{ marginTop: '4px' }}>{getStatusBadge(tournament.status)}</div>
                </div>
              </div>

              {/* Right: Action Buttons */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '8px',
                flexShrink: 0,
                minWidth: '390px',
                width: '390px',
                padding: '0.55rem',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.08)',
                backgroundColor: 'rgba(8, 20, 53, 0.7)',
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.02)'
              }}>
                <Button
                  small
                  secondary
                  onClick={(e) => { e.stopPropagation(); navigate(`/tournament/${tournament.id}/waiting`) }}
                  style={{ minWidth: '110px' }}
                >
                  Waiting Room
                </Button>
                { (tournament.status === 'registering' || tournament.status === 'upcoming') && (
                  <Button
                    small
                    onClick={(e) => { e.stopPropagation(); navigate(`/tournament/${tournament.id}/waitingxx`) }}
                    style={{ minWidth: '110px' }}
                  >
                    View Tournament
                  </Button>
                ) }
                { tournament.status === 'live' && (
                  <Button
                    small
                    secondary
                    onClick={(e) => { e.stopPropagation(); navigate(`/tournament/${tournament.id}?mode=spectator`) }}
                    style={{ minWidth: '110px' }}
                  >
                    Watch
                  </Button>
                ) }
                <Button
                  small
                  secondary
                  onClick={(e) => { e.stopPropagation(); toggleHidden(tournament.id, e) }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '86px', justifyContent: 'center' }}
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