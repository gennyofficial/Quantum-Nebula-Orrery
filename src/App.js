// src/App.js
import React, { useState } from 'react';
import Orrery from './components/Orrery';
import Controls from './components/Controls';

const App = () => {
  const [isPlaying, setIsPlaying] = useState(true);

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleForward = () => {
    // Implement fast-forward functionality
  };

  return (
    <div className="App">
      <Orrery isPlaying={isPlaying} />
      <Controls onPlay={handlePlay} onPause={handlePause} onForward={handleForward} />
    </div>
  );
};

export default App;