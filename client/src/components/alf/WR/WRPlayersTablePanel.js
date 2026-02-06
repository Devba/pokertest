import React, { useMemo, useContext, useEffect, useState, useRef } from 'react'
import PropTypes from 'prop-types'
import socketContext from '../../../context/websocket/socketContext'
import { SC_TABLE_UPDATED } from '../../../pokergame/actions'

const WRPlayersTablePanel = ({ table, walletAddress }) => {
  // Ensure hooks run in the same order: derive `seats` even if `table` is null
  const seats = table?.seats || {}
  const { socket } = useContext(socketContext)

  // localSeats tracks the most recent seat data (keeps UI responsive to high-frequency updates)
  const [localSeats, setLocalSeats] = useState(seats)
  const prevSeatsRef = useRef(seats)
  // keep the previous seats snapshot (one-before-current) for showing deltas
  const prevSeatValuesRef = useRef({})

  // track which seat keys have recently changed (for glow animation)
  const [changedSeats, setChangedSeats] = useState([])
  const ANIM_DURATION = 10000 // 10 seconds

  // helper to apply seat updates and detect changed stacks
  const applySeatUpdate = (newSeats = {}) => {
    const prev = prevSeatsRef.current || {}
    const changed = []
    const keys = Array.from(new Set([...Object.keys(prev), ...Object.keys(newSeats)]))
    keys.forEach((k) => {
      const p = prev[k] || {}
      const n = newSeats[k] || {}
      const pVal = Number(p.stack ?? p.chips ?? 0)
      const nVal = Number(n.stack ?? n.chips ?? 0)
      if (pVal !== nVal) changed.push(k)
    })

    if (changed.length > 0) {
      setChangedSeats((prevArr) => {
        const set = new Set(prevArr)
        changed.forEach(k => set.add(k))
        return Array.from(set)
      })

      // remove highlight after animation duration
      changed.forEach((k) => {
        setTimeout(() => {
          setChangedSeats((prevArr) => prevArr.filter(x => x !== k))
        }, ANIM_DURATION)
      })
    }

    // store previous snapshot so the UI can compute diffs (one-before-current)
    prevSeatValuesRef.current = prev
    prevSeatsRef.current = newSeats
    setLocalSeats(newSeats)
  }

  // Sync localSeats when parent `table.seats` prop changes
  useEffect(() => {
    // Avoid triggering updates if seat stacks/chips haven't actually changed
    const prev = prevSeatsRef.current || {}
    const prevKeys = Object.keys(prev)
    const newKeys = Object.keys(seats || {})
    const same = prevKeys.length === newKeys.length && prevKeys.every((k) => {
      const p = prev[k] || {}
      const n = (seats || {})[k] || {}
      const pVal = Number(p.stack ?? p.chips ?? 0)
      const nVal = Number(n.stack ?? n.chips ?? 0)
      return pVal === nVal
    })

    if (!same) applySeatUpdate(seats)
  }, [seats])

  // Listen for SC_TABLE_UPDATED events and update localSeats when the same table is updated
  useEffect(() => {
    if (!socket || !table?.id) return
    const handler = ({ table: updatedTable }) => {
      if (!updatedTable) return
      if (updatedTable.id === table.id) {
        applySeatUpdate(updatedTable.seats || {})
      }
    }
    socket.on(SC_TABLE_UPDATED, handler)
    return () => socket.off(SC_TABLE_UPDATED, handler)
  }, [socket, table?.id])

  // Convert seats object into an array and sort by stack/chips descending (numeric)
  const seatEntries = useMemo(() => Object.keys(localSeats).map((k) => ({ sKey: k, seat: localSeats[k] }))
    .sort((a, b) => {
      const aVal = Number(a.seat ? (a.seat.stack ?? a.seat.chips ?? 0) : 0)
      const bVal = Number(b.seat ? (b.seat.stack ?? b.seat.chips ?? 0) : 0)
      return bVal - aVal
    }), [localSeats])

  if (!table) {
    return <div style={{ color: '#888' }}>No table data available</div>
  }

  return (
    <div>
      {/* Inject keyframes for glow animation once */}
      <style>{`@keyframes glowAnim { 0%{ text-shadow:none; color:#44848; } 90%{ text-shadow:none; color:#44848 } 100%{ color:#fff900; text-shadow:0 0 7px #fff900,0 0 70px #fff123; } }`}</style>
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
            const changed = changedSeats.includes(String(sKey))
            const glowStyle = changed ? { animation: `glowAnim ${ANIM_DURATION}ms ease`, color: '#fff900' } : {}
            const stackVal = seat.stack ?? seat.chips
            const formatNumber = (v) => Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            const stackDisplay = (stackVal === undefined || stackVal === null) ? '—' : formatNumber(stackVal)
            // compute previous stack (from the snapshot stored in applySeatUpdate)
            const prevSeat = (prevSeatValuesRef.current || {})[sKey] || {}
            const prevValRaw = prevSeat.stack ?? prevSeat.chips
            const prevValNum = (prevValRaw === undefined || prevValRaw === null) ? null : Number(prevValRaw)
            const currValNum = (stackVal === undefined || stackVal === null) ? null : Number(stackVal)
            const diffNum = (currValNum === null || prevValNum === null) ? null : (currValNum - prevValNum)
            const showDiff = diffNum !== null && diffNum !== 0
            return (
              <div key={sKey} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem',
                backgroundColor: isYou ? 'rgba(39, 174, 96, 0.1)' : 'rgba(255,255,255,0.03)',
                borderRadius: '4px',
                border: isYou ? '1px solid rgba(39,174,96,0.3)' : '1px solid transparent',
                ...glowStyle
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: '#aaa', fontSize: '0.875rem', minWidth: '36px' }}>#{sKey}</span>
                  <div>
                    <div>{player.name || player.username || player.id || 'unknown'}</div>
                    <div style={{ color: '#888', fontSize: '0.85rem' }}>{player.walletAddress || ''}</div>
                            {showDiff && (
                              <div style={{ fontSize: '0.85rem', color: diffNum > 0 ? '#5dd67a' : '#ff6b6b', marginTop: '2px' }}>
                                {diffNum > 0 ? '+' : ''}{formatNumber(diffNum)}
                              </div>
                            )}
                  </div>
                </div>
                <div style={{ textAlign: 'right', color: '#ccc' }}>
                  <div style={{ fontWeight: '600' }}>{stackDisplay}</div>
                  {(seat.sittingOut === true || seat.sittingOut === false) && (
                    <div style={{ fontSize: '0.85rem', color: '#aaa' }}>{seat.sittingOut ? 'Sitting Out' : 'Sitting In'}</div>
                  )}
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

WRPlayersTablePanel.defaultProps = {
  table: {},
  walletAddress: ''
}

export default React.memo(WRPlayersTablePanel)
