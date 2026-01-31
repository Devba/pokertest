# Copilot Instructions for Poker Bot System

## Project Overview
- This is a full-stack poker application with an integrated AI bot system.
- The backend (Node.js/Express) manages game logic, bot orchestration, and exposes REST APIs.
- The frontend (React, in `client/`) provides the user interface.
- AI bots have multiple strategies and play autonomously alongside real players.

## Key Architectural Concepts
- **BotManager (`pokergame/BotManager.js`)**: Central controller for creating, managing, and triggering bot actions. Handles lifecycle and table assignments.
- **Bot (`pokergame/Bot.js`)**: Implements AI logic, strategies, and poker decision-making.
- **Game Logic**: Core poker mechanics in `pokergame/Table.js`, `pokergame/Seat.js`, etc. Bots interact with these via the same interfaces as real players.
- **API Layer**: REST endpoints for bot management in `routes/api/bots.js` (add, fill, remove bots, etc.).
- **Socket.IO**: Real-time updates and game state changes are broadcast to all players (bots and humans) via `socket/index.js`.

## Developer Workflows
- **Install dependencies**:
  - Server: `npm install --force`
  - Client: `cd client && npm install --force`
- **Run server**: `npm start` (from project root)
- **Run client**: `cd client && npm start`
- **Test bots**: `node test-bot.js` (verifies bot logic and integration)
- **Add bots**:
  - Via API: `POST /api/bots/add` or `/api/bots/fill` (see `BOT_API_REFERENCE.md`)
  - In code: Use `botManager.addBotToTable(tableId, strategy)`

## Project-Specific Patterns & Conventions
- **Bot strategies**: Five types (`tight`, `loose`, `aggressive`, `passive`, `balanced`). See `pokergame/Bot.js` for thresholds and logic.
- **Bot actions**: Triggered automatically on turn change; see `BotManager.checkAndActForBot()`.
- **Integration**: Bots use the same game logic as real players—no special-case code in core game files.
- **Testing**: Use `test-bot.js` for headless bot testing; see `BOT_README.md` for details.
- **Docs**: Key documentation in `BOT_README.md`, `BOT_API_REFERENCE.md`, `BOT_ARCHITECTURE.md`, and `POKER_BOT_SUMMARY.md`.

## Examples
- To fill a table with 5 bots via API:
  ```bash
  curl -X POST http://localhost:5000/api/bots/fill \
    -H "Content-Type: application/json" \
    -d '{"tableId": 1, "targetCount": 5}'
  ```
- To add a bot in code:
  ```js
  const { botManager } = require('./socket');
  botManager.addBotToTable(1, 'aggressive');
  ```

## Integration Points
- **BotManager <-> Table**: Bots are assigned to tables and act via the same methods as human players.
- **API <-> BotManager**: All bot management endpoints delegate to BotManager.
- **Socket.IO**: All state changes (including bot actions) are broadcast to clients.

## Tips for AI Agents
- Always use existing interfaces for bots—do not bypass game logic.
- Reference the documentation files for up-to-date API and architecture details.
- When adding new bot strategies, update both `Bot.js` and documentation.
- For new endpoints, follow the REST patterns in `routes/api/bots.js`.
