import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend
} from 'chart.js'
import socketContext from '../../../context/websocket/socketContext'
import { SC_TABLE_UPDATED } from '../../../pokergame/actions'

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend
)

const MAX_SNAPSHOTS = 8
const COLOR_PALETTE = ['#4cc9f0', '#ff477e', '#ffd166', '#06d6a0', '#faa307', '#f72585', '#9d4edd', '#48bfe3']

const formatAmount = (value) => Number(value || 0).toLocaleString(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})

const formatBigBlindValue = (value) => {
  if (!Number.isFinite(value)) return null
  if (Math.abs(value) >= 100) return value.toFixed(0)
  if (Math.abs(value) >= 10) return value.toFixed(1)
  return value.toFixed(2)
}

const playerLabel = (seat) => {
  if (!seat?.player) return 'Empty'
  return seat.player.username || seat.player.name || seat.player.id || 'Player'
}

const WRStartHandStacks = ({ table, tournament }) => {
  const { socket } = useContext(socketContext)
  
  // Determine if we're showing multiple tables or single table
  const tables = useMemo(() => {
    if (tournament?.tables && Array.isArray(tournament.tables) && tournament.tables.length > 0) {
      return tournament.tables
    }
    if (table) {
      return [table]
    }
    return []
  }, [tournament, table])
  
  const [selectedTableIndex, setSelectedTableIndex] = useState(0)
  const currentTable = tables[selectedTableIndex] || null
  const tableId = currentTable?.id

  useEffect(() => {
    if (selectedTableIndex > 0 && selectedTableIndex >= tables.length) {
      setSelectedTableIndex(Math.max(0, tables.length - 1))
    }
  }, [selectedTableIndex, tables.length])
  
  const chartRef = useRef(null)
  const chartInstanceRef = useRef(null)
  const latestHandRef = useRef(null)
  const [localSnapshots, setLocalSnapshots] = useState(() =>
    Array.isArray(currentTable?.handStackSnapshots) ? currentTable.handStackSnapshots : []
  )
  const [showSnapshotList, setShowSnapshotList] = useState(false)

  useEffect(() => {
    const initialSnapshots = Array.isArray(currentTable?.handStackSnapshots)
      ? currentTable.handStackSnapshots
      : []
    setLocalSnapshots(initialSnapshots)
    const lastHand = initialSnapshots.length
      ? initialSnapshots[initialSnapshots.length - 1].hand || initialSnapshots.length
      : null
    latestHandRef.current = lastHand
  }, [tableId, currentTable?.handStackSnapshots])

  useEffect(() => {
    if (!socket || !tableId) return undefined

    const handler = ({ table: updatedTable }) => {
      if (!updatedTable || updatedTable.id !== tableId) return
      if (!Array.isArray(updatedTable.handStackSnapshots)) return

      const incomingSnapshots = updatedTable.handStackSnapshots
      const latestIncoming = incomingSnapshots.length
        ? incomingSnapshots[incomingSnapshots.length - 1].hand || incomingSnapshots.length
        : null

      if (latestIncoming && latestIncoming !== latestHandRef.current) {
        latestHandRef.current = latestIncoming
        setLocalSnapshots(incomingSnapshots.slice())
      }
    }

    socket.on(SC_TABLE_UPDATED, handler)
    return () => socket.off(SC_TABLE_UPDATED, handler)
  }, [socket, tableId])

  const chronologicalSnapshots = useMemo(
    () => (localSnapshots || []).slice(-MAX_SNAPSHOTS),
    [localSnapshots]
  )

  const snapshots = useMemo(
    () => chronologicalSnapshots.slice().reverse(),
    [chronologicalSnapshots]
  )

  const chartData = useMemo(() => {
    if (!chronologicalSnapshots.length) return null

    const labels = chronologicalSnapshots.map((snapshot, idx) => snapshot.hand || idx + 1)
    const seatIds = new Set()
    chronologicalSnapshots.forEach((snapshot) => {
      (snapshot.stacks || []).forEach((seat) => {
        if (seat?.seatId) {
          seatIds.add(seat.seatId)
        }
      })
    })


      const bbPerSnapshot = chronologicalSnapshots.map((snapshot) => {
        const bbValue = snapshot && typeof snapshot.bigBlind === 'number' ? snapshot.bigBlind : null
        return bbValue && bbValue > 0 ? bbValue : null
      })
      const usesBigBlindScale = bbPerSnapshot.some((bb) => bb)
    const relevantSeatIds = Array.from(seatIds).filter((seatId) =>
      chronologicalSnapshots.some((snapshot) => {
        const seat = (snapshot.stacks || []).find((s) => s?.seatId === seatId)
        return seat && seat.player
      })
    )

    if (!relevantSeatIds.length) return null

    const datasets = relevantSeatIds.sort((a, b) => a - b).map((seatId) => {
      const recentSeat = chronologicalSnapshots
        .slice()
        .reverse()
        .map((snapshot) => (snapshot.stacks || []).find((seat) => seat?.seatId === seatId))
        .find((seat) => seat && seat.player)

      const seatLabel = recentSeat && recentSeat.player ? playerLabel(recentSeat) : ''
      const color = COLOR_PALETTE[(seatId - 1) % COLOR_PALETTE.length]

      return {
        label: `Seat ${seatId}${seatLabel ? ` · ${seatLabel}` : ''}`,
        data: chronologicalSnapshots.map((snapshot, snapIdx) => {
          const seat = (snapshot.stacks || []).find((s) => s?.seatId === seatId)
          if (!seat) return null
          const bbValue = bbPerSnapshot[snapIdx]
          if (bbValue) {
            return Number((seat.stack / bbValue).toFixed(2))
          }
          return Number(seat.stack || 0)
        }),
        borderColor: color,
        backgroundColor: color,
        tension: 0.25,
        spanGaps: true,
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 4,
        bbPerPoint: bbPerSnapshot,
        usesBigBlindScale,
      }
    })

    return { labels, datasets, usesBigBlindScale }
  }, [chronologicalSnapshots])

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'nearest', intersect: false },
      plugins: {
        legend: {
          labels: {
            color: '#ddd',
            usePointStyle: true,
            padding: 12
          }
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              if (typeof context.parsed.y !== 'number') return context.dataset.label
              const dataset = context.dataset || {}
              const bbValue = dataset.bbPerPoint?.[context.dataIndex]
              if (bbValue) {
                const chips = context.parsed.y * bbValue
                return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} BB ($${formatAmount(chips)})`
              }
              return `${context.dataset.label}: $${formatAmount(context.parsed.y)}`
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#bbb' },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        },
        y: {
          ticks: {
            color: '#bbb',
            callback: (value) => {
              if (chartData?.usesBigBlindScale) {
                const formatted = formatBigBlindValue(Number(value))
                return formatted != null ? `${formatted} BB` : ''
              }
              return `$${formatAmount(value)}`
            }
          },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        }
      }
    }),
    [chartData]
  )

  useEffect(() => {
    if (!chartRef.current || !chartData) return undefined

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy()
    }

    chartInstanceRef.current = new Chart(chartRef.current, {
      type: 'line',
      data: chartData,
      options: chartOptions
    })

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy()
        chartInstanceRef.current = null
      }
    }
  }, [chartData, chartOptions])

  if (!tables.length) {
    return <div style={{ color: '#888', fontSize: '0.95rem', marginTop: '0.5rem' }}>No tables available</div>
  }

  if (!tableId) {
    return <div style={{ color: '#888', fontSize: '0.95rem', marginTop: '0.5rem' }}>No table selected</div>
  }

  if (!snapshots.length) {
    return <div style={{ color: '#888', fontSize: '0.95rem', marginTop: '0.5rem' }}>No recorded start-hand stacks yet</div>
  }

  return (
    <div style={{ marginTop: '1rem', backgroundColor: 'rgba(7, 10, 29, 0.65)', padding: '0.75rem', borderRadius: 8 }}>
      <div style={{ marginBottom: '0.5rem', color: '#ccc', fontWeight: 600 }}>Start-Hand Stacks</div>
      
      {/* Table Tabs */}
      {tables.length > 1 && (
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '0.75rem',
          overflowX: 'auto',
          paddingBottom: '0.25rem'
        }}>
          {tables.map((tbl, index) => (
            <button
              key={tbl.id || index}
              type="button"
              onClick={() => setSelectedTableIndex(index)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
                backgroundColor: selectedTableIndex === index 
                  ? 'rgba(76, 201, 240, 0.25)' 
                  : 'rgba(255, 255, 255, 0.05)',
                color: selectedTableIndex === index 
                  ? '#4cc9f0' 
                  : '#aaa',
                borderBottom: selectedTableIndex === index 
                  ? '2px solid #4cc9f0' 
                  : '2px solid transparent'
              }}
            >
              Table {tbl.id || index + 1}
            </button>
          ))}
        </div>
      )}
      <div style={{ height: 260, marginBottom: '0.75rem', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: 6, padding: '0.5rem' }}>
        {chartData ? (
          <canvas ref={chartRef} style={{ width: '100%', height: '100%' }} />
        ) : (
          <div style={{ color: '#888', fontSize: '0.9rem', textAlign: 'center', paddingTop: '5rem' }}>
            Waiting for stack data...
          </div>
        )}
      </div>
      <div style={{
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 8,
        padding: '0.5rem',
        backgroundColor: 'rgba(255, 255, 255, 0.01)'
      }}>
        <button
          type="button"
          onClick={() => setShowSnapshotList((prev) => !prev)}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            color: '#e4e7ff',
            fontSize: '0.9rem',
            fontWeight: 600,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            padding: '0.35rem 0.25rem'
          }}
        >
          <span>Snapshot Details</span>
          <span style={{ fontSize: '1.05rem' }}>{showSnapshotList ? '▾' : '▸'}</span>
        </button>
        {showSnapshotList && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
            {snapshots.map((snapshot, idx) => {
              const timeLabel = snapshot.ts ? new Date(snapshot.ts).toLocaleTimeString() : ''
              const bigBlindLabel = typeof snapshot.bigBlind === 'number'
                ? `$${formatAmount(snapshot.bigBlind)}`
                : null
              return (
                <div key={`${snapshot.hand || idx}-${snapshot.ts || idx}`} style={{
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 6,
                  padding: '0.5rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.8rem',
                    color: '#9cb3ff',
                    marginBottom: '0.35rem',
                    flexWrap: 'wrap',
                    gap: '0.35rem'
                  }}>
                    <span>Hand {snapshot.hand || '—'}</span>
                    {bigBlindLabel && (
                      <span style={{ color: '#ffd166' }}>BB {bigBlindLabel}</span>
                    )}
                    <span style={{ color: '#b7c6ff' }}>{timeLabel}</span>
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '0.35rem'
                  }}>
                    {(snapshot.stacks || []).map((seat, seatIdx) => {
                      const seatStack = Number(seat?.stack || 0)
                      const bbValue = snapshot && typeof snapshot.bigBlind === 'number' && snapshot.bigBlind > 0
                        ? snapshot.bigBlind
                        : null
                      const stackInBB = bbValue ? seatStack / bbValue : null
                      const bbDisplay = stackInBB != null ? formatBigBlindValue(stackInBB) : null
                      return (
                        <div key={`${snapshot.hand || idx}-seat-${seat?.seatId || seatIdx}`} style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.03)',
                          borderRadius: 4,
                          padding: '0.4rem'
                        }}>
                          <div style={{ fontSize: '0.78rem', color: '#bbb', marginBottom: '0.15rem' }}>
                            Seat {seat?.seatId || seatIdx + 1} · {playerLabel(seat)}
                          </div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fefefe' }}>
                            {bbDisplay != null ? (
                              <span>
                                {bbDisplay} BB <span style={{ color: '#7af5c9', fontSize: '0.8rem' }}>
                                  (${formatAmount(seatStack)})
                                </span>
                              </span>
                            ) : (
                              <>${formatAmount(seatStack)}</>
                            )}
                          </div>
                        </div>
                      )
                    })} 
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

WRStartHandStacks.propTypes = {
  table: PropTypes.object,
  tournament: PropTypes.object
}

WRStartHandStacks.defaultProps = {
  table: null,
  tournament: null
}

export default React.memo(WRStartHandStacks)
