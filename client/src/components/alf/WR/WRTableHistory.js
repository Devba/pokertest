import React from 'react'
import PropTypes from 'prop-types'

// Simple table history viewer. Expects `table.history` to be an array of events.
// Each event can be { ts, type, desc, amount, players } - we tolerate flexible shapes.
const WRTableHistory = ({ table }) => {
  const history = (table && table.history) || []

  if (!history || history.length === 0) {
    return (
      <div style={{ color: '#888', fontSize: '0.95rem', marginTop: '0.5rem' }}>
        No recent history
      </div>
    )
  }

  return (
    <div style={{ marginTop: '1rem', backgroundColor: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 8 }}>
      <div style={{ marginBottom: '0.5rem', color: '#ccc', fontWeight: 600 }}>Table History</div>
      <div style={{ display: 'grid', gap: '0.5rem' }}>
        {history.slice().reverse().map((ev, idx) => {
          const ts = ev.ts ? new Date(ev.ts) : null
          const time = ts ? ts.toLocaleTimeString() : ''
          const amount = ev.amount !== undefined && ev.amount !== null ? ` ${Number(ev.amount).toFixed(2)}` : ''
          const desc = ev.desc || ev.type || JSON.stringify(ev)
          const players = ev.players ? ` — ${Array.isArray(ev.players) ? ev.players.join(', ') : ev.players}` : ''

          return (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', color: '#ddd', alignItems: 'center' }}>
              <div style={{ color: '#aaa', fontSize: '0.85rem' }}>{time}</div>
              <div style={{ flex: 1, fontSize: '0.95rem', color: '#eee' }}>{desc}{players}</div>
              <div style={{ color: ev.amount > 0 ? '#5dd67a' : '#ff6b6b', fontWeight: 600 }}>{amount}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

WRTableHistory.propTypes = {
  table: PropTypes.object
}

WRTableHistory.defaultProps = {
  table: {}
}

export default React.memo(WRTableHistory)
