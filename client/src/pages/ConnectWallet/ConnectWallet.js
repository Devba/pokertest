import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocation } from 'react-router-dom';
import Swal from 'sweetalert2'
import globalContext from './../../context/global/globalContext'
import LoadingScreen from '../../components/loading/LoadingScreen'
import { showWelcome } from '../../components/alf/Welcome';

import socketContext from '../../context/websocket/socketContext'
import { CS_FETCH_LOBBY_INFO } from '../../pokergame/actions'
import './ConnectWallet.scss'

//import { set } from 'core-js/core/dict';

const ConnectWallet = () => {
  const { setWalletAddress } = useContext(globalContext)
  //const { setUserName } = useContext(globalContext)
  const { setUserNamev2 } = useContext(globalContext)
  const {userNamev2} = useContext(globalContext)
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
      //const username = 'frommm' //`Player_${walletAddress.slice(2, 8)}`
      const gameId = '1'

      setIsLoading(false)

      //setUserNamev2("alvaro")
      console.log ("userNamev2: alf metamask", userNamev2);
      setWalletAddress(walletAddress)
      
      // Esperar a que el socket se conecte antes de emitir
     if(socket !== null && socket.connected === true){
      //alert("userv2" +localStorage.getItem("userNamev2"))
      let unv2=localStorage.getItem("userNamev2");
      if(!unv2 || unv2==="undefined"){
      } else {
        //alert("userv2 existe:"+unv2)
        //showWelcome(navigate);
         if (window.Swal) window.Swal.close && window.Swal.close();
        navigate('/tournament-lobby')
        return
      }
     

      const username = await askUserName();



      
        socket.emit(CS_FETCH_LOBBY_INFO, { walletAddress, socketId: socket.id, gameId, username })
        console.log('MetaMask login:', { walletAddress, userNamev2, gameId })
        localStorage.setItem("wallet", walletAddress)
        localStorage.setItem("Username", username)
        setUserNamev2(username)

        if(!localStorage.getItem("Username")){
          
          localStorage.setItem("Username", username)
        navigate('/tournament-lobby')
      } else {
        setTimeout(() => {
          if(socket !== null && socket.connected === true){
            socket.emit(CS_FETCH_LOBBY_INFO, { walletAddress, socketId: socket.id, gameId, username })
            navigate('/tournament-lobby')
          }
        }, 1000)
        
      }
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
  const handleAutoLogin = async () => {
    const result = await Swal.fire({
      title: 'Enter Your Name',
      input: 'text',
      inputLabel: 'Your username',
      inputPlaceholder: 'Enter your username',
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) {
          return 'You need to enter a username!'
        }
        if (value.length < 3) {
          return 'Username must be at least 3 characters long'
        }
        if (value.length > 20) {
          return 'Username must be less than 20 characters'
        }
      }
    })

    if (!result.isConfirmed) {
      return
    }

    const walletAddress = generateRandomWallet()
    const username = result.value
    const gameId = '1' // ID del juego predeterminado
    
    //setIsLoading(true)
    setWalletAddress(walletAddress)
    setUserNamev2(username)
    
    // Esperar a que el socket se conecte antes de emitir
    if(socket !== null && socket.connected === true){
      setIsLoading(false) 
      socket.emit(CS_FETCH_LOBBY_INFO, { walletAddress, socketId: socket.id, gameId, username })
      console.log('Auto-login:', { walletAddress, username, gameId })
      navigate('/tournament-lobby')
    } else {
      setTimeout(() => {
        if(socket !== null && socket.connected === true){
          socket.emit(CS_FETCH_LOBBY_INFO, { walletAddress, socketId: socket.id, gameId, username })
          //showWelcome(navigate);
        }
      }, 1000)
    }


  }

  useEffect(() => {

    setIsLoading(true)
    
    if(socket !== null && socket.connected === true){
      //setIsLoading(false)
      const walletAddress = localStorage.getItem("wallet")//query.get('walletAddress')
      const gameId = localStorage.getItem("gameId")//query.get('gameId')
      const userNamev2 = localStorage.getItem("userNamev2")// query.get('username')
      console.log("userNamev2: alf useeffect", userNamev2);
      return ; // no hacemos nada x ahora 
      
      //handleMetaMaskLogin()
      if(walletAddress  && userNamev2){


       
        console.log(userNamev2)
        setWalletAddress(walletAddress)
        setUserNamev2(userNamev2)
        socket.emit(CS_FETCH_LOBBY_INFO, { walletAddress, socketId: socket.id, gameId, userNamev2 })
        console.log(CS_FETCH_LOBBY_INFO, { walletAddress, socketId: socket.id, gameId, userNamev2 })
        alert("Welcome "+userNamev2);
        Swal.close();
        
        navigate('/tournament-lobby')
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

  useEffect(() => {
    if (!isLoading) {
      Swal.fire({
        title: 'Poker Game',
        html: `
          <button id="metamask-btn" style="padding:12px 24px;font-size:16px;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:bold;min-width:250px;background:#f6851b;margin-bottom:10px;">🦊 Conectar con MetaMask</button><br/>
          <div style="margin:10px 0;color:#666;font-size:14px;">o</div>
          <button id="auto-btn" style="padding:12px 24px;font-size:16px;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:bold;min-width:250px;background:#007bff;margin-bottom:10px;">Iniciar Juego Automáticamente</button><br/>
          <button id="tournament-btn" style="padding:12px 24px;font-size:16px;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:bold;min-width:250px;background:#28a745;">🏆 Tournament Lobby</button>
        `,
        showConfirmButton: false,
        allowOutsideClick: false,
        didOpen: () => {
          const mmBtn = document.getElementById('metamask-btn');
          const autoBtn = document.getElementById('auto-btn');
          const tourBtn = document.getElementById('tournament-btn');
          if (mmBtn) mmBtn.onclick = () => { Swal.close(); handleMetaMaskLogin(); };
          if (autoBtn) autoBtn.onclick = () => { Swal.close(); handleAutoLogin(); };
          if (tourBtn) tourBtn.onclick = () => { Swal.close(); navigate('/tournament-lobby'); };
        }
      });
    } else {

      showWelcome(navigate)
      
       
    }
  }, [isLoading, navigate]);

  return (
    <>
      {isLoading ? (
        <LoadingScreen message="Connecting to wallet..." />
      ) : null}
    </>
  );
  
}



// Reusable function to prompt user for their name
const askUserName = async () => {
  const result = await Swal.fire({
    title: 'Enter Your Name',
    input: 'text',
    inputLabel: 'Your username',
    inputPlaceholder: 'Enter your username',
    showCancelButton: true,
    inputValidator: (value) => {
      if (!value) {
        return 'You need to enter a username!';
      }
      if (value.length < 3) {
        return 'Username must be at least 3 characters long';
      }
      if (value.length > 20) {
        return 'Username must be less than 20 characters';
      }
    }
  });
  if (!result.isConfirmed) {
    return null;
  }
  return result.value;
};

export default ConnectWallet
