import React, { useContext, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Container from '../components/layout/Container'
import Button from '../components/buttons/Button'
import gameContext from '../context/game/gameContext'
import socketContext from '../context/websocket/socketContext'
import globalContext from '../context/global/globalContext'
import PokerTable from '../components/game/PokerTable'
import { RotateDevicePrompt } from '../components/game/RotateDevicePrompt'
import { PositionedUISlot } from '../components/game/PositionedUISlot'
import { PokerTableWrapper } from '../components/game/PokerTableWrapper'
import { Seat } from '../components/game/Seat/Seat'
import { InfoPill } from '../components/game/InfoPill'
import { GameUI } from '../components/game/GameUI'
import { GameStateInfo } from '../components/game/GameStateInfo'
import BrandingImage from '../components/game/BrandingImage'
import PokerCard from '../components/game/PokerCard'
import background from '../assets/img/background.png'
import Swal from 'sweetalert2'
import './Play.scss'

const TournamentPlay = () => {
  const navigate = useNavigate()
  const { tournamentId } = useParams()
  const { socket } = useContext(socketContext)
  const { walletAddress } = useContext(globalContext)
  const {
    messages,
    currentTable,
    seatId,
    joinTable,
    leaveTable,
    sitDown,
    standUp,
    fold,
    check,
    call,
    raise,
  } = useContext(gameContext)

  const [bet, setBet] = useState(0)
  const [tournamentInfo, setTournamentInfo] = useState(null)

  useEffect(() => {
    console.log('TournamentPlay mounted - tournamentId:', tournamentId, 'socket:', !!socket, 'walletAddress:', walletAddress);
    
    if (!socket) {
      console.log('No socket, redirecting to home');
      navigate('/')
      return
    }

    // Get tournament info and join tournament table
    if (socket && tournamentId) {
      console.log('Emitting GET_TOURNAMENT_TABLE for tournament:', tournamentId);
      socket.emit('GET_TOURNAMENT_TABLE', { tournamentId, walletAddress: walletAddress || 'spectator' })
    }

    return () => {
      if (currentTable) {
        console.log('Leaving table on unmount');
        leaveTable()
      }
    }
  }, [socket, walletAddress, tournamentId])

  useEffect(() => {
    if (socket) {
      socket.on('TOURNAMENT_TABLE_ASSIGNED', ({ tableId, tournament }) => {
        console.log('TOURNAMENT_TABLE_ASSIGNED received - tableId:', tableId, 'tournament:', tournament)
        setTournamentInfo(tournament)
        // Join the specific tournament table
        console.log('Joining table:', tableId)
        joinTable(tableId)
      })

      socket.on('TOURNAMENT_INFO', (info) => {
        console.log('TOURNAMENT_INFO received:', info)
        setTournamentInfo(info)
      })
      
      socket.on('TOURNAMENT_ERROR', (error) => {
        console.error('TOURNAMENT_ERROR:', error)
        Swal.fire({
          icon: 'error',
          title: 'Tournament Error',
          text: error.error || 'Could not load tournament'
        }).then(() => {
          navigate('/tournament-lobby')
        })
      })

      return () => {
        socket.off('TOURNAMENT_TABLE_ASSIGNED')
        socket.off('TOURNAMENT_INFO')
        socket.off('TOURNAMENT_ERROR')
      }
    }
  }, [socket, joinTable])

  useEffect(() => {
    if (currentTable) {
      currentTable.callAmount > currentTable.minBet
        ? setBet(currentTable.callAmount)
        : currentTable.pot > 0
        ? setBet(currentTable.minRaise)
        : setBet(currentTable.minBet)
    }
  }, [currentTable])

  const handleLeaveTournament = () => {
    Swal.fire({
      title: 'Leave Tournament?',
      text: 'Are you sure you want to leave? You will be eliminated!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, leave',
    }).then((result) => {
      if (result.isConfirmed) {
        leaveTable()
        navigate('/tournament-lobby')
      }
    })
  }

  return (
    <>
      <RotateDevicePrompt />
      <Container
        fullHeight
        style={{
          backgroundImage: `url(${background})`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'contain',
          backgroundPosition: 'center center',
          backgroundAttachment: 'fixed',
          backgroundColor: 'black',
        }}
        className="play-area"
      >
        {currentTable && (
          <>
            <PositionedUISlot
              top="2vh"
              left="1.5rem"
              scale="0.65"
              style={{ zIndex: '50' }}
            >
              <Button small secondary onClick={handleLeaveTournament}>
                Leave Tournament
              </Button>
            </PositionedUISlot>

            {/* Tournament Info */}
            {tournamentInfo && (
              <PositionedUISlot
                top="2vh"
                right="1.5rem"
                scale="0.65"
                style={{ zIndex: '50' }}
              >
                <div
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    color: 'white',
                    minWidth: '250px',
                  }}
                >
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>
                    {tournamentInfo.name}
                  </h4>
                  <div style={{ fontSize: '0.75rem', color: '#aaa' }}>
                    <div>Players: {tournamentInfo.activePlayers || 0}</div>
                    <div>
                      Blinds: Level {tournamentInfo.blindLevel || 1}
                    </div>
                    <div>Prize Pool: ${tournamentInfo.prizePool || 0}</div>
                  </div>
                </div>
              </PositionedUISlot>
            )}
          </>
        )}

        <PokerTableWrapper>
          <PokerTable />
          {currentTable && (
            <>
              <PositionedUISlot
                top="-5%"
                left="0"
                scale="0.55"
                origin="top left"
              >
                <Seat
                  seatNumber={1}
                  currentTable={currentTable}
                  sitDown={sitDown}
                />
              </PositionedUISlot>
              <PositionedUISlot
                top="-5%"
                right="2%"
                scale="0.55"
                origin="top right"
              >
                <Seat
                  seatNumber={2}
                  currentTable={currentTable}
                  sitDown={sitDown}
                />
              </PositionedUISlot>
              <PositionedUISlot
                bottom="15%"
                right="2%"
                scale="0.55"
                origin="bottom right"
              >
                <Seat
                  seatNumber={3}
                  currentTable={currentTable}
                  sitDown={sitDown}
                />
              </PositionedUISlot>
              <PositionedUISlot bottom="8%" scale="0.55" origin="bottom center">
                <Seat
                  seatNumber={4}
                  currentTable={currentTable}
                  sitDown={sitDown}
                />
              </PositionedUISlot>
              <PositionedUISlot
                bottom="15%"
                left="0"
                scale="0.55"
                origin="bottom left"
              >
                <Seat
                  seatNumber={5}
                  currentTable={currentTable}
                  sitDown={sitDown}
                />
              </PositionedUISlot>
              <PositionedUISlot
                width="50%"
                top="-25%"
                scale="0.125"
                origin="top center"
                style={{ zIndex: '1' }}
              >
                <BrandingImage></BrandingImage>
              </PositionedUISlot>
              <PositionedUISlot
                width="100%"
                origin="center center"
                scale="0.20"
                style={{
                  display: 'flex',
                  textAlign: 'center',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {currentTable.board && currentTable.board.length > 0 && (
                  <>
                    {currentTable.board.map((card, index) => (
                      <PokerCard
                        key={index}
                        card={card}
                        width="6.1vw"
                        maxWidth="94px"
                        minWidth="65px"
                      />
                    ))}
                  </>
                )}
              </PositionedUISlot>
              <PositionedUISlot top="-5%" scale="0.60" origin="bottom center">
                {messages && messages.length > 0 && (
                  <>
                    <InfoPill>{messages[messages.length - 1]}</InfoPill>
                    {currentTable.winMessages.length > 0 && (
                      <InfoPill>
                        {
                          currentTable.winMessages[
                            currentTable.winMessages.length - 1
                          ]
                        }
                      </InfoPill>
                    )}
                  </>
                )}
              </PositionedUISlot>
              <PositionedUISlot top="12%" scale="0.60" origin="center center">
                {currentTable.winMessages.length === 0 && (
                  <GameStateInfo currentTable={currentTable} />
                )}
              </PositionedUISlot>
            </>
          )}
        </PokerTableWrapper>

        {currentTable &&
          currentTable.seats[seatId] &&
          currentTable.seats[seatId].turn && (
            <GameUI
              currentTable={currentTable}
              seatId={seatId}
              bet={bet}
              setBet={setBet}
              raise={raise}
              standUp={standUp}
              fold={fold}
              check={check}
              call={call}
            />
          )}
      </Container>
    </>
  )
}

export default TournamentPlay
