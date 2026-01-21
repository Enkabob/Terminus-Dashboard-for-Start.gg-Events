import React, { useState, useEffect } from 'react';
import TerminalDashboard from './TerminalDashboard'; 
import ConfigScreen from './ConfigScreen';
import './index.css'; 

export default function App() {
  // We keep all important data here in the 'Parent'
  const [token, setToken] = useState(localStorage.getItem('startgg_token') || '');
  const [slug, setSlug] = useState('');
  const [events, setEvents] = useState([]); // This stores the list of brackets
  const [activeEventId, setActiveEventId] = useState(null); // If this exists, Dashboard is open

  // Called when ConfigScreen successfully finds a tournament
  const handleDataFetched = (newToken, newSlug, foundEvents) => {
    setToken(newToken);
    setSlug(newSlug);
    setEvents(foundEvents);
    localStorage.setItem('startgg_token', newToken);
  };

  // Called when user clicks an event in the list
  const handleLaunch = (eventId) => {
    setActiveEventId(eventId);
  };

  // Called when user clicks [ CHANGE_EVENT ] in Dashboard
  const handleBack = () => {
    setActiveEventId(null); // Just hide dashboard, keep events in memory
  };

  return (
    <div className="w-screen h-screen bg-[--color-dark] overflow-hidden font-rajdhani">
      <div className="scanlines"></div>
      
      {!activeEventId ? (
        <ConfigScreen 
          // Pass current memory down to the screen
          cachedToken={token}
          cachedSlug={slug}
          cachedEvents={events}
          onDataFetched={handleDataFetched}
          onLaunch={handleLaunch} 
        />
      ) : (
        <TerminalDashboard 
          token={token} 
          eventId={activeEventId} 
          onBack={handleBack} 
        />
      )}
    </div>
  );
}