import React, { useContext, useState, useEffect } from 'react'
import styled from 'styled-components'
import { UIWrapper } from './UIWrapper'

const GameUIContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  max-width: 550px;
  margin: 0 auto;
`

const QuickBetRow = styled.div`
  display: flex;
  gap: 0.5rem;
  justify-content: center;
`

const QuickBetButton = styled.button`
  flex: 1;
  padding: 0.6rem 1rem;
  background: rgba(20, 20, 20, 0.8);
  border: 2px solid #00bcd4;
  border-radius: 25px;
  color: white;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(0, 188, 212, 0.1);
    border-color: #4dd0e1;
  }

  &:active {
    transform: scale(0.98);
  }
`

const BetControlRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  justify-content: center;
  padding: 0.5rem;
`

const BetButton = styled.button`
  width: 40px;
  height: 40px;
  background: rgba(20, 20, 20, 0.8);
  border: 2px solid #666;
  border-radius: 8px;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    border-color: #00bcd4;
    background: rgba(0, 188, 212, 0.1);
  }

  &:active {
    transform: scale(0.95);
  }
`

const BetDisplay = styled.div`
  flex: 1;
  text-align: center;
  color: white;
  font-size: 1.5rem;
  font-weight: bold;
`

const ActionRow = styled.div`
  display: flex;
  gap: 0.5rem;
  justify-content: center;
`

const ActionButton = styled.button`
  flex: 1;
  padding: 0.8rem 1.5rem;
  background: rgba(20, 20, 20, 0.8);
  border: 2px solid ${props => props.borderColor || '#666'};
  border-radius: 25px;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;

  &:hover:not(:disabled) {
    background: ${props => props.borderColor ? `${props.borderColor}22` : 'rgba(255, 255, 255, 0.1)'};
    border-color: ${props => props.borderColor || '#888'};
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`

export const GameUI = ({
  currentTable,
  seatId,
  bet,
  setBet,
  raise,
  standUp,
  fold,
  check,
  call,
}) => {
  const [autoFold, setAutoFold] = useState(false)
  const bigBlind = currentTable.minBet * 2
  const minRaise = currentTable.minRaise || bigBlind
  const maxBet = currentTable.seats[seatId].stack
  const pot = currentTable.pot

  // Auto-fold effect
  useEffect(() => {
    if (
      autoFold &&
      currentTable &&
      currentTable.seats[seatId] &&
      currentTable.seats[seatId].turn
    ) {
      fold()
    }
    // Only run when it's the player's turn or autoFold changes
    // eslint-disable-next-line
  }, [autoFold, currentTable?.seats[seatId]?.turn])

  const handleQuickBet = (type) => {
    switch(type) {
      case 'min':
        setBet(minRaise)
        break
      case '2x':
        setBet(minRaise * 2)
        break
      case 'pot':
        setBet(pot)
        break
      case 'max':
        setBet(maxBet)
        break
      default:
        break
    }
  }

  const increaseBet = () => {
    const newBet = bet + bigBlind
    if (newBet <= maxBet) {
      setBet(newBet)
    }
  }

  const decreaseBet = () => {
    const newBet = bet - bigBlind
    if (newBet >= minRaise) {
      setBet(newBet)
    }
  }

  const callAmount = currentTable.callAmount - currentTable.seats[seatId].bet
  const canCheck = currentTable.callAmount === currentTable.seats[seatId].bet || callAmount == 0
  const canCall = callAmount > 0 && currentTable.seats[seatId].bet < currentTable.callAmount

console.log('GameUI Props:', {
  playerName: currentTable.seats[seatId].player.name,
  seatId,
  bet,
  callAmount,
  canCheck,
  canCall,
  autoFold
})
console.log('Current Table State:', {
  checkStatus: callAmount == 0 ? 'Can Check' : 'Cannot Check'
});
 console.log('Rendering GameUI:', {callAmount, canCheck, canCall, bet, autoFold})


  return (
    <UIWrapper>
      <GameUIContainer>
        {/* Auto Fold Checkbox */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
          <input
            type="checkbox"
            id="autoFold"
            checked={autoFold}
            onChange={e => setAutoFold(e.target.checked)}
            style={{ marginRight: '0.5em' }}
          />
          <label htmlFor="autoFold" style={{ color: 'white', fontSize: '0.95em' }}>
            Auto Fold
          </label>
        </div>

        {/* Quick Bet Buttons */}
        <QuickBetRow>
          <QuickBetButton onClick={() => handleQuickBet('min')}>
            Mínimo
          </QuickBetButton>
          <QuickBetButton onClick={() => handleQuickBet('2x')}>
            2X
          </QuickBetButton>
          <QuickBetButton onClick={() => handleQuickBet('pot')}>
            Pot
          </QuickBetButton>
          <QuickBetButton onClick={() => handleQuickBet('max')}>
            Máximo
          </QuickBetButton>
        </QuickBetRow>

        {/* Bet Control Slider */}
        <BetControlRow>
          <BetButton onClick={decreaseBet}>−</BetButton>
          <BetDisplay>{(bet ).toFixed(2)} </BetDisplay>
          <BetButton onClick={increaseBet}>+</BetButton>
        </BetControlRow>

        {/* Main Action Buttons */}
        <ActionRow>
          <ActionButton 
            borderColor="#f44336"
            onClick={fold}
          >
            Fold
          </ActionButton>
          <ActionButton 
            borderColor="#4caf50"
            onClick={canCheck ? check : call}
            disabled={!canCheck && !canCall}
          >
            {canCheck ? 'Check' : `Call ${(callAmount).toFixed(2)} `}
          </ActionButton>
          <ActionButton 
            borderColor="#00bcd4"
            onClick={() => raise(bet + currentTable.seats[seatId].bet)}
          >
            Raise {bet }
          </ActionButton>
        </ActionRow>
      </GameUIContainer>
    </UIWrapper>
  )
}
