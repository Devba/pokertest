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

const WRHandHistory = ({ table }) => {
  const { socket } = useContext(socketContext)
  const tableId = table?.id
  const [localHistory, setLocalHistory] = useState(() => Array.isArray(table?.history) ? table.history : [])
  const [tableMessages, setTableMessages] = useState([])

  useEffect(() => {
    setLocalHistory(Array.isArray(table?.history) ? table.history : [])
  }, [tableId, table?.history])

  useEffect(() => {
    setTableMessages([])
  }, [tableId])

  useEffect(() => {
    if (!socket || !tableId) return undefined
    const handler = ({ table: updatedTable, message, from, timestamp }) => {
      if (updatedTable && updatedTable.id === tableId && Array.isArray(updatedTable.history)) {
        setLocalHistory(updatedTable.history.slice(-MAX_HISTORY))
      }
      if (message) {
        const normalizedMessage = (message || '').trim().toLowerCase()
        const isNewHandMessage = normalizedMessage.includes('new hand')
        setTableMessages((prev) => {
          const base = isNewHandMessage ? [] : prev
          const next = [...base, {
            ts: timestamp || Date.now(),
            text: message,
            from: from || 'Dealer'
          }]
          return next.slice(-MAX_HISTORY)
        })
      }
    }
    socket.on(SC_TABLE_UPDATED, handler)
    return () => socket.off(SC_TABLE_UPDATED, handler)
  }, [socket, tableId])

  const combinedEntries = useMemo(() => {
    const historyEntries = (localHistory || []).slice(-MAX_HISTORY).map((entry, idx) => ({
      type: 'hand',
      ts: entry.ts || entry.timestamp || 0,
      key: `hand-${entry.ts || idx}`,
      data: entry
    }))

    const messageEntries = tableMessages.map((msg, idx) => ({
      type: 'message',
      ts: msg.ts || 0,
      key: `msg-${msg.ts || idx}`,
      data: msg
    }))

    return [...historyEntries, ...messageEntries]
      .sort((a, b) => (b.ts || 0) - (a.ts || 0))
      .slice(0, MAX_HISTORY)
  }, [localHistory, tableMessages])

  if (!tableId) {
    return <div style={{ color: '#888', fontSize: '0.95rem', marginTop: '0.5rem' }}>No table selected</div>
  }

  if (!combinedEntries.length) {
    return <div style={{ color: '#888', fontSize: '0.95rem', marginTop: '0.5rem' }}>No recent activity</div>
  }

  return (
    <div style={{ marginTop: '1rem', backgroundColor: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 8 }}>
      <div style={{ marginBottom: '0.5rem', color: '#ccc', fontWeight: 600 }}>Current hand</div>
      <div style={{ display: 'grid', gap: '0.5rem' }}>
        {combinedEntries.map((entry, idx) => {
          const rowKey = `${entry.key || entry.type}-${idx}`
          if (entry.type === 'hand') {
            const hand = entry.data
            const time = hand.ts ? new Date(hand.ts).toLocaleTimeString() : ''
            const stage = streetLabel(hand.board?.length || 0)
            const board = formatBoard(hand.board)
            const message = hand.winMessages?.length ? hand.winMessages[hand.winMessages.length - 1] : ''

            return (
              <div key={rowKey} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', color: '#ddd', alignItems: 'center' }}>
                <div style={{ color: '#aaa', fontSize: '0.8rem', minWidth: '70px' }}>{time}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', color: '#f1f1f1' }}>{stage} · Pot {formatAmount(hand.pot)}</div>
                  <div style={{ fontSize: '0.8rem', color: '#bbb' }}>Board: {board}</div>
                  {message && (
                    <div style={{ fontSize: '0.8rem', color: '#5dd67a' }}>{message}</div>
                  )}
                </div>
              </div>
            )
          }

          const msg = entry.data
          const time = msg.ts ? new Date(msg.ts).toLocaleTimeString() : ''
          return (
            <div key={rowKey} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', color: '#ddd', alignItems: 'center' }}>
              <div style={{ color: '#aaa', fontSize: '0.8rem', minWidth: '70px' }}>{time}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem', color: '#5dd67a' }}>{msg.from || 'Dealer'}</div>
                <div style={{ fontSize: '0.8rem', color: '#ccc' }}>{msg.text}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

WRHandHistory.propTypes = {
  table: PropTypes.object
}

WRHandHistory.defaultProps = {
  table: {}
}

export default React.memo(WRHandHistory)