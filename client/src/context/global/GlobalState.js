import React, { useState, useEffect } from 'react';
import GlobalContext from './globalContext';

const GlobalState = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [id, setId] = useState(null);
  const [userNamev2, setUserNamev2] = useState(null);
  const [email, setEmail] = useState(null);
  const [chipsAmount, setChipsAmount] = useState(null);
  const [tables, setTables] = useState(null);
  const [players, setPlayers] = useState(null);
  const [playersW, setPlayersW] = useState(null);
  
  
  // Generate or retrieve fake wallet address
  const generateFakeWallet = () => {
    return 'wallalf_' + Math.random().toString(36).substring(2, 15);
  };
  
  const getOrCreateWallet = () => {
    let wallet = localStorage.getItem('wallet');
    if (!wallet) {
      wallet = generateFakeWallet();
      localStorage.setItem('wallet', wallet);
    }
    return wallet;
  };
  
  const [walletAddress, setWalletAddress] = useState(getOrCreateWallet());
  
  // Set a fake username if not set
  useEffect(() => {
    console.log("userNamev2: alf empty effect", userNamev2);

    if (!userNamev2){

    } else 
   {
    localStorage.setItem("userNamev2", userNamev2); 
    
   }



    return
    if (!userNamev2) {
      let storedName = localStorage.getItem('fakeUsername');
      if (!storedName) {
        storedName = 'Player_' + Math.random().toString(36).substring(2, 9);
        localStorage.setItem('fakeUsername', storedName);
      }
      setUserNamev2(storedName);
    }
  }, [userNamev2]);

  return (
    <GlobalContext.Provider
      value={{
        isLoading,
        setIsLoading,
        userNamev2,
        setUserNamev2,
        email,
        setEmail,
        chipsAmount,
        setChipsAmount,
        id,
        setId,
        tables,
        setTables,
        players,
        setPlayers,
        walletAddress,
        setWalletAddress,
        playersW,setPlayersW
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};

export default GlobalState;
