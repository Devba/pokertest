/**
 * Test script for Bot functionality
 * Run with: node test-bot.js
 */

const Bot = require('./pokergame/Bot');
const Table = require('./pokergame/Table');

console.log('🤖 Testing Poker Bot System\n');

// Test 1: Create bots with different strategies
console.log('=== Test 1: Creating Bots ===');
const strategies = ['tight', 'loose', 'aggressive', 'passive', 'balanced'];

strategies.forEach((strategy, index) => {
  const bot = new Bot(
    `test_socket_${index}`,
    `test_id_${index}`,
    Bot.generateBotName(index + 1),
    10000,
    strategy
  );
  console.log(`✓ Created ${bot.name} with ${strategy} strategy`);
});

// Test 2: Hand Strength Calculation
console.log('\n=== Test 2: Hand Strength Evaluation ===');
const testBot = new Bot('test_socket', 'test_id', 'TestBot', 10000, 'balanced');

const testHands = [
  { hand: [{ rank: 'A', suit: 'hearts' }, { rank: 'A', suit: 'diamonds' }], desc: 'Pocket Aces' },
  { hand: [{ rank: 'K', suit: 'hearts' }, { rank: 'K', suit: 'diamonds' }], desc: 'Pocket Kings' },
  { hand: [{ rank: 'A', suit: 'hearts' }, { rank: 'K', suit: 'hearts' }], desc: 'AK suited' },
  { hand: [{ rank: 'A', suit: 'hearts' }, { rank: 'K', suit: 'diamonds' }], desc: 'AK offsuit' },
  { hand: [{ rank: 'Q', suit: 'hearts' }, { rank: 'J', suit: 'hearts' }], desc: 'QJ suited' },
  { hand: [{ rank: '7', suit: 'hearts' }, { rank: '2', suit: 'diamonds' }], desc: '7-2 offsuit' },
  { hand: [{ rank: '9', suit: 'hearts' }, { rank: '9', suit: 'diamonds' }], desc: 'Pocket Nines' },
  { hand: [{ rank: 'J', suit: 'hearts' }, { rank: '10', suit: 'hearts' }], desc: 'JT suited' },
];

testHands.forEach(({ hand, desc }) => {
  const strength = testBot.calculateHandStrength(hand);
  console.log(`${desc.padEnd(20)} → Strength: ${strength.toFixed(1)}`);
});

// Test 3: Decision Making
console.log('\n=== Test 3: Bot Decision Making ===');

const decisionScenarios = [
  {
    name: 'Strong hand, no bet',
    gameState: {
      hand: [{ rank: 'A', suit: 'hearts' }, { rank: 'A', suit: 'diamonds' }],
      pot: 100,
      callAmount: 0,
      minRaise: 10,
      stack: 1000,
      board: [],
      position: 'button',
      numPlayers: 3
    }
  },
  {
    name: 'Medium hand, facing bet',
    gameState: {
      hand: [{ rank: 'Q', suit: 'hearts' }, { rank: 'J', suit: 'hearts' }],
      pot: 150,
      callAmount: 50,
      minRaise: 100,
      stack: 800,
      board: [],
      position: 'middle',
      numPlayers: 4
    }
  },
  {
    name: 'Weak hand, facing big bet',
    gameState: {
      hand: [{ rank: '7', suit: 'hearts' }, { rank: '2', suit: 'diamonds' }],
      pot: 200,
      callAmount: 150,
      minRaise: 300,
      stack: 500,
      board: [],
      position: 'early',
      numPlayers: 5
    }
  },
  {
    name: 'Pocket Kings after flop',
    gameState: {
      hand: [{ rank: 'K', suit: 'hearts' }, { rank: 'K', suit: 'diamonds' }],
      pot: 300,
      callAmount: 100,
      minRaise: 200,
      stack: 1500,
      board: [
        { rank: '9', suit: 'hearts' },
        { rank: '5', suit: 'diamonds' },
        { rank: '2', suit: 'clubs' }
      ],
      position: 'button',
      numPlayers: 2
    }
  }
];

decisionScenarios.forEach(({ name, gameState }) => {
  console.log(`\nScenario: ${name}`);
  
  // Test with different strategies
  ['tight', 'loose', 'aggressive'].forEach(strategy => {
    const strategyBot = new Bot(`test_${strategy}`, `id_${strategy}`, strategy, 10000, strategy);
    const decision = strategyBot.makeDecision(gameState);
    const actionName = decision.action.replace('CS_', '');
    const amountStr = decision.amount ? ` $${decision.amount.toFixed(2)}` : '';
    console.log(`  ${strategy.padEnd(10)} → ${actionName}${amountStr}`);
  });
});

// Test 4: Bot Name Generation
console.log('\n=== Test 4: Bot Name Generation ===');
console.log('Sample bot names:');
for (let i = 1; i <= 10; i++) {
  console.log(`  ${i}. ${Bot.generateBotName(i)}`);
}

// Test 5: Strategy Modifiers
console.log('\n=== Test 5: Strategy Characteristics ===');
strategies.forEach(strategy => {
  const bot = new Bot('test', 'test', 'Test', 10000, strategy);
  const mods = bot.getStrategyModifiers();
  console.log(`\n${strategy.toUpperCase()}:`);
  console.log(`  Aggressiveness: ${mods.aggressiveness}x`);
  console.log(`  Call Threshold: ${mods.callThreshold}%`);
  console.log(`  Raise Threshold: ${mods.raiseThreshold}%`);
  console.log(`  Bluff Frequency: ${(mods.bluffFrequency * 100).toFixed(1)}%`);
});

console.log('\n✅ All tests completed!\n');
console.log('To use bots in your game:');
console.log('  1. Bots are already integrated in socket/index.js');
console.log('  2. Use botManager.addBotToTable(tableId, strategy)');
console.log('  3. Or use botManager.fillTableWithBots(tableId, count)');
console.log('\nSee BOT_USAGE_GUIDE.md for more details.\n');
