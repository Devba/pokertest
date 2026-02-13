# Client-Server Interaction Analysis

## Complete Socket.io Event Flow

### 1. CONNECTION & LOBBY

#### Client → Server: `CS_FETCH_LOBBY_INFO`
**Payload**: `{walletAddress, socketId, gameId, username}`

**Server Logic** (Lines 543-584):
```javascript
// Creates or updates player in playersW object
playersW[walletAddress] = new Player(socket.id, walletAddress, username, chips)

// Responds with:
socket.emit(SC_RECEIVE_LOBBY_INFO, {
  tables: getCurrentTables(),
  players: getCurrentPlayers(),
  socketId: socket.id,
  amount: config.INITIAL_CHIPS_AMOUNT,
  playersW: getCurrentPlayersw(),
  username: username
})
```

**Key Points**:
- Player objects stored in `playersW` keyed by **walletAddress**
- Socket ID stored as property but **walletAddress is primary key**
- Broadcasts player list to all clients

---

### 2. TOURNAMENT LIFECYCLE

#### A. Create Tournament
**Client → Server**: `CREATE_TOURNAMENT` (Lines 109-151)

```javascript
socket.on('CREATE_TOURNAMENT', (config) => {
  const tournament = tournamentManager.createTournament(config)
  
  // Add bots if requested
  if (config.addBots && config.botsCount > 0) {
    for (let i = 0; i < config.botsCount; i++) {
      const bot = botManager.createBot()
      tournamentManager.registerPlayer(tournament.id, bot, bot)
    }
  }
  
  // Auto-start if immediate
  if (config.startTime === "immediate") {
    tournamentManager.startTournament(tournament.id)
  }
  
  socket.emit('TOURNAMENT_CREATED', { success: true, tournament })
})
```

#### B. Register for Tournament
**Client → Server**: `REGISTER_TOURNAMENT` (Lines 153-196)
**Payload**: `{tournamentId, walletAddress, username, socketId}`

```javascript
// Find or create player in playersW
let playerW = playersInTournament[walletAddress]
if (!playerW) {
  playerW = new Player(walletAddress, walletAddress, playerName, chips, 
                       isBot=false, tournamentId=tournamentId, wallet=walletAddress)
  playersW[walletAddress] = playerW
}

// Register player in tournament
tournamentManager.registerPlayer(tournamentId, null, playerW)
socket.emit('TOURNAMENT_REGISTERED', result)
```

**Critical Finding**: Player is keyed by `walletAddress`, NOT `socket.id`

#### C. Get Tournament List
**Client → Server**: `GET_TOURNAMENTS` (Lines 206-233)

Returns sanitized tournament list without circular references.

#### D. Get Tournament Info
**Client → Server**: `GET_TOURNAMENT_INFO` (Lines 270-305)
**Payload**: `{tournamentId}`

```javascript
const tournament = tournamentManager.tournaments.get(tournamentIdNum)

socket.emit('TOURNAMENT_INFO', {
  id: tournament.id,
  name: tournament.name,
  status: tournament.status,
  registeredPlayers: [...],
  tables: tournament.tables.map(table => ({
    id: table.id,
    seats: table.seats,
    history: table.history.slice(-20),
    handStackSnapshots: table.handStackSnapshots
  }))
})
```

#### E. Get Tournament Table Assignment
**Client → Server**: `GET_TOURNAMENT_TABLE` (Lines 307-467)
**Payload**: `{tournamentId, walletAddress, mode}`

**Server Flow**:
```javascript
1. Find tournament by ID
2. Find player in playersW[walletAddress]
3. Check if player is registered
4. Search all tables for player by walletAddress:
   - seat.player.id === walletAddress
   - seat.player.walletAddress === walletAddress
5. If not found, create spectator player
6. Assign to playerTable (or first table if spectator)
7. Emit TOURNAMENT_TABLE_ASSIGNED
```

**Key Logic**:
```javascript
// Search for seated player (Lines 346-360)
for (const table of tournament.tables) {
  const seat = seatsArray.find(seat => 
    seat && seat.player && 
    (seat.player.id === walletAddress || 
     seat.player.walletAddress === walletAddress)
  )
  if (seat) {
    seatedPlayer = seat.player
    playerTable = table
    break
  }
}
```

**Returns**:
```javascript
socket.emit('TOURNAMENT_TABLE_ASSIGNED', {
  tournamentId,
  tableId: playerTable.id,
  table: playerTable.getTournamentStatus(),
  tournament: tournamentInfo
})
```

---

### 3. TABLE OPERATIONS

#### A. Join Table
**Client → Server**: `CS_JOIN_TABLE` (Lines 586-643)
**Payload**: `(tableId, p)` where `p = {socketId, walletAddress, username, netwSid}`

```javascript
const player = playersW[p.socketId]  // ⚠️ Gets player by socketId field of p object

// Join Socket.io room
socket.join(`table-${tableId}`)

// Check if spectator
const isSpectator = player?.id === 'spectator' || player?.name.startsWith('Spectator_')

if (!isSpectator && table.players.length < table.maxPlayers) {
  table.addPlayer(player)
  sitDown(tableId, table.players.length, table.limit, player)
}

socket.emit(SC_TABLE_JOINED, { tables: getCurrentTables(), tableId })
```

**⚠️ CRITICAL ISSUE**: 
- Line 589: `const player = playersW[p.socketId]`
- But `p.socketId` is actually the **walletAddress**!
- This is a naming inconsistency - the code works because `p.socketId` contains walletAddress

#### B. Leave Table
**Client → Server**: `CS_LEAVE_TABLE` (Lines 670-713)
**Payload**: `(tableId, p)` where `p = {walletAddress, socketId}`

```javascript
const player = playersW[p.walletAddress]

// Leave Socket.io room
socket.leave(`table-${tableId}`)

// Find seat by player socketId
const seat = Object.values(table.seats).find(
  seat => seat && seat.player.socketId === p.socketId
)

if (seat && player) {
  updatePlayerBankroll(player, seat.stack)
}

table.removePlayer(socket.id)
socket.emit(SC_TABLE_LEFT, { tables: getCurrentTables(), tableId })
```

#### C. Subscribe to Table (Spectator Mode)
**Client → Server**: `CS_TABLE_SUBSCRIBE` (Lines 645-668)
**Payload**: `{tableId}`

```javascript
// Find table in main tables or tournament tables
let targetTable = tables[tableId]
if (!targetTable && tournamentManager) {
  for (const t of tournamentManager.tournaments.values()) {
    const found = t.tables?.find(tbl => tbl.id === tableId)
    if (found) {
      targetTable = found
      break
    }
  }
}

// Join room and send initial state
socket.join(`table-${tableId}`)
const tableCopyForSpectators = hideOpponentCards(cleanTable, 'spectator')
socket.emit(SC_TABLE_UPDATED, { table: tableCopyForSpectators })
```

---

### 4. GAME ACTIONS

All game actions follow the same pattern:

#### Fold
**Client → Server**: `CS_FOLD` (Lines 715-726)
**Payload**: `(tableId, socketId)` where socketId is **walletAddress**

```javascript
let table = tables[tableId]
let res = table.handleFold(socketId)
res && broadcastToTable(table, res.message)
res && changeTurnAndBroadcast(table, res.seatId)
```

#### Check
**Client → Server**: `CS_CHECK` (Lines 728-739)
**Payload**: `(tableId, origSockID)` where origSockID is **walletAddress**

#### Call
**Client → Server**: `CS_CALL` (Lines 741-752)
**Payload**: `(tableId, origSockID)`

#### Raise
**Client → Server**: `CS_RAISE` (Lines 754-765)
**Payload**: `{tableId, amount, origSockID}`

---

### 5. BROADCAST MECHANISMS

#### Function: `broadcastToTable()` (Lines 882-906)

```javascript
function broadcastToTable(table, message = null, from = null) {
  // Remove circular reference
  const { tournamentManager, ...cleanTable } = table
  
  // Broadcast to each player individually
  for (let i = 0; i < cleanTable.players.length; i++) {
    let socketId = cleanTable.players[i].socketId
    let tableCopy = hideOpponentCards(cleanTable, socketId)
    io.to(socketId).emit(SC_TABLE_UPDATED, {
      table: tableCopy,
      message,
      from,
    })
  }
  
  // Also broadcast to room for spectators
  const tableCopyForSpectators = hideOpponentCards(cleanTable, 'spectator')
  io.to(`table-${cleanTable.id}`).emit(SC_TABLE_UPDATED, {
    table: tableCopyForSpectators,
    message,
    from,
  })
}
```

**Key Points**:
- Broadcasts to individual player sockets via `player.socketId`
- Also broadcasts to `table-${tableId}` room for spectators
- Hides opponent cards per player
- Tournament tables show all cards to spectators

#### Function: `changeTurnAndBroadcast()` (Lines 908-928)

```javascript
function changeTurnAndBroadcast(table, seatId) {
  setTimeout(() => {
    table.changeTurn(seatId)
    broadcastToTable(table)
    
    if (table.handOver) {
      // For tournament tables
      if (table.isTournament) {
        botManager.handleHandOver(table, table.id)  // ⭐ KEY: Starts new hand
      } else {
        initNewHand(table)
      }
    } else {
      // Check if next player is a bot
      botManager.checkAndActForBot(table, table.id)
    }
  }, 1000)  // ⚠️ 1 second delay before turn change
}
```

**Critical Flow**:
1. Wait 1 second
2. Change turn to next player
3. Broadcast updated table
4. **If hand is over** → Call `botManager.handleHandOver()` (tournament) or `initNewHand()` (cash game)
5. **If hand continues** → Check if bot needs to act

#### Function: `initNewHand()` (Lines 930-945)

```javascript
function initNewHand(table) {
  // Only for non-tournament tables
  if (table.isTournament) {
    console.warn('initNewHand called for tournament table - using BotManager instead')
    botManager.handleHandOver(table, table.id)
    return
  }
  
  if (table.activePlayers().length > 1) {
    broadcastToTable(table, '---New hand starting in 5 seconds---')
  }
  
  setTimeout(() => {
    table.clearWinMessages()
    table.startHand()  // ⭐ STARTS NEW HAND
    broadcastToTable(table, '--- New hand started ---')
    botManager.checkAndActForBot(table, table.id)
  }, 5000)  // ⚠️ 5 second delay before new hand
}
```

#### Function: `hideOpponentCards()` (Lines 953-977)

```javascript
function hideOpponentCards(table, socketId) {
  let tableCopy = JSON.parse(JSON.stringify(table))
  
  // ⚠️ Tournament tables: Don't hide ANY cards
  if (tableCopy.isTournament) {
    return tableCopy
  }
  
  let hiddenHand = [{ suit: 'hidden', rank: 'hidden' }, { suit: 'hidden', rank: 'hidden' }]
  
  for (let i = 1; i <= tableCopy.maxPlayers; i++) {
    let seat = tableCopy.seats[i]
    if (seat && seat.hand.length > 0 && 
        seat.player.socketId !== socketId &&
        !(seat.lastAction === WINNER && tableCopy.wentToShowdown)) {
      seat.hand = hiddenHand
    }
  }
  return tableCopy
}
```

**Important**: Tournament tables show ALL cards to ALL players (spectators can see everything)

---

### 6. SOCKET.IO ROOM MANAGEMENT

#### Rooms Used:
1. **`table-${tableId}`** - All players + spectators at a specific table
2. **Individual socket IDs** - Direct messages to specific players

#### Join Room:
- `CS_JOIN_TABLE` → `socket.join(`table-${tableId}`)`
- `CS_TABLE_SUBSCRIBE` → `socket.join(`table-${tableId}`)`

#### Leave Room:
- `CS_LEAVE_TABLE` → `socket.leave(`table-${tableId}`)`
- `CS_TABLE_UNSUBSCRIBE` → `socket.leave(`table-${tableId}`)`

#### Room Movement During Player Transfer (TournamentManager):
```javascript
// When moving player between tables (TournamentManager.js)
socket.leave(`table-${fromTable.id}`)
socket.join(`table-${toTable.id}`)
socket.emit('PLAYER_MOVED_TABLE', {
  message: `You have been moved to ${toTable.name}`,
  newTableId: toTable.id,
  seatId: targetSeatId
})
```

---

### 7. IDENTIFIED ISSUES & INCONSISTENCIES

#### ⚠️ Issue 1: Naming Confusion - socketId vs walletAddress
**Problem**: Throughout the code, `socketId` is used as a variable name but actually contains `walletAddress`

**Examples**:
- Line 589: `const player = playersW[p.socketId]` - But `p.socketId` is the walletAddress!
- Line 590 (GameState.js): `const origSockID = localStorage.getItem("wallet")`
- Client sends: `origSockID` which is actually `walletAddress`

**Why it works**: 
- Players are stored as `playersW[walletAddress]`
- Player object has `socketId` property that equals `walletAddress`
- When searching seats, it searches by `seat.player.socketId` which equals `walletAddress`

**Risk**: Extremely confusing for debugging and maintenance

#### ⚠️ Issue 2: Player Identification Inconsistency
Players are identified by:
1. `walletAddress` (primary key in playersW)
2. `socket.id` (actual Socket.io connection ID)
3. `player.socketId` (property that stores walletAddress)
4. `player.id` (also stores walletAddress)

**Correct Model**:
```javascript
Player {
  socketId: "0x123abc..." (walletAddress),
  id: "0x123abc..." (walletAddress),
  walletAddress: "0x123abc...",
  wallet: "0x123abc...",
  actualsockID: "xyz789" (real Socket.io ID) - NOT USED
}
```

#### ⚠️ Issue 3: Disconnect Handling
**Line 851**: `socket.on(CS_DISCONNECT, ()` only handles `players[socket.id]`, NOT `playersW[walletAddress]`

```javascript
socket.on(CS_DISCONNECT, () => {
  const seat = findSeatBySocketId(socket.id)  // ⚠️ Won't find tournament players!
  if (seat) {
    updatePlayerBankroll(seat.player, seat.stack)
  }
  
  delete players[socket.id]  // ⚠️ Doesn't delete from playersW!
  removeFromTables(socket.id)  // ⚠️ Won't find by walletAddress!
})
```

**Result**: Tournament players are NOT properly cleaned up on disconnect!

#### ⚠️ Issue 4: Table Lookup After Actions
All game actions do:
```javascript
let table = tables[tableId]
```

But tournament tables are added to `tables` object dynamically. If a table is removed or not properly registered, actions will fail silently.

#### ⚠️ Issue 5: Broadcast Timing
Multiple delays in the flow:
1. `changeTurnAndBroadcast()` - 1 second delay
2. `initNewHand()` - 5 second delay
3. `botManager.handleHandOver()` - 5 second delay

**Total**: Up to 11 seconds between action and new hand start!

---

### 8. CRITICAL HAND START LOGIC

#### When Does a New Hand Start?

**Path 1: After Player Action** (Most Common)
```
Player Action (Fold/Check/Call/Raise)
  ↓
table.handleFold/Check/Call/Raise(socketId)
  ↓
changeTurnAndBroadcast(table, nextSeatId)
  ↓ (1 second delay)
table.changeTurn(seatId)
  ↓
[Check if table.handOver === true]
  ↓ (YES)
botManager.handleHandOver(table, table.id)
  ↓ (5 second delay)
table.startHand()
  ↓
broadcastToTable(table, '--- New hand started ---')
```

**Path 2: After Table Rebalancing**
```
Player Eliminated
  ↓
TournamentManager.checkTableBalance()
  ↓
TournamentManager.startTablesReadyToPlay()
  ↓
table.startHand() (for tables with >= 2 players and handOver === true)
  ↓
TournamentManager.broadcastTableState(table)
```

**Path 3: After Sitting In**
```
Player Sits In (SITTING_IN event)
  ↓ (Line 845-850)
if (table.handOver && table.activePlayers().length === 2) {
  initNewHand(table)
}
```

#### ⚠️ MISSING PATH: After Blind Increase

**Current blind increase flow**:
```
TournamentManager.startBlindTimer()
  ↓ (check every 10 seconds)
[Check if time to increase]
  ↓ (YES)
TournamentManager.increaseBlindsForAllTables()
  ↓
table.increaseBlinds() (for each table)
  ↓
table.winMessages.push(increaseResult.message)
  ↓
TournamentManager.broadcastTableState(table)
  ↓
❌ ENDS HERE - NO HAND START CHECK!
```

**Problem**: If a hand ends EXACTLY when blinds increase, the table will:
1. Broadcast blind increase message
2. NOT start a new hand
3. Wait indefinitely for player action (which can't happen because hand is over)

---

### 9. HAND-OVER DETECTION

#### Table.js Property: `table.handOver`

Set to `true` when:
1. All players fold except one
2. Showdown completes
3. Only one player left with chips

Set to `false` when:
4. `table.startHand()` is called

#### Checked In:
1. `changeTurnAndBroadcast()` - Line 914
2. `SITTING_IN` handler - Line 847
3. `BotManager.handleHandOver()` - Implicitly (expects handOver === true)
4. `TournamentManager.startTablesReadyToPlay()` - Line 593

---

### 10. SOCKET EVENT SUMMARY

| Event Name | Direction | Payload | Handler Line | Purpose |
|------------|-----------|---------|--------------|---------|
| `CREATE_TOURNAMENT` | C→S | config object | 109 | Create new tournament |
| `TOURNAMENT_CREATED` | S→C | {success, tournament} | 112 | Confirm creation |
| `REGISTER_TOURNAMENT` | C→S | {tournamentId, walletAddress...} | 153 | Register for tournament |
| `TOURNAMENT_REGISTERED` | S→C | result object | 194 | Confirm registration |
| `GET_TOURNAMENTS` | C→S | none | 206 | Request tournament list |
| `TOURNAMENTS_LIST` | S→C | tournaments array | 232 | Send tournament list |
| `GET_TOURNAMENT_INFO` | C→S | {tournamentId} | 270 | Get tournament details |
| `TOURNAMENT_INFO` | S→C | tournament object | 304 | Send tournament details |
| `GET_TOURNAMENT_TABLE` | C→S | {tournamentId, walletAddress, mode} | 307 | Request table assignment |
| `TOURNAMENT_TABLE_ASSIGNED` | S→C | {tableId, table, tournament} | 458 | Send table assignment |
| `CS_JOIN_TABLE` | C→S | (tableId, player) | 586 | Join table |
| `SC_TABLE_JOINED` | S→C | {tables, tableId} | 638 | Confirm table join |
| `CS_LEAVE_TABLE` | C→S | (tableId, player) | 670 | Leave table |
| `SC_TABLE_LEFT` | S→C | {tables, tableId} | 711 | Confirm table leave |
| `CS_FOLD` | C→S | (tableId, socketId) | 715 | Fold hand |
| `CS_CHECK` | C→S | (tableId, socketId) | 728 | Check |
| `CS_CALL` | C→S | (tableId, socketId) | 741 | Call bet |
| `CS_RAISE` | C→S | {tableId, amount, socketId} | 754 | Raise bet |
| `SC_TABLE_UPDATED` | S→C | {table, message, from} | Broadcast | Table state update |
| `CS_TABLE_SUBSCRIBE` | C→S | {tableId} | 645 | Subscribe as spectator |
| `CS_TABLE_UNSUBSCRIBE` | C→S | {tableId} | 669 | Unsubscribe |
| `SITTING_OUT` | C→S | {tableId, seatId} | 836 | Stand up |
| `SITTING_IN` | C→S | {tableId, seatId} | 843 | Sit back in |

---

### 11. KEY FINDINGS FOR TOURNAMENT FREEZE BUG

#### Potential Root Causes:

1. **Blind Increase Race Condition**
   - If hand ends during blind increase
   - Blind increase broadcasts but doesn't check handOver
   - Table gets stuck waiting for impossible action

2. **Player Identification Mismatch**
   - Game actions use `socketId` parameter (which is actually walletAddress)
   - If walletAddress doesn't match `player.socketId` property, action fails silently
   - No error thrown, just no action taken

3. **Circular setTimeout Dependencies**
   - `changeTurnAndBroadcast()` → 1000ms delay
   - `botManager.handleHandOver()` → 5000ms delay
   - If any setTimeout handle is lost, hand never starts

4. **Table Registration**
   - Tournament tables added to `tables` object via:
     - `TournamentManager.startTournament()` - Line 241-248
     - Verified in logs: "Added tournament table X to main tables object"
   - If table somehow removed from `tables` object, all actions fail

5. **Socket Room Membership**
   - Players must be in `table-${tableId}` room to receive broadcasts
   - If socket disconnects/reconnects without rejoining room, they miss updates
   - But server still tries to broadcast to their old socketId

---

### 12. DEBUGGING RECOMMENDATIONS

To find why Tournament 1 froze:

1. **Check table.handOver status**
   ```javascript
   tournament.tables.forEach(t => console.log(t.id, 'handOver:', t.handOver))
   ```

2. **Verify tables object has tournament tables**
   ```javascript
   console.log('Tables:', Object.keys(tables))
   ```

3. **Check active setTimeout timers**
   - Look for pending timers in event loop
   - Check if `changeTurnAndBroadcast` was called but setTimeout lost

4. **Verify player.socketId matches walletAddress**
   ```javascript
   tournament.tables.forEach(t => {
     Object.values(t.seats).forEach(seat => {
       if (seat) console.log('Player:', seat.player.name, 'socketId:', seat.player.socketId)
     })
   })
   ```

5. **Check if blind increase happened during hand-over**
   - Look for timing of last blind increase vs last hand completion

6. **Verify Socket.io rooms**
   ```javascript
   const roomMembers = io.sockets.adapter.rooms.get(`table-${tableId}`)
   console.log('Room members:', roomMembers)
   ```

---

### 13. PROPOSED FIX

Add explicit hand-start check after blind increase:

```javascript
// In TournamentManager.increaseBlindsForAllTables()
tournament.tables.forEach(table => {
  if (table.activePlayers().length >= 2) {
    const increaseResult = table.increaseBlinds()
    if (increaseResult) {
      console.log(`📈 Table ${table.id}: ${increaseResult.message}`)
      table.winMessages.push(increaseResult.message)
      this.broadcastTableState(table)
      
      // ⭐ ADD THIS: Check if hand needs to start
      if (table.handOver && table.activePlayers().length >= 2) {
        console.log(`🎴 Table ${table.id}: Hand over after blind increase - starting new hand`)
        this.botManager.handleHandOver(table, table.id)
      }
    }
  }
})
```

