import axios from 'axios';
import { toast } from 'react-toastify';

export const useApi = () => {
  const getUserProfile = async (address) => {
    try {
      const { data } = await axios.post(`${process.env.NEXT_PUBLIC_SERVER_URI}/get_profile`, {
        address: address
      }, {
        headers: {
          "Access-Control-Allow-Origin": "*"
        }
      });
      if (data.success) {
        console.log('success', data)
        return data
      } else {
        console.log('error', data)
        return null;
      }
    } catch (err) {
      toast.error(err.message)
      console.log(err)
    }
  }

  const getPokerTables = async (gameId) => {
    try {
      const { data } = await axios.post(`${process.env.NEXT_PUBLIC_SERVER_URI}/get_poker_tables`, {
        gameId: gameId
      }, {
        headers: {
          "Access-Control-Allow-Origin": "*"
        }
      });
      if (data.success) {
        return data.result
      } else {
        toast.error('Failed to load all games.')
        return null;
      }
    } catch (err) {
      toast.error(err.message)
      console.log(err)
    }
  }

  const getGameById = async (gameId) => {
    try {
      const { data } = await axios.post(`${process.env.NEXT_PUBLIC_SERVER_URI}/get_game_by_id`, {
        gameId: gameId
      }, {
        headers: {
          "Access-Control-Allow-Origin": "*"
        }
      });
      if (data.success) {
        return data.result
      } else {
        toast.error('Failed to load all games.')
        return null;
      }
    } catch (err) {
      toast.error(err.message)
      console.log(err)
    }
  }


  // Tournament API functions
  const getTournaments = async (status = null) => {
    try {
      const url = status 
        ? `/api/tournaments/list?status=${status}` 
        : '/api/tournaments/list';
      
      const { data } = await axios.get(url);
      
      if (data.success) {
        return data.tournaments;
      } else {
        toast.error('Failed to load tournaments.');
        return null;
      }
    } catch (err) {
      toast.error(err.message);
      console.log(err);
      return null;
    }
  };

  const getTournamentInfo = async (tournamentId) => {
    try {
      const { data } = await axios.get(`/api/tournaments/${tournamentId}`);
      
      if (data.success) {
        return data.tournament;
      } else {
        toast.error('Failed to load tournament info.');
        return null;
      }
    } catch (err) {
      toast.error(err.message);
      console.log(err);
      return null;
    }
  };

  const getTournamentLeaderboard = async (tournamentId) => {
    try {
      const { data } = await axios.get(`/api/tournaments/${tournamentId}/leaderboard`);
      
      if (data.success) {
        return data.leaderboard;
      } else {
        toast.error('Failed to load leaderboard.');
        return null;
      }
    } catch (err) {
      toast.error(err.message);
      console.log(err);
      return null;
    }
  };

  return {
    getUserProfile,
    getPokerTables,
    getGameById,
    getTournaments,
    getTournamentInfo,
    getTournamentLeaderboard,
  }
}