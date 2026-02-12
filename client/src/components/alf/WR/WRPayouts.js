import React, { useMemo, useContext, useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import socketContext from '../../../context/websocket/socketContext'
import { SC_TABLE_UPDATED } from '../../../pokergame/actions'

const WRPayouts = ({ tournament, walletAddress }) => {
  const { socket } = useContext(socketContext)
  const [tableSnapshots, setTableSnapshots] = useState({})

  // Listen for table updates to get fresh handStackSnapshots
  useEffect(() => {
    if (!socket) return

    const handler = ({ table: updatedTable }) => {
      if (!updatedTable || !updatedTable.id) return
      
      // Check if this table belongs to our tournament (dual check like WRRankingList)
      const tableIds = tournament?.tables 
        ? tournament.tables.map(t => t.id).filter(Boolean)
        : []
      
      const isWatchedTable = tableIds.includes(updatedTable.id)
      const isTournamentTable = tournament && updatedTable.tournamentId === tournament.id
      
      if (!isWatchedTable && !isTournamentTable) return

      console.log(`💰 WRPayouts: Received update for table ${updatedTable.id}`)

      // Update local tracking of handStackSnapshots for this table
      if (Array.isArray(updatedTable.handStackSnapshots)) {
        setTableSnapshots(prev => ({
          ...prev,
          [updatedTable.id]: updatedTable.handStackSnapshots
        }))
        console.log(`💰 WRPayouts: Updated snapshots for table ${updatedTable.id}, total snapshots: ${updatedTable.handStackSnapshots.length}`)
      }
    }

    socket.on(SC_TABLE_UPDATED, handler)
    return () => socket.off(SC_TABLE_UPDATED, handler)
  }, [socket, tournament?.tables, tournament?.id])

  const payoutData = useMemo(() => {
    if (!tournament) return { payouts: {}, players: [] }

    const totalPlayers = tournament.registeredPlayers?.length || 0
    const prizePool = tournament.prizePool || 0
    
    // Calculate payout structure based on total players
    let payouts = {}
    if (totalPlayers <= 2) {
      payouts[1] = prizePool * 1.00
    } else if (totalPlayers <= 5) {
      payouts[1] = prizePool * 0.50
      payouts[2] = prizePool * 0.30
      payouts[3] = prizePool * 0.20
    } else if (totalPlayers <= 10) {
      payouts[1] = prizePool * 0.40
      payouts[2] = prizePool * 0.25
      payouts[3] = prizePool * 0.15
      payouts[4] = prizePool * 0.12
      payouts[5] = prizePool * 0.08
    } else if (totalPlayers <= 20) {
      payouts[1] = prizePool * 0.35
      payouts[2] = prizePool * 0.22
      payouts[3] = prizePool * 0.15
      payouts[4] = prizePool * 0.12
      payouts[5] = prizePool * 0.09
      payouts[6] = prizePool * 0.07
    } else if (totalPlayers <= 30) {
      payouts[1] = prizePool * 0.30
      payouts[2] = prizePool * 0.20
      payouts[3] = prizePool * 0.15
      payouts[4] = prizePool * 0.11
      payouts[5] = prizePool * 0.09
      payouts[6] = prizePool * 0.07
      payouts[7] = prizePool * 0.05
      payouts[8] = prizePool * 0.03
    } else {
      // For 31+ players (like 50-player tournaments)
      payouts[1] = prizePool * 0.25
      payouts[2] = prizePool * 0.18
      payouts[3] = prizePool * 0.13
      payouts[4] = prizePool * 0.10
      payouts[5] = prizePool * 0.08
      payouts[6] = prizePool * 0.07
      payouts[7] = prizePool * 0.06
      payouts[8] = prizePool * 0.05
      payouts[9] = prizePool * 0.04
      payouts[10] = prizePool * 0.04
    }

    // Use handStackSnapshots to build player standings
    const allSnapshots = []

    // Collect all handStackSnapshots from all tables (merge tournament data with live updates)
    if (tournament.tables && tournament.tables.length > 0) {
      tournament.tables.forEach(table => {
        // Use live snapshots from socket if available, otherwise use what's in tournament data
        const snapshots = tableSnapshots[table.id] || table.handStackSnapshots
        
        if (Array.isArray(snapshots) && snapshots.length > 0) {
          allSnapshots.push(...snapshots.map(snapshot => ({
            ...snapshot,
            tableId: table.id
          })))
        }
      })
    }

    // Sort snapshots by hand number to process chronologically
    allSnapshots.sort((a, b) => (a.hand || 0) - (b.hand || 0))

    // Track all players seen across all snapshots
    const playerHistory = new Map() // playerId -> player data
    const lastHandNumber = allSnapshots.length > 0 ? allSnapshots[allSnapshots.length - 1].hand : 0

    // Process each snapshot in chronological order
    allSnapshots.forEach(snapshot => {
      const currentHand = snapshot.hand || 0
      
      if (Array.isArray(snapshot.stacks)) {
        snapshot.stacks.forEach(seatData => {
          if (seatData && seatData.player) {
            const playerId = seatData.player.id || seatData.player.username
            const playerName = seatData.player.username || seatData.player.name || seatData.player.id
            const stack = Number(seatData.stack || 0)

            if (!playerHistory.has(playerId)) {
              playerHistory.set(playerId, {
                id: playerId,
                name: playerName,
                chips: stack,
                lastSeenHand: currentHand,
                eliminated: false,
                eliminatedAtHand: null
              })
            }

            // Update player's data
            const playerData = playerHistory.get(playerId)
            playerData.chips = stack
            playerData.lastSeenHand = currentHand

            // ONLY mark as eliminated if stack is actually 0
            if (stack === 0 && !playerData.eliminated) {
              playerData.eliminated = true
              playerData.eliminatedAtHand = currentHand
            } else if (stack > 0) {
              // If player has chips again, they're not eliminated (shouldn't happen, but defensive)
              playerData.eliminated = false
              playerData.eliminatedAtHand = null
            }
          }
        })
      }
    })

    // Check tournament's eliminatedPlayers list if available
    if (tournament.eliminatedPlayers && Array.isArray(tournament.eliminatedPlayers)) {
      tournament.eliminatedPlayers.forEach(eliminated => {
        const playerId = eliminated.player || eliminated.playerId
        if (playerId && playerHistory.has(playerId)) {
          const playerData = playerHistory.get(playerId)
          playerData.eliminated = true
          playerData.chips = 0
          // Use the position as a proxy for elimination order if no hand number
          playerData.eliminatedAtHand = eliminated.eliminatedAtHand || eliminated.hand || null
        }
      })
    }

    // DO NOT mark players as eliminated just because they're not in the latest snapshot
    // In multi-table tournaments, tables progress at different rates

    // Final cleanup - ensure eliminated players have 0 chips
    playerHistory.forEach((playerData) => {
      if (playerData.eliminated) {
        playerData.chips = 0
      }
    })

    // Build final player list from playerHistory
    const players = []
    playerHistory.forEach((playerData) => {
      // Try to find player in registered players to get walletAddress
      const registeredPlayer = tournament.registeredPlayers?.find(
        rp => rp.id === playerData.id || rp.name === playerData.name || rp.username === playerData.name
      )

      players.push({
        id: playerData.id,
        name: playerData.name,
        walletAddress: registeredPlayer?.walletAddress || null,
        chips: playerData.chips,
        status: playerData.eliminated ? 'eliminated' : 'active',
        eliminated: playerData.eliminated,
        eliminatedAtHand: playerData.eliminatedAtHand
      })
    })

    // If no snapshots exist yet, fall back to registered players
    if (players.length === 0 && tournament.registeredPlayers && tournament.registeredPlayers.length > 0) {
      tournament.registeredPlayers.forEach(rp => {
        players.push({
          id: rp.id || rp.walletAddress,
          name: rp.name || rp.username,
          walletAddress: rp.walletAddress,
          chips: rp.chips || tournament.startingChips || 0,
          status: 'registered',
          eliminated: false,
          eliminatedAtHand: null
        })
      })
    }

    // Sort: active players by chips (desc), then eliminated players
    players.sort((a, b) => {
      if (a.eliminated && b.eliminated) {
        // Both eliminated: sort by elimination hand (later = better)
        return (b.eliminatedAtHand || 0) - (a.eliminatedAtHand || 0)
      }
      if (a.eliminated) return 1 // Eliminated go after active
      if (b.eliminated) return -1 // Active come first
      return b.chips - a.chips // Sort active by chips descending
    })

    // Assign final positions
    let position = 1
    players.forEach(player => {
      player.position = position++
    })

    return { payouts, players }
  }, [tournament, tableSnapshots])

  const formatCurrency = (amount) => {
    return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const getPayoutForPosition = (position) => {
    return payoutData.payouts[position] || 0
  }

  if (!tournament) {
    return null
  }

  return (
    <div style={{
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '8px',
      padding: '1rem',
      marginTop: '2rem'
    }}>
      <h3 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: '1.25rem' }}>
        Prize Pool Distribution
      </h3>
      
      <div style={{ marginBottom: '1.5rem', color: '#aaa', fontSize: '0.9rem' }}>
        Total Prize Pool: <span style={{ color: '#27ae60', fontWeight: 'bold', fontSize: '1.1rem' }}>
          {formatCurrency(tournament.prizePool || 0)}
        </span>
      </div>

      {/* Payout Structure */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: '0.75rem',
        marginBottom: '1.5rem'
      }}>
        {Object.entries(payoutData.payouts).map(([position, amount]) => (
          <div key={position} style={{
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            padding: '0.75rem',
            borderRadius: '4px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            textAlign: 'center'
          }}>
            <div style={{ color: '#f39c12', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
              {position === '1' ? '🥇' : position === '2' ? '🥈' : position === '3' ? '🥉' : ''} {position}{position === '1' ? 'st' : position === '2' ? 'nd' : position === '3' ? 'rd' : 'th'} Place
            </div>
            <div style={{ color: '#27ae60', fontWeight: 'bold' }}>
              {formatCurrency(amount)}
            </div>
          </div>
        ))}
      </div>

      {/* Players Standings */}
      <h4 style={{ margin: '0 0 0.75rem 0', color: '#ccc', fontSize: '1rem' }}>
        Current Standings
      </h4>
      
      <div style={{ display: 'grid', gap: '0.5rem' }}>
        {payoutData.players.length === 0 ? (
          <div style={{ color: '#777', padding: '1rem', textAlign: 'center' }}>
            No players yet
          </div>
        ) : (
          payoutData.players.map((player, index) => {
            const isYou = player.walletAddress && walletAddress && player.walletAddress === walletAddress
            const payout = getPayoutForPosition(player.position)
            const willGetPayout = payout > 0

            return (
              <div key={index} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem',
                backgroundColor: isYou ? 'rgba(39, 174, 96, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                borderRadius: '4px',
                border: isYou ? '1px solid rgba(39, 174, 96, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                opacity: player.eliminated ? 0.6 : 1
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                  <div style={{
                    minWidth: '40px',
                    textAlign: 'center',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    color: player.position === 1 ? '#f39c12' : player.position <= 3 ? '#27ae60' : '#888'
                  }}>
                    #{player.position}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: '#fff', fontWeight: isYou ? 'bold' : 'normal' }}>
                        {player.name}
                      </span>
                      {isYou && (
                        <span style={{
                          backgroundColor: '#27ae60',
                          color: 'white',
                          padding: '0.1rem 0.4rem',
                          borderRadius: '3px',
                          fontSize: '0.7rem',
                          fontWeight: 'bold'
                        }}>
                          YOU
                        </span>
                      )}
                      {player.eliminated && (
                        <span style={{
                          backgroundColor: '#e74c3c',
                          color: 'white',
                          padding: '0.1rem 0.4rem',
                          borderRadius: '3px',
                          fontSize: '0.7rem',
                          fontWeight: 'bold'
                        }}>
                          ELIMINATED{player.eliminatedAtHand ? ` (Hand #${player.eliminatedAtHand})` : ''}
                        </span>
                      )}
                    </div>
                    <div style={{ color: '#888', fontSize: '0.85rem', marginTop: '2px' }}>
                      {player.eliminated ? (
                        <>Chips: 0 (Eliminated)</>
                      ) : (
                        <>Chips: {player.chips.toLocaleString()}</>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {willGetPayout ? (
                    <div style={{ color: '#27ae60', fontWeight: 'bold', fontSize: '1.1rem' }}>
                      {formatCurrency(payout)}
                    </div>
                  ) : (
                    <div style={{ color: '#666', fontSize: '0.9rem' }}>
                      No payout
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

WRPayouts.propTypes = {
  tournament: PropTypes.object,
  walletAddress: PropTypes.string
}

WRPayouts.defaultProps = {
  tournament: null,
  walletAddress: ''
}

export default React.memo(WRPayouts)
