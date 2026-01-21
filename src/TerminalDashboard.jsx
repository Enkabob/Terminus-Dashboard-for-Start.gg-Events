import React, { useState, useEffect, useCallback } from 'react';
import MapEditor from './MapEditor';

// QUERY
const DASHBOARD_QUERY = `
query GetTournamentData($eventId: ID!) {
  event(id: $eventId) {
    name
    tournament {
      name
      images {
        url
        type
      }
    }
    # FETCH 1: Active & Upcoming Matches (Sorted by Priority)
    activeSets: sets(
      page: 1
      perPage: 300
      sortType: CALL_ORDER
      filters: { state: [1, 2, 4, 5, 6] }
    ) {
      nodes {
        id
        fullRoundText
        state
        startedAt
        station {
          id
          number
        }
        stream {
          streamName
        }
        phaseGroup {
          displayIdentifier
        }
        slots {
          id
          prereqId
          prereqPlacement
          entrant {
            name
          }
        }
      }
    }
    # FETCH 2: Recently Completed Matches (Sorted by Time Finished)
    # We need these to resolve "Winner of [Names]"
    completedSets: sets(
      page: 1
      perPage: 100
      sortType: RECENT
      filters: { state: [3] }
    ) {
      nodes {
        id
        slots {
          entrant {
            name
          }
        }
      }
    }
  }
}
`;

// --- HELPER: Duration Timer ---
const MatchTimer = ({ startedAt }) => {
  const [duration, setDuration] = useState("00:00");

  useEffect(() => {
    if (!startedAt) {
        setDuration("00:00");
        return;
    }
    
    const update = () => {
      const start = new Date(startedAt * 1000);
      const now = new Date();
      const diff = Math.floor((now - start) / 1000); // seconds
      
      if (diff < 0) { setDuration("00:00"); return; }

      const m = Math.floor(diff / 60);
      const s = diff % 60;
      setDuration(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return <span className="font-mono text-red-300 bg-red-900/40 px-2 py-0.5 rounded border border-red-900/50">{duration}</span>;
};

// --- FLAP TEXT ---
const SplitFlapText = ({ text, className = "text-xl text-white", trigger }) => (
  <div className={`flex flex-wrap gap-[1px] font-bold uppercase tracking-wider ${className}`}>
    {text.split('').map((char, i) => (
      <span key={`${char}-${i}-${trigger}`} className="flap-char">
        {char === " " ? "\u00A0" : char} 
      </span>
    ))}
  </div>
);

// --- UPDATE WHEEL ---
const UpdateWheel = ({ timeLeft, onClick, loading }) => {
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (timeLeft / 30) * circumference;

  return (
    <button 
      onClick={onClick}
      disabled={loading}
      title="Click to Refresh"
      className="relative w-10 h-10 flex items-center justify-center bg-transparent border border-[--color-sky] vh-container cursor-pointer hover:bg-[--color-sky]/20 active:scale-95 transition-all group disabled:opacity-50"
    >
      <svg className={`w-full h-full -rotate-90 p-1 ${loading ? 'animate-spin' : ''}`}>
        <circle cx="50%" cy="50%" r={radius} fill="none" stroke="#000080" strokeWidth="3" />
        <circle
          cx="50%" cy="50%" r={radius}
          fill="none"
          stroke={loading ? "#FFFFFF" : "#FFC300"} 
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={loading ? 0 : offset}
          strokeLinecap="butt"
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
      <span className="absolute text-[10px] font-mono text-[--color-sky] font-bold group-hover:text-white">
        {loading ? "..." : timeLeft}
      </span>
    </button>
  );
};

// --- MAP ---
const VenueMap = ({ playingStations, calledStations, mapConfig }) => {
  if (!mapConfig || mapConfig.stations.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center border-2 border-[--color-navy] bg-[#050510] text-gray-500 gap-2">
        <span className="text-4xl">🗺️</span>
        <span className="font-mono text-sm">NO MAP CONFIGURED</span>
        <span className="text-[10px]">CLICK 'EDIT MAP' TO BUILD LAYOUT</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full border-2 border-[--color-navy] bg-[--color-dark] opacity-90 p-2 flex flex-col">
      <h3 className="absolute top-2 left-2 text-[--color-gold] text-xs tracking-[0.2em] z-10">VENUE_MAP // CUSTOM</h3>
      
      <div className="absolute bottom-2 right-2 flex flex-col items-end gap-2 z-10 text-[10px] font-mono pointer-events-none">
         <div className="flex items-center gap-2">
           <svg width="12" height="12"><circle cx="6" cy="6" r="3" fill="#DC2626" /><circle cx="6" cy="6" r="5" stroke="#EF4444" fill="none"><animate attributeName="r" from="3" to="6" dur="1.5s" repeatCount="indefinite" /><animate attributeName="opacity" from="1" to="0" dur="1.5s" repeatCount="indefinite" /></circle></svg>
           <span className="text-red-400">OCCUPIED</span>
         </div>
         <div className="flex items-center gap-2">
           <svg width="12" height="12"><circle cx="6" cy="6" r="3" fill="#FFC300" /><circle cx="6" cy="6" r="5" stroke="#FFC300" fill="none"><animate attributeName="r" from="3" to="6" dur="1.5s" repeatCount="indefinite" /><animate attributeName="opacity" from="1" to="0" dur="1.5s" repeatCount="indefinite" /></circle></svg>
           <span className="text-[--color-gold]">CALLED</span>
         </div>
      </div>

      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <svg 
            viewBox={`0 0 ${mapConfig.width} ${mapConfig.height}`} 
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full"
            style={{ maxHeight: '100%', maxWidth: '100%' }}
        >
            {mapConfig.background && (
                <image href={mapConfig.background} x={mapConfig.bgX || 0} y={mapConfig.bgY || 0} width={mapConfig.width * (mapConfig.bgScale || 1)} height={mapConfig.height * (mapConfig.bgScale || 1)} opacity={mapConfig.bgOpacity || 0.4} preserveAspectRatio="none" />
            )}
            <defs>
                <pattern id="viewGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#000080" strokeWidth="0.5" opacity="0.2"/>
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#viewGrid)" />

            {mapConfig.stations.map((st) => {
                const isPlaying = playingStations.includes(st.id);
                const isCalled = calledStations.includes(st.id);
                
                let fillColor = "#000080";
                let strokeColor = "#87CEEB";
                let glowColor = null;

                if (isPlaying) { fillColor = "#DC2626"; strokeColor = "#FECACA"; glowColor = "#EF4444"; } 
                else if (isCalled) { fillColor = "#FFC300"; strokeColor = "#FFF"; glowColor = "#FFC300"; }
                
                const op = isPlaying || isCalled ? 1 : 0.4;

                return (
                    <g key={st.id} transform={`translate(${st.x}, ${st.y}) rotate(${st.rotation}) scale(${mapConfig.stationScale || 1})`}>
                        {st.shape === 'diamond' && (<path d="M0 20 L30 0 L60 20 L30 40 Z" fill={fillColor} fillOpacity={op} stroke={strokeColor} strokeWidth="2" transform="translate(-30, -20)" />)}
                        {st.shape === 'cube' && (<rect x="-20" y="-20" width="40" height="40" fill={isPlaying ? "#4C1D95" : "#1E1B4B"} stroke={strokeColor} strokeWidth="2" fillOpacity={op} />)}
                        <text y="5" textAnchor="middle" fill="white" fontSize={mapConfig.stationFontSize || 12} className="font-bold select-none" transform={`rotate(${-st.rotation})`}>{st.id}</text>
                        {glowColor && (<circle r="30" stroke={glowColor} fill="none" strokeWidth="1"><animate attributeName="r" from="25" to="45" dur="1.5s" repeatCount="indefinite" /><animate attributeName="opacity" from="1" to="0" dur="1.5s" repeatCount="indefinite" /></circle>)}
                    </g>
                );
            })}
            {mapConfig.labels.map(lbl => (
                <text key={lbl.id} x={lbl.x} y={lbl.y} fontSize={lbl.size} fill={lbl.color || "#FFC300"} opacity={lbl.opacity || 1} textAnchor="middle" className="font-bold shadow-black drop-shadow-md">{lbl.text}</text>
            ))}
        </svg>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
export default function TerminalDashboard({ token, eventId, onBack }) {
  const [matches, setMatches] = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [meta, setMeta] = useState({ tourneyName: "LOADING...", eventName: "SYSTEM_INIT", logo: null });
  const [timer, setTimer] = useState(30);
  const [flapTrigger, setFlapTrigger] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isEditingMap, setIsEditingMap] = useState(false);
  
  const [mapConfig, setMapConfig] = useState(() => {
    const saved = localStorage.getItem('terminal_map_config');
    return saved ? JSON.parse(saved) : { stations: [], labels: [], width: 800, height: 600, background: null, bgX: 0, bgY: 0, bgScale: 1, bgOpacity: 0.4, stationScale: 1 };
  });

  const handleSaveMap = (newConfig) => {
    setMapConfig(newConfig);
    localStorage.setItem('terminal_map_config', JSON.stringify(newConfig));
    setIsEditingMap(false);
  };

 const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('https://api.start.gg/gql/alpha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          query: DASHBOARD_QUERY,
          variables: { eventId: eventId } // Note: page/perPage are now hardcoded in query for aliases
        }),
      });
      const json = await response.json();
      
      if (json.data && json.data.event) {
        const eventData = json.data.event;
        const tourney = eventData.tournament;
        const logoObj = tourney.images.find(img => img.type === "profile") || tourney.images[0];
        
        setMeta({
          tourneyName: tourney.name,
          eventName: eventData.name,
          logo: logoObj ? logoObj.url : null
        });

        // 1. MERGE LISTS FOR LOOKUP
        // We combine Active sets (to display) and Recent sets (to resolve names)
        const activeNodes = eventData.activeSets.nodes || [];
        const completedNodes = eventData.completedSets.nodes || [];
        
        const setMap = new Map();
        
        // Add Completed sets first (Source of Truth for names)
        completedNodes.forEach(set => setMap.set(String(set.id), set));
        // Add Active sets (Source of Truth for current status)
        activeNodes.forEach(set => setMap.set(String(set.id), set));

        // --- HELPER: Resolve Name & Depth ---
        const resolveSlotInfo = (slot) => {
            // CASE 1: Player is already in the slot
            if (slot.entrant) {
                return { 
                    text: slot.entrant.name, 
                    isKnown: true, 
                    isDeepKnown: true 
                };
            }

            // CASE 2: Waiting on a Prerequisite
            if (slot.prereqId) {
                const pId = String(slot.prereqId);
                
                if (setMap.has(pId)) {
                    const pSet = setMap.get(pId);
                    const s1Name = pSet.slots[0]?.entrant?.name;
                    const s2Name = pSet.slots[1]?.entrant?.name;

                    // CHECK: Do we know the two people from the previous set?
                    if (s1Name && s2Name) {
                        const type = slot.prereqPlacement === 1 ? "Winner" : "Loser";
                        return { 
                            text: `${type} of ${s1Name} vs ${s2Name}`, 
                            isKnown: false, // Not a specific player yet
                            isDeepKnown: true // But we know the matchup
                        };
                    }
                }
                
                // Fallback: Prereq exists but names unknown (rare with the new query)
                const type = slot.prereqPlacement === 1 ? "W" : "L";
                // Slice ID to prevent massive strings
                const shortId = slot.prereqId.toString().split('_').pop() || slot.prereqId;
                return { 
                    text: `${type}. of Set ${shortId}`, 
                    isKnown: false, 
                    isDeepKnown: false 
                };
            }

            return { text: "TBD", isKnown: false, isDeepKnown: false };
        };

        // 2. PROCESS ONLY ACTIVE NODES FOR DISPLAY
        const cleanData = activeNodes.map(n => {
          const s1 = resolveSlotInfo(n.slots[0]);
          const s2 = resolveSlotInfo(n.slots[1]);
          const poolId = n.phaseGroup?.displayIdentifier || "Bracket";
          
          return {
            id: n.id,
            p1: s1.text,
            p2: s2.text,
            s1Info: s1,
            s2Info: s2,
            round: `${poolId}: ${n.fullRoundText}`,
            station: n.station ? String(n.station.number) : null,
            isStream: !!n.stream,
            startedAt: n.startedAt,
            status: n.state 
          };
        });

        setMatches(cleanData);

        // --- FILTER UPCOMING ---
        const upcomingFiltered = cleanData.filter(m => {
            // Must be Open (1) or Pending (5)
            if (m.status !== 1 && m.status !== 5) return false;


            // PENDING (State 5): Only show if we have "Deep Knowledge" of both sides
            // This means we either know the player, OR we know the specific matchup feeding into it
            if (m.s1Info.isDeepKnown && m.s2Info.isDeepKnown) return true;

            return false;
        });

        setUpcomingMatches(upcomingFiltered);
        setTimer(30);
      }
    } catch (err) {
      console.error("API Error", err);
    } finally {
        setLoading(false);
    }
  }, [token, eventId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); 
    const countdown = setInterval(() => { setTimer(prev => prev > 0 ? prev - 1 : 0); }, 1000);
    const flapInterval = setInterval(() => { setFlapTrigger(prev => prev + 1); }, 12000);

    return () => {
        clearInterval(interval);
        clearInterval(countdown);
        clearInterval(flapInterval);
    };
  }, [fetchData]);

  const handleManualRefresh = () => {
      setTimer(30);
      fetchData();
  };

  const playing = matches.filter(m => m.status === 2);
  const called = matches.filter(m => m.status === 6);

  // --- RENDERERS ---

  const renderCalledSection = () => (
    <div className="bg-[--color-navy]/30 p-2 pb-4 border-b-4 border-[--color-gold]">
        <div className="text-[--color-gold] font-bold text-sm tracking-[0.3em] mb-4 pl-2 border-l-4 border-[--color-gold]">
          CALLED TO STATION (REPORT)
        </div>
        <div className="flex flex-col gap-2">
        {called.map((match) => {
          // --- PURPLE LOGIC FOR CALLED ---
          const colorClass = match.isStream ? "text-purple-400" : "text-[--color-gold]";
          const labelClass = match.isStream ? "text-purple-400" : "text-[--color-gold]";

          return (
            <div key={match.id} className="grid grid-cols-[6rem_1fr_6rem] gap-2 p-3 bg-gradient-to-r from-[--color-gold]/20 to-transparent border-l-4 border-[--color-gold] items-center">
                <div className="flex items-center justify-end gap-1 border-r border-[--color-gold]/30 pr-2">
                <span className={`text-[16px] font-bold font-mono [writing-mode:vertical-lr] rotate-180 tracking-widest opacity-80 ${labelClass}`}>
                    {match.isStream ? "STREAM" : "SETUP"}
                </span>
                <span className={`text-6xl font-bold leading-none ${colorClass}`}>
                    {match.isStream ? `S${match.station}` : match.station}
                </span>
                </div>
                <div className="flex flex-col">
                    <div className="flex gap-2 items-center text-2xl font-bold text-white uppercase">
                    <span>{match.p1}</span>
                    <span className="text-[--color-gold] text-sm">VS</span>
                    <span>{match.p2}</span>
                    </div>
                    <div className="text-sm text-[--color-gold] uppercase">Pool {match.round}</div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                    <span className="text-[--color-gold] border border-[--color-gold] px-3 py-1 text-sm font-bold animate-pulse bg-black">CALLED</span>
                    {/* ADDED TIMER TO CALLED */}
                    <MatchTimer startedAt={match.startedAt} />
                </div>
            </div>
          );
        })}
        </div>
    </div>
  );

  const renderPlayingItems = () => (
      <div className="flex flex-col gap-2">
        {playing.map((match) => {
            const colorClass = match.isStream ? "text-purple-400" : "text-red-500";
            const labelClass = match.isStream ? "text-purple-400" : "text-red-400";
            return (
                <div key={match.id} className="grid grid-cols-[6rem_1fr_5rem] gap-2 p-2 border-b border-[--color-navy] items-center hover:bg-[--color-navy]/20">
                    <div className="flex items-center justify-end gap-1 border-r border-[--color-navy] pr-1">
                        <span className={`text-[16px] font-bold font-mono [writing-mode:vertical-lr] rotate-180 tracking-widest opacity-70 ${labelClass}`}>
                            {match.isStream ? "STREAM" : "SETUP"}
                        </span>
                        <span className={`text-5xl font-bold leading-none ${colorClass}`}>
                            {match.isStream ? `S${match.station}` : match.station}
                        </span>
                    </div>
                    <div className="flex flex-col overflow-hidden">
                        <SplitFlapText text={match.p1.substring(0, 60)} className="text-lg text-gray-200 truncate" trigger={flapTrigger} />
                        <span className="text-[10px] text-[--color-sky] mt-1 mb-1">VS</span>
                        <SplitFlapText text={match.p2.substring(0, 60)} className="text-lg text-gray-200 truncate" trigger={flapTrigger} />
                        <span className="text-[10px] text-gray-500 uppercase mt-1 truncate">Pool {match.round}</span>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                        <span className={`font-bold text-xs tracking-wider ${colorClass}`}>ACTIVE</span>
                        <MatchTimer startedAt={match.startedAt} />
                    </div>
                </div>
            );
        })}
      </div>
  );

 const renderUpcomingContent = () => (
    <div className="flex flex-col">
       {upcomingMatches.map((match, idx) => (
          <div key={`${match.id}-${idx}`} className="flex justify-between items-center p-3 border-b border-[--color-navy]/50">
            <div className="flex items-center gap-3 w-full">
              <span className="font-mono text-[--color-sky] text-lg opacity-70 shrink-0 w-8">
                #{idx + 1}
              </span>
              <div className="flex flex-col overflow-hidden w-full">
                <div className="flex flex-col leading-tight mb-1">
                  {/* PLAYER 1 NAME */}
                  <span className={`truncate ${
                      match.s1Info.isKnown 
                        ? "text-white font-bold text-md" // Real Player Style
                        : "text-gray-500 text-md font-bold font-mono uppercase tracking-wider" // "Winner of..." Style
                    }`}>
                    {match.p1}
                  </span>
                  
                  <span className="text-[--color-gold] text-[10px] font-mono opacity-50 my-0.5 ml-1">VS</span> 

                  {/* PLAYER 2 NAME */}
                  <span className={`truncate ${
                      match.s2Info.isKnown 
                        ? "text-white font-bold text-md" 
                        : "text-gray-500 text-md font-bold font-mono uppercase tracking-wider"
                    }`}>
                    {match.p2}
                  </span>
                </div>
                <span className="text-[10px] text-[--color-sky] font-mono tracking-wider opacity-80">
                    Pool {match.round}
                </span>
              </div>
            </div>
          </div>
        ))}
    </div>
  );
  const shouldScrollPlaying = playing.length > 2;
  const durationPlaying = `${Math.max(20, playing.length * 5)}s`; 
  const shouldScrollUpcoming = upcomingMatches.length > 3;
  const durationUpcoming = `${Math.max(20, upcomingMatches.length * 4)}s`;


  if (isEditingMap) {
    return <MapEditor initialConfig={mapConfig} onSave={handleSaveMap} onCancel={() => setIsEditingMap(false)} />;
  }

  return (
    <div className="h-screen w-screen bg-[--color-dark] text-white overflow-hidden p-6 flex flex-col gap-4">
      <div className="scanlines"></div>
      
      <header className="flex-none flex justify-between items-end border-b-4 border-[--color-gold] pb-2">
        <div className="flex items-center gap-4">
          {meta.logo ? (
            <div className="w-16 h-16 md:w-20 md:h-20 bg-black border-2 border-[--color-sky] p-1 vh-container shrink-0">
              <img src={meta.logo} alt="Logo" className="w-full h-full object-contain" />
            </div>
          ) : (
             <div className="w-16 h-16 border-2 border-[--color-sky] flex items-center justify-center bg-[--color-navy]"><span className="text-2xl font-bold">T_01</span></div>
          )}
          <div className="flex flex-col">
            <h1 className="text-3xl md:text-5xl font-bold italic tracking-tighter text-[--color-gold] vh-slant-right leading-none">{meta.tourneyName.toUpperCase()}</h1>
            <div className="text-[--color-sky] font-mono tracking-[0.3em] text-sm md:text-lg uppercase mt-1">{meta.eventName}</div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
           <div className="flex items-center gap-2">
               <button onClick={() => setIsEditingMap(true)} className="text-[10px] text-[--color-gold] bg-transparent border border-[--color-gold] px-3 py-1 font-bold uppercase hover:bg-[--color-gold] hover:text-black transition-colors tracking-widest">[ EDIT_MAP ]</button>
               <button onClick={onBack} className="text-[10px] text-[--color-sky] bg-transparent border border-[--color-sky] px-3 py-1 font-bold uppercase hover:bg-[--color-sky] hover:text-[--color-navy] transition-colors tracking-widest">[ CHANGE_EVENT ]</button>
              <UpdateWheel timeLeft={timer} onClick={handleManualRefresh} loading={loading} />
           </div>
          <div className="bg-[--color-navy] text-[--color-gold] px-4 py-1 font-mono text-xl vh-container">
              {new Date().toLocaleTimeString()}
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 grid grid-cols-12 gap-6">
        <section className="col-span-7 h-full flex flex-col gap-4 overflow-hidden">
          <div className="flex-none flex items-center gap-2">
            <div className="h-4 w-4 bg-red-500 animate-pulse"></div>
            <h2 className="text-2xl text-white uppercase tracking-widest">Matches (Active)</h2>
            <div className="h-[2px] bg-[--color-navy] flex-1"></div>
          </div>
          <div className="flex-1 min-h-0 flex flex-col border-2 border-[--color-navy] bg-black/50 overflow-hidden relative">
            {called.length > 0 && (<div className="flex-none w-full z-20 max-h-[50%] overflow-y-auto no-scrollbar shadow-[0_10px_20px_rgba(0,0,0,0.5)]">{renderCalledSection()}</div>)}
            <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
               <div className="flex-none p-2 z-10 bg-[#050510]/95 border-b border-[--color-navy]">
                   <div className="text-red-500 font-bold text-sm tracking-[0.3em] pl-2 border-l-4 border-red-600">ENGAGED / IN-PROGRESS</div>
               </div>
               <div className="flex-1 min-h-0 relative overflow-hidden">
                    {(playing.length === 0 && called.length === 0) ? (
                        <div className="h-full flex items-center justify-center text-gray-600 font-mono">NO ACTIVE MATCHES... STANDBY</div>
                    ) : shouldScrollPlaying ? (
                        <div className="animate-scroll-vertical hover:[animation-play-state:paused]" style={{ animationDuration: durationPlaying, animationName: 'scrollUp' }}>
                            {renderPlayingItems()}{renderPlayingItems()} 
                        </div>
                    ) : (
                        <div className="h-full overflow-y-auto no-scrollbar">{renderPlayingItems()}</div>
                    )}
               </div>
            </div>
          </div>
        </section>

        <section className="col-span-5 h-full flex flex-col gap-4 overflow-hidden">
          <div className="h-1/2 w-full flex-none">
            <VenueMap playingStations={playing.map(m => m.station)} calledStations={called.map(m => m.station)} mapConfig={mapConfig} />
          </div>
          <div className="h-1/2 w-full flex-1 min-h-0 flex flex-col border border-[--color-navy] bg-black/30 overflow-hidden relative">
            <div className="flex-none z-30 bg-[--color-dark] p-2 border-b border-[--color-navy] flex items-center gap-2">
              <div className="h-3 w-3 bg-[--color-sky]"></div>
              <h2 className="text-lg text-[--color-sky] uppercase tracking-widest">Matches (Upcoming)</h2>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden relative"> 
              {upcomingMatches.length > 0 ? (
                 shouldScrollUpcoming ? (
                    <div className="animate-scroll-vertical hover:[animation-play-state:paused]" style={{ animationDuration: durationUpcoming, animationName: 'scrollUp' }}>
                      {renderUpcomingContent()}{renderUpcomingContent()}
                    </div>
                 ) : (<div className="h-full overflow-y-auto no-scrollbar">{renderUpcomingContent()}</div>)
              ) : (<div className="h-full flex items-center justify-center text-gray-500 font-mono text-sm animate-pulse">WAITING FOR QUEUE...</div>)}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}