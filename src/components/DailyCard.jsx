import React from 'react';
import { IndianRupee } from 'lucide-react';

export default function DailyCard({ day, onUpdate, activeItems, isFocus }) {
  if (!day) return null;
  const dailyCost = ((activeItems.veg ? parseFloat(day.vegUsed || 0) : 0) + (activeItems.wood ? parseFloat(day.woodUsed || 0) : 0) + (activeItems.maligai ? parseFloat(day.maligaiUsed || 0) : 0)).toFixed(2);

  return (
    <div className={`bg-white p-4 rounded-xl shadow-sm border-2 transition-all ${isFocus ? 'border-blue-500 ring-4 ring-blue-50' : 'border-transparent'}`}>
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-slate-700 leading-none">{day.display}</h3>
        {activeItems.dhall && (
          <button onClick={() => onUpdate(day.date, 'dhallActive', !day.dhallActive)} className={`text-[10px] px-3 py-1.5 rounded-full font-bold transition-all shadow-sm ${day.dhallActive ? 'bg-amber-500 text-white border-amber-600' : 'bg-slate-100 text-slate-400 border-transparent'} border`}>
            {day.dhallActive ? 'Dhall Served' : 'No Dhall'}
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="relative"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">P</span><input type="number" value={day.pStr || ''} onChange={(e) => onUpdate(day.date, 'pStr', e.target.value)} className="w-full bg-slate-50 border rounded-lg p-2.5 pl-6 text-center font-bold outline-none" placeholder="0" /></div>
        <div className="relative"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">M</span><input type="number" value={day.mStr || ''} onChange={(e) => onUpdate(day.date, 'mStr', e.target.value)} className="w-full bg-slate-50 border rounded-lg p-2.5 pl-6 text-center font-bold outline-none" placeholder="0" /></div>
      </div>
      {(activeItems.veg || activeItems.wood || activeItems.maligai) && (
        <div className="pt-3 border-t border-dashed border-slate-100">
          <div className="flex justify-between items-center mb-2 px-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Daily Cost</span>
            <span className="text-sm font-black text-green-600 flex items-center"><IndianRupee size={12}/>{dailyCost}</span>
          </div>
          <div className="flex gap-1 text-[9px] font-bold text-center">
            {activeItems.veg && <div className="flex-1 bg-green-50 text-green-700 p-1.5 rounded border border-green-100">Veg: ₹{day.vegUsed}</div>}
            {activeItems.wood && <div className="flex-1 bg-orange-50 text-orange-700 p-1.5 rounded border border-orange-100">Fuel: ₹{day.woodUsed}</div>}
            {activeItems.maligai && <div className="flex-1 bg-purple-50 text-purple-700 p-1.5 rounded border border-purple-100">Groc: ₹{day.maligaiUsed}</div>}
          </div>
        </div>
      )}
    </div>
  );
}