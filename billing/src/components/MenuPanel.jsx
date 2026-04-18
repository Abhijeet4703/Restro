import { useState, useMemo } from 'react';
import { menuData, categories } from '../data/menuData';

export default function MenuPanel({ onAddItem }) {
  const [activeCat, setActiveCat] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let items = activeCat === 'all' ? menuData : menuData.filter(i => i.cat === activeCat);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(q) || i.cat.includes(q));
    }
    return items;
  }, [activeCat, search]);

  return (
    <div className="flex flex-col min-h-0 border-r border-saffron/10 max-md:border-r-0 max-md:border-b max-md:max-h-[50vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-saffron/10 bg-gradient-to-r from-card/60 to-surface/40">
        <h2 className="font-[Playfair_Display] text-sm font-bold tracking-[3px] uppercase text-saffron flex items-center gap-2">
          <span>🍛</span>
          Menu Items
        </h2>
        <div className="relative w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none">🔍</span>
          <input
            type="text"
            placeholder="Search dishes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full py-2 pl-8 pr-3 bg-surface2 border border-saffron/15 rounded-full text-txt text-xs outline-none focus:border-saffron focus:shadow-[0_0_16px_rgba(255,153,51,0.15)] transition-all placeholder:text-txt3"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1.5 px-5 py-3 overflow-x-auto scrollbar-hide border-b border-saffron/10 bg-surface/50">
        {categories.map(c => (
          <button
            key={c.key}
            onClick={() => setActiveCat(c.key)}
            className={`px-4 py-1.5 border rounded-full text-xs font-medium cursor-pointer whitespace-nowrap transition-all shrink-0 ${
              activeCat === c.key
                ? 'bg-gradient-to-br from-saffron/20 to-red/15 border-saffron text-saffron shadow-[0_0_14px_rgba(255,153,51,0.2)] font-semibold'
                : 'bg-surface border-saffron/10 text-txt3 hover:border-saffron/40 hover:text-saffron-light hover:bg-saffron-dim'
            }`}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {/* Item List */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5">
        {filtered.length === 0 && (
          <div className="text-center text-txt3 py-10 text-sm">No dishes found 🍽️</div>
        )}
        {filtered.map((item, i) => (
          <ItemRow key={item.id} item={item} delay={i * 0.03} onAdd={() => onAddItem(item.id)} />
        ))}
      </div>
    </div>
  );
}

function ItemRow({ item, delay, onAdd }) {
  const [pop, setPop] = useState(false);

  const handleAdd = (e) => {
    e.stopPropagation();
    onAdd();
    setPop(true);
    setTimeout(() => setPop(false), 300);
  };

  return (
    <div
      onClick={onAdd}
      style={{ animationDelay: `${delay}s` }}
      className="animate-fade-up flex items-center gap-3 px-3.5 py-2.5 bg-surface/80 border border-transparent rounded-xl cursor-pointer transition-all hover:border-saffron/25 hover:bg-gradient-to-r hover:from-saffron/8 hover:to-red/5 hover:translate-x-1 hover:shadow-[0_4px_20px_rgba(255,153,51,0.08)] active:scale-[0.98]"
    >
      <img
        src={item.img}
        alt={item.name}
        loading="lazy"
        className="w-12 h-12 rounded-xl object-cover border border-saffron/15 shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-txt truncate">{item.name}</span>
          {item.veg !== undefined && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold border ${
              item.veg
                ? 'bg-green/15 text-green border-green/30'
                : 'bg-red-light/15 text-red-light border-red-light/30'
            }`}>
              {item.veg ? '🟢 Veg' : '🔴 Non-Veg'}
            </span>
          )}
          {item.signature && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold bg-turmeric/15 text-turmeric border border-turmeric/30">
              ⭐ Signature
            </span>
          )}
        </div>
        <div className="text-[10px] font-medium tracking-[1.5px] uppercase text-txt3">{item.cat}</div>
      </div>
      <span className="text-[13px] font-bold text-saffron shrink-0">₹{item.price}</span>
      <button
        onClick={handleAdd}
        className={`w-8 h-8 border border-saffron/30 rounded-full bg-gradient-to-br from-saffron-dark/20 to-red/15 text-saffron flex items-center justify-center shrink-0 cursor-pointer transition-all hover:from-saffron-dark hover:to-red hover:text-white hover:shadow-[0_0_16px_rgba(255,153,51,0.4)] hover:scale-110 ${pop ? 'animate-bump' : ''}`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </div>
  );
}
