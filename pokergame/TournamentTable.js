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
    // Blind increases are now time-based and managed by TournamentManager
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
      this.minBet = newBlinds.bigBlind;
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

    // Post blinds - use actual amounts in case player has less than blind amount
    const actualSmallBlind = this.seats[this.smallBlind].placeBlind(currentBlinds.smallBlind);
    const actualBigBlind = this.seats[this.bigBlind].placeBlind(currentBlinds.bigBlind);

    this.pot += actualSmallBlind + actualBigBlind;
    this.callAmount = actualBigBlind;
    this.minRaise = actualBigBlind * 2;
  }

  collectAntes(anteAmount) {
    for (let i = 1; i <= this.maxPlayers; i++) {
      const seat = this.seats[i];
      if (seat && !seat.sittingOut) {
        const actualAnte = seat.placeAnte(anteAmount);
        this.pot += actualAnte;
      }
    }
  }

  // Override startHand to track hand count (blinds are now managed by TournamentManager based on time)
  startHand() {
    super.startHand();
    
    if (!this.handOver) {
      this.handCount++;
      console.log(`Tournament Table ${this.id} - Starting hand #${this.handCount}`);
    }
  }

  // Override endHand to check for player elimination
  endHand() {
    super.endHand();
    this.checkForEliminations();
  }

  // Override sitOutFeltedPlayers to prevent base class from removing eliminated players
  // Tournament tables handle eliminations through checkForEliminations instead
  sitOutFeltedPlayers() {
    // Do nothing - let checkForEliminations handle player removal
    console.log(`🚫 sitOutFeltedPlayers blocked for tournament table ${this.id} - using checkForEliminations instead`);
  }

  checkForEliminations() {
    let playersEliminated = false;
    
    console.log(`🔍 checkForEliminations: Checking ${this.maxPlayers} seats on table ${this.id}`);
    
    for (let i = 1; i <= this.maxPlayers; i++) {
      const seat = this.seats[i];
      if (seat) {
        console.log(`   Seat ${i}: ${seat.player.name}, stack: ${seat.stack}, eliminated: ${seat.eliminated || false}`);
      }
      
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
        
        console.log(`💀 ${eliminationMessage} at table ${this.id}`);
        
        // Auto-clear the elimination message after 3 seconds
        setTimeout(() => {
          const msgIndex = this.winMessages.indexOf(eliminationMessage);
          if (msgIndex > -1) {
            this.winMessages.splice(msgIndex, 1);
          }
        }, 3000);
        
        // Notify tournament manager of elimination (triggers balancing)
        if (this.tournamentManager) {
          console.log(`🔔 Notifying TournamentManager of ${seat.player.name}'s elimination`);
          this.tournamentManager.handlePlayerElimination(this.tournamentId, this.id, seat.player.id);
        }
        
        // Remove eliminated player from seat
        console.log(`Removing eliminated player ${seat.player.name} from tournament table seat ${i}`);
        this.seats[i] = null;
      }
    }

    // Check if tournament is over
    if (this.activePlayers().length === 1) {
      // Capture final snapshot before ending tournament
      this.captureFinalSnapshot();
      this.endTournament();
    }
    
    // Return true if any players were eliminated (so we can broadcast tournament update)
    return playersEliminated;
  }

  getTournamentPosition() {
    if (this.tournamentManager && this.tournamentId) {
      const tournament = this.tournamentManager.getTournament(this.tournamentId);
      if (tournament && Array.isArray(tournament.registeredPlayers)) {
        const eliminatedCount = Array.isArray(tournament.eliminatedPlayers)
          ? tournament.eliminatedPlayers.length
          : 0;
        return Math.max(2, tournament.registeredPlayers.length - eliminatedCount);
      }
    }

    const remainingPlayers = this.activePlayers().length;
    return remainingPlayers + 1 + this.eliminatedPlayers.length;
  }

  captureFinalSnapshot() {
    // Capture the final state of the tournament
    const bigBlindValue = this.getSnapshotBigBlindValue();
    const snapshot = {
      ts: Date.now(),
      hand: this.handSequence, // Use current hand number
      bigBlind: bigBlindValue,
      stacks: this.buildSeatStackSnapshot(),
    };
    this.handStackSnapshots.push(snapshot);
    console.log(`Captured final tournament snapshot for hand ${this.handSequence}`);
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

findPlayerById(i) {
    for (let i = 1; i <= this.maxPlayers; i++) {
      if (this.seats[i] && this.seats[i].player.socketId === socketId) {
        return this.seats[i];
      }
    }
  }


  // Override `standPlayer` with tournament-specific behavior
  // - If player has chips: mark as sitting out (can return later)
  // - If player has zero chips: mark eliminated and remove from seat
  // - Fallback to base behavior when appropriate
  standPlayer(socketId,sid) {
    const seat = this.findPlayerBySocketId(socketId);
  
    //const seat = this.seats[sid];
    if (!seat) return;

    // Player still has chips: mark as sitting out (not eliminated)
    if (seat.stack > 0) {
      seat.sittingOut = true;
      return;
    }

    // No chips remaining: treat as elimination in tournament
    if (seat.stack === 0 && !seat.eliminated) {
      seat.eliminated = true;

      this.eliminatedPlayers.push({
        player: seat.player,
        position: this.getTournamentPosition(),
        eliminatedAt: new Date(),
      });

      const eliminationMessage = `${seat.player.name} eliminated in position ${this.getTournamentPosition()}`;
      this.winMessages.push(eliminationMessage);

      // Auto-clear the elimination message after 3 seconds
      setTimeout(() => {
        const idx = this.winMessages.indexOf(eliminationMessage);
        if (idx > -1) this.winMessages.splice(idx, 1);
      }, 3000);

      // Remove eliminated player from seat
      this.seats[seat.id] = null;

      // If only one player left, end the tournament
      if (this.activePlayers().length === 1) {
        this.endTournament();
      }

      return;
    }

    // Fallback to base Table behavior for any other cases
    try {
      super.standPlayer(socketId,sid=seat.id );
    } catch (e) {
      // ignore if base class doesn't implement or errors
    }
  }

  getTournamentStatus() {
    const currentBlinds = this.getCurrentBlinds();
    
    // Get time until next blind increase from tournament manager
    const tournament = this.tournamentManager ? this.tournamentManager.getTournament(this.tournamentId) : null;
    let timeUntilBlindIncrease = null;
    
    if (tournament && tournament.lastBlindIncreaseTime && tournament.minutesPerLevel) {
      const elapsedMs = Date.now() - tournament.lastBlindIncreaseTime;
      const elapsedMinutes = elapsedMs / 60000;
      const remainingMinutes = tournament.minutesPerLevel - elapsedMinutes;
      timeUntilBlindIncrease = Math.max(0, remainingMinutes);
    }
    
    return {
      tournamentId: this.tournamentId,
      tableId: this.id,
      handCount: this.handCount,
      blindLevel: currentBlinds.level,
      smallBlind: currentBlinds.smallBlind,
      bigBlind: currentBlinds.bigBlind,
      ante: currentBlinds.ante,
      timeUntilBlindIncrease: timeUntilBlindIncrease, // In minutes
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

  activePlayers() {
    return Object.values(this.seats).filter(
      (seat) => seat != null //&& !seat.sittingOut,
    );
  }
}

module.exports = TournamentTable;
