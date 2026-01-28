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
const playersW = {};

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
  // Set a custom property for this socket connection
  socket.origSockID = '';

  // Initialize BotManager if not already initialized
  if (!botManager) {
    botManager = new BotManager(io, tables, players);
    console.log('🤖 BotManager initialized');
  }

  // Initialize TournamentManager if not already initialized
  if (!tournamentManager) {
    tournamentManager = new TournamentManager(io, botManager);
    // Give BotManager access to TournamentManager for broadcasting tournament updates
    botManager.tournamentManager = tournamentManager;
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
  
  socket.on('REGISTER_TOURNAMENT', ({ tournamentId, walletAddress, username,socketId }) => {
    try {
      let player = players[socketId]; //alf ,pasamos del socket 
      //let player= null;
      let playerw=playersW[walletAddress]
      //let player = Object.values(playersW.find(p => p.walletAddress === walletAddress));
      
      // If player doesn't exist, create a temporary one for tournament registration
      if (!player) {
        const playerName = username || 'Player_' + Math.random().toString(36).substring(2, 9);
        player = new Player(
          socketId , //socket.id,
          walletAddress,
          playerName,
          config.INITIAL_CHIPS_AMOUNT,
          isBot=false,
          actualsockID=socket.id
        );
        

        players[socketId] = player;
        playersW[walletAddress]=player; //alf
        console.log('Created temporary player for tournament registration:', playerName);
      }
      
      const result = tournamentManager.registerPlayer(tournamentId, player);
      socket.emit('TOURNAMENT_REGISTERED', result);
    } catch (error) {
      console.error('Error registering for tournament:', error);
      socket.emit('TOURNAMENT_ERROR', { error: error.message });
    }
  });

  socket.on('UNREGISTER_TOURNAMENT', ({ tournamentId, walletAddress,socketId}) => {
    try {
      const result = tournamentManager.unregisterPlayer(tournamentId, walletAddress,socketId);
      socket.emit('TOURNAMENT_UNREGISTERED', result);
    } catch (error) {
      console.error('Error unregistering from tournament:', error);
      socket.emit('TOURNAMENT_ERROR', { error: error.message });
    }
  });

  socket.on('GET_TOURNAMENTS', () => {
    try {
      const tournaments = tournamentManager.getAllTournaments();
      // Sanitize tournaments to avoid circular references
      const safeTournaments = tournaments.map(t => ({
        id: t.id,
        name: t.name,
        status: t.status,
        buyIn: t.buyIn,
        startingChips: t.startingChips,
        registrationEndsAt: t.registrationEndsAt,
        startTime: t.startTime,
        maxPlayers: t.maxPlayers,
        registeredPlayers: t.registeredPlayers.map(p => ({
          id: p.id,
          name: p.name,
          walletAddress: p.walletAddress,
          isBot: p.isBot || false
        })),
        prizePool: t.prizePool,
        structure: t.structure,
        blindStructure: t.blindStructure
      }));
      socket.emit('TOURNAMENTS_LIST', safeTournaments);
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

  socket.on('DELETE_TOURNAMENT', ({ tournamentId }) => {
    try {
      const result = tournamentManager.cancelTournament(tournamentId);
      console.log(`DELETE_TOURNAMENT ${tournamentId} result:`, result);
      
      if (result.success) {
        // Remove tournament from the map
        tournamentManager.tournaments.delete(tournamentId);
        socket.emit('TOURNAMENT_DELETED', { success: true, tournamentId });
        // Broadcast to all clients
        io.emit('TOURNAMENT_UPDATE', { id: tournamentId, status: 'deleted' });
      } else {
        socket.emit('TOURNAMENT_DELETED', { success: false, message: result.message });
      }
    } catch (error) {
      console.error('Error deleting tournament:', error);
      socket.emit('TOURNAMENT_DELETED', { success: false, message: error.message });
    }
  });

  socket.on('GET_TOURNAMENT_INFO', ({ tournamentId }) => {
    console.log('GET_TOURNAMENT_INFO received - tournamentId:', tournamentId, 'socketId:', socket.id);
    
    // Convert tournamentId to number
    const tournamentIdNum = parseInt(tournamentId);
    
    try {
      const tournament = tournamentManager.tournaments.get(tournamentIdNum);
      if (!tournament) {
        socket.emit('TOURNAMENT_ERROR', { error: 'Tournament not found' });
        return;
      }
      
      console.log('Sending tournament info:', tournament.name, 'Status:', tournament.status);
      
      // Send tournament information
      socket.emit('TOURNAMENT_INFO', {
        id: tournament.id,
        name: tournament.name,
        status: tournament.status,
        buyIn: tournament.buyIn,
        startingChips: tournament.startingChips,
        registrationEndsAt: tournament.registrationEndsAt,
        startTime: tournament.startTime,
        maxPlayers: tournament.maxPlayers,
        registeredPlayers: tournament.registeredPlayers.map(p => ({
          id: p.id,
          name: p.name,
          walletAddress: p.walletAddress,
          chips: p.chips,
          isBot: p.isBot || false
        })),
        prizePool: tournament.prizePool,
        structure: tournament.structure,
        blindStructure: tournament.blindStructure
      });
    } catch (error) {
      console.error('Error getting tournament info:', error);
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
      const tournament = tournamentManager.tournaments.get(tournamentIdNum);
      if (!tournament) {
        console.log('Tournament not found:', tournamentIdNum, 'Available:', Array.from(tournamentManager.tournaments.keys()));
        socket.emit('TOURNAMENT_ERROR', { error: 'Tournament not found' });
        return;
      }
      
      console.log('Tournament found:', tournament.name, 'Status:', tournament.status, 'Tables:', tournament.tables.length);
      
      let player = players[socket.id];
      let playerW=playersW[walletAddress]; //alf
      console.log('Player found in socket:', player ? `${player.name} (${player.id})` : 'NOT FOUND');
      
      // Check if this player is registered in the tournament
      const registeredPlayer = tournament.registeredPlayers.find(p => 
        p.id === walletAddress || p.walletAddress === walletAddress
      );
      
      // Also check if player is already seated at a table
      let seatedPlayer = null;
      let playerTable = null;
      
      for (const table of tournament.tables) {
        const seatsArray = Object.values(table.seats);
        const seat = seatsArray.find(seat => 
          seat && seat.player && 
          (seat.player.id === walletAddress || seat.player.walletAddress === walletAddress)
        );
        if (seat) {
          seatedPlayer = seat.player;
          playerTable = table;
          console.log('Player already seated at table:', table.id, 'seat:', seat.id);
          break;
        }
      }
      
      if (seatedPlayer) {
        // Player is already seated - update their socket ID
        //seatedPlayer.socketId = socket.id;
        //players[socket.id] = seatedPlayer;
        //player = seatedPlayer;
        //console.log('Updated seated player socketId:', socket.id);
      } else if (registeredPlayer) {
        console.log('Player is registered in tournament:', registeredPlayer.name);
        // Use the registered player and update their socket
        if (!playerW) {
          
         /* registeredPlayer.socketId = socket.id;
          players[socket.id] = registeredPlayer;
          player = registeredPlayer;
          console.log('Updated registered player socketId:', socket.id);*/
        }
      } else {
        // Not registered - create spectator
        if (!playerW) {
          console.log('Creating temporary spectator player');
          const spectatorName = 'Spectator_' + Math.random().toString(36).substring(2, 9);
          playerW = new Player(
            socket.id,
            'spectator',
            spectatorName,
            0 // Spectators have 0 chips
          );
          playersW[walletAddress] = playerW;
        }
      }



 

      // Find player's table (already done above if seated, but check again for all players)
      if (false && !playerTable) {
        // Try to find the player's assigned table
        for (const table of tournament.tables) {
          console.log('Checking table:', table.id, 'for player:', playerW.id);
          // seats is an object, not an array - iterate over its values
          const seatsArray = Object.values(table.seats);
          const seat = seatsArray.find(seat => seat && seat.player && 
            (seat.player.id === player.id || seat.player.socketId === socket.id));
          if (seat) {
            playerTable = table;
            console.log('Player found at table:', table.id, 'seat:', seat.id);
            break;
          }
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
      const tournamentInfo = tournamentManager.getTournamentInfo(tournamentId);
      socket.emit('TOURNAMENT_TABLE_ASSIGNED', {
        tournamentId,
        tableId: playerTable.id,
        table: playerTable.getTournamentStatus(),
        tournament: tournamentInfo
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
        // Create a proper Bot instance with AI
        const bot = botManager.createBot();
        
        // Register the bot in the tournament
        const result = tournamentManager.registerPlayer(tournamentId, bot);
        if (result.success) {
          successCount++;
          console.log(`🤖 Bot ${bot.name} registered for tournament ${tournamentId}`);
        }
      }
      
      socket.emit('BOTS_ADDED', { 
        success: true, 
        count: successCount,
        message: `Successfully added ${successCount} bot(s) to the tournament`
      });
      
      console.log(`Added ${successCount} bots to tournament ${tournamentId}`);
      
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

  socket.on(CS_JOIN_TABLE, (tableId,p) => {
    let table = tables[tableId];
    const player = players[p.socketId];

    //const wplayer = Object.values(playersW).find(p => p.socketId === socket.id);

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
    const isSpectator = player?.id === 'spectator' || player?.name.startsWith('Spectator_');
    
    // Join the Socket.io room for this table to receive broadcasts
    socket.join(`table-${tableId}`);
    console.log(`Socket ${p.socketId} joined room: table-${tableId}`);
    
    if (!isSpectator &&
        table.players.length < table.maxPlayers &&
        player &&
        !table.players.some(p => p && p.socketId === player.socketId)
    ) {
      table.addPlayer(player);
      sitDown(tableId, table.players.length, table.limit,player);
    } else {
      console.log('Spectator joined table:', tableId, '- not seating');
      // Send initial table state to spectator
      //const tableCopy = hideOpponentCards(table, socket.id);
      //socket.emit(SC_TABLE_UPDATED, { table: tableCopy });
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

  socket.on(CS_LEAVE_TABLE, (tableId,p) => {
    const table = tables[tableId];
    const player = players[p.socketId];
    //const wplayer = Object.values(playersW).find(p => p.socketId === socket.id);
                
    
if (!player) {
      console.log('Player not found for leaving table(maybe viewer):', p.socketId);
      return;
    }

    // Leave the Socket.io room
    socket.leave(`table-${tableId}`);
    console.log(`Socket ${p.socketId} left room: table-${tableId}`);
    
    const seat = Object.values(table.seats).find(
      (seat) => seat && seat.player.socketId === p.socketId,
    );

    console.log("leaving tableid====>", tableId, player)

    if (seat && player) {
      updatePlayerBankroll(player, seat.stack);
    } else {
      console.log('Is a spectator ', player);
       delete players[player.socketId];
         //   const wplayer = Object.values(playersW).find(p => p.socketId === socket.id);
        
    
    
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

  socket.on(CS_FOLD, (tableId,socketId) => {
    console.log('CS_FOLD received for table:', tableId, 'socket:', socketId);
    let table = tables[tableId];
    
    if (!table) {
      console.error('Table not found for fold:', tableId, 'Available tables:', Object.keys(tables));
      return;
    }
    
    let res = table.handleFold(socketId);
    res && broadcastToTable(table, res.message);
    res && changeTurnAndBroadcast(table, res.seatId);
  });

  socket.on(CS_CHECK, (tableId,origSockID) => {
    console.log('CS_CHECK received for table:', tableId, 'socket:', origSockID);
    let table = tables[tableId];
    
    if (!table) {
      console.error('Table not found for check:', tableId);
      return;
    }
    
    let res = table.handleCheck(origSockID);
    res && broadcastToTable(table, res.message);
    res && changeTurnAndBroadcast(table, res.seatId);
  });

  socket.on(CS_CALL, (tableId,origSockID) => {
    console.log('CS_CALL received for table:', tableId, 'socket:', origSockID);
    let table = tables[tableId];
    
    if (!table) {
      console.error('Table not found for call:', tableId);
      return;
    }
    
    let res = table.handleCall(origSockID);
    res && broadcastToTable(table, res.message);
    res && changeTurnAndBroadcast(table, res.seatId);
  });

  socket.on(CS_RAISE, ({ tableId, amount, origSockID }) => {
    console.log('CS_RAISE received for table:', tableId, 'amount:', amount, 'socket:', origSockID);
    let table = tables[tableId];
    
    if (!table) {
      console.error('Table not found for raise:', tableId);
      return;
    }
    
    let res = table.handleRaise(origSockID, amount);
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
  const sitDown =  (tableId, seatId,amount, player) => {
    const table = tables[tableId];
   // const player = players[socket.id];
    if (player) {
      table.sitPlayer(player, seatId, amount);
      let message = `${player.name} sat down in Seat ${seatId}`;

      //updatePlayerBankroll(player, -amount);

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

  socket.on(CS_STAND_UP, (tableId,origSockID) => {
    const table = tables[tableId];
    const player = players[origSockID];
    const seat = Object.values(table.seats).find(
      (seat) => seat && seat.player.socketId === origSockID,
    );

    let message = '';
    if (seat) {
      updatePlayerBankroll(player, seat.stack);
      message = `${player?.username} left the table`;
    } else {
      message = `A spectator left the table`;
        return
    }

    table.standPlayer(origSockID);

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
    console.log('Emptu - alf Updating bankroll for player:', player.name, 'Amount:', amount);
   // players[socket.id].bankroll += amount;
   // io.to(socket.id).emit(SC_PLAYERS_UPDATED, getCurrentPlayers());
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
    // Remove circular reference before any processing
    const { tournamentManager, ...cleanTable } = table;
    
    // Broadcast to all players in the table
    for (let i = 0; i < cleanTable.players.length; i++) {
      let socketId = cleanTable.players[i].socketId;
      let tableCopy = hideOpponentCards(cleanTable, socketId);
      io.to(socketId).emit(SC_TABLE_UPDATED, {
        table: tableCopy,
        message,
        from,
      });
    }
    
    // Also broadcast to room for spectators (they see all cards hidden except shown ones)
    const tableCopyForSpectators = hideOpponentCards(cleanTable, 'spectator');
    io.to(`table-${cleanTable.id}`).emit(SC_TABLE_UPDATED, {
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
        // For tournament tables, use BotManager to handle the next hand
        if (table.isTournament) {
          botManager.handleHandOver(table, table.id);
        } else {
          initNewHand(table);
        }
      } else {
        // Check if next player is a bot
        botManager.checkAndActForBot(table, table.id);
      }
    }, 1000);
  }

  function initNewHand(table) {
    // This function should only be called for non-tournament tables
    if (table.isTournament) {
      console.warn('initNewHand called for tournament table - using BotManager instead');
      botManager.handleHandOver(table, table.id);
      return;
    }
    
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
