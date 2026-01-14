# 🤖 POKER BOT SYSTEM - README

## 🎯 Quick Overview

Your poker application now includes **intelligent AI bot players** that can play poker autonomously! Bots have different personalities (tight, loose, aggressive, passive, balanced) and make smart decisions based on hand strength, position, pot odds, and more.

## ⚡ Quick Start (3 Steps)

### 1. Test the Bots
```bash
node test-bot.js
```
This verifies everything works and shows you bot capabilities.

### 2. Start Your Server
```bash
npm start
```

### 3. Add Bots
**Option A: Via HTTP API**
```bash
curl -X POST http://localhost:5000/api/bots/fill \
  -H "Content-Type: application/json" \
  -d '{"tableId": 1, "targetCount": 5}'
```

**Option B: In Code** (add to `server.js`):
```javascript
setTimeout(() => {
    const { botManager } = require('./socket');
    botManager.fillTableWithBots(1, 5);
}, 2000);
```

**That's it!** Bots will now play automatically at the table.

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| **[POKER_BOT_SUMMARY.md](POKER_BOT_SUMMARY.md)** | Complete overview and feature list |
| **[BOT_USAGE_GUIDE.md](BOT_USAGE_GUIDE.md)** | Detailed usage instructions |
| **[BOT_API_REFERENCE.md](BOT_API_REFERENCE.md)** | HTTP API documentation with examples |
| **[BOT_ARCHITECTURE.md](BOT_ARCHITECTURE.md)** | System architecture and diagrams |

---

## 🎮 What Bots Can Do

✅ **Evaluate hand strength** - Understands poker hand rankings  
✅ **Calculate pot odds** - Makes mathematically sound decisions  
✅ **Adjust to position** - Plays tighter from early position  
✅ **Multiple strategies** - 5 different playing styles  
✅ **Realistic behavior** - Random delays and unpredictable actions  
✅ **Smart betting** - Sizes bets based on hand strength  
✅ **Bluff occasionally** - Can make strategic bluffs  

---

## 🎭 Bot Strategies

| Strategy | Description | When to Use |
|----------|-------------|-------------|
| **Tight** | Conservative, strong hands only | Beginners, low-risk tables |
| **Loose** | Plays many hands aggressively | Action tables, loose games |
| **Aggressive** | Frequent raises and bets | Pressure opponents, build pots |
| **Passive** | Calls more, raises less | Multi-way pots, safe play |
| **Balanced** | Well-rounded default | General purpose, realistic |

---

## 📡 API Endpoints

Base URL: `http://localhost:5000/api/bots/`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/add` | Add single bot |
| POST | `/fill` | Fill table with bots |
| DELETE | `/remove` | Remove specific bot |
| DELETE | `/remove-all` | Remove all bots |
| GET | `/list/:tableId` | List bots at table |
| GET | `/strategies` | Get strategy info |

**Examples:**
```bash
# Add aggressive bot
curl -X POST http://localhost:5000/api/bots/add \
  -H "Content-Type: application/json" \
  -d '{"tableId": 1, "strategy": "aggressive"}'

# List all bots at table
curl http://localhost:5000/api/bots/list/1
```

---

## 🔧 Configuration

### Auto-Fill on Server Start

Edit `server.js` and uncomment:
```javascript
setTimeout(() => {
    const { botManager } = gameSocket;
    if (botManager) {
        botManager.fillTableWithBots(1, 4); // Add 4 bots
    }
}, 2000);
```

### Auto-Fill When Player Joins

Edit `socket/index.js` in the `CS_JOIN_TABLE` handler:
```javascript
if (table.players.length < 4) {
  botManager.fillTableWithBots(tableId, 5);
  broadcastToTable(table, 'Bots added to keep game active');
}
```

---

## 📁 Files Structure

```
pokergame/
├── Bot.js              ← Bot AI implementation (NEW)
├── BotManager.js       ← Bot lifecycle management (NEW)
├── Player.js           ← Base player class (existing)
├── Table.js            ← Game logic (existing)
├── Seat.js             ← Seat management (existing)
└── Deck.js             ← Card deck (existing)

routes/api/
├── bots.js             ← Bot API endpoints (NEW)
├── auth.js             ← Auth routes (existing)
└── users.js            ← User routes (existing)

socket/
└── index.js            ← Socket handlers (MODIFIED)

Documentation:
├── BOT_README.md              ← This file (start here!)
├── POKER_BOT_SUMMARY.md       ← Complete summary
├── BOT_USAGE_GUIDE.md         ← Usage guide
├── BOT_API_REFERENCE.md       ← API docs
├── BOT_ARCHITECTURE.md        ← Architecture diagrams
└── test-bot.js                ← Test script
```

---

## 🧪 Testing

### Run Test Script
```bash
node test-bot.js
```

**Output shows:**
- Bot creation with different strategies ✓
- Hand strength calculations ✓
- Decision making in various scenarios ✓
- Bot name generation ✓
- Strategy characteristics ✓

### Manual Testing
1. Start server: `npm start`
2. Add bots: `curl -X POST http://localhost:5000/api/bots/fill -H "Content-Type: application/json" -d '{"tableId": 1, "targetCount": 5}'`
3. Join as player and watch bots play
4. Remove bots when done: `curl -X DELETE http://localhost:5000/api/bots/remove-all -H "Content-Type: application/json" -d '{"tableId": 1}'`

---

## 🐛 Troubleshooting

### Bots not responding?
- **Wait 1-2 seconds** after server start for initialization
- Check logs for "🤖 BotManager initialized"
- Verify bots are seated: `curl http://localhost:5000/api/bots/list/1`

### API returning errors?
- Ensure server is running
- Check Content-Type header is set
- Verify tableId is valid (1, 2, etc.)

### Bots making odd decisions?
- This is normal! Bots have randomness for unpredictability
- Adjust thresholds in `Bot.getStrategyModifiers()` if needed

### Performance issues?
- Reduce number of bots per table
- Increase action delays in `Bot.getRandomDelay()`

---

## 💡 Usage Examples

### Development Testing
```javascript
// Quick setup for testing
botManager.addBotToTable(1, 'tight');
botManager.addBotToTable(1, 'aggressive');
botManager.addBotToTable(1, 'loose');
```

### Production Setup
```javascript
// Auto-maintain 3-5 players per table
socket.on(CS_JOIN_TABLE, (tableId) => {
  // ... existing code ...
  
  if (table.players.length < 3) {
    botManager.fillTableWithBots(tableId, 5);
  }
});

socket.on(CS_LEAVE_TABLE, (tableId) => {
  // ... existing code ...
  
  if (table.players.length === 1) {
    botManager.fillTableWithBots(tableId, 4);
  }
});
```

### Tournament Mode
```javascript
// Create specific bot mix for tournament
const botStrategies = ['tight', 'tight', 'aggressive', 'loose', 'balanced'];
botStrategies.forEach(strategy => {
  botManager.addBotToTable(1, strategy);
});
```

---

## 🎯 Key Features

### Intelligent Decision Making
- Evaluates 100+ hand combinations
- Considers position (early/middle/late/button)
- Calculates pot odds
- Adjusts for stack size
- Reads board texture

### Realistic Behavior
- Random thinking delays (1.2-3 seconds)
- Unpredictable actions (randomness factor)
- Natural bet sizing (40-80% pot)
- Strategic bluffing
- Position-aware play

### Easy Management
- REST API for remote control
- Programmatic interface
- Auto-fill capabilities
- Individual or bulk operations
- Live monitoring

---

## 📊 Bot Statistics

**Hand Strength Examples:**
- Pocket Aces (AA): 100
- Pocket Kings (KK): 99
- AK suited: 95
- AK offsuit: 91
- Pocket Nines (99): 77
- 7-2 offsuit: 25 (worst)

**Strategy Thresholds:**
```
           Call   Raise  Bluff
Tight:     60%    75%    5%
Balanced:  45%    65%    10%
Aggressive:45%    60%    25%
```

---

## 🚀 Next Steps

1. ✅ **Test**: Run `node test-bot.js`
2. ✅ **Read**: Check [POKER_BOT_SUMMARY.md](POKER_BOT_SUMMARY.md)
3. ✅ **Try API**: Use curl or Postman to add bots
4. ✅ **Watch**: Start server and see bots play
5. ✅ **Customize**: Adjust strategies or delays
6. ✅ **Deploy**: Enable auto-fill for production

---

## 📞 Need Help?

| Issue | Solution |
|-------|----------|
| Bots not playing | Check [Troubleshooting](#-troubleshooting) |
| API questions | See [BOT_API_REFERENCE.md](BOT_API_REFERENCE.md) |
| Strategy tuning | See [BOT_USAGE_GUIDE.md](BOT_USAGE_GUIDE.md) |
| Architecture | See [BOT_ARCHITECTURE.md](BOT_ARCHITECTURE.md) |

---

## ✨ Features Summary

| Feature | Status | Description |
|---------|--------|-------------|
| 5 Bot Strategies | ✅ | Tight, Loose, Aggressive, Passive, Balanced |
| Hand Evaluation | ✅ | 0-100 strength scale |
| Pot Odds | ✅ | Mathematical calculations |
| Position Play | ✅ | Adjusts for seat position |
| Bluffing | ✅ | Strategic bluffs |
| REST API | ✅ | HTTP endpoints |
| Auto-fill | ✅ | Automatic bot addition |
| Smart Betting | ✅ | Dynamic bet sizing |
| Realistic Delays | ✅ | 1.2-3 second thinking |
| Testing | ✅ | Complete test suite |
| Documentation | ✅ | 4 comprehensive guides |

---

## 🎉 You're Ready!

Your poker bot system is **fully implemented and tested**. Start playing against AI opponents now!

```bash
# Quick start command:
npm start && curl -X POST http://localhost:5000/api/bots/fill \
  -H "Content-Type: application/json" \
  -d '{"tableId": 1, "targetCount": 5}'
```

**Have fun playing poker with your new AI opponents!** 🎰🤖♠️♥️♣️♦️

---

*For detailed documentation, see the other .md files in this directory.*
