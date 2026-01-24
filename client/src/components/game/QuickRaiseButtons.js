import React from 'react'
import styled from 'styled-components'
import Button from '../buttons/Button'

const QuickRaiseContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  align-items: center;
  margin-top: 0.5rem;
`

export const QuickRaiseButtons = ({ currentTable, seatId, raise }) => {
  const bigBlind = currentTable.minBet * 2
  const currentBet = currentTable.seats[seatId].bet

  const handleQuickRaise = (bbMultiplier) => {
    const raiseAmount = bigBlind * bbMultiplier
    raise(raiseAmount + currentBet)
  }

  return (
    <QuickRaiseContainer>
      <Button
        small
        secondary
        onClick={() => handleQuickRaise(1)}
        style={{ flex: 1, fontSize: '0.85rem', padding: '0.4rem' }}
      >
        1 BB
      </Button>
      <Button
        small
        secondary
        onClick={() => handleQuickRaise(2)}
        style={{ flex: 1, fontSize: '0.85rem', padding: '0.4rem' }}
      >
        2 BB
      </Button>
      <Button
        small
        secondary
        onClick={() => handleQuickRaise(3)}
        style={{ flex: 1, fontSize: '0.85rem', padding: '0.4rem' }}
      >
        3 BB
      </Button>
    </QuickRaiseContainer>
  )
}
