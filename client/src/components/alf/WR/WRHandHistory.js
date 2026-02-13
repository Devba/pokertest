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

const normalizeSeats = (seats) => {
  if (!seats) return []
  return Array.isArray(seats) ? seats.filter(Boolean) : Object.values(seats).filter(Boolean)
}

const getSeatPlayerId = (seat) => String(
  seat?.player?.id || seat?.player?.username || seat?.player?.name || seat?.id || ''
)

const getSeatPlayerName = (seat) => seat?.player?.username || seat?.player?.name || seat?.player?.id || 'Unknown'

const buildStackDiffSummary = (currentSeats, previousSeats) => {
  const prevByPlayer = new Map()

  normalizeSeats(previousSeats).forEach((seat) => {
    prevByPlayer.set(getSeatPlayerId(seat), Number(seat?.stack || 0))
  })

  const diffs = normalizeSeats(currentSeats).map((seat) => {
    const playerId = getSeatPlayerId(seat)
    const playerName = getSeatPlayerName(seat)
    const currentStack = Number(seat?.stack || 0)
    const previousStack = prevByPlayer.get(playerId)
    const hasPrevious = typeof previousStack === 'number'
    const diff = hasPrevious ? +(currentStack - previousStack).toFixed(2) : null

    return {
      playerName,
      diff
    }
  })

  const meaningfulDiffs = diffs.filter((item) => item.diff !== null)
  return meaningfulDiffs.length ? meaningfulDiffs : []
}

const stackDiffGradientColor = (diff, maxAbsDiff) => {
  if (!diff) return '#c7b28d'

  const safeMax = maxAbsDiff > 0 ? maxAbsDiff : Math.abs(diff)
  const ratio = Math.min(1, Math.abs(diff) / safeMax)

  if (diff > 0) {
    const lightness = 74 - ratio * 26
    return `hsl(140, 65%, ${lightness}%)`
  }

  const lightness = 74 - ratio * 26
  return `hsl(3, 78%, ${lightness}%)`
}

const WRHandHistory = ({ table }) => {
  const { socket } = useContext(socketContext)
  const tableId = table?.id
  const tableLabel = table?.name || (tableId ? `Table ${tableId}` : 'Table')
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
      const matchesCurrentTable = !updatedTable || String(updatedTable.id) === String(tableId)

      if (updatedTable && matchesCurrentTable && Array.isArray(updatedTable.history)) {
        setLocalHistory(updatedTable.history.slice(-MAX_HISTORY))
      }

      if (message && matchesCurrentTable) {
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
    const recentHistory = (localHistory || []).slice(-MAX_HISTORY)
    const historyEntries = recentHistory.map((entry, idx) => ({
      type: 'hand',
      ts: entry.ts || entry.timestamp || 0,
      key: `hand-${entry.ts || idx}`,
      data: {
        ...entry,
        stackDiffSummary: buildStackDiffSummary(entry.seats, idx > 0 ? recentHistory[idx - 1]?.seats : null)
      }
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
      <div style={{ marginBottom: '0.5rem', color: '#ccc', fontWeight: 600 }}>{`Current hand - ${tableLabel}`}</div>
      <div style={{ display: 'grid', gap: '0.5rem' }}>
        {combinedEntries.map((entry, idx) => {
          const rowKey = `${entry.key || entry.type}-${idx}`
          if (entry.type === 'hand') {
            const hand = entry.data
            const time = hand.ts ? new Date(hand.ts).toLocaleTimeString() : ''
            const stage = streetLabel(hand.board?.length || 0)
            const board = formatBoard(hand.board)
            const message = hand.winMessages?.length ? hand.winMessages[hand.winMessages.length - 1] : ''
            const stackDiffSummary = hand.stackDiffSummary || []
            const maxAbsDiff = stackDiffSummary.reduce((max, item) => {
              const absDiff = Math.abs(Number(item?.diff || 0))
              return absDiff > max ? absDiff : max
            }, 0)

            return (
              <div key={rowKey} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', color: '#ddd', alignItems: 'center' }}>
                <div style={{ color: '#aaa', fontSize: '0.8rem', minWidth: '70px' }}>{time}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', color: '#f1f1f1' }}>Phase: {stage}</div>
                  <div style={{ fontSize: '0.85rem', color: '#f1f1f1' }}>Pot {formatAmount(hand.pot)}</div>
                  <div style={{ fontSize: '0.8rem', color: '#bbb' }}>Board: {board}</div>
                  {message && (
                    <div style={{ fontSize: '0.8rem', color: '#5dd67a' }}>{message}</div>
                  )}
                  <div style={{ fontSize: '0.78rem', color: '#ffd9a0', marginTop: '0.2rem' }}>Stack Δ vs previous hand:</div>
                  {stackDiffSummary.length > 0 ? (
                    stackDiffSummary.map((item, diffIdx) => {
                      const sign = item.diff > 0 ? '+' : ''
                      const diffColor = stackDiffGradientColor(item.diff, maxAbsDiff)
                      return (
                        <div key={`${rowKey}-diff-${diffIdx}`} style={{ marginTop: '0.05rem', marginLeft: '0.65rem', fontSize: '0.78rem', color: diffColor, lineHeight: 1.2 }}>
                          {`• ${item.playerName}: ${sign}${formatAmount(item.diff)}`}
                        </div>
                      )
                    })
                  ) : (
                    <div style={{ marginTop: '0.05rem', marginLeft: '0.65rem', fontSize: '0.78rem', color: '#9b8f80', lineHeight: 1.2 }}>
                      • No previous-hand data
                    </div>
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