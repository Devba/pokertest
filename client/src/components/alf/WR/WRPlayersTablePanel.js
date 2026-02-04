import React from 'react'
import PropTypes from 'prop-types'

const WRPlayersTablePanel = ({ table, walletAddress }) => {
  if (!table) {
    return <div style={{ color: '#888' }}>No table data available</div>
  }

  const seats = table.seats || {}

  // Convert seats object into an array and sort by stack/chips descending
  const seatEntries = Object.keys(seats).map((k) => ({ sKey: k, seat: seats[k] }))
    .sort((a, b) => {
      const aVal = a.seat ? (a.seat.stack ?? a.seat.chips ?? 0) : 0
      const bVal = b.seat ? (b.seat.stack ?? b.seat.chips ?? 0) : 0
      return bVal - aVal
    })

  return (
    <div>
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        padding: '0.75rem'
      }}>
        <div style={{ marginBottom: '0.5rem', color: '#aaa' }}>Table ID: {table.id}</div>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {seatEntries.map(({ sKey, seat }) => {
            if (!seat) return (
              <div key={sKey} style={{ color: '#777', padding: '0.5rem' }}>Seat {sKey}: empty</div>
            )
            const player = seat.player || {}
            const isYou = player.walletAddress && walletAddress && player.walletAddress === walletAddress
            return (
              <div key={sKey} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem',
                backgroundColor: isYou ? 'rgba(39, 174, 96, 0.1)' : 'rgba(255,255,255,0.03)',
                borderRadius: '4px',
                border: isYou ? '1px solid rgba(39,174,96,0.3)' : '1px solid transparent'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: '#aaa', fontSize: '0.875rem', minWidth: '36px' }}>#{sKey}</span>
                  <div>
                    <div>{player.name || player.username || player.id || 'unknown'}</div>
                    <div style={{ color: '#888', fontSize: '0.85rem' }}>{player.walletAddress || ''}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', color: '#ccc' }}>
                  <div style={{ fontWeight: '600' }}>{seat.stack ?? seat.chips ?? '—'}</div>
                  <div style={{ fontSize: '0.85rem', color: '#aaa' }}>{seat.sittingOut ? 'Sitting Out' : 'Sitting In'}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

WRPlayersTablePanel.propTypes = {
  table: PropTypes.object,
  walletAddress: PropTypes.string
}

export default WRPlayersTablePanel
