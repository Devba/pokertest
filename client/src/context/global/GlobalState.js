import React, { useState, useEffect } from 'react';
import GlobalContext from './globalContext';

const GlobalState = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [id, setId] = useState(null);
  const [userName, setUserName] = useState(null);
  const [email, setEmail] = useState(null);
  const [chipsAmount, setChipsAmount] = useState(null);
  const [tables, setTables] = useState(null);
  const [players, setPlayers] = useState(null);
  
  // Generate or retrieve fake wallet address
  const generateFakeWallet = () => {
    return 'wallet_' + Math.random().toString(36).substring(2, 15);
  };
  
  const getOrCreateWallet = () => {
    let wallet = localStorage.getItem('fakeWallet');
    if (!wallet) {
      wallet = generateFakeWallet();
      localStorage.setItem('fakeWallet', wallet);
    }
    return wallet;
  };
  
  const [walletAddress, setWalletAddress] = useState(getOrCreateWallet());
  
  // Set a fake username if not set
  useEffect(() => {
    if (!userName) {
      let storedName = localStorage.getItem('fakeUsername');
      if (!storedName) {
        storedName = 'Player_' + Math.random().toString(36).substring(2, 9);
        localStorage.setItem('fakeUsername', storedName);
      }
      setUserName(storedName);
    }
  }, [userName]);

  return (
    <GlobalContext.Provider
      value={{
        isLoading,
        setIsLoading,
        userName,
        setUserName,
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
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};

export default GlobalState;
