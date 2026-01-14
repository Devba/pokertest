# 🎮 Bot API Quick Reference

## HTTP Endpoints for Bot Management

### 1. Add a Single Bot

**POST** `/api/bots/add`

Add one bot to a table with optional strategy.

```bash
curl -X POST http://localhost:5000/api/bots/add \
  -H "Content-Type: application/json" \
  -d '{
    "tableId": 1,
    "strategy": "aggressive"
  }'
```

**Parameters:**
- `tableId` (required): Table ID number
- `strategy` (optional): `tight`, `loose`, `aggressive`, `passive`, or `balanced`

**Response:**
```json
{
  "success": true,
  "message": "Bot BotMaster1 added to table 1",
  "bot": {
    "id": "bot_id_1",
    "name": "BotMaster1",
    "strategy": "aggressive",
    "socketId": "bot_1234567890_1"
  }
}
```

---

### 2. Fill Table with Bots

**POST** `/api/bots/fill`

Automatically fill a table up to a target player count.

```bash
curl -X POST http://localhost:5000/api/bots/fill \
  -H "Content-Type: application/json" \
  -d '{
    "tableId": 1,
    "targetCount": 5
  }'
```

**Parameters:**
- `tableId` (required): Table ID number
- `targetCount` (optional): Total desired players (default: 5)

**Response:**
```json
{
  "success": true,
  "message": "Table 1 filled with bots",
  "table": {
    "id": 1,
    "totalPlayers": 5,
    "botCount": 4,
    "bots": [
      { "name": "AceKiller1", "strategy": "tight" },
      { "name": "ProNinja2", "strategy": "loose" },
      { "name": "BotWizard3", "strategy": "balanced" },
      { "name": "KingExpert4", "strategy": "aggressive" }
    ]
  }
}
```

---

### 3. Remove Specific Bot

**DELETE** `/api/bots/remove`

Remove a specific bot by socket ID.

```bash
curl -X DELETE http://localhost:5000/api/bots/remove \
  -H "Content-Type: application/json" \
  -d '{
    "tableId": 1,
    "botSocketId": "bot_1234567890_1"
  }'
```

**Parameters:**
- `tableId` (required): Table ID number
- `botSocketId` (required): Bot's socket ID

---

### 4. Remove All Bots

**DELETE** `/api/bots/remove-all`

Remove all bots from a table.

```bash
curl -X DELETE http://localhost:5000/api/bots/remove-all \
  -H "Content-Type: application/json" \
  -d '{
    "tableId": 1
  }'
```

**Parameters:**
- `tableId` (required): Table ID number

---

### 5. List Bots at Table

**GET** `/api/bots/list/:tableId`

Get all bots currently at a table.

```bash
curl http://localhost:5000/api/bots/list/1
```

**Response:**
```json
{
  "success": true,
  "tableId": 1,
  "botCount": 3,
  "bots": [
    {
      "id": "bot_id_1",
      "socketId": "bot_1234567890_1",
      "name": "BotMaster1",
      "strategy": "tight",
      "bankroll": 9500
    },
    {
      "id": "bot_id_2",
      "socketId": "bot_1234567891_2",
      "name": "AceNinja2",
      "strategy": "aggressive",
      "bankroll": 10200
    }
  ]
}
```

---

### 6. Get Available Strategies

**GET** `/api/bots/strategies`

Get information about all bot strategies.

```bash
curl http://localhost:5000/api/bots/strategies
```

**Response:**
```json
{
  "success": true,
  "strategies": [
    {
      "name": "tight",
      "description": "Plays only strong hands, rarely bluffs",
      "characteristics": {
        "callThreshold": "60%",
        "raiseThreshold": "75%",
        "bluffFrequency": "5%"
      }
    },
    ...
  ]
}
```

---

## JavaScript Examples

### Using in Frontend

```javascript
// Add an aggressive bot
fetch('/api/bots/add', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tableId: 1,
    strategy: 'aggressive'
  })
})
.then(res => res.json())
.then(data => console.log('Bot added:', data.bot.name));

// Fill table with bots
fetch('/api/bots/fill', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tableId: 1,
    targetCount: 6
  })
})
.then(res => res.json())
.then(data => console.log('Table filled:', data.table.botCount, 'bots'));

// List all bots
fetch('/api/bots/list/1')
  .then(res => res.json())
  .then(data => {
    console.log('Bots at table:', data.bots.length);
    data.bots.forEach(bot => {
      console.log(`- ${bot.name} (${bot.strategy})`);
    });
  });

// Remove all bots
fetch('/api/bots/remove-all', {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ tableId: 1 })
})
.then(res => res.json())
.then(data => console.log(data.message));
```

---

### Using in Backend

```javascript
const { botManager } = require('./socket');

// Add a bot programmatically
const bot = botManager.addBotToTable(1, 'tight');
console.log(`Added ${bot.name} to table`);

// Fill table
botManager.fillTableWithBots(1, 5);

// Get bots at table
const bots = botManager.getBotsAtTable(1);
console.log(`${bots.length} bots at table`);

// Remove specific bot
botManager.removeBotFromTable('bot_socket_id', 1);

// Remove all bots
botManager.removeAllBotsFromTable(1);
```

---

## Testing with Postman

1. **Import Collection**: Create a new Postman collection
2. **Set Base URL**: `http://localhost:5000`
3. **Add Requests**: Create requests for each endpoint above
4. **Test Flow**:
   - Add 2-3 bots with different strategies
   - List bots to verify
   - Join as human player
   - Watch bots play automatically
   - Remove bots when done

---

## Integration Examples

### Auto-fill on Player Join

```javascript
socket.on(CS_JOIN_TABLE, (tableId) => {
  const table = tables[tableId];
  const player = players[socket.id];
  
  table.addPlayer(player);
  
  // Auto-fill if less than 3 players
  if (table.players.length < 3) {
    botManager.fillTableWithBots(tableId, 5);
  }
});
```

### Scheduled Bot Management

```javascript
// Add bots every 5 minutes if tables are empty
setInterval(() => {
  Object.keys(tables).forEach(tableId => {
    const table = tables[tableId];
    if (table.players.length === 0) {
      botManager.fillTableWithBots(tableId, 3);
    }
  });
}, 5 * 60 * 1000);
```

### Smart Bot Replacement

```javascript
// Replace leaving players with bots
socket.on(CS_LEAVE_TABLE, (tableId) => {
  // ... existing leave logic ...
  
  // If only 1 player left, add bots
  if (table.players.length === 1) {
    botManager.fillTableWithBots(tableId, 4);
  }
});
```

---

## Tips

- **Development**: Keep 2-3 bots per table for faster testing
- **Production**: Adjust bot count based on real player activity
- **Performance**: Monitor server resources with many bots
- **Balance**: Mix different strategies for realistic gameplay
- **Testing**: Use the test script: `node test-bot.js`

---

## Troubleshooting

**Bots not responding to API calls:**
- Ensure server is running
- Check BotManager is initialized (wait 1-2 seconds after start)
- Verify tableId exists

**Bots not playing:**
- Check console for errors
- Verify bots were seated (not just added to players list)
- Ensure hand has started

**Too slow/fast:**
- Adjust delays in `Bot.getRandomDelay()`
- Modify timeout values in `BotManager.checkAndActForBot()`

---

Need help? Check [BOT_USAGE_GUIDE.md](BOT_USAGE_GUIDE.md) for detailed documentation!
