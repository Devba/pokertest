import React, { useState } from 'react'

export const TournInfoPanel = ({ tournamentInfo, currentTable }) => {
  const [infoTab, setInfoTab] = useState('general')

  if (!tournamentInfo || !currentTable) return null

  return (
    <div
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: '0.5rem 1rem',
        borderRadius: '8px',
        color: 'white',
        minWidth: '220px',
      }}
    >
      <div style={{ display: 'flex', marginBottom: '0.5rem' }}>
        <button
          style={{
            flex: 1,
            background: infoTab === 'general' ? '#222' : 'transparent',
            color: 'white',
            border: 'none',
            borderBottom: infoTab === 'general' ? '2px solid #00bcd4' : '1px solid #444',
            cursor: 'pointer',
            fontWeight: infoTab === 'general' ? 'bold' : 'normal',
            fontSize: '1em',
            padding: '0.3em 0'
          }}
          onClick={() => setInfoTab('general')}
        >
          General
        </button>
        <button
          style={{
            flex: 1,
            background: infoTab === 'blinds' ? '#222' : 'transparent',
            color: 'white',
            border: 'none',
            borderBottom: infoTab === 'blinds' ? '2px solid #00bcd4' : '1px solid #444',
            cursor: 'pointer',
            fontWeight: infoTab === 'blinds' ? 'bold' : 'normal',
            fontSize: '1em',
            padding: '0.3em 0'
          }}
          onClick={() => setInfoTab('blinds')}
        >
          Blinds
        </button>
      </div>
      {infoTab === 'general' ? (
        <div style={{ fontSize: '0.95em', color: '#aaa' }}>
          <div style={{ fontWeight: 'bold', fontSize: '1.1em', marginBottom: '0.3em' }}>
            {tournamentInfo.name}
          </div>
          <div>Players: {tournamentInfo.activePlayers || 0}</div>
          <div>Seats: {Object.values(currentTable.seats).filter(seat => seat !== null).length}</div>
          <div>Prize: ${tournamentInfo.prizePool || 0}</div>
        </div>
      ) : (
        <div style={{ fontSize: '0.95em', color: '#aaa' }}>
          <div>Level: {tournamentInfo.blindLevel || 1}</div>
          <div>Big Blind: {currentTable.blindSchedule[currentTable.blindLevel - 1].bigBlind}</div>
          <div>Ante: {currentTable.blindSchedule[currentTable.blindLevel - 1]?.ante ?? 'N/A'}</div>
          <div>Hand: {currentTable.handCount}</div>
          <div>Min Bet: {currentTable.minBet}</div>
          <div>Min Raise: {currentTable.minRaise}</div>
          <div>Hands plevel: {currentTable.handsPerLevel}</div>
          <div>pot: {currentTable.pot}</div>
        </div>
      )}
    </div>
  )
}