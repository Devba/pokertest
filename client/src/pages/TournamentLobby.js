import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Container from '../components/layout/Container'
import Button from '../components/buttons/Button'
import socketContext from '../context/websocket/socketContext'
import globalContext from '../context/global/globalContext'
import Swal from 'sweetalert2'
import './TournamentLobby.scss'

const TournamentLobby = () => {
  const navigate = useNavigate()
  const { socket } = useContext(socketContext)
  const { walletAddress } = useContext(globalContext)
  const [tournaments, setTournaments] = useState([])
  const [selectedTournament, setSelectedTournament] = useState(null)
  const [filter, setFilter] = useState('all') // all, upcoming, live, completed

  // Fetch tournaments from server
  useEffect(() => {
    if (socket) {
      // Request tournaments list
      socket.emit('GET_TOURNAMENTS');

      // Listen for tournaments list
      socket.on('TOURNAMENTS_LIST', (tournamentsList) => {
        console.log('Received tournaments:', tournamentsList);
        setTournaments(tournamentsList);
      });

      // Listen for tournament updates
      socket.on('TOURNAMENT_UPDATE', (tournamentInfo) => {
        console.log('Tournament updated:', tournamentInfo);
        setTournaments(prev => {
          const index = prev.findIndex(t => t.id === tournamentInfo.id);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = tournamentInfo;
            return updated;
          } else {
            return [...prev, tournamentInfo];
          }
        });
      });

      // Listen for tournament created
      socket.on('TOURNAMENT_CREATED', ({ tournament }) => {
        console.log('Tournament created:', tournament);
        setTournaments(prev => {
          // Check if tournament already exists
          const exists = prev.some(t => t.id === tournament.id);
          if (exists) {
            return prev;
          }
          return [...prev, tournament];
        });
      });

      return () => {
        socket.off('TOURNAMENTS_LIST');
        socket.off('TOURNAMENT_UPDATE');
        socket.off('TOURNAMENT_CREATED');
      };
    }
  }, [socket]);

  const handleRegister = (tournamentId) => {
    console.log('handleRegister called with:', tournamentId, 'socket:', !!socket, 'walletAddress:', walletAddress);
    
    // Generate random wallet if not present
    let userWallet = walletAddress;
    if (!userWallet || userWallet.trim() === '') {
      userWallet = 'wallet_' + Math.random().toString(36).substring(2, 15);
      console.log('Generated random wallet:', userWallet);
    }
    
    // Emit socket event to register for tournament
    if (socket) {
      socket.emit('REGISTER_TOURNAMENT', { 
        tournamentId, 
        walletAddress: userWallet 
      })
      console.log('Registering for tournament:', tournamentId, 'with wallet:', userWallet)
      
      // Show loading toast
      Swal.fire({
        title: 'Registering...',
        text: 'Please wait while we register you for the tournament',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading()
        }
      })
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'Cannot Register',
        text: 'Not connected to server'
      })
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

  // Listen for registration responses
  useEffect(() => {
    if (socket) {
      socket.on('TOURNAMENT_REGISTERED', (result) => {
        console.log('Registration result:', result)
        Swal.close() // Close any open Swal dialogs first
        if (result.success) {
          Swal.fire({
            icon: 'success',
            title: 'Registration Successful!',
            text: 'Click OK to join the tournament',
            confirmButtonText: 'Join Tournament'
          }).then((swalResult) => {
            if (swalResult.isConfirmed && result.tournamentId) {
              navigate(`/tournament/${result.tournamentId}`)
            }
          })
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Registration Failed',
            text: result.message || 'Could not register for tournament'
          })
        }
      })

      socket.on('TOURNAMENT_UNREGISTERED', (result) => {
        console.log('Unregistration result:', result)
        Swal.close() // Close any open Swal dialogs first
        if (result.success) {
          Swal.fire({
            icon: 'success',
            title: 'Unregistered',
            text: 'You have been unregistered from the tournament',
            timer: 2000
          })
        }
      })

      socket.on('TOURNAMENT_STARTED', (result) => {
        console.log('Tournament started:', result)
        if (result.success) {
          const tournamentId = result.tournamentId || result.tournament?.id;
          Swal.fire({
            icon: 'success',
            title: 'Tournament Starting!',
            text: 'The tournament is now starting. Click OK to join your table.',
            confirmButtonText: 'Join Table'
          }).then((swalResult) => {
            if (swalResult.isConfirmed && tournamentId) {
              // Navigate to tournament play
              navigate(`/tournament/${tournamentId}`)
            }
          })
        }
      })

      socket.on('TOURNAMENT_ERROR', (error) => {
        console.error('Tournament error:', error)
        Swal.close() // Close any open Swal dialogs first
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.error || 'An error occurred'
        })
      })

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

      return () => {
        socket.off('TOURNAMENT_REGISTERED')
        socket.off('TOURNAMENT_UNREGISTERED')
        socket.off('TOURNAMENT_STARTED')
        socket.off('TOURNAMENT_ERROR')
        socket.off('BOTS_ADDED')
      }
    }
  }, [socket, navigate])

  const filteredTournaments = tournaments.filter(t => 
    filter === 'all' ? true : t.status === filter
  )

  const getStatusBadge = (status) => {
    const colors = {
      registering: '#28a745',
      upcoming: '#28a745',
      live: '#dc3545',
      completed: '#6c757d',
      cancelled: '#6c757d'
    }
    return (
      <span style={{
        backgroundColor: colors[status] || '#6c757d',
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
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Button 
              small 
              onClick={async () => {
                const result = await Swal.fire({
                  title: 'Create New Tournament',
                  html: `
                    <div style="text-align: left; padding: 0.5rem;">
                      <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.3rem; font-weight: bold;">Tournament Name</label>
                        <input id="tournament-name" class="swal2-input" type="text" placeholder="My Tournament" style="width: 100%; margin: 0;" />
                      </div>
                      
                      <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.3rem; font-weight: bold;">Buy-in Amount ($)</label>
                        <input id="buy-in" class="swal2-input" type="number" placeholder="0" min="0" style="width: 100%; margin: 0;" />
                      </div>
                      
                      <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.3rem; font-weight: bold;">Max Players</label>
                        <select id="max-players" class="swal2-input" style="width: 100%; margin: 0;">
                          <option value="50">50</option>
                          <option value="100" selected>100</option>
                          <option value="200">200</option>
                          <option value="500">500</option>
                        </select>
                      </div>
                      
                      <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.3rem; font-weight: bold;">Starting Chips</label>
                        <select id="starting-chips" class="swal2-input" style="width: 100%; margin: 0;">
                          <option value="1000">1,000</option>
                          <option value="5000" selected>5,000</option>
                          <option value="10000">10,000</option>
                          <option value="20000">20,000</option>
                        </select>
                      </div>
                      
                      <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.3rem; font-weight: bold;">Blind Structure</label>
                        <select id="blind-structure" class="swal2-input" style="width: 100%; margin: 0;">
                          <option value="normal" selected>Normal (10 hands/level)</option>
                          <option value="turbo">Turbo (5 hands/level)</option>
                          <option value="hyper">Hyper Turbo (3 hands/level)</option>
                        </select>
                      </div>
                      
                      <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.3rem; font-weight: bold;">Registration Period</label>
                        <select id="registration-period" class="swal2-input" style="width: 100%; margin: 0;">
                          <option value="0">No Late Registration</option>
                          <option value="5" selected>5 minutes</option>
                          <option value="10">10 minutes</option>
                          <option value="15">15 minutes</option>
                          <option value="30">30 minutes</option>
                          <option value="60">1 hour</option>
                        </select>
                      </div>
                      
                      <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.3rem; font-weight: bold;">Start Time</label>
                        <select id="start-time" class="swal2-input" style="width: 100%; margin: 0;">
                          <option value="immediate" selected>Start Immediately</option>
                          <option value="5">In 5 minutes</option>
                          <option value="15">In 15 minutes</option>
                          <option value="30">In 30 minutes</option>
                          <option value="60">In 1 hour</option>
                        </select>
                      </div>
                    </div>
                  `,
                  showCancelButton: true,
                  confirmButtonText: 'Create Tournament',
                  cancelButtonText: 'Cancel',
                  width: '600px',
                  preConfirm: () => {
                    const name = document.getElementById('tournament-name').value;
                    const buyIn = document.getElementById('buy-in').value;
                    const maxPlayers = document.getElementById('max-players').value;
                    const startingChips = document.getElementById('starting-chips').value;
                    const blindStructure = document.getElementById('blind-structure').value;
                    const registrationPeriod = document.getElementById('registration-period').value;
                    const startTime = document.getElementById('start-time').value;
                    
                    if (!name) {
                      Swal.showValidationMessage('Please enter a tournament name');
                      return false;
                    }
                    
                    return {
                      name,
                      buyIn: parseFloat(buyIn) || 0,
                      maxPlayers: parseInt(maxPlayers),
                      startingChips: parseInt(startingChips),
                      blindStructure,
                      registrationPeriod: parseInt(registrationPeriod),
                      startTime
                    };
                  }
                });
                
                if (result.isConfirmed && socket) {
                  // Emit socket event to create tournament
                  socket.emit('CREATE_TOURNAMENT', {
                    ...result.value,
                    creatorWallet: walletAddress
                  });
                  
                  Swal.fire({
                    icon: 'success',
                    title: 'Tournament Created!',
                    text: `${result.value.name} has been created successfully.`,
                    timer: 3000
                  });
                  
                  console.log('Tournament created:', result.value);
                }
              }}
            >
              Create Tournament
            </Button>
            <Button 
              small 
              secondary
              onClick={() => navigate('/play')}
            >
              Play Cash Game
            </Button>
            <Button 
              small 
              secondary 
              onClick={() => navigate('/')}
            >
              Back to Main
            </Button>
          </div>
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
                    {tournament.registeredPlayers?.length || 0}/{tournament.maxPlayers}
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
                      width: `${((tournament.registeredPlayers?.length || 0) / tournament.maxPlayers) * 100}%`,
                      height: '100%',
                      backgroundColor: '#007bff'
                    }} />
                  </div>
                </div>

                {/* Start Time / Status */}
                <div>
                  {tournament.status === 'registering' || tournament.status === 'upcoming' ? (
                    <>
                      <p style={{ margin: 0, color: '#aaa', fontSize: '12px' }}>Starts in</p>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>
                        {tournament.startTime ? Math.max(0, Math.round((new Date(tournament.startTime) - new Date()) / 60000)) : 0} min
                      </p>
                    </>
                  ) : tournament.status === 'live' ? (
                    <>
                      <p style={{ margin: 0, color: '#aaa', fontSize: '12px' }}>Level</p>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>
                        {tournament.blindLevel || 1}
                      </p>
                    </>
                  ) : null}
                  <div style={{ marginTop: '4px' }}>
                    {getStatusBadge(tournament.status)}
                  </div>
                </div>

                {/* Action Button */}
                <div>
                  {(tournament.status === 'registering' || tournament.status === 'upcoming') && (
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
                  {(selectedTournament.status === 'registering' || selectedTournament.status === 'upcoming') && (
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
                              tournamentId: selectedTournament.id,
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
                            socket.emit('START_TOURNAMENT', { tournamentId: selectedTournament.id })
                            Swal.fire({
                              title: 'Starting Tournament...',
                              text: 'The tournament is being started',
                              timer: 2000,
                              showConfirmButton: false
                            })
                          }
                        }}
                      >
                        Start Tournament
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
