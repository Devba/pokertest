import React, { useContext, useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
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
import { TournInfoPanel } from '../components/game/TourninfoPanel'
import ToggleSwitch from '../components/alf/ToggleSittingINOUT'

const TournamentPlay = () => {
  const navigate = useNavigate()
  const { tournamentId } = useParams()
  const [searchParams] = useSearchParams()
  const mode = searchParams.get('mode') // 'player' or 'spectator'
  const { socket } = useContext(socketContext)
  const { walletAddress,userNamev2 } = useContext(globalContext)
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
    timebfFold,
    setTimebfFold
  } = useContext(gameContext)

  const [bet, setBet] = useState(0)
  const [tournamentInfo, setTournamentInfo] = useState(null)
  const [timeDelay, setTimeDelay] = useState(10000)

  // Sync timeDelay slider with timebfFold (convert seconds to milliseconds)
  useEffect(() => {
    //setTimebfFold(timeDelay * 1000)
  }, [timeDelay, setTimebfFold])
   useEffect(() => {
    //setTimebfFold(timeDelay * 1000)
    console.log('seatId changed:', seatId);
  }, [seatId])

  useEffect(() => {
    console.log('TournamentPlay mounted - tournamentId:', tournamentId, 'socket:', !!socket, 'walletAddress:', walletAddress);
    
    if (!socket) {
      console.log('No socket, redirecting to home');
      navigate('/tournament-lobby')
      return
    }

    // Get tournament info and join tournament table
    if (socket && tournamentId) {
      console.log('Emitting GET_TOURNAMENT_TABLE for tournament:', tournamentId, 'mode:', mode);
      
      // If mode is 'player', check if user has wallet address
      if (mode === 'player' && (!walletAddress || walletAddress.trim() === '')) {
        Swal.fire({
          title: 'Not Connected',
          text: 'You need to connect your wallet to join as a player',
          icon: 'warning',
          confirmButtonText: 'OK'
        }).then(() => {
          navigate('/tournament-lobby')
        })
        return
      }
      
      // If mode is 'player', use walletAddress; if 'spectator' or undefined, use 'spectator'
      const requestWallet = mode === 'player' ? walletAddress : 'spectator';
      //socket.emit('GET_TOURNAMENT_TABLE', { tournamentId, walletAddress: requestWallet })
      socket.emit('GET_TOURNAMENT_TABLE', { tournamentId, walletAddress: walletAddress || 'spectator',mode:mode })  
      
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
      // Fetch tournament info after joining table
      socket.emit('GET_TOURNAMENT_INFO', { tournamentId })
    })

    socket.on('TOURNAMENT_INFO', (info) => {
      console.log('TOURNAMENT_INFO received:', info)
      setTournamentInfo(info)
    })

    socket.on('TOURNAMENT_UPDATE', (info) => {
      console.log('TOURNAMENT_UPDATE received:', info)
      console.log('Current tournamentId:', tournamentId, 'Update tournamentId:', info.id)
      //console.log('Comparison result:', info.id === parseInt(tournamentId))
      if (info.id === parseInt(tournamentId)) {
        console.log('Updating tournament info with:', info)
        setTournamentInfo(prev => {
          const updated = {
            ...prev,
            ...info
          }
          console.log('Updated tournament info:', updated)
          return updated
        })
      }
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
      socket.off('TOURNAMENT_UPDATE')
      socket.off('TOURNAMENT_ERROR')
    }
  }
}, [socket, joinTable, tournamentId])


  useEffect(() => {
    if (currentTable) {
      currentTable.callAmount > currentTable.minBet
        ? setBet(currentTable.callAmount)
        : currentTable.pot > 0
        ? setBet(currentTable.minRaise)
        : setBet(currentTable.minBet)
    }
  }, [currentTable])

useEffect(() => {
  if (currentTable && seatId && currentTable.seats[seatId]) {
    setIsSittingIn(!currentTable.seats[seatId].sittingOut);
  }
}, [currentTable, seatId]);



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
        //navigate('/tournament-lobby')
      }
    })
  }

  const handleSitIn = () => {
    if (socket && currentTable && seatId) {
      socket.emit('SITTING_IN', { tableId: currentTable.id, seatId });
    }
  }

  const [infoTab, setInfoTab] = useState('general')

  const [isSittingIn, setIsSittingIn] = React.useState(false); // or false, depending on initial state

  const handleToggle = () => {
    if (isSittingIn) {
      // Emit stand up event
     standUp ();  
    } else {
      // Emit sit in event
      handleSitIn ();
    }
    setIsSittingIn(!isSittingIn);
  };

  return (
    <>
     
      <Container
        fullHeight
        style={{
          backgroundImage: `url(${background})`,
          //backgroundRepeat: 'no-repeat',
          backgroundSize: 'contain',
          backgroundPosition: 'center center',
          backgroundAttachment: 'fixed',
          backgroundColor: 'black',
          pointerEvents: 'none',
        }}
        className="play-area"
      >
        {currentTable && (
          <>


            
          {/*Toggle Standing*/}
           {currentTable.seats[seatId] && mode ==='player' && (
            <PositionedUISlot
              bottom="2vh"
              right="1.5rem"
              scale="0.25"
              style={{ zIndex: '50', display: 'flex', gap: '0.5rem' }}
            >
             <ToggleSwitch checked={isSittingIn} onChange={handleToggle} />
              <span style={{ color: isSittingIn ? '#2ecc40' : '#888', marginLeft: 12 }}>
                {isSittingIn ? 'Sitting In' : 'Standing Up'}
              </span>
            </PositionedUISlot>)}


          {/* User info */}
            <PositionedUISlot
              top="7vh"
              left="1.5rem"
              scale="0.25"
              style={{ zIndex: '50', display: 'flex', gap: '0.5rem' }}
            >
             
              <hr />
              <p style={{ color: 'white' }}>modo : {mode} , userNamev2: {userNamev2|| localStorage.getItem("userNamev2")  }</p>
             <p style={{ color: 'white' }}>TID: {tournamentId}</p>
            </PositionedUISlot>


          {/* Leave Button */}
            <PositionedUISlot
              top="2vh"
              left="1.5rem"
              scale="0.25"
              style={{ zIndex: '50', display: 'flex', gap: '0.5rem' }}
            >
              <Button small secondary onClick={handleLeaveTournament}>
                Leave Tournament
              </Button>
              
            
            </PositionedUISlot>

            {/* Time Delay Slider */}
            <PositionedUISlot
              bottom="9vh"
              left="1rem"
              scale="0.25"
              style={{ zIndex: '50' }}
            >
              <div style={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.7)', 
                padding: '0.5rem 1rem', 
                borderRadius: '8px',
                color: 'white',
                minWidth: '40px'
              }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  Time Delay: {timeDelay}s
                </label>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={timeDelay}
                  onChange={(e) => {
                    const td = Number(e.target.value) < 29 ? Number(e.target.value) : 300;
                    setTimeDelay(td);
                  }}
                  style={{ width: '90%', cursor: 'pointer' }}
                />
              </div>
            </PositionedUISlot>

            {/* Tournament Info */}
            {tournamentInfo && (
            <PositionedUISlot
                  bottom="2vh"
                  left="19.5rem"
                  scale="0.65"
                  style={{ zIndex: '150' }}
                >
                  <TournInfoPanel tournamentInfo={tournamentInfo} currentTable={currentTable} />
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
                left="0%"
                scale="0.55"
                origin="top center"
              >
                <p>1</p>
                <Seat
                  seatNumber={seatId?((seatId -5) % 6) + 1 : 1}
                  currentTable={currentTable}
                  sitDown={sitDown}
                  folded={currentTable.seats[((seatId -5) % 6) + 1]?.folded}
                />
              </PositionedUISlot>


                <PositionedUISlot
                top="-42%"
                left="25%"
                scale="0.55"
                origin="top center"
              >
                <p>2</p>
                <Seat
                  seatNumber={seatId?((seatId -4) % 6) + 1 : 2}
                  currentTable={currentTable}
                  sitDown={sitDown}
                  folded={currentTable.seats[((seatId -4) % 6) + 1]?.folded}
                />
              </PositionedUISlot>
              <PositionedUISlot
                top="-30%"
                right="15vw"
                scale="0.55"
                origin="top right"
              >
                <Seat
                  seatNumber={seatId?((seatId -3) % 6) + 1 : 3}
                  currentTable={currentTable}
                  sitDown={sitDown}
                  folded={currentTable.seats[((seatId - 3) % 6) + 1]?.folded}
                />
              </PositionedUISlot>

                     <PositionedUISlot
                top="40%"
                right="5vw"
                scale="0.55"
                origin="top right"
              >
                <Seat
                  seatNumber={seatId?((seatId - 2) % 6) + 1 : 4}
                  currentTable={currentTable}
                  sitDown={sitDown}
                  folded={currentTable.seats[((seatId - 2) % 6) + 1]?.folded}
                />
              </PositionedUISlot>

              
              <PositionedUISlot
               bottom="-20%"
                left="50%"
                scale="0.15"
                origin="bottom center"
                zIndex="100"
                info="este es es jugador"
                position="absolute"
              >
               <Seat
                    seatNumber={seatId?((seatId -1) % 6) + 1 : 5}
                    currentTable={currentTable}
                    sitDown={sitDown}
                    folded={currentTable.seats[((seatId -1) % 6) + 1]?.folded}
                    
                  />
                  </PositionedUISlot>
          





                <PositionedUISlot
                 bottom="0%"
                left="0%"
                scale="0.15"
                origin="bottom left"
                  zIndex="100"
              
              zIndex="100">
              
                <Seat
                  seatNumber={seatId?((seatId   % 6) + 1) : 6}
                  currentTable={currentTable}
                  sitDown={sitDown}
                  folded={currentTable.seats[((seatId  % 6) + 1)]?.folded}
                />
              </PositionedUISlot>
          


                
              
              
             

              
              
              


             

            
            
            
              <PositionedUISlot
                width="100%"
                bottom="4%"
                left="50%"
                origin="center center"
                scale="0.20"
                style={{
                  display: 'flex',
                  textAlign: 'center',
                  justifyContent: 'center',
                  alignItems: 'center',
                  transform: 'translate(-50%, 0%)',
                  zIndex: '10',
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
              <PositionedUISlot zIndex="1500" top="-15%" scale="1.60" origin="top center">
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
              <PositionedUISlot top="12%" scale="3.60" origin="center center">
                {currentTable.winMessages.length === 0 && (
                  <GameStateInfo currentTable={currentTable} />
                )}
              </PositionedUISlot>

               



               



              
            </>
          )}
        </PokerTableWrapper>

{/* GameUI*/}               
            <PositionedUISlot 
            
              bottom="10vh"
                  left="19.5rem"
                  scale="0.65"
                  style={{ zIndex: '150' }}
            >
                 {currentTable &&
                currentTable.seats[seatId] &&
                currentTable.seats[seatId].turn && 
                mode==='player' &&
                (
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
              </PositionedUISlot>
          
      </Container>
    </>
  )
}

export default TournamentPlay
