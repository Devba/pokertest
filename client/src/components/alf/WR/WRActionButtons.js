import React from 'react'
import PropTypes from 'prop-types'
import Button from '../../buttons/Button'
import Swal from 'sweetalert2'

const WRActionButtons = ({ tournamentStatus, socket, tournamentId, handleLeave, navigate }) => {
  return (
    <div style={{
      display: 'flex',
      gap: '0.5rem',
      marginBottom: '2rem',
      flexWrap: 'wrap',
    }}>
      {tournamentStatus === 'registering' && (
        <>
          <Button
            small
            onClick={async () => {
              const { value: botCount } = await Swal.fire({
                title: 'Add Bots',
                input: 'number',
                inputLabel: 'How many bots to add?',
                inputValue: 2,
                inputAttributes: { min: 1, max: 10, step: 1 },
                showCancelButton: true,
                confirmButtonText: 'Add Bots'
              })

              if (botCount && socket) {
                socket.emit('ADD_BOTS_TO_TOURNAMENT', {
                  tournamentId: parseInt(tournamentId),
                  botCount: parseInt(botCount)
                })

                Swal.fire({
                  title: 'Adding Bots...',
                  text: 'Please wait',
                  allowOutsideClick: false,
                  didOpen: () => { Swal.showLoading() }
                })
              }
            }}
          >
            Add Bots
          </Button>

          <Button
            small
            onClick={() => {
              if (socket) {
                socket.emit('START_TOURNAMENT', { tournamentId: parseInt(tournamentId) })
                Swal.fire({ title: 'Starting Tournament...', text: 'The tournament is being started', timer: 2000, showConfirmButton: false })
              }
            }}
          >
            Start Now
          </Button>

          <Button
            small
            secondary
            onClick={async () => {
              const result = await Swal.fire({
                title: 'Delete Tournament?',
                text: 'This action cannot be undone!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Yes, delete it!',
                cancelButtonText: 'Cancel'
              })

              if (result.isConfirmed && socket) {
                socket.emit('DELETE_TOURNAMENT', { tournamentId: parseInt(tournamentId) })

                Swal.fire({ title: 'Deleting...', text: 'Please wait', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } })
              }
            }}
            style={{ backgroundColor: '#d33', borderColor: '#d33' }}
          >
            Delete
          </Button>
        </>
      )}

      <Button secondary onClick={handleLeave}>
        Leave
      </Button>
      {tournamentStatus === 'live' && (
        <Button onClick={() => navigate(`/tournament/${tournamentId}?mode=spectator`)}>
          Watch
        </Button>
      )}
      {tournamentStatus === 'live' && (
        <Button onClick={() => navigate(`/tournament/${tournamentId}?mode=player`)}>
          Play
        </Button>
      )}
    </div>
  )
}

WRActionButtons.propTypes = {
  tournamentStatus: PropTypes.string,
  socket: PropTypes.object,
  tournamentId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  handleLeave: PropTypes.func,
  navigate: PropTypes.func
}

export default WRActionButtons
