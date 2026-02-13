#!/usr/bin/env node

/**
 * Launch tournament from JSON config:
 * - 60 bots
 * - 5-minute registration period
 *
 * Usage:
 *   node launch-tournament-60-bots-5min.js
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const BASE_URL = 'http://localhost:7777';
const CONFIG_PATH = path.join(__dirname, 'tournament-60-bots-5min.json');
const BOT_STRATEGIES = ['tight', 'loose', 'aggressive', 'passive', 'balanced'];

function loadConfig() {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  if (!parsed.tournament) {
    throw new Error('Invalid config: missing "tournament" section');
  }
  if (!parsed.bots || typeof parsed.bots.count !== 'number') {
    throw new Error('Invalid config: missing "bots.count"');
  }
  return parsed;
}

async function createTournament(tournamentConfig) {
  console.log('📋 Creating tournament from JSON...');

  const response = await axios.post(`${BASE_URL}/api/tournaments/create`, {
    name: tournamentConfig.name,
    buyIn: tournamentConfig.buyIn,
    maxPlayers: tournamentConfig.maxPlayers,
    startingChips: tournamentConfig.startingChips,
    blindStructure: tournamentConfig.blindStructure,
    startTime: tournamentConfig.startTime,
    registrationPeriod: tournamentConfig.registrationPeriod,
    creatorWallet: tournamentConfig.creatorWallet,
  });

  const tournamentId = response.data?.tournament?.id;
  if (!tournamentId) {
    throw new Error('Tournament was not created correctly (missing id in response)');
  }

  console.log(`✅ Tournament created: ID ${tournamentId}`);
  return tournamentId;
}

async function registerBot(tournamentId, botNumber, strategies) {
  const strategyPool = Array.isArray(strategies) && strategies.length > 0 ? strategies : BOT_STRATEGIES;
  const strategy = strategyPool[botNumber % strategyPool.length];
  const botName = `Bot_${strategy}_${botNumber}`;
  const walletAddress = `0xbot${botNumber.toString().padStart(4, '0')}`;

  try {
    await axios.post(`${BASE_URL}/api/tournaments/${tournamentId}/register`, {
      walletAddress,
      playerName: botName,
      isBot: true,
    });

    return { success: true, name: botName };
  } catch (error) {
    return {
      success: false,
      name: botName,
      error: error.response?.data || error.message,
    };
  }
}

async function registerBots(tournamentId, botCount, strategies) {
  console.log(`🤖 Registering ${botCount} bots...`);

  const jobs = [];
  for (let botNumber = 1; botNumber <= botCount; botNumber += 1) {
    jobs.push(registerBot(tournamentId, botNumber, strategies));
  }

  const results = await Promise.all(jobs);
  const success = results.filter((result) => result.success).length;
  const failed = results.filter((result) => !result.success);

  console.log(`✅ Bots registered: ${success}/${botCount}`);
  if (failed.length > 0) {
    console.log(`⚠️ Failed registrations: ${failed.length}`);
    failed.slice(0, 5).forEach((item) => {
      console.log(`   - ${item.name}: ${JSON.stringify(item.error)}`);
    });
  }
}

async function getTournamentStatus(tournamentId) {
  const response = await axios.get(`${BASE_URL}/api/tournaments/${tournamentId}`);
  return response.data?.tournament;
}

async function main() {
  try {
    const config = loadConfig();
    const tournamentConfig = config.tournament;
    const botsConfig = config.bots;

    console.log('🎰 Tournament JSON Launcher');
    console.log(`   Config: ${path.basename(CONFIG_PATH)}`);
    console.log('==================================================');

    const tournamentId = await createTournament(tournamentConfig);

    await registerBots(
      tournamentId,
      botsConfig.count,
      botsConfig.strategies,
    );

    const status = await getTournamentStatus(tournamentId);
    if (status) {
      console.log('\n📊 Tournament Status');
      console.log(`   ID: ${status.id}`);
      console.log(`   Name: ${status.name}`);
      console.log(`   Status: ${status.status}`);
      console.log(`   Registered: ${status.registeredPlayers?.length || 0}/${status.maxPlayers}`);
      console.log(`   Registration window: ${tournamentConfig.registrationPeriod || 5} minutes`);
      console.log(`   Start mode: ${tournamentConfig.startTime || 'immediate'}`);
    }

    console.log('\n✅ Tournament ready. Registration remains open for 5 minutes (auto-start by server).');
    console.log(`   Waiting room: http://localhost:3000/tournament/${tournamentId}/waiting`);
    console.log('==================================================');
  } catch (error) {
    console.error('❌ Launcher error:', error.response?.data || error.message);
    process.exit(1);
  }
}

main();
