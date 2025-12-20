// src/App.jsx
import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';

// --- STYLES: Custom Animations & Textures ---
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
  .crossed-out {
    background-image: 
      linear-gradient(to top left,  transparent 46%, rgba(0,0,0,0.4) 48%, rgba(0,0,0,0.4) 52%, transparent 54%),
      linear-gradient(to top right, transparent 46%, rgba(0,0,0,0.4) 48%, rgba(0,0,0,0.4) 52%, transparent 54%);
    opacity: 0.7;
    border-color: transparent !important;
  }

  /* 3. The "Cross Out" Animation for the Tutorial */
  @keyframes crossOutAnim {
    from { background-image: none; opacity: 1; border-color: rgba(255, 255, 255, 0.05); }
    to {
      background-image: 
        linear-gradient(to top left,  transparent 46%, rgba(0,0,0,0.4) 48%, rgba(0,0,0,0.4) 52%, transparent 54%),
        linear-gradient(to top right, transparent 46%, rgba(0,0,0,0.4) 48%, rgba(0,0,0,0.4) 52%, transparent 54%);
      opacity: 0.7;
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

  /* LANDSCAPE MODE OPTIMIZATIONS */
  @media (max-height: 500px) and (orientation: landscape) {
    .landscape-hide { display: none !important; }
    .landscape-compact { padding-top: 4px !important; padding-bottom: 4px !important; gap: 8px !important; }
    .landscape-row { flex-direction: row !important; align-items: center; justify-content: space-between; }
  }
`;

// --- CONSTANTS ---
const ERAS = [
  { name: 'Early Childhood', ageLimit: 5,  color: 'bg-cyan-600/30' },
  { name: 'School Age',      ageLimit: 18, color: 'bg-blue-600/30' },
  { name: 'Early Adulthood', ageLimit: 25, color: 'bg-indigo-600/30' },
  { name: 'The Building Years', ageLimit: 35, color: 'bg-violet-600/30' },
  { name: 'Mid-Life',        ageLimit: 50, color: 'bg-fuchsia-600/30' },
  { name: 'Later Life',      ageLimit: 65, color: 'bg-pink-600/30' },
  { name: 'Golden Years',    ageLimit: 90, color: 'bg-rose-600/30' },
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

// --- COMPONENT: WeekBox ---
const WeekBox = React.memo(({ weekIndex, boxClass, opacityClass, animDelay, onClick, onMouseEnter, onMouseLeave, isCurrent }) => {
  return (
    <div 
      className={`w-[10px] h-[10px] md:w-[9px] md:h-[9px] ${boxClass} ${opacityClass} ${animDelay ? 'animate-burn-in' : ''}`} 
      style={{ animationDelay: animDelay }}
      onClick={() => onClick(weekIndex)} 
      onMouseEnter={(e) => onMouseEnter(e, weekIndex)} 
      onMouseLeave={onMouseLeave}
      id={isCurrent ? "current-week-box" : undefined}
    />
  );
}, (prev, next) => {
  return (
    prev.boxClass === next.boxClass &&
    prev.opacityClass === next.opacityClass &&
    prev.isCurrent === next.isCurrent &&
    prev.animDelay === next.animDelay
  );
});

// --- COMPONENT: MemoryModal ---
// Updated to include tutorial overlay for Step 4
const MemoryModal = ({ weekIndex, initialData, categories, onClose, onSave, isCurrentWeek, getDateStr, getEraName, tutorialMode, finishTutorial }) => {
  const [title, setTitle] = useState(initialData.title || '');
  const [text, setText] = useState(initialData.text || ''); 
  const [rating, setRating] = useState(initialData.rating || 5);
  const [image, setImage] = useState(initialData.image || '');
  const [isMilestone, setIsMilestone] = useState(initialData.isMilestone || false);
  const [category, setCategory] = useState(initialData.category || 'default');
  const [logs, setLogs] = useState(initialData.logs || []);
  
  const [newLogText, setNewLogText] = useState('');
  const [newLogTag, setNewLogTag] = useState('');

  const handleAddLog = () => {
    if (!newLogText.trim()) return;
    const newEntry = {
      id: Date.now(),
      text: newLogText,
      tag: newLogTag || new Date().toLocaleDateString('en-US', { weekday: 'short' })
    };
    setLogs([...logs, newEntry]);
    setNewLogText('');
    setNewLogTag('');
  };

  const handleRemoveLog = (id) => {
    setLogs(logs.filter(l => l.id !== id));
  };

  const handleSave = () => {
    onSave({ title, text, rating, image, isMilestone, category, logs });
  };

  const getCategoryStyle = (catKey) => {
    const cat = categories[catKey] || categories.default;
    if (!cat) return PRESET_COLORS.slate;
    const colorKey = cat.colorKey || 'slate'; 
    return { ...PRESET_COLORS[colorKey], label: cat.label };
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[150] backdrop-blur-sm">
      <div className="bg-[#1E1E1E] border border-gray-800 shadow-2xl rounded-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200 relative">
        
        {/* --- TUTORIAL STEP 4 OVERLAY --- */}
        {tutorialMode && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 text-center">
             <div className="max-w-xs space-y-6">
               <h3 className="text-2xl font-black text-white">CRAFT YOUR MEMORY</h3>
               <div className="text-left space-y-4 text-sm text-gray-300">
                  <div className="flex gap-3 items-start">
                    <span className="text-xl">📊</span>
                    <div><strong className="text-white block">Rating</strong>Rate your week 1-10. This builds your life graph over time.</div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="text-xl">⭐</span>
                    <div><strong className="text-white block">Milestones</strong>Toggle the star for major life events to make them stand out.</div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="text-xl">📝</span>
                    <div><strong className="text-white block">Journal</strong>Don't just summarize. Log specific moments to remember the details.</div>
                  </div>
               </div>
               <button onClick={finishTutorial} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95 uppercase tracking-widest text-xs">
                 Start Using Mementus
               </button>
             </div>
          </div>
        )}

        {/* HEADER */}
        <div className="p-6 border-b border-gray-800 bg-[#1E1E1E] z-10">
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-xl font-bold text-white">{isCurrentWeek ? "Log This Week" : "Edit Memory"}</h2>
            <button onClick={() => setIsMilestone(!isMilestone)} className={`text-2xl transition-transform ${isMilestone ? 'scale-110' : 'opacity-30 hover:opacity-100'}`} title="Milestone">{isMilestone ? '⭐' : '☆'}</button>
          </div>
          <p className="text-xs uppercase tracking-widest font-bold text-gray-500 flex items-center gap-2">
            <span className="text-cyan-500">{getDateStr}</span><span>•</span>{getEraName}
          </p>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-4">
            <input className="w-full bg-black/50 text-white p-3 rounded-lg border border-gray-700 focus:border-cyan-500 outline-none font-bold" placeholder="Headline" value={title} onChange={(e) => setTitle(e.target.value)} />
            
            <div className="flex gap-2">
               <div className="flex-1 bg-black/30 p-3 rounded-lg border border-gray-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500">RATING</span>
                  <div className="flex items-center gap-2">
                    <input type="range" min="1" max="10" value={rating} onChange={(e) => setRating(parseInt(e.target.value))} className="w-20 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                    <span className="text-yellow-500 text-xs font-bold">{rating}</span>
                  </div>
               </div>
               <div className="flex-1 bg-black/30 p-2 rounded-lg border border-gray-800 overflow-x-auto no-scrollbar flex items-center">
                  <div className="flex gap-2">
                    {Object.entries(categories).map(([key, val]) => {
                      const styles = getCategoryStyle(key);
                      return (
                        <button key={key} onClick={() => setCategory(key)} className={`flex-shrink-0 px-2 py-1 rounded text-[10px] font-bold transition-all border ${category === key ? styles.bg + ' text-white border-transparent' : 'bg-transparent text-gray-500 border-gray-700'}`}>{val.label}</button>
                      );
                    })}
                  </div>
               </div>
            </div>

            <textarea className="w-full bg-black/50 text-white p-4 rounded-lg border border-gray-700 focus:border-white outline-none min-h-[80px] resize-none text-sm" value={text} onChange={(e) => setText(e.target.value)} placeholder="Weekly summary..." />
            <input className="w-full bg-black/50 text-gray-400 text-xs p-3 rounded-lg border border-gray-800 focus:border-gray-600 outline-none" placeholder="Image URL (https://...)" value={image} onChange={(e) => setImage(e.target.value)} />
          </div>

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
        </div>

        <div className="p-4 border-t border-gray-800 bg-[#1E1E1E] flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 text-gray-400 hover:text-white transition-colors">Cancel</button>
          <button onClick={handleSave} className={`flex-1 text-black font-bold py-3 rounded-lg shadow-lg hover:scale-[1.02] transition-transform ${isMilestone ? 'bg-amber-400 hover:bg-amber-300' : 'bg-white hover:bg-gray-200'}`}>SAVE ENTRY</button>
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
  
  const [view, setView] = useState('grid');
  const [showModal, setShowModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false); 
  const [selectedWeek, setSelectedWeek] = useState(null);
  
  // --- SELECTION / PREVIEW STATE ---
  const [previewWeek, setPreviewWeek] = useState(null);

  // --- TUTORIAL STATE ---
  // 1 = Intro, 2 = Animation, 3 = Try it Out, 4 = Modal Explanation
  const [tutorialStep, setTutorialStep] = useState(() => {
    const hasSeen = localStorage.getItem('tutorial_seen');
    const hasDob = localStorage.getItem('dob');
    return (hasDob && !hasSeen) ? 1 : 0;
  });

  const [showPastAnimation, setShowPastAnimation] = useState(false);
  const [gridReady, setGridReady] = useState(() => localStorage.getItem('tutorial_seen') === 'true');

  // --- HELPER FUNCTIONS ---
  const getDateFromWeekIndex = (weekIndex) => {
    if (!birthday) return "";
    const birthDate = new Date(birthday);
    const targetDate = new Date(birthDate.getTime() + weekIndex * 7 * 24 * 60 * 60 * 1000);
    return targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  const getAgeFromWeekIndex = (weekIndex) => Math.floor(weekIndex / 52);
  
  const getEraForWeek = (weekIndex) => {
    const years = weekIndex / 52;
    for (let era of ERAS) { if (years < era.ageLimit) return era; }
    return ERAS[ERAS.length - 1];
  };

  const getLifeStats = useMemo(() => {
    if (!birthday) return { weeksLived: 0, totalWeeks: 4680 };
    const birthDate = new Date(birthday);
    const today = new Date();
    const diffTime = Math.abs(today - birthDate);
    const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
    return { weeksLived: diffWeeks, totalWeeks: 4680 };
  }, [birthday]);
  
  const stats = getLifeStats;

  // --- ACTIONS (Tutorial) ---
  const nextTutorial = () => {
    if (tutorialStep === 1) {
      setTutorialStep(2);
      setShowPastAnimation(true);
      setTimeout(() => setGridReady(true), 3000); 
    } else if (tutorialStep === 2) {
      setTutorialStep(3);
      setPreviewWeek(stats.weeksLived); 
    } else if (tutorialStep === 3) {
      // Step 3 -> 4: User clicked "Log Memory" during tutorial
      setPreviewWeek(null);
      setSelectedWeek(stats.weeksLived);
      setShowModal(true);
      setTutorialStep(4);
    } else {
      // Finish
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

  const [rawSearch, setRawSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('blue');
  const [settingsTab, setSettingsTab] = useState('categories');
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, content: null });
  
  const fileInputRef = useRef(null);

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

  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedSearch(rawSearch); }, 300);
    return () => clearTimeout(handler);
  }, [rawSearch]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        if (e.key === 'Escape') { e.target.blur(); setShowModal(false); setShowSettings(false); }
        return;
      }
      switch(e.key.toLowerCase()) {
        case 'k': case '/': e.preventDefault(); document.querySelector('input[type="text"]')?.focus(); break;
        case 'escape': setShowModal(false); setShowSettings(false); setRawSearch(''); break;
        case 't': document.getElementById("current-week-box")?.scrollIntoView({ behavior: 'smooth', block: 'center' }); break;
        case 'g': setView('grid'); break;
        case 'l': setView('timeline'); break;
        case 's': setView('stats'); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- 2. NOTIFICATIONS ---
  const scheduleNotification = async () => {
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== 'granted') return;
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel(pending);
    }
    await LocalNotifications.schedule({
      notifications: [
        {
          title: "Mementus",
          body: "Time to log your week.",
          id: 1,
          schedule: { on: { weekday: 6, hour: 20, minute: 0 }, allowWhileIdle: true },
        }
      ]
    });
    alert("Reminder enabled: Fridays at 8 PM.");
  };

  const getCategoryStyle = useCallback((catKey) => {
    const cat = categories[catKey] || categories.default;
    if (!cat) return PRESET_COLORS.slate;
    const colorKey = cat.colorKey || 'slate'; 
    return { ...PRESET_COLORS[colorKey], label: cat.label };
  }, [categories]);

  const jumpToNow = useCallback(() => {
    document.getElementById("current-week-box")?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  }, []);

  // --- 3. UNIFIED INTERACTION LOGIC (Desktop & Mobile) ---
  const handleBoxClick = useCallback((weekIndex) => {
    setPreviewWeek(weekIndex);
  }, []);

  const openModal = (weekIndex) => {
    setSelectedWeek(weekIndex);
    setShowModal(true);
    setPreviewWeek(null);
    setTooltip(prev => ({ ...prev, show: false }));
    // FIX: ADVANCE TUTORIAL ON OPEN
    if (tutorialStep === 3) {
      setTutorialStep(4);
    }
  };

  const adjustPreview = (amount) => {
    if (previewWeek === null) return;
    const newWeek = previewWeek + amount;
    if (newWeek >= 0 && newWeek < stats.totalWeeks) {
      setPreviewWeek(newWeek);
    }
  };

  const onBoxEnter = useCallback((e, weekIndex) => {
    if (window.innerWidth < 768) return;
    if (!e?.target) return;
    const rect = e.target.getBoundingClientRect();
    const x = rect.left + window.scrollX + 15;
    const y = rect.top + window.scrollY + 15;

    const entry = intentions[weekIndex];
    const isPast = weekIndex < stats.weeksLived;
    const isFuture = weekIndex > stats.weeksLived;
    const isCurrent = weekIndex === stats.weeksLived;
    const dateStr = getDateFromWeekIndex(weekIndex);
    const era = getEraForWeek(weekIndex);
    
    let content = null;
    if (isCurrent) content = <div className="font-bold text-cyan-400">THIS WEEK</div>;
    else if (isPast && entry) {
        const catKey = entry.category || 'default';
        const styles = getCategoryStyle(catKey);
        content = (
          <div className="text-left">
            <div className="text-[10px] uppercase font-bold text-gray-500 mb-1 flex justify-between">
              <span>{dateStr}</span><span className="text-yellow-500 text-xs">{entry.rating ? `${entry.rating}/10` : ''}</span>
            </div>
            <div className="font-bold text-sm mb-1 text-white">{entry.title ? entry.title : (entry.isMilestone ? "⭐ Milestone" : styles.label)}</div>
            {entry.image && <div className="w-full h-20 bg-cover bg-center rounded mb-2 border border-white/10" style={{ backgroundImage: `url(${entry.image})` }}></div>}
            <div className="text-xs text-gray-400 max-w-[200px] leading-tight line-clamp-4">{entry.text}</div>
            {entry.logs && entry.logs.length > 0 && <div className="mt-1 text-[10px] text-cyan-500 font-bold">+{entry.logs.length} entries</div>}
          </div>
        );
    } else if (isFuture && entry) {
         content = (
            <div className="text-left">
              <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">{dateStr}</div>
              <div className="font-bold text-sm text-cyan-400 mb-1">🎯 {entry.title || "Goal"}</div>
              <div className="text-xs text-gray-400 max-w-[200px] leading-tight">{entry.text}</div>
            </div>
        );
    } else {
        content = <div className="text-left"><div className="text-[10px] uppercase font-bold text-gray-600">{dateStr}</div><div className="text-xs text-gray-600">{era.name}</div></div>;
    }
    setTooltip(prev => { if (prev.show && prev.x === x && prev.y === y) return prev; return { show: true, x, y, content }; });
  }, [intentions, categories, stats, getCategoryStyle]);

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
    const isEmpty = !modalData.text.trim() && !modalData.title.trim() && !modalData.image.trim() && modalData.logs.length === 0;
    if (isEmpty) { delete newIntentions[selectedWeek]; } else { newIntentions[selectedWeek] = modalData; }
    setIntentions(newIntentions);
    localStorage.setItem('intentions', JSON.stringify(newIntentions));
    setShowModal(false);
  };

  const exportData = () => {
    const data = { dob: birthday, intentions: intentions, categories: categories, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = `memento-mori-backup.json`;
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

  const doesMatchSearch = (entry) => {
    if (!debouncedSearch) return true;
    if (!entry) return false;
    const text = typeof entry === 'string' ? entry : entry.text || '';
    const title = typeof entry === 'object' ? entry.title || '' : '';
    const catKey = typeof entry === 'object' ? entry.category : 'default';
    const catLabel = categories[catKey]?.label || '';
    const lowerQuery = debouncedSearch.toLowerCase();
    const logMatches = entry.logs ? entry.logs.some(l => l.text.toLowerCase().includes(lowerQuery)) : false;
    return text.toLowerCase().includes(lowerQuery) || title.toLowerCase().includes(lowerQuery) || logMatches;
  };

  const dashboardStats = useMemo(() => {
    const entries = Object.values(intentions);
    const totalMemories = entries.length;
    const totalMilestones = entries.filter(e => typeof e === 'object' && e.isMilestone).length;
    const catCounts = {};
    Object.keys(categories).forEach(k => catCounts[k] = 0);
    catCounts['default'] = 0;
    entries.forEach(e => {
      let key = typeof e === 'object' && e.category ? e.category : 'default';
      if (!categories[key]) key = 'default';
      catCounts[key] = (catCounts[key] || 0) + 1;
    });
    return { totalMemories, totalMilestones, catCounts };
  }, [intentions, categories]);

  const getSortedEntries = () => {
    return Object.entries(intentions)
      .map(([weekIndex, data]) => ({
        weekIndex: parseInt(weekIndex),
        ... (typeof data === 'string' ? { text: data, category: 'default', isMilestone: false } : data)
      }))
      .sort((a, b) => a.weekIndex - b.weekIndex)
      .filter(entry => doesMatchSearch(entry));
  };

  if (!birthday) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
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
    <div className="min-h-screen bg-[#050505] overflow-x-hidden text-white flex flex-col items-center relative pb-24 md:pb-10">
      <style>{GLOBAL_STYLES}</style>
      
      {/* HEADER */}
      <header className="w-full max-w-[1200px] flex flex-col gap-3 px-4 py-4 md:px-0 md:py-8 pb-2 border-b border-gray-800 bg-[#050505] sticky top-0 z-30 landscape-compact">
        <div className="flex flex-row justify-between items-end gap-4 landscape-row w-full">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">LIFE GRID</h1>
            <p className="text-gray-500 text-xs md:text-sm mt-1"><span className="text-white font-bold">{Object.keys(intentions).length}</span> Memories | <span className="text-white font-bold">{stats.weeksLived}</span> Weeks</p>
          </div>
          <div className="flex gap-3 items-center flex-wrap justify-end">
            <input type="text" placeholder="Search..." value={rawSearch} onChange={(e) => setRawSearch(e.target.value)} className="bg-gray-900 border border-gray-700 text-white text-xs rounded px-3 py-2 w-28 md:w-32 focus:w-48 transition-all outline-none" />
            <div className="bg-gray-800 p-1 rounded-lg hidden md:flex">
              {['grid', 'timeline', 'stats'].map(v => <button key={v} onClick={() => setView(v)} className={`px-3 py-1 rounded text-xs font-bold transition-all uppercase ${view === v ? 'bg-gray-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>{v}</button>)}
            </div>
            <button onClick={() => { setShowSettings(true); setSettingsTab('categories'); }} className="p-2 bg-gray-800 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors flex items-center gap-2" title="Settings"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg></button>
          </div>
        </div>
        {view === 'grid' && (
          <div className="w-full flex flex-col gap-2 md:gap-3 mt-1 landscape-hide">
            <div className="w-full flex md:flex-wrap gap-3 overflow-x-auto no-scrollbar items-center py-1 px-1 md:justify-center">
              {ERAS.map(era => {
                const isCurrentEra = era.name === getEraForWeek(stats.weeksLived).name;
                return (
                  <div key={era.name} className={`flex items-center gap-2 flex-shrink-0 transition-all duration-300 ${isCurrentEra ? 'opacity-100 scale-105' : 'opacity-50'}`}>
                    <div className={`w-3 h-3 rounded-[1px] ${era.color}`}></div>
                    <span className={`text-[10px] uppercase font-bold whitespace-nowrap ${isCurrentEra ? 'text-white' : 'text-gray-500'}`}>{era.name}</span>
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

      {/* GRID VIEW */}
      {view === 'grid' && (
        <div className="w-full overflow-x-auto flex justify-center px-4 md:px-0 touch-pan-y">
           <div className="flex flex-wrap content-start gap-[2px] md:gap-[3px] min-w-[420px] max-w-[420px] md:min-w-[1200px] md:max-w-[1200px] pb-20">
            {Array.from({ length: stats.totalWeeks }).map((_, i) => {
              const isPastRaw = i < stats.weeksLived;
              const isPast = isPastRaw && gridReady;
              const isCurrent = i === stats.weeksLived;
              const isFuture = i > stats.weeksLived;
              const entry = intentions[i];
              const era = getEraForWeek(i);
              
              const isMatch = doesMatchSearch(entry);
              const opacityClass = debouncedSearch && !isMatch && !isCurrent ? 'opacity-10 grayscale' : 'opacity-100';
              const isPreview = i === previewWeek;
              const isAnimatingPast = isPastRaw && !gridReady && showPastAnimation;

              let boxClass = "rounded-[1px] transition-all duration-200 ease-out"; 
              // FIX 1: DYNAMIC ANIMATION TIMING (Ensures consistent speed regardless of age)
              const crossOutAnimDelay = isAnimatingPast ? `${(i / stats.weeksLived) * 2500}ms` : undefined;
              
              if (isPreview) {
                 boxClass += " bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,1)] z-50 scale-150 border border-white";
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
                  boxClass = `bg-transparent border-2 ${styles.border} shadow-[0_0_10px_rgba(255,255,255,0.1)] z-10 hover:scale-125`; 
                  if (entry.isMilestone) boxClass = "bg-transparent border-2 border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.4)] hover:scale-125";
                }
              }
              // Removed onMouseEnter for desktop tooltip as we are unifying UX
              return ( <WeekBox key={i} weekIndex={i} boxClass={boxClass} opacityClass={opacityClass} animDelay={crossOutAnimDelay} onClick={handleBoxClick} onMouseEnter={() => {}} onMouseLeave={() => {}} isCurrent={isCurrent} /> );
            })}
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
            <button onClick={() => openModal(previewWeek)} className="flex-1 bg-cyan-500 text-black font-black text-sm uppercase tracking-wider rounded-lg hover:bg-cyan-400 active:scale-[0.98] transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]">{intentions[previewWeek] ? "Edit Entry" : "Log Memory"}</button>
            <button onClick={() => adjustPreview(1)} className="w-14 bg-gray-800 rounded-lg flex items-center justify-center text-xl hover:bg-gray-700 active:scale-95 transition-all border border-gray-700">→</button>
          </div>
          <button onClick={() => setPreviewWeek(null)} className="absolute -top-10 right-4 bg-gray-800 text-white rounded-full p-2 text-xs shadow-lg border border-gray-700">✕ Cancel</button>
        </div>
      )}

      {/* TIMELINE VIEW */}
      {view === 'timeline' && (
        <div className="max-w-2xl w-full flex flex-col gap-6 px-4 md:px-0 mt-12 md:mt-20">
          {getSortedEntries().length === 0 ? (
            <div className="text-center text-gray-500 py-20">{debouncedSearch ? "No matches found." : "No memories logged yet."}</div>
          ) : (
            getSortedEntries().map((entry) => {
              const styles = getCategoryStyle(entry.category || 'default');
              const isFuture = entry.weekIndex > stats.weeksLived;
              return (
                <div key={entry.weekIndex} className={`bg-[#1E1E1E] border-l-4 p-6 rounded-r-lg shadow-lg cursor-pointer hover:bg-[#252525] transition-colors group relative ${isFuture ? 'opacity-70 border-dashed' : ''}`} style={{ borderLeftColor: entry.isMilestone ? '#fbbf24' : (isFuture ? 'gray' : undefined) }} onClick={() => handleBoxClick(entry.weekIndex)}>
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
                  {entry.image && <img src={entry.image} alt="Memory" className="mt-4 rounded border border-gray-700 max-h-60 object-cover" />}
                  {entry.logs && entry.logs.length > 0 && <div className="mt-4 pt-4 border-t border-gray-800 space-y-1">{entry.logs.map(l => <div key={l.id} className="text-xs text-gray-400"><span className="text-cyan-600 font-bold uppercase mr-2">{l.tag}</span>{l.text}</div>)}</div>}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* STATS VIEW */}
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
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-[#050505] border-t border-gray-800 p-2 pb-6 flex md:hidden justify-around z-50">
         {['grid', 'timeline', 'stats'].map(v => (
           <button key={v} onClick={() => { setView(v); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${view === v ? 'text-white' : 'text-gray-600'}`}>
             {v === 'grid' && <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>}
             {v === 'timeline' && <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>}
             {v === 'stats' && <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>}
             <span className="text-[10px] font-bold uppercase">{v}</span>
           </button>
         ))}
      </div>

      {view === 'grid' && !previewWeek && (
        <button onClick={jumpToNow} className="fixed bottom-24 right-6 md:bottom-8 md:right-8 bg-cyan-500 hover:bg-white text-black p-4 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all hover:scale-110 z-40 group" title="Jump to Today"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg></button>
      )}

      {tooltip.show && <div className="fixed z-50 bg-[#222] border border-gray-700 p-3 rounded-lg shadow-2xl pointer-events-none backdrop-blur-md animate-in fade-in duration-75 max-w-xs" style={{ top: tooltip.y, left: tooltip.x }}>{tooltip.content}</div>}

      {showSettings && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
           <div className="bg-[#1E1E1E] rounded-2xl max-w-lg w-full border border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
             <div className="p-6 border-b border-gray-800 flex justify-between items-center"><h2 className="text-xl font-bold text-white">Settings</h2><button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-white transition-colors">✕</button></div>
             <div className="flex border-b border-gray-800">{['categories', 'profile', 'data'].map(tab => <button key={tab} onClick={() => setSettingsTab(tab)} className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${settingsTab === tab ? 'text-cyan-500 border-cyan-500 bg-gray-900/50' : 'text-gray-500 border-transparent hover:text-white hover:bg-gray-900/30'}`}>{tab}</button>)}</div>
             <div className="p-6 overflow-y-auto">
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
          getDateStr={getDateFromWeekIndex(selectedWeek)}
          getEraName={getEraForWeek(selectedWeek).name}
          // FIX 4: PASS TUTORIAL MODE PROPS TO MODAL
          tutorialMode={tutorialStep === 4}
          finishTutorial={nextTutorial}
        />
      )}

      {/* --- 3-STEP SEQUENTIAL TUTORIAL --- */}
      {tutorialStep > 0 && tutorialStep < 4 && (
        <div 
          // FIX 2: CENTERING (flex, justify-center, items-center)
          // BACKGROUND LOGIC: Step 1 (Dark), Steps 2-3 (Transparent + Pointer Events None)
          className={`fixed inset-0 z-[100] flex flex-col items-center justify-center transition-all duration-700 ${
            tutorialStep === 1 ? 'bg-black/90 backdrop-blur-sm' : 'bg-transparent pointer-events-none'
          }`} 
          onClick={tutorialStep === 1 ? nextTutorial : undefined}
        >
          
          {/* SKIP BUTTON */}
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

          {/* STEP 2: ANIMATION (CENTERED) */}
          {tutorialStep === 2 && (
            <div className="w-full flex justify-center pointer-events-none">
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

          {/* STEP 3: LIVE DEMO (CENTERED + FIX 3: Dismisses on Click) */}
          {tutorialStep === 3 && (
            <div className="w-full flex justify-center pointer-events-none">
               <div className="bg-[#1E1E1E] border border-cyan-500/50 p-8 rounded-3xl shadow-[0_0_60px_rgba(6,182,212,0.4)] max-w-sm mx-4 relative backdrop-blur-xl pointer-events-auto animate-bounce-slight text-center">
                 <h3 className="text-xl font-black text-white mb-2 tracking-tight">TRY IT OUT</h3>
                 <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                   Use the <span className="text-white font-bold bg-cyan-600/20 px-2 py-0.5 rounded">Arrows</span> below to move between weeks. Then tap <b>Log Memory</b>.
                 </p>
                 <button 
                   onClick={(e) => { e.stopPropagation(); nextTutorial(); }} 
                   className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-black py-3 rounded-xl uppercase tracking-widest text-xs shadow-lg hover:shadow-cyan-500/50 transition-all active:scale-[0.98]"
                 >
                   Finish Tutorial
                 </button>
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;