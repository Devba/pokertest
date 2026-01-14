import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocation } from 'react-router-dom';
import Swal from 'sweetalert2'
import globalContext from './../../context/global/globalContext'
import LoadingScreen from '../../components/loading/LoadingScreen'

import socketContext from '../../context/websocket/socketContext'
import { CS_FETCH_LOBBY_INFO } from '../../pokergame/actions'
import './ConnectWallet.scss'

const ConnectWallet = () => {
  const { setWalletAddress, setChipsAmount } = useContext(globalContext)
  const { socket } = useContext(socketContext)
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const useQuery = () => new URLSearchParams(useLocation().search);
  let query = useQuery()

  // Generar wallet automática
  const generateRandomWallet = () => {
    return '0x' + Array.from({length: 40}, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('')
  }

  // Generar username aleatorio
  const generateRandomUsername = () => {
    const adjectives = ['Happy', 'Lucky', 'Clever', 'Brave', 'Swift', 'Bold']
    const nouns = ['Player', 'Gambler', 'Poker', 'Dealer', 'Ace', 'King']
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
    const noun = nouns[Math.floor(Math.random() * nouns.length)]
    const num = Math.floor(Math.random() * 999)
    return `${adj}${noun}${num}`
  }
  
  // Conectar con MetaMask
  const handleMetaMaskLogin = async () => {
    if (typeof window.ethereum === 'undefined') {
      Swal.fire({
        icon: 'error',
        title: 'MetaMask no detectado',
        text: 'Por favor instala MetaMask para continuar',
      })
      return
    }

    try {
      setIsLoading(true)
      
      // Solicitar acceso a la cuenta
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      })
      
      const walletAddress = accounts[0]
      const username = `Player_${walletAddress.slice(2, 8)}`
      const gameId = '1'
      
      setWalletAddress(walletAddress)
      
      // Esperar a que el socket se conecte antes de emitir
      if(socket !== null && socket.connected === true){
        socket.emit(CS_FETCH_LOBBY_INFO, { walletAddress, socketId: socket.id, gameId, username })
        console.log('MetaMask login:', { walletAddress, username, gameId })
        navigate('/play')
      } else {
        setTimeout(() => {
          if(socket !== null && socket.connected === true){
            socket.emit(CS_FETCH_LOBBY_INFO, { walletAddress, socketId: socket.id, gameId, username })
            navigate('/play')
          }
        }, 1000)
      }
    } catch (error) {
      console.error('Error conectando con MetaMask:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'No se pudo conectar con MetaMask',
      })
      setIsLoading(false)
    }
  }

  // Función para iniciar sesión automáticamente
  const handleAutoLogin = () => {
    const walletAddress = generateRandomWallet()
    const username = generateRandomUsername()
    const gameId = '1' // ID del juego predeterminado
    
    setIsLoading(true)
    setWalletAddress(walletAddress)
    
    // Esperar a que el socket se conecte antes de emitir
    if(socket !== null && socket.connected === true){
      socket.emit(CS_FETCH_LOBBY_INFO, { walletAddress, socketId: socket.id, gameId, username })
      console.log('Auto-login:', { walletAddress, username, gameId })
      navigate('/play')
    } else {
      setTimeout(() => {
        if(socket !== null && socket.connected === true){
          socket.emit(CS_FETCH_LOBBY_INFO, { walletAddress, socketId: socket.id, gameId, username })
          navigate('/play')
        }
      }, 1000)
    }
  }

  useEffect(() => {
    if(socket !== null && socket.connected === true){
      const walletAddress = query.get('walletAddress')
      const gameId = query.get('gameId')
      const username = query.get('username')
      if(walletAddress && gameId && username){
        console.log(username)
        setWalletAddress(walletAddress)
        socket.emit(CS_FETCH_LOBBY_INFO, { walletAddress, socketId: socket.id, gameId, username })
        console.log(CS_FETCH_LOBBY_INFO, { walletAddress, socketId: socket.id, gameId, username })
        navigate('/play')
      }
    }
  }, [socket])

  const buttonStyle = {
    padding: '12px 24px',
    fontSize: '16px',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    minWidth: '250px'
  }

  return (
    <>
      {isLoading ? (
        <LoadingScreen />
      ) : (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <h1>Poker Game</h1>
          
          <button 
            onClick={handleMetaMaskLogin}
            style={{
              ...buttonStyle,
              backgroundColor: '#f6851b'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#e2761b'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#f6851b'}
          >
            🦊 Conectar con MetaMask
          </button>

          <div style={{ 
            margin: '10px 0', 
            color: '#666',
            fontSize: '14px' 
          }}>
            o
          </div>
          
          <button 
            onClick={handleAutoLogin}
            style={{
              ...buttonStyle,
              backgroundColor: '#007bff'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#0056b3'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#007bff'}
          >
            Iniciar Juego Automáticamente
          </button>
        </div>
      )}
    </>
  )
}

export default ConnectWallet
