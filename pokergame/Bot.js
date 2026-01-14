const Player = require('./Player');

/**
 * Bot Player with AI decision making capabilities
 * Extends Player class to add automated play functionality
 */
class Bot extends Player {
  constructor(socketId, playerId, playerName, chipsAmount, strategy = 'balanced') {
    super(socketId, playerId, playerName, chipsAmount);
    this.isBot = true;
    this.strategy = strategy; // 'tight', 'loose', 'aggressive', 'passive', 'balanced'
    this.handStrength = 0;
    this.decisionDelay = this.getRandomDelay(1000, 3000); // Random thinking time
  }

  /**
   * Get random delay to simulate human-like thinking time
   */
  getRandomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Calculate hand strength based on hole cards
   * Returns a value between 0-100
   */
  calculateHandStrength(hand) {
    if (!hand || hand.length !== 2) return 0;

    const rankValues = {
      '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
      'J': 11, 'Q': 12, 'K': 13, 'A': 14
    };

    const card1 = hand[0];
    const card2 = hand[1];
    const rank1 = rankValues[card1.rank] || 0;
    const rank2 = rankValues[card2.rank] || 0;
    const suited = card1.suit === card2.suit;
    const paired = rank1 === rank2;
    const gap = Math.abs(rank1 - rank2);

    let strength = 0;

    // Pocket pairs
    if (paired) {
      strength = 50 + (rank1 * 3); // AA = 92, KK = 89, etc.
      if (rank1 >= 10) strength += 10; // Premium pairs bonus
      return Math.min(strength, 100);
    }

    // High cards
    const highCard = Math.max(rank1, rank2);
    const lowCard = Math.min(rank1, rank2);
    strength = (highCard * 3) + (lowCard * 2);

    // Suited bonus
    if (suited) {
      strength += 8;
      if (highCard >= 10) strength += 5; // Suited broadway bonus
    }

    // Connected cards bonus
    if (gap === 1) strength += 5;
    if (gap === 0) strength += 8; // Connectors

    // Ace with face card
    if (highCard === 14 && lowCard >= 10) {
      strength += 10;
    }

    // Broadway cards (10-A)
    if (highCard >= 10 && lowCard >= 10) {
      strength += 8;
    }

    return Math.min(strength, 95); // Non-pairs max at 95
  }

  /**
   * Calculate pot odds
   */
  calculatePotOdds(callAmount, pot) {
    if (callAmount === 0) return Infinity;
    return pot / callAmount;
  }

  /**
   * Make decision based on strategy and game state
   */
  makeDecision(gameState) {
    const { 
      hand, 
      pot, 
      callAmount, 
      minRaise, 
      stack, 
      board = [],
      position,
      numPlayers 
    } = gameState;

    this.handStrength = this.calculateHandStrength(hand);
    const potOdds = this.calculatePotOdds(callAmount, pot);
    const stackToPotRatio = stack / (pot || 1);
    const isPreflop = board.length === 0;
    const isFlop = board.length === 3;
    const isTurn = board.length === 4;
    const isRiver = board.length === 5;

    // Strategy modifiers
    const strategyMods = this.getStrategyModifiers();

    // Adjust hand strength based on strategy
    let adjustedStrength = this.handStrength * strategyMods.aggressiveness;

    // Position adjustment (later position = better)
    if (position === 'button' || position === 'late') {
      adjustedStrength *= 1.1;
    } else if (position === 'early') {
      adjustedStrength *= 0.9;
    }

    // Multi-way pot adjustment
    if (numPlayers > 3) {
      adjustedStrength *= 0.95;
    }

    // Decision logic
    const decision = this.evaluateAction(
      adjustedStrength,
      callAmount,
      pot,
      stack,
      minRaise,
      potOdds,
      strategyMods,
      isPreflop
    );

    return decision;
  }

  /**
   * Get strategy modifiers based on bot personality
   */
  getStrategyModifiers() {
    const strategies = {
      tight: {
        aggressiveness: 0.8,
        callThreshold: 60,
        raiseThreshold: 75,
        bluffFrequency: 0.05
      },
      loose: {
        aggressiveness: 1.2,
        callThreshold: 35,
        raiseThreshold: 55,
        bluffFrequency: 0.15
      },
      aggressive: {
        aggressiveness: 1.3,
        callThreshold: 45,
        raiseThreshold: 60,
        bluffFrequency: 0.25
      },
      passive: {
        aggressiveness: 0.7,
        callThreshold: 50,
        raiseThreshold: 80,
        bluffFrequency: 0.02
      },
      balanced: {
        aggressiveness: 1.0,
        callThreshold: 45,
        raiseThreshold: 65,
        bluffFrequency: 0.10
      }
    };

    return strategies[this.strategy] || strategies.balanced;
  }

  /**
   * Evaluate what action to take
   */
  evaluateAction(strength, callAmount, pot, stack, minRaise, potOdds, strategyMods, isPreflop) {
    // Can we check?
    const canCheck = callAmount === 0;

    // Randomness factor for unpredictability
    const randomFactor = Math.random() * 10;
    const effectiveStrength = strength + randomFactor;

    // All-in situation
    if (callAmount >= stack * 0.5) {
      if (effectiveStrength >= 70) {
        return { action: 'CS_CALL', amount: callAmount };
      } else if (effectiveStrength >= 50 && potOdds > 2) {
        return { action: 'CS_CALL', amount: callAmount };
      } else {
        return { action: 'CS_FOLD' };
      }
    }

    // Strong hand - Raise
    if (effectiveStrength >= strategyMods.raiseThreshold) {
      const raiseAmount = this.calculateRaiseAmount(
        callAmount, 
        pot, 
        stack, 
        minRaise, 
        strength, 
        strategyMods
      );
      return { action: 'CS_RAISE', amount: raiseAmount };
    }

    // Medium strength - Call or Raise
    if (effectiveStrength >= strategyMods.callThreshold) {
      // Sometimes raise with medium hands (semi-bluff)
      if (Math.random() < strategyMods.bluffFrequency * 0.5) {
        const raiseAmount = this.calculateRaiseAmount(
          callAmount, 
          pot, 
          stack, 
          minRaise, 
          strength, 
          strategyMods
        );
        return { action: 'CS_RAISE', amount: raiseAmount };
      }
      
      if (canCheck) {
        return { action: 'CS_CHECK' };
      }
      
      // Good pot odds = call
      if (potOdds > 3 || callAmount < pot * 0.3) {
        return { action: 'CS_CALL', amount: callAmount };
      }
      
      return { action: 'CS_FOLD' };
    }

    // Weak hand
    if (canCheck) {
      return { action: 'CS_CHECK' };
    }

    // Bluff attempt
    if (Math.random() < strategyMods.bluffFrequency && pot > stack * 0.2) {
      const raiseAmount = this.calculateRaiseAmount(
        callAmount, 
        pot, 
        stack, 
        minRaise, 
        strength, 
        strategyMods
      );
      return { action: 'CS_RAISE', amount: raiseAmount };
    }

    // Cheap to call with pot odds
    if (callAmount < stack * 0.1 && potOdds > 4) {
      return { action: 'CS_CALL', amount: callAmount };
    }

    return { action: 'CS_FOLD' };
  }

  /**
   * Calculate raise amount based on situation
   */
  calculateRaiseAmount(callAmount, pot, stack, minRaise, strength, strategyMods) {
    let raiseSize;

    // Very strong hand - bigger raise
    if (strength >= 85) {
      raiseSize = pot * 0.8 + (callAmount || 0);
    } 
    // Strong hand - standard raise
    else if (strength >= 70) {
      raiseSize = pot * 0.6 + (callAmount || 0);
    }
    // Medium hand - smaller raise
    else {
      raiseSize = pot * 0.4 + (callAmount || 0);
    }

    // Aggressive players raise more
    raiseSize *= strategyMods.aggressiveness;

    // Ensure minimum raise
    raiseSize = Math.max(raiseSize, minRaise);

    // Don't raise more than stack
    raiseSize = Math.min(raiseSize, stack);

    // Round to 2 decimals
    return Math.round(raiseSize * 100) / 100;
  }

  /**
   * Get a random strategy for variety
   */
  static getRandomStrategy() {
    const strategies = ['tight', 'loose', 'aggressive', 'passive', 'balanced'];
    return strategies[Math.floor(Math.random() * strategies.length)];
  }

  /**
   * Generate a random bot name
   */
  static generateBotName(index) {
    const prefixes = ['Bot', 'AI', 'Player', 'Ace', 'King', 'Pro', 'Shark', 'Fish'];
    const suffixes = ['Master', 'Killer', 'Genius', 'Wizard', 'Expert', 'Ninja', 'Hunter'];
    
    const useSimple = Math.random() > 0.5;
    
    if (useSimple) {
      return `${prefixes[Math.floor(Math.random() * prefixes.length)]}${index}`;
    } else {
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
      return `${prefix}${suffix}${index}`;
    }
  }
}

module.exports = Bot;
