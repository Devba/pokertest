import React from 'react';
import styled from 'styled-components';

const Switch = styled.label`
  position: relative;
  display: inline-block;
  width: 52px;
  height: 28px;
`;

const Checkbox = styled.input`
  opacity: 0;
  width: 0;
  height: 0;
  &:checked + span {
    background-color: #2ecc40;
  }
  &:checked + span:before {
    transform: translateX(24px);
    background: #b6ffb6 radial-gradient(circle at 60% 40%, #fff 40%, #2ecc40 100%);
    box-shadow: 0 0 8px #b6ffb6;
  }
`;

const Slider = styled.span`
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: #44474a;
  border-radius: 34px;
  transition: background 0.2s;
  &:before {
    position: absolute;
    content: "";
    height: 22px;
    width: 22px;
    left: 3px;
    top: 3px;
    background: #888c91 radial-gradient(circle at 60% 40%, #bbb 40%, #44474a 100%);
    border-radius: 50%;
    transition: 0.2s;
    box-shadow: 0 0 4px #222;
  }
`;

export default function ToggleSwitch({ checked, onChange }) {
  return (
    <Switch>
      <Checkbox type="checkbox" checked={checked} onChange={onChange} />
      <Slider />
    </Switch>
  );
}