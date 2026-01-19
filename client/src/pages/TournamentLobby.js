import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Container from '../components/layout/Container'
import Button from '../components/buttons/Button'
import socketContext from '../context/websocket/socketContext'
import globalContext from '../context/global/globalContext'
import './TournamentLobby.scss'

const TournamentLobby = () => {
  const navigate = useNavigate()
  const { socket } = useContext(socketContext)
  const { walletAddress } = useContext(globalContext)
  const [tournaments, setTournaments] = useState([])
  const [selectedTournament, setSelectedTournament] = useState(null)
  const [filter, setFilter] = useState('all') // all, upcoming, live, completed

  // Mock tournament data - replace with real API call
  useEffect(() => {
    const mockTournaments = [
      {
        id: 1,
        name: 'Daily Freeroll',
        buyIn: 0,
        prizePool: 1000,
        maxPlayers: 100,
        registeredPlayers: 45,
        startTime: new Date(Date.now() + 3600000), // 1 hour from now
        status: 'upcoming',
        structure: 'No Limit Hold\'em',
        blinds: '10/20',
        level: 1
      },
      {
        id: 2,
        name: 'Sunday Million',
        buyIn: 100,
        prizePool: 10000,
        maxPlayers: 500,
        registeredPlayers: 234,
        startTime: new Date(Date.now() + 7200000), // 2 hours from now
        status: 'upcoming',
        structure: 'No Limit Hold\'em',
        blinds: '25/50',
        level: 1
      },
      {
        id: 3,
        name: 'Turbo Bounty',
        buyIn: 50,
        prizePool: 5000,
        maxPlayers: 200,
        registeredPlayers: 156,
        startTime: new Date(Date.now() - 600000), // Started 10 mins ago
        status: 'live',
        structure: 'No Limit Hold\'em',
        blinds: '100/200',
        level: 5
      }
    ]
    setTournaments(mockTournaments)
  }, [])

  const handleRegister = (tournamentId) => {
    // Emit socket event to register for tournament
    if (socket && walletAddress) {
      socket.emit('REGISTER_TOURNAMENT', { 
        tournamentId, 
        walletAddress 
      })
      console.log('Registering for tournament:', tournamentId)
    }
  }

  const handleUnregister = (tournamentId) => {
    if (socket && walletAddress) {
      socket.emit('UNREGISTER_TOURNAMENT', { 
        tournamentId, 
        walletAddress 
      })
      console.log('Unregistering from tournament:', tournamentId)
    }
  }

  const filteredTournaments = tournaments.filter(t => 
    filter === 'all' ? true : t.status === filter
  )

  const getStatusBadge = (status) => {
    const colors = {
      upcoming: '#28a745',
      live: '#dc3545',
      completed: '#6c757d'
    }
    return (
      <span style={{
        backgroundColor: colors[status],
        color: 'white',
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 'bold'
      }}>
        {status.toUpperCase()}
      </span>
    )
  }

  return (
    <Container fullHeight style={{ backgroundColor: '#1a1a2e', color: 'white' }}>
      <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '2rem'
        }}>
          <h1>Tournament Lobby</h1>
          <Button small secondary onClick={() => navigate('/')}>
            Back to Main
          </Button>
        </div>

        {/* Filters */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          marginBottom: '2rem',
          borderBottom: '2px solid #333',
          paddingBottom: '1rem'
        }}>
          {['all', 'upcoming', 'live', 'completed'].map(filterType => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              style={{
                padding: '8px 20px',
                backgroundColor: filter === filterType ? '#007bff' : 'transparent',
                color: filter === filterType ? 'white' : '#aaa',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: filter === filterType ? 'bold' : 'normal',
                textTransform: 'capitalize'
              }}
            >
              {filterType}
            </button>
          ))}
        </div>

        {/* Tournament List */}
        <div style={{ display: 'grid', gap: '1rem' }}>
          {filteredTournaments.map(tournament => (
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
                  <p style={{ margin: 0, color: '#aaa', fontSize: '14px' }}>
                    {tournament.structure}
                  </p>
                </div>

                {/* Buy-in */}
                <div>
                  <p style={{ margin: 0, color: '#aaa', fontSize: '12px' }}>Buy-in</p>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>
                    {tournament.buyIn === 0 ? 'FREE' : `$${tournament.buyIn}`}
                  </p>
                </div>

                {/* Prize Pool */}
                <div>
                  <p style={{ margin: 0, color: '#aaa', fontSize: '12px' }}>Prize Pool</p>
                  <p style={{ margin: 0, fontWeight: 'bold', color: '#28a745' }}>
                    ${tournament.prizePool}
                  </p>
                </div>

                {/* Players */}
                <div>
                  <p style={{ margin: 0, color: '#aaa', fontSize: '12px' }}>Players</p>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>
                    {tournament.registeredPlayers}/{tournament.maxPlayers}
                  </p>
                  <div style={{
                    width: '100%',
                    height: '4px',
                    backgroundColor: '#333',
                    borderRadius: '2px',
                    marginTop: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${(tournament.registeredPlayers / tournament.maxPlayers) * 100}%`,
                      height: '100%',
                      backgroundColor: '#007bff'
                    }} />
                  </div>
                </div>

                {/* Start Time / Status */}
                <div>
                  {tournament.status === 'upcoming' ? (
                    <>
                      <p style={{ margin: 0, color: '#aaa', fontSize: '12px' }}>Starts in</p>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>
                        {Math.round((tournament.startTime - new Date()) / 60000)} min
                      </p>
                    </>
                  ) : tournament.status === 'live' ? (
                    <>
                      <p style={{ margin: 0, color: '#aaa', fontSize: '12px' }}>Level</p>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>
                        {tournament.level} - {tournament.blinds}
                      </p>
                    </>
                  ) : null}
                  <div style={{ marginTop: '4px' }}>
                    {getStatusBadge(tournament.status)}
                  </div>
                </div>

                {/* Action Button */}
                <div>
                  {tournament.status === 'upcoming' && (
                    <Button 
                      small 
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRegister(tournament.id)
                      }}
                    >
                      Register
                    </Button>
                  )}
                  {tournament.status === 'live' && (
                    <Button 
                      small 
                      secondary
                      onClick={(e) => {
                        e.stopPropagation()
                        // Navigate to tournament table
                        navigate(`/tournament/${tournament.id}`)
                      }}
                    >
                      Watch
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredTournaments.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '4rem', 
            color: '#aaa' 
          }}>
            <p>No tournaments found</p>
          </div>
        )}

        {/* Selected Tournament Details Panel */}
        {selectedTournament && (
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#0f3460',
            padding: '1.5rem',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
            zIndex: 1000
          }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: '0 0 8px 0' }}>{selectedTournament.name}</h3>
                  <p style={{ margin: 0, color: '#aaa' }}>
                    Structure: {selectedTournament.structure} | 
                    Buy-in: {selectedTournament.buyIn === 0 ? 'FREE' : `$${selectedTournament.buyIn}`} | 
                    Prize Pool: ${selectedTournament.prizePool}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <Button 
                    small 
                    secondary 
                    onClick={() => setSelectedTournament(null)}
                  >
                    Close
                  </Button>
                  {selectedTournament.status === 'upcoming' && (
                    <>
                      <Button 
                        small 
                        onClick={() => handleRegister(selectedTournament.id)}
                      >
                        Register Now
                      </Button>
                      <Button 
                        small 
                        secondary
                        onClick={() => handleUnregister(selectedTournament.id)}
                      >
                        Unregister
                      </Button>
                    </>
                  )}
                  {selectedTournament.status === 'live' && (
                    <Button 
                      small 
                      onClick={() => navigate(`/tournament/${selectedTournament.id}`)}
                    >
                      Join Table
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Container>
  )
}

export default TournamentLobby
