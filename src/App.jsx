import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import confetti from 'canvas-confetti';

const GLOBAL_STYLES = `
  /* 1. The initial "Burn In" load animation */
  @keyframes burnIn {
    0% { opacity: 0; transform: scale(0.5); filter: brightness(2); }
    100% { opacity: 1; transform: scale(1); filter: brightness(1); }
  }
  .animate-burn-in {
    animation: burnIn 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
  }

  /* 2. The "Crossed Out" Texture for past weeks */
  /* OPTIMIZATION: Removed opacity here to make grid brighter */
  .crossed-out {
    background-image: 
      linear-gradient(to top left,  transparent 46%, rgba(0,0,0,0.4) 48%, rgba(0,0,0,0.4) 52%, transparent 54%),
      linear-gradient(to top right, transparent 46%, rgba(0,0,0,0.4) 48%, rgba(0,0,0,0.4) 52%, transparent 54%);
    border-color: transparent !important;
  }

  /* 3. The "Cross Out" Animation for the Tutorial */
  @keyframes crossOutAnim {
    from { background-image: none; opacity: 1; border-color: rgba(255, 255, 255, 0.05); }
    to {
      background-image: 
        linear-gradient(to top left,  transparent 46%, rgba(0,0,0,0.4) 48%, rgba(0,0,0,0.4) 52%, transparent 54%),
        linear-gradient(to top right, transparent 46%, rgba(0,0,0,0.4) 48%, rgba(0,0,0,0.4) 52%, transparent 54%);
      opacity: 0.8; /* Brighter than before */
      border-color: transparent;
    }
  }
  .animate-cross-out { animation: crossOutAnim 0.6s ease-out forwards; }

  /* 4. Bounce Animation for Tutorial Pointer */
  @keyframes bounceSlight {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }
  .animate-bounce-slight { animation: bounceSlight 2s infinite; }

  /* Prevent iOS Zoom on Inputs */
  input, textarea, select { font-size: 16px !important; }
   
  /* Custom Range Slider for Touch */
  input[type=range] { -webkit-appearance: none; background: transparent; }
  input[type=range]:focus { outline: none; }
  input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; height: 24px; width: 24px; border-radius: 50%; background: #22d3ee; margin-top: -10px; box-shadow: 0 0 15px rgba(34,211,238,0.6); border: 2px solid #fff; }
  input[type=range]::-webkit-slider-runnable-track { width: 100%; height: 4px; cursor: pointer; background: #374151; border-radius: 2px; }

  /* LANDSCAPE MODE OPTIMIZATIONS */
  @media (max-height: 500px) and (orientation: landscape) {
    .landscape-hide { display: none !important; }
    .landscape-compact { padding-top: 4px !important; padding-bottom: 4px !important; gap: 8px !important; }
    .landscape-row { flex-direction: row !important; align-items: center; justify-content: space-between; }
  }
  
  /* OPTIMIZATION: Browser Native Lazy Rendering for Grid */
  .grid-container-optimized {
     content-visibility: auto;
     contain-intrinsic-size: 1200px 3000px; /* Estimates height to prevent scrollbar jumping */
  }
  /* Mobile specific estimate */
  @media (max-width: 768px) {
    .grid-container-optimized {
        contain-intrinsic-size: 420px 5000px;
    }
  }
`;

// FIXED: Increased opacity from /30 to /50 for better visibility
const DEFAULT_ERAS = [
  { id: 'childhood', name: 'Early Childhood', startWeek: 0,    color: 'bg-cyan-600/50' },
  { id: 'school',    name: 'School Age',       startWeek: 260, color: 'bg-blue-600/50' },  // 5 years * 52
  { id: 'adult',     name: 'Early Adulthood',  startWeek: 936, color: 'bg-indigo-600/50' }, // 18 years
  { id: 'building',  name: 'Building Years',   startWeek: 1300, color: 'bg-violet-600/50' }, // 25 years
  { id: 'midlife',   name: 'Mid-Life',         startWeek: 1820, color: 'bg-fuchsia-600/50' }, // 35 years
  { id: 'later',     name: 'Later Life',       startWeek: 2600, color: 'bg-pink-600/50' },    // 50 years
  { id: 'golden',    name: 'Golden Years',     startWeek: 3380, color: 'bg-rose-600/50' },    // 65 years
];

const JOURNAL_PROMPTS = [
  "What was the highlight of this week?",
  "Who made you smile this week?",
  "What is one thing you learned?",
  "Did you try anything new?",
  "What was a challenge you overcame?",
  "How did you spend your free time?",
  "What music were you listening to?",
  "Rate your energy levels this week.",
  "What is one thing you are grateful for?",
  "Who did you enjoy spending time with?"
];

const PRESET_COLORS = {
  slate:   { bg: 'bg-slate-500',   text: 'text-slate-500',   border: 'border-slate-500' },
  red:     { bg: 'bg-red-500',     text: 'text-red-500',     border: 'border-red-500' },
  orange:  { bg: 'bg-orange-500',  text: 'text-orange-500',  border: 'border-orange-500' },
  amber:   { bg: 'bg-amber-500',   text: 'text-amber-500',   border: 'border-amber-500' },
  yellow:  { bg: 'bg-yellow-500',  text: 'text-yellow-500',  border: 'border-yellow-500' },
  lime:    { bg: 'bg-lime-500',    text: 'text-lime-500',    border: 'border-lime-500' },
  green:   { bg: 'bg-green-500',   text: 'text-green-500',   border: 'border-green-500' },
  emerald: { bg: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-emerald-500' },
  teal:    { bg: 'bg-teal-500',    text: 'text-teal-500',    border: 'border-teal-500' },
  cyan:    { bg: 'bg-cyan-500',    text: 'text-cyan-500',    border: 'border-cyan-500' },
  sky:     { bg: 'bg-sky-500',     text: 'text-sky-500',     border: 'border-sky-500' },
  blue:    { bg: 'bg-blue-500',    text: 'text-blue-500',    border: 'border-blue-500' },
  indigo:  { bg: 'bg-indigo-500',  text: 'text-indigo-500',  border: 'border-indigo-500' },
  violet:  { bg: 'bg-violet-500',  text: 'text-violet-500',  border: 'border-violet-500' },
  purple:  { bg: 'bg-purple-500',  text: 'text-purple-500',  border: 'border-purple-500' },
  fuchsia: { bg: 'bg-fuchsia-500', text: 'text-fuchsia-500', border: 'border-fuchsia-500' },
  pink:    { bg: 'bg-pink-500',    text: 'text-pink-500',    border: 'border-pink-500' },
  rose:    { bg: 'bg-rose-500',    text: 'text-rose-500',    border: 'border-rose-500' },
};

const INITIAL_CATEGORIES = {
  default: { label: 'General', colorKey: 'slate' },
};

const WRITING_PROMPTS = [
  "What was the highlight of this week?",
  "What is one thing you learned?",
  "Who did you enjoy spending time with?",
  "What was a challenge you overcame?",
  "Rate your energy levels this week.",
  "What music were you listening to?",
  "What's one thing you're grateful for?",
  "Did you try anything new?"
];

const LifeTrendChart = ({ data, color = "#22d3ee" }) => {
  if (!data || data.length < 2) return <div className="text-xs text-gray-500 italic p-4 text-center border border-gray-800 rounded-lg">Log at least 2 weeks with ratings to see your trend.</div>;
  const height = 100; const maxVal = 10;
  const points = data.map((val, i) => { const x = (i / (data.length - 1)) * 300; const y = height - (val / maxVal) * height; return `${x},${y}`; }).join(' ');
  const avg = Math.round((data.reduce((a,b) => a + b, 0) / data.length) * 10) / 10;

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex justify-between items-end px-1">
        <div><span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Happiness Trend</span><span className="text-[10px] text-gray-600">Last 52 Weeks</span></div>
        <div className="text-right"><span className="text-2xl font-black" style={{ color }}>{avg}</span><span className="text-[10px] text-gray-500 font-bold uppercase ml-1">AVG</span></div>
      </div>
      <div className="relative h-[120px] w-full bg-gradient-to-b from-gray-900/50 to-transparent rounded-xl border border-gray-800/50 overflow-hidden shadow-inner">
        <div className="absolute top-1/4 left-0 right-0 border-t border-dashed border-gray-800/50"></div><div className="absolute top-2/4 left-0 right-0 border-t border-dashed border-gray-800/50"></div><div className="absolute top-3/4 left-0 right-0 border-t border-dashed border-gray-800/50"></div>
        <svg height="100%" width="100%" viewBox={`0 0 300 ${height}`} preserveAspectRatio="none" className="overflow-visible absolute top-3 left-0 right-0 px-2">
          <defs><linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.2" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
          <polygon points={`0,${height} ${points} 300,${height}`} fill="url(#gradient)" /><polyline fill="none" stroke={color} strokeWidth="3" points={points} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
    </div>
  );
};

// Optimization: Strict comparison for WeekBox to prevent unnecessary re-renders
const WeekBox = React.memo(({ weekIndex, boxClass, opacityClass, animDelay, onClick, isCurrent }) => {
  return (
    <div 
      className={`w-[10px] h-[10px] md:w-[9px] md:h-[9px] ${boxClass} ${opacityClass} ${animDelay ? 'animate-burn-in' : ''}`} 
      style={{ animationDelay: animDelay }}
      onClick={() => onClick(weekIndex)} 
      id={`week-${weekIndex}`}
    />
  );
}, (prev, next) => {
    return prev.boxClass === next.boxClass && 
           prev.opacityClass === next.opacityClass && 
           prev.animDelay === next.animDelay && 
           prev.isCurrent === next.isCurrent;
});

const MemoryModal = ({ weekIndex, initialData, categories, onClose, onSave, isCurrentWeek, isFuture, getDateStr, getEraName, tutorialMode, finishTutorial }) => {
  const [title, setTitle] = useState(initialData.title || '');
  const [text, setText] = useState(initialData.text || ''); 
  const [rating, setRating] = useState(initialData.rating || 5);
  const [isMilestone, setIsMilestone] = useState(initialData.isMilestone || false);
  const [category, setCategory] = useState(initialData.category || 'default');
  const [logs, setLogs] = useState(initialData.logs || []);
  const [newLogText, setNewLogText] = useState('');
  const [newLogTag, setNewLogTag] = useState('');
  const fileUploadRef = useRef(null);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [placeholder, setPlaceholder] = useState(isFuture ? "Steps to achieve this..." : "Weekly summary...");

  const rollDice = () => {
    const random = WRITING_PROMPTS[Math.floor(Math.random() * WRITING_PROMPTS.length)];
    setCurrentPrompt(random);
  };

  const triggerOracle = () => {
    const randomPrompt = JOURNAL_PROMPTS[Math.floor(Math.random() * JOURNAL_PROMPTS.length)];
    setPlaceholder(randomPrompt);
  };

  const handleAddLog = () => {
    if (!newLogText.trim()) return;
    const newEntry = { id: Date.now(), text: newLogText, tag: newLogTag || new Date().toLocaleDateString('en-US', { weekday: 'short' }) };
    setLogs([...logs, newEntry]); setNewLogText(''); setNewLogTag('');
  };
  const handleRemoveLog = (id) => setLogs(logs.filter(l => l.id !== id));
  
  const handleSave = () =>{
    if(isCurrentWeek || !isFuture) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#06b6d4', '#ffffff', '#fbbf24']
      });
    }
    onSave({ title, text, rating, isMilestone, category, logs });  
  };
  
  const getCategoryStyle = (catKey) => {
    const cat = categories[catKey] || categories.default;
    return { ...PRESET_COLORS[cat.colorKey || 'slate'], label: cat.label };
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[150] backdrop-blur-sm overflow-hidden">
      <div className={`flex flex-col md:flex-row items-center justify-center gap-6 transition-all duration-500 ${tutorialMode ? 'w-full max-w-6xl' : 'w-full max-w-lg'}`}>

        {/* --- TUTORIAL SIDECAR --- */}
        {tutorialMode && (
          <div className="w-full md:w-80 bg-[#0a0a0a] border border-cyan-500/50 p-6 rounded-2xl shadow-2xl animate-in slide-in-from-left-8 duration-700 flex-shrink-0 order-2 md:order-1">
             <h3 className="text-xl font-black text-white mb-6 tracking-wide border-b border-gray-800 pb-4">LOGGING A MEMORY</h3>
             <div className="space-y-6 text-sm text-gray-400">
                <div className="flex gap-4">
                  <div className="bg-gray-800 h-10 w-10 flex items-center justify-center rounded-lg text-xl flex-shrink-0">📰</div>
                  <div><strong className="text-white block mb-1">Headline</strong>Give your week a short title like "Trip to Japan" to make it searchable.</div>
                </div>
                <div className="flex gap-4">
                  <div className="bg-gray-800 h-10 w-10 flex items-center justify-center rounded-lg text-xl flex-shrink-0">📊</div>
                  <div><strong className="text-white block mb-1">Rating</strong>Score your week 1-10. Be honest. This builds your life graph.</div>
                </div>
             </div>
             <button onClick={finishTutorial} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3.5 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all active:scale-[0.98] uppercase tracking-widest text-[10px] mt-8">
               Start Using Mementus
             </button>
          </div>
        )}

        {/* --- MAIN MODAL FORM --- */}
        <div className={`bg-[#1E1E1E] border ${isFuture ? 'border-dashed border-gray-600' : 'border-gray-800'} shadow-2xl rounded-2xl w-full flex flex-col max-h-[90vh] overflow-hidden flex-shrink-0 order-1 md:order-2 md:max-w-lg`}>
          <div className="p-6 border-b border-gray-800 bg-[#1E1E1E] z-10">
            <div className="flex justify-between items-center mb-1">
              {/* Dynamic Header */}
              <h2 className="text-xl font-bold text-white">{isCurrentWeek ? "Log This Week" : (isFuture ? "Set Future Goal" : "Edit Memory")}</h2>
              <button onClick={() => setIsMilestone(!isMilestone)} className={`text-2xl transition-transform ${isMilestone ? 'scale-110' : 'opacity-30 hover:opacity-100'}`} title="Milestone">{isMilestone ? '⭐' : '☆'}</button>
            </div>
            <p className="text-xs uppercase tracking-widest font-bold text-gray-500 flex items-center gap-2"><span className="text-cyan-500">{getDateStr}</span><span>•</span>{getEraName}</p>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-4">
              <input className="w-full bg-black/50 text-white p-3 rounded-lg border border-gray-700 focus:border-cyan-500 outline-none font-bold" placeholder={isFuture ? "Goal Title (e.g. Marathon)" : "Headline"} value={title} onChange={(e) => setTitle(e.target.value)} />
              
              <div className="flex gap-2">
                  {/* Hide Rating if setting a future goal */}
                  {!isFuture && (
                    <div className="flex-1 bg-black/30 p-3 rounded-lg border border-gray-800 flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500">RATING</span>
                      <div className="flex items-center gap-2">
                        <input type="range" min="1" max="10" value={rating} onChange={(e) => setRating(parseInt(e.target.value))} className="w-20 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                        <span className="text-yellow-500 text-xs font-bold">{rating}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex-1 bg-black/30 p-2 rounded-lg border border-gray-800 overflow-x-auto no-scrollbar flex items-center">
                    <div className="flex gap-2">
                      {Object.entries(categories).map(([key, val]) => {
                        const styles = getCategoryStyle(key);
                        return ( <button key={key} onClick={() => setCategory(key)} className={`flex-shrink-0 px-2 py-1 rounded text-[10px] font-bold transition-all border ${category === key ? styles.bg + ' text-white border-transparent' : 'bg-transparent text-gray-500 border-gray-700'}`}>{val.label}</button>);
                      })}
                    </div>
                  </div>
              </div>
              
              <textarea 
                className="w-full bg-black/50 text-white p-4 rounded-lg border border-gray-700 focus:border-white outline-none min-h-[100px] resize-none text-base pr-10" // Added pr-10 for button space
                value={text} 
                onChange={(e) => setText(e.target.value)} 
                placeholder={placeholder} // Uses dynamic placeholder
              />
              {/* THE ORACLE BUTTON */}
              <button 
                onClick={triggerOracle} 
                className="absolute top-3 right-3 text-gray-500 hover:text-cyan-400 transition-colors text-lg" 
                title="Get a writing prompt"
              >
                🎲
              </button>
            </div>
            
            {/* Hide daily logs for future goals to keep UI clean */}
            {!isFuture && (
              <div className="border-t border-gray-800 pt-6">
                <h3 className="text-xs uppercase font-bold text-gray-500 mb-3">Daily Journal</h3>
                <div className="space-y-2 mb-4">
                  {logs.map(log => (
                    <div key={log.id} className="flex gap-3 bg-black/30 p-3 rounded border border-gray-800 group">
                      <span className="text-[10px] font-bold text-cyan-500 bg-cyan-900/20 px-2 py-1 rounded h-fit uppercase">{log.tag}</span>
                      <span className="text-sm text-gray-300 flex-1">{log.text}</span>
                      <button onClick={() => handleRemoveLog(log.id)} className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">×</button>
                    </div>
                  ))}
                  {logs.length === 0 && <div className="text-center text-xs text-gray-700 py-2 italic">No daily logs yet.</div>}
                </div>
                <div className="flex gap-2">
                  <input className="w-20 bg-black/50 text-white text-xs p-3 rounded-lg border border-gray-800 focus:border-cyan-500 outline-none uppercase font-bold text-center" placeholder="DAY" value={newLogTag} onChange={(e) => setNewLogTag(e.target.value)} />
                  <input className="flex-1 bg-black/50 text-white text-sm p-3 rounded-lg border border-gray-800 focus:border-cyan-500 outline-none" placeholder="Add entry..." value={newLogText} onChange={(e) => setNewLogText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddLog()} />
                  <button onClick={handleAddLog} className="bg-gray-800 hover:bg-gray-700 text-white px-4 rounded-lg border border-gray-700 text-lg">+</button>
                </div>
              </div>
            )}
          </div>
          <div className="p-4 border-t   border-gray-800 bg-[#1E1E1E] flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 text-gray-400 hover:text-white transition-colors">Cancel</button>
            <button onClick={handleSave} className={`flex-1 text-black font-bold py-3 rounded-lg shadow-lg hover:scale-[1.02] transition-transform ${isMilestone ? 'bg-amber-400 hover:bg-amber-300' : 'bg-white hover:bg-gray-200'}`}>{isFuture ? "SET GOAL" : "SAVE ENTRY"}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP ---
function App() {
  const [birthday, setBirthday] = useState(() => localStorage.getItem('dob') || '');
  const [intentions, setIntentions] = useState(() => JSON.parse(localStorage.getItem('intentions') || '{}'));
  const [categories, setCategories] = useState(() => JSON.parse(localStorage.getItem('categories') || JSON.stringify(INITIAL_CATEGORIES)));
  const [eras, setEras] = useState(() => JSON.parse(localStorage.getItem('eras') || JSON.stringify(DEFAULT_ERAS)));
  
  const [view, setView] = useState('grid');
  // Chapter Settings Inputs
  const [newChapterName, setNewChapterName] = useState('');
  const [newChapterAge, setNewChapterAge] = useState('');
  const [newChapterColor, setNewChapterColor] = useState('bg-blue-600/50');
  const [showModal, setShowModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false); 
  const [selectedWeek, setSelectedWeek] = useState(null);
  
  // --- SELECTION / PREVIEW STATE ---
  const [previewWeek, setPreviewWeek] = useState(null);

  const [tutorialStep, setTutorialStep] = useState(() => {
    const hasSeen = localStorage.getItem('tutorial_seen');
    const hasDob = localStorage.getItem('dob');
    return (hasDob && !hasSeen) ? 1 : 0;
  });

  const [showPastAnimation, setShowPastAnimation] = useState(false);
  const [gridReady, setGridReady] = useState(() => localStorage.getItem('tutorial_seen') === 'true');

  const [rawSearch, setRawSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('blue');
  const [settingsTab, setSettingsTab] = useState('categories');
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, content: null });
  const fileInputRef = useRef(null);

  const getEraForWeek = (weekIndex) => { 
    // Sort eras by start week to ensure we check in order
    const sortedEras = [...eras].sort((a, b) => a.startWeek - b.startWeek);
    for (let i = sortedEras.length - 1; i >= 0; i--) {
      if (weekIndex >= sortedEras[i].startWeek) {
        return { name: sortedEras[i].name, color: sortedEras[i].color };
      }
    }
    return { name: 'Unknown', color: 'bg-gray-800' };
  };
  
  const getDateFromWeekIndex = (weekIndex) => {
    if (!birthday) return "";
    const birthDate = new Date(birthday);
    const targetDate = new Date(birthDate.getTime() + weekIndex * 7 * 24 * 60 * 60 * 1000);
    return targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  const getAgeFromWeekIndex = (weekIndex) => Math.floor(weekIndex / 52);
  const getCategoryStyle = useCallback((catKey) => { const c = categories[catKey] || categories.default; return { ...PRESET_COLORS[c.colorKey || 'slate'], label: c.label }; }, [categories]);
  
  const getLifeStats = useMemo(() => {
    if (!birthday) return { weeksLived: 0, totalWeeks: 4680 };
    const birthDate = new Date(birthday);
    const today = new Date();
    const diffTime = Math.abs(today - birthDate);
    const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
    return { weeksLived: diffWeeks, totalWeeks: 4680 };
  }, [birthday]);
  const stats = getLifeStats;

  const handleShuffle = () => {
    // 1. Get all weeks that have data (title or text) and are in the past
    const filledIndices = Object.keys(intentions).filter(k => {
      const entry = intentions[k];
      return parseInt(k) < stats.weeksLived && (entry.title || entry.text);
    });

    if (filledIndices.length === 0) {
      alert("Log some memories first!");
      return;
    }

    // 2. Pick a random index
    const randomIndex = filledIndices[Math.floor(Math.random() * filledIndices.length)];
    const numericIndex = parseInt(randomIndex);

    // 3. Zoom to it
    setView('grid');
    
    // Small timeout to let view switch if needed
    setTimeout(() => {
        const el = document.getElementById(`week-${numericIndex}`);
        if(el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Add a little highlight effect or confetti?
            handleBoxClick(numericIndex);
        }
    }, 100);
  };

  // Optimized Navigation: Uses IDs for reliability
  const jumpToNow = useCallback(() => {
    const el = document.getElementById(`week-${stats.weeksLived}`);
    if(el) el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  }, [stats.weeksLived]);

  const addChapter = () => {
    if (!newChapterName || !newChapterAge) return;
    const startWeek = Math.floor(parseFloat(newChapterAge) * 52);
    const newEra = { id: Date.now().toString(), name: newChapterName, startWeek, color: newChapterColor };
    const updatedEras = [...eras, newEra].sort((a,b) => a.startWeek - b.startWeek);
    setEras(updatedEras);
    localStorage.setItem('eras', JSON.stringify(updatedEras));
    setNewChapterName(''); setNewChapterAge('');
  };

  const deleteChapter = (id) => {
    if (eras.length <= 1) { alert("You must have at least one chapter."); return; }
    const updatedEras = eras.filter(e => e.id !== id);
    setEras(updatedEras);
    localStorage.setItem('eras', JSON.stringify(updatedEras));
  };

  // Flashback Logic (1 Year Ago)
  const getFlashback = useMemo(() => {
    const oneYearAgoIndex = stats.weeksLived - 52;
    const entry = intentions[oneYearAgoIndex];
    if (entry && (entry.title || entry.text)) {
      return (
        <div className="w-full max-w-[1200px] mb-4 landscape-hide animate-in slide-in-from-top duration-700">
           <div 
             className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 p-4 rounded-xl flex items-center justify-between cursor-pointer hover:bg-indigo-900/60 transition-all group"
             onClick={() => {
                const el = document.getElementById(`week-${oneYearAgoIndex}`);
                if(el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                openModal(oneYearAgoIndex);
             }}
           >
              <div className="flex gap-4 items-center">
                 <div className="h-10 w-10 bg-indigo-500 rounded-full flex items-center justify-center text-xl shadow-[0_0_15px_rgba(99,102,241,0.5)] group-hover:scale-110 transition-transform">↺</div>
                 <div>
                    <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-0.5">Time Capsule • 1 Year Ago</p>
                    <h4 className="text-white font-bold text-sm">{entry.title || "Untitled Memory"}</h4>
                 </div>
              </div>
              <span className="text-indigo-400 text-xs font-bold group-hover:translate-x-1 transition-transform">OPEN &rarr;</span>
           </div>
        </div>
      );
    }
    return null;
  }, [stats.weeksLived, intentions]);

  // Next Goal Engine
  const nextGoal = useMemo(() => {
    if(!gridReady) return null;
    const current = stats.weeksLived;
    const futureEntries = Object.entries(intentions)
      .filter(([k, v]) => parseInt(k) > current && (v.title || v.text))
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
    
    if (futureEntries.length > 0) {
      const [weekIndex, data] = futureEntries[0];
      return { title: data.title || "Upcoming Goal", weeksLeft: parseInt(weekIndex) - current, weekIndex: parseInt(weekIndex) };
    }
    return null;
  }, [intentions, stats, gridReady]);

  // 2. Streak Calculation (Re-included)
  const currentStreak = useMemo(() => {
    let streak = 0;
    let current = stats.weeksLived;
    while (intentions[current] || intentions[current - 1]) {
      if (intentions[current]) { streak++; current--; } 
      else if (intentions[current - 1]) { streak++; current--; } 
      else { break; }
    }
    return streak;
  }, [intentions, stats]);
  
  // Optimization: Early return for search
  const doesMatchSearch = useCallback((entry) => { 
    if (!debouncedSearch) return true; 
    if (!entry) return false; 
    const q = debouncedSearch.toLowerCase(); 
    const txt = typeof entry === 'string' ? entry : entry.text || ''; 
    const ti = entry.title || ''; 
    const cl = categories[entry.category]?.label || ''; 
    return txt.toLowerCase().includes(q) || ti.toLowerCase().includes(q) || cl.toLowerCase().includes(q) || (entry.logs && entry.logs.some(l => l.text.toLowerCase().includes(q))); 
  }, [debouncedSearch, categories]);
  
  const dashboardStats = useMemo(() => { 
    const v = Object.values(intentions); 
    const trendData = Object.entries(intentions).filter(([k, val]) => parseInt(k) <= stats.weeksLived && val.rating).sort((a, b) => parseInt(a[0]) - parseInt(b[0])).slice(-52).map(([_, val]) => val.rating);
    return { totalMemories: v.length, totalMilestones: v.filter(e => e.isMilestone).length, catCounts: v.reduce((acc, e) => { acc[e.category||'default'] = (acc[e.category||'default'] || 0) + 1; return acc; }, {}), trendData }; 
  }, [intentions, stats]);

  const getSortedEntries = () => Object.entries(intentions).map(([i, d]) => ({ weekIndex: parseInt(i), ...(typeof d === 'string' ? { text: d } : d) })).sort((a, b) => a.weekIndex - b.weekIndex).filter(doesMatchSearch);

  // --- ACTIONS ---
  const nextTutorial = () => {
    if (tutorialStep === 1) {
      setTutorialStep(2); setShowPastAnimation(true); setTimeout(() => setGridReady(true), 3000); 
    } else if (tutorialStep === 2) {
      setTutorialStep(3); // How to Use
    } else if (tutorialStep === 3) {
      setTutorialStep(4); setPreviewWeek(stats.weeksLived); // Try It Out
    } else if (tutorialStep === 4) {
      // Step 5: (Handled by openModal)
    } else {
      setTutorialStep(0);
      localStorage.setItem('tutorial_seen', 'true');
      setGridReady(true);
      setPreviewWeek(null);
      setShowModal(false);
    }
  };

  const skipTutorial = () => {
    setTutorialStep(0);
    localStorage.setItem('tutorial_seen', 'true');
    setGridReady(true);
    setShowPastAnimation(false);
    setPreviewWeek(null);
  };

  // --- 1. HEARTBEAT ---
  useEffect(() => {
    const checkDate = () => {
      const now = new Date();
      const todayStr = now.toDateString();
      const lastRun = localStorage.getItem('lastRunDate');
      if (lastRun !== todayStr) {
        localStorage.setItem('lastRunDate', todayStr);
        window.location.reload(); 
      }
    };
    const interval = setInterval(checkDate, 60000); 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { const h = setTimeout(() => setDebouncedSearch(rawSearch), 300); return () => clearTimeout(h); }, [rawSearch]);
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        if (e.key === 'Escape') { e.target.blur(); setShowModal(false); setShowSettings(false); }
        return;
      }
      switch(e.key.toLowerCase()) {
        case 'k': case '/': e.preventDefault(); document.querySelector('input[type="text"]')?.focus(); break;
        case 'escape': setShowModal(false); setShowSettings(false); setRawSearch(''); setPreviewWeek(null); break;
        case 't': jumpToNow(); break;
        case 'g': setView('grid'); break;
        case 'l': setView('timeline'); break;
        case 's': setView('stats'); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [jumpToNow]);

  // --- DATA ---
  const scheduleNotification = async () => {
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== 'granted') return;
    await LocalNotifications.cancel(await LocalNotifications.getPending());
    await LocalNotifications.schedule({ notifications: [{ title: "Mementus", body: "Time to log your week.", id: 1, schedule: { on: { weekday: 6, hour: 20, minute: 0 }, allowWhileIdle: true } }] });
    alert("Reminder enabled: Fridays at 8 PM.");
  };

  const handleBoxClick = useCallback((weekIndex) => {
    setPreviewWeek(weekIndex);
  }, []);

  const openModal = (weekIndex) => {
    setSelectedWeek(weekIndex);
    setShowModal(true);
    setPreviewWeek(null);
    setTooltip(prev => ({ ...prev, show: false }));
    
    // NEW: If we are in "Try it Out" (Step 4), move to Step 5 (Side-by-Side)
    if (tutorialStep === 4) {
      setTutorialStep(5);
    }
  };

  const adjustPreview = (amount) => {
    if (previewWeek === null) return;
    const newWeek = previewWeek + amount;
    if (newWeek >= 0 && newWeek < stats.totalWeeks) {
      setPreviewWeek(newWeek);
    }
  };

  // --- PERFORMANCE: MEMOIZED GRID ITEMS ---
  const gridItems = useMemo(() => {
    if (!birthday) return [];
    
    return Array.from({ length: stats.totalWeeks }).map((_, i) => {
      const isPastRaw = i < stats.weeksLived;
      const isPast = isPastRaw && gridReady;
      const isCurrent = i === stats.weeksLived;
      const isFuture = i > stats.weeksLived;
      const entry = intentions[i];
      const era = getEraForWeek(i);
      
      const isMatch = doesMatchSearch(entry);
      // Optimization check:
      const opacityClass = debouncedSearch && !isMatch && !isCurrent ? 'opacity-10 grayscale' : 'opacity-100';
      const isPreview = i === previewWeek;
      
      // NEW: Path Logic
      const isFutureTarget = previewWeek !== null && previewWeek > stats.weeksLived;
      const isInPath = isFutureTarget && i > stats.weeksLived && i < previewWeek;
      
      const isAnimatingPast = isPastRaw && !gridReady && showPastAnimation;

      let boxClass = "rounded-[1px] transition-all duration-200 ease-out"; 
      const crossOutAnimDelay = isAnimatingPast ? `${(i / stats.weeksLived) * 2.5}s` : undefined;
      
      if (isPreview) {
          boxClass += " bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,1)] z-50 scale-150 border border-white";
      } else if (isInPath) {
          // Path Highlight
          boxClass += " bg-cyan-900/40 animate-pulse z-10 scale-110"; 
      } else if (isPast) {
        if (entry) {
          const styles = getCategoryStyle(entry.category || 'default');
          boxClass = `${styles.bg} shadow-[0_0_12px_rgba(255,255,255,0.4)] z-10 hover:scale-150 hover:z-50 hover:bg-white cursor-pointer rounded-[2px]`;
          if (entry.isMilestone) boxClass = "bg-amber-400 shadow-[0_0_20px_rgba(251,191,36,1)] z-20 animate-pulse cursor-pointer hover:scale-150";
        } else { boxClass += ` ${era.color} crossed-out cursor-pointer hover:brightness-125`; }
      } else if (isAnimatingPast) {
        boxClass += ` ${era.color} crossed-out animate-cross-out cursor-pointer`;
      } else if (isCurrent) { boxClass += " bg-white shadow-[0_0_25px_rgba(255,255,255,1)] z-30 scale-125 animate-pulse cursor-pointer"; 
      } else if (isFuture) {
        boxClass += " bg-transparent border border-white/5 hover:border-white/20 cursor-pointer"; 
        if (entry) {
          const styles = getCategoryStyle(entry.category || 'default');
          boxClass = `bg-transparent border-2 border-dashed ${styles.border} shadow-[0_0_10px_rgba(255,255,255,0.1)] z-10 hover:scale-125`; 
          if (entry.isMilestone) boxClass = "bg-transparent border-2 border-dashed border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.4)] hover:scale-125";
        }
      }
      
      return ( <WeekBox key={i} weekIndex={i} boxClass={boxClass} opacityClass={opacityClass} animDelay={crossOutAnimDelay} onClick={handleBoxClick} isCurrent={isCurrent} /> );
    });
  }, [stats, intentions, gridReady, showPastAnimation, previewWeek, debouncedSearch, birthday, getCategoryStyle, handleBoxClick, doesMatchSearch]);

  const onBoxLeave = useCallback(() => { setTooltip(prev => ({ ...prev, show: false })); }, []);

  const handleSaveBirthday = (e) => {
    e.preventDefault();
    const date = e.target.dob.value;
    if (date) {
      localStorage.setItem('dob', date);
      setBirthday(date);
      setView('grid'); 
      setTutorialStep(1);
    }
  };
  
  const updateBirthday = (e) => {
    const date = e.target.value;
    setBirthday(date);
    localStorage.setItem('dob', date);
  };

  const resetApp = () => {
    if (confirm("DANGER: This will permanently delete ALL your memories.\n\nAre you sure?")) {
      localStorage.removeItem('dob'); localStorage.removeItem('intentions'); localStorage.removeItem('categories'); localStorage.removeItem('reminderTime'); localStorage.removeItem('tutorial_seen');
      setBirthday(''); setIntentions({}); setCategories(INITIAL_CATEGORIES); setShowSettings(false); setTutorialStep(0); setGridReady(false);
    }
  };

  const saveIntention = (modalData) => {
    if (selectedWeek === null) return;
    const newIntentions = { ...intentions };
    const isEmpty = !modalData.text.trim() && !modalData.title.trim() && modalData.logs.length === 0;
    if (isEmpty) { delete newIntentions[selectedWeek]; } else { newIntentions[selectedWeek] = modalData; }
    setIntentions(newIntentions);
    localStorage.setItem('intentions', JSON.stringify(newIntentions));
    setShowModal(false);
  };

  const exportData = () => {
    const data = { dob: birthday, intentions: intentions, categories: categories, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = `mementus-backup.json`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const importData = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.dob && data.intentions) {
          if (confirm("Overwrite current grid?")) {
            localStorage.setItem('dob', data.dob); localStorage.setItem('intentions', JSON.stringify(data.intentions));
            const cats = data.categories || INITIAL_CATEGORIES; localStorage.setItem('categories', JSON.stringify(cats));
            setBirthday(data.dob); setIntentions(data.intentions); setCategories(cats); alert("Restored.");
            setGridReady(true);
          }
        } else { alert("Invalid file."); }
      } catch (err) { alert("Error reading file."); }
    };
    reader.readAsText(file); event.target.value = null;
  };

  const addCategory = () => {
    if (!newCatName.trim()) return;
    const id = newCatName.toLowerCase().replace(/\s+/g, '_');
    const newCats = { ...categories, [id]: { label: newCatName, colorKey: newCatColor } };
    setCategories(newCats); localStorage.setItem('categories', JSON.stringify(newCats)); setNewCatName('');
  };

  const deleteCategory = (key) => {
    if (key === 'default') return;
    const newCats = { ...categories }; delete newCats[key];
    setCategories(newCats); localStorage.setItem('categories', JSON.stringify(newCats));
  };

  if (!birthday) {
    return (
      <div className="min-h-[100dvh] bg-[#050505] flex items-center justify-center p-6">
        <style>{GLOBAL_STYLES}</style>
        <div className="max-w-md w-full bg-[#1E1E1E]/80 backdrop-blur-xl p-8 rounded-2xl border border-cyan-900/30 shadow-[0_0_30px_rgba(6,182,212,0.15)] text-center">
          <h1 className="text-4xl font-black text-white mb-2 tracking-tighter drop-shadow-[0_0_10px_rgba(6,182,212,0.4)]">MEMENTUS</h1>
          <p className="text-cyan-200/50 mb-8 font-medium tracking-wide">Your life in weeks.</p>
          <form onSubmit={handleSaveBirthday} className="space-y-5">
            <input type="date" name="dob" className="w-full bg-black/40 text-white p-4 rounded-xl border border-gray-800 transition-all duration-300 focus:border-cyan-500 focus:shadow-[0_0_15px_rgba(6,182,212,0.2)] outline-none text-center text-xl placeholder-gray-600" required />
            <button className="w-full bg-cyan-500 text-black font-black tracking-wider py-4 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] hover:bg-cyan-400 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">START COUNTING</button>
            <div className="mt-6"><button type="button" onClick={() => fileInputRef.current.click()} className="text-sm text-gray-500 hover:text-cyan-300 transition-colors underline-offset-4 hover:underline">Upload JSON</button></div>
          </form>
          <input type="file" ref={fileInputRef} onChange={importData} accept=".json" className="hidden" />
        </div>
      </div>
    );
  }

  return (
    // OPTIMIZATION: Use dvh (Dynamic Viewport Height) to fix iOS address bar issue
    <div className="min-h-[100dvh] bg-[#050505] overflow-x-hidden text-white flex flex-col items-center relative pb-24 md:pb-10">
      <style>{GLOBAL_STYLES}</style>
      
      {/* HEADER */}
      <header className="w-full max-w-[1200px] flex flex-col gap-3 px-4 py-4 md:px-0 md:py-8 pb-2 border-b border-gray-800 bg-[#050505] sticky top-0 z-30 landscape-compact">
        <div className="flex flex-row justify-between items-end gap-4 landscape-row w-full">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">LIFE GRID</h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-gray-500 text-xs md:text-sm">
                <span className="text-white font-bold">{stats.weeksLived}</span> Weeks Lived
              </p>
              
              {/* NEW: MORTAL PROGRESS BAR */}
              <div className="h-1.5 w-24 md:w-32 bg-gray-900 rounded-full overflow-hidden border border-gray-800 relative group" title={`${((stats.weeksLived / stats.totalWeeks) * 100).toFixed(1)}% Complete`}>
                <div 
                  className="h-full bg-gradient-to-r from-cyan-900 to-cyan-500" 
                  style={{ width: `${(stats.weeksLived / stats.totalWeeks) * 100}%` }}
                ></div>
              </div>
              <span className="text-[10px] text-gray-600 font-mono">
                {((stats.weeksLived / stats.totalWeeks) * 100).toFixed(1)}%
              </span>
            </div>
            <p className="text-gray-500 text-xs md:text-sm mt-1"><span className="text-white font-bold">{Object.keys(intentions).length}</span> Memories | <span className="text-white font-bold">{stats.weeksLived}</span> Weeks</p>
          </div>
          <div className="flex gap-3 items-center flex-wrap justify-end">
            <input type="text" placeholder="Search..." value={rawSearch} onChange={(e) => setRawSearch(e.target.value)} className="bg-gray-900 border border-gray-700 text-white text-xs rounded px-3 py-2 w-28 md:w-32 focus:w-48 transition-all outline-none" />
            <div className="bg-gray-800 p-1 rounded-lg hidden md:flex">
              {['grid', 'timeline', 'milestones', 'stats'].map(v => <button key={v} onClick={() => setView(v)} className={`px-3 py-1 rounded text-xs font-bold transition-all uppercase ${view === v ? 'bg-gray-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>{v}</button>)}
            </div>
            <button onClick={() => { setShowSettings(true); setSettingsTab('chapters'); }} className="p-2 bg-gray-800 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors flex items-center gap-2" title="Settings"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg></button>
          </div>
        </div>
        {view === 'grid' && (
          <div className="w-full flex flex-col gap-2 md:gap-3 mt-1 landscape-hide">
            <div className="w-full flex md:flex-wrap gap-3 overflow-x-auto no-scrollbar items-center py-1 px-1 md:justify-center">
              {eras.map(era => {
                const isCurrentEra = era.name === getEraForWeek(stats.weeksLived).name;
                return (
                  <div key={era.name} className={`flex items-center gap-2 flex-shrink-0 transition-all duration-300 ${isCurrentEra ? 'opacity-100 scale-105' : 'opacity-50'}`}>
                    <div className={`w-3 h-3 rounded-[1px] ${era.color}`}></div><span className={`text-[10px] uppercase font-bold whitespace-nowrap ${isCurrentEra ? 'text-white' : 'text-gray-500'}`}>{era.name}</span>
                  </div>
                );
              })}
            </div>
            <div className="w-full flex md:flex-wrap gap-3 overflow-x-auto no-scrollbar items-center py-1 px-1 md:justify-center border-t border-white/5 md:border-none pt-2 md:pt-0">
              {Object.entries(categories).filter(([k]) => k !== 'default').map(([key, val]) => {
                const styles = getCategoryStyle(key);
                return (
                  <div key={key} className="flex items-center gap-2 flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity">
                    <div className={`w-3 h-3 ${styles.bg} rounded-full`}></div><span className="text-[10px] uppercase font-bold text-gray-500 whitespace-nowrap">{val.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* --- MILESTONES VIEW (The Highlight Reel) --- */}
      {view === 'milestones' && (
        <div className="max-w-4xl w-full flex flex-col gap-8 px-4 md:px-0 mt-12 md:mt-20 pb-20">
          <div className="text-center space-y-2 mb-4 animate-text-reveal">
            <h2 className="text-3xl font-black text-amber-400 tracking-tight">HALL OF FAME</h2>
            <p className="text-gray-500 text-xs uppercase tracking-widest">Your Life's Greatest Hits</p>
          </div>

          {Object.values(intentions).filter(e => e.isMilestone).length === 0 ? (
            <div className="text-center text-gray-600 italic py-20 border border-dashed border-gray-800 rounded-xl">
              No milestones yet. <br/> Click the <span className="text-amber-400">⭐</span> on a memory to add it here.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {getSortedEntries()
                .filter(entry => entry.isMilestone)
                .map((entry, i) => {
                  const era = getEraForWeek(entry.weekIndex);
                  const delay = `${i * 0.1}s`;
                  
                  return (
                    <div 
                      key={entry.weekIndex} 
                      onClick={() => { setView('grid'); setTimeout(() => { document.getElementById(`week-${entry.weekIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); handleBoxClick(entry.weekIndex); }, 100); }}
                      className="group relative bg-[#1E1E1E] border border-gray-800 rounded-2xl overflow-hidden cursor-pointer hover:scale-[1.02] transition-all duration-300 shadow-2xl animate-text-reveal"
                      style={{ animationDelay: delay }}
                    >
                      {/* Colorful Era Header */}
                      <div className={`h-2 w-full ${era.color} opacity-50 group-hover:opacity-100 transition-opacity`}></div>
                      
                      <div className="p-6 flex flex-col h-full relative">
                        <div className="flex justify-between items-start mb-4">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest border border-gray-800 px-2 py-1 rounded bg-black/30">
                            {getDateFromWeekIndex(entry.weekIndex)}
                          </span>
                          <span className="text-2xl filter drop-shadow-lg">⭐</span>
                        </div>

                        <h3 className="text-xl md:text-2xl font-black text-white mb-3 leading-tight group-hover:text-amber-400 transition-colors">
                          {entry.title || "Untitled Milestone"}
                        </h3>
                        
                        <p className="text-gray-400 text-sm leading-relaxed line-clamp-4">
                          {entry.text}
                        </p>

                        <div className="mt-6 pt-4 border-t border-gray-800 flex justify-between items-center">
                          <span className="text-[10px] text-gray-600 font-bold uppercase">{era.name}</span>
                          <span className="text-xs text-amber-500 font-bold group-hover:translate-x-1 transition-transform">VIEW MEMORY &rarr;</span>
                        </div>
                      </div>
                    </div>
                  );
              })}
            </div>
          )}
        </div>
      )}

      {/* --- WIDGETS (Flashback & Goal) --- */}
      {view === 'grid' && (
        <>
          {getFlashback}
          {nextGoal && (
            <div 
              className="w-full max-w-[1200px] mb-4 flex justify-end px-4 md:px-0"
              onClick={() => {
                 const el = document.getElementById(`week-${nextGoal.weekIndex}`);
                 if(el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                 handleBoxClick(nextGoal.weekIndex);
              }}
            >
              <div className="bg-gray-900/80 border border-cyan-900/50 p-3 rounded-lg flex items-center gap-4 cursor-pointer hover:bg-gray-800 transition-all group backdrop-blur-md">
                 <div className="text-right">
                    <p className="text-[10px] text-cyan-500 uppercase font-bold tracking-wider">Next Target</p>
                    <p className="text-white font-bold text-sm">{nextGoal.title}</p>
                 </div>
                 <div className="bg-cyan-950 border border-cyan-800 rounded px-3 py-1 text-center min-w-[60px]">
                    <span className="block text-xl font-black text-cyan-400 leading-none">{nextGoal.weeksLeft}</span>
                    <span className="text-[9px] text-cyan-600 uppercase font-bold">Weeks</span>
                 </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* GRID VIEW */}
      {view === 'grid' && (
        <div className="w-full overflow-x-auto flex justify-center px-4 md:px-0 touch-pan-y">
           {/* OPTIMIZATION: touch-pan-y prevents horizontal scroll issues on mobile */}
           {/* OPTIMIZATION: w-full max-w-[1200px] improves responsiveness */}
           <div className="grid-container-optimized flex flex-wrap content-start gap-[2px] md:gap-[3px] min-w-[420px] max-w-[420px] w-full md:max-w-[1200px] pb-32">
            {/* RENDER THE MEMOIZED GRID ITEMS HERE */}
            {gridItems}
          </div>
        </div>
      )}

      {/* --- CONTROL BAR (Z-Index 120 to pop over Tutorial) --- */}
      {previewWeek !== null && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#121212] border-t border-gray-800 p-4 pb-8 z-[120] flex flex-col gap-3 shadow-2xl animate-in slide-in-from-bottom duration-200">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Selected Week</p>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                {getDateFromWeekIndex(previewWeek)}
                {intentions[previewWeek] && <span className="text-[10px] bg-cyan-900 text-cyan-400 px-1 rounded">HAS DATA</span>}
              </h3>
            </div>
            <div className="text-right">
               <p className="text-[10px] uppercase font-bold text-gray-500">{getEraForWeek(previewWeek).name}</p>
               <p className="text-xs text-gray-400">Age {getAgeFromWeekIndex(previewWeek)}</p>
            </div>
          </div>
          <div className="flex gap-2 h-12">
            <button onClick={() => adjustPreview(-1)} className="w-14 bg-gray-800 rounded-lg flex items-center justify-center text-xl hover:bg-gray-700 active:scale-95 transition-all border border-gray-700">←</button>
            <button onClick={() => openModal(previewWeek)} className="flex-1 bg-cyan-500 text-black font-black text-sm uppercase tracking-wider rounded-lg hover:bg-cyan-400 active:scale-[0.98] transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                {intentions[previewWeek] ? "Edit Entry" : (previewWeek > stats.weeksLived ? "Set Goal" : "Log Memory")}
            </button>
            <button onClick={() => adjustPreview(1)} className="w-14 bg-gray-800 rounded-lg flex items-center justify-center text-xl hover:bg-gray-700 active:scale-95 transition-all border border-gray-700">→</button>
          </div>
          <button onClick={() => setPreviewWeek(null)} className="absolute -top-10 right-4 bg-gray-800 text-white rounded-full p-2 text-xs shadow-lg border border-gray-700">✕ Cancel</button>
        </div>
      )}

      {/* TIMELINE VIEW (EXPANDED) */}
      {view === 'timeline' && (
        <div className="max-w-2xl w-full flex flex-col gap-6 px-4 md:px-0 mt-12 md:mt-20">
          {getSortedEntries().length === 0 ? (
            <div className="text-center text-gray-500 py-20">{debouncedSearch ? "No matches found." : "No memories logged yet."}</div>
          ) : (
            getSortedEntries().map((entry) => {
              const styles = getCategoryStyle(entry.category || 'default');
              const isFuture = entry.weekIndex > stats.weeksLived;
              return (
                <div key={entry.weekIndex} className={`bg-[#1E1E1E] border-l-4 p-6 rounded-r-lg shadow-lg cursor-pointer hover:bg-[#252525] transition-colors group relative ${isFuture ? 'opacity-70 border-dashed' : ''}`} style={{ borderLeftColor: entry.isMilestone ? '#fbbf24' : (isFuture ? 'gray' : undefined) }} onClick={() => { setView('grid'); setTimeout(() => { document.getElementById(`week-${entry.weekIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); handleBoxClick(entry.weekIndex); }, 100); }}>
                  {!entry.isMilestone && <div className={`absolute left-0 top-0 bottom-0 w-1 ${styles.bg} -ml-[4px]`}></div>}
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex gap-2 items-center">
                      <span className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wider ${isFuture ? 'bg-gray-800 text-gray-400' : `${styles.text} bg-gray-900`}`}>{isFuture ? 'Target' : styles.label}</span>
                      {entry.isMilestone && <span className="text-amber-400 text-lg">⭐</span>}
                      {entry.rating && <span className="text-yellow-500 text-xs ml-2">★ {entry.rating}</span>}
                    </div>
                    <span className="text-xs text-gray-500 font-mono">{getDateFromWeekIndex(entry.weekIndex)}</span>
                  </div>
                  {entry.title && <h3 className="text-white font-bold mb-2 text-lg">{entry.title}</h3>}
                  <p className="text-gray-300 leading-relaxed text-sm whitespace-pre-wrap">{entry.text}</p>
                  {entry.logs && entry.logs.length > 0 && <div className="mt-4 pt-4 border-t border-gray-800 space-y-1">{entry.logs.map(l => <div key={l.id} className="text-xs text-gray-400"><span className="text-cyan-600 font-bold uppercase mr-2">{l.tag}</span>{l.text}</div>)}</div>}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Add this near your "Jump to Now" button at the bottom */}
      {view === 'grid' && !previewWeek && (
        <div className="fixed bottom-24 right-6 md:bottom-10 md:right-10 flex flex-col items-center gap-4 z-40">
          
          {/* 1. Time Travel Button (Small, on top) */}
          <button 
            onClick={handleShuffle} 
            className="bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 group" 
            title="Random Memory"
          >
             <span className="text-xl group-hover:rotate-180 transition-transform duration-500 block">🎲</span>
          </button>

          {/* 2. Jump to Now Button (Main, on bottom) */}
          <button 
            onClick={jumpToNow} 
            className="bg-cyan-500 hover:bg-white text-black p-4 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all hover:scale-110 active:scale-95 group" 
            title="Jump to Today"
          >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
      )}

      {/* STATS VIEW (EXPANDED) */}
      {view === 'stats' && (
        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-6 px-4 md:px-0 pb-20 animate-in fade-in duration-500 mt-12 md:mt-20">
           <div className="col-span-1 md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
             <div className="bg-[#1E1E1E] p-6 rounded-xl border border-gray-800 flex flex-col items-center justify-center aspect-square md:aspect-auto">
                <span className="text-2xl md:text-4xl font-bold text-white mb-2">{dashboardStats.totalMemories}</span><span className="text-[10px] md:text-xs uppercase tracking-widest text-gray-500 text-center">Total Memories</span>
             </div>
             <div className="bg-[#1E1E1E] p-6 rounded-xl border border-gray-800 flex flex-col items-center justify-center aspect-square md:aspect-auto">
                <span className="text-2xl md:text-4xl font-bold text-amber-400 mb-2">{dashboardStats.totalMilestones}</span><span className="text-[10px] md:text-xs uppercase tracking-widest text-amber-500/70 text-center">Milestones</span>
             </div>
             <div className="bg-[#1E1E1E] p-6 rounded-xl border border-gray-800 flex flex-col items-center justify-center aspect-square md:aspect-auto">
                <span className="text-2xl md:text-4xl font-bold text-cyan-400 mb-2">{Math.round((dashboardStats.totalMemories / stats.weeksLived) * 100) || 0}%</span><span className="text-[10px] md:text-xs uppercase tracking-widest text-cyan-500/70 text-center">Docs Rate</span>
             </div>
             <div className="bg-[#1E1E1E] p-6 rounded-xl border border-gray-800 flex flex-col items-center justify-center aspect-square md:aspect-auto">
                <span className="text-2xl md:text-4xl font-bold text-white mb-2">{4680 - stats.weeksLived}</span><span className="text-[10px] md:text-xs uppercase tracking-widest text-gray-500 text-center">Weeks Left</span>
             </div>
          </div>
          <div className="col-span-1 md:col-span-2 bg-[#1E1E1E] p-8 rounded-xl border border-gray-800">
            <h3 className="text-xl font-bold mb-6">Life Balance</h3>
            <div className="space-y-4">
              {Object.entries(categories).map(([key, val]) => {
                const styles = getCategoryStyle(key);
                const count = dashboardStats.catCounts[key] || 0;
                const percent = dashboardStats.totalMemories > 0 ? (count / dashboardStats.totalMemories) * 100 : 0;
                if (count === 0 && key !== 'default') return null; 
                return (
                  <div key={key}>
                    <div className="flex justify-between text-xs uppercase font-bold mb-1"><span className={styles.text}>{val.label}</span><span className="text-gray-500">{count} ({Math.round(percent)}%)</span></div>
                    <div className="w-full bg-gray-900 rounded-full h-3 overflow-hidden"><div className={`h-full ${styles.bg} transition-all duration-1000`} style={{ width: `${percent}%` }}></div></div>
                  </div>
                );
              })}
            </div>
            <div className="col-span-1 md:col-span-2 bg-[#1E1E1E] p-8 rounded-xl border border-gray-800">
             <LifeTrendChart data={dashboardStats.trendData} />
          </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-[#050505] border-t border-gray-800 p-2 pb-6 flex md:hidden justify-around z-50">
         {['grid', 'timeline', 'milestones','stats'].map(v => (
           <button key={v} onClick={() => { setView(v); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all active:scale-95 ${view === v ? 'text-white' : 'text-gray-600'}`}>
             {v === 'grid' && <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>}
             {v === 'timeline' && <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>}
             {v === 'milestones' && <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>}
             {v === 'stats' && <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>}
             <span className="text-[10px] font-bold uppercase">{v}</span>
           </button>
         ))}
      </div>

      {tooltip.show && <div className="fixed z-50 bg-[#222] border border-gray-700 p-3 rounded-lg shadow-2xl pointer-events-none backdrop-blur-md animate-in fade-in duration-75 max-w-xs" style={{ top: tooltip.y, left: tooltip.x }}>{tooltip.content}</div>}

      {showSettings && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
           <div className="bg-[#1E1E1E] rounded-2xl max-w-lg w-full border border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
             <div className="p-6 border-b border-gray-800 flex justify-between items-center"><h2 className="text-xl font-bold text-white">Settings</h2><button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-white transition-colors">✕</button></div>
             <div className="flex border-b border-gray-800">{['chapters', 'categories', 'profile', 'data'].map(tab => <button key={tab} onClick={() => setSettingsTab(tab)} className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${settingsTab === tab ? 'text-cyan-500 border-cyan-500 bg-gray-900/50' : 'text-gray-500 border-transparent hover:text-white hover:bg-gray-900/30'}`}>{tab}</button>)}</div>
             <div className="p-6 overflow-y-auto">
              {/* NEW: CHAPTERS TAB */}
               {settingsTab === 'chapters' && (
                 <div className="space-y-6">
                   <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800 text-xs text-gray-400 leading-relaxed mb-4">
                     Chapters help you visualize eras of your life (e.g., "College", "Married", "Kyoto Trip"). The grid will change colors based on these milestones.
                   </div>
                   <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                     {eras.map(era => (
                       <div key={era.id} className="flex items-center justify-between bg-gray-900 p-3 rounded-lg border border-gray-800">
                         <div className="flex items-center gap-3">
                           <div className={`w-4 h-4 rounded-sm ${era.color}`}></div>
                           <div><div className="text-sm font-bold text-gray-300">{era.name}</div><div className="text-[10px] text-gray-500 uppercase">Starts at Age {Math.floor(era.startWeek/52)}</div></div>
                         </div>
                         <button onClick={() => deleteChapter(era.id)} className="text-red-500 hover:text-red-400 text-xs uppercase font-bold px-2 py-1">Delete</button>
                       </div>
                     ))}
                   </div>
                   <div className="border-t border-gray-800 pt-4">
                       <h3 className="text-xs uppercase font-bold text-gray-500 mb-3">Add New Chapter</h3>
                       <div className="grid grid-cols-2 gap-2 mb-2">
                         <input className="bg-black/50 border border-gray-700 text-white text-sm rounded px-3 py-2 outline-none" placeholder="Chapter Name" value={newChapterName} onChange={e => setNewChapterName(e.target.value)} />
                         <input className="bg-black/50 border border-gray-700 text-white text-sm rounded px-3 py-2 outline-none" type="number" placeholder="Start Age (e.g. 25)" value={newChapterAge} onChange={e => setNewChapterAge(e.target.value)} />
                       </div>
                       <div className="mb-3 overflow-x-auto flex gap-2 pb-2">
                          {['bg-blue-600/50','bg-red-600/50','bg-green-600/50','bg-purple-600/50','bg-pink-600/50','bg-yellow-600/50','bg-teal-600/50'].map(c => (
                            <button key={c} onClick={() => setNewChapterColor(c)} className={`w-6 h-6 rounded flex-shrink-0 ${c} ${newChapterColor === c ? 'border-2 border-white' : 'border border-transparent'}`}></button>
                          ))}
                       </div>
                       <button onClick={addChapter} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 rounded transition-colors">ADD CHAPTER</button>
                   </div>
                 </div>
               )}
               {settingsTab === 'categories' && (
                 <div className="space-y-6">
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                      {Object.entries(categories).map(([key, val]) => {
                        const styles = getCategoryStyle(key);
                        return (
                          <div key={key} className="flex items-center justify-between bg-gray-900 p-3 rounded-lg border border-gray-800">
                            <div className="flex items-center gap-3"><div className={`w-4 h-4 rounded-full ${styles.bg}`}></div><span className="text-sm font-bold text-gray-300">{val.label}</span></div>
                            {key !== 'default' && <button onClick={() => deleteCategory(key)} className="text-red-500 hover:text-red-400 text-xs uppercase font-bold px-2 py-1 hover:bg-red-900/20 rounded">Delete</button>}
                          </div>
                        );
                      })}
                    </div>
                    <div className="border-t border-gray-800 pt-4">
                        <h3 className="text-xs uppercase font-bold text-gray-500 mb-3">Add New Category</h3>
                        <div className="flex gap-2 mb-3">
                          <input className="bg-black/50 border border-gray-700 text-white text-sm rounded px-3 py-2 flex-1 outline-none focus:border-cyan-500" placeholder="Name" value={newCatName} onChange={e => setNewCatName(e.target.value)} />
                          <select className="bg-black/50 border border-gray-700 text-white text-sm rounded px-3 py-2 outline-none" value={newCatColor} onChange={e => setNewCatColor(e.target.value)}>{Object.keys(PRESET_COLORS).map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}</select>
                        </div>
                        <button onClick={addCategory} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 rounded transition-colors">ADD</button>
                    </div>
                 </div>
               )}
               {settingsTab === 'profile' && (
                 <div className="space-y-4">
                     <label className="block text-xs uppercase font-bold text-gray-500 mb-2">Date of Birth</label>
                     <input type="date" value={birthday} onChange={updateBirthday} className="w-full bg-black/50 text-white p-4 rounded-lg border border-gray-700 focus:border-cyan-500 outline-none text-xl" />
                     <div className="pt-4 border-t border-gray-800">
                      <label className="block text-xs uppercase font-bold text-gray-500 mb-2">Weekly Reminder</label>
                      <button onClick={scheduleNotification} className="w-full bg-gray-800 hover:bg-gray-700 text-white p-4 rounded-lg border border-gray-700 flex items-center justify-center gap-3 transition-all active:scale-95">
                        <span>🔔</span><span className="text-sm font-bold">Enable Friday 8PM Reminder</span>
                      </button>
                     </div>
                 </div>
               )}
               {settingsTab === 'data' && (
                 <div className="space-y-6">
                   <div className="grid grid-cols-2 gap-4">
                     <button onClick={exportData} className="flex flex-col items-center justify-center p-6 bg-gray-800 hover:bg-gray-700 rounded-xl border border-gray-700 transition-colors gap-2 group"><span className="text-2xl group-hover:scale-110 transition-transform">⬇</span><span className="text-sm font-bold">Backup</span></button>
                     <button onClick={() => fileInputRef.current.click()} className="flex flex-col items-center justify-center p-6 bg-gray-800 hover:bg-gray-700 rounded-xl border border-gray-700 transition-colors gap-2 group"><span className="text-2xl group-hover:scale-110 transition-transform">⬆</span><span className="text-sm font-bold">Restore</span></button>
                   </div>
                   <div className="border-t border-gray-800 pt-6">
                     <button onClick={resetApp} className="w-full border border-red-900/50 text-red-500 hover:bg-red-900/20 font-bold py-3 rounded-lg transition-colors">RESET ALL DATA</button>
                   </div>
                 </div>
               )}
             </div>
           </div>
           <input type="file" ref={fileInputRef} onChange={importData} accept=".json" className="hidden" />
        </div>
      )}

      {showModal && selectedWeek !== null && (
        <MemoryModal 
          weekIndex={selectedWeek}
          initialData={intentions[selectedWeek] || {}}
          categories={categories}
          onClose={() => setShowModal(false)}
          onSave={saveIntention}
          isCurrentWeek={selectedWeek === stats.weeksLived}
          isFuture={selectedWeek > stats.weeksLived}
          getDateStr={getDateFromWeekIndex(selectedWeek)}
          getEraName={getEraForWeek(selectedWeek).name}
          tutorialMode={tutorialStep === 5}
          finishTutorial={nextTutorial}
        />
      )}

      {/* --- 5-STEP SEQUENTIAL TUTORIAL --- */}
      {tutorialStep > 0 && tutorialStep < 5 && (
        <div 
          className={`fixed inset-0 z-[100] flex flex-col items-center justify-center transition-all duration-700 ${
            tutorialStep === 1 ? 'bg-black/90 backdrop-blur-sm' : 'bg-transparent pointer-events-none'
          }`} 
          onClick={tutorialStep === 1 ? nextTutorial : undefined}
        >
          <button 
            onClick={(e) => { e.stopPropagation(); skipTutorial(); }} 
            className="absolute top-6 right-6 text-gray-500 hover:text-white text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-full border border-gray-800 hover:bg-gray-800 transition-all pointer-events-auto bg-black/50 backdrop-blur-md"
          >
            Skip Tutorial
          </button>

          {/* STEP 1: PHILOSOPHY */}
          {tutorialStep === 1 && (
            <div className="text-center max-w-md space-y-8 p-8 pointer-events-auto animate-in fade-in zoom-in duration-300">
               <div className="text-7xl mb-2 animate-pulse">⏳</div>
               <h2 className="text-4xl font-black text-white tracking-tighter">THE GRID</h2>
               <p className="text-xl text-gray-300 leading-relaxed font-light">
                 Every box is one week of your life. <br/> It is a map of your time.
               </p>
               <div className="pt-4">
                 <p className="text-cyan-400 text-xs font-bold uppercase tracking-[0.2em] animate-bounce">Tap to Continue</p>
               </div>
            </div>
          )}

          {/* STEP 2: ANIMATION */}
          {tutorialStep === 2 && (
            <div className="flex justify-center pointer-events-none w-full">
               <div className="bg-[#1E1E1E]/90 border border-cyan-500/30 p-8 rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.3)] max-w-sm mx-4 backdrop-blur-md pointer-events-auto text-center animate-in slide-in-from-bottom-10 duration-500">
                 <h3 className="text-2xl font-bold text-white mb-2">YOUR PAST</h3>
                 <p className="text-gray-300 text-base mb-6 leading-relaxed">
                   The weeks you have already lived are gone. <br/>
                   <span className="text-cyan-400 font-bold">Watch them disappear.</span>
                 </p>
                 <button 
                   onClick={(e) => { e.stopPropagation(); nextTutorial(); }}
                   className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl uppercase tracking-wider text-xs border border-gray-600 transition-all"
                 >
                   Continue
                 </button>
               </div>
            </div>
          )}

          {/* STEP 3: "HOW TO USE" */}
          {tutorialStep === 3 && (
            <div className="flex justify-center pointer-events-none w-full">
               <div className="bg-[#1E1E1E]/90 border border-cyan-500/30 p-8 rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.3)] max-w-sm mx-4 backdrop-blur-md pointer-events-auto text-center animate-in slide-in-from-bottom-10 duration-500">
                 <h3 className="text-2xl font-bold text-white mb-4">HOW TO USE</h3>
                 <div className="space-y-4 text-left text-sm text-gray-300 mb-6">
                    <div className="flex gap-3"><span className="text-xl">📝</span><div><strong className="text-white block">Journal</strong>Log daily details to remember them.</div></div>
                    <div className="flex gap-3"><span className="text-xl">📊</span><div><strong className="text-white block">Rate Weeks</strong>Score your life 1-10 to see trends.</div></div>
                    <div className="flex gap-3"><span className="text-xl">⭐</span><div><strong className="text-white block">Milestones</strong>Mark major life events with a star.</div></div>
                 </div>
                 <button onClick={(e) => { e.stopPropagation(); nextTutorial(); }} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-xl uppercase tracking-wider text-xs shadow-lg">Ready to Try?</button>
               </div>
            </div>
          )}

          {/* STEP 4: "TRY IT OUT" */}
          {tutorialStep === 4 && (
            <div className="flex justify-center pointer-events-none w-full">
               <div className="bg-[#1E1E1E] border border-cyan-500/50 p-8 rounded-3xl shadow-[0_0_60px_rgba(6,182,212,0.4)] max-w-sm mx-4 relative backdrop-blur-xl pointer-events-auto animate-bounce-slight text-center">
                 <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-[#1E1E1E] border-r border-b border-cyan-500/50 rotate-45"></div>
                 
                 <h3 className="text-xl font-black text-white mb-2 tracking-tight">TRY IT OUT</h3>
                 <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                   Use the <span className="text-white font-bold bg-cyan-600/20 px-2 py-0.5 rounded">Arrows</span> below to move between weeks. Then tap <b>Log Memory</b>.
                 </p>
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;