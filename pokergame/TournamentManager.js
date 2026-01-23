const TournamentTable = require('./TournamentTable');

class TournamentManager {
  constructor(io, botManager = null) {
    this.io = io;
    this.botManager = botManager;
    this.tournaments = new Map();
    this.nextTournamentId = 1;
  }

  createTournament(config) {
    const now = new Date();
    const registrationPeriodMs = (config.registrationPeriod || 5) * 60000; // default 5 minutes
    const registrationEndsAt = new Date(now.getTime() + registrationPeriodMs);
    
    const tournament = {
      id: this.nextTournamentId++,
      name: config.name,
      buyIn: config.buyIn || 0,
      maxPlayers: config.maxPlayers,
      startingChips: config.startingChips || 5000,
      blindStructure: config.blindStructure || 'normal',
      status: 'registering', // registering, starting, live, completed, cancelled
      registeredPlayers: [],
      tables: [],
      eliminatedPlayers: [],
      prizePool: 0,
      structure: 'No Limit Hold\'em',
      createdAt: new Date(),
      startTime: this.calculateStartTime(config.startTime),
      startTimeOption: config.startTime, // Store original config value
      registrationPeriod: config.registrationPeriod || 5,
      registrationEndsAt: registrationEndsAt,
      lateRegistrationAllowed: (config.registrationPeriod || 5) > 0,
      creatorWallet: config.creatorWallet,
      blindLevel: 1,
      handsPerLevel: this.getHandsPerLevel(config.blindStructure)
    };

    this.tournaments.set(tournament.id, tournament);
    
    // Schedule automatic start based on registration period
    if (tournament.lateRegistrationAllowed) {
      console.log(`Scheduling tournament ${tournament.id} to start in ${tournament.registrationPeriod} minutes`);
      setTimeout(() => {
        const t = this.tournaments.get(tournament.id);
        if (t && t.status === 'registering' && t.registeredPlayers.length >= 2) {
          console.log(`Registration period ended for tournament ${tournament.id}, auto-starting`);
          this.startTournament(tournament.id);
        } else if (t && t.registeredPlayers.length < 2) {
          console.log(`Tournament ${tournament.id} cancelled - not enough players`);
          t.status = 'cancelled';
          this.broadcastTournamentUpdate(tournament.id);
        }
      }, registrationPeriodMs);
    }
    
    // Also schedule based on start time if not immediate
    if (config.startTime !== 'immediate') {
      this.scheduleStart(tournament.id, config.startTime);
    }

    console.log(`Tournament created: ${tournament.name} (ID: ${tournament.id})`);
    this.broadcastTournamentUpdate(tournament.id);
    
    return tournament;
  }

  getHandsPerLevel(blindStructure) {
    switch (blindStructure) {
      case 'hyper': return 3;
      case 'turbo': return 5;
      case 'normal':
      default: return 10;
    }
  }

  calculateStartTime(startTimeOption) {
    const now = new Date();
    switch (startTimeOption) {
      case 'immediate':
        return now;
      case '5':
        return new Date(now.getTime() + 5 * 60000);
      case '15':
        return new Date(now.getTime() + 15 * 60000);
      case '30':
        return new Date(now.getTime() + 30 * 60000);
      case '60':
        return new Date(now.getTime() + 60 * 60000);
      default:
        return now;
    }
  }

  scheduleStart(tournamentId, startTimeMinutes) {
    const minutes = parseInt(startTimeMinutes);
    setTimeout(() => {
      const tournament = this.tournaments.get(tournamentId);
      if (tournament && tournament.status === 'registering') {
        this.startTournament(tournamentId);
      }
    }, minutes * 60000);
  }

  registerPlayer(tournamentId, player) {
    const tournament = this.tournaments.get(tournamentId);
    
    if (!tournament) {
      return { success: false, message: 'Tournament not found' };
    }

    // Check if registration is still allowed
    const now = new Date();
    if (tournament.status === 'live' && tournament.lateRegistrationAllowed && now <= tournament.registrationEndsAt) {
      // Late registration allowed
      console.log('Late registration accepted for tournament', tournamentId);
    } else if (tournament.status !== 'registering') {
      return { success: false, message: 'Tournament registration is closed' };
    }

    if (tournament.registeredPlayers.length >= tournament.maxPlayers) {
      return { success: false, message: 'Tournament is full' };
    }

    // Check if player already registered (commented out to allow multiple bots)
    // Note: Bots can have duplicate checks, but we skip this for flexibility
    if (!player.isBot && tournament.registeredPlayers.find(p => p.id === player.id)) {
      return { success: false, message: 'Player already registered' };
    }

    tournament.registeredPlayers.push({
      ...player,
      registeredAt: new Date(),
      chips: tournament.startingChips
    });

    tournament.prizePool += tournament.buyIn;

    console.log(`Player ${player.name} registered for tournament ${tournament.id}`);
    this.broadcastTournamentUpdate(tournamentId);

    // Only auto-start if:
    // 1. Start time was set to "immediate" AND
    // 2. No registration period (or user explicitly wants immediate start)
    // 3. Minimum 2 players met
    if (tournament.startTimeOption === 'immediate' && 
        tournament.registrationPeriod === 0 &&
        tournament.registeredPlayers.length >= 2 && 
        tournament.status === 'registering') {
      console.log(`Auto-starting tournament ${tournamentId} - immediate start with no registration period`);
      this.startTournament(tournamentId);
    }

    return { 
      success: true, 
      tournamentId: tournament.id,
      tournament: this.getTournamentInfo(tournamentId)
    };
  }

  unregisterPlayer(tournamentId, walletAddress) {
    const tournament = this.tournaments.get(tournamentId);
    
    if (!tournament) {
      return { success: false, message: 'Tournament not found' };
    }

    if (tournament.status !== 'registering') {
      return { success: false, message: 'Cannot unregister after tournament has started' };
    }

    const playerIndex = tournament.registeredPlayers.findIndex(
      p => (p.id === walletAddress || p.walletAddress === walletAddress)    
    );

    if (playerIndex === -1) {
      return { success: false, message: 'Player not registered' };
    }

    tournament.registeredPlayers.splice(playerIndex, 1);
    tournament.prizePool -= tournament.buyIn;

    console.log(`Player unregistered from tournament ${tournament.id}`);
    this.broadcastTournamentUpdate(tournamentId);

    return { success: true };
  }

  startTournament(tournamentId) {
    const tournament = this.tournaments.get(tournamentId);
    
    if (!tournament) {
      return { success: false, message: 'Tournament not found' };
    }

    if (tournament.status !== 'registering') {
      return { success: false, message: 'Tournament already started or completed' };
    }

    if (tournament.registeredPlayers.length < 2) {
      return { success: false, message: 'Not enough players to start tournament' };
    }

    tournament.status = 'live';
    tournament.actualStartTime = new Date();

    // Create tables and seat players
    this.createTables(tournamentId);
    this.seatPlayers(tournamentId);

    console.log(`Tournament ${tournament.id} started with ${tournament.registeredPlayers.length} players`);
    this.broadcastTournamentUpdate(tournamentId);

    // Start first hand on all tables
    tournament.tables.forEach((table, idx) => {
      const activePlayers = table.activePlayers().length;
      console.log(`Table ${idx}: Attempting to start hand with ${activePlayers} active players`);
      if (activePlayers >= 2) {
        console.log(`Starting hand on table ${idx}`);
        table.startHand();
        
        // Broadcast table state to all connected clients after starting hand
        this.broadcastTableState(table);
        
        // Check if first player to act is a bot
        if (this.botManager) {
          setTimeout(() => {
            this.botManager.checkAndActForBot(table, table.id);
          }, 1500);
        }
      } else {
        console.log(`Not starting hand on table ${idx} - only ${activePlayers} players`);
      }
    });

    return { 
      success: true,
      tournamentId: tournament.id,
      tournament: this.getTournamentInfo(tournamentId)
    };
  }

  createTables(tournamentId) {
    const tournament = this.tournaments.get(tournamentId);
    const playersPerTable = 9; // Max 9 players per table
    const numTables = Math.ceil(tournament.registeredPlayers.length / playersPerTable);

    for (let i = 0; i < numTables; i++) {
      const tableId = `${tournamentId}-${i + 1}`;
      const table = new TournamentTable(
        tableId,
        `Tournament ${tournamentId} - Table ${i + 1}`,
        10000, // limit
        playersPerTable,
        tournamentId
      );
      table.handsPerLevel = tournament.handsPerLevel;
      tournament.tables.push(table);
      
      console.log(`Created tournament table: ${tableId}`);
    }
  }

  seatPlayers(tournamentId) {
    const tournament = this.tournaments.get(tournamentId);
    const shuffledPlayers = [...tournament.registeredPlayers].sort(() => Math.random() - 0.5);
    
    console.log(`Seating ${shuffledPlayers.length} players in tournament ${tournamentId}`);
    
    let tableIndex = 0;
    let seatIndex = 1;

    shuffledPlayers.forEach(player => {
      const table = tournament.tables[tableIndex];
      
      console.log(`Seating player ${player.name} at table ${tableIndex}, seat ${seatIndex}`);
      table.addPlayer(player);
      table.sitPlayer(player, seatIndex, tournament.startingChips);

      seatIndex++;
      if (seatIndex > table.maxPlayers) {
        seatIndex = 1;
        tableIndex++;
      }
    });
    
    // Log final state
    tournament.tables.forEach((table, idx) => {
      console.log(`Table ${idx}: ${table.activePlayers().length} active players`);
    });
  }

  handlePlayerElimination(tournamentId, tableId, playerId) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return;

    const table = tournament.tables.find(t => t.id === tableId);
    if (!table) return;

    const position = this.getTotalActivePlayers(tournamentId) + 1 + tournament.eliminatedPlayers.length;
    
    tournament.eliminatedPlayers.push({
      player: playerId,
      position: position,
      eliminatedAt: new Date(),
      tableId: tableId
    });

    // Check if tournament is over
    if (this.getTotalActivePlayers(tournamentId) === 1) {
      this.completeTournament(tournamentId);
      return;
    }

    // Balance tables if needed
    this.balanceTables(tournamentId);
    this.broadcastTournamentUpdate(tournamentId);
  }

  getTotalActivePlayers(tournamentId) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return 0;

    return tournament.tables.reduce((total, table) => {
      return total + table.activePlayers().length;
    }, 0);
  }

  balanceTables(tournamentId) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament || tournament.tables.length <= 1) return;

    // Remove empty tables
    tournament.tables = tournament.tables.filter(table => 
      table.activePlayers().length > 0
    );

    // TODO: Implement table balancing logic
    // Move players from larger tables to smaller tables
    // Close tables when total players fit on fewer tables
  }

  completeTournament(tournamentId) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return;

    tournament.status = 'completed';
    tournament.completedAt = new Date();

    // Calculate and distribute payouts
    const payouts = this.calculatePayouts(tournamentId);
    tournament.payouts = payouts;

    console.log(`Tournament ${tournament.id} completed`);
    this.broadcastTournamentUpdate(tournamentId);
  }

  calculatePayouts(tournamentId) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return {};

    const totalPlayers = tournament.registeredPlayers.length;
    const prizePool = tournament.prizePool;
    const payouts = {};

    if (totalPlayers <= 10) {
      payouts[1] = prizePool;
    } else if (totalPlayers <= 50) {
      payouts[1] = prizePool * 0.50;
      payouts[2] = prizePool * 0.30;
      payouts[3] = prizePool * 0.20;
    } else if (totalPlayers <= 100) {
      payouts[1] = prizePool * 0.40;
      payouts[2] = prizePool * 0.25;
      payouts[3] = prizePool * 0.15;
      payouts[4] = prizePool * 0.10;
      payouts[5] = prizePool * 0.06;
      payouts[6] = prizePool * 0.04;
    } else {
      payouts[1] = prizePool * 0.35;
      payouts[2] = prizePool * 0.20;
      payouts[3] = prizePool * 0.13;
      payouts[4] = prizePool * 0.10;
      payouts[5] = prizePool * 0.07;
      payouts[6] = prizePool * 0.05;
      payouts[7] = prizePool * 0.04;
      payouts[8] = prizePool * 0.03;
      payouts[9] = prizePool * 0.03;
    }

    return payouts;
  }

  cancelTournament(tournamentId) {
    const tournament = this.tournaments.get(tournamentId);
    
    if (!tournament) {
      return { success: false, message: 'Tournament not found' };
    }

    if (tournament.status === 'live') {
      return { success: false, message: 'Cannot cancel a live tournament' };
    }

    tournament.status = 'cancelled';
    tournament.cancelledAt = new Date();

    console.log(`Tournament ${tournament.id} cancelled`);
    this.broadcastTournamentUpdate(tournamentId);

    return { success: true };
  }

  getAllTournaments() {
    return Array.from(this.tournaments.values());
  }

  getTournament(tournamentId) {
    return this.tournaments.get(tournamentId);
  }

  getTournamentInfo(tournamentId) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return null;

    return {
      id: tournament.id,
      name: tournament.name,
      buyIn: tournament.buyIn,
      prizePool: tournament.prizePool,
      maxPlayers: tournament.maxPlayers,
      registeredPlayers: tournament.registeredPlayers.map(p => ({
        id: p.id,
        name: p.name,
        walletAddress: p.walletAddress,
        chips: p.chips,
        isBot: p.isBot || false
      })),
      startingChips: tournament.startingChips,
      startTime: tournament.startTime,
      status: tournament.status,
      structure: tournament.structure,
      blindLevel: tournament.blindLevel,
      blindStructure: tournament.blindStructure,
      tableCount: tournament.tables.length,
      activePlayers: this.getTotalActivePlayers(tournamentId)
    };
  }

  getLeaderboard(tournamentId) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return null;

    const leaderboard = [];

    // Add active players
    tournament.tables.forEach(table => {
      table.activePlayers().forEach(seat => {
        leaderboard.push({
          name: seat.player.name,
          walletAddress: seat.player.walletAddress,
          chips: seat.stack,
          status: 'active',
          tableId: table.id
        });
      });
    });

    // Sort by chips
    leaderboard.sort((a, b) => b.chips - a.chips);

    // Add positions
    leaderboard.forEach((player, index) => {
      player.position = index + 1;
    });

    return leaderboard;
  }

  getPayoutStructure(tournamentId) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return null;

    return {
      prizePool: tournament.prizePool,
      payouts: this.calculatePayouts(tournamentId),
      totalPlayers: tournament.registeredPlayers.length
    };
  }

  broadcastTournamentUpdate(tournamentId) {
    const tournamentInfo = this.getTournamentInfo(tournamentId);
    if (tournamentInfo && this.io) {
      this.io.emit('TOURNAMENT_UPDATE', tournamentInfo);
    }
  }

  // Get tournament table for a specific player
  getPlayerTable(tournamentId, walletAddress) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return null;

    for (const table of tournament.tables) {
      for (let i = 1; i <= table.maxPlayers; i++) {
        const seat = table.seats[i];
        if (seat && seat.player.walletAddress === walletAddress) {
          return table;
        }
      }
    }

    return null;
  }

  // Broadcast table state to all connected players and spectators
  broadcastTableState(table) {
    if (!this.io) return;
    
    // Emit to the table room (includes spectators)
    this.io.to(`table-${table.id}`).emit('TABLE_UPDATED', {
      table: table,
      message: '',
      action: '',
      notification: ''
    });

    // Also emit to individual players
    table.players.forEach(player => {
      if (player && player.socketId) {
        this.io.to(player.socketId).emit('TABLE_UPDATED', {
          table: table,
          message: '',
          action: '',
          notification: ''
        });
      }
    });
  }
}

module.exports = TournamentManager;
