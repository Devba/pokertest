const Table = require('./Table');

class TournamentTable extends Table {
  constructor(id, name, limit, maxPlayers, tournamentId, blindLevel = 1, tournamentManager = null) {
    super(id, name, limit, maxPlayers);
    
    // Tournament-specific properties
    this.tournamentId = tournamentId;
    this.tournamentManager = tournamentManager;
    this.blindLevel = blindLevel;
    this.blindSchedule = this.initBlindSchedule();
    this.currentBlindIndex = 0;
    this.handCount = 0;
    this.handsPerLevel = 10; // Hands before blinds increase
    this.eliminatedPlayers = [];
    this.startTime = null;
    this.isTournament = true;
  }

  initBlindSchedule() {
    // Define blind structure for tournament
    return [
      { level: 1, smallBlind: 10, bigBlind: 20, ante: 0 },
      { level: 2, smallBlind: 15, bigBlind: 30, ante: 0 },
      { level: 3, smallBlind: 25, bigBlind: 50, ante: 0 },
      { level: 4, smallBlind: 50, bigBlind: 100, ante: 10 },
      { level: 5, smallBlind: 75, bigBlind: 150, ante: 15 },
      { level: 6, smallBlind: 100, bigBlind: 200, ante: 20 },
      { level: 7, smallBlind: 150, bigBlind: 300, ante: 30 },
      { level: 8, smallBlind: 200, bigBlind: 400, ante: 40 },
      { level: 9, smallBlind: 300, bigBlind: 600, ante: 60 },
      { level: 10, smallBlind: 400, bigBlind: 800, ante: 80 },
      { level: 11, smallBlind: 500, bigBlind: 1000, ante: 100 },
      { level: 12, smallBlind: 600, bigBlind: 1200, ante: 120 },
      { level: 13, smallBlind: 800, bigBlind: 1600, ante: 160 },
      { level: 14, smallBlind: 1000, bigBlind: 2000, ante: 200 },
      { level: 15, smallBlind: 1500, bigBlind: 3000, ante: 300 },
    ];
  }

  getCurrentBlinds() {
    return this.blindSchedule[this.currentBlindIndex];
  }

  increaseBlinds() {
    if (this.currentBlindIndex < this.blindSchedule.length - 1) {
      this.currentBlindIndex++;
      const newBlinds = this.getCurrentBlinds();
      this.minBet = newBlinds.smallBlind;
      this.minRaise = newBlinds.bigBlind;
      this.blindLevel = newBlinds.level;
      
      // Update tournament's blind level and broadcast
      if (this.tournamentManager) {
        const tournament = this.tournamentManager.getTournament(this.tournamentId);
        if (tournament) {
          tournament.blindLevel = this.blindLevel;
          console.log(`Tournament ${this.tournamentId} blind level updated to ${this.blindLevel}`);
          this.tournamentManager.broadcastTournamentUpdate(this.tournamentId);
        }
      }
      
      return {
        message: `Blinds increased to ${newBlinds.smallBlind}/${newBlinds.bigBlind}`,
        level: newBlinds.level,
        smallBlind: newBlinds.smallBlind,
        bigBlind: newBlinds.bigBlind,
        ante: newBlinds.ante
      };
    }
    return null;
  }

  // Override setBlinds to use tournament blind structure
  setBlinds() {
    const isHeadsUp = this.activePlayers().length === 2 ? true : false;
    const currentBlinds = this.getCurrentBlinds();

    this.smallBlind = isHeadsUp
      ? this.button
      : this.nextActivePlayer(this.button, 1);
    this.bigBlind = isHeadsUp
      ? this.nextActivePlayer(this.button, 1)
      : this.nextActivePlayer(this.button, 2);

    // Collect antes if applicable
    if (currentBlinds.ante > 0) {
      this.collectAntes(currentBlinds.ante);
    }

    // Post blinds
    this.seats[this.smallBlind].placeBlind(currentBlinds.smallBlind);
    this.seats[this.bigBlind].placeBlind(currentBlinds.bigBlind);

    this.pot += currentBlinds.smallBlind + currentBlinds.bigBlind;
    this.callAmount = currentBlinds.bigBlind;
    this.minRaise = currentBlinds.bigBlind * 2;
  }

  collectAntes(anteAmount) {
    for (let i = 1; i <= this.maxPlayers; i++) {
      const seat = this.seats[i];
      if (seat && !seat.sittingOut) {
        const ante = Math.min(anteAmount, seat.stack);
        seat.placeAnte(ante);
        this.pot += ante;
      }
    }
  }

  // Override startHand to track hand count and blind increases
  startHand() {
    super.startHand();
    
    if (!this.handOver) {
      this.handCount++;
      console.log(`Tournament Table ${this.id} - Starting hand #${this.handCount}`);  
      // Check if blinds should increase
      if (this.handCount % this.handsPerLevel === 0) {
        const blindIncrease = this.increaseBlinds();
        console.log(`Tournament Table ${this.id} - ${blindIncrease.message}`);
        if (blindIncrease) {
          this.winMessages.push(blindIncrease.message);
        }
      }
    }
  }

  // Override endHand to check for player elimination
  endHand() {
    super.endHand();
    this.checkForEliminations();
  }

  checkForEliminations() {
    let playersEliminated = false;
    
    for (let i = 1; i <= this.maxPlayers; i++) {
      const seat = this.seats[i];
      if (seat && seat.stack === 0 && !seat.eliminated) {
        seat.eliminated = true;
        playersEliminated = true;
        
        this.eliminatedPlayers.push({
          player: seat.player,
          position: this.getTournamentPosition(),
          eliminatedAt: new Date()
        });
        
        const eliminationMessage = `${seat.player.name} eliminated in position ${this.getTournamentPosition()}`;
        this.winMessages.push(eliminationMessage);
        
        // Auto-clear the elimination message after 3 seconds
        setTimeout(() => {
          const msgIndex = this.winMessages.indexOf(eliminationMessage);
          if (msgIndex > -1) {
            this.winMessages.splice(msgIndex, 1);
          }
        }, 3000);
        
        // Remove eliminated player from seat
        console.log(`Removing eliminated player ${seat.player.name} from tournament table seat ${i}`);
        this.seats[i] = null;
      }
    }

    // Check if tournament is over
    if (this.activePlayers().length === 1) {
      this.endTournament();
    }
    
    // Return true if any players were eliminated (so we can broadcast tournament update)
    return playersEliminated;
  }

  getTournamentPosition() {
    const remainingPlayers = this.activePlayers().length;
    return remainingPlayers + 1 + this.eliminatedPlayers.length;
  }

  endTournament() {
    const winner = this.activePlayers()[0];
    if (winner) {
      this.winMessages.push(
        `🏆 ${winner.player.name} wins the tournament! 🏆`
      );
    }
    this.handOver = true;
  }

  // Disable rebuy in tournaments
  rebuyPlayer(seatId, amount) {
    throw new Error('Rebuys are not allowed in tournaments');
  }

  // Override standPlayer to prevent leaving during tournament
  standPlayer(socketId) {
    // In tournaments, players can't stand up - they're eliminated
    const seat = this.findPlayerBySocketId(socketId);
    if (seat && seat.stack > 0) {
      // Player leaving voluntarily - mark as eliminated
      seat.stack = 0;
      seat.sittingOut = true;
      this.checkForEliminations();
    }
  }

  getTournamentStatus() {
    const currentBlinds = this.getCurrentBlinds();
    return {
      tournamentId: this.tournamentId,
      tableId: this.id,
      handCount: this.handCount,
      blindLevel: currentBlinds.level,
      smallBlind: currentBlinds.smallBlind,
      bigBlind: currentBlinds.bigBlind,
      ante: currentBlinds.ante,
      handsUntilBlindIncrease: this.handsPerLevel - (this.handCount % this.handsPerLevel),
      activePlayers: this.activePlayers().length,
      eliminatedPlayers: this.eliminatedPlayers.length,
      averageStack: this.getAverageStack(),
      chipLeader: this.getChipLeader()
    };
  }

  getAverageStack() {
    const activePlayers = this.activePlayers();
    if (activePlayers.length === 0) return 0;
    
    const totalChips = activePlayers.reduce((sum, seat) => sum + seat.stack, 0);
    return Math.round(totalChips / activePlayers.length);
  }

  getChipLeader() {
    const activePlayers = this.activePlayers();
    if (activePlayers.length === 0) return null;
    
    const leader = activePlayers.reduce((max, seat) => 
      seat.stack > max.stack ? seat : max
    );
    
    return {
      name: leader.player.name,
      stack: leader.stack,
      seatId: leader.id
    };
  }

  // Get payout structure based on remaining players
  getPayoutStructure(totalPrizePool) {
    const totalPlayers = this.activePlayers().length + this.eliminatedPlayers.length;
    
    // Example payout structures (can be customized)
    if (totalPlayers <= 10) {
      return {
        1: totalPrizePool * 1.00 // Winner takes all
      };
    } else if (totalPlayers <= 50) {
      return {
        1: totalPrizePool * 0.50,
        2: totalPrizePool * 0.30,
        3: totalPrizePool * 0.20
      };
    } else {
      return {
        1: totalPrizePool * 0.40,
        2: totalPrizePool * 0.25,
        3: totalPrizePool * 0.15,
        4: totalPrizePool * 0.10,
        5: totalPrizePool * 0.06,
        6: totalPrizePool * 0.04
      };
    }
  }
}

module.exports = TournamentTable;
