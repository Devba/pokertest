const Bot = require('./Bot');

/**
 * BotManager - Manages bot players at the table
 * Handles bot creation, decision making, and automated actions
 */
class BotManager {
  constructor(io, tables, players) {
    this.io = io;
    this.tables = tables;
    this.players = players;
    this.bots = {};
    this.actionTimers = {};
    this.botCounter = 0;
  }

  /**
   * Create a new bot and add to players
   */
  createBot(strategy = null) {
    this.botCounter++;
    const botSocketId = `bot_${Date.now()}_${this.botCounter}`;
    const botId = `bot_id_${this.botCounter}`;
    const botName = Bot.generateBotName(this.botCounter);
    const botStrategy = strategy || Bot.getRandomStrategy();
    
    const bot = new Bot(
      botSocketId,
      botId,
      botName,
      100000, // Starting chips
      botStrategy
    );

    this.players[botSocketId] = bot;
    this.bots[botSocketId] = bot;

    console.log(`🤖 Bot created: ${botName} (${botStrategy} strategy)`);
    
    return bot;
  }

  /**
   * Add a bot to a specific table
   */
  addBotToTable(tableId, strategy = null) {
    const table = this.tables[tableId];
    if (!table) {
      console.error('Table not found');
      return null;
    }

    // Check if table is full
    if (table.players.length >= table.maxPlayers) {
      console.log('Table is full, cannot add bot');
      return null;
    }

    // Check if there are available seats
    const availableSeats = Object.keys(table.seats).filter(
      seatId => table.seats[seatId] === null
    );

    if (availableSeats.length === 0) {
      console.log('No available seats');
      return null;
    }

    const bot = this.createBot(strategy);
    table.addPlayer(bot);

    // Auto-sit the bot at a random available seat
    const randomSeat = availableSeats[Math.floor(Math.random() * availableSeats.length)];
    const buyinAmount = Math.min(table.limit, bot.bankroll);
    
    table.sitPlayer(bot, parseInt(randomSeat), buyinAmount);
    bot.bankroll -= buyinAmount;

    console.log(`🤖 Bot ${bot.name} joined table ${tableId} at seat ${randomSeat}`);

    // Broadcast table update
    this.broadcastToTable(table, `${bot.name} joined the table`);

    // Start hand if this was the second player to sit and hand is over
    if (table.activePlayers().length >= 2 && table.handOver) {
      console.log(`🃏 Starting hand with ${table.activePlayers().length} players`);
      setTimeout(() => {
        table.startHand();
        this.broadcastToTable(table, '--- Hand started ---');
        
        // Check if first player to act is a bot
        this.checkAndActForBot(table, tableId);
      }, 2000);
    }

    return bot;
  }

  /**
   * Remove a bot from the table
   */
  removeBotFromTable(botSocketId, tableId) {
    const table = this.tables[tableId];
    const bot = this.bots[botSocketId];

    if (!table || !bot) return;

    // Find bot's seat and return chips
    const seat = Object.values(table.seats).find(
      seat => seat && seat.player.socketId === botSocketId
    );

    if (seat) {
      bot.bankroll += seat.stack;
    }

    table.removePlayer(botSocketId);
    delete this.players[botSocketId];
    delete this.bots[botSocketId];

    // Clear any pending timers
    if (this.actionTimers[botSocketId]) {
      clearTimeout(this.actionTimers[botSocketId]);
      delete this.actionTimers[botSocketId];
    }

    console.log(`🤖 Bot ${bot.name} removed from table ${tableId}`);
  }

  /**
   * Remove all bots from a table
   */
  removeAllBotsFromTable(tableId) {
    const table = this.tables[tableId];
    if (!table) return;

    const botSocketIds = table.players
      .filter(player => player.isBot)
      .map(player => player.socketId);

    botSocketIds.forEach(socketId => {
      this.removeBotFromTable(socketId, tableId);
    });
  }

  /**
   * Check if it's a bot's turn and make them act
   */
  checkAndActForBot(table, tableId) {
    // Add stack trace to see where this is called from
    const stack = new Error().stack;
    console.log(`🔍🔍 checkAndActForBot ENTRY - Table ${tableId}`);
    console.log(`📞 Called from:\n${stack.split('\n').slice(1, 4).join('\n')}`);
    
    if (!table) {
      console.log(`⚠️  checkAndActForBot: table is null/undefined for tableId ${tableId}`);
      return;
    }
    
    if (table.handOver) {
      console.log(`⚠️  checkAndActForBot: hand is over on table ${tableId}`);
      return;
    }

    if (!table.turn) {
      console.log(`⚠️  checkAndActForBot: no turn set on table ${tableId}`);

      const unfolded = typeof table.unfoldedPlayers === 'function'
        ? table.unfoldedPlayers()
        : [];

      if (unfolded.length === 0) {
        console.log(`⚠️  Table ${tableId}: no unfolded players available to recover turn`);
        return;
      }

      table.turn = unfolded[0].id;
      for (let i = 1; i <= table.maxPlayers; i++) {
        if (table.seats[i]) {
          table.seats[i].turn = i === table.turn;
        }
      }

      console.log(`🔧 Table ${tableId}: recovered missing turn -> seat ${table.turn}`);
    }

    let currentSeat = table.seats[table.turn];
    if (!currentSeat || !currentSeat.player) {
      console.log(`⚠️  checkAndActForBot: no player in seat ${table.turn} on table ${tableId}`);

      const unfolded = typeof table.unfoldedPlayers === 'function'
        ? table.unfoldedPlayers()
        : [];

      if (unfolded.length <= 1) {
        console.log(`⚠️  Table ${tableId}: cannot recover turn from empty seat; unfolded players=${unfolded.length}`);
        return;
      }

      const replacementSeat = unfolded[0];
      table.turn = replacementSeat.id;
      for (let i = 1; i <= table.maxPlayers; i++) {
        if (table.seats[i]) {
          table.seats[i].turn = i === table.turn;
        }
      }

      currentSeat = table.seats[table.turn];
      if (!currentSeat || !currentSeat.player) {
        console.log(`⚠️  Table ${tableId}: failed to recover turn to valid seat`);
        return;
      }

      console.log(`🔧 Table ${tableId}: recovered turn from empty seat -> seat ${table.turn}`);
    }

    const player = currentSeat.player;
    console.log(`🔍 Current state - Table ${tableId}, turn: seat ${table.turn}, player: ${player.name}, socketId: ${player.socketId}`);
    if (!player.isBot) {
      console.log(`✋ Table ${tableId}: Current player ${player.name} is not a bot`);
      return;
    }

    // Check if bot exists in registry, if not, it's a tournament bot
    let bot = this.bots[player.socketId];
    if (!bot) {
      // Tournament bot - create a temporary Bot instance for decision-making
      console.log(`🎯 Tournament bot detected: ${player.name} on table ${tableId}`);
      const Bot = require('./Bot');
      // Extract strategy from player name if possible (e.g., "Bot_aggressive_5")
      const strategyMatch = player.name.match(/Bot_(tight|loose|aggressive|passive|balanced)_/);
      const strategy = strategyMatch ? strategyMatch[1] : 'balanced';
      
      // Use player.id as socketId for tournament bots (they don't have real sockets)
      bot = new Bot(
        player.id,        // Use player ID instead of undefined socketId
        player.id,
        player.name,
        player.bankroll || 10000,
        strategy
      );
      
      console.log(`🤖 Created temporary bot instance for ${player.name} (playerId: ${player.id}) with ${strategy} strategy`);
    } else {
    //  console.log(`🤖 Table ${tableId}: Bot ${bot.name} is about to act (seat ${table.turn})`);
    }

    // Clear any existing timer
    if (this.actionTimers[player.socketId]) {
      clearTimeout(this.actionTimers[player.socketId]);
    }

    // Schedule bot action with delay for realism
    const delay = bot.getRandomDelay(1200, 3000);
    
    console.log(`⏲️  Scheduling ${player.name} action in ${delay}ms`);
    
    this.actionTimers[player.socketId] = setTimeout(() => {
      this.executeBotAction(bot, table, tableId, currentSeat);
    }, delay);
  }

  /**
   * Execute the bot's decision
   */
  executeBotAction(bot, table, tableId, seat) {
    console.log(`🎯 executeBotAction called for bot ${bot.name} on table ${tableId}`);
    
    // Verify table is accessible
    const tableCheck = this.tables[tableId];
    if (!tableCheck) {
      console.error(`❌ Table ${tableId} NOT FOUND in this.tables! Available tables:`, Object.keys(this.tables));
      return;
    } else {
      console.log(`✅ Table ${tableId} IS ACCESSIBLE in this.tables`);
    }
    
    console.log(`📊 Getting game state for ${bot.name}...`);
    
    // Gather game state
    const gameState = {
      hand: seat.hand,
      pot: table.pot,
      callAmount: table.callAmount || 0,
      minRaise: table.minRaise,
      stack: seat.stack,
      board: table.board,
      position: this.getPosition(table, seat.id),
      numPlayers: table.unfoldedPlayers().length
    };

    console.log(`🤔 ${bot.name} making decision...`);

    // Get bot's decision 
    const decision = bot.makeDecision(gameState);
    if (decision.amount > seat.stack) {
      decision.amount = seat.stack;
    }
    if( decision.amount <= 0){
      decision.action = 'CS_CHECK';}

    console.log(`🤖 Table ${tableId}: ${bot.name} decides to ${decision.action}${decision.amount ? ` $${decision.amount}` : ''}`);

    // Execute the action through the table's handlers
    let result = null;

    switch (decision.action) {
      case 'CS_FOLD':
        result = table.handleFold(bot.socketId);
        break;
      
      case 'CS_CHECK':
        result = table.handleCheck(bot.socketId);
        break;
      
      case 'CS_CALL':
        result = table.handleCall(bot.socketId);
        break;
      
      case 'CS_RAISE':
        result = table.handleRaise(bot.socketId, decision.amount);
        break;
    }

    // Broadcast the result
    if (result) {
      console.log(`✅ Action result: seatId=${result.seatId}, message="${result.message}"`);
      this.broadcastToTable(table, result.message);
      
      // Change turn after a short delay
      setTimeout(() => {
        console.log(`⏰ setTimeout fired - BEFORE changeTurn: table.turn = ${table.turn}`);
        table.changeTurn(result.seatId);
        console.log(`⏰ AFTER changeTurn: table.turn = ${table.turn}, handOver = ${table.handOver}`);
        this.broadcastToTable(table);

        // Check if hand is over
        if (table.handOver) {
          console.log(`🏁 Table ${tableId}: Hand over after ${bot.name}'s action`);
          this.handleHandOver(table, tableId);
        } else {
          // Check if next player is also a bot
          console.log(`➡️ Table ${tableId}: Checking next player after ${bot.name}'s action`);
          this.checkAndActForBot(table, tableId);
        }
      }, 1000);
    } else {
      console.log(`⚠️  Table ${tableId}: No result from ${bot.name}'s ${decision.action}`);
    }
  }

  /**
   * Get position label for the seat
   */
  getPosition(table, seatId) {
    const activePlayers = table.activePlayers().length;
    
    if (seatId === table.button) return 'button';
    if (seatId === table.smallBlind) return 'small_blind';
    if (seatId === table.bigBlind) return 'big_blind';
    
    // Simplified position logic
    if (activePlayers <= 4) return 'middle';
    
    const buttonIndex = table.button;
    const seatIndex = seatId;
    const diff = (seatIndex - buttonIndex + table.maxPlayers) % table.maxPlayers;
    
    if (diff <= 2) return 'late';
    if (diff <= 4) return 'middle';
    return 'early';
  }

  /**
   * Handle when hand is over
   */
  handleHandOver(table, tableId) {
    console.log(`🏁 Table ${tableId}: Hand over, checking for eliminations`);
    
    // Check if this is a tournament table and if players were eliminated
    if (table.isTournament && table.checkForEliminations && typeof table.checkForEliminations === 'function') {
      const playersEliminated = table.checkForEliminations();
      
      // If players were eliminated in a tournament, broadcast tournament update
      if (playersEliminated && table.tournamentId && this.tournamentManager) {
        console.log(`Players eliminated in tournament ${table.tournamentId}, broadcasting update`);
        this.tournamentManager.broadcastTournamentUpdate(table.tournamentId);
      }
    }
    
    const activeCount = table.activePlayers().length;
    console.log(`🏁 Table ${tableId}: ${activeCount} active players remaining`);
    
    if (activeCount >= 2) {
      this.broadcastToTable(table, '---New hand starting in 5 seconds---');
      
      setTimeout(() => {
        console.log(`🃏 Table ${tableId}: Starting new hand with ${table.activePlayers().length} players`);
        table.clearWinMessages();
        table.startHand();
        this.broadcastToTable(table, '--- New hand started ---');
        
        // Start bot actions for new hand
        setTimeout(() => {
          this.checkAndActForBot(table, tableId);
        }, 500);
      }, 5000);
    } else if (activeCount === 1) {
      const winnerSeat = table.activePlayers()[0];
      const winnerName = winnerSeat.player?.name || 'Winner';

      if (table.isTournament && this.tournamentManager && table.tournamentId) {
        const totalActiveInTournament = this.tournamentManager.getTotalActivePlayers(table.tournamentId);

        if (totalActiveInTournament === 1) {
          console.log(`🏆 Tournament ${table.tournamentId}: Winner is ${winnerName}`);
          this.broadcastToTable(table, `${winnerName} wins the tournament!`);
          this.tournamentManager.completeTournament(table.tournamentId, winnerSeat.player);
        } else {
          console.log(`ℹ️  Table ${tableId}: Only one player left on this table (${winnerName}), but tournament still has ${totalActiveInTournament} active players`);
          this.broadcastToTable(table, `${winnerName} wins this table and advances`);
        }
      } else {
        // Non-tournament table winner
        console.log(`🏆 Table ${tableId}: Winner: ${winnerName}`);
        this.broadcastToTable(table, `${winnerName} wins the table!`);
      }
    } else {
      console.log(`⚠️  Table ${tableId}: No active players, cannot continue`);
    }
  }

  /**
   * Broadcast table state to all players
   */
  broadcastToTable(table, message = null, from = null) {
    if (!table) {
      console.error('❌ broadcastToTable: table is null/undefined');
      return;
    }
    
    // Remove circular reference before any processing
    const { tournamentManager, ...cleanTable } = table;
    
  //  console.log(`📡 Broadcasting to table ${cleanTable.id}: ${cleanTable.players.length} players`);
    
    // Broadcast to all players in the table
    for (let i = 0; i < cleanTable.players.length; i++) {
      let player = cleanTable.players[i];
      if (!player || !player.socketId) continue; // Defensive check

      let socketId = player.socketId;
      let tableCopy = this.hideOpponentCards(cleanTable, socketId);
      this.io.to(socketId).emit('SC_TABLE_UPDATED', {
        table: tableCopy,
        message,
        from,
      });
    }
    
    // Also broadcast to room for spectators (they see all cards hidden except shown ones)
    const tableCopyForSpectators = this.hideOpponentCards(cleanTable, 'spectator');
    this.io.to(`table-${cleanTable.id}`).emit('SC_TABLE_UPDATED', {
      table: tableCopyForSpectators,
      message,
      from,
    });
  }

  /**
   * Clean table object by removing circular references
   */
  cleanTableForBroadcast(table) {
    const { tournamentManager, ...cleanTable } = table;
    return cleanTable;
  }

  /**
   * Hide opponent cards (keep same logic as original)
   * For tournament tables, cards are not hidden to allow spectators to see all hands
   */
  hideOpponentCards(table, socketId) {
    // Table is already cleaned of circular references
    let tableCopy = JSON.parse(JSON.stringify(table));
    
    // Don't hide cards in tournament tables - spectators can see everything
    if (tableCopy.isTournament) {
      return tableCopy;
    }
    
    let hiddenCard = { suit: 'hidden', rank: 'hidden' };
    let hiddenHand = [hiddenCard, hiddenCard];

    for (let i = 1; i <= tableCopy.maxPlayers; i++) {
      let seat = tableCopy.seats[i];
      if (
        seat &&
        seat.hand.length > 0 &&
        seat.player.socketId !== socketId &&
        !(seat.lastAction === 'WINNER' && tableCopy.wentToShowdown)
      ) {
        // Optionally hide cards (commented out in original)
         seat.hand = hiddenHand;
      }
    }
    return tableCopy;
  }

  /**
   * Fill table with bots up to a certain number
   */
  fillTableWithBots(tableId, targetPlayerCount = 5) {
    const table = this.tables[tableId];
    if (!table) return;

    const currentPlayers = table.players.length;
    const botsToAdd = Math.min(
      targetPlayerCount - currentPlayers,
      table.maxPlayers - currentPlayers
    );

    for (let i = 0; i < botsToAdd; i++) {
      this.addBotToTable(tableId);
    }

    console.log(`🤖 Added ${botsToAdd} bots to table ${tableId}`);

    // Start hand if enough players and hand is over
    if (table.activePlayers().length >= 2 && table.handOver) {
      console.log(`🃏 Starting initial hand with ${table.activePlayers().length} players`);
      setTimeout(() => {
        table.startHand();
        this.broadcastToTable(table, '--- Hand started with bots ---');
        
        // Check if first player to act is a bot
        this.checkAndActForBot(table, tableId);
      }, 2000);
    }
  }

  /**
   * Get all bots at a table
   */
  getBotsAtTable(tableId) {
    const table = this.tables[tableId];
    if (!table) return [];

    return table.players.filter(player => player.isBot);
  }

  /**
   * Cleanup - remove all bots and clear timers
   */
  cleanup() {
    Object.keys(this.actionTimers).forEach(socketId => {
      clearTimeout(this.actionTimers[socketId]);
    });
    
    this.actionTimers = {};
    this.bots = {};
    
    console.log('🤖 BotManager cleaned up');
  }
}

module.exports = BotManager;
