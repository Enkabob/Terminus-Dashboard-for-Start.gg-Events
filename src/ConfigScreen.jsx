import React, { useState, useEffect } from 'react';

const TOURNAMENT_QUERY = `
  query GetEvents($slug: String!) {
    tournament(slug: $slug) {
      id
      name
      events {
        id
        name
        videogame {
          name
        }
      }
    }
  }
`;

export default function ConfigScreen({ cachedToken, cachedSlug, cachedEvents, onDataFetched, onLaunch }) {
  // Initialize state with props (Memory) if available
  const [token, setToken] = useState(cachedToken || '');
  const [slug, setSlug] = useState(cachedSlug || '');
  
  // If we already have events, skip to Step 2!
  const [step, setStep] = useState(cachedEvents && cachedEvents.length > 0 ? 2 : 1);
  const [localEvents, setLocalEvents] = useState(cachedEvents || []);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('https://api.start.gg/gql/alpha', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: TOURNAMENT_QUERY,
          variables: { slug: slug }
        }),
      });

      const json = await response.json();
      if (json.errors || !json.data.tournament) {
        throw new Error("Tournament not found or Invalid Token");
      }
      
      const foundEvents = json.data.tournament.events;
      
      // Update local state
      setLocalEvents(foundEvents);
      setStep(2);

      // Send data up to App.jsx to remember it
      onDataFetched(token, slug, foundEvents);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle "Abort" button (Go back to Slug entry and clear memory)
  const handleAbort = () => {
    setStep(1);
    setLocalEvents([]);
    onDataFetched(token, '', []); // Clear parent memory of events
  };

  return (
    <div className="w-full h-full flex items-center justify-center relative z-50">
      <div className="w-full max-w-2xl bg-black/90 border-2 border-[--color-navy] p-8 relative shadow-[0_0_50px_rgba(0,0,128,0.5)]">
        
        {/* Decorative Corners */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-[--color-gold]"></div>
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-[--color-gold]"></div>

        <h2 className="text-4xl text-[--color-gold] font-bold italic tracking-tighter mb-6 border-b border-[--color-navy] pb-2">
          SYSTEM_ACCESS // <span className="text-[--color-sky]">CONFIG</span>
        </h2>

        {error && (
          <div className="bg-red-900/50 border-l-4 border-red-500 text-white p-2 mb-4 font-mono text-sm">
            ERROR: {error}
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-6">
            <div className="group">
              <label className="block text-[--color-sky] text-xs tracking-[0.2em] mb-1">AUTH_TOKEN</label>
              <input 
                type="password" 
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste Start.gg Token"
                className="w-full bg-[--color-dark] border border-[--color-navy] text-white p-3 font-mono focus:outline-none focus:border-[--color-gold] transition-all vh-slant-right"
              />
            </div>

            <div className="group">
              <label className="block text-[--color-sky] text-xs tracking-[0.2em] mb-1">TOURNAMENT_SLUG</label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 font-mono text-sm">start.gg/tournament/</span>
                <input 
                  type="text" 
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="genesis-9"
                  className="flex-1 bg-[--color-dark] border border-[--color-navy] text-white p-3 font-mono focus:outline-none focus:border-[--color-gold] transition-all vh-slant-right"
                />
              </div>
            </div>

            <button 
              onClick={fetchEvents}
              disabled={loading || !token || !slug}
              className="mt-4 bg-[--color-navy] hover:bg-[--color-gold] hover:text-black text-white font-bold py-3 px-6 uppercase tracking-widest transition-all vh-slant-left border border-[--color-sky]"
            >
              {loading ? "SCANNING..." : "ESTABLISH_CONNECTION"}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end border-b border-[--color-navy] pb-1">
              <p className="text-[--color-sky] font-mono text-sm">SELECT TARGET EVENT:</p>
              <span className="text-xs text-gray-500 font-mono">{slug}</span>
            </div>
            
            <div className="max-h-60 overflow-y-auto flex flex-col gap-2 pr-2 custom-scrollbar">
              {localEvents.map((event) => (
                <button
                  key={event.id}
                  onClick={() => onLaunch(event.id)}
                  className="text-left p-3 border border-[--color-navy] hover:bg-[--color-gold] hover:text-black hover:border-transparent transition-all group"
                >
                  <div className="font-bold text-lg group-hover:translate-x-2 transition-transform">{event.name}</div>
                  <div className="text-xs opacity-70 font-mono">{event.videogame.name} // ID: {event.id}</div>
                </button>
              ))}
            </div>

            <button 
              onClick={handleAbort}
              className="mt-2 text-xs text-gray-500 hover:text-white text-right underline"
            >
              ABORT_SEQUENCE (CHANGE SLUG)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}