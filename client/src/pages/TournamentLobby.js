import React, { use, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Container from '../components/layout/Container'
import Button from '../components/buttons/Button'
import socketContext from '../context/websocket/socketContext'
import globalContext from '../context/global/globalContext'
import Swal from 'sweetalert2'
import './TournamentLobby.scss'
import { showCreateTournamentForm } from '../components/alf/CreateTourn';
import TournamentInitialBar from '../components/alf/tournamentInitialBar';
import TournamentList from '../components/alf/TournamentList';
import FondoMatrix from '../components/alf/matrix/fondo'


const TournamentLobby = () => {
  const navigate = useNavigate()
  const { socket } = useContext(socketContext)
  const { walletAddress, username } = useContext(globalContext)
  const{userName,userNamev2}=useContext(globalContext)
  const [tournaments, setTournaments] = useState([])
  const [selectedTournament, setSelectedTournament] = useState(null)
  const [filter, setFilter] = useState('all') // all, upcoming, live, completed

  const [blink, setBlink] = useState(false);


useEffect(() => {
  if (!socket) return;
  const handleDisconnect = () => {
    // Handle disconnect (e.g., show alert, set state, etc.)
    console.warn('Socket disconnected');
    // Optionally update state here
  };
  const handleError = (err) => {
    console.error('Socket error:', err);
    // Optionally update state here
     const interval = setInterval(() => setBlink(prev => !prev), 500);
    return () => clearInterval(interval);
  };
  socket.on('disconnect', handleDisconnect);
  socket.on('connect_error', handleError);
  socket.on('reconnect_failed', handleError);
  return () => {
    socket.off('disconnect', handleDisconnect);
    socket.off('connect_error', handleError);
    socket.off('reconnect_failed', handleError);
  };
}, [socket]);



useEffect(() => {
  return
  if (!socket) {
    const interval = setInterval(() => setBlink(prev => !prev), 500);
    return () => clearInterval(interval);
  } else {
    setBlink(false);
  }
}, [socket]);

  // Fetch tournaments from server
  useEffect(() => {
    if (socket) {
       setBlink(false);
      // Show all localStorage properties as JSON in alert
      const allLocalStorage = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        allLocalStorage[key] = localStorage.getItem(key);
      }
     // alert("socket connected in tournament lobby\n" + JSON.stringify(allLocalStorage, null, 2));
      // alert("socket connected in tournament lobby\n" + localStorage.getItem("userNamev2"));
     
     
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

  const handleRegister = async (tournamentId) => {
    console.log('handleRegister called with:', tournamentId, 'socket:', !!socket, 'walletAddress:', walletAddress);
    
    // Check if username is set, if not ask for it
    //let playerUsername = username;
      let playerUsername = localStorage.getItem('userNamev2');
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
      });

      if (!enteredUsername) {
        // User cancelled
        return;
      }

      playerUsername = enteredUsername;
    }
    
    // Generate random wallet if not present
    let userWallet = walletAddress//localStorage.getItem('wallet');
    if (  !userWallet || userWallet.trim() === '') {
      userWallet = 'wallet_' + Math.random().toString(36).substring(2, 15);

        localStorage.setItem('socketId', socket.id);         // Save current socket id
          localStorage.setItem('wallet', userWallet);       // Save wallet address
          localStorage.setItem('username', playerUsername);  
            localStorage.setItem('TournamentId', tournamentId);   
     
      console.log('wallet from LS :', userWallet);
    }
   
    
    // Emit socket event to register for tournament
    if (socket) {
      socket.emit('REGISTER_TOURNAMENT', { 
        tournamentId, 
        walletAddress: userWallet,
        username: playerUsername,socketId: localStorage.getItem('socketId')
      })
      console.log('Registering for tournament:', tournamentId, 'with wallet:', userWallet, 'username:', playerUsername)
      
      // Save to localStorage
              // Save tournament ID
              


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
      walletAddress: localStorage.getItem('wallet'),
      socketId: localStorage.getItem('socketId')
    });
    console.log('Unregistering from tournament:', tournamentId);
  }
}; // <-- Add this closing brace and semicolo

  const handleDeleteTournament = async (tournamentId) => {
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
      socket.emit('DELETE_TOURNAMENT', { tournamentId })
      
      Swal.fire({
        title: 'Deleting...',
        text: 'Please wait',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading()
        }
      })
    }
  }

  const isUserRegistered = (tournamentId) => {
    const tournament = tournaments.find(t => t.id === tournamentId)
    if (!tournament || !tournament.registeredPlayers) return false
    // registeredPlayers can be a number (count) or array, handle both
    if (Array.isArray(tournament.registeredPlayers)) {
      return tournament.registeredPlayers.some(p => p.id === walletAddress)
    }
    return false
  }

  // Listen for registration responses
  useEffect(() => {
    if (socket) {
      socket.on('TOURNAMENT_REGISTERED', (result) => {
        console.log('Registration result:', result)
        Swal.close() // Close any open Swal dialogs first
        if (result.success) {
          const tournamentId = result.tournamentId || result.tournament?.id
          Swal.fire({
            icon: 'success',
            title: 'Registration Successful!',
            text: 'Click OK to go to waiting room',
            confirmButtonText: 'Go to Waiting Room'
          }).then((swalResult) => {
            if (swalResult.isConfirmed && tournamentId) {
              navigate(`/tournament/${tournamentId}/waiting`)
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
            confirmButtonText: 'Join Table as player'
          }).then((swalResult) => {
            if (swalResult.isConfirmed && tournamentId) {
              // Navigate to tournament play
              navigate(`/tournament/${tournamentId}?mode=player`);
            }
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
          })
          setSelectedTournament(null)
          // Remove from local state
          setTournaments(prev => prev.filter(t => t.id !== result.tournamentId))
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Delete Failed',
            text: result.message || 'Could not delete tournament'
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
        socket.off('TOURNAMENT_DELETED')
        socket.off('TOURNAMENT_ERROR')
        socket.off('BOTS_ADDED')
      }
    } else {
      console.log('Socket not connected, cannot listen for tournament events')
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
      <div style={{ padding: '0 2rem 2rem 2rem', maxWidth: '1400px', margin: '0 auto', position: 'relative' }}>
        <FondoMatrix style={{ zIndex: 0, opacity: 0.12 }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '2rem',
          width: '100%'
        }}>

          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <h1
              style={{
                marginBottom: '0.5rem',
                animation: !socket ? 'blinker 1s linear infinite' : 'none',
                color: !socket && blink ? '#e74c3c' : undefined
              }}
            >
              Tournament Lobby
            </h1>
            <style>
              {`
                @keyframes blinker {
                  50% { opacity: 0; }
                }
              `}
            </style>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.75rem',
              background: 'rgba(44, 62, 80, 0.15)',
              border: '1px solid #2c3e50',
              borderRadius: '8px',
              padding: '0.5rem 1.25rem',
              fontSize: '1rem',
              color: '#fff',
              fontWeight: 500,
              boxShadow: '0 2px 8px 0 rgba(44,62,80,0.07)',
              marginBottom: '0.5rem',
              maxWidth: '100%',
              wordBreak: 'break-all'
            }}>
              <span style={{ color: '#aaa', fontWeight: 400 }}>Wallet:</span>
              <span style={{ color: '#00b894', fontFamily: 'monospace', fontSize: '0.98em' }}>{walletAddress || 'N/A'}</span>
              <span style={{ color: '#aaa', fontWeight: 400, marginLeft: '1.5rem' }}>Username:</span>
              <span style={{ color: '#0984e3', fontWeight: 600 }}>
                {userNamev2 || localStorage.getItem("userNamev2")  || 'N/A'}
              </span>
            </div>
          </div>
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            alignItems: 'flex-end',
            minWidth: '180px'
          }}>
            
            <Button 
              small 
              secondary 
              onClick={() => navigate('/')}
            >
              Back to Main
            </Button>
            <Button 
              small 
              onClick={async () => {
                const result = await showCreateTournamentForm(walletAddress);
                if (result.isConfirmed && socket) {
                  socket.emit('CREATE_TOURNAMENT', result.value);
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
                  <TournamentList
                      tournaments={filteredTournaments}
                      selectedTournament={selectedTournament}
                      setSelectedTournament={setSelectedTournament}
                      navigate={navigate}
                      getStatusBadge={getStatusBadge}
                      filter={filter}
        />

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
            <TournamentInitialBar
              selectedTournament={selectedTournament}
              onClose={() => setSelectedTournament(null)}
              onRegister={handleRegister}
              onUnregister={handleUnregister}
              onDelete={handleDeleteTournament}
              onAddBots={async (tournamentId, socket) => {
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
                });
                if (botCount && socket) {
                  socket.emit('ADD_BOTS_TO_TOURNAMENT', {
                    tournamentId,
                    botCount: parseInt(botCount)
                  });
                  Swal.fire({
                    title: 'Adding Bots...',
                    text: 'Please wait',
                    allowOutsideClick: false,
                    didOpen: () => {
                      Swal.showLoading();
                    }
                  });
                }
              }}
              onStart={(tournamentId) => {
                if (socket) {
                  socket.emit('START_TOURNAMENT', { tournamentId });
                  Swal.fire({
                    title: 'Starting Tournament...',
                    text: 'The tournament is being started',
                    timer: 2000,
                    showConfirmButton: false
                  });
                }
              }}
              isUserRegistered={isUserRegistered}
              navigate={navigate}
              socket={socket}
            />
          )}

        </div>
      </div>
    </Container>
  )
}

export default TournamentLobby
