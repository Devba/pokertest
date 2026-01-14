# 🤖 Poker Bot System - Usage Guide

## Overview

Your poker application now includes a fully-featured bot system that can play poker autonomously. Bots have different strategies and make intelligent decisions based on hand strength, pot odds, position, and more.

## Bot Features

### AI Strategies
Bots can have different playing styles:
- **Tight**: Plays only strong hands, rarely bluffs (60% call threshold, 75% raise threshold)
- **Loose**: Plays many hands, more aggressive (35% call threshold, 55% raise threshold)
- **Aggressive**: Raises and bets frequently (45% call threshold, 60% raise threshold, 25% bluff rate)
- **Passive**: Calls more than raises (50% call threshold, 80% raise threshold, 2% bluff rate)
- **Balanced**: Well-rounded strategy (45% call threshold, 65% raise threshold, 10% bluff rate)

### Decision Making
Bots analyze:
- **Hand strength**: Evaluates pocket cards considering pairs, suited cards, high cards, connectors
- **Pot odds**: Calculates risk vs reward
- **Position**: Plays tighter from early position, looser from late position
- **Stack size**: Adjusts strategy based on chip stack
- **Board texture**: Considers community cards
- **Number of opponents**: Adjusts for multi-way pots

## How to Use

### Basic Usage in Socket Handler

The bot system is already integrated into your `socket/index.js` file. Bots will automatically:
- Make decisions when it's their turn
- Execute poker actions (fold, check, call, raise)
- Continue playing until they leave the table

### Adding Bots Programmatically

#### 1. Access the BotManager

In your `server.js` or wherever you have access to the socket module:

```javascript
const socketModule = require('./socket');

// After sockets are initialized
const { botManager, tables } = socketModule;
```

#### 2. Add a Single Bot to a Table

```javascript
// Add a bot with random strategy
botManager.addBotToTable(1); // tableId = 1

// Add a bot with specific strategy
botManager.addBotToTable(1, 'aggressive');
botManager.addBotToTable(1, 'tight');
botManager.addBotToTable(1, 'loose');
```

#### 3. Fill Table with Bots

```javascript
// Fill table to have 5 total players
botManager.fillTableWithBots(1, 5);

// This will add bots until the table has 5 players
// (accounting for existing human and bot players)
```

#### 4. Remove Bots

```javascript
// Remove a specific bot
botManager.removeBotFromTable('bot_socket_id', 1);

// Remove all bots from a table
botManager.removeAllBotsFromTable(1);
```

### Example: Auto-Fill Tables

Add this to your `socket/index.js` init function:

```javascript
socket.on(CS_JOIN_TABLE, (tableId) => {
  const table = tables[tableId];
  const player = players[socket.id];
  
  table.addPlayer(player);
  socket.emit(SC_TABLE_JOINED, { tables: getCurrentTables(), tableId });
  socket.broadcast.emit(SC_TABLES_UPDATED, getCurrentTables());
  sitDown(tableId, table.players.length, table.limit);

  // Auto-fill with bots if table has less than 4 players
  if (table.players.length < 4) {
    botManager.fillTableWithBots(tableId, 5);
    broadcastToTable(table, `Bots added to fill the table`);
  }

  if (table.players.length > 0 && player) {
    let message = `${player.name} joined the table.`;
    broadcastToTable(table, message);
  }
});
```

### Example: Add Bots on Server Start

In your `server.js`:

```javascript
const io = require('socket.io')(server);
const { init, botManager, tables } = require('./socket');

io.on('connection', (socket) => {
  init(socket, io);
});

// After server starts, add some bots to keep tables active
setTimeout(() => {
  if (botManager) {
    console.log('Adding bots to keep tables active...');
    botManager.fillTableWithBots(1, 3); // Add 3 bots to table 1
  }
}, 2000);
```

### Testing Bot Strategies

```javascript
// Create a table with different bot personalities
botManager.addBotToTable(1, 'tight');      // Conservative player
botManager.addBotToTable(1, 'aggressive'); // Aggressive raiser
botManager.addBotToTable(1, 'loose');      // Plays many hands
botManager.addBotToTable(1, 'passive');    // Mostly calls
botManager.addBotToTable(1, 'balanced');   // Well-rounded
```

## API Reference

### BotManager Methods

#### `addBotToTable(tableId, strategy)`
Adds a single bot to the specified table.
- **tableId**: Number - The table ID
- **strategy**: String (optional) - 'tight', 'loose', 'aggressive', 'passive', or 'balanced'
- **Returns**: Bot instance or null if table is full

#### `removeBotFromTable(botSocketId, tableId)`
Removes a specific bot from a table.
- **botSocketId**: String - The bot's socket ID
- **tableId**: Number - The table ID

#### `removeAllBotsFromTable(tableId)`
Removes all bots from the specified table.
- **tableId**: Number - The table ID

#### `fillTableWithBots(tableId, targetPlayerCount)`
Fills table with bots up to the target number of players.
- **tableId**: Number - The table ID
- **targetPlayerCount**: Number - Desired total number of players
- **Default**: 5 players

#### `getBotsAtTable(tableId)`
Gets all bots currently at a table.
- **tableId**: Number - The table ID
- **Returns**: Array of bot players

#### `checkAndActForBot(table, tableId)`
Checks if it's a bot's turn and makes them act (called automatically).
- **table**: Table instance
- **tableId**: Number - The table ID

### Bot Class Methods

#### `Bot.generateBotName(index)`
Static method to generate a random bot name.
- **index**: Number - Bot number
- **Returns**: String - Generated name like "BotMaster5" or "AceNinja2"

#### `Bot.getRandomStrategy()`
Static method to get a random strategy.
- **Returns**: String - Random strategy name

## Bot Behavior

### Decision Process

1. **Gather Information**: Collects game state (hand, pot, board, position)
2. **Calculate Strength**: Evaluates hand strength (0-100 scale)
3. **Apply Strategy**: Adjusts decision based on bot personality
4. **Consider Position**: Modifies play based on seating position
5. **Make Decision**: Chooses action (fold, check, call, raise)
6. **Execute**: Performs the action after a realistic delay (1.2-3 seconds)

### Hand Strength Calculation

- **Pocket Pairs**: 50-100 (AA=92, KK=89, 22=56)
- **High Cards**: Based on card ranks and kickers
- **Suited Bonus**: +8 points
- **Connected Cards**: +5 points
- **Ace + Face Card**: +10 points
- **Broadway Cards** (10-A): +8 points

### Raise Sizing

- **Very Strong Hand** (85+): 80% of pot
- **Strong Hand** (70-84): 60% of pot
- **Medium Hand** (50-69): 40% of pot

Modified by strategy aggressiveness multiplier.

## Debugging

Enable detailed logging by adding console.log statements in:
- `Bot.makeDecision()` - See bot thought process
- `BotManager.executeBotAction()` - See actions taken
- `Bot.calculateHandStrength()` - See hand evaluations

## Tips for Integration

1. **Start Small**: Begin with 1-2 bots per table
2. **Mix Strategies**: Use different bot personalities for variety
3. **Monitor Performance**: Watch for any delays or issues
4. **Adjust Timing**: Modify `bot.getRandomDelay()` for faster/slower play
5. **Test Edge Cases**: Ensure bots handle all-ins, side pots correctly

## Troubleshooting

### Bots Not Acting
- Check that `botManager` is initialized
- Verify `checkAndActForBot` is called after each turn
- Ensure bot has a valid hand and seat

### Bots Making Bad Decisions
- Adjust strategy thresholds in `Bot.getStrategyModifiers()`
- Modify hand strength calculation in `Bot.calculateHandStrength()`
- Fine-tune raise sizing in `Bot.calculateRaiseAmount()`

### Performance Issues
- Reduce number of bots per table
- Increase action delays
- Optimize hand evaluation logic

## Future Enhancements

Potential improvements:
- Machine learning integration
- Advanced hand reading (opponent modeling)
- More sophisticated bluffing logic
- Adaptive strategies based on opponent play
- Multi-street planning
- GTO (Game Theory Optimal) strategies

---

**Note**: The bot system is fully integrated and ready to use. Bots will automatically play when it's their turn without any additional code required!
