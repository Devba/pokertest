# Hand Order Flow Investigation - TournamentPlay

## Overview
This document traces how new hands are requested and initiated from the client (TournamentPlay.js) through the server backend.

---

## 1. CLIENT SIDE - TournamentPlay.js

### Initial Tournament Table Join
**File**: [client/src/pages/TournamentPlay.js](client/src/pages/TournamentPlay.js#L65-L76)

```javascript
// Line 65: Player joins tournament
socket.emit('GET_TOURNAMENT_TABLE', { 
  tournamentId, 
  walletAddress: walletAddress || 'spectator',
  mode: mode 
})

// Line 75: Server responds with table assignment
socket.on('TOURNAMENT_TABLE_ASSIGNED', ({ tableId, tournament }) => {
  setTournamentInfo(tournament)
  // Line 76: Join the specific tournament table
  joinTable(tableId)
})
```

### Game Actions (Fold, Check, Call, Raise)
**File**: [client/src/context/game/GameState.js](client/src/context/game/GameState.js#L155-L220)

The client emits these events when a player acts:

```javascript
// Line 177-180: Fold
socket.emit(CS_FOLD, currentTableRef.current.id, origSockID)

// Line 185-188: Check
socket.emit(CS_CHECK, currentTableRef.current.id, origSockID)

// Line 191-194: Call
socket.emit(CS_CALL, currentTableRef.current.id, origSockID)

// Line 197-200: Raise
socket.emit(CS_RAISE, { 
  tableId: currentTableRef.current.id, 
  amount,
  origSockID
})
```

### Table State Listener
**File**: [client/src/context/game/GameState.js](client/src/context/game/GameState.js#L108-L120)

The client receives table updates:

```javascript
socket.on(SC_TABLE_UPDATED, ({ table, message, from }) => {
  console.log(SC_TABLE_UPDATED, { table, message, from })
  setCurrentTable(table)  // Updates game state with new table state
  message && addMessage(message)
})
```

---

## 2. SERVER SIDE - Socket Handlers

### Tournament Table Assignment
**File**: [socket/index.js](socket/index.js#L324-L470)

```javascript
socket.on('GET_TOURNAMENT_TABLE', ({ tournamentId, walletAddress, mode }) => {
  // Finds the tournament
  const tournament = tournamentManager.tournaments.get(tournamentIdNum)
  
  // Finds player's table (or first table if spectator)
  let playerTable = tournament.tables[0]
  
  // Emits back to client
  socket.emit('TOURNAMENT_TABLE_ASSIGNED', {
    tournamentId,
    tableId: playerTable.id,
    table: playerTable.getTournamentStatus(),
    tournament: tournamentInfo
  })
})
```

### Game Actions Handler (Example: Fold)
**File**: [socket/index.js](socket/index.js#L770-L810)

```javascript
socket.on(CS_FOLD, (tableId, playerId) => {
  const table = tables[tableId]
  
  // Execute the fold action
  table.fold()
  
  // Check if hand is over
  if (table.handOver) {
    // For tournament tables, use BotManager to handle the next hand
    if (table.isTournament) {
      botManager.handleHandOver(table, tableId)
    } else {
      initNewHand(table)
    }
  }
  
  // Broadcast updated table state
  changeTurnAndBroadcast(table, nextSeatId)
})
```

### Turn Change & Broadcast
**File**: [socket/index.js](socket/index.js#L930-L945)

```javascript
function changeTurnAndBroadcast(table, seatId) {
  setTimeout(() => {
    table.changeTurn(seatId)
    broadcastToTable(table)
    
    if (table.handOver) {
      // For tournament tables, use BotManager
      if (table.isTournament) {
        botManager.handleHandOver(table, table.id)
      } else {
        initNewHand(table)
      }
    } else {
      // Check if next player is a bot
      botManager.checkAndActForBot(table, table.id)
    }
  }, 1000)
}
```

---

## 3. HAND INITIALIZATION LOGIC

### BotManager.handleHandOver() - CRITICAL
**File**: [pokergame/BotManager.js](pokergame/BotManager.js#L336-L390)

This is where new hands are INITIATED when a hand ends:

```javascript
handleHandOver(table, tableId) {
  // Check for eliminations
  if (table.isTournament && table.checkForEliminations) {
    const playersEliminated = table.checkForEliminations()
    if (playersEliminated && table.tournamentId && this.tournamentManager) {
      this.tournamentManager.broadcastTournamentUpdate(table.tournamentId)
    }
  }
  
  const activeCount = table.activePlayers().length
  
  if (activeCount >= 2) {
    // ⭐ START NEW HAND AFTER 5 SECONDS
    this.broadcastToTable(table, '---New hand starting in 5 seconds---')
    
    setTimeout(() => {
      console.log(`🃏 Table ${tableId}: Starting new hand with ${table.activePlayers().length} players`)
      table.clearWinMessages()
      table.startHand()  // ⭐ THIS STARTS THE NEW HAND
      this.broadcastToTable(table, '--- New hand started ---')
      
      // Check if first player to act is a bot
      setTimeout(() => {
        this.checkAndActForBot(table, tableId)
      }, 500)
    }, 5000)  // ⭐ 5 SECOND DELAY BEFORE NEW HAND
  }
  // ... handles elimination cases
}
```

### TournamentManager.startTablesReadyToPlay() - ALSO STARTS HANDS
**File**: [pokergame/TournamentManager.js](pokergame/TournamentManager.js#L590-L610)

This function is called after table rebalancing to start hands on tables that now have enough players:

```javascript
startTablesReadyToPlay(tournamentId) {
  const tournament = this.tournaments.get(tournamentId)
  if (!tournament || tournament.status !== 'live') return
  
  tournament.tables.forEach(table => {
    const activePlayers = table.activePlayers().length
    
    // Check if table has enough players and is not already playing
    if (activePlayers >= 2 && table.handOver && !table.currentHand) {
      console.log(`🎴 Table ${table.id} now has ${activePlayers} players - starting first hand`)
      
      table.startHand()  // ⭐ START HAND HERE
      this.broadcastTableState(table)
      
      // Check if first player to act is a bot
      if (this.botManager) {
        setTimeout(() => {
          this.botManager.checkAndActForBot(table, table.id)
        }, 1500)
      }
    }
  })
}
```

### Blind Increase Handling
**File**: [pokergame/TournamentManager.js](pokergame/TournamentManager.js#L337-L380)

When blinds increase, this function updates all tables:

```javascript
increaseBlindsForAllTables(tournamentId) {
  const tournament = this.tournaments.get(tournamentId)
  
  tournament.tables.forEach(table => {
    if (table.activePlayers().length >= 2) {
      const increaseResult = table.increaseBlinds()
      if (increaseResult) {
        console.log(`📈 Table ${table.id}: ${increaseResult.message}`)
        table.winMessages.push(increaseResult.message)
        
        // Broadcast updated table state
        this.broadcastTableState(table)
      }
    }
  })
}
```

⚠️ **POTENTIAL ISSUE**: After blind increase, there's NO automatic trigger to start a new hand if the current hand is over! The hand will only start when the current hand naturally completes.

---

## 4. BROADCAST FLOW

### BotManager.broadcastToTable()
**File**: [pokergame/BotManager.js](pokergame/BotManager.js#L423-L450)

```javascript
broadcastToTable(table, message = null, from = null) {
  // Broadcast to all players in the table
  for (let i = 0; i < table.players.length; i++) {
    let player = table.players[i]
    if (!player || !player.socketId) continue
    
    let socketId = player.socketId
    let tableCopy = this.hideOpponentCards(table, socketId)
    this.io.to(socketId).emit('SC_TABLE_UPDATED', {
      table: tableCopy,
      message,
      from,
    })
  }
}
```

### TournamentManager.broadcastTableState()
**File**: [pokergame/TournamentManager.js](pokergame/TournamentManager.js#L970-L995)

```javascript
broadcastTableState(table) {
  // Uses BotManager's broadcast method
  if (this.botManager && this.botManager.broadcastToTable) {
    this.botManager.broadcastToTable(table, '', null)
    return
  }
  
  // Fallback: manual broadcast
  this.io.to(`table-${table.id}`).emit('SC_TABLE_UPDATED', {
    table: cleanTable,
    message: '',
    from: null
  })
}
```

---

## 5. TOURNAMENT FLOW - Thread of Execution

1. **Client** → Emits `GET_TOURNAMENT_TABLE` to join
2. **Server** → Finds tournament & table, emits `TOURNAMENT_TABLE_ASSIGNED`
3. **Client** → Calls `joinTable(tableId)` which emits `CS_JOIN_TABLE`
4. **Server** → Validates & broadcasts to room `SC_TABLE_UPDATED`
5. **Client** → Receives `SC_TABLE_UPDATED`, updates game state
6. **Player/Bot Acts** → Emits `CS_FOLD` / `CS_CHECK` / `CS_CALL` / `CS_RAISE`
7. **Server** → Processes action, calls `changeTurnAndBroadcast()`
8. **If Hand Over** → Calls `botManager.handleHandOver(table, tableId)`
9. **BotManager** → Waits 5 seconds, calls `table.startHand()`
10. **Server** → Broadcasts `SC_TABLE_UPDATED` with new hand state
11. **Client** → Receives update, re-renders table with new hole cards
12. **Loop** → Continues to next player's turn

---

## 6. IDENTIFIED ISSUES & RISKS

### ⚠️ Issue 1: No Hand Start After Blind Increase
When blinds increase in a tournament:
- The `increaseBlindsForAllTables()` function updates blinds
- It broadcasts the table state with the new blind messages
- **BUT**: It doesn't check if a hand needs to be started
- If a table is between hands, it will stay idle until a new hand naturally starts

### ⚠️ Issue 2: Potential Race Condition
If multiple actions happen quickly (elimination + blind increase + table rebalancing):
- `handleHandOver()` might be called
- `startTablesReadyToPlay()` might be called
- They could conflict if not properly coordinated

### ⚠️ Issue 3: No Client-Side Hand Start Request
The client NEVER requests a new hand. It's entirely server-driven:
- Hands start only when the previous hand completes
- Or when `startTablesReadyToPlay()` is triggered after rebalancing
- There's no explicit "start next hand" event

### ⚠️ Issue 4: Tournament Status Check
In `startTablesReadyToPlay()`:
```javascript
if (!tournament || tournament.status !== 'live') return
```

If tournament status is not 'live', hands won't start!

---

## 7. KEY SOCKET EVENTS SUMMARY

### Client → Server
| Event | Payload | Purpose |
|-------|---------|---------|
| `GET_TOURNAMENT_TABLE` | `{tournamentId, walletAddress, mode}` | Join tournament |
| `CS_FOLD` | `(tableId, playerId)` | Fold current hand |
| `CS_CHECK` | `(tableId, playerId)` | Check current hand |
| `CS_CALL` | `(tableId, playerId)` | Call current bet |
| `CS_RAISE` | `{tableId, amount, origSockID}` | Raise current bet |
| `CS_JOIN_TABLE` | `tableId, player` | Join specific table |
| `CS_LEAVE_TABLE` | `tableId, player` | Leave table |
| `CS_STAND_UP` | `tableId, origSockID` | Stand up from seat |
| `SITTING_IN` | `{tableId, seatId}` | Sit back in |

### Server → Client
| Event | Payload | Purpose |
|-------|---------|---------|
| `TOURNAMENT_TABLE_ASSIGNED` | `{tableId, tournament}` | Confirm table assignment |
| `SC_TABLE_UPDATED` | `{table, message, from}` | Table state update |
| `TOURNAMENT_UPDATE` | Tournament info | Tournament-level update |
| `TOURNAMENT_ERROR` | `{error}` | Error message |

---

## 8. RECOMMENDATION FOR DEBUGGING

To find why Tournament 1 stopped:

1. **Check BotManager.handleHandOver()** - Is it being called?
2. **Verify TournamentManager.startTablesReadyToPlay()** - When was it last called?
3. **Check tournament.status** - Is it still 'live'?
4. **Look at 5-second timeout** - Is there a hung setTimeout?
5. **Check Socket.IO rooms** - Are players still in `table-X` rooms?
6. **Verify table.handOver** - Is it stuck as true?

---

## Timeline of Hand Flow

```
Player Action (5s)
        ↓
Server Process (1s)
        ↓
Check Hand Over? → NO → Check if Bot? → YES/NO (0-5s)
        ↓ (YES)
Call handleHandOver() (0s)
        ↓
Broadcast "5 seconds..." (0s)
        ↓
WAIT 5 SECONDS
        ↓
table.startHand() (5s)
        ↓
Broadcast new hand (5s)
        ↓
Check if Bot acts (5.5s)
        ↓
Broadcast "Bot acting..." (5.5s)
        ↓
COMPLETE - Waiting for player action
```

