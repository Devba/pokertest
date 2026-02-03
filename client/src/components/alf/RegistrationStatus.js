import React from 'react'
import Button from '../../components/buttons/Button'
import Swal from 'sweetalert2'

const RegistrationStatus = ({
  isUserRegistered,
  tournament,
  walletAddress,
  socket,
  tournamentId
}) => {
  if (!tournament) return null

  const handleRegister = async () => {
   // let playerUsername = localStorage.getItem('username')
    let playerUsername = localStorage.getItem('usernamev2')
    if (!playerUsername || playerUsername.trim() === '') {
      const { value: enteredUsername } = await Swal.fire({
        title: 'Enter Your Username',
        input: 'text',
        inputLabel: 'Choose a username for the tournament',
        inputPlaceholder: 'Enter your username',
        showCancelButton: true,
        confirmButtonText: 'Register',
        cancelButtonText: 'Cancel',
        inputValidator: (value) => {
          if (!value) {
            return 'You need to enter a username!'
          }
          if (value.length < 3) {
            return 'Username must be at least 3 characters!'
          }
          if (value.length > 20) {
            return 'Username must be less than 20 characters!'
          }
        }
      })

      if (!enteredUsername) {
        return
      }

      playerUsername = enteredUsername
    }
    let userWallet = walletAddress
    if (!userWallet || userWallet.trim() === '') {
      userWallet = 'wallet_' + Math.random().toString(36).substring(2, 15)
    }
    if (socket) {
      socket.emit('REGISTER_TOURNAMENT', { 
        tournamentId: parseInt(tournamentId), 
        walletAddress: userWallet,
        username: playerUsername
      })
      Swal.fire({
        title: 'Registering...',
        text: 'Please wait while we register you for the tournament',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading()
        }
      })
    }
  }

/*
 const handleRegister2 = async (tournamentId) => {
    console.log('handleRegister called with:', tournamentId, 'socket:', !!socket, 'walletAddress:', walletAddress);
    
    // Check if username is set, if not ask for it
    let playerUsername = username;
    if (!playerUsername || playerUsername.trim() === '') {
      const { value: enteredUsername } = await Swal.fire({
        title: 'Enter Your Username',
        input: 'text',
        inputLabel: 'Choose a username for the tournament',
        inputPlaceholder: 'Enter your username',
        showCancelButton: true,
        confirmButtonText: 'Register',
        cancelButtonText: 'Cancel',
        inputValidator: (value) => {
          if (!value) {
            return 'You need to enter a username!'
          }
          if (value.length < 3) {
            return 'Username must be at least 3 characters!'
          }
          if (value.length > 20) {
            return 'Username must be less than 20 characters!'
          }
        }
      });

      if (!enteredUsername) {
        // User cancelled
        return;
      }

      playerUsername = enteredUsername;
    }
    
    // Generate random wallet if not present
    let userWallet = localStorage.getItem('wallet');
    if (  !userWallet || userWallet.trim() === '') {
      userWallet = 'wallet_' + Math.random().toString(36).substring(2, 15);

        localStorage.setItem('socketId', socket.id);         // Save current socket id
          localStorage.setItem('wallet', userWallet);       // Save wallet address
          localStorage.setItem('username', playerUsername);  
            localStorage.setItem('TournamentId', tournamentId);   
     
      console.log('wallet from LS :', userWallet);
    }
   
    
    // Emit socket event to register for tournament
    if (socket) {
      socket.emit('REGISTER_TOURNAMENT', { 
        tournamentId, 
        walletAddress: userWallet,
        username: playerUsername,socketId: localStorage.getItem('socketId')
      })
      console.log('Registering for tournament:', tournamentId, 'with wallet:', userWallet, 'username:', playerUsername)
      
      // Save to localStorage
              // Save tournament ID
              


// Show loading toast
      Swal.fire({
        title: 'Registering...',
        text: 'Please wait while we register you for the tournament',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading()
        }
      })
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'Cannot Register',
        text: 'Not connected to server'
      })
    }
  }
*/

  if (!isUserRegistered && tournament.status === 'registering') {
    return (
      <div style={{ 
        textAlign: 'center',
        padding: '1.5rem',
        backgroundColor: 'rgba(231, 76, 60, 0.1)',
        borderRadius: '8px',
        marginBottom: '2rem',
        border: '2px solid rgba(231, 76, 60, 0.3)'
      }}>
        <p style={{ margin: '0 0 1rem 0', color: '#e74c3c', fontSize: '1.125rem' }}>
          ⚠️ You are not registered for this tournament
        </p>
        <Button
          onClick={handleRegister}
        >
          Register Now
        </Button>
      </div>
    )
  }

  if (isUserRegistered) {
    return (
      <div style={{ 
        textAlign: 'center',
        padding: '1.5rem',
        backgroundColor: 'rgba(39, 174, 96, 0.1)',
        borderRadius: '8px',
        marginBottom: '2rem',
        border: '2px solid rgba(39, 174, 96, 0.3)'
      }}>
        <p style={{ margin: 0, color: '#27ae60', fontSize: '1.125rem' }}>
          ✓ You are registered and ready to play!
        </p>
      </div>
    )
  }

  return null
}

export default RegistrationStatus
