const TournamentTable = require('./TournamentTable');

class TournamentManager {
  constructor(io, botManager = null, tables = {}) {
    this.io = io;
    this.botManager = botManager;
    this.tables = tables; // Reference to main tables object for socket broadcasting
    this.tournaments = new Map();
    this.nextTournamentId = 1;
    this.blindTimers = new Map(); // Store blind increase timers for each tournament
  }

  createTournament(config) {
    const now = new Date();
    const registrationPeriodMs = (config.registrationPeriod || 5) * 60000;
    const registrationEndsAt = new Date(now.getTime() + registrationPeriodMs);

    // Use config.startingBlindLevel or default to 1
    const startingBlindLevel = config.startingBlindLevel || 1;

    const tournament = {
      id: this.nextTournamentId++,
      name: config.name,
      buyIn: config.buyIn || 0,
      maxPlayers: config.maxPlayers,
      startingChips: config.startingChips || 5000,
      blindStructure: config.blindStructure || 'normal',
      status: 'registering',
      registeredPlayers: [],
      tables: [],
      eliminatedPlayers: [],
      prizePool: config.prizePool || 0,
      structure: 'No Limit Hold\'em',
      createdAt: new Date(),
      startTime: this.calculateStartTime(config.startTime),
      startTimeOption: config.startTime,
      registrationPeriod: config.registrationPeriod || 5,
      registrationEndsAt: registrationEndsAt,
      lateRegistrationAllowed: (config.registrationPeriod || 5) > 0,
      creatorWallet: config.creatorWallet,
      blindLevel: startingBlindLevel,
      minutesPerLevel: this.getMinutesPerLevel(config.blindStructure),
      startingBlindLevel,
      lastBlindIncreaseTime: null // Track when blinds were last increased
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


  // In TournamentManager.js, getMinutesPerLevel():
getMinutesPerLevel(blindStructure) {
  switch (blindStructure) {
    case 'hyper': return 0.5;   // 30 seconds for testing
    case 'turbo': return 1;     // 1 minute for testing  
    case 'normal':
    default: return 2;          // 2 minutes for testing
  }
}

  getMinutesPerLevelprod(blindStructure) {
    switch (blindStructure) {
      case 'hyper': return 3;   // 3 minutes per blind level
      case 'turbo': return 5;   // 5 minutes per blind level
      case 'normal':
      default: return 10;       // 10 minutes per blind level
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

  registerPlayer(tournamentId, player,playerw) {
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
    if (!playerw.isBot && tournament.registeredPlayers.find(p => p.id === playerw.id)) {
      return { success: false, message: 'Player already registered' };
    }

    tournament.registeredPlayers.push({
      ...playerw,
      registeredAt: new Date(),
      chips: tournament.startingChips
    });

    tournament.prizePool += tournament.buyIn;

    console.log(`Player ${playerw.name} registered for tournament ${tournament.id}`);
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

    return { success: true, tournamentId: tournament.id, tournament: this.getTournamentInfo(tournamentId) };
  }

  unregisterPlayer(tournamentId, walletAddress, socketId) {
    const tournament = this.tournaments.get(tournamentId);

    if (!tournament) {
      return { success: false, message: 'Tournament not found' };
    }

    if (tournament.status !== 'registering') {
      return { success: false, message: 'Cannot unregister after tournament has started' };
    }

    const playerIndex = tournament.registeredPlayers.findIndex(
      p => (p.socketId === socketId || p.walletAddress === walletAddress)
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

    // Add all tournament tables to main tables object for socket broadcasting
    console.log(`📋 Adding ${tournament.tables.length} tournament tables to main tables object...`);
    if (this.tables && tournament.tables) {
      tournament.tables.forEach((table, idx) => {
        this.tables[table.id] = table;
        console.log(`✅ [${idx + 1}/${tournament.tables.length}] Registered table ${table.id} in main tables object`);
      });
      
      // Verify all tables are accessible
      console.log(`🔍 Verifying table registration:`);
      tournament.tables.forEach(table => {
        const found = this.tables[table.id];
        console.log(`   - Table ${table.id}: ${found ? '✅ FOUND' : '❌ NOT FOUND'}`);
      });
    } else {
      console.error(`⚠️  Cannot register tables: this.tables=${!!this.tables}, tournament.tables=${!!tournament.tables}`);
    }

    console.log(`Tournament ${tournament.id} started with ${tournament.registeredPlayers.length} players`);
    this.broadcastTournamentUpdate(tournamentId);

    // Start first hand on all tables (staggered to avoid conflicts)
    console.log(`🎮 Starting hands on ${tournament.tables.length} tables...`);
    tournament.tables.forEach((table, idx) => {
      const activePlayers = table.activePlayers().length;
      console.log(`🎲 Table ${table.id} (idx:${idx}): ${activePlayers} active players, ${activePlayers >= 2 ? 'WILL START' : 'NOT ENOUGH PLAYERS'}`);
      
      if (activePlayers >= 2) {
        // Stagger table starts by 500ms each to avoid simultaneous broadcasts
        const startDelay = idx * 500;
        console.log(`⏱️  Table ${table.id}: Scheduled to start in ${startDelay}ms`);
        
        setTimeout(() => {
          console.log(`🎴 Table ${table.id}: START HAND NOW (turn will be: ${table.button ? 'seat ' + table.button : 'not set yet'})`);
          table.startHand();
          
          console.log(`🎴 Table ${table.id}: Hand started, current turn: seat ${table.turn}, handOver: ${table.handOver}`);

          // Broadcast table state to all connected clients after starting hand
          this.broadcastTableState(table);

          // Check if first player to act is a bot (capture table in closure)
          if (this.botManager) {
            const currentTable = table; // Capture in closure
            const currentTableId = table.id;
            setTimeout(() => {
              console.log(`🤖 Table ${currentTableId}: Checking for bot action...`);
              this.botManager.checkAndActForBot(currentTable, currentTableId);
            }, 1500);
          } else {
            console.log(`⚠️  Table ${table.id}: No botManager available`);
          }
        }, startDelay);
      } else {
        console.log(`⚠️  Table ${table.id}: Cannot start - only ${activePlayers} players`);
      }
    });
    
    console.log(`🎮 All ${tournament.tables.length} table starts scheduled`);

    // Start time-based blind increase timer
    this.startBlindTimer(tournamentId);

    return { success: true, tournamentId: tournament.id, tournament: this.getTournamentInfo(tournamentId) };
  }

  startBlindTimer(tournamentId) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return;

    // Clear any existing timer for this tournament
    this.stopBlindTimer(tournamentId);

    // Initialize last blind increase time
    tournament.lastBlindIncreaseTime = Date.now();

    const minutesPerLevel = tournament.minutesPerLevel;
    const checkIntervalMs = 30000; // Check every 30 seconds

    console.log(`⏰ Starting blind timer for tournament ${tournamentId}: ${minutesPerLevel} minutes per level`);

    const timer = setInterval(() => {
      const t = this.tournaments.get(tournamentId);
      if (!t || t.status !== 'live') {
        console.log(`⏰ Stopping blind timer for tournament ${tournamentId}: tournament ${!t ? 'not found' : 'not live'}`);
        this.stopBlindTimer(tournamentId);
        return;
      }

      const elapsedMs = Date.now() - t.lastBlindIncreaseTime;
      const elapsedMinutes = elapsedMs / 60000;

      if (elapsedMinutes >= minutesPerLevel) {
        console.log(`⏰ Time to increase blinds! Elapsed: ${elapsedMinutes.toFixed(1)} minutes`);
        this.increaseBlindsForAllTables(tournamentId);
        t.lastBlindIncreaseTime = Date.now();
      }
    }, checkIntervalMs);

    this.blindTimers.set(tournamentId, timer);
  }

  stopBlindTimer(tournamentId) {
    const timer = this.blindTimers.get(tournamentId);
    if (timer) {
      clearInterval(timer);
      this.blindTimers.delete(tournamentId);
      console.log(`⏰ Stopped blind timer for tournament ${tournamentId}`);
    }
  }

  increaseBlindsForAllTables(tournamentId) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return;

    console.log(`📈 Increasing blinds for all tables in tournament ${tournamentId}`);

    let blindIncreaseInfo = null;

    // Increase blinds on all tables simultaneously
    tournament.tables.forEach(table => {
      if (table.activePlayers().length >= 2) {
        const increaseResult = table.increaseBlinds();
        if (increaseResult) {
          blindIncreaseInfo = increaseResult;
          console.log(`📈 Table ${table.id}: ${increaseResult.message}`);
          table.winMessages.push(increaseResult.message);
          
          // Broadcast updated table state
          this.broadcastTableState(table);
        }
      }
    });

    if (blindIncreaseInfo) {
      // Update tournament's blind level
      tournament.blindLevel = blindIncreaseInfo.level;
      console.log(`📈 Tournament ${tournamentId} blind level updated to ${blindIncreaseInfo.level}`);
      this.broadcastTournamentUpdate(tournamentId);
    }
  }

  createTables(tournamentId) {
    const tournament = this.tournaments.get(tournamentId);
    const playersPerTable = 9; // Max 9 players per table
    const numTables = Math.ceil(tournament.registeredPlayers.length / playersPerTable);

    console.log(`🏗️  Creating ${numTables} tables for tournament ${tournamentId} with ${tournament.registeredPlayers.length} players`);

    for (let i = 0; i < numTables; i++) {
      const tableId = `${tournamentId}-${i + 1}`;
      const table = new TournamentTable(
        tableId,
        `Tournament ${tournamentId} - Table ${i + 1}`,
        10000, // limit
        playersPerTable,
        tournamentId,
        tournament.startingBlindLevel || 1,
        this
      );
      tournament.tables.push(table);

      console.log(`✅ Created tournament table: ${tableId} (blindLevel: ${tournament.startingBlindLevel || 1})`);
    }
    
    console.log(`🏗️  Total tables created: ${tournament.tables.length}`);
  }

  seatPlayers(tournamentId) {
    const tournament = this.tournaments.get(tournamentId);
    const shuffledPlayers = [...tournament.registeredPlayers].sort(() => Math.random() - 0.5);

    console.log(`👥 Seating ${shuffledPlayers.length} players across ${tournament.tables.length} tables...`);

    let tableIndex = 0;
    let seatIndex = 1;

    shuffledPlayers.forEach((player, idx) => {
      const table = tournament.tables[tableIndex];
      
      // For tournament players without socketId, use their id as socketId
      if (!player.socketId) {
        player.socketId = player.id;
      }

      console.log(`👤 [${idx + 1}/${shuffledPlayers.length}] ${player.name} → Table ${table.id}, seat ${seatIndex}`);
      table.addPlayer(player);
      table.sitPlayer(player, seatIndex, tournament.startingChips);

      seatIndex++;
      if (seatIndex > table.maxPlayers) {
        seatIndex = 1;
        tableIndex++;
      }
    });

    // Log final state
    console.log(`\n📊 Final seating arrangement:`);
    tournament.tables.forEach((table, idx) => {
      const players = table.activePlayers();
      console.log(`   Table ${table.id}: ${players.length} players - [${players.map(s => s.player.name).join(', ')}]`);
    });
    console.log('');
  }

  handlePlayerElimination(tournamentId, tableId, playerId) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return;

    const table = tournament.tables.find(t => t.id === tableId);
    if (!table) return;

    // Find the player to get their name
    let playerName = 'Unknown Player';
    const registeredPlayer = tournament.registeredPlayers.find(p => 
      p.id === playerId || p.walletAddress === playerId
    );
    if (registeredPlayer) {
      playerName = registeredPlayer.name || registeredPlayer.username || playerId;
    }

    const alreadyEliminated = tournament.eliminatedPlayers.some((eliminated) =>
      String(eliminated.player || eliminated.playerId) === String(playerId),
    );

    if (alreadyEliminated) {
      console.log(`⚠️  Skipping duplicate elimination record for player ${playerId}`);
      return;
    }

    const totalRegisteredPlayers = Array.isArray(tournament.registeredPlayers) && tournament.registeredPlayers.length > 0
      ? tournament.registeredPlayers.length
      : this.getTotalActivePlayers(tournamentId) + tournament.eliminatedPlayers.length;

    const position = Math.max(2, totalRegisteredPlayers - tournament.eliminatedPlayers.length);

    console.log(`💀 Player eliminated at table ${tableId}, position ${position}`);
    console.log(`   Total active players in tournament: ${this.getTotalActivePlayers(tournamentId)}`);

    tournament.eliminatedPlayers.push({
      player: playerId,
      playerName: playerName,
      position: position,
      eliminatedAt: new Date(),
      tableId: tableId
    });

    // Check if tournament is over
    if (this.getTotalActivePlayers(tournamentId) === 1) {
      console.log(`🏆 Tournament ${tournamentId} complete - 1 player remaining`);
      this.completeTournament(tournamentId);
      return;
    }

    // Balance tables after elimination
    console.log(`⚖️  Triggering table balance after elimination...`);
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

    console.log(`⚖️  Balancing tables for tournament ${tournamentId}...`);

    // Remove empty tables first
    const emptyTables = tournament.tables.filter(table => table.activePlayers().length === 0);
    if (emptyTables.length > 0) {
      console.log(`🗑️  Removing ${emptyTables.length} empty table(s)`);
      emptyTables.forEach(table => {
        // Remove from main tables registry
        if (this.tables && this.tables[table.id]) {
          delete this.tables[table.id];
          console.log(`   - Removed table ${table.id} from registry`);
        }
      });
      tournament.tables = tournament.tables.filter(table => table.activePlayers().length > 0);
    }

    if (tournament.tables.length <= 1) {
      console.log(`✅ Only one table remaining, no balancing needed`);
      return;
    }

    // Calculate players per table
    const totalPlayers = this.getTotalActivePlayers(tournamentId);
    const numTables = tournament.tables.length;
    const idealPlayersPerTable = totalPlayers / numTables;
    const maxPlayersPerTable = Math.ceil(idealPlayersPerTable);
    
    console.log(`📊 Total players: ${totalPlayers}, Tables: ${numTables}, Ideal per table: ${idealPlayersPerTable.toFixed(1)}`);

    // Check if we can consolidate to fewer tables
    const maxCapacity = 9; // Max players per table
    const minTablesNeeded = Math.ceil(totalPlayers / maxCapacity);
    
    if (minTablesNeeded < numTables) {
      console.log(`🔄 Can consolidate from ${numTables} to ${minTablesNeeded} tables`);
      this.consolidateTables(tournament, minTablesNeeded);
      return;
    }

    // Balance existing tables - move players from largest to smallest
    let moved = false;
    
    do {
      moved = false;
      
      // Sort tables by player count
      const sortedTables = [...tournament.tables].sort((a, b) => 
        b.activePlayers().length - a.activePlayers().length
      );
      
      const largestTable = sortedTables[0];
      const smallestTable = sortedTables[sortedTables.length - 1];
      
      const largestCount = largestTable.activePlayers().length;
      const smallestCount = smallestTable.activePlayers().length;
      
      // Only move if difference is 2 or more players
      if (largestCount - smallestCount >= 2 && largestCount > maxPlayersPerTable) {
        console.log(`🔀 Moving player from table ${largestTable.id} (${largestCount} players) to ${smallestTable.id} (${smallestCount} players)`);
        
        // Move one player from largest to smallest
        moved = this.movePlayerBetweenTables(largestTable, smallestTable, tournament.startingChips);
        
        if (moved) {
          // Broadcast updates for both tables
          this.broadcastTableState(largestTable);
          this.broadcastTableState(smallestTable);
        }
      }
    } while (moved);
    
    console.log(`✅ Table balancing complete`);
    
    // Log final distribution
    tournament.tables.forEach(table => {
      console.log(`   Table ${table.id}: ${table.activePlayers().length} players`);
    });
    
    // Broadcast tournament update to reflect changes
    this.broadcastTournamentUpdate(tournamentId);
  }

  consolidateTables(tournament, targetTableCount) {
    console.log(`🔄 Consolidating to ${targetTableCount} tables...`);
    console.log(`   Current table count: ${tournament.tables.length}`);
    console.log(`   Total players: ${this.getTotalActivePlayers(tournament.id)}`);
    
    // Sort tables by player count (ascending)
    const sortedTables = [...tournament.tables].sort((a, b) => 
      a.activePlayers().length - b.activePlayers().length
    );
    
    // Log current distribution
    sortedTables.forEach(t => {
      console.log(`   Table ${t.id}: ${t.activePlayers().length} players`);
    });
    
    // Keep the tables with most players, close the smallest ones
    const tablesToKeep = sortedTables.slice(-targetTableCount);
    const tablesToClose = sortedTables.slice(0, sortedTables.length - targetTableCount);
    
    console.log(`   Keeping: ${tablesToKeep.map(t => `${t.id}(${t.activePlayers().length}p)`).join(', ')}`);
    console.log(`   Closing: ${tablesToClose.map(t => `${t.id}(${t.activePlayers().length}p)`).join(', ')}`);
    
    // Move all players from closing tables to remaining tables
    tablesToClose.forEach(closingTable => {
      const playersToMove = closingTable.activePlayers();
      console.log(`   🚚 Moving ${playersToMove.length} players from table ${closingTable.id}`);
      
      playersToMove.forEach(seat => {
        // Skip players with 0 chips (they're eliminated but not removed yet)
        if (seat.stack <= 0) {
          console.log(`      ⏭️  Skipping ${seat.player.name} (0 chips - eliminated)`);
          return;
        }
        
        // Find table with most space
        const targetTable = tablesToKeep.reduce((min, table) => 
          table.activePlayers().length < min.activePlayers().length ? table : min
        );
        
        console.log(`      Moving ${seat.player.name} to table ${targetTable.id}`);
        this.movePlayerBetweenTables(closingTable, targetTable, tournament.startingChips, seat.player.socketId);
      });
      
      // Remove from main tables registry
      if (this.tables && this.tables[closingTable.id]) {
        delete this.tables[closingTable.id];
        console.log(`   🗑️  Removed table ${closingTable.id} from registry`);
      }
    });
    
    // Update tournament tables array
    tournament.tables = tablesToKeep;
    
    console.log(`✅ Consolidation complete - now ${tournament.tables.length} tables:`);
    tournament.tables.forEach(t => {
      console.log(`   Table ${t.id}: ${t.activePlayers().length} players`);
    });
    
    // Broadcast updates for all remaining tables
    tablesToKeep.forEach(table => {
      this.broadcastTableState(table);
    });
  }

  movePlayerBetweenTables(fromTable, toTable, startingChips, specificSocketId = null) {
    // Find a player to move (preferably not current dealer/blinds to minimize disruption)
    const fromPlayers = fromTable.activePlayers();
    
    if (fromPlayers.length === 0) return false;
    
    // Try to find a player that's not on button/blinds
    let seatToMove = specificSocketId 
      ? fromPlayers.find(s => s.player.socketId === specificSocketId)
      : fromPlayers.find(s => 
          s.id !== fromTable.button && 
          s.id !== fromTable.smallBlind && 
          s.id !== fromTable.bigBlind
        );
    
    // If all are on button/blinds, just take the first one
    if (!seatToMove) seatToMove = fromPlayers[0];
    
    const player = seatToMove.player;
    const currentStack = seatToMove.stack;
    
    console.log(`   🚶 Moving ${player.name} (${currentStack} chips) from seat ${seatToMove.id}`);
    
    // Find available seat in target table
    let targetSeatId = null;
    for (let i = 1; i <= toTable.maxPlayers; i++) {
      if (!toTable.seats[i]) {
        targetSeatId = i;
        break;
      }
    }
    
    if (!targetSeatId) {
      console.error(`❌ No available seats in target table ${toTable.id}`);
      return false;
    }
    
    // Remove from old table
    fromTable.seats[seatToMove.id] = null;
    fromTable.players = fromTable.players.filter(p => p.socketId !== player.socketId);
    
    // Add to new table
    toTable.addPlayer(player);
    toTable.sitPlayer(player, targetSeatId, currentStack);
    
    console.log(`   ✅ ${player.name} now at table ${toTable.id}, seat ${targetSeatId}`);
    
    // Update socket room membership if player is connected (skip for bots)
    if (this.io && player.socketId && !player.isBot) {
      const socket = this.io.sockets.sockets.get(player.socketId);
      if (socket) {
        socket.leave(`table-${fromTable.id}`);
        socket.join(`table-${toTable.id}`);
        console.log(`   📡 ${player.name} moved from room table-${fromTable.id} to table-${toTable.id}`);
        
        // Notify player of table change
        socket.emit('PLAYER_MOVED_TABLE', {
          message: `You have been moved to ${toTable.name}`,
          newTableId: toTable.id,
          seatId: targetSeatId
        });
      }
    } else if (player.isBot) {
      console.log(`   🤖 ${player.name} (bot) moved - skipping socket room update`);
    }
    
    // If source table now has only 1 player, end any active hand
    if (fromTable.activePlayers().length === 1 && !fromTable.handOver) {
      console.log(`   ⚠️  Table ${fromTable.id} now has only 1 player, ending hand`);
      fromTable.handOver = true;
      fromTable.clearWinMessages();
    }
    
    return true;
  }

  completeTournament(tournamentId) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return;

    // Stop the blind timer
    this.stopBlindTimer(tournamentId);

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

    if (totalPlayers <= 2) {
      payouts[1] = prizePool * 1.00;
    } else if (totalPlayers <= 5) {
      payouts[1] = prizePool * 0.50;
      payouts[2] = prizePool * 0.30;
      payouts[3] = prizePool * 0.20;
    } else if (totalPlayers <= 10) {
      payouts[1] = prizePool * 0.40;
      payouts[2] = prizePool * 0.25;
      payouts[3] = prizePool * 0.15;
      payouts[4] = prizePool * 0.12;
      payouts[5] = prizePool * 0.08;
    } else if (totalPlayers <= 20) {
      payouts[1] = prizePool * 0.35;
      payouts[2] = prizePool * 0.22;
      payouts[3] = prizePool * 0.15;
      payouts[4] = prizePool * 0.12;
      payouts[5] = prizePool * 0.09;
      payouts[6] = prizePool * 0.07;
    } else if (totalPlayers <= 30) {
      payouts[1] = prizePool * 0.30;
      payouts[2] = prizePool * 0.20;
      payouts[3] = prizePool * 0.15;
      payouts[4] = prizePool * 0.11;
      payouts[5] = prizePool * 0.09;
      payouts[6] = prizePool * 0.07;
      payouts[7] = prizePool * 0.05;
      payouts[8] = prizePool * 0.03;
    } else {
      // For 31+ players (like 50-player tournaments)
      payouts[1] = prizePool * 0.25;
      payouts[2] = prizePool * 0.18;
      payouts[3] = prizePool * 0.13;
      payouts[4] = prizePool * 0.10;
      payouts[5] = prizePool * 0.08;
      payouts[6] = prizePool * 0.07;
      payouts[7] = prizePool * 0.06;
      payouts[8] = prizePool * 0.05;
      payouts[9] = prizePool * 0.04;
      payouts[10] = prizePool * 0.04;
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
    const tournament = this.tournaments.get(Number(tournamentId));
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
      actualStartTime: tournament.actualStartTime,
      status: tournament.status,
      structure: tournament.structure,
      blindLevel: tournament.blindLevel,
      blindStructure: tournament.blindStructure,
      tableCount: tournament.tables.length,
      activePlayers: this.getTotalActivePlayers(tournamentId),
      eliminatedPlayers: tournament.eliminatedPlayers || [],
      tables: tournament.tables.map(t => ({
        id: t.id,
        name: t.name,
        tournamentId: t.tournamentId,
        maxPlayers: t.maxPlayers,
        activePlayers: t.activePlayers().length
      }))
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
    console.log(`Broadcasting TOURNAMENT_UPDATE for tournament ${tournamentId}:`, tournamentInfo);
    if (tournamentInfo && this.io) {
      this.io.emit('TOURNAMENT_UPDATE', tournamentInfo);
      console.log('TOURNAMENT_UPDATE emitted successfully');
    } else {
      console.log('Failed to broadcast: tournamentInfo=', !!tournamentInfo, 'io=', !!this.io);
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

    // Use BotManager's broadcast method if available (it handles SC_TABLE_UPDATED correctly)
    if (this.botManager && this.botManager.broadcastToTable) {
      this.botManager.broadcastToTable(table, '', null);
      return;
    }

    // Fallback: manual broadcast with SC_TABLE_UPDATED (matching client expectations)
    const { tournamentManager, ...cleanTable } = table;

    // Emit to the table room (includes spectators)
    this.io.to(`table-${cleanTable.id}`).emit('SC_TABLE_UPDATED', {
      table: cleanTable,
      message: '',
      from: null,
    });

    // Also broadcast to all players individually
    cleanTable.players.forEach(player => {
      if (player && player.socketId) {
        this.io.to(player.socketId).emit('SC_TABLE_UPDATED', {
          table: cleanTable,
          message: '',
          from: null,
        });
      }
    });
  }
}

module.exports = TournamentManager;
