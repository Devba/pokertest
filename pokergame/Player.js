class Player {
  constructor(socketId, playerId, playerName, chipsAmount,isBot=false,actualsockID="XXX") {
    this.socketId = socketId;
    this.id = playerId;
    this.name = playerName;
    this.bankroll = chipsAmount;
    this.isBot = isBot;
    this.actualsockID=actualsockID; //alf, para torneos, guardamos el socket real
  }
}

module.exports = Player;
