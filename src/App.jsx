// src/App.jsx
import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';

// --- CONSTANTS ---
const ERAS = [
  { name: 'Early Childhood', ageLimit: 5,  color: 'bg-zinc-800' },
  { name: 'School Age',      ageLimit: 18, color: 'bg-slate-800' },
  { name: 'Early Adulthood', ageLimit: 25, color: 'bg-stone-800' },
  { name: 'The Building Years', ageLimit: 35, color: 'bg-neutral-800' },
  { name: 'Mid-Life',        ageLimit: 50, color: 'bg-zinc-800' },
  { name: 'Later Life',      ageLimit: 65, color: 'bg-slate-800' },
  { name: 'Golden Years',    ageLimit: 90, color: 'bg-stone-800' },
];

const PRESET_COLORS = {
  slate:   { bg: 'bg-slate-600',   text: 'text-slate-500',   border: 'border-slate-500', shadow: 'shadow-slate-500/40' },
  red:     { bg: 'bg-red-600',     text: 'text-red-500',     border: 'border-red-500',   shadow: 'shadow-red-500/40' },
  orange:  { bg: 'bg-orange-500',  text: 'text-orange-500',  border: 'border-orange-500', shadow: 'shadow-orange-500/40' },
  amber:   { bg: 'bg-amber-500',   text: 'text-amber-500',   border: 'border-amber-500', shadow: 'shadow-amber-500/40' },
  yellow:  { bg: 'bg-yellow-500',  text: 'text-yellow-500',  border: 'border-yellow-500', shadow: 'shadow-yellow-500/40' },
  lime:    { bg: 'bg-lime-600',    text: 'text-lime-500',    border: 'border-lime-500',  shadow: 'shadow-lime-500/40' },
  green:   { bg: 'bg-green-600',   text: 'text-green-500',   border: 'border-green-500', shadow: 'shadow-green-500/40' },
  emerald: { bg: 'bg-emerald-600', text: 'text-emerald-500', border: 'border-emerald-500', shadow: 'shadow-emerald-500/40' },
  teal:    { bg: 'bg-teal-600',    text: 'text-teal-500',    border: 'border-teal-500',  shadow: 'shadow-teal-500/40' },
  cyan:    { bg: 'bg-cyan-600',    text: 'text-cyan-500',    border: 'border-cyan-500',  shadow: 'shadow-cyan-500/40' },
  sky:     { bg: 'bg-sky-600',     text: 'text-sky-500',     border: 'border-sky-500',   shadow: 'shadow-sky-500/40' },
  blue:    { bg: 'bg-blue-600',    text: 'text-blue-500',    border: 'border-blue-500',  shadow: 'shadow-blue-500/40' },
  indigo:  { bg: 'bg-indigo-600',  text: 'text-indigo-500',  border: 'border-indigo-500', shadow: 'shadow-indigo-500/40' },
  violet:  { bg: 'bg-violet-600',  text: 'text-violet-500',  border: 'border-violet-500', shadow: 'shadow-violet-500/40' },
  purple:  { bg: 'bg-purple-600',  text: 'text-purple-500',  border: 'border-purple-500', shadow: 'shadow-purple-500/40' },
  fuchsia: { bg: 'bg-fuchsia-600', text: 'text-fuchsia-500', border: 'border-fuchsia-500', shadow: 'shadow-fuchsia-500/40' },
  pink:    { bg: 'bg-pink-600',    text: 'text-pink-500',    border: 'border-pink-500',  shadow: 'shadow-pink-500/40' },
  rose:    { bg: 'bg-rose-600',    text: 'text-rose-500',    border: 'border-rose-500',  shadow: 'shadow-rose-500/40' },
};

const DEFAULT_CATEGORIES = {
  default:   { label: 'General',   colorKey: 'green' },
  career:    { label: 'Growth',    colorKey: 'cyan' },
  love:      { label: 'Love',      colorKey: 'rose' },
  health:    { label: 'Health',    colorKey: 'emerald' },
  adventure: { label: 'Adventure', colorKey: 'orange' },
};

// --- OPTIMIZATION: Memoized WeekBox ---
const WeekBox = React.memo(({ 
  weekIndex, 
  boxClass, 
  opacityClass, 
  onClick, 
  onMouseEnter, 
  onMouseLeave,
  isCurrent 
}) => {
  return (
    <div 
      className={`w-[6px] h-[6px] md:w-[9px] md:h-[9px] rounded-[1px] ${boxClass} ${opacityClass} transition-all duration-300`} 
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
    prev.isCurrent === next.isCurrent
  );
});

function App() {
  const [birthday, setBirthday] = useState(() => localStorage.getItem('dob') || '');
  const [intentions, setIntentions] = useState(() => JSON.parse(localStorage.getItem('intentions') || '{}'));
  const [categories, setCategories] = useState(() => JSON.parse(localStorage.getItem('categories') || JSON.stringify(DEFAULT_CATEGORIES)));

  const [view, setView] = useState('grid');
  const [showModal, setShowModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false); 
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [tempIntention, setTempIntention] = useState('');
  const [isMilestone, setIsMilestone] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('default');
  
  const [rawSearch, setRawSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('blue');
  const [settingsTab, setSettingsTab] = useState('categories');
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, content: null });
  
  const fileInputRef = useRef(null);
  const currentBoxRef = useRef(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(rawSearch);
    }, 300);
    return () => clearTimeout(handler);
  }, [rawSearch]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        if (e.key === 'Escape') {
          e.target.blur();
          setShowModal(false);
          setShowSettings(false);
        }
        return;
      }
      switch(e.key.toLowerCase()) {
        case 'k':
        case '/': e.preventDefault(); document.querySelector('input[type="text"]')?.focus(); break;
        case 'escape': setShowModal(false); setShowSettings(false); setRawSearch(''); break;
        case 't': jumpToNow(); break;
        case 'g': setView('grid'); break;
        case 'l': setView('timeline'); break;
        case 's': setView('stats'); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getCategoryStyle = useCallback((catKey) => {
    const cat = categories[catKey] || categories.default;
    const colorKey = cat.colorKey || 'green'; 
    return { ...PRESET_COLORS[colorKey], label: cat.label };
  }, [categories]);

  const getDateFromWeekIndex = (weekIndex) => {
    if (!birthday) return "";
    const birthDate = new Date(birthday);
    const targetDate = new Date(birthDate.getTime() + weekIndex * 7 * 24 * 60 * 60 * 1000);
    return targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getAgeFromWeekIndex = (weekIndex) => {
    return Math.floor(weekIndex / 52);
  };

  const getLifeStats = useMemo(() => {
    if (!birthday) return { weeksLived: 0, totalWeeks: 4680 };
    const birthDate = new Date(birthday);
    const today = new Date();
    const diffTime = Math.abs(today - birthDate);
    const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
    return { weeksLived: diffWeeks, totalWeeks: 4680 };
  }, [birthday]);

  const getEraForWeek = (weekIndex) => {
    const years = weekIndex / 52;
    for (let era of ERAS) {
      if (years < era.ageLimit) return era;
    }
    return ERAS[ERAS.length - 1];
  };

  const stats = getLifeStats;

  const jumpToNow = useCallback(() => {
    const el = document.getElementById("current-week-box");
    el?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  }, []);

  const onBoxClick = useCallback((weekIndex) => {
    handleBoxClick(weekIndex); 
    setTooltip(prev => ({ ...prev, show: false }));
  }, [intentions, categories]);

  const onBoxEnter = useCallback((e, weekIndex) => {
    // Disable tooltips on touch devices (simple check)
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return;

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
            <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">{dateStr}</div>
            <div className="font-bold text-sm mb-1">{entry.isMilestone ? "⭐ Milestone" : styles.label}</div>
            <div className="text-xs text-gray-300 max-w-[200px] leading-tight">{entry.text}</div>
          </div>
        );
    } else if (isFuture && entry) {
         content = (
            <div className="text-left">
            <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">{dateStr}</div>
            <div className="font-bold text-sm text-cyan-400 mb-1">🎯 Goal</div>
            <div className="text-xs text-gray-300 max-w-[200px] leading-tight">{entry.text}</div>
            </div>
        );
    } else {
        content = <div className="text-left"><div className="text-[10px] uppercase font-bold text-gray-500">{dateStr}</div><div className="text-xs text-gray-400">{era.name}</div></div>;
    }

    setTooltip(prev => {
      if (prev.show && prev.x === x && prev.y === y) return prev;
      return { show: true, x, y, content };
    });
  }, [intentions, categories, stats, getCategoryStyle]);

  const onBoxLeave = useCallback(() => {
    setTooltip(prev => ({ ...prev, show: false }));
  }, []);

  const handleSaveBirthday = (e) => {
    e.preventDefault();
    const date = e.target.dob.value;
    if (date) {
      localStorage.setItem('dob', date);
      setBirthday(date);
    }
  };
  
  const updateBirthday = (e) => {
    const date = e.target.value;
    setBirthday(date);
    localStorage.setItem('dob', date);
  };

  const resetApp = () => {
    if (confirm("⚠️ DANGER: This will permanently delete ALL your memories.\n\nAre you sure?")) {
      localStorage.removeItem('dob');
      localStorage.removeItem('intentions');
      localStorage.removeItem('categories');
      setBirthday('');
      setIntentions({});
      setCategories(DEFAULT_CATEGORIES);
      setShowSettings(false);
    }
  };

  const exportData = () => {
    const data = { dob: birthday, intentions: intentions, categories: categories, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `memento-mori-backup.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            localStorage.setItem('dob', data.dob);
            localStorage.setItem('intentions', JSON.stringify(data.intentions));
            const cats = data.categories || DEFAULT_CATEGORIES;
            localStorage.setItem('categories', JSON.stringify(cats));
            setBirthday(data.dob);
            setIntentions(data.intentions);
            setCategories(cats);
            alert("Restored.");
          }
        } else { alert("Invalid file."); }
      } catch (err) { alert("Error reading file."); }
    };
    reader.readAsText(file);
    event.target.value = null;
  };

  const handleBoxClick = (weekIndex) => {
    const savedData = intentions[weekIndex];
    let text = '';
    let milestone = false;
    let category = 'default';
    if (typeof savedData === 'string') {
      text = savedData;
    } else if (savedData) {
      text = savedData.text;
      milestone = savedData.isMilestone || false;
      category = savedData.category || 'default';
      if (!categories[category]) category = 'default';
    }
    setSelectedWeek(weekIndex);
    setTempIntention(text);
    setIsMilestone(milestone);
    setSelectedCategory(category);
    setShowModal(true);
  };

  const saveIntention = () => {
    if (selectedWeek === null) return;
    const newIntentions = { ...intentions };
    if (tempIntention.trim() === "") {
      delete newIntentions[selectedWeek];
    } else {
      newIntentions[selectedWeek] = { text: tempIntention, isMilestone: isMilestone, category: selectedCategory };
    }
    setIntentions(newIntentions);
    localStorage.setItem('intentions', JSON.stringify(newIntentions));
    setShowModal(false);
  };

  const addCategory = () => {
    if (!newCatName.trim()) return;
    const id = newCatName.toLowerCase().replace(/\s+/g, '_');
    const newCats = { ...categories, [id]: { label: newCatName, colorKey: newCatColor } };
    setCategories(newCats);
    localStorage.setItem('categories', JSON.stringify(newCats));
    setNewCatName('');
  };

  const deleteCategory = (key) => {
    if (key === 'default') return;
    const newCats = { ...categories };
    delete newCats[key];
    setCategories(newCats);
    localStorage.setItem('categories', JSON.stringify(newCats));
  };

  const doesMatchSearch = (entry) => {
    if (!debouncedSearch) return true;
    if (!entry) return false;
    const text = typeof entry === 'string' ? entry : entry.text;
    const catKey = typeof entry === 'object' ? entry.category : 'default';
    const catLabel = categories[catKey]?.label || '';
    const lowerQuery = debouncedSearch.toLowerCase();
    return text.toLowerCase().includes(lowerQuery) || catLabel.toLowerCase().includes(lowerQuery);
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
      <div className="min-h-screen bg-[#121212] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#1E1E1E] p-8 rounded-2xl border border-gray-800 shadow-2xl text-center">
          <h1 className="text-4xl font-black text-white mb-2 tracking-tighter">MEMENTO MORI</h1>
          <p className="text-gray-500 mb-8">Your life in weeks.</p>
          <form onSubmit={handleSaveBirthday} className="space-y-4">
            <input type="date" name="dob" className="w-full bg-black/30 text-white p-4 rounded-lg border border-gray-700 focus:border-cyan-500 outline-none text-center text-xl" required />
            <button className="w-full bg-cyan-500 text-black font-bold py-4 rounded-lg hover:bg-cyan-400">START COUNTING</button>
            <div className="mt-4"><button type="button" onClick={() => fileInputRef.current.click()} className="text-xs text-gray-500 underline">Upload JSON</button></div>
          </form>
          <input type="file" ref={fileInputRef} onChange={importData} accept=".json" className="hidden" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white flex flex-col items-center relative pb-24 md:pb-10">
      
      {/* HEADER */}
      <header className="w-full max-w-[1200px] flex flex-col gap-6 p-4 md:p-10 pb-4 border-b border-gray-800 bg-[#121212] sticky top-0 z-30">
        <div className="flex flex-row justify-between items-end gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">LIFE GRID</h1>
            <p className="text-gray-500 text-xs md:text-sm mt-1">
              <span className="text-white font-bold">{Object.keys(intentions).length}</span> Memories | <span className="text-white font-bold">{stats.weeksLived}</span> Weeks
            </p>
          </div>
          
          <div className="flex gap-3 items-center flex-wrap justify-end">
            <input type="text" placeholder="Search..." value={rawSearch} onChange={(e) => setRawSearch(e.target.value)} className="bg-gray-900 border border-gray-700 text-white text-xs rounded px-3 py-2 w-28 md:w-32 focus:w-48 transition-all outline-none" />
            
            {/* Desktop View Toggles (Hidden on Mobile) */}
            <div className="bg-gray-800 p-1 rounded-lg hidden md:flex">
              {['grid', 'timeline', 'stats'].map(v => (
                 <button key={v} onClick={() => setView(v)} className={`px-3 py-1 rounded text-xs font-bold transition-all uppercase ${view === v ? 'bg-gray-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>{v}</button>
              ))}
            </div>

            <button onClick={() => { setShowSettings(true); setSettingsTab('categories'); }} className="p-2 bg-gray-800 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors flex items-center gap-2" title="Settings">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            </button>
          </div>
        </div>
        
        {/* ERA LEGEND (Mobile Scrollable) */}
        {view === 'grid' && (
          <div className="w-full flex md:flex-wrap gap-4 md:gap-6 text-[10px] text-gray-500 uppercase tracking-wider font-bold overflow-x-auto no-scrollbar md:justify-center whitespace-nowrap px-1">
            {ERAS.map(era => (
              <div key={era.name} className="flex items-center gap-2 flex-shrink-0">
                <div className={`w-3 h-3 ${era.color} rounded-[1px]`}></div>{era.name}
              </div>
            ))}
            <div className="w-px h-3 bg-gray-700 mx-2 flex-shrink-0"></div>
            {Object.entries(categories).filter(([k]) => k !== 'default').map(([key, val]) => {
              const styles = getCategoryStyle(key);
              return (
                <div key={key} className="flex items-center gap-2 flex-shrink-0">
                  <div className={`w-3 h-3 ${styles.bg} rounded-full`}></div>{val.label}
                </div>
              );
            })}
          </div>
        )}
      </header>

      {/* --- GRID VIEW (Scrollable Container) --- */}
      {view === 'grid' && (
        <div className="w-full overflow-x-auto flex justify-center px-4 md:px-0">
           {/* Fixed Width Container for 52-week rows */}
           <div className="flex flex-wrap content-start gap-[2px] md:gap-[3px] min-w-[420px] max-w-[420px] md:min-w-[1200px] md:max-w-[1200px] pb-20">
            {Array.from({ length: stats.totalWeeks }).map((_, i) => {
              const isPast = i < stats.weeksLived;
              const isCurrent = i === stats.weeksLived;
              const isFuture = i > stats.weeksLived;
              const entry = intentions[i];
              const era = getEraForWeek(i);
              
              const isMatch = doesMatchSearch(entry);
              const opacityClass = debouncedSearch && !isMatch && !isCurrent ? 'opacity-10 grayscale' : 'opacity-100';

              let boxClass = "bg-[#1a1a1a] border border-[#222]"; 
              
              if (isPast) {
                boxClass = `${era.color} border-none hover:opacity-80 cursor-pointer transition-opacity`; 
                if (entry) {
                  const catKey = entry.category || 'default';
                  const styles = getCategoryStyle(catKey);
                  boxClass = `${styles.bg} shadow-[0_0_5px_rgba(0,0,0,0.5)] z-10`;
                  if (entry.isMilestone) boxClass = "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.6)] z-20 hover:bg-amber-300";
                }
              } else if (isCurrent) {
                boxClass = "bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)] z-30 scale-125 animate-pulse cursor-pointer"; 
              } else if (isFuture) {
                boxClass = "bg-[#121212] border border-[#222] hover:border-gray-500 cursor-pointer"; 
                if (entry) {
                  const catKey = entry.category || 'default';
                  const styles = getCategoryStyle(catKey);
                  boxClass = `bg-transparent border-2 ${styles.border} z-10`; 
                  if (entry.isMilestone) boxClass = "bg-transparent border-2 border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.2)]";
                }
              }

              return (
                <WeekBox 
                  key={i} 
                  weekIndex={i}
                  boxClass={boxClass}
                  opacityClass={opacityClass}
                  onClick={onBoxClick}
                  onMouseEnter={onBoxEnter}
                  onMouseLeave={onBoxLeave}
                  isCurrent={isCurrent}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* --- TIMELINE VIEW (Padded) --- */}
      {view === 'timeline' && (
        <div className="max-w-2xl w-full flex flex-col gap-6 px-4 md:px-0">
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
                    </div>
                    <span className="text-xs text-gray-500 font-mono">{getDateFromWeekIndex(entry.weekIndex)} • Age {getAgeFromWeekIndex(entry.weekIndex)}</span>
                  </div>
                  <p className={`text-lg leading-relaxed ${entry.isMilestone ? 'text-white font-semibold' : 'text-gray-300'}`}>{entry.text}</p>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* --- STATS VIEW (Padded) --- */}
      {view === 'stats' && (
        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-6 px-4 md:px-0 animate-in fade-in duration-500">
           {/* ... stats content ... */}
           <div className="col-span-1 md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
             <div className="bg-[#1E1E1E] p-6 rounded-xl border border-gray-800 flex flex-col items-center"><span className="text-2xl md:text-4xl font-bold text-white mb-2">{dashboardStats.totalMemories}</span><span className="text-[10px] md:text-xs uppercase tracking-widest text-gray-500">Total Memories</span></div>
             <div className="bg-[#1E1E1E] p-6 rounded-xl border border-gray-800 flex flex-col items-center"><span className="text-2xl md:text-4xl font-bold text-amber-400 mb-2">{dashboardStats.totalMilestones}</span><span className="text-[10px] md:text-xs uppercase tracking-widest text-amber-500/70">Milestones</span></div>
             <div className="bg-[#1E1E1E] p-6 rounded-xl border border-gray-800 flex flex-col items-center"><span className="text-2xl md:text-4xl font-bold text-cyan-400 mb-2">{Math.round((dashboardStats.totalMemories / stats.weeksLived) * 100) || 0}%</span><span className="text-[10px] md:text-xs uppercase tracking-widest text-cyan-500/70">Docs Rate</span></div>
             <div className="bg-[#1E1E1E] p-6 rounded-xl border border-gray-800 flex flex-col items-center"><span className="text-2xl md:text-4xl font-bold text-white mb-2">{4680 - stats.weeksLived}</span><span className="text-[10px] md:text-xs uppercase tracking-widest text-gray-500">Weeks Left</span></div>
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

      {/* --- MOBILE BOTTOM NAVIGATION (New) --- */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#121212] border-t border-gray-800 p-2 pb-6 flex md:hidden justify-around z-50">
         {['grid', 'timeline', 'stats'].map(v => (
           <button 
             key={v}
             onClick={() => { setView(v); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
             className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${view === v ? 'text-white' : 'text-gray-600'}`}
           >
             {/* Icons */}
             {v === 'grid' && <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>}
             {v === 'timeline' && <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>}
             {v === 'stats' && <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>}
             <span className="text-[10px] font-bold uppercase">{v}</span>
           </button>
         ))}
      </div>

      {/* FLOATING ACTION BUTTON (Grid View Only, Positioned above Bottom Nav on mobile) */}
      {view === 'grid' && (
        <button onClick={jumpToNow} className="fixed bottom-24 right-6 md:bottom-8 md:right-8 bg-cyan-500 hover:bg-white text-black p-4 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all hover:scale-110 z-40 group" title="Jump to Today">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      )}

      {/* --- CUSTOM TOOLTIP --- */}
      {tooltip.show && (
        <div 
          className="fixed z-50 bg-[#222] border border-gray-700 p-3 rounded-lg shadow-2xl pointer-events-none backdrop-blur-md animate-in fade-in duration-75"
          style={{ top: tooltip.y, left: tooltip.x }}
        >
          {tooltip.content}
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
           <div className="bg-[#1E1E1E] rounded-2xl max-w-lg w-full border border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
             <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Settings</h2>
                <button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-white transition-colors">✕</button>
             </div>
             <div className="flex border-b border-gray-800">
               {['categories', 'profile', 'data'].map(tab => (
                 <button key={tab} onClick={() => setSettingsTab(tab)} className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${settingsTab === tab ? 'text-cyan-500 border-cyan-500 bg-gray-900/50' : 'text-gray-500 border-transparent hover:text-white hover:bg-gray-900/30'}`}>{tab}</button>
               ))}
             </div>
             <div className="p-6 overflow-y-auto">
               {/* ... (Existing Settings Content Same as Before) ... */}
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
                     <p className="text-xs text-gray-500 mt-2">Changing this will recalculate your entire life grid.</p>
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

      {/* MEMORY MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-[#1E1E1E] p-6 md:p-8 rounded-2xl max-w-md w-full border border-gray-700 shadow-2xl animate-in fade-in zoom-in duration-200 m-4">
            <div className="flex justify-between items-center mb-1">
              <h2 className="text-xl md:text-2xl font-bold text-white">{selectedWeek === stats.weeksLived ? "Claim This Week" : (selectedWeek > stats.weeksLived ? "Set Future Goal" : "Edit Memory")}</h2>
              <button onClick={() => setIsMilestone(!isMilestone)} className={`text-2xl transition-transform ${isMilestone ? 'scale-110' : 'opacity-30 hover:opacity-100'}`} title={selectedWeek > stats.weeksLived ? "Major Life Goal" : "Mark as Milestone"}>{isMilestone ? '⭐' : '☆'}</button>
            </div>
            <p className="text-xs uppercase tracking-widest font-bold text-gray-500 mb-4 flex items-center gap-2"><span className="text-cyan-500">{getDateFromWeekIndex(selectedWeek)}</span><span>•</span>{getEraForWeek(selectedWeek).name}</p>
            <textarea autoFocus className={`w-full bg-black/50 text-white p-4 rounded-lg border focus:outline-none mb-4 transition-colors h-24 resize-none ${isMilestone ? 'border-amber-400/50' : 'border-gray-700 focus:border-white'}`} value={tempIntention} onChange={(e) => setTempIntention(e.target.value)} placeholder={selectedWeek > stats.weeksLived ? "What do you want to achieve?" : "What happened?"} />
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
              {Object.entries(categories).map(([key, val]) => {
                const styles = getCategoryStyle(key);
                return (
                  <button key={key} onClick={() => setSelectedCategory(key)} className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold transition-all border ${selectedCategory === key ? styles.bg + ' text-white border-transparent' : 'bg-transparent text-gray-500 border-gray-700 hover:border-gray-500'}`}>{val.label}</button>
                );
              })}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 text-gray-400 hover:text-white">Cancel</button>
              <button onClick={saveIntention} className={`flex-1 text-black font-bold py-3 rounded-lg shadow-lg ${isMilestone ? 'bg-amber-400 hover:bg-amber-300' : 'bg-white hover:bg-gray-200'}`}>{selectedWeek > stats.weeksLived ? "SET TARGET" : "SAVE MEMORY"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;