import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import PokerCard from '../components/game/PokerCard'
import background from '../assets/img/cards-prepared-poker-night.jpg'


import Swal from 'sweetalert2'
import './Play.scss';

const toastMixin = Swal.mixin({
  toast: true,
  icon: 'success',
  title: 'General Title',
  animation: false,
  position: 'top-right',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer)
    toast.addEventListener('mouseleave', Swal.resumeTimer)
  },
})

const Play = () => {
  const navigate = useNavigate()
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
    setTimebfFold
  } = useContext(gameContext)
   

  const [bet, setBet] = useState(0)
  const [timeDelay, setTimeDelay] = useState(0)

  // Sync timeDelay slider with timebfFold (convert seconds to milliseconds)
  useEffect(() => {
    setTimebfFold(timeDelay * 1000)
  }, [timeDelay, setTimebfFold])

  useEffect(() => {
    console.log(socket, walletAddress)
    if(!socket){
      console.log("No socket, reloading page in 5 seconds")
      setTimeout(() => {
        window.location.reload()
      }, 5000)
      return
    }

    // !walletAddress && navigate("/")
    socket && walletAddress && joinTable(1)

    if(socket){
      return () => leaveTable()
    }
    // eslint-disable-next-line
  }, [socket, walletAddress])

  useEffect(() => {
    currentTable &&
      (currentTable.callAmount > currentTable.minBet
        ? setBet(currentTable.callAmount)
        : currentTable.pot > 0
        ? setBet(currentTable.minRaise)
        : setBet(currentTable.minBet))
  }, [currentTable])

  useEffect(() => {
  }, [currentTable, seatId])

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
          backgroundColor: 'yellow',
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
              <Button small secondary onClick={leaveTable}>
                Leave
              </Button>
               <Button small secondary onClick={async () => {
                // Fetch current bots at the table
                let botsAtTable = [];
                try {
                  const response = await fetch('http://192.168.1.105:3000/api/bots/list/1');
                  const data = await response.json();
                  botsAtTable = data.bots || [];
                } catch (error) {
                  console.error('Error fetching bots:', error);
                }

                const botOptions = botsAtTable.length > 0 
                  ? botsAtTable.map(bot => `<option value="${bot.name}">${bot.name} (${bot.strategy})</option>`).join('')
                  : '<option value="" disabled>No bots at table</option>';

                const result = await Swal.fire({
                  title: 'Bot Manager',
                  html: `
                    <div style="text-align: left; padding: 1rem;">
                      <div style="margin-bottom: 1.5rem;">
                        <h3 style="margin-bottom: 0.5rem;">Add Bot</h3>
                        <label style="display: block; margin-bottom: 0.5rem;">Strategy:</label>
                        <select id="bot-strategy" class="swal2-input" style="width: 100%;">
                          <option value="tight">Tight</option>
                          <option value="aggressive">Aggressive</option>
                          <option value="loose">Loose</option>
                          <option value="balanced">Balanced</option>
                        </select>
                      </div>
                      <div style="margin-bottom: 1rem;">
                        <h3 style="margin-bottom: 0.5rem;">Remove Bot</h3>
                        <label style="display: block; margin-bottom: 0.5rem;">Select Bot:</label>
                        <select id="bot-name" class="swal2-input" style="width: 100%;" ${botsAtTable.length === 0 ? 'disabled' : ''}>
                          ${botOptions}
                        </select>
                      </div>
                    </div>
                  `,
                  showCancelButton: true,
                  showDenyButton: true,
                  confirmButtonText: 'Add Bot',
                  denyButtonText: 'Remove Bot',
                  cancelButtonText: 'Cancel',
                  preConfirm: () => {
                    return {
                      action: 'add',
                      strategy: document.getElementById('bot-strategy').value
                    }
                  },
                  preDeny: () => {
                    const botName = document.getElementById('bot-name').value;
                    if (!botName || botsAtTable.length === 0) {
                      Swal.showValidationMessage('No bot selected or no bots available');
                      return false;
                    }
                    return {
                      action: 'remove',
                      botName: botName
                    }
                  }
                });

                if (result.isConfirmed) {
                  // Add bot
                  try {
                    const response = await fetch('http://192.168.1.105:3000/api/bots/add', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        tableId: 1,
                        strategy: result.value.strategy
                      })
                    });
                    const data = await response.json();
                    console.log('Bot added:', data);
                    toastMixin.fire({
                      title: `Bot added with ${result.value.strategy} strategy`,
                      icon: 'success'
                    });
                  } catch (error) {
                    console.error('Error adding bot:', error);
                    toastMixin.fire({
                      title: 'Failed to add bot',
                      icon: 'error'
                    });
                  }
                } else if (result.isDenied) {
                  // Remove bot
                  try {
                    const response = await fetch('http://192.168.1.105:3000/api/bots/remove', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        tableId: 1,
                        botName: result.value.botName
                      })
                    });
                    const data = await response.json();
                    console.log('Bot removed:', data);
                    toastMixin.fire({
                      title: `Bot ${result.value.botName} removed`,
                      icon: 'success'
                    });
                  } catch (error) {
                    console.error('Error removing bot:', error);
                    toastMixin.fire({
                      title: 'Failed to remove bot',
                      icon: 'error'
                    });
                  }
                }
               }}>
                Manage Bots
              </Button>
            </PositionedUISlot>
            <PositionedUISlot
              top="2vh"
              right="16rem"
              scale="0.65"
              style={{ zIndex: '50' }}
            >
              <div style={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.7)', 
                padding: '0.5rem 1rem', 
                borderRadius: '8px',
                color: 'white',
                minWidth: '200px'
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
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>
            </PositionedUISlot>
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
              top="-4"
              left="2.5"
              scale="0.10"
              style={{ zIndex: '50' }}
              >
               
              </PositionedUISlot>
              <PositionedUISlot
                width="50%"
                
                origin="center center"
                scale="0.10"
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

export default Play
