import Swal from 'sweetalert2';
import React, { useContext, useEffect, useState } from 'react'

import globalContext from './../../context/global/globalContext'

// Remove useContext calls from the top level; use them inside a component or hook as needed.
// Example usage inside a component:
 //const { userNamev2, setWalletAddress, walletAdres } = useContext(globalContext);

// Usage: call showWelcome(navigate) from a React component, passing the navigate function from useNavigate
export const showWelcome = (navigate) => {
  // Ensure Lordicon script is loaded
  if (!document.querySelector('script[src="https://cdn.lordicon.com/lordicon.js"]')) {
    const script = document.createElement('script');
    script.src = 'https://cdn.lordicon.com/lordicon.js';
    script.async = true;
    document.body.appendChild(script);
  }

  // Get username and wallet address from localStorage
  const username = localStorage.getItem('userNamev2') || 'N/A';
  const wallet = localStorage.getItem('wallet') || 'N/A';

  Swal.fire({
    title: 'Welcome!',
    html: `
      <div style="display:flex;justify-content:center;align-items:center;flex-direction:column;">
        <lord-icon
          src="https://cdn.lordicon.com/daeumrty.json"
          trigger="loop"
          style="width:250px;height:250px;">
        </lord-icon>
        <div style="margin-top:1em;font-size:1.2em;">Enjoy the Poker Lobby!</div>
        <div style="margin-top:0.5em;font-size:1em;color:#0984e3;">Username: <b>${username}</b></div>
        <div style="margin-top:0.2em;font-size:0.95em;color:#00b894;">Wallet: <b>${wallet}</b></div>
      </div>
    `,
    showConfirmButton: false,
    timer: 5000,
    timerProgressBar: true,
    allowOutsideClick: false,
    didClose: () => {
      if (navigate) navigate('/tournament-lobby');
    }
  });
};