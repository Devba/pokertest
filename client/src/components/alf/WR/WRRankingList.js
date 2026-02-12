import React, { useMemo, useContext, useEffect, useState, useRef, useCallback } from 'react'
import PropTypes from 'prop-types'
import socketContext from '../../../context/websocket/socketContext'
import { SC_TABLE_UPDATED } from '../../../pokergame/actions'

const formatBigBlindValue = (value) => {
  if (!Number.isFinite(value)) return null
  if (Math.abs(value) >= 100) return value.toFixed(0)
  if (Math.abs(value) >= 10) return value.toFixed(1)
  return value.toFixed(2)
}

const WRPlayersTablePanel = ({ table, tournament, walletAddress }) => {
  // Aggregate seats from all tournament tables or use single table
  const allSeats = useMemo(() => {
    if (tournament?.tables && Array.isArray(tournament.tables) && tournament.tables.length > 0) {
      // Aggregate all seats from all tables
      const aggregated = {}
      tournament.tables.forEach((tbl) => {
        if (tbl?.seats) {
          // Get current big blind for this table (ONLY from snapshots, like WRChartHandStacks)
          let bigBlindValue = null
          if (tbl.handStackSnapshots && tbl.handStackSnapshots.length > 0) {
            const latestSnapshot = tbl.handStackSnapshots[tbl.handStackSnapshots.length - 1]
            if (latestSnapshot && typeof latestSnapshot.bigBlind === 'number') {
              bigBlindValue = latestSnapshot.bigBlind
            }
          }
          
          Object.keys(tbl.seats).forEach((seatKey) => {
            const seat = tbl.seats[seatKey]
            if (seat) {
              // Create unique key for each seat across all tables
              const uniqueKey = `t${tbl.id}-s${seatKey}`
              aggregated[uniqueKey] = {
                ...seat,
                tableId: tbl.id,
                originalSeatId: seatKey,
                bigBlind: bigBlindValue
              }
            }
          })
        }
      })
      return aggregated
    }
    // For single table (ONLY use snapshots, like WRChartHandStacks)
    let bigBlindValue = null
    if (table?.handStackSnapshots && table.handStackSnapshots.length > 0) {
      const latestSnapshot = table.handStackSnapshots[table.handStackSnapshots.length - 1]
      if (latestSnapshot && typeof latestSnapshot.bigBlind === 'number') {
        bigBlindValue = latestSnapshot.bigBlind
      }
    }
    
    const seats = table?.seats || {}
    const enrichedSeats = {}
    Object.keys(seats).forEach((seatKey) => {
      if (seats[seatKey]) {
        enrichedSeats[seatKey] = {
          ...seats[seatKey],
          bigBlind: bigBlindValue
        }
      }
    })
    return enrichedSeats
  }, [tournament, table])
  
  const { socket } = useContext(socketContext)

  // localSeats tracks the most recent seat data (keeps UI responsive to high-frequency updates)
  const [localSeats, setLocalSeats] = useState(allSeats)
  const prevSeatsRef = useRef(allSeats)
  // keep the previous seats snapshot (one-before-current) for showing deltas
  const prevSeatValuesRef = useRef({})

  // track which seat keys have recently changed (for glow animation)
  const [changedSeats, setChangedSeats] = useState([])
  const ANIM_DURATION = 10000 // 10 seconds
  
  // track total player count changes for glow effect
  const [totalCountGlowing, setTotalCountGlowing] = useState(false)
  const prevTotalCountRef = useRef(0)
  const TOTAL_GLOW_DURATION = 3000 // 3 seconds

  // helper to apply seat updates and detect changed stacks
  const applySeatUpdate = useCallback((newSeats = {}) => {
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
  }, [])

  // Sync localSeats when parent `allSeats` prop changes
  useEffect(() => {
    // Avoid triggering updates if seat stacks/chips haven't actually changed
    const prev = prevSeatsRef.current || {}
    const prevKeys = Object.keys(prev)
    const newKeys = Object.keys(allSeats || {})
    const same = prevKeys.length === newKeys.length && prevKeys.every((k) => {
      const p = prev[k] || {}
      const n = (allSeats || {})[k] || {}
      const pVal = Number(p.stack ?? p.chips ?? 0)
      const nVal = Number(n.stack ?? n.chips ?? 0)
      return pVal === nVal
    })

    if (!same) applySeatUpdate(allSeats)
  }, [allSeats, applySeatUpdate])

  // Listen for SC_TABLE_UPDATED events and update localSeats when any tournament table is updated
  useEffect(() => {
    if (!socket) return
    
    // Get list of table IDs to watch
    const tableIds = tournament?.tables 
      ? tournament.tables.map(t => t.id).filter(Boolean)
      : (table?.id ? [table.id] : [])
    
    console.log('🔊 WRRankingList: Setting up socket listener for tables:', tableIds);
    
    if (tableIds.length === 0) {
      console.warn('⚠️ WRRankingList: No table IDs to watch');
      return;
    }

    const handler = ({ table: updatedTable }) => {
      if (!updatedTable) {
        console.warn('⚠️ WRRankingList: Received table update with no table');
        return;
      }
      
      console.log(`📥 WRRankingList: Received update for table ${updatedTable.id}, watching:`, tableIds);
      
      // Check if this update is for one of our tables
      const isWatchedTable = tableIds.includes(updatedTable.id);
      const isTournamentTable = tournament && updatedTable.tournamentId === tournament.id;
      
      console.log(`   - In watched list: ${isWatchedTable}, Tournament match: ${isTournamentTable}`);
      
      if (isWatchedTable || isTournamentTable) {
        console.log(`✅ WRRankingList: Processing update for table ${updatedTable.id}`);
        
        // Merge the updated table's seats into our aggregated structure
        const prev = prevSeatsRef.current || {}
        const updated = { ...prev }
        
        // Get current big blind for this table (ONLY from snapshots, like WRChartHandStacks)
        let bigBlindValue = null
        if (updatedTable.handStackSnapshots && updatedTable.handStackSnapshots.length > 0) {
          const latestSnapshot = updatedTable.handStackSnapshots[updatedTable.handStackSnapshots.length - 1]
          if (latestSnapshot && typeof latestSnapshot.bigBlind === 'number') {
            bigBlindValue = latestSnapshot.bigBlind
          }
        }
        
        if (updatedTable.seats) {
          Object.keys(updatedTable.seats).forEach((seatKey) => {
            const seat = updatedTable.seats[seatKey]
            const uniqueKey = `t${updatedTable.id}-s${seatKey}`
            if (seat) {
              updated[uniqueKey] = {
                ...seat,
                tableId: updatedTable.id,
                originalSeatId: seatKey,
                bigBlind: bigBlindValue
              }
            } else {
              delete updated[uniqueKey]
            }
          })
          console.log(`   - Updated ${Object.keys(updatedTable.seats).length} seats for table ${updatedTable.id}`);
        }
        // Use applySeatUpdate to trigger change detection and animations
        applySeatUpdate(updated)
      } else {
        console.log(`⏭️  WRRankingList: Ignoring update for table ${updatedTable.id}`);
      }
    }
    socket.on(SC_TABLE_UPDATED, handler)
    return () => {
      console.log('🔇 WRRankingList: Removing socket listener');
      socket.off(SC_TABLE_UPDATED, handler);
    }
  }, [socket, tournament?.tables, tournament?.id, table?.id, applySeatUpdate])

  // Convert seats object into an array and sort by stack/chips descending (numeric)
  const seatEntries = useMemo(() => Object.keys(localSeats)
    .map((k) => ({ sKey: k, seat: localSeats[k] }))
    .filter(({ seat }) => !!seat)
    .sort((a, b) => {
      const aVal = Number(a.seat ? (a.seat.stack ?? a.seat.chips ?? 0) : 0)
      const bVal = Number(b.seat ? (b.seat.stack ?? b.seat.chips ?? 0) : 0)
      return bVal - aVal
    }), [localSeats])

  // Calculate player count per table
  const tablePlayerCounts = useMemo(() => {
    const counts = {}
    seatEntries.forEach(({ seat }) => {
      if (seat.tableId) {
        counts[seat.tableId] = (counts[seat.tableId] || 0) + 1
      }
    })
    return counts
  }, [seatEntries])

  // Get list of active tables from live seat data
  const activeTables = useMemo(() => {
    const tableIds = Object.keys(tablePlayerCounts).sort()
    return tableIds.map(id => ({ id, count: tablePlayerCounts[id] }))
  }, [tablePlayerCounts])

  // Detect total player count changes and trigger glow effect
  useEffect(() => {
    const currentTotal = seatEntries.length
    const previousTotal = prevTotalCountRef.current
    
    if (previousTotal !== 0 && currentTotal !== previousTotal) {
      console.log(`✨ Total player count changed: ${previousTotal} → ${currentTotal}`)
      setTotalCountGlowing(true)
      
      setTimeout(() => {
        setTotalCountGlowing(false)
      }, TOTAL_GLOW_DURATION)
    }
    
    prevTotalCountRef.current = currentTotal
  }, [seatEntries.length, TOTAL_GLOW_DURATION])

  if (!tournament && !table) {
    return <div style={{ color: '#888' }}>No table data available</div>
  }

  const noPlayers = seatEntries.length === 0

  const showingMultipleTables = activeTables.length > 1

  return (
    <div>
      {/* Inject keyframes for glow animation once */}
      <style>{`@keyframes glowAnim { 0%{ text-shadow:none; color:#44848; } 90%{ text-shadow:none; color:#44848 } 100%{ color:#fff900; text-shadow:0 0 7px #fff900,0 0 70px #fff123; } }`}</style>
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        padding: '0.75rem'
      }}>
        <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#aaa' }}>
            {showingMultipleTables 
              ? `All Players (${activeTables.length} tables)` 
              : `Table ID: ${table?.id || tournament?.tables?.[0]?.id || activeTables[0]?.id || '—'}`}
          </span>
          <span style={{ color: '#5dd67a', fontWeight: '600', fontSize: '0.95rem' }}>
            {seatEntries.length} Active
          </span>
        </div>
        {showingMultipleTables && activeTables.length > 0 && (
          <div style={{ 
            marginBottom: '0.5rem', 
            display: 'flex', 
            gap: '0.5rem', 
            flexWrap: 'wrap',
            fontSize: '0.85rem',
            color: '#888'
          }}>
            {activeTables.map(({ id, count }) => (
              <span key={id} style={{ 
                padding: '0.25rem 0.5rem', 
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: '4px',
                color: count > 0 ? '#ccc' : '#666'
              }}>
                T{id}: {count}
              </span>
            ))}
          </div>
        )}
        {noPlayers ? (
          <div style={{ color: '#777', padding: '0.5rem' }}>No seated players</div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gap: '0.5rem',
            maxHeight: '400px',
            overflowY: 'auto',
            paddingRight: '0.25rem'
          }}>
          {seatEntries.map(({ sKey, seat }) => {
            const player = seat.player || {}
            const isYou = player.walletAddress && walletAddress && player.walletAddress === walletAddress
            const changed = changedSeats.includes(String(sKey))
            const glowStyle = changed ? { animation: `glowAnim ${ANIM_DURATION}ms ease`, color: '#fff900' } : {}
            const stackVal = seat.stack ?? seat.chips
            const formatNumber = (v) => Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            const stackDisplay = (stackVal === undefined || stackVal === null) ? '—' : formatNumber(stackVal)
            
            // Calculate BB equivalent (same method as WRChartHandStacks)
            const bigBlindValue = seat.bigBlind
            const stackInBB = (bigBlindValue && typeof bigBlindValue === 'number' && bigBlindValue > 0 && stackVal) 
              ? (stackVal / bigBlindValue) 
              : null
            const bbDisplay = stackInBB != null ? formatBigBlindValue(stackInBB) : null
            
            // compute previous stack (from the snapshot stored in applySeatUpdate)
            const prevSeat = (prevSeatValuesRef.current || {})[sKey] || {}
            const prevValRaw = prevSeat.stack ?? prevSeat.chips
            const prevValNum = (prevValRaw === undefined || prevValRaw === null) ? null : Number(prevValRaw)
            const currValNum = (stackVal === undefined || stackVal === null) ? null : Number(stackVal)
            const diffNum = (currValNum === null || prevValNum === null) ? null : (currValNum - prevValNum)
            const showDiff = diffNum !== null && diffNum !== 0
            
            // Show table info if multiple tables
            const seatLabel = showingMultipleTables 
              ? `T${seat.tableId} S${seat.originalSeatId}` 
              : `#${sKey}`
            
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
                  <span style={{ color: '#aaa', fontSize: '0.875rem', minWidth: '48px' }}>{seatLabel}</span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>{player.name || player.username || player.id || 'unknown'}</span>
                      {showDiff && (
                        <span style={{ fontSize: '0.95rem', color: diffNum > 0 ? '#5dd67a' : '#ff6b6b' }}>
                          {diffNum > 0 ? '+' : ''}{formatNumber(diffNum)}
                        </span>
                      )}
                    </div>
                    <div style={{ color: '#020101', fontSize: '0.85rem' }}>{player.walletAddress || ''}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', color: '#ccc' }}>
                  <div style={{ fontWeight: '600' }}>
                    {stackDisplay}
                    {bbDisplay && (
                      <span style={{ fontSize: '0.85rem', color: '#888', marginLeft: '0.35rem' }}>
                        ({bbDisplay} BB)
                      </span>
                    )}
                  </div>
                  {(seat.sittingOut === true || seat.sittingOut === false) && (
                    <div style={{ fontSize: '0.85rem', color: '#aaa' }}>{seat.sittingOut ? 'Sitting Out' : 'Sitting In'}</div>
                  )}
                </div>
              </div>
            )
          })}
          </div>
        )}
      </div>
    </div>
  )
}

WRPlayersTablePanel.propTypes = {
  table: PropTypes.object,
  tournament: PropTypes.object,
  walletAddress: PropTypes.string
}

WRPlayersTablePanel.defaultProps = {
  table: null,
  tournament: null,
  walletAddress: ''
}

export default React.memo(WRPlayersTablePanel)
