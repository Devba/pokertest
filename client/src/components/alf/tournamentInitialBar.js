import React from 'react';
import Button from '../buttons/Button';

const TournamentInitialBar = ({
  selectedTournament,
  onClose,
  onRegister,
  onUnregister,
  onDelete,
  onAddBots,
  onStart,
  isUserRegistered,
  navigate,
  socket
}) => {
  if (!selectedTournament) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: '#0f3460',
      padding: '1.5rem',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
      zIndex: 1000
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: '0 0 8px 0' }}>{selectedTournament.name}</h3>
            <p style={{ margin: 0, color: '#aaa' }}>
              Structure: {selectedTournament.structure} | 
              Buy-in: {selectedTournament.buyIn === 0 ? 'FREE' : `$${selectedTournament.buyIn}`} | 
              Prize Pool: ${selectedTournament.prizePool}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Button 
              small 
              secondary 
              onClick={onClose}
            >
              Close
            </Button>
            {(selectedTournament.status === 'registering' || selectedTournament.status === 'upcoming') && (
              <>

               <Button 
                    small 
                    onClick={() => navigate(`/tournament/${selectedTournament.id}?mode=player`)}
                  >
                    Join Table
                  </Button>
                <Button 
                  small 
                  onClick={() => onRegister(selectedTournament.id)}
                >
                  Register Now
                </Button>
                <Button 
                  small 
                  secondary
                  onClick={() => onUnregister(selectedTournament.id)}
                >
                  Unregister
                </Button>
                <Button 
                  small 
                  secondary
                  onClick={() => onDelete(selectedTournament.id)}
                  style={{ backgroundColor: '#d33', borderColor: '#d33' }}
                >
                  Delete
                </Button>
                <Button 
                  small 
                  onClick={() => onAddBots(selectedTournament.id, socket)}
                >
                  Add Bots
                </Button>
                <Button 
                  small 
                  onClick={() => onStart(selectedTournament.id)}
                >
                  Start Tournament
                </Button>
              </>
            )}
            {true && (
              <Button 
                small 
                onClick={() => navigate(`/tournament/${selectedTournament.id}/waiting`)}
              >
                Go to Waiting Room
              </Button>
            )}
            {selectedTournament.status === 'live' && (
              <>
                <Button 
                  small 
                  secondary
                  onClick={() => navigate(`/tournament/${selectedTournament.id}?mode=spectator`)}
                >
                  Watch


                </Button>
                {true  || isUserRegistered(selectedTournament.id) ? (
                  <Button 
                    small 
                    onClick={() => navigate(`/tournament/${selectedTournament.id}?mode=player`)}
                  >
                    Join Table
                  </Button>
                ) : (
                  <Button 
                    small 
                    onClick={() => onRegister(selectedTournament.id)}
                  >
                    Register & Play
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentInitialBar;