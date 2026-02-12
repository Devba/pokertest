#!/usr/bin/env node

/**
 * Script to create and launch an ULTRA FAST tournament with 50 bots
 * - Ultra low starting chips (50 only!)
 * - Hyper blind structure (3 minutes per level)
 * - Eliminations should happen within 1-2 minutes
 * 
 * Usage: node launch-tournament-50-bots-ultrafast.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:7777';
const BOT_STRATEGIES = ['tight', 'loose', 'aggressive', 'passive', 'balanced'];

async function createTournament() {
  console.log('📋 Creating ULTRA FAST tournament...');
  
  try {
    const response = await axios.post(`${BASE_URL}/api/tournaments/create`, {
      name: '50 Bots Ultra Fast Championship',
      buyIn: 0,
      maxPlayers: 50,
      startingChips: 50,              // Ultra low! Only 2-5 big blinds
      blindStructure: 'hyper',        // 3 minutes per level (fastest)
      startTime: 'immediate',
      creatorWallet: 'bot-system'
    });
    
    console.log(`✅ Ultra fast tournament created: ID ${response.data.tournament.id}`);
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

async function getTournamentStatus(tournamentId) {
  try {
    const response = await axios.get(`${BASE_URL}/api/tournaments/${tournamentId}`);
    return response.data.tournament;
  } catch (error) {
    console.error('❌ Error getting tournament status:', error.response?.data || error.message);
    return null;
  }
}

async function main() {
  console.log('⚡ 50 Bots ULTRA FAST Tournament Launcher');
  console.log('   - Starting Chips: 50 (ultra low!)');
  console.log('   - Blind Structure: HYPER (3 min per level)');
  console.log('   - Expected Duration: ~3-5 minutes');
  console.log('   - WARNING: Eliminations will happen VERY quickly!');
  console.log('\n==================================================');
  
  try {
    // Create tournament
    const tournamentId = await createTournament();
    
    // Register bots
    const registrationSuccess = await registerBots(tournamentId, 50);
    
    if (!registrationSuccess) {
      console.error('⚠️  Not all bots registered successfully');
    }
    
    // Start tournament
    const startSuccess = await startTournament(tournamentId);
    
    if (!startSuccess) {
      console.error('❌ Failed to start tournament');
      process.exit(1);
    }
    
    // Get and display tournament status
    const status = await getTournamentStatus(tournamentId);
    
    if (status) {
      console.log(`\n📊 Tournament Status:`);
      console.log(`   ID: ${status.id}`);
      console.log(`   Name: ${status.name}`);
      console.log(`   Status: ${status.status}`);
      console.log(`   Registered Players: ${status.registeredPlayers?.length || 0}`);
      console.log(`   Tables: ${status.tables?.length || 0}`);
      console.log(`   Blind Level: ${status.blindLevel}`);
      console.log(`   Starting Chips: 50 (only 2-5 big blinds!)`);
      console.log(`   Blind Structure: HYPER (3 min/level)`);
      
      if (status.tables && status.tables.length > 0) {
        console.log(`\n🎲 Tables:`);
        status.tables.forEach((table, idx) => {
          console.log(`   Table ${idx + 1}: ${table.id} (${table.activePlayers} players)`);
        });
      }
    }
    
    console.log('\n==================================================');
    console.log('⚡ Ultra fast tournament is live!');
    console.log(`   Access it at: http://localhost:3000/tournament/${tournamentId}`);
    console.log('\n💥 With 50 chips, expect multiple eliminations per hand!');
    console.log('==================================================');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
