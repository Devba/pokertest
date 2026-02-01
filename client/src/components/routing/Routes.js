import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Play from '../../pages/Play';
import NotFoundPage from '../../pages/NotFoundPage';
import ConnectWallet from '../../pages/ConnectWallet';
import TournamentLobby from '../../pages/TournamentLobby';
import TournamentPlay from '../../pages/TournamentPlay';
import TournamentWaitingRoom from '../../pages/TournamentWaitingRoom';

const AppRoutes = () => {

  useEffect(() => {
  }, [])

  return (
    <Routes>
      <Route path="/" element={<ConnectWallet />} />
      <Route path="/play" element={<Play />} />
      <Route path="/welcome" element={<Play />} />
      <Route path="/tournament-lobby" element={<TournamentLobby />} />
      <Route path="/tournament/:tournamentId/waiting" element={<TournamentWaitingRoom />} />
      <Route path="/tournament/:tournamentId" element={<TournamentPlay />} />
      <Route element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRoutes;
