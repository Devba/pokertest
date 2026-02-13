#!/usr/bin/env node

/**
 * Launch a 60-bot tournament every 10 minutes.
 *
 * Based on: tournament-60-bots-5min.json
 * Usage:
 *   node launch-tournament-60-bots-every-10min.js
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const BASE_URL = 'http://localhost:7777';
const CONFIG_PATH = path.join(__dirname, 'tournament-60-bots-5min.json');
const DEFAULT_BOT_STRATEGIES = ['tight', 'loose', 'aggressive', 'passive', 'balanced'];
const INTERVAL_MS = 10 * 60 * 1000;

let launchCount = 0;

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

function twoDigits(value) {
  return String(value).padStart(2, '0');
}

function buildTournamentName(baseName) {
  const now = new Date();
  const date = `${now.getFullYear()}-${twoDigits(now.getMonth() + 1)}-${twoDigits(now.getDate())}`;
  const time = `${twoDigits(now.getHours())}:${twoDigits(now.getMinutes())}`;
  return `${baseName} | AUTO-10M | ${date} ${time}`;
}

async function createTournament(tournamentConfig) {
  const name = buildTournamentName(tournamentConfig.name || '60 Bots Championship');

  const response = await axios.post(`${BASE_URL}/api/tournaments/create`, {
    name,
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

  return {
    tournamentId,
    tournamentName: name,
  };
}

async function registerBot(tournamentId, botNumber, strategies) {
  const strategyPool = Array.isArray(strategies) && strategies.length > 0
    ? strategies
    : DEFAULT_BOT_STRATEGIES;

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
  const jobs = [];
  for (let botNumber = 1; botNumber <= botCount; botNumber += 1) {
    jobs.push(registerBot(tournamentId, botNumber, strategies));
  }

  const results = await Promise.all(jobs);
  const success = results.filter((result) => result.success).length;
  const failed = results.filter((result) => !result.success);

  return {
    success,
    failed,
  };
}

async function launchOnce(config) {
  launchCount += 1;
  const launchLabel = `#${launchCount}`;

  const tournamentConfig = config.tournament;
  const botsConfig = config.bots;

  console.log(`\n🚀 Launch ${launchLabel} started at ${new Date().toLocaleString()}`);

  const { tournamentId, tournamentName } = await createTournament(tournamentConfig);
  console.log(`✅ Created tournament ${tournamentId}`);
  console.log(`   Name: ${tournamentName}`);

  const registrationResult = await registerBots(
    tournamentId,
    botsConfig.count,
    botsConfig.strategies,
  );

  console.log(`🤖 Bots registered: ${registrationResult.success}/${botsConfig.count}`);
  if (registrationResult.failed.length > 0) {
    console.log(`⚠️ Failed bot registrations: ${registrationResult.failed.length}`);
    registrationResult.failed.slice(0, 5).forEach((item) => {
      console.log(`   - ${item.name}: ${JSON.stringify(item.error)}`);
    });
  }

  console.log(`🔗 Waiting room: http://localhost:3000/tournament/${tournamentId}/waiting`);
}

async function main() {
  const config = loadConfig();

  console.log('🕒 60 Bots Auto Launcher (every 10 minutes)');
  console.log(`   Config: ${path.basename(CONFIG_PATH)}`);
  console.log(`   Interval: ${INTERVAL_MS / 60000} minutes`);
  console.log('==================================================');

  try {
    await launchOnce(config);
  } catch (error) {
    console.error('❌ Initial launch failed:', error.response?.data || error.message);
  }

  const intervalId = setInterval(async () => {
    try {
      await launchOnce(config);
    } catch (error) {
      console.error('❌ Scheduled launch failed:', error.response?.data || error.message);
    }
  }, INTERVAL_MS);

  const shutdown = (signal) => {
    clearInterval(intervalId);
    console.log(`\n🛑 Received ${signal}. Auto launcher stopped.`);
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error) => {
  console.error('❌ Fatal error:', error.response?.data || error.message);
  process.exit(1);
});
