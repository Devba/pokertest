import React, { useContext, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Container from '../components/layout/Container'
import Button from '../components/buttons/Button'
import socketContext from '../context/websocket/socketContext'
import globalContext from '../context/global/globalContext'
import Swal from 'sweetalert2'
import './TournamentLobby.scss'
import RegistrationStatus from '../components/alf/RegistrationStatus'
import gameContext from '../context/game/gameContext'
import WRPlayersTablePanel from '../components/alf/WR/WRPlayersTablePanel'
import WRRegisteredPlayers from '../components/alf/WR/WRRegisteredPlayers'
import TournamentInfoGrid from '../components/alf/WR/WRTournamentInfoGrid'
import WRActionButtons from '../components/alf/WR/WRActionButtons'
import WRConnectionIndicator from '../components/alf/WR/WRConnectionIndicator'
import ZipPanel from '../components/alf/WR/ZipPanel'

const TournamentWaitingRoom = () => {
  const navigate = useNavigate()
  const { tournamentId } = useParams()
  const { socket } = useContext(socketContext)
  const { walletAddress } = useContext(globalContext)
  const [tournament, setTournament] = useState(null)
  const [countdown, setCountdown] = useState(null)
  const { alfTPmode, setAlfMode } = useContext(gameContext)

/* useEffect(() => {
  alert("TournamentWaitingRoom mounted, alfTPmode:", {alfTPmode});
  //setAlfMode('waitingroom');
}, [alfTPmode, setAlfMode]);*/

  // Fetch tournament info on mount and listen for updates

  useEffect(() => {
    if (socket && tournamentId) {
      // Request tournament info  - TOURNAMENT_INFO
      socket.emit('GET_TOURNAMENT_INFO', { tournamentId: parseInt(tournamentId) })

      // Listen for tournament updates
      socket.on('TOURNAMENT_INFO', (info) => {
        console.log('Tournament info received:', info)
        setTournament(info)
        
        // If tournament started, redirect to play page
        if (false && info.status === 'live') {
          navigate(`/tournament/${tournamentId}?mode=player`)
        }
      })

      socket.on('TOURNAMENT_UPDATE', (info) => {
        console.log('Tournament update:', info)
        if (info.id === parseInt(tournamentId)) {
          setTournament(info)
          
          // If tournament started, redirect to play page
          //por ahora lo anulamos
          if (false && info.status === 'live') {
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

  const [showDebug, setShowDebug] = useState(false);
  const [showTablesPanel, setShowTablesPanel] = useState(false);
  if (!tournament) {
    return (
      <Container fullHeight style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <h2>Loading tournament...</h2>
        </div>
      </Container>
    )
  }

  const isUserRegistered = tournament.registeredPlayers?.some(p => p.id === walletAddress || 
    p.walletAddress === walletAddress)

  return (
    <Container fullHeight style={{ padding: '2rem', backgroundColor: '#0a0e27' }}>
      <div style={{ 
        width: '75%',
        maxWidth: '1200px',
        margin: '0 auto',
        position: 'relative',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        padding: '2rem',
        color: 'white'
      }}>
        {/* Header: Tournament name and status */}
        
       
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          gap: '1.5rem',
          marginBottom: '0.5rem',
        }}>
          <h1 style={{ margin: 0, fontSize: '2rem' }}>{tournament.name}</h1>
          <div style={{ 
            display: 'inline-block',
            padding: '0.25rem 0.75rem',
            borderRadius: '4px',
            backgroundColor: tournament.status === 'registering' ? '#f39c12' : '#27ae60',
            color: 'white',
            fontSize: '0.875rem',
            fontWeight: 600,
            letterSpacing: '0.03em'
          }}>
            {tournament.status === 'registering' ? 'Registration Open' : tournament.status.toUpperCase()}
          </div>
        </div>

        {/* top-right connection indicator */}
        <div style={{ position: 'absolute', top: 16, right: 20 }}>
          <WRConnectionIndicator socket={socket} />
        </div>
        <WRActionButtons
          tournamentStatus={tournament.status}
          socket={socket}
          tournamentId={tournamentId}
          handleLeave={handleLeave}
          navigate={navigate}
        />

        <TournamentInfoGrid tournament={tournament} />

           {/* Registration Status */}
        <RegistrationStatus
          isUserRegistered={isUserRegistered}
          tournament={tournament}
          walletAddress={walletAddress}
          socket={socket}
          tournamentId={tournamentId}
        />

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

         <div style={{ marginTop: '0.75rem' }}>
                      <ZipPanel title="Table Seats" defaultCollapsed={false}>
                        <WRPlayersTablePanel table={tournament.tables && tournament.tables[0]} walletAddress={walletAddress} />
                      </ZipPanel>
                    </div>
                  )}

     
        {/* <WRRegisteredPlayers players={tournament.registeredPlayers} status={tournament.status} walletAddress={walletAddress} /> */}


      {/* DEBUG: Show value of 'p' if available 
              <div style={{ marginBottom: '1rem' }}>
                <Button small secondary onClick={() => setShowDebug(v => !v)}>
                  {showDebug ? 'Hide RegisteredPlayers Debug' : 'Show RegisteredPlayers Debug'}
                </Button>
                {showDebug && (
                  <pre style={{color: 'yellow', background: '#222', padding: '0.5rem', borderRadius: '4px', fontSize: '0.9rem'}}>
                    {typeof tournament.registeredPlayers !== 'undefined' ? JSON.stringify(tournament.registeredPlayers, null, 2) : 'pRPis undefined'}
                  </pre>
                )}
              </div>

                {/* Tables debug / players panel (hideable) 
                <div style={{ marginBottom: '1rem' }}>
                  <Button small onClick={() => setShowTablesPanel(v => !v)}>
                    {showTablesPanel ? 'Hide Table Seats' : 'Show Table Seats'}
                  </Button>
                  {showTablesPanel && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <WRPlayersTablePanel table={tournament.tables && tournament.tables[0]} walletAddress={walletAddress} />
                    </div>
                  )}
                </div>*/}

      </div>
    </Container>
  )
}

export default TournamentWaitingRoom
