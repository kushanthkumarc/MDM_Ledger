import React from 'react';

export default function DailyCard({ day, onUpdate, activeItems, isFocus }) {
  return (
    <div className={`bg-white p-4 rounded-xl shadow-sm border-2 transition-all duration-300 ${isFocus ? 'border-blue-500 ring-4 ring-blue-50' : 'border-transparent opacity-80'}`}>
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
           {isFocus && <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>}
           <h3 className={`font-bold ${isFocus ? 'text-blue-700' : 'text-slate-600'}`}>{day.display}</h3>
        </div>
        <div className="flex gap-2">
          {activeItems.rice && <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">R: {day.riceRemaining}</span>}
          {activeItems.dhall && <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded">D: {day.dhallRemaining}</span>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-300">P</span>
          <input type="number" value={day.pStr || ''} onChange={(e) => onUpdate(day.date, 'pStr', e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 pl-5 text-center font-bold outline-none focus:ring-1 focus:ring-blue-400" placeholder="0" />
        </div>
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-300">M</span>
          <input type="number" value={day.mStr || ''} onChange={(e) => onUpdate(day.date, 'mStr', e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 pl-5 text-center font-bold outline-none focus:ring-1 focus:ring-blue-400" placeholder="0" />
        </div>
      </div>
    </div>
  );
}