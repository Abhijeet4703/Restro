import { useState, useMemo } from 'react';
import { menuData, categories } from '../data/menuData';

export default function MenuBrowser({ onAddItem, order }) {
  const [activeCat, setActiveCat] = useState('all');
  const [search, setSearch] = useState('');

  const getQty = (id) => order.find(e => e.id === id)?.qty || 0;

  const filtered = useMemo(() => {
    let items = activeCat === 'all' ? menuData : menuData.filter(i => i.cat === activeCat);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(q) || i.cat.includes(q));
    }
    return items;
  }, [activeCat, search]);

  return (
    <div className="flex flex-col min-h-0 border-r border-saffron/10 max-lg:border-r-0">
      {/* Sticky search + filter bar */}
      <div className="sticky top-[64px] z-20 bg-card/95 backdrop-blur-md border-b border-saffron/10">
        {/* Search row */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-saffron/8 bg-gradient-to-r from-card/60 to-surface/40">
          <h2 className="font-[Playfair_Display] text-sm font-bold tracking-[3px] uppercase text-saffron flex items-center gap-2">
            <span>🍽️</span>
            Our Menu
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

        {/* Category tabs */}
        <div className="flex gap-1.5 px-5 py-2.5 overflow-x-auto scrollbar-hide bg-surface/50">
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
      </div>

      {/* Card grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 && (
          <div className="text-center text-txt3 py-16 text-sm">No dishes found 🍽️</div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((item, i) => (
            <MenuCard
              key={item.id}
              item={item}
              qty={getQty(item.id)}
              delay={i * 0.03}
              onAdd={() => onAddItem(item.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MenuCard({ item, qty, delay, onAdd }) {
  const [pop, setPop] = useState(false);

  const handleAdd = () => {
    onAdd();
    setPop(true);
    setTimeout(() => setPop(false), 320);
  };

  return (
    <div
      style={{ animationDelay: `${delay}s` }}
      className="animate-fade-up group bg-surface/80 border border-saffron/10 rounded-2xl overflow-hidden hover:border-saffron/35 hover:shadow-[0_8px_32px_rgba(255,153,51,0.13)] transition-all duration-300"
    >
      {/* Image */}
      <div className="relative overflow-hidden h-44">
        <img
          src={item.img}
          alt={item.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-card/75 via-transparent to-transparent" />

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex gap-1.5 flex-wrap">
          <span
            className={`text-[9px] px-2 py-1 rounded-full font-semibold border backdrop-blur-sm ${
              item.veg
                ? 'bg-green/20 text-green border-green/40'
                : 'bg-red-light/20 text-red-light border-red-light/40'
            }`}
          >
            {item.veg ? '🟢 Veg' : '🔴 Non-Veg'}
          </span>
          {item.signature && (
            <span className="text-[9px] px-2 py-1 rounded-full font-semibold bg-turmeric/20 text-turmeric border border-turmeric/40 backdrop-blur-sm">
              ⭐ Signature
            </span>
          )}
        </div>

        {/* Cart qty badge */}
        {qty > 0 && (
          <div className="absolute top-2.5 right-2.5 bg-saffron text-bg text-[11px] font-black w-7 h-7 rounded-full flex items-center justify-center shadow-[0_0_14px_rgba(255,153,51,0.6)]">
            {qty}
          </div>
        )}

        {/* Price on image bottom */}
        <div className="absolute bottom-2.5 right-3 text-[16px] font-extrabold text-saffron drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]">
          ₹{item.price}
        </div>
      </div>

      {/* Info + Button */}
      <div className="p-3.5">
        <div className="mb-1">
          <h3 className="text-[14px] font-bold text-txt leading-tight">{item.name}</h3>
          <p className="text-[10px] font-medium tracking-[1.5px] uppercase text-txt3 mt-0.5">{item.cat}</p>
        </div>

        <button
          onClick={handleAdd}
          className={`mt-2 w-full py-2.5 rounded-xl text-[12px] font-bold tracking-wide cursor-pointer transition-all ${
            pop ? 'scale-95' : 'scale-100'
          } ${
            qty > 0
              ? 'bg-saffron/15 border border-saffron text-saffron hover:bg-saffron hover:text-bg hover:shadow-[0_0_20px_rgba(255,153,51,0.3)]'
              : 'bg-gradient-to-r from-saffron-dark/15 to-red/10 border border-saffron/25 text-saffron hover:from-saffron-dark hover:to-red hover:text-white hover:shadow-[0_0_20px_rgba(255,153,51,0.3)] hover:border-saffron'
          }`}
        >
          {qty > 0 ? `✓ Add More  (${qty} in cart)` : '+ Add to Order'}
        </button>
      </div>
    </div>
  );
}
