import React, { useContext, useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import socketContext from '../../../context/websocket/socketContext'
import { SC_TABLE_UPDATED } from '../../../pokergame/actions'

const MAX_HISTORY = 20

const formatAmount = (value) => Number(value || 0).toLocaleString(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})

const streetLabel = (boardLength = 0) => {
  if (boardLength >= 5) return 'River'
  if (boardLength === 4) return 'Turn'
  if (boardLength === 3) return 'Flop'
  return 'Preflop'
}

const formatBoard = (board = []) => {
  if (!board.length) return '—'
  return board.map((card) => `${card.rank || ''}${(card.suit || '').charAt(0).toUpperCase()}`).join(' ')
}

const WRTableHistory = ({ table }) => {
  const { socket } = useContext(socketContext)
  const tableId = table?.id
  const [localHistory, setLocalHistory] = useState(() => Array.isArray(table?.history) ? table.history : [])

  useEffect(() => {
    setLocalHistory(Array.isArray(table?.history) ? table.history : [])
  }, [tableId, table?.history])

  useEffect(() => {
    if (!socket || !tableId) return undefined
    const handler = ({ table: updatedTable }) => {
      if (updatedTable && updatedTable.id === tableId && Array.isArray(updatedTable.history)) {
        setLocalHistory(updatedTable.history.slice(-MAX_HISTORY))
      }
    }
    socket.on(SC_TABLE_UPDATED, handler)
    return () => socket.off(SC_TABLE_UPDATED, handler)
  }, [socket, tableId])

  const history = useMemo(() => (localHistory || []).slice(-MAX_HISTORY).reverse(), [localHistory])

  if (!tableId) {
    return <div style={{ color: '#888', fontSize: '0.95rem', marginTop: '0.5rem' }}>No table selected</div>
  }

  if (!history.length) {
    return <div style={{ color: '#888', fontSize: '0.95rem', marginTop: '0.5rem' }}>No recent history</div>
  }

  return (
    <div style={{ marginTop: '1rem', backgroundColor: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 8 }}>
      <div style={{ marginBottom: '0.5rem', color: '#ccc', fontWeight: 600 }}>Table History</div>
      <div style={{ display: 'grid', gap: '0.5rem' }}>
        {history.map((entry, idx) => {
          const time = entry.ts ? new Date(entry.ts).toLocaleTimeString() : ''
          const stage = streetLabel(entry.board?.length || 0)
          const board = formatBoard(entry.board)
          const message = entry.winMessages?.length ? entry.winMessages[entry.winMessages.length - 1] : ''

          return (
            <div key={`${entry.ts || idx}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', color: '#ddd', alignItems: 'center' }}>
              <div style={{ color: '#aaa', fontSize: '0.8rem', minWidth: '70px' }}>{time}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem', color: '#f1f1f1' }}>{stage} · Pot {formatAmount(entry.pot)}</div>
                <div style={{ fontSize: '0.8rem', color: '#bbb' }}>Board: {board}</div>
                {message && (
                  <div style={{ fontSize: '0.8rem', color: '#5dd67a' }}>{message}</div>
                )}
              </div>
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
