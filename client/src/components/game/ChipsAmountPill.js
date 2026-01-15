import React from 'react';
import PokerChip from '../icons/PokerChip';
import { Input } from '../forms/Input';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import chipImg from '../../assets/game/gglab_green.png'


const ChipsAmountPill = ({ chipsAmount, minBet, showAsBlinds, toggleShowAsBlinds }) => {
  const handleContextMenu = (e) => {
    e.preventDefault();
    console.log("handleContextMenu");
    toggleShowAsBlinds && toggleShowAsBlinds();
  };

  const displayValue = showAsBlinds && minBet
    ? `${Math.floor(chipsAmount / (minBet * 2))} BB`
    : chipsAmount;

  return (
    <div 
      className="chip-amount-pill"
      onContextMenu={handleContextMenu}
      style={{ cursor: 'context-menu' }}
    >
      <img className="chip-amount-img" src={chipImg} alt="chip" />
      <span className="chip-amount-text">{displayValue}</span>
    </div>
  );
};

ChipsAmountPill.propTypes = {
  chipsAmount: PropTypes.number,
  minBet: PropTypes.number,
  showAsBlinds: PropTypes.bool,
  toggleShowAsBlinds: PropTypes.func,
};

export default ChipsAmountPill;
