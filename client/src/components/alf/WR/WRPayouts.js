import React, { useMemo } from 'react'
import PropTypes from 'prop-types'

const WRPayouts = ({ tournament, walletAddress }) => {
  const payoutData = useMemo(() => {
    if (!tournament) return { payouts: {}, players: [] }

    const totalPlayers = tournament.registeredPlayers?.length || 0
    const prizePool = tournament.prizePool || 0
    
    // Calculate payout structure based on total players
    let payouts = {}
    if (totalPlayers <= 2) {
      payouts[1] = prizePool
    } else if (totalPlayers <= 5) {
      payouts[1] = prizePool * 0.50
      payouts[2] = prizePool * 0.30
      payouts[3] = prizePool * 0.20
    } else if (totalPlayers <= 8) {
      payouts[1] = prizePool * 0.40
      payouts[2] = prizePool * 0.25
      payouts[3] = prizePool * 0.15
      payouts[4] = prizePool * 0.10
      payouts[5] = prizePool * 0.06
      payouts[6] = prizePool * 0.04
    } else {
      payouts[1] = prizePool * 0.35
      payouts[2] = prizePool * 0.20
      payouts[3] = prizePool * 0.13
      payouts[4] = prizePool * 0.10
      payouts[5] = prizePool * 0.07
      payouts[6] = prizePool * 0.05
      payouts[7] = prizePool * 0.04
      payouts[8] = prizePool * 0.03
      payouts[9] = prizePool * 0.03
    }

    // Collect all players with their current standings
    const players = []
    
    // Get active players from tables
    if (tournament.tables && tournament.tables.length > 0) {
      tournament.tables.forEach(table => {
        if (table.seats) {
          Object.values(table.seats).forEach(seat => {
            if (seat && seat.player) {
              players.push({
                name: seat.player.name,
                walletAddress: seat.player.walletAddress,
                chips: seat.stack || 0,
                status: 'active',
                eliminated: false
              })
            }
          })
        }
      })
    }

    // Add eliminated players
    if (tournament.eliminatedPlayers && tournament.eliminatedPlayers.length > 0) {
      tournament.eliminatedPlayers.forEach(ep => {
        players.push({
          name: ep.player?.name || ep.name || 'Unknown',
          walletAddress: ep.player?.walletAddress || ep.walletAddress,
          chips: 0,
          status: 'eliminated',
          position: ep.position,
          eliminated: true,
          eliminatedAt: ep.eliminatedAt
        })
      })
    }

    // Sort: eliminated players by position (desc), active players by chips (desc)
    players.sort((a, b) => {
      if (a.eliminated && b.eliminated) {
        return (b.position || 0) - (a.position || 0)
      }
      if (a.eliminated) return 1
      if (b.eliminated) return -1
      return b.chips - a.chips
    })

    // Assign positions to active players
    let position = 1
    players.forEach(player => {
      if (!player.eliminated) {
        player.position = position++
      }
    })

    return { payouts, players }
  }, [tournament])

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
                          ELIMINATED
                        </span>
                      )}
                    </div>
                    {!player.eliminated && (
                      <div style={{ color: '#888', fontSize: '0.85rem', marginTop: '2px' }}>
                        Chips: {player.chips.toLocaleString()}
                      </div>
                    )}
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
