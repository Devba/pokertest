import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';

const WheelContainer = styled.div`
  position: relative;
  width: 60px;
  height: 100px;
  user-select: none;
`;

const WheelSvg = styled.svg`
  transform: rotate(-90deg);
  filter: drop-shadow(0 1px 4px rgba(0, 0, 0, 0.3));
`;

const CenterCircle = styled.circle`
  fill: #1a1a1a;
  stroke: #6297b5;
  stroke-width: 1;
`;

const WheelSegment = styled.path`
  fill: ${props => props.active ? '#6297b5' : '#245069'};
  stroke: #1a1a1a;
  stroke-width: 1;
  transition: fill 0.2s ease;
  cursor: pointer;

  &:hover {
    fill: #4a8aa8;
  }
`;

const PointerTriangle = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-bottom: 10px solid #6297b5;
  transform: translate(-50%, -100%) translateY(-50px);
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4));
`;

const ValueDisplay = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 12px;
  font-weight: bold;
  color: #6297b5;
  text-align: center;
  pointer-events: none;
`;

const SubText = styled.div`
  font-size: 8px;
  color: #8ab4c8;
  margin-top: 2px;
`;

const BetWheelSelector = ({ stack, onValueChange, minBet = 0 }) => {
  const percentages = [10, 25, 33, 50, 66, 75, 100];
  const [selectedPercentage, setSelectedPercentage] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const wheelRef = useRef(null);

  const calculateBetAmount = (percentage) => {
    return Math.floor((stack * percentage) / 100);
  };

  const getAngleFromMouse = (clientX, clientY) => {
    if (!wheelRef.current) return 0;
    
    const rect = wheelRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    
    let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
    angle = (angle + 360) % 360;
    
    return angle;
  };

  const findClosestPercentage = (angle) => {
    const segmentAngle = 360 / percentages.length;
    const index = Math.round(angle / segmentAngle) % percentages.length;
    return percentages[index];
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const angle = getAngleFromMouse(e.clientX, e.clientY);
    const percentage = findClosestPercentage(angle);
    
    if (percentage !== selectedPercentage) {
      setSelectedPercentage(percentage);
      onValueChange && onValueChange(calculateBetAmount(percentage));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, selectedPercentage]);

  const handleSegmentClick = (percentage) => {
    setSelectedPercentage(percentage);
    onValueChange && onValueChange(calculateBetAmount(percentage));
  };

  const createSegmentPath = (index, total, radius = 45, innerRadius = 15) => {
    const angle = (360 / total);
    const startAngle = index * angle;
    const endAngle = (index + 1) * angle;
    
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    
    const x1 = 50 + radius * Math.cos(startRad);
    const y1 = 50 + radius * Math.sin(startRad);
    const x2 = 50 + radius * Math.cos(endRad);
    const y2 = 50 + radius * Math.sin(endRad);
    
    const x3 = 50 + innerRadius * Math.cos(endRad);
    const y3 = 50 + innerRadius * Math.sin(endRad);
    const x4 = 50 + innerRadius * Math.cos(startRad);
    const y4 = 50 + innerRadius * Math.sin(startRad);
    
    const largeArcFlag = angle > 180 ? 1 : 0;
    
    return `
      M ${x1} ${y1}
      A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
      L ${x3} ${y3}
      A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}
      Z
    `;
  };

  return (
    <WheelContainer ref={wheelRef}>
      <WheelSvg 
        width="100" 
        height="100" 
        viewBox="0 0 100 100"
        onMouseDown={handleMouseDown}
      >
        {percentages.map((percentage, index) => (
          <WheelSegment
            key={percentage}
            d={createSegmentPath(index, percentages.length)}
            active={percentage === selectedPercentage}
            onClick={() => handleSegmentClick(percentage)}
          />
        ))}
        <CenterCircle cx="50" cy="50" r="14" />
      </WheelSvg>
      
      <PointerTriangle />
      
      <ValueDisplay>
        {selectedPercentage}%
        <SubText>{calculateBetAmount(selectedPercentage)}</SubText>
      </ValueDisplay>
    </WheelContainer>
  );
};

BetWheelSelector.propTypes = {
  stack: PropTypes.number.isRequired,
  onValueChange: PropTypes.func,
  minBet: PropTypes.number,
};

export default BetWheelSelector;