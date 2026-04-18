import { useState } from 'react';

export default function WelcomeBar({ customerName, tableNum, onSetName, onSetTable }) {
  const [editing, setEditing] = useState(true);
  const [name, setName] = useState('');
  const [table, setTable] = useState('');

  const handleSave = () => {
    const trimmed = name.trim();
    const tbl = table.trim();
    if (!trimmed) return;
    onSetName(trimmed);
    onSetTable(tbl);
    setEditing(false);
  };

  if (!editing && customerName) {
    return (
      <div className="flex items-center flex-wrap gap-x-4 gap-y-1 px-6 py-2.5 bg-gradient-to-r from-saffron/5 to-transparent border-b border-saffron/10">
        <span className="text-sm">
          <span className="text-txt3">👤</span>
          &nbsp;Welcome,&nbsp;
          <span className="text-saffron font-semibold">{customerName}</span>
        </span>
        {tableNum && (
          <span className="text-sm text-txt3">
            · Table&nbsp;<span className="text-txt font-bold">{tableNum}</span>
          </span>
        )}
        <button
          onClick={() => setEditing(true)}
          className="ml-auto text-[11px] text-txt3 hover:text-saffron transition-colors underline cursor-pointer"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center flex-wrap gap-3 px-6 py-3 bg-gradient-to-r from-saffron/8 to-red/5 border-b border-saffron/15">
      <span className="text-saffron text-sm font-semibold whitespace-nowrap shrink-0">
        👋 Tell us about you:
      </span>
      <input
        type="text"
        placeholder="Your name *"
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSave()}
        className="px-3 py-1.5 bg-surface border border-saffron/25 rounded-lg text-txt text-sm outline-none focus:border-saffron transition-all placeholder:text-txt3 w-36"
      />
      <input
        type="text"
        placeholder="Table no."
        value={table}
        onChange={e => setTable(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSave()}
        className="px-3 py-1.5 bg-surface border border-saffron/25 rounded-lg text-txt text-sm outline-none focus:border-saffron transition-all placeholder:text-txt3 w-24"
      />
      <button
        onClick={handleSave}
        disabled={!name.trim()}
        className="px-5 py-1.5 bg-gradient-to-r from-saffron-dark to-red rounded-lg text-white text-sm font-semibold cursor-pointer hover:shadow-[0_0_16px_rgba(255,153,51,0.35)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Let&apos;s Order! 🍛
      </button>
    </div>
  );
}
