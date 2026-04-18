const TOTAL_TABLES = 10;
const OCCUPIED_TABLES = [2, 5, 8];

export default function TableModal({ open, onClose, onSelectTable, currentTable }) {
  if (!open) return null;

  const getTableState = (n) => {
    if (n === currentTable) return 'active';
    if (OCCUPIED_TABLES.includes(n)) return 'occupied';
    return 'free';
  };

  return (
    <div
      className="fixed inset-0 z-[500] bg-bg/90 backdrop-blur-2xl flex items-center justify-center transition-opacity"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-[480px] max-w-[95vw] bg-card border border-saffron/20 rounded-2xl p-7 animate-pop-in">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 border border-saffron/20 rounded-full bg-surface text-saffron text-sm flex items-center justify-center cursor-pointer hover:bg-red hover:border-red hover:text-white transition-all"
        >
          ×
        </button>

        <h3 className="font-[Playfair_Display] text-base font-bold tracking-[3px] uppercase text-saffron mb-1">
          🪑 Select Table
        </h3>
        <p className="text-[11px] text-txt3 mb-4">Tap a table to load it for this order</p>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-4 text-[10px] text-txt3 tracking-wide">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500/80 inline-block" />Free</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-saffron inline-block" />Active</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red/70 inline-block" />Occupied</span>
        </div>

        {/* Table Grid */}
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: TOTAL_TABLES }, (_, i) => i + 1).map(n => {
            const state = getTableState(n);
            return (
              <button
                key={n}
                onClick={() => state !== 'occupied' && onSelectTable(n)}
                disabled={state === 'occupied'}
                className={`flex flex-col items-center justify-center gap-1 py-4 rounded-xl border-2 text-xs font-bold tracking-wide transition-all ${
                  state === 'active'
                    ? 'border-saffron bg-saffron/10 text-saffron shadow-[0_0_16px_rgba(255,153,51,0.3)] scale-105 cursor-pointer'
                    : state === 'occupied'
                    ? 'border-red/40 bg-red/5 text-red/50 cursor-not-allowed opacity-60'
                    : 'border-saffron/15 bg-surface/80 text-txt hover:border-saffron/50 hover:bg-saffron/5 hover:scale-105 cursor-pointer'
                }`}
              >
                <span className="text-xl">{state === 'active' ? '🟡' : state === 'occupied' ? '🔴' : '🟢'}</span>
                <span>T{n}</span>
                <span className={`text-[9px] font-normal tracking-widest uppercase ${
                  state === 'active' ? 'text-saffron/70' : state === 'occupied' ? 'text-red/40' : 'text-txt3'
                }`}>
                  {state === 'active' ? 'Active' : state === 'occupied' ? 'Busy' : 'Free'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
