# 🤖 Bot System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         POKER BOT SYSTEM                            │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│   HTTP API Layer     │  ← External control via REST
│  /api/bots/*         │
└──────────┬───────────┘
           │
           ↓
┌──────────────────────┐
│   BotManager         │  ← Central bot orchestration
│  - Create bots       │
│  - Manage lifecycle  │
│  - Trigger actions   │
└──────────┬───────────┘
           │
           ↓
┌──────────────────────┐
│   Bot Players        │  ← Individual AI bots
│  - AI decision logic │
│  - Strategy system   │
│  - Hand evaluation   │
└──────────┬───────────┘
           │
           ↓
┌──────────────────────┐
│   Table/Seat/Game    │  ← Existing game logic
│  - handleFold()      │
│  - handleCall()      │
│  - handleRaise()     │
└──────────┬───────────┘
           │
           ↓
┌──────────────────────┐
│   Socket.IO          │  ← Broadcast updates
│  - Real players      │
│  - Table state       │
└──────────────────────┘
```

## 🔄 Bot Action Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Game Turn Changes                                        │
│    table.changeTurn(seatId)                                 │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Check If Bot's Turn                                      │
│    botManager.checkAndActForBot(table, tableId)             │
│    → Find current seat                                      │
│    → Check if player.isBot = true                           │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓ (if bot)
┌─────────────────────────────────────────────────────────────┐
│ 3. Realistic Delay                                          │
│    setTimeout(1200-3000ms)  ← Simulate thinking             │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Gather Game State                                        │
│    - Hand cards                                             │
│    - Pot size                                               │
│    - Call amount                                            │
│    - Stack size                                             │
│    - Board cards                                            │
│    - Position                                               │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Bot Makes Decision                                       │
│    bot.makeDecision(gameState)                              │
│    → Calculate hand strength (0-100)                        │
│    → Apply strategy modifiers                               │
│    → Consider pot odds                                      │
│    → Adjust for position                                    │
│    → Choose: FOLD / CHECK / CALL / RAISE                    │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. Execute Action                                           │
│    table.handleFold(botSocketId)                            │
│    table.handleCall(botSocketId)                            │
│    table.handleRaise(botSocketId, amount)                   │
│    table.handleCheck(botSocketId)                           │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. Broadcast Update                                         │
│    broadcastToTable(table, message)                         │
│    → Send to all REAL players only                          │
│    → Hide opponent cards                                    │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. Change Turn (after delay)                                │
│    setTimeout(800ms)                                        │
│    table.changeTurn(seatId)                                 │
│    → Loop back to step 2 for next player                    │
└─────────────────────────────────────────────────────────────┘
```

## 🧠 Bot Decision Logic

```
┌─────────────────────────────────────────────────────────────┐
│ INPUT: Game State                                           │
│  - hand: [Card, Card]                                       │
│  - pot: 150                                                 │
│  - callAmount: 50                                           │
│  - stack: 1000                                              │
│  - position: "button"                                       │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Calculate Hand Strength                             │
│                                                             │
│  Pocket Pairs:    50 + (rank × 3)        AA=92, 22=56      │
│  High Cards:      (high × 3) + (low × 2)                   │
│  Suited Bonus:    +8 points                                │
│  Connected:       +5 points                                │
│  Ace + Face:      +10 points                               │
│                                                             │
│  Example: AK suited → 95 strength                          │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Apply Strategy Modifier                             │
│                                                             │
│  TIGHT:       strength × 0.8  (plays fewer hands)          │
│  BALANCED:    strength × 1.0  (normal)                     │
│  AGGRESSIVE:  strength × 1.3  (plays more hands)           │
│                                                             │
│  Example: 95 × 1.3 = 123.5 (capped at 100)                │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Position Adjustment                                 │
│                                                             │
│  Early:   strength × 0.9   (tighter)                       │
│  Middle:  strength × 1.0   (normal)                        │
│  Late:    strength × 1.1   (looser)                        │
│  Button:  strength × 1.1   (best position)                 │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Add Randomness                                      │
│                                                             │
│  finalStrength = strength + random(0-10)                   │
│  → Makes bots unpredictable                                │
│  → Same hand = different decisions                         │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 5: Decide Action                                       │
│                                                             │
│  if strength ≥ raiseThreshold (65%)                        │
│    → RAISE (calculate size based on strength & pot)        │
│                                                             │
│  else if strength ≥ callThreshold (45%)                    │
│    → CALL (if facing bet) or CHECK (if no bet)            │
│                                                             │
│  else if canCheck                                          │
│    → CHECK                                                 │
│                                                             │
│  else if random < bluffFrequency (10%)                     │
│    → RAISE (bluff!)                                        │
│                                                             │
│  else                                                       │
│    → FOLD                                                  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ OUTPUT: Action + Amount                                     │
│  { action: 'CS_RAISE', amount: 225 }                       │
└─────────────────────────────────────────────────────────────┘
```

## 🎭 Strategy Comparison

```
┌──────────────────────────────────────────────────────────────────┐
│ HAND: Q♥ J♥  (Strength: 84)  POT: $100  CALL: $50              │
└──────────────────────────────────────────────────────────────────┘

        TIGHT             BALANCED          AGGRESSIVE
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Strength: 67    │  │ Strength: 84    │  │ Strength: 109   │
│ (84 × 0.8)      │  │ (84 × 1.0)      │  │ (84 × 1.3)      │
│                 │  │                 │  │                 │
│ callThreshold:  │  │ callThreshold:  │  │ callThreshold:  │
│ 60%             │  │ 45%             │  │ 45%             │
│                 │  │                 │  │                 │
│ 67 ≥ 60 ✓       │  │ 84 ≥ 45 ✓       │  │ 109 ≥ 60 ✓      │
│                 │  │                 │  │                 │
│ DECISION:       │  │ DECISION:       │  │ DECISION:       │
│ CALL $50        │  │ RAISE $180      │  │ RAISE $260      │
└─────────────────┘  └─────────────────┘  └─────────────────┘

        PASSIVE           LOOSE
┌─────────────────┐  ┌─────────────────┐
│ Strength: 59    │  │ Strength: 101   │
│ (84 × 0.7)      │  │ (84 × 1.2)      │
│                 │  │                 │
│ callThreshold:  │  │ callThreshold:  │
│ 50%             │  │ 35%             │
│                 │  │                 │
│ 59 ≥ 50 ✓       │  │ 101 ≥ 55 ✓      │
│                 │  │                 │
│ DECISION:       │  │ DECISION:       │
│ CALL $50        │  │ RAISE $220      │
│ (rarely raises) │  │ (often raises)  │
└─────────────────┘  └─────────────────┘
```

## 📊 Hand Strength Examples

```
┌──────────────────────────────────────────────────────────────┐
│                    HAND STRENGTH SCALE                        │
├──────────────────────────────────────────────────────────────┤
│ 100: A♥A♠   Pocket Aces         │ █████████████████████  │
│  95: A♥K♥   AK suited            │ ████████████████████   │
│  91: A♥K♠   AK offsuit           │ ███████████████████    │
│  89: K♥K♠   Pocket Kings         │ ███████████████████    │
│  84: Q♥J♥   QJ suited            │ ██████████████████     │
│  79: J♥10♥  JT suited            │ █████████████████      │
│  77: 9♥9♠   Pocket Nines         │ ████████████████       │
│  65: K♥Q♠   KQ offsuit           │ ██████████████         │
│  56: 5♥5♠   Pocket Fives         │ ████████████           │
│  45: J♥9♥   J9 suited            │ █████████              │
│  38: 10♥8♠  T8 offsuit           │ ████████               │
│  25: 7♥2♠   7-2 offsuit (worst)  │ █████                  │
└──────────────────────────────────────────────────────────────┘
```

## 🎯 Integration Points

```
┌────────────────────────────────────────────────────────────┐
│ YOUR EXISTING CODE          │  BOT SYSTEM INTEGRATION      │
├────────────────────────────────────────────────────────────┤
│                             │                              │
│ socket/index.js             │  + BotManager import         │
│   - init()                  │  + botManager instance       │
│   - changeTurnAndBroadcast()│  + checkAndActForBot()      │
│   - initNewHand()           │  + checkAndActForBot()      │
│                             │                              │
│ pokergame/Table.js          │  ✓ No changes needed         │
│   - handleFold()            │  ✓ Works with bots           │
│   - handleCall()            │  ✓ Works with bots           │
│   - handleRaise()           │  ✓ Works with bots           │
│                             │                              │
│ pokergame/Player.js         │  + Bot extends Player        │
│   - constructor()           │  + isBot property            │
│   - name, id, bankroll      │  ✓ Inherited                 │
│                             │                              │
│ routes/index.js             │  + Bot API routes            │
│   - /api/auth               │  ✓ Existing                  │
│   - /api/users              │  ✓ Existing                  │
│   - /api/bots               │  + New bot endpoints         │
│                             │                              │
│ server.js                   │  + Initialize BotManager     │
│   - io.on('connect')        │  + Auto-fill example         │
│                             │                              │
└────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start Commands

```bash
# Test bots
node test-bot.js

# Add bot via API
curl -X POST http://localhost:5000/api/bots/add \
  -H "Content-Type: application/json" \
  -d '{"tableId": 1, "strategy": "aggressive"}'

# Fill table with bots
curl -X POST http://localhost:5000/api/bots/fill \
  -H "Content-Type: application/json" \
  -d '{"tableId": 1, "targetCount": 5}'

# List bots
curl http://localhost:5000/api/bots/list/1

# Remove all bots
curl -X DELETE http://localhost:5000/api/bots/remove-all \
  -H "Content-Type: application/json" \
  -d '{"tableId": 1}'
```

---

**🎉 Your poker bots are ready to play!**

See detailed docs:
- [BOT_USAGE_GUIDE.md](BOT_USAGE_GUIDE.md) - Complete guide
- [BOT_API_REFERENCE.md](BOT_API_REFERENCE.md) - API docs
- [POKER_BOT_SUMMARY.md](POKER_BOT_SUMMARY.md) - Summary
