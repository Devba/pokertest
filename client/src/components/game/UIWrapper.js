import styled from 'styled-components';

export const UIWrapper = styled.div`
  position: fixed;
  top: 2vh;
  right: 40vw;
  transform-origin: bottom right;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  pointer-events: auto;
  z-index: 100;

  @media screen and (max-width: 1068px) {
    transform: scale(0.8);
  }

  @media screen and (max-width: 968px) {
    transform: scale(0.75);
  }

  @media screen and (max-width: 868px) {
    transform: scale(0.7);
  }

  @media screen and (max-width: 812px) {
    transform: scale(0.65);
  }

  @media screen and (max-width: 668px) {
    transform: scale(0.6);
  }

  @media screen and (max-width: 648px) {
    transform: scale(0.55);
  }

  @media screen and (max-width: 568px) {
    transform: scale(0.5);
  }
`;
