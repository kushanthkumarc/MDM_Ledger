import React from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function MonthSelector({ currentMonth, onMonthChange }) {
  return (
    <div className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm border border-blue-50">
      <button 
        onClick={() => onMonthChange(subMonths(currentMonth, 1))}
        className="p-2 hover:bg-gray-100 rounded-full"
      >
        <ChevronLeft size={20} className="text-blue-600" />
      </button>
      
      <div className="text-center">
        <h2 className="font-bold text-gray-800">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <p className="text-[10px] text-gray-400 uppercase tracking-widest">Selected Period</p>
      </div>

      <button 
        onClick={() => onMonthChange(addMonths(currentMonth, 1))}
        className="p-2 hover:bg-gray-100 rounded-full"
      >
        <ChevronRight size={20} className="text-blue-600" />
      </button>
    </div>
  );
}