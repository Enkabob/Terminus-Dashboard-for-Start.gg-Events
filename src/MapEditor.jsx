import React, { useState, useRef } from 'react';

export default function MapEditor({ initialConfig, onSave, onCancel }) {
  const [config, setConfig] = useState(initialConfig || {
    stations: [],
    labels: [],
    background: null,
    bgX: 0,
    bgY: 0,
    bgScale: 1,
    bgOpacity: 0.4,
    stationScale: 1,
    stationFontSize: 12, // NEW: Global font size
    width: 800,
    height: 600
  });

  const [selectedId, setSelectedId] = useState(null);
  const [dragItem, setDragItem] = useState(null);
  const svgRef = useRef(null);

  // --- ACTIONS ---
  const addStation = () => {
    const existingIds = config.stations.map(s => parseInt(s.id));
    const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
    setConfig(prev => ({
      ...prev,
      stations: [...prev.stations, { id: String(nextId), x: prev.width / 2, y: prev.height / 2, shape: 'diamond', rotation: 0 }]
    }));
  };

  const addLabel = () => {
    const text = prompt("Enter Label Text:", "POOL A");
    if (!text) return;
    // Added default opacity: 1
    setConfig(prev => ({
      ...prev,
      labels: [...prev.labels, { id: `lbl-${Date.now()}`, text, x: prev.width / 2, y: prev.height / 2, size: 24, color: '#FFC300', opacity: 1 }]
    }));
  };

  const handleBgUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setConfig(prev => ({ 
          ...prev, 
          background: reader.result,
          bgX: 0, bgY: 0, bgScale: 1, bgOpacity: 0.4 
      }));
      reader.readAsDataURL(file);
    }
  };

  const removeBg = () => setConfig(prev => ({ ...prev, background: null }));

  // --- MANIPULATION ---
  const updateItem = (id, type, updates) => {
    if (type === 'station') {
        setConfig(prev => ({ ...prev, stations: prev.stations.map(s => s.id === id ? { ...s, ...updates } : s) }));
    } else {
        setConfig(prev => ({ ...prev, labels: prev.labels.map(l => l.id === id ? { ...l, ...updates } : l) }));
    }
  };

  const updateGlobal = (prop, value) => {
      setConfig(prev => ({ ...prev, [prop]: value }));
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setConfig(prev => ({
      ...prev,
      stations: prev.stations.filter(s => s.id !== selectedId),
      labels: prev.labels.filter(l => l.id !== selectedId)
    }));
    setSelectedId(null);
  };

  // --- DRAG LOGIC ---
  const getMouseCoords = (e) => {
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  };

  const handleMouseDown = (e, type, id) => {
    e.stopPropagation();
    const coords = getMouseCoords(e);
    const item = type === 'station' ? config.stations.find(s => s.id === id) : config.labels.find(l => l.id === id);
    setSelectedId(id);
    setDragItem({ type, id, startX: coords.x, startY: coords.y, initialX: item.x, initialY: item.y });
  };

  const handleMouseMove = (e) => {
    if (!dragItem) return;
    const coords = getMouseCoords(e);
    const dx = coords.x - dragItem.startX;
    const dy = coords.y - dragItem.startY;
    
    const rawX = dragItem.initialX + dx;
    const rawY = dragItem.initialY + dy;
    const snappedX = Math.round(rawX / 10) * 10;
    const snappedY = Math.round(rawY / 10) * 10;

    if (dragItem.type === 'station') {
      setConfig(prev => ({ ...prev, stations: prev.stations.map(s => s.id === dragItem.id ? { ...s, x: snappedX, y: snappedY } : s) }));
    } else {
      setConfig(prev => ({ ...prev, labels: prev.labels.map(l => l.id === dragItem.id ? { ...l, x: snappedX, y: snappedY } : l) }));
    }
  };

  const handleMouseUp = () => setDragItem(null);

  // --- EXPORT/IMPORT ---
  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config));
    const node = document.createElement('a');
    node.setAttribute("href", dataStr);
    node.setAttribute("download", "venue_map.json");
    document.body.appendChild(node);
    node.click();
    node.remove();
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try { setConfig(JSON.parse(ev.target.result)); } catch (err) { alert("Invalid JSON"); }
    };
    reader.readAsText(file);
  };

  const selectedStation = config.stations.find(s => s.id === selectedId);
  const selectedLabel = config.labels.find(l => l.id === selectedId);

  return (
    <div className="fixed inset-0 z-50 bg-[#050510] flex flex-col p-6 text-white font-rajdhani" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
      
      {/* HEADER */}
      <header className="flex justify-between items-end border-b-4 border-[--color-gold] pb-2 mb-4 bg-black/50 p-4 border border-[--color-navy]">
        <div>
          <h1 className="text-4xl italic font-bold tracking-tighter text-[--color-gold] vh-slant-right inline-block pr-4">
            ARCHITECT<span className="text-[--color-sky]">_MODE</span>
          </h1>
          <div className="flex gap-4 mt-2">
             <button onClick={addStation} className="text-xs font-bold uppercase tracking-widest bg-[--color-navy] border border-[--color-sky] px-4 py-2 hover:bg-[--color-sky] hover:text-[--color-navy] transition">+ ADD STATION</button>
             <button onClick={addLabel} className="text-xs font-bold uppercase tracking-widest bg-[--color-navy] border border-[--color-sky] px-4 py-2 hover:bg-[--color-sky] hover:text-[--color-navy] transition">+ ADD LABEL</button>
             <label className="text-xs font-bold uppercase tracking-widest bg-[--color-navy] border border-[--color-sky] px-4 py-2 hover:bg-[--color-sky] hover:text-[--color-navy] transition cursor-pointer">
                UPLOAD BG
                <input type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
             </label>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
                <button onClick={handleExport} className="text-[10px] text-[--color-sky] hover:text-white underline">EXPORT CONFIG</button>
                <label className="text-[10px] text-[--color-sky] hover:text-white underline cursor-pointer">
                    IMPORT CONFIG
                    <input type="file" accept=".json" className="hidden" onChange={handleImport} />
                </label>
            </div>
            <div className="flex gap-2">
                <button onClick={onCancel} className="text-sm font-bold uppercase bg-red-900 border border-red-500 text-white px-6 py-2 hover:bg-red-600 transition">CANCEL</button>
                <button onClick={() => onSave(config)} className="text-sm font-bold uppercase bg-[--color-gold] text-[--color-navy] border border-[--color-gold] px-8 py-2 hover:bg-white transition animate-pulse">SAVE LAYOUT</button>
            </div>
        </div>
      </header>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* CANVAS */}
        <div className="flex-1 border-2 border-[--color-navy] bg-black relative overflow-hidden flex items-center justify-center">
            <div className="absolute top-2 left-2 text-[--color-gold] text-xs tracking-[0.2em] pointer-events-none">EDITOR_CANVAS</div>
            <svg 
              ref={svgRef}
              viewBox={`0 0 ${config.width} ${config.height}`} 
              className="w-full h-full max-w-full max-h-full cursor-crosshair shadow-[0_0_50px_rgba(0,0,128,0.2)]"
            >
                {config.background && (
                   <image href={config.background} x={config.bgX || 0} y={config.bgY || 0} width={config.width * (config.bgScale || 1)} height={config.height * (config.bgScale || 1)} opacity={config.bgOpacity || 0.4} preserveAspectRatio="none" />
                )}
                
                <defs><pattern id="editGrid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="#000080" strokeWidth="0.5" opacity="0.3"/></pattern></defs>
                <rect width="100%" height="100%" fill="url(#editGrid)" pointerEvents="none" />

                {/* Stations */}
                {config.stations.map((st) => (
                    <g key={st.id} transform={`translate(${st.x}, ${st.y}) rotate(${st.rotation}) scale(${config.stationScale || 1})`} onMouseDown={(e) => handleMouseDown(e, 'station', st.id)} className="cursor-move hover:opacity-80">
                        {selectedId === st.id && <circle r="30" fill="none" stroke="#FFF" strokeDasharray="4 2" className="animate-spin-slow" vectorEffect="non-scaling-stroke" />}
                        {st.shape === 'diamond' && <path d="M0 20 L30 0 L60 20 L30 40 Z" fill="#000080" stroke={selectedId === st.id ? "#FFF" : "#87CEEB"} strokeWidth="2" transform="translate(-30, -20)" />}
                        {st.shape === 'cube' && <rect x="-20" y="-20" width="40" height="40" fill="#4C1D95" stroke={selectedId === st.id ? "#FFF" : "#A78BFA"} strokeWidth="2" />}
                        {/* Apply GLOBAL FONT SIZE */}
                        <text y="5" textAnchor="middle" fill="white" fontSize={config.stationFontSize || 12} className="font-bold pointer-events-none select-none" transform={`rotate(${-st.rotation})`}>{st.id}</text>
                    </g>
                ))}

                {/* Labels */}
                {config.labels.map((lbl) => (
                    <text key={lbl.id} x={lbl.x} y={lbl.y} fontSize={lbl.size} fill={lbl.color || "#FFC300"} opacity={lbl.opacity || 1} textAnchor="middle" className="font-bold cursor-move select-none" onMouseDown={(e) => handleMouseDown(e, 'label', lbl.id)}>
                        {lbl.text}
                        {selectedId === lbl.id && <tspan fill="#FFF" fontSize="10" dy="-10"> ▼</tspan>}
                    </text>
                ))}
            </svg>
        </div>

        {/* SIDEBAR PROPERTIES */}
        <div className="w-72 bg-[#050510] border-2 border-[--color-navy] p-4 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
            <h3 className="text-xl text-[--color-gold] italic font-bold border-b border-[--color-navy] pb-2">PROPERTIES</h3>
            
            {/* GLOBAL SETTINGS */}
            <div className="flex flex-col gap-4 mb-2 pb-4 border-b border-[--color-navy]">
                <div className="text-[10px] text-[--color-gold] tracking-widest uppercase mb-1">GLOBAL VIEW</div>
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-gray-400">Station Icon Scale</label>
                    <input type="range" min="0.5" max="3" step="0.1" value={config.stationScale || 1} onChange={(e) => updateGlobal('stationScale', parseFloat(e.target.value))} className="w-full accent-[--color-gold]" />
                </div>
                {/* NEW: FONT SIZE SLIDER */}
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-gray-400">Station Font Size</label>
                    <input type="range" min="8" max="32" value={config.stationFontSize || 12} onChange={(e) => updateGlobal('stationFontSize', parseInt(e.target.value))} className="w-full accent-[--color-gold]" />
                </div>
            </div>

            {/* BACKGROUND */}
            {config.background && !selectedStation && !selectedLabel && (
                <div className="flex flex-col gap-4 mb-4 pb-4 border-b border-[--color-navy]">
                    <div className="text-[10px] text-[--color-gold] tracking-widest uppercase mb-1">BACKGROUND IMAGE</div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-gray-400">Zoom</label>
                        <input type="range" min="0.1" max="5" step="0.1" value={config.bgScale || 1} onChange={(e) => updateGlobal('bgScale', parseFloat(e.target.value))} className="w-full accent-[--color-gold]" />
                    </div>
                    <div className="flex gap-2">
                        <input type="number" value={config.bgX || 0} onChange={(e) => updateGlobal('bgX', parseInt(e.target.value))} className="bg-black border border-[--color-navy] p-1 text-xs text-white w-1/2" placeholder="X" />
                        <input type="number" value={config.bgY || 0} onChange={(e) => updateGlobal('bgY', parseInt(e.target.value))} className="bg-black border border-[--color-navy] p-1 text-xs text-white w-1/2" placeholder="Y" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-gray-400">Opacity</label>
                        <input type="range" min="0.1" max="1" step="0.1" value={config.bgOpacity || 0.4} onChange={(e) => updateGlobal('bgOpacity', parseFloat(e.target.value))} className="w-full accent-[--color-gold]" />
                    </div>
                    <button onClick={removeBg} className="text-xs text-red-400 border border-red-900 bg-red-900/20 py-1 hover:bg-red-900/50">REMOVE IMAGE</button>
                </div>
            )}

            {/* SELECTED STATION */}
            {selectedStation && (
                <>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-[--color-sky] tracking-widest uppercase">Station ID</label>
                        <input type="text" value={selectedStation.id} onChange={(e) => updateItem(selectedId, 'station', { id: e.target.value })} className="bg-black border border-[--color-navy] p-2 text-white font-mono focus:border-[--color-gold] outline-none text-xl" />
                    </div>
                    
                    <div className="flex flex-col gap-1">
                         <label className="text-[10px] text-[--color-sky] tracking-widest uppercase">Rotation</label>
                         <div className="flex gap-2">
                            <button onClick={() => updateItem(selectedId, 'station', { rotation: (selectedStation.rotation - 45) })} className="bg-[--color-navy] p-2 flex-1 hover:bg-[--color-sky] hover:text-black">↺ 45°</button>
                            <button onClick={() => updateItem(selectedId, 'station', { rotation: (selectedStation.rotation + 45) })} className="bg-[--color-navy] p-2 flex-1 hover:bg-[--color-sky] hover:text-black">↻ 45°</button>
                         </div>
                    </div>

                    <div className="flex flex-col gap-1">
                         <label className="text-[10px] text-[--color-sky] tracking-widest uppercase">Shape Type</label>
                         <div className="flex gap-2">
                            <button 
                                onClick={() => updateItem(selectedId, 'station', { shape: 'diamond' })} 
                                className={`p-2 flex-1 text-xs font-bold border transition ${selectedStation.shape === 'diamond' ? 'bg-[--color-gold] text-gray-800 border-[--color-gold]' : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-white'}`}
                            >
                                NORMAL
                            </button>
                            <button 
                                onClick={() => updateItem(selectedId, 'station', { shape: 'cube' })} 
                                className={`p-2 flex-1 text-xs font-bold border transition ${selectedStation.shape === 'cube' ? 'bg-[--color-gold] text-gray-800 border-[--color-gold]' : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-white'}`}
                            >
                                STREAM
                            </button>
                         </div>
                    </div>
                </>
            )}

            {/* SELECTED LABEL */}
            {selectedLabel && (
                <>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-[--color-sky] tracking-widest uppercase">Label Text</label>
                        <input type="text" value={selectedLabel.text} onChange={(e) => updateItem(selectedId, 'label', { text: e.target.value })} className="bg-black border border-[--color-navy] p-2 text-white font-mono focus:border-[--color-gold] outline-none" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-[--color-sky] tracking-widest uppercase">Font Size</label>
                        <input type="range" min="12" max="64" value={selectedLabel.size} onChange={(e) => updateItem(selectedId, 'label', { size: parseInt(e.target.value) })} className="w-full accent-[--color-gold]" />
                    </div>
                    {/* NEW: LABEL OPACITY */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-[--color-sky] tracking-widest uppercase">Opacity</label>
                        <input type="range" min="0.1" max="1" step="0.1" value={selectedLabel.opacity || 1} onChange={(e) => updateItem(selectedId, 'label', { opacity: parseFloat(e.target.value) })} className="w-full accent-[--color-gold]" />
                    </div>
                </>
            )}

            {(selectedStation || selectedLabel) && (
                <button onClick={deleteSelected} className="mt-auto bg-red-900 border border-red-500 text-white font-bold py-3 hover:bg-red-600 transition">DELETE ITEM</button>
            )}

            {!selectedStation && !selectedLabel && !config.background && (
                <div className="text-gray-500 font-mono text-sm text-center mt-10 border border-dashed border-[--color-navy] p-8">
                    SELECT AN ITEM<br/>TO EDIT PROPERTIES
                </div>
            )}
        </div>
      </div>
    </div>
  );
}