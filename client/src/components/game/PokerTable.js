import React from 'react';
import styled from 'styled-components';
import table from '../../assets/game/table.svg';

const StyledPokerTable = styled.img`
  display: block;
  pointer-events: none;
  width: 68%;
  height: 45%;
  margin: 32px auto 0px;
  z-index: 2;
   position: relative;
  
`;

const PokerTable = () => <StyledPokerTable src={table} alt="Poker Table" />;

export default PokerTable;
