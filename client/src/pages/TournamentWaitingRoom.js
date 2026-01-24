import React, { useContext, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Container from '../components/layout/Container'
import Button from '../components/buttons/Button'
import socketContext from '../context/websocket/socketContext'
import globalContext from '../context/global/globalContext'
import Swal from 'sweetalert2'
import './TournamentLobby.scss'

const TournamentWaitingRoom = () => {
  const navigate = useNavigate()
  const { tournamentId } = useParams()
  const { socket } = useContext(socketContext)
  const { walletAddress } = useContext(globalContext)
  const [tournament, setTournament] = useState(null)
  const [countdown, setCountdown] = useState(null)

  useEffect(() => {
    if (socket && tournamentId) {
      // Request tournament info
      socket.emit('GET_TOURNAMENT_INFO', { tournamentId: parseInt(tournamentId) })

      // Listen for tournament updates
      socket.on('TOURNAMENT_INFO', (info) => {
        console.log('Tournament info received:', info)
        setTournament(info)
        
        // If tournament started, redirect to play page
        if (info.status === 'live') {
          navigate(`/tournament/${tournamentId}?mode=player`)
        }
      })

      socket.on('TOURNAMENT_UPDATE', (info) => {
        console.log('Tournament update:', info)
        if (info.id === parseInt(tournamentId)) {
          setTournament(info)
          
          // If tournament started, redirect to play page
          if (info.status === 'live') {
            Swal.fire({
              title: 'Tournament Starting!',
              text: 'The tournament is about to begin',
              icon: 'success',
              timer: 2000,
              showConfirmButton: false
            }).then(() => {
              navigate(`/tournament/${tournamentId}?mode=player`)
            })
          }
        }
      })

      return () => {
        socket.off('TOURNAMENT_INFO')
        socket.off('TOURNAMENT_UPDATE')
      }
    }
  }, [socket, tournamentId, navigate])

  // Countdown timer
  useEffect(() => {
    if (tournament && tournament.registrationEndsAt) {
      const interval = setInterval(() => {
        const now = new Date()
        const endsAt = new Date(tournament.registrationEndsAt)
        const diff = endsAt - now
        
        if (diff <= 0) {
          setCountdown('Starting soon...')
          clearInterval(interval)
        } else {
          const minutes = Math.floor(diff / 60000)
          const seconds = Math.floor((diff % 60000) / 1000)
          setCountdown(`${minutes}:${seconds.toString().padStart(2, '0')}`)
        }
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [tournament])

  // Listen for socket events
  useEffect(() => {
    if (socket) {
      socket.on('BOTS_ADDED', (result) => {
        console.log('Bots added:', result)
        Swal.close()
        if (result.success) {
          Swal.fire({
            icon: 'success',
            title: 'Bots Added!',
            text: result.message || `Added ${result.count} bot(s)`,
            timer: 2000
          })
        }
      })

      socket.on('TOURNAMENT_DELETED', (result) => {
        console.log('Tournament deleted:', result)
        Swal.close()
        if (result.success) {
          Swal.fire({
            icon: 'success',
            title: 'Tournament Deleted',
            text: 'The tournament has been deleted',
            timer: 2000
          }).then(() => {
            navigate('/tournament-lobby')
          })
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Delete Failed',
            text: result.message || 'Could not delete tournament'
          })
        }
      })

      socket.on('TOURNAMENT_REGISTERED', (result) => {
        console.log('Registration result:', result)
        Swal.close()
        if (result.success) {
          Swal.fire({
            icon: 'success',
            title: 'Registration Successful!',
            text: 'You are now registered for the tournament',
            timer: 2000
          })
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Registration Failed',
            text: result.message || 'Could not register for tournament'
          })
        }
      })

      return () => {
        socket.off('BOTS_ADDED')
        socket.off('TOURNAMENT_DELETED')
        socket.off('TOURNAMENT_REGISTERED')
      }
    }
  }, [socket, navigate])

  const handleLeave = () => {
    navigate('/tournament-lobby')
  }

  if (!tournament) {
    return (
      <Container fullHeight style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <h2>Loading tournament...</h2>
        </div>
      </Container>
    )
  }

  const isUserRegistered = tournament.registeredPlayers?.some(p => p.id === walletAddress || p.walletAddress === walletAddress)

  return (
    <Container fullHeight style={{ padding: '2rem', backgroundColor: '#0a0e27' }}>
      <div style={{ 
        maxWidth: '900px', 
        margin: '0 auto',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        padding: '2rem',
        color: 'white'
      }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '2rem',
          borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
          paddingBottom: '1rem'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '2rem' }}>{tournament.name}</h1>
            <div style={{ 
              display: 'inline-block',
              padding: '0.25rem 0.75rem',
              borderRadius: '4px',
              backgroundColor: tournament.status === 'registering' ? '#f39c12' : '#27ae60',
              color: 'white',
              fontSize: '0.875rem',
              marginTop: '0.5rem'
            }}>
              {tournament.status === 'registering' ? 'Registration Open' : tournament.status.toUpperCase()}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {tournament.status === 'registering' && (
              <>
                <Button 
                  small
                  onClick={async () => {
                    const { value: botCount } = await Swal.fire({
                      title: 'Add Bots',
                      input: 'number',
                      inputLabel: 'How many bots to add?',
                      inputValue: 2,
                      inputAttributes: {
                        min: 1,
                        max: 10,
                        step: 1
                      },
                      showCancelButton: true,
                      confirmButtonText: 'Add Bots'
                    })
                    
                    if (botCount && socket) {
                      socket.emit('ADD_BOTS_TO_TOURNAMENT', {
                        tournamentId: parseInt(tournamentId),
                        botCount: parseInt(botCount)
                      })
                      
                      Swal.fire({
                        title: 'Adding Bots...',
                        text: 'Please wait',
                        allowOutsideClick: false,
                        didOpen: () => {
                          Swal.showLoading()
                        }
                      })
                    }
                  }}
                >
                  Add Bots
                </Button>
                <Button 
                  small
                  onClick={() => {
                    if (socket) {
                      socket.emit('START_TOURNAMENT', { tournamentId: parseInt(tournamentId) })
                      Swal.fire({
                        title: 'Starting Tournament...',
                        text: 'The tournament is being started',
                        timer: 2000,
                        showConfirmButton: false
                      })
                    }
                  }}
                >
                  Start Now
                </Button>
                <Button 
                  small
                  secondary
                  onClick={async () => {
                    const result = await Swal.fire({
                      title: 'Delete Tournament?',
                      text: 'This action cannot be undone!',
                      icon: 'warning',
                      showCancelButton: true,
                      confirmButtonColor: '#d33',
                      cancelButtonColor: '#3085d6',
                      confirmButtonText: 'Yes, delete it!',
                      cancelButtonText: 'Cancel'
                    })

                    if (result.isConfirmed && socket) {
                      socket.emit('DELETE_TOURNAMENT', { tournamentId: parseInt(tournamentId) })
                      
                      Swal.fire({
                        title: 'Deleting...',
                        text: 'Please wait',
                        allowOutsideClick: false,
                        didOpen: () => {
                          Swal.showLoading()
                        }
                      })
                    }
                  }}
                  style={{ backgroundColor: '#d33', borderColor: '#d33' }}
                >
                  Delete
                </Button>
              </>
            )}
            <Button secondary onClick={handleLeave}>
              Leave
            </Button>
          </div>
        </div>

        {/* Tournament Info Grid */}
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
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{tournament.startingChips?.toLocaleString() || 0}</div>
          </div>
        </div>

        {/* Countdown */}
        {tournament.status === 'registering' && countdown && (
          <div style={{ 
            textAlign: 'center',
            padding: '2rem',
            backgroundColor: 'rgba(243, 156, 18, 0.1)',
            borderRadius: '8px',
            marginBottom: '2rem',
            border: '2px solid rgba(243, 156, 18, 0.3)'
          }}>
            <div style={{ fontSize: '0.875rem', color: '#f39c12', marginBottom: '0.5rem' }}>
              Tournament Starts In
            </div>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#f39c12' }}>
              {countdown}
            </div>
          </div>
        )}

        {/* Registration Status */}
        {!isUserRegistered && tournament.status === 'registering' && ( 
          <div style={{ 
            textAlign: 'center',
            padding: '1.5rem',
            backgroundColor: 'rgba(231, 76, 60, 0.1)',
            borderRadius: '8px',
            marginBottom: '2rem',
            border: '2px solid rgba(231, 76, 60, 0.3)'
          }}>
            <p style={{ margin: '0 0 1rem 0', color: '#e74c3c', fontSize: '1.125rem' }}>
              ⚠️ You are not registered for this tournament
            </p>
            <Button
              onClick={async () => {
                // Check if username is set, if not ask for it
                let playerUsername = localStorage.getItem('username')
                if (!playerUsername || playerUsername.trim() === '') {
                  const { value: enteredUsername } = await Swal.fire({
                    title: 'Enter Your Username',
                    input: 'text',
                    inputLabel: 'Choose a username for the tournament',
                    inputPlaceholder: 'Enter your username',
                    showCancelButton: true,
                    confirmButtonText: 'Register',
                    cancelButtonText: 'Cancel',
                    inputValidator: (value) => {
                      if (!value) {
                        return 'You need to enter a username!'
                      }
                      if (value.length < 3) {
                        return 'Username must be at least 3 characters!'
                      }
                      if (value.length > 20) {
                        return 'Username must be less than 20 characters!'
                      }
                    }
                  })

                  if (!enteredUsername) {
                    return
                  }

                  playerUsername = enteredUsername
                }
                
                // Generate random wallet if not present
                let userWallet = walletAddress
                if (!userWallet || userWallet.trim() === '') {
                  userWallet = 'wallet_' + Math.random().toString(36).substring(2, 15)
                }
                
                if (socket) {
                  socket.emit('REGISTER_TOURNAMENT', { 
                    tournamentId: parseInt(tournamentId), 
                    walletAddress: userWallet,
                    username: playerUsername
                  })
                  
                  Swal.fire({
                    title: 'Registering...',
                    text: 'Please wait while we register you for the tournament',
                    allowOutsideClick: false,
                    didOpen: () => {
                      Swal.showLoading()
                    }
                  })
                }
              }}
            >
              Register Now
            </Button>
          </div>
        )}

        {isUserRegistered && (
          <div style={{ 
            textAlign: 'center',
            padding: '1.5rem',
            backgroundColor: 'rgba(39, 174, 96, 0.1)',
            borderRadius: '8px',
            marginBottom: '2rem',
            border: '2px solid rgba(39, 174, 96, 0.3)'
          }}>
            <p style={{ margin: 0, color: '#27ae60', fontSize: '1.125rem' }}>
              ✓ You are registered and ready to play!
            </p>
          </div>
        )}

        {/* Registered Players */}
        <div>
          <h3 style={{ marginBottom: '1rem' }}>
            Registered Players ({tournament.registeredPlayers?.length || 0})
          </h3>
          <div style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '8px',
            padding: '1rem',
            maxHeight: '300px',
            overflowY: 'auto'
          }}>
            {tournament.registeredPlayers && tournament.registeredPlayers.length > 0 ? (
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {tournament.registeredPlayers.map((player, index) => (
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
            ) : (
              <div style={{ textAlign: 'center', color: '#aaa', padding: '2rem' }}>
                No players registered yet
              </div>
            )}
          </div>
        </div>
      </div>
    </Container>
  )
}

export default TournamentWaitingRoom
