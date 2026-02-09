import React from 'react';
import Swal from 'sweetalert2';

export async function showCreateTournamentForm(walletAddress) {
  const result = await Swal.fire({
    title: 'Create New Tournament',
    html: `
      <div style="text-align: left; padding: 0.5rem;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
          <div>
            <label style="display: block; margin-bottom: 0.3rem; font-weight: bold;">Tournament Name</label>
            <input id="tournament-name" class="swal2-input" type="text" placeholder="My Tournament" style="width: 100%; margin: 0;" />
          </div>
          <div>
            <label style="display: block; margin-bottom: 0.3rem; font-weight: bold;">Prize Pool ($)</label>
            <input id="prize-pool" class="swal2-input" type="number" placeholder="0" min="0" style="width: 100%; margin: 0;" />
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
          <div>
            <label style="display: block; margin-bottom: 0.3rem; font-weight: bold;">Buy-in Amount ($)</label>
            <input id="buy-in" class="swal2-input" type="number" placeholder="0" min="0" style="width: 100%; margin: 0;" />
          </div>
          <div>
            <label style="display: block; margin-bottom: 0.3rem; font-weight: bold;">Max Players</label>
            <select id="max-players" class="swal2-input" style="width: 100%; margin: 0;">
              <option value="50">50</option>
              <option value="100" selected>100</option>
              <option value="200">200</option>
              <option value="500">500</option>
            </select>
          </div>
          <div>
            <label style="display: block; margin-bottom: 0.3rem; font-weight: bold;">Starting Chips</label>
            <select id="starting-chips" class="swal2-input" style="width: 100%; margin: 0;">
              <option value="50">50</option>  
              <option value="1000">1,000</option>
              <option value="5000" selected>5,000</option>
              <option value="10000">10,000</option>
              <option value="20000">20,000</option>
            </select>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
          <div>
            <label style="display: block; margin-bottom: 0.3rem; font-weight: bold;">Blind Structure</label>
            <select id="blind-structure" class="swal2-input" style="width: 100%; margin: 0;">
              <option value="normal" selected>Normal (10 hands/level)</option>
              <option value="turbo">Turbo (5 hands/level)</option>
              <option value="hyper">Hyper Turbo (3 hands/level)</option>
            </select>
          </div>
          <div>
            <label style="display: block; margin-bottom: 0.3rem; font-weight: bold;">Registration Period</label>
            <select id="registration-period" class="swal2-input" style="width: 100%; margin: 0;">
              <option value="0">No Late Registration</option>
              <option value="5" selected>5 minutes</option>
              <option value="10">10 minutes</option>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
            </select>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
          <div>
            <label style="display: block; margin-bottom: 0.3rem; font-weight: bold;">Starting Blind Level</label>
            <select id="starting-blind-level" class="swal2-input" style="width: 100%; margin: 0;">
              <option value="1" selected>Level 1</option>
              <option value="2">Level 2</option>
              <option value="3">Level 3</option>
              <option value="4">Level 4</option>
              <option value="5">Level 5</option>
              <option value="6">Level 6</option>
              <option value="7">Level 7</option>
              <option value="8">Level 8</option>
              <option value="9">Level 9</option>
              <option value="10">Level 10</option>
            </select>
          </div>
          <div>
            <label style="display: block; margin-bottom: 0.3rem; font-weight: bold;">Start Time</label>
            <select id="start-time" class="swal2-input" style="width: 100%; margin: 0;">
              <option value="immediate" selected>Start Immediately</option>
              <option value="5">In 5 minutes</option>
              <option value="15">In 15 minutes</option>
              <option value="30">In 30 minutes</option>
              <option value="60">In 1 hour</option>
            </select>
          </div>
        </div>
        <div style="margin-bottom: 1rem;">
          <label style="display: block; margin-bottom: 0.3rem; font-weight: bold;">
            <input type="checkbox" id="add-bots-checkbox" style="margin-right: 0.5em;" />
            Add Bots to Tournament
          </label>
          <input 
            id="bots-count" 
            class="swal2-input" 
            type="number" 
            placeholder="Number of bots" 
            min="1" 
            max="50" 
            value="2"
            style="width: 100%; margin: 0; display: none;" 
          />
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'Create Tournament',
    cancelButtonText: 'Cancel',
    width: '700px',
    didOpen: () => {
      const checkbox = document.getElementById('add-bots-checkbox');
      const botsInput = document.getElementById('bots-count');
      if (checkbox && botsInput) {
        checkbox.addEventListener('change', function() {
          botsInput.style.display = this.checked ? 'block' : 'none';
        });
      }
    },
    preConfirm: () => {
      const name = document.getElementById('tournament-name').value;
      const prizePool = document.getElementById('prize-pool').value;
      const buyIn = document.getElementById('buy-in').value;
      const maxPlayers = document.getElementById('max-players').value;
      const startingChips = document.getElementById('starting-chips').value;
      const blindStructure = document.getElementById('blind-structure').value;
      const registrationPeriod = document.getElementById('registration-period').value;
      const startTime = document.getElementById('start-time').value;
      const startingBlindLevel = document.getElementById('starting-blind-level').value;
      const addBots = document.getElementById('add-bots-checkbox').checked;
      const botsCount = addBots ? parseInt(document.getElementById('bots-count').value) || 0 : 0;

      if (!name) {
        Swal.showValidationMessage('Please enter a tournament name');
        return false;
      }

      return {
        name,
        prizePool: parseFloat(prizePool) || 0,
        buyIn: parseFloat(buyIn) || 0,
        maxPlayers: parseInt(maxPlayers),
        startingChips: parseInt(startingChips),
        blindStructure,
        registrationPeriod: parseInt(registrationPeriod),
        startTime,
        startingBlindLevel: parseInt(startingBlindLevel),
        addBots,
        botsCount,
        creatorWallet: walletAddress
      };
    }
  });

  return result;
}