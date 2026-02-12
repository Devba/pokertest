#!/usr/bin/env node

/**
 * Script to create and launch a tournament with 50 bots
 * Usage: node launch-tournament-50-bots.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:7777';
const BOT_STRATEGIES = ['tight', 'loose', 'aggressive', 'passive', 'balanced'];

async function createTournament() {
  console.log('📋 Creating tournament...');
  
  try {
    const response = await axios.post(`${BASE_URL}/api/tournaments/create`, {
      name: '50 Bots Championship',
      buyIn: 0,
      maxPlayers: 50,
      startingChips: 10000,
      blindStructure: 'normal',
      startTime: 'immediate',
      creatorWallet: 'bot-system'
    });
    
    console.log(`✅ Tournament created: ID ${response.data.tournament.id}`);
    return response.data.tournament.id;
  } catch (error) {
    console.error('❌ Error creating tournament:', error.response?.data || error.message);
    throw error;
  }
}

async function registerBot(tournamentId, botNumber) {
  const strategy = BOT_STRATEGIES[botNumber % BOT_STRATEGIES.length];
  const botName = `Bot_${strategy}_${botNumber}`;
  const walletAddress = `0xbot${botNumber.toString().padStart(4, '0')}`;
  
  try {
    const response = await axios.post(`${BASE_URL}/api/tournaments/${tournamentId}/register`, {
      walletAddress: walletAddress,
      playerName: botName,
      isBot: true
    });
    
    return { success: true, name: botName };
  } catch (error) {
    console.error(`❌ Error registering ${botName}:`, error.response?.data || error.message);
    return { success: false, name: botName, error: error.message };
  }
}

async function registerBots(tournamentId, count) {
  console.log(`\n🤖 Registering ${count} bots...`);
  
  const promises = [];
  for (let i = 1; i <= count; i++) {
    promises.push(registerBot(tournamentId, i));
  }
  
  const results = await Promise.all(promises);
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Successfully registered: ${successful} bots`);
  if (failed > 0) {
    console.log(`❌ Failed to register: ${failed} bots`);
  }
  
  return successful === count;
}

async function startTournament(tournamentId) {
  console.log(`\n🎮 Starting tournament ${tournamentId}...`);
  
  try {
    const response = await axios.post(`${BASE_URL}/api/tournaments/${tournamentId}/start`);
    console.log(`✅ Tournament started successfully!`);
    return true;
  } catch (error) {
    console.error('❌ Error starting tournament:', error.response?.data || error.message);
    return false;
  }
}

async function getTournamentInfo(tournamentId) {
  try {
    const response = await axios.get(`${BASE_URL}/api/tournaments/${tournamentId}`);
    const tournament = response.data.tournament;
    
    console.log(`\n📊 Tournament Status:`);
    console.log(`   ID: ${tournament.id}`);
    console.log(`   Name: ${tournament.name}`);
    console.log(`   Status: ${tournament.status}`);
    console.log(`   Registered Players: ${tournament.registeredPlayers.length}`);
    console.log(`   Tables: ${tournament.tables ? tournament.tables.length : 0}`);
    console.log(`   Blind Level: ${tournament.blindLevel}`);
    
    if (tournament.tables && tournament.tables.length > 0) {
      console.log(`\n🎲 Tables:`);
      tournament.tables.forEach((table, idx) => {
        const activePlayers = table.players ? table.players.length : 0;
        console.log(`   Table ${idx + 1}: ${table.id} (${activePlayers} players)`);
      });
    }
  } catch (error) {
    console.error('❌ Error getting tournament info:', error.response?.data || error.message);
  }
}

async function main() {
  console.log('🎰 50 Bots Tournament Launcher\n');
  console.log('=' .repeat(50));
  
  try {
    // Step 1: Create tournament
    const tournamentId = await createTournament();
    
    // Step 2: Register 50 bots
    const allRegistered = await registerBots(tournamentId, 50);
    
    if (!allRegistered) {
      console.log('\n⚠️  Not all bots registered. Continue anyway? (Ctrl+C to cancel)');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // Step 3: Start tournament
    const started = await startTournament(tournamentId);
    
    if (started) {
      // Step 4: Show tournament info
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for tables to be created
      await getTournamentInfo(tournamentId);
      
      console.log('\n' + '=' .repeat(50));
      console.log('🎉 Tournament is live!');
      console.log(`   Access it at: http://localhost:3000/tournament/${tournamentId}`);
      console.log('=' .repeat(50));
    }
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
