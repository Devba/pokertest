# Session Handoff — 2026-02-14

## Executive Summary
- Fixed a tournament freeze where some tables stopped starting new hands after eliminations/rebalancing.
- Root causes: mid-hand player movement during balancing/consolidation, plus bot flow exiting when `turn` pointed to an invalid seat.
- Backend fixes applied in `TournamentManager` and `BotManager` to defer unsafe moves and recover invalid turn states.
- Stress-tested with `launch-tournament-50-bots-ultrafast.js`; tournament completed with winner and no deadlock signatures in the final run.
- Added this handoff file so next session can continue from verified findings, patch scope, and reproduction commands.

## Objective
Investigate and fix tournament tables getting stuck (hands not restarting), especially after eliminations/rebalancing.

## Root Cause Summary
Two backend race/deadlock paths were identified:

1. **Mid-hand rebalancing/consolidation moved players while action was live**
   - During `balanceTables`, players could be moved from one table to another while a hand was still running.
   - If the moved seat was the current `turn`, bot orchestration later saw an empty turn seat and action could stall.

2. **Bot turn flow exited when turn seat became invalid**
   - In `BotManager.checkAndActForBot`, when `table.turn` pointed to a missing seat, the function returned early.
   - That left some tables with active players but no further progress until manual intervention.

## Code Changes Implemented

### 1) `pokergame/TournamentManager.js`

#### A. Defer consolidation during active hands
- In `balanceTables(tournamentId)`, consolidation now checks whether any table is mid-hand (`!table.handOver`).
- If any table is active, consolidation is deferred with a log line.
- If safe, consolidation runs and then explicitly triggers:
  - `broadcastTournamentUpdate(tournamentId)`
  - `startTablesReadyToPlay(tournamentId)`

#### B. Restrict rebalance moves to between-hands only
- Rebalance move condition now requires:
  - `largestTable.handOver === true`
  - `smallestTable.handOver === true`
- If imbalance exists but either table is mid-hand, move is deferred and logged.

#### C. Harden seat selection for moves
- `movePlayerBetweenTables(...)` now avoids selecting `fromTable.turn` seat while hand is active.
- If a specific socket id is requested but not found, returns `false` safely.
- If no safe seat is available during active hand, move is deferred (returns `false`) instead of forcing a risky move.

### 2) `pokergame/BotManager.js`

#### A. Recover missing turn during active hand
- In `checkAndActForBot(table, tableId)`, if hand is active and `table.turn` is missing:
  - Select first unfolded player as replacement turn.
  - Rebuild seat `turn` flags.
  - Continue bot flow.

#### B. Recover invalid/empty turn seat
- If `table.turn` points to an empty seat:
  - Select a replacement from unfolded players (if possible).
  - Rebuild `turn` flags.
  - Continue execution instead of early return.

This prevents deadlocks caused by transient turn-seat inconsistencies.

## Validation Performed

### Static checks
- `node --check pokergame/TournamentManager.js` ✅
- `node --check pokergame/BotManager.js` ✅

### Runtime stress verification
- Restarted server with fresh `server-logs.txt`.
- Ran `node launch-tournament-50-bots-ultrafast.js`.
- Observed tournament run through to completion with winner.

### Log-based checks
- Confirmed deferral guards are active in logs:
  - `Deferring rebalance ... one table is mid-hand`
  - `Deferring consolidation ... one or more tables are mid-hand`
- Confirmed deadlock signatures are eliminated in final validation run:
  - `no player in seat` count: **0**
  - `no turn set on table` count: **0**
- Spot-checked previously problematic table behavior (`1-3`) and verified it continued across multiple hand numbers before natural elimination progression.

## API/UI Work Context from Earlier in Session
Also added/updated tournament control tooling earlier in this session window:
- Manual start-hand endpoint in `routes/api/tournaments.js`:
  - `POST /api/tournaments/:id/tables/:tableId/start-hand`
- Start-hand controls in monitor UIs (`AdminMonitor`, WR chart panel), plus lint/a11y cleanup.

> Note: `WRChartHandStacks.js` had multiple user-requested revert cycles during debugging; confirm latest desired state before further UI edits in next session.

## Current Git Working Tree Snapshot
From `git status --short` at handoff time:
- `M pokergame/BotManager.js`
- `M pokergame/TournamentManager.js`
- Other non-session files also present in status:
  - `D launch-tournament-60-bots-every-10min.js`
  - `M tournament-60-bots-5min.json`
  - `?? launch-tournament-60-bots-every-30min.js`

## Recommended Next Steps (Next Session)
1. Run a longer scenario (`launch-tournament-60-bots-5min.js`) and collect 15–30 min logs.
2. Add lightweight counters/structured logs for:
   - rebalance defer events,
   - turn recovery events,
   - hand-start latency per table.
3. If desired, add a small admin diagnostic endpoint summarizing per-table state (`handOver`, `turn`, active players, last hand start time).

## Quick Repro / Verify Commands
```bash
# 1) Start clean server log
pkill -f "node server.js" 2>/dev/null || true
sleep 1
rm -f server-logs.txt
NODE_ENV=development node server.js > server-logs.txt 2>&1 &

# 2) Launch stress tournament
node launch-tournament-50-bots-ultrafast.js

# 3) Check key symptoms
grep -c "no player in seat" server-logs.txt
grep -c "no turn set on table" server-logs.txt
grep -nE "Deferring rebalance|Deferring consolidation" server-logs.txt | tail -50
```
