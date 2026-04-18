import useClock from '../hooks/useClock';

export default function Header({ totalItems, onCartOpen }) {
  const time = useClock();

  return (
    <header className="flex items-center justify-between px-6 py-3.5 bg-gradient-to-r from-[#1a0a00]/95 to-[#2d1400]/95 backdrop-blur-xl border-b border-saffron/20 sticky top-0 z-50">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-saffron-dark to-red flex items-center justify-center text-xl shadow-[0_0_20px_rgba(255,153,51,0.3)]">
          🪷
        </div>
        <div className="flex flex-col">
          <span className="font-[Playfair_Display] text-[17px] font-bold tracking-[3px] text-saffron animate-glow">
            MASALA HOUSE
          </span>
          <span className="text-[9px] tracking-[3px] uppercase text-txt2 font-medium">
            Digital Menu & Billing
          </span>
        </div>
      </div>

      {/* Center label */}
      <span className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-3 text-txt3">
        <span className="ornament-line !flex-[0_0_40px]" />
        <span className="font-[Playfair_Display] text-xs font-semibold tracking-[5px] uppercase italic">
          Customer Menu
        </span>
        <span className="ornament-line !flex-[0_0_40px]" />
      </span>

      {/* Right: Clock + Cart (mobile) */}
      <div className="flex items-center gap-3">
        <span className="hidden sm:block text-[13px] font-semibold text-saffron-light tracking-wider px-4 py-2 border border-saffron/20 rounded-full bg-saffron-dim">
          🕐 {time}
        </span>

        {/* Cart button — visible on mobile only (desktop shows sidebar) */}
        <button
          onClick={onCartOpen}
          className="relative flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-saffron-dark/20 to-red/15 border border-saffron/30 rounded-full text-saffron text-sm font-semibold cursor-pointer hover:from-saffron-dark hover:to-red hover:text-white hover:shadow-[0_0_20px_rgba(255,153,51,0.4)] transition-all lg:hidden"
        >
          <span>🛒</span>
          {totalItems > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(198,40,40,0.5)] animate-pulse-badge">
              {totalItems}
            </span>
          )}
        </button>

        {/* Desktop cart count badge */}
        {totalItems > 0 && (
          <span className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-saffron/10 border border-saffron/25 rounded-full text-saffron text-[12px] font-semibold">
            🛒 <span className="font-black">{totalItems}</span> items
          </span>
        )}
      </div>
    </header>
  );
}
