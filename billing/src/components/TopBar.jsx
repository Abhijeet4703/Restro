import useClock from '../hooks/useClock';

export default function TopBar() {
  const time = useClock();

  return (
    <header className="flex items-center justify-between px-6 py-3.5 bg-gradient-to-r from-[#1a0a00]/95 to-[#2d1400]/95 backdrop-blur-xl border-b border-saffron/20 sticky top-0 z-50">
      {/* Left: Logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-saffron-dark to-red flex items-center justify-center text-xl shadow-[0_0_20px_rgba(255,153,51,0.3)]">
          🪷
        </div>
        <div className="flex flex-col">
          <span className="font-[Playfair_Display] text-[17px] font-bold tracking-[3px] text-saffron animate-glow">
            MASALA HOUSE
          </span>
          <span className="text-[9px] tracking-[3px] uppercase text-txt2 font-medium">
            Authentic Indian Kitchen
          </span>
        </div>
      </div>

      {/* Center */}
      <span className="absolute left-1/2 -translate-x-1/2 items-center gap-3 text-txt3 hidden md:flex">
        <span className="ornament-line !flex-[0_0_40px]" />
        <span className="font-[Playfair_Display] text-xs font-semibold tracking-[5px] uppercase italic">
          Billing Terminal
        </span>
        <span className="ornament-line !flex-[0_0_40px]" />
      </span>

      {/* Right: Clock */}
      <span className="text-[13px] font-semibold text-saffron-light tracking-wider px-4 py-2 border border-saffron/20 rounded-full bg-saffron-dim">
        🕐 {time}
      </span>
    </header>
  );
}
