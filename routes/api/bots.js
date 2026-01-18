const express = require('express');
const router = express.Router();

// This will be set after socket initialization
let botManager = null;
let tables = null;

// Initialize with socket module
const initBotRoutes = (socketModule) => {
  botManager = socketModule.botManager;
  tables = socketModule.tables;
};

// @route   POST /api/bots/add
// @desc    Add a bot to a table
// @access  Public (you may want to add auth middleware)
router.post('/add', (req, res) => {
  try {
    const { tableId, strategy } = req.body;
    
    if (!tableId) {
      return res.status(400).json({ error: 'Table ID is required' });
    }

    if (!botManager) {
      return res.status(500).json({ error: 'Bot manager not initialized' });
    }

    const validStrategies = ['tight', 'loose', 'aggressive', 'passive', 'balanced'];
    if (strategy && !validStrategies.includes(strategy)) {
      return res.status(400).json({ 
        error: `Invalid strategy. Must be one of: ${validStrategies.join(', ')}` 
      });
    }

    const bot = botManager.addBotToTable(tableId, strategy);
    
    if (!bot) {
      return res.status(400).json({ error: 'Could not add bot (table may be full)' });
    }

    res.json({
      success: true,
      message: `Bot ${bot.name} added to table ${tableId}`,
      bot: {
        id: bot.id,
        name: bot.name,
        strategy: bot.strategy,
        socketId: bot.socketId
      }
    });
  } catch (error) {
    console.error('Error adding bot:', error);
    res.status(500).json({ error: error.message });
  }
});

// @route   POST /api/bots/fill
// @desc    Fill a table with bots
// @access  Public
router.post('/fill', (req, res) => {
  try {
    const { tableId, targetCount = 5 } = req.body;
    
    if (!tableId) {
      return res.status(400).json({ error: 'Table ID is required' });
    }

    if (!botManager) {
      return res.status(500).json({ error: 'Bot manager not initialized' });
    }

    botManager.fillTableWithBots(tableId, targetCount);
    
    const table = tables[tableId];
    const bots = botManager.getBotsAtTable(tableId);

    res.json({
      success: true,
      message: `Table ${tableId} filled with bots`,
      table: {
        id: table.id,
        totalPlayers: table.players.length,
        botCount: bots.length,
        bots: bots.map(bot => ({
          name: bot.name,
          strategy: bot.strategy
        }))
      }
    });
  } catch (error) {
    console.error('Error filling table:', error);
    res.status(500).json({ error: error.message });
  }
});

// @route   DELETE /api/bots/remove
// @desc    Remove a bot from a table
// @access  Public
router.post('/remove', (req, res) => {
  console.log("Removing bot from table...");
  try {
    const { tableId, botName, botSocketId } = req.body;
    
    if (!tableId) {
      return res.status(400).json({ error: 'Table ID is required' });
    }

    if (!botName && !botSocketId) {
      return res.status(400).json({ error: 'Either bot name or bot socket ID is required' });
    }

    if (!botManager) {
      return res.status(500).json({ error: 'Bot manager not initialized' });
    }

    let socketId = botSocketId;
    
    // If botName provided, find the bot's socket ID
    if (botName && !botSocketId) {
      const bots = botManager.getBotsAtTable(tableId);
      const bot = bots.find(b => b.name === botName);
      
      if (!bot) {
        return res.status(404).json({ error: `Bot "${botName}" not found at table ${tableId}` });
      }
      
      socketId = bot.socketId;
    }

    botManager.removeBotFromTable(socketId, tableId);

    res.json({
      success: true,
      message: `Bot ${botName || socketId} removed from table ${tableId}`
    });
  } catch (error) {
    console.error('Error removing bot:', error);
    res.status(500).json({ error: error.message });
  }
});

// @route   DELETE /api/bots/remove-all
// @desc    Remove all bots from a table
// @access  Public
router.delete('/remove-all', (req, res) => {
  try {
    const { tableId } = req.body;
    
    if (!tableId) {
      return res.status(400).json({ error: 'Table ID is required' });
    }

    if (!botManager) {
      return res.status(500).json({ error: 'Bot manager not initialized' });
    }

    botManager.removeAllBotsFromTable(tableId);

    res.json({
      success: true,
      message: `All bots removed from table ${tableId}`
    });
  } catch (error) {
    console.error('Error removing bots:', error);
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/bots/list/:tableId
// @desc    Get all bots at a table
// @access  Public
router.get('/list/:tableId', (req, res) => {
  try {
    const { tableId } = req.params;
    
    if (!botManager) {
      return res.status(500).json({ error: 'Bot manager not initialized' });
    }

    const bots = botManager.getBotsAtTable(parseInt(tableId));

    res.json({
      success: true,
      tableId: parseInt(tableId),
      botCount: bots.length,
      bots: bots.map(bot => ({
        id: bot.id,
        socketId: bot.socketId,
        name: bot.name,
        strategy: bot.strategy,
        bankroll: bot.bankroll
      }))
    });
  } catch (error) {
    console.error('Error listing bots:', error);
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/bots/strategies
// @desc    Get available bot strategies
// @access  Public
router.get('/strategies', (req, res) => {
  res.json({
    success: true,
    strategies: [
      {
        name: 'tight',
        description: 'Plays only strong hands, rarely bluffs',
        characteristics: {
          callThreshold: '60%',
          raiseThreshold: '75%',
          bluffFrequency: '5%'
        }
      },
      {
        name: 'loose',
        description: 'Plays many hands, more aggressive',
        characteristics: {
          callThreshold: '35%',
          raiseThreshold: '55%',
          bluffFrequency: '15%'
        }
      },
      {
        name: 'aggressive',
        description: 'Raises and bets frequently',
        characteristics: {
          callThreshold: '45%',
          raiseThreshold: '60%',
          bluffFrequency: '25%'
        }
      },
      {
        name: 'passive',
        description: 'Calls more than raises, conservative',
        characteristics: {
          callThreshold: '50%',
          raiseThreshold: '80%',
          bluffFrequency: '2%'
        }
      },
      {
        name: 'balanced',
        description: 'Well-rounded strategy, default',
        characteristics: {
          callThreshold: '45%',
          raiseThreshold: '65%',
          bluffFrequency: '10%'
        }
      }
    ]
  });
});

module.exports = { router, initBotRoutes };
