export default function OrderInfoBar({ tableNum, orderNum, guests, onSelectTable }) {
  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  return (
    <div className="flex items-center gap-3 px-6 py-3.5 bg-gradient-to-r from-card/80 to-surface/60 border-b border-saffron/10 overflow-x-auto scrollbar-hide">
      <Chip icon="🪑" label="Table" value={tableNum} />
      <Chip icon="📋" label="Order" value={orderNum} />
      <Chip icon="📅" label="Date" value={today} />
      <Chip icon="👥" label="Guests" value={String(guests)} />

      {/* Change Table */}
      <button
        onClick={onSelectTable}
        className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-saffron bg-gradient-to-r from-saffron-dark to-red text-white text-xs font-semibold tracking-wide cursor-pointer shrink-0 uppercase hover:shadow-[0_0_25px_rgba(255,153,51,0.4)] hover:scale-105 transition-all"
      >
        <span>🪑</span>
        <span>Change Table</span>
      </button>
    </div>
  );
}

function Chip({ icon, label, value }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 bg-surface/80 border border-saffron/12 rounded-xl shrink-0 hover:border-saffron/30 transition-all">
      <span className="text-lg">{icon}</span>
      <div className="flex flex-col gap-px">
        <span className="text-[10px] font-medium tracking-[1.5px] uppercase text-txt3">{label}</span>
        <span className="text-[13px] font-bold text-txt">{value}</span>
      </div>
    </div>
  );
}
