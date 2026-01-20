const jwt = require('jsonwebtoken');
const Table = require('../pokergame/Table');
const Player = require('../pokergame/Player');
const BotManager = require('../pokergame/BotManager');
const TournamentManager = require('../pokergame/TournamentManager');
const {
  CS_FETCH_LOBBY_INFO,
  SC_RECEIVE_LOBBY_INFO,
  SC_PLAYERS_UPDATED,
  CS_JOIN_TABLE,
  SC_TABLE_JOINED,
  SC_TABLES_UPDATED,
  CS_LEAVE_TABLE,
  SC_TABLE_LEFT,
  CS_FOLD,
  CS_CHECK,
  CS_CALL,
  CS_RAISE,
  TABLE_MESSAGE,
  CS_SIT_DOWN,
  CS_REBUY,
  CS_STAND_UP,
  SITTING_OUT,
  SITTING_IN,
  CS_DISCONNECT,
  SC_TABLE_UPDATED,
  WINNER,
  CS_LOBBY_CONNECT,
  CS_LOBBY_DISCONNECT,
  SC_LOBBY_CONNECTED,
  SC_LOBBY_DISCONNECTED,
  SC_LOBBY_CHAT,
  CS_LOBBY_CHAT,
} = require('../pokergame/actions');
const config = require('../config');

const tables = {
  1: new Table(1, 'Table 1', config.INITIAL_CHIPS_AMOUNT),
};
const players = {};

// Initialize BotManager and TournamentManager (will be set when io is available)
let botManager = null;
let tournamentManager = null;

function getCurrentPlayers() {
  return Object.values(players).map((player) => ({
    socketId: player.socketId,
    id: player.id,
    name: player.name,
  }));
}

function getCurrentTables() {
  return Object.values(tables).map((table) => ({
    id: table.id,
    name: table.name,
    limit: table.limit,
    maxPlayers: table.maxPlayers,
    currentNumberPlayers: table.players.length,
    smallBlind: table.minBet,
    bigBlind: table.minBet * 2,
  }));
}

const init = (socket, io) => {
  // Initialize BotManager if not already initialized
  if (!botManager) {
    botManager = new BotManager(io, tables, players);
    console.log('🤖 BotManager initialized');
  }

  // Initialize TournamentManager if not already initialized
  if (!tournamentManager) {
    tournamentManager = new TournamentManager(io);
    console.log('🏆 TournamentManager initialized');
  }

  // Tournament socket handlers
  socket.on('CREATE_TOURNAMENT', (config) => {
    try {
      console.log('Creating tournament with tournamentManager:', !!tournamentManager, 'Current tournaments:', tournamentManager ? tournamentManager.tournaments.size : 'N/A');
      const tournament = tournamentManager.createTournament(config);
      socket.emit('TOURNAMENT_CREATED', { success: true, tournament });
      console.log('Tournament created:', tournament.name, 'Total tournaments now:', tournamentManager.tournaments.size);
    } catch (error) {
      console.error('Error creating tournament:', error);
      socket.emit('TOURNAMENT_ERROR', { error: error.message });
    }
  });

  socket.on('REGISTER_TOURNAMENT', ({ tournamentId, walletAddress }) => {
    try {
      let player = players[socket.id];
      
      // If player doesn't exist, create a temporary one for tournament registration
      if (!player) {
        const username = 'Player_' + Math.random().toString(36).substring(2, 9);
        player = new Player(
          socket.id,
          walletAddress,
          username,
          config.INITIAL_CHIPS_AMOUNT
        );
        players[socket.id] = player;
        console.log('Created temporary player for tournament registration:', username);
      }
      
      const result = tournamentManager.registerPlayer(tournamentId, player);
      socket.emit('TOURNAMENT_REGISTERED', result);
    } catch (error) {
      console.error('Error registering for tournament:', error);
      socket.emit('TOURNAMENT_ERROR', { error: error.message });
    }
  });

  socket.on('UNREGISTER_TOURNAMENT', ({ tournamentId, walletAddress }) => {
    try {
      const result = tournamentManager.unregisterPlayer(tournamentId, walletAddress);
      socket.emit('TOURNAMENT_UNREGISTERED', result);
    } catch (error) {
      console.error('Error unregistering from tournament:', error);
      socket.emit('TOURNAMENT_ERROR', { error: error.message });
    }
  });

  socket.on('GET_TOURNAMENTS', () => {
    try {
      const tournaments = tournamentManager.getAllTournaments();
      socket.emit('TOURNAMENTS_LIST', tournaments);
    } catch (error) {
      console.error('Error getting tournaments:', error);
      socket.emit('TOURNAMENT_ERROR', { error: error.message });
    }
  });

  socket.on('START_TOURNAMENT', ({ tournamentId }) => {
    try {
      const result = tournamentManager.startTournament(tournamentId);
      
      if (result.success) {
        // Add tournament tables to main tables object for socket broadcasting
        const tournament = tournamentManager.tournaments.get(tournamentId);
        if (tournament && tournament.tables) {
          tournament.tables.forEach(table => {
            tables[table.id] = table;
            console.log(`Added tournament table ${table.id} to main tables object`);
          });
        }
      }
      
      io.emit('TOURNAMENT_STARTED', result);
    } catch (error) {
      console.error('Error starting tournament:', error);
      socket.emit('TOURNAMENT_ERROR', { error: error.message });
    }
  });

  socket.on('GET_TOURNAMENT_TABLE', ({ tournamentId, walletAddress }) => {
    console.log('GET_TOURNAMENT_TABLE received - tournamentId:', tournamentId, 'type:', typeof tournamentId, 'socketId:', socket.id, 'walletAddress:', walletAddress);
    
    // Convert tournamentId to number (comes as string from URL params)
    const tournamentIdNum = parseInt(tournamentId);
    console.log('TournamentManager exists:', !!tournamentManager, 'Tournaments in map:', tournamentManager ? tournamentManager.tournaments.size : 'N/A');
    console.log('Tournament IDs in map:', tournamentManager ? Array.from(tournamentManager.tournaments.keys()) : 'N/A');
    
    try {
      let player = players[socket.id];
      console.log('Player found:', player ? `${player.name} (${player.id})` : 'NOT FOUND');
      
      // If no player exists, create a temporary spectator or look them up by wallet
      if (!player && walletAddress && walletAddress !== 'spectator') {
        // Try to find player by wallet address
        player = Object.values(players).find(p => p.id === walletAddress);
        if (player) {
          console.log('Found player by walletAddress:', player.name);
        }
      }
      
      // If still no player, create temporary spectator
      if (!player) {
        console.log('Creating temporary spectator player');
        const spectatorName = 'Spectator_' + Math.random().toString(36).substring(2, 9);
        player = new Player(
          socket.id,
          walletAddress || `spectator_${socket.id}`,
          spectatorName,
          0 // Spectators have 0 chips
        );
        players[socket.id] = player;
      }

      const tournament = tournamentManager.tournaments.get(tournamentIdNum);
      if (!tournament) {
        console.log('Tournament not found:', tournamentIdNum, 'Available:', Array.from(tournamentManager.tournaments.keys()));
        socket.emit('TOURNAMENT_ERROR', { error: 'Tournament not found' });
        return;
      }
      
      console.log('Tournament found:', tournament.name, 'Status:', tournament.status, 'Tables:', tournament.tables.length);

      // For spectators or players not seated, just show the first table
      let playerTable = null;
      
      // First try to find the player's assigned table
      for (const table of tournament.tables) {
        console.log('Checking table:', table.id, 'for player:', player.id);
        // seats is an object, not an array - iterate over its values
        const seatsArray = Object.values(table.seats);
        const seat = seatsArray.find(seat => seat && seat.player && seat.player.id === player.id);
        if (seat) {
          playerTable = table;
          console.log('Player found at table:', table.id, 'seat:', seat.id);
          break;
        }
      }
      
      // If player not seated (spectator), assign them to the first table
      if (!playerTable && tournament.tables.length > 0) {
        playerTable = tournament.tables[0];
        console.log('Player not seated, showing first table as spectator:', playerTable.id);
      }

      if (!playerTable) {
        console.log('No tables available in tournament');
        socket.emit('TOURNAMENT_ERROR', { error: 'No tables available in this tournament' });
        return;
      }

      // Emit the table assignment
      console.log('Emitting TOURNAMENT_TABLE_ASSIGNED for table:', playerTable.id);
      socket.emit('TOURNAMENT_TABLE_ASSIGNED', {
        tournamentId,
        tableId: playerTable.id,
        table: playerTable.getTournamentStatus(),
        tournament: {
          id: tournament.id,
          name: tournament.name,
          status: tournament.status,
          currentLevel: tournament.currentBlindLevel,
          totalPlayers: tournament.registeredPlayers.length,
          remainingPlayers: tournament.remainingPlayers,
          prizePool: tournament.prizePool,
          payouts: tournament.payouts,
        }
      });
    } catch (error) {
      console.error('Error getting tournament table:', error);
      socket.emit('TOURNAMENT_ERROR', { error: error.message });
    }
  });

  socket.on('ADD_BOTS_TO_TOURNAMENT', ({ tournamentId, botCount }) => {
    try {
      const count = parseInt(botCount) || 1;
      let successCount = 0;
      
      for (let i = 0; i < count; i++) {
        const botWallet = 'bot_' + Math.random().toString(36).substring(2, 15);
        const botName = 'Bot_' + Math.random().toString(36).substring(2, 9);
        
        // Create a bot player with unique identifier
        const botPlayer = new Player(
          botWallet, // Use wallet as socketId for bots
          botWallet,
          botName,
          config.INITIAL_CHIPS_AMOUNT
        );
        
        const result = tournamentManager.registerPlayer(tournamentId, botPlayer);
        if (result.success) {
          successCount++;
        }
      }
      
      socket.emit('BOTS_ADDED', { 
        success: true, 
        count: successCount,
        message: `Successfully added ${successCount} bot(s) to the tournament`
      });
      
      console.log(`Added ${successCount} bots to tournament ${tournamentId}`);
    } catch (error) {
      console.error('Error adding bots to tournament:', error);
      socket.emit('TOURNAMENT_ERROR', { error: error.message });
    }
  });

  socket.on(CS_LOBBY_CONNECT, ({gameId, address, userInfo }) => {
    socket.join(gameId)
    io.to(gameId).emit(SC_LOBBY_CONNECTED, {address, userInfo})
    console.log( SC_LOBBY_CONNECTED , address, socket.id)
  })
  
  socket.on(CS_LOBBY_DISCONNECT, ({gameId, address, userInfo}) => {
    io.to(gameId).emit(SC_LOBBY_DISCONNECTED, {address, userInfo})
    console.log(CS_LOBBY_DISCONNECT, address, socket.id);
  })

  socket.on(CS_LOBBY_CHAT, ({ gameId, text, userInfo }) => {
    io.to(gameId).emit(SC_LOBBY_CHAT, {text, userInfo})
  })

  socket.on(CS_FETCH_LOBBY_INFO, ({walletAddress, socketId, gameId, username}) => {

    const found = Object.values(players).find((player) => {
        return player.id == walletAddress;
      });

      if (found) {
        delete players[found.socketId];
        Object.values(tables).map((table) => {
          table.removePlayer(found.socketId);
          broadcastToTable(table);
        });
      }

      players[socketId] = new Player(
        socketId,
        walletAddress,
        username,
        config.INITIAL_CHIPS_AMOUNT,
      );
      socket.emit(SC_RECEIVE_LOBBY_INFO, {
        tables: getCurrentTables(),
        players: getCurrentPlayers(),
        socketId: socket.id,
        amount: config.INITIAL_CHIPS_AMOUNT
      });
      socket.broadcast.emit(SC_PLAYERS_UPDATED, getCurrentPlayers());
  });

  socket.on(CS_JOIN_TABLE, (tableId) => {
    let table = tables[tableId];
    const player = players[socket.id];
    console.log("Join table", tableId,  player)
    
    // Check if this is a tournament table
    if (!table && tableId.includes('-')) {
      // Tournament table format: tournamentId-tableNumber
      const tournamentId = parseInt(tableId.split('-')[0]);
      const tournament = tournamentManager.tournaments.get(tournamentId);
      
      if (tournament) {
        table = tournament.tables.find(t => t.id === tableId);
        if (table) {
          console.log('Found tournament table:', tableId);
          // Add to global tables reference for broadcasting
          tables[tableId] = table;
        }
      }
    }
    
    if (!table) {
      console.error('Table not found:', tableId);
      socket.emit('TABLE_ERROR', { error: 'Table not found' });
      return;
    }
    
    // Check if this is a spectator (don't seat them)
    const isSpectator = player.id === 'spectator' || player.name.startsWith('Spectator_');
    
    // Join the Socket.io room for this table to receive broadcasts
    socket.join(`table-${tableId}`);
    console.log(`Socket ${socket.id} joined room: table-${tableId}`);
    
    if (!isSpectator) {
      table.addPlayer(player);
      sitDown(tableId, table.players.length, table.limit);
    } else {
      console.log('Spectator joined table:', tableId, '- not seating');
      // Send initial table state to spectator
      const tableCopy = hideOpponentCards(table, socket.id);
      socket.emit(SC_TABLE_UPDATED, { table: tableCopy });
    }
    
    socket.emit(SC_TABLE_JOINED, { tables: getCurrentTables(), tableId });
    socket.broadcast.emit(SC_TABLES_UPDATED, getCurrentTables())

    if (
      tables[tableId].players &&
      tables[tableId].players.length > 0 &&
      player
    ) {
      let message = `${player.name} joined the table.`;
      broadcastToTable(table, message);
    }
  });

  socket.on(CS_LEAVE_TABLE, (tableId) => {
    const table = tables[tableId];
    const player = players[socket.id];
    
    // Leave the Socket.io room
    socket.leave(`table-${tableId}`);
    console.log(`Socket ${socket.id} left room: table-${tableId}`);
    
    const seat = Object.values(table.seats).find(
      (seat) => seat && seat.player.socketId === socket.id,
    );

    console.log("leaving tableid====>", tableId, player)

    if (seat && player) {
      updatePlayerBankroll(player, seat.stack);
    }

    table.removePlayer(socket.id);

    socket.broadcast.emit(SC_TABLES_UPDATED, getCurrentTables());
    socket.emit(SC_TABLE_LEFT, { tables: getCurrentTables(), tableId });

    if (
      tables[tableId].players &&
      tables[tableId].players.length > 0 &&
      player
    ) {
      let message = `${player.name} left the table.`;
      broadcastToTable(table, message);
    }

    if (table.activePlayers().length === 1) {
      clearForOnePlayer(table);
    }
  });

  socket.on(CS_FOLD, (tableId) => {
    let table = tables[tableId];
    let res = table.handleFold(socket.id);
    res && broadcastToTable(table, res.message);
    res && changeTurnAndBroadcast(table, res.seatId);
  });

  socket.on(CS_CHECK, (tableId) => {
    let table = tables[tableId];
    let res = table.handleCheck(socket.id);
    res && broadcastToTable(table, res.message);
    res && changeTurnAndBroadcast(table, res.seatId);
  });

  socket.on(CS_CALL, (tableId) => {
    let table = tables[tableId];
    let res = table.handleCall(socket.id);
    res && broadcastToTable(table, res.message);
    res && changeTurnAndBroadcast(table, res.seatId);
  });

  socket.on(CS_RAISE, ({ tableId, amount }) => {
    let table = tables[tableId];
    let res = table.handleRaise(socket.id, amount);
    res && broadcastToTable(table, res.message);
    res && changeTurnAndBroadcast(table, res.seatId);
  });

  socket.on(TABLE_MESSAGE, ({ message, from, tableId }) => {
    let table = tables[tableId];
    broadcastToTable(table, message, from);
  });

  // socket.on(CS_SIT_DOWN, ({ tableId, seatId, amount }) => {
  //   const table = tables[tableId];
  //   const player = players[socket.id];

  //   if (player) {
  //     table.sitPlayer(player, seatId, amount);
  //     let message = `${player.name} sat down in Seat ${seatId}`;

  //     updatePlayerBankroll(player, -amount);

  //     broadcastToTable(table, message);
  //     if (table.activePlayers().length === 2) {
  //       initNewHand(table);
  //     }
  //   }
  // });
  const sitDown =  (tableId, seatId, amount) => {
    const table = tables[tableId];
    const player = players[socket.id];
    if (player) {
      table.sitPlayer(player, seatId, amount);
      let message = `${player.name} sat down in Seat ${seatId}`;

      updatePlayerBankroll(player, -amount);

      broadcastToTable(table, message);
      if (table.activePlayers().length === 2) {
        initNewHand(table);
      }
    }
  }

  socket.on(CS_REBUY, ({ tableId, seatId, amount }) => {
    const table = tables[tableId];
    const player = players[socket.id];

    table.rebuyPlayer(seatId, amount);
    updatePlayerBankroll(player, -amount);

    broadcastToTable(table);
  });

  socket.on(CS_STAND_UP, (tableId) => {
    const table = tables[tableId];
    const player = players[socket.id];
    const seat = Object.values(table.seats).find(
      (seat) => seat && seat.player.socketId === socket.id,
    );

    let message = '';
    if (seat) {
      updatePlayerBankroll(player, seat.stack);
      message = `${player.name} left the table`;
    }

    table.standPlayer(socket.id);

    broadcastToTable(table, message);
    if (table.activePlayers().length === 1) {
      clearForOnePlayer(table);
    }
  });

  socket.on(SITTING_OUT, ({ tableId, seatId }) => {
    const table = tables[tableId];
    const seat = table.seats[seatId];
    seat.sittingOut = true;

    broadcastToTable(table);
  });

  socket.on(SITTING_IN, ({ tableId, seatId }) => {
    const table = tables[tableId];
    const seat = table.seats[seatId];
    seat.sittingOut = false;

    broadcastToTable(table);
    if (table.handOver && table.activePlayers().length === 2) {
      initNewHand(table);
    }
  });

  socket.on(CS_DISCONNECT, () => {
    const seat = findSeatBySocketId(socket.id);
    if (seat) {
      updatePlayerBankroll(seat.player, seat.stack);
    }

    delete players[socket.id];
    removeFromTables(socket.id);

    socket.broadcast.emit(SC_TABLES_UPDATED, getCurrentTables());
    socket.broadcast.emit(SC_PLAYERS_UPDATED, getCurrentPlayers());
  });

  async function updatePlayerBankroll(player, amount) {
    players[socket.id].bankroll += amount;
    io.to(socket.id).emit(SC_PLAYERS_UPDATED, getCurrentPlayers());
  }

  function findSeatBySocketId(socketId) {
    let foundSeat = null;
    Object.values(tables).forEach((table) => {
      Object.values(table.seats).forEach((seat) => {
        if (seat && seat.player.socketId === socketId) {
          foundSeat = seat;
        }
      });
    });
    return foundSeat;
  }
 
  function removeFromTables(socketId) {
    for (let i = 0; i < Object.keys(tables).length; i++) {
      tables[Object.keys(tables)[i]].removePlayer(socketId);
    }
  }

  function broadcastToTable(table, message = null, from = null) {
    // Broadcast to all players in the table
    for (let i = 0; i < table.players.length; i++) {
      let socketId = table.players[i].socketId;
      let tableCopy = hideOpponentCards(table, socketId);
      io.to(socketId).emit(SC_TABLE_UPDATED, {
        table: tableCopy,
        message,
        from,
      });
    }
    
    // Also broadcast to room for spectators (they see all cards hidden except shown ones)
    const tableCopyForSpectators = hideOpponentCards(table, 'spectator');
    io.to(`table-${table.id}`).emit(SC_TABLE_UPDATED, {
      table: tableCopyForSpectators,
      message,
      from,
    });
  }

  function changeTurnAndBroadcast(table, seatId) {
    setTimeout(() => {
      table.changeTurn(seatId);
      broadcastToTable(table);

      if (table.handOver) {
        initNewHand(table);
      } else {
        // Check if next player is a bot
        botManager.checkAndActForBot(table, table.id);
      }
    }, 1000);
  }

  function initNewHand(table) {
    if (table.activePlayers().length > 1) {
      broadcastToTable(table, '---New hand starting in 5 seconds---');
    }
    setTimeout(() => {
      table.clearWinMessages();
      table.startHand();
      broadcastToTable(table, '--- New hand started ---');
      
      // Check if first player to act is a bot
      botManager.checkAndActForBot(table, table.id);
    }, 5000);
  }

  function clearForOnePlayer(table) {
    table.clearWinMessages();
    setTimeout(() => {
      table.clearSeatHands();
      table.resetBoardAndPot();
      broadcastToTable(table, 'Waiting for more players');
    }, 5000);
  }

  function hideOpponentCards(table, socketId) {
    let tableCopy = JSON.parse(JSON.stringify(table));

    return tableCopy;
    let hiddenCard = { suit: 'hidden', rank: 'hidden' };
    let hiddenHand = [hiddenCard, hiddenCard];

    for (let i = 1; i <= tableCopy.maxPlayers; i++) {
      let seat = tableCopy.seats[i];
      if (
        seat &&
        seat.hand.length > 0 &&
        seat.player.socketId !== socketId &&
        !(seat.lastAction === WINNER && tableCopy.wentToShowdown)
      ) {
        seat.hand = hiddenHand;
      }
    }
    return tableCopy;
  }
};


module.exports = { 
  init, 
  get botManager() { return botManager; },
  get tournamentManager() { return tournamentManager; },
  tables, 
  players 
};
 