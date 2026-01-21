const path = require("path");
const express = require("express");
const config = require("./config");
const connectDB = require('./config/db');
const configureMiddleware = require("./middleware");
const configureRoutes = require("./routes");
const socketio = require("socket.io");
const gameSocket = require("./socket/index");

// Connect and get reference to mongodb instance
let db;

 (async function () {
   db = await connectDB();
 })();

// Init express app
const app = express();

// Config Express-Middleware
configureMiddleware(app);

// Set-up Routes
configureRoutes(app);

// Start server and listen for connections
const server = app.listen(config.PORT, () => {
    console.log(
        `Server is running in ${config.NODE_ENV} mode and is listening on port ${config.PORT}...`
    );
});

//  Handle real-time poker game logic with socket.io
const io = socketio(server);

io.on("connect", (socket) => gameSocket.init(socket, io));

// Initialize bot API routes after socket is set up
const { initBotRoutes } = require('./routes/api/bots');
const { initTournamentRoutes } = require('./routes/api/tournaments');
setTimeout(() => {
    initBotRoutes(gameSocket);
    console.log('🤖 Bot API routes initialized');
    
    initTournamentRoutes(gameSocket);
    console.log('🏆 Tournament API routes initialized');
}, 1000);

// Optional: Add bots to tables on server start (after a delay to ensure initialization)
// Uncomment the code below to auto-populate tables with bots

false && setTimeout(() => {
    if (gameSocket.botManager) {
        console.log('🤖 Adding bots to tables...');
        
        // Add bots to table 1
       // gameSocket.botManager.fillTableWithBots(1, 4); // Fill to 4 players
        
        // Or add specific bots with different strategies:
        // botManager.addBotToTable(1, 'tight');
        // botManager.addBotToTable(1, 'aggressive');
         gameSocket.botManager.addBotToTable(1, 'loose');
        
        console.log('✅ Bots added successfully');
    }
}, 5000); // Wait 2 seconds for full initialization


// Error handling - close server
process.on("unhandledRejection", (err) => {
    // db.disconnect();

    console.error(`Error: ${err.message}`);
    server.close(() => {
        process.exit(1);
    });
});
