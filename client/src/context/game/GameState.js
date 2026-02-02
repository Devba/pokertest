import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CS_CALL,
  CS_CHECK,
  CS_FOLD,
  CS_JOIN_TABLE,
  CS_LEAVE_TABLE,
  CS_RAISE,
  CS_REBUY,
  CS_SIT_DOWN,
  CS_STAND_UP,
  SC_TABLE_JOINED,
  SC_TABLE_LEFT,
  SC_TABLE_UPDATED,
} from '../../pokergame/actions'
import socketContext from '../websocket/socketContext'
import GameContext from './gameContext'

const GameState = ({ children }) => {
  const { socket } = useContext(socketContext)
  const navigate = useNavigate()

  const [messages, setMessages] = useState([])
  const [currentTable, setCurrentTable] = useState(null)
  const [seatId, setSeatId] = useState(null)
  const [turn, setTurn] = useState(false)
  const [turnTimeOutHandle, setHandle] = useState(null)
  const [showAsBlinds, setShowAsBlinds] = useState(false)
  const [timebfFold, setTimebfFold] = useState(5000)

  const currentTableRef = React.useRef(currentTable)

  useEffect(() => {
    currentTableRef.current = currentTable

    seatId &&
      currentTable &&
      currentTable.seats &&
      currentTable.seats[seatId] &&
      turn !== currentTable.seats[seatId].turn &&
      setTurn(currentTable.seats[seatId].turn)
    // eslint-disable-next-line
  }, [currentTable])

  useEffect(() => {
    if (turn && !turnTimeOutHandle) {
      console.log(`⏰ Player's turn started - auto-fold timer set to ${timebfFold}ms (${timebfFold/1000} seconds)`)
      // Play beep sound when it's player's turn
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUQ0PVqzn77BdGAo+ltrzxnMpBSl+zPLaizsIGGS56+mjUhELTKXh8bllHAU2j9nyy3kqBSh6y/HajD0HHWq97ueWTg4OUqjm8LRfGgo7k9vzyXUsBSh4yPDej0AIGmi56OabUBEMSqPf8bdfGgU0jNrzzn0vBil3yfDdkEIJGGW56+mjURELTKPf8bdgGgU1jtryz34wBSh4yfDdj0AIGme56+mjUREMSqPf8bdgGgU0jNrzzn0vBil3yfDdkEIJGGW56+mjURELTKPf8bdgGgU1jtryz34wBSh4yfDdj0AIGme56+mjUREMSqPf8bdgGgU0jNrzzn0vBil3yfDdkEIJGGW56+mjURELTKPf8bdgGgU1jtryz34wBSh4yfDdj0AI')
      audio.play().catch(e => console.log('Audio play failed:', e))
      
      const handle = setTimeout(() => {
        console.log('⏰ Auto-fold timer expired - folding...')
        fold()
      }, 10000)
      console.log('⏰ Timer handle created:', handle)
      setHandle(handle)
    } else {
      if (turnTimeOutHandle) {
        console.log('⏰ Clearing auto-fold timer, handle:', turnTimeOutHandle)
        clearTimeout(turnTimeOutHandle)
        setHandle(null)
      }
    }
    // eslint-disable-next-line
  }, [turn])

  useEffect(() => {
    if (socket) {
      socket.origSockID = localStorage.getItem("socketId");
      window.addEventListener('unload', leaveTable)
      window.addEventListener('close', leaveTable)

      socket.on(SC_TABLE_UPDATED, ({ table, message, from }) => {
        console.log(SC_TABLE_UPDATED, { table, message, from })
        setCurrentTable(table)
        message && addMessage(message)
        
        // Find player's seat in tournament tables (where players are pre-seated)
        if (table && table.seats && !seatId) {
          for (let i = 1; i <= table.maxPlayers; i++) {
            const seat = table.seats[i]
            if (seat && seat.player && seat.player.socketId === localStorage.getItem("socketId")) {
              console.log('Found player seat:', i)
              setSeatId(i)
              break
            }
          }
        }
      })

      socket.on(SC_TABLE_JOINED, ({ tables, tableId }) => {
        console.log(SC_TABLE_JOINED, { tables, tableId })
        
        // Check if player is already seated (tournament tables)
        if (tables && tables[0] && tables[0].seats) {
          let foundSeat = null
          for (let i = 1; i <= tables[0].maxPlayers; i++) {
            const seat = tables[0].seats[i]
            if (seat && seat.player && seat.player.socketId === socket.id) {
              foundSeat = i
              console.log('Player already seated at:', i)
              break
            }
          }
          
          if (foundSeat) {
            setSeatId(foundSeat)
          } else if (tables[0].currentNumberPlayers > 0) {
            setSeatId(tables[0].currentNumberPlayers)
          }
        }
      })

      socket.on(SC_TABLE_LEFT, ({ tables, tableId }) => {
        console.log(SC_TABLE_LEFT, { tables, tableId })
        setCurrentTable(null)
        setMessages([])
      })
    }
    if(socket){
      return () => leaveTable()
    } 
    // eslint-disable-next-line
  }, [socket])

  const origSockID = localStorage.getItem("socketId");

  const joinTable = (tableId) => {
    const p={
      socketId:localStorage.getItem('socketId'),
      walletAddress:localStorage.getItem('wallet'),
      username:localStorage.getItem('userName'),
      netwSid:socket.id
    }
    console.log(CS_JOIN_TABLE, tableId)
    socket.emit(CS_JOIN_TABLE, tableId,p)
  }

  const leaveTable = () => {
    const p={
      //socketId:localStorage.getItem('socketId'),
      walletAddress:localStorage.getItem('wallet'),
      username:localStorage.getItem('userNamev2'),
      netwSid:socket.id
    }
    standUp()
    currentTableRef &&
      currentTableRef.current &&
      currentTableRef.current.id &&
      socket.emit(CS_LEAVE_TABLE, currentTableRef.current.id,p)
    navigate('/tournament-lobby')
  }

  const sitDown = (tableId, seatId, amount) => {
    socket.emit(CS_SIT_DOWN, { tableId, seatId, amount })
    console.log(CS_SIT_DOWN, { tableId, seatId, amount })
    setSeatId(seatId)
  }

  const rebuy = (tableId, seatId, amount) => {
    socket.emit(CS_REBUY, { tableId, seatId, amount })
    console.log(CS_REBUY, { tableId, seatId, amount })
  }

  const standUp = () => {
    //alert('In tournaments, you cannot leave the table while still active. You can only stand up if you are eliminated or have a zero stack.') 
    
    currentTableRef &&
      currentTableRef.current &&
      socket.emit(CS_STAND_UP, currentTableRef.current.id,origSockID)
    setSeatId(null)
  }

  const addMessage = (message) => {
    setMessages((prevMessages) => [...prevMessages, message])
    console.log(message)
  }

  const fold = () => {
    console.log("fold ---",origSockID) ;
    
    currentTableRef &&
      currentTableRef.current &&
      socket.emit(CS_FOLD, currentTableRef.current.id,origSockID)
  }

  const check = () => {
    socket.origSockID = localStorage.getItem("socketId");
    currentTableRef &&
      currentTableRef.current &&
      socket.emit(CS_CHECK, currentTableRef.current.id, origSockID)
  }

  const call = () => {

    currentTableRef &&
      currentTableRef.current &&
      socket.emit(CS_CALL, currentTableRef.current.id,origSockID)
  }

  const raise = (amount,) => {
    currentTableRef &&
      currentTableRef.current &&
      socket.emit(CS_RAISE, { tableId: currentTableRef.current.id, amount ,origSockID})
  }

  const toggleShowAsBlinds = () => {
    setShowAsBlinds((prev) => !prev)
  }

  return (
    <GameContext.Provider
      value={{
        messages,
        currentTable,
        seatId,
        joinTable,
        leaveTable,
        sitDown,
        standUp,
        addMessage,
        fold,
        check,
        call,
        raise,
        rebuy,
        showAsBlinds,
        toggleShowAsBlinds,
        timebfFold,
        setTimebfFold,
      }}
    >
      {children}
    </GameContext.Provider>
  )
}

export default GameState
