const express = require('express');
const router = express.Router();

// This will be set after socket initialization
let tournamentManager = null;

// Initialize with socket module
const initTournamentRoutes = (socketModule) => {
  tournamentManager = socketModule.tournamentManager;
};

// @route   POST /api/tournaments/create
// @desc    Create a new tournament
// @access  Public
router.post('/create', (req, res) => {
  try {
    const { 
      name, 
      buyIn, 
      maxPlayers, 
      startingChips, 
      blindStructure, 
      startTime,
      registrationPeriod,
      creatorWallet 
    } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Tournament name is required' });
    }

    if (!maxPlayers) {
      return res.status(400).json({ error: 'Max players is required' });
    }

    if (!tournamentManager) {
      return res.status(500).json({ error: 'Tournament manager not initialized' });
    }

    const tournament = tournamentManager.createTournament({
      name,
      buyIn: buyIn || 0,
      maxPlayers,
      startingChips: startingChips || 5000,
      blindStructure: blindStructure || 'normal',
      startTime: startTime || 'immediate',
      registrationPeriod: typeof registrationPeriod === 'number' ? registrationPeriod : 5,
      creatorWallet
    });

    res.json({
      success: true,
      message: `Tournament "${name}" created successfully`,
      tournament: {
        id: tournament.id,
        name: tournament.name,
        buyIn: tournament.buyIn,
        maxPlayers: tournament.maxPlayers,
        startingChips: tournament.startingChips,
        blindStructure: tournament.blindStructure,
        status: tournament.status,
        startTime: tournament.startTime,
        registrationPeriod: tournament.registrationPeriod
      }
    });
  } catch (error) {
    console.error('Error creating tournament:', error);
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/tournaments/list
// @desc    Get all tournaments
// @access  Public
router.get('/list', (req, res) => {
  try {
    const { status } = req.query; // Filter by status: upcoming, live, completed
    
    if (!tournamentManager) {
      return res.status(500).json({ error: 'Tournament manager not initialized' });
    }

    let tournaments = tournamentManager.getAllTournaments();
    
    if (status) {
      tournaments = tournaments.filter(t => t.status === status);
    }

    res.json({
      success: true,
      count: tournaments.length,
      tournaments: tournaments.map(t => ({
        id: t.id,
        name: t.name,
        buyIn: t.buyIn,
        prizePool: t.prizePool,
        maxPlayers: t.maxPlayers,
        registeredPlayers: t.registeredPlayers.length,
        startTime: t.startTime,
        status: t.status,
        structure: t.structure,
        blindLevel: t.blindLevel,
        currentBlinds: t.getCurrentBlinds ? t.getCurrentBlinds() : null
      }))
    });
  } catch (error) {
    console.error('Error listing tournaments:', error);
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/tournaments/:id
// @desc    Get tournament details
// @access  Public
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    if (!tournamentManager) {
      return res.status(500).json({ error: 'Tournament manager not initialized' });
    }

    const tournament = tournamentManager.getTournament(parseInt(id));
    
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    res.json({
      success: true,
      tournament: {
        id: tournament.id,
        name: tournament.name,
        buyIn: tournament.buyIn,
        prizePool: tournament.prizePool,
        maxPlayers: tournament.maxPlayers,
        registeredPlayers: tournament.registeredPlayers,
        startTime: tournament.startTime,
        status: tournament.status,
        structure: tournament.structure,
        blindLevel: tournament.blindLevel,
        blindSchedule: tournament.blindSchedule,
        tables: tournament.tables ? tournament.tables.map(t => ({
          id: t.id,
          name: t.name,
          tournamentId: t.tournamentId,
          maxPlayers: t.maxPlayers,
          activePlayers: t.activePlayers ? t.activePlayers().length : 0
        })) : [],
        eliminatedPlayers: tournament.eliminatedPlayers || []
      }
    });
  } catch (error) {
    console.error('Error getting tournament:', error);
    res.status(500).json({ error: error.message });
  }
});

// @route   POST /api/tournaments/:id/register
// @desc    Register player for tournament
// @access  Public
router.post('/:id/register', (req, res) => {
  try {
    const { id } = req.params;
    const { walletAddress, playerName, isBot } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    if (!tournamentManager) {
      return res.status(500).json({ error: 'Tournament manager not initialized' });
    }

    // Create proper player object
    const playerData = {
      id: walletAddress,
      name: playerName || `Player_${walletAddress.slice(2, 8)}`,
      walletAddress: walletAddress,
      isBot: isBot || false
    };

    const result = tournamentManager.registerPlayer(parseInt(id), playerData, playerData);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({
      success: true,
      message: `Successfully registered for tournament`,
      tournament: result.tournament
    });
  } catch (error) {
    console.error('Error registering for tournament:', error);
    res.status(500).json({ error: error.message });
  }
});

// @route   POST /api/tournaments/:id/unregister
// @desc    Unregister player from tournament
// @access  Public
router.post('/:id/unregister', (req, res) => {
  try {
    const { id } = req.params;
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    if (!tournamentManager) {
      return res.status(500).json({ error: 'Tournament manager not initialized' });
    }

    const result = tournamentManager.unregisterPlayer(parseInt(id), walletAddress);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({
      success: true,
      message: `Successfully unregistered from tournament`
    });
  } catch (error) {
    console.error('Error unregistering from tournament:', error);
    res.status(500).json({ error: error.message });
  }
});

// @route   POST /api/tournaments/:id/start
// @desc    Start a tournament
// @access  Public (should be restricted to admin/creator)
router.post('/:id/start', (req, res) => {
  try {
    const { id } = req.params;
    
    if (!tournamentManager) {
      return res.status(500).json({ error: 'Tournament manager not initialized' });
    }

    const result = tournamentManager.startTournament(parseInt(id));

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({
      success: true,
      message: `Tournament started`,
      tournament: result.tournament
    });
  } catch (error) {
    console.error('Error starting tournament:', error);
    res.status(500).json({ error: error.message });
  }
});

// @route   DELETE /api/tournaments/:id
// @desc    Cancel/delete a tournament
// @access  Public (should be restricted to admin/creator)
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    if (!tournamentManager) {
      return res.status(500).json({ error: 'Tournament manager not initialized' });
    }

    const result = tournamentManager.cancelTournament(parseInt(id));

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({
      success: true,
      message: `Tournament cancelled`
    });
  } catch (error) {
    console.error('Error cancelling tournament:', error);
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/tournaments/:id/leaderboard
// @desc    Get tournament leaderboard
// @access  Public
router.get('/:id/leaderboard', (req, res) => {
  try {
    const { id } = req.params;
    
    if (!tournamentManager) {
      return res.status(500).json({ error: 'Tournament manager not initialized' });
    }

    const leaderboard = tournamentManager.getLeaderboard(parseInt(id));

    if (!leaderboard) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    res.json({
      success: true,
      leaderboard
    });
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/tournaments/:id/payouts
// @desc    Get tournament payout structure
// @access  Public
router.get('/:id/payouts', (req, res) => {
  try {
    const { id } = req.params;
    
    if (!tournamentManager) {
      return res.status(500).json({ error: 'Tournament manager not initialized' });
    }

    const payouts = tournamentManager.getPayoutStructure(parseInt(id));

    if (!payouts) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    res.json({
      success: true,
      payouts
    });
  } catch (error) {
    console.error('Error getting payouts:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = { router, initTournamentRoutes };
