# Session Handoff — 2026-02-13

## What was implemented

### Waiting Room hand history improvements
- Added table selector for hand history in waiting room.
- Fixed selector stability by normalizing table IDs (string-safe matching).
- Added selected table context in hand history title.
- Improved hand details shown:
  - Phase (Preflop / Flop / Turn / River)
  - Pot
  - Board
  - Win message
- Added stack delta summary per hand (vs previous hand snapshot).
- Colored stack deltas by sign and magnitude gradient.
- Sorted stack delta list by absolute movement (biggest movers first).
- Removed old players detail list in favor of stack delta list.

Files touched:
- client/src/pages/TournamentWaitingRoom.js
- client/src/components/alf/WR/WRHandHistory.js

### Tournament auto-launch scheduler
- Added recurring script to launch 60-bot tournament every 10 minutes.
- Uses existing config from tournament-60-bots-5min.json.
- Adds clear lobby naming format with timestamp:
  - <base-name> | AUTO-10M | YYYY-MM-DD HH:mm
- Runs first launch immediately, then every 10 min.
- Graceful shutdown on SIGINT/SIGTERM.

Files added:
- launch-tournament-60-bots-every-10min.js

Validation:
- node --check launch-tournament-60-bots-every-10min.js passed.

### Lobby UI size tweak
- Reduced tournament title font size in list cards.

File touched:
- client/src/components/alf/TournamentList.js

## Where to continue next time
- Optionally add npm script for scheduler:
  - auto:60bots:10m -> node launch-tournament-60-bots-every-10min.js
- Optionally tune title font size further if needed.
- Optionally add “Top movers” label in WR hand-history stack delta block.

## Quick run commands
- Scheduler:
  - node launch-tournament-60-bots-every-10min.js
- Existing one-shot 60 bots:
  - node launch-tournament-60-bots-5min.js
