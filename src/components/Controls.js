// src/components/Controls.js
import React from 'react';

const Controls = ({ onPlay, onPause, onForward }) => {
  return (
    <div className="controls">
      <button onClick={onPlay}>Play</button>
      <button onClick={onPause}>Pause</button>
      <button onClick={onForward}>Forward</button>
    </div>
  );
};

export default Controls;