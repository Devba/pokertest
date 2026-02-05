import React, { useContext, useMemo } from 'react'
import PropTypes from 'prop-types'
import socketContext from '../../../context/websocket/socketContext'

const WRConnectionIndicator = ({ socket: socketProp }) => {
  const { socket: socketFromContext } = useContext(socketContext)
  const socket = socketProp || socketFromContext

  const connected = Boolean(socket && socket.connected)
  const socketId = socket && socket.id

  const dotStyle = useMemo(() => ({
    width: 10,
    height: 10,
    borderRadius: '50%',
    display: 'inline-block',
    marginRight: 8,
    boxShadow: connected ? '0 0 8px rgba(46, 204, 113, 0.6)' : '0 0 6px rgba(231, 76, 60, 0.35)',
    backgroundColor: connected ? '#2ecc71' : '#e74c3c',
    animation: connected ? 'wr-pulse 2s infinite' : 'none'
  }), [connected])

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#ddd' }} title={socketId ? `Socket ID: ${socketId}` : 'No socket'}>
      <style>{`@keyframes wr-pulse { 0% { transform: scale(1); } 50% { transform: scale(1.4); } 100% { transform: scale(1); } }`}</style>
      <span style={dotStyle} />
      <span style={{ color: connected ? '#bfeccb' : '#ffd6d6', fontWeight: 600 }}>{connected ? 'Connected' : 'Disconnected'}</span>
    </div>
  )
}

WRConnectionIndicator.propTypes = {
  socket: PropTypes.object
}

export default React.memo(WRConnectionIndicator)
