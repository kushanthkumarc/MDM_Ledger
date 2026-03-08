import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay } from 'date-fns';
import { Calendar, FileText, ChevronLeft, ChevronRight, Download, X } from 'lucide-react';
import Header from './components/Header';
import DailyCard from './components/DailyCard';
import { calculateInventory } from './utils/mdmLogic';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ControlPanel = ({ activeItems, setActiveItems, stocks, updateStock, generatePDF, currentMonth }) => (
  <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-4">
    <div className="flex justify-around border-b pb-3">
      {['rice', 'dhall'].map(item => (
        <label key={item} className="flex items-center gap-2 cursor-pointer font-bold text-slate-600 capitalize">
          <input type="checkbox" checked={activeItems[item]} onChange={() => setActiveItems(p => ({...p, [item]: !p[item]}))} className="w-5 h-5 rounded text-blue-600" />
          {item}
        </label>
      ))}
    </div>
    <div className="grid grid-cols-2 gap-3">
      {activeItems.rice && (
        <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
          <p className="text-[10px] font-bold text-blue-600 uppercase text-center">Rice Opening</p>
          <input type="number" value={stocks.rice} onChange={(e) => updateStock('rice', e.target.value)} className="w-full bg-transparent font-bold text-lg outline-none text-center" />
        </div>
      )}
      {activeItems.dhall && (
        <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
          <p className="text-[10px] font-bold text-amber-600 uppercase text-center">Dhall Opening</p>
          <input type="number" value={stocks.dhall} onChange={(e) => updateStock('dhall', e.target.value)} className="w-full bg-transparent font-bold text-lg outline-none text-center" />
        </div>
      )}
    </div>
    <button onClick={generatePDF} className="w-full bg-blue-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">
      <Download size={20}/> Download {format(currentMonth, 'MMM')} Report
    </button>
  </div>
);

export default function App() {
  const [view, setView] = useState('daily'); 
  const [selectedDates, setSelectedDates] = useState([]); // Array of selected date objects
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeItems, setActiveItems] = useState({ rice: true, dhall: true });
  const [stocks, setStocks] = useState({ rice: 0, dhall: 0 });
  const [allData, setAllData] = useState({});

  useEffect(() => {
    const monthKey = format(currentMonth, 'yyyy-MM');
    const saved = JSON.parse(localStorage.getItem(`mdm_master`)) || {};
    setAllData(saved);
    setStocks({
      rice: localStorage.getItem(`rStock_${monthKey}`) || 0,
      dhall: localStorage.getItem(`dStock_${monthKey}`) || 0
    });
  }, [currentMonth]);

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  }).filter(d => getDay(d) !== 0);

  const daysData = daysInMonth.map(d => {
    const dateStr = format(d, 'yyyy-MM-dd');
    return { date: dateStr, display: format(d, 'MMM dd, EEE'), pStr: allData[dateStr]?.pStr || 0, mStr: allData[dateStr]?.mStr || 0 };
  });

  const computedDays = calculateInventory(daysData, stocks.rice, stocks.dhall);

  const toggleDateSelection = (date) => {
    const isAlreadySelected = selectedDates.some(d => isSameDay(d, date));
    
    if (isAlreadySelected) {
      setSelectedDates(selectedDates.filter(d => !isSameDay(d, date)));
    } else {
      if (selectedDates.length >= 5) {
        alert("Maximum 5 days can be selected at once , If you want to calculate more days Try Monthly");
        return;
      }
      // Add the date and sort them chronologically
      const newSelection = [...selectedDates, date].sort((a, b) => a - b);
      setSelectedDates(newSelection);
    }
  };

  const updateDay = (dateStr, field, val) => {
    const newData = { ...allData, [dateStr]: { ...(allData[dateStr] || {pStr: 0, mStr: 0}), [field]: val } };
    setAllData(newData);
    localStorage.setItem(`mdm_master`, JSON.stringify(newData));
  };

  const updateStock = (item, val) => {
    const monthKey = format(currentMonth, 'yyyy-MM');
    setStocks(prev => ({ ...prev, [item]: val }));
    localStorage.setItem(`${item === 'rice' ? 'r' : 'd'}Stock_${monthKey}`, val);
  };

  const generatePDF = () => { /* ... existing generatePDF logic ... */ };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans text-slate-900">
      <Header riceBal={computedDays[computedDays.length-1]?.riceRemaining || 0} dhallBal={computedDays[computedDays.length-1]?.dhallRemaining || 0} />

      <main className="max-w-md mx-auto p-4 space-y-4">
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
          <button onClick={() => setView('daily')} className={`flex-1 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${view === 'daily' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'}`}><Calendar size={18}/> Daily</button>
          <button onClick={() => setView('monthly')} className={`flex-1 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${view === 'monthly' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'}`}><FileText size={18}/> Monthly</button>
        </div>

        <ControlPanel activeItems={activeItems} setActiveItems={setActiveItems} stocks={stocks} updateStock={updateStock} generatePDF={generatePDF} currentMonth={currentMonth} />

        {view === 'daily' ? (
          <>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-4 font-bold">
                <button onClick={() => setCurrentMonth(prev => new Date(prev.setMonth(prev.getMonth()-1)))}><ChevronLeft/></button>
                <div className="text-center">
                   <h2 className="leading-none">{format(currentMonth, 'MMMM yyyy')}</h2>
                   <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-tighter">Tap to select/remove up to 5 days</p>
                </div>
                <button onClick={() => setCurrentMonth(prev => new Date(prev.setMonth(prev.getMonth()+1)))}><ChevronRight/></button>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {eachDayOfInterval({start: startOfMonth(currentMonth), end: endOfMonth(currentMonth)}).map(d => {
                  const isSelected = selectedDates.some(sel => isSameDay(sel, d));
                  return (
                    <button 
                      key={d.toString()}
                      disabled={getDay(d) === 0}
                      onClick={() => toggleDateSelection(d)}
                      className={`aspect-square rounded-lg text-sm font-bold transition-all relative ${getDay(d) === 0 ? 'text-slate-200' : isSelected ? 'bg-blue-600 text-white shadow-lg scale-105 ring-2 ring-blue-200' : 'text-slate-700 hover:bg-blue-50'}`}
                    >
                      {format(d, 'd')}
                      {isSelected && <div className="absolute top-0 right-0 w-2 h-2 bg-green-400 rounded-full border border-white"></div>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              {selectedDates.length > 0 ? (
                selectedDates.map(date => {
                  const dateStr = format(date, 'yyyy-MM-dd');
                  const dayData = computedDays.find(d => d.date === dateStr) || { display: format(date, 'MMM dd'), pStr: 0, mStr: 0 };
                  return (
                    <div key={dateStr} className="relative group">
                      <button onClick={() => toggleDateSelection(date)} className="absolute -top-2 -right-2 bg-slate-800 text-white rounded-full p-1 z-10 shadow-lg border-2 border-white hover:bg-red-500 transition-colors"><X size={12}/></button>
                      <DailyCard day={dayData} onUpdate={updateDay} activeItems={activeItems} isFocus={true} />
                    </div>
                  );
                })
              ) : (
                <div className="py-10 text-center border-2 border-dashed rounded-2xl border-slate-200 text-slate-400">
                   <p className="text-sm">Select dates from the calendar above<br/>to start entering details.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Monthly List Rendering ... */
          <div className="space-y-2">
            {computedDays.map(day => (
              <div key={day.date} className="bg-white p-3 rounded-xl border border-slate-100 flex items-center gap-3">
                <div className="min-w-[55px] text-center border-r pr-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">{format(new Date(day.date), 'EEE')}</p>
                  <p className="text-lg font-black text-slate-700 leading-tight">{format(new Date(day.date), 'dd')}</p>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <input type="number" placeholder="P" value={day.pStr || ''} onChange={(e) => updateDay(day.date, 'pStr', e.target.value)} className="w-full bg-slate-50 border rounded-lg p-2 text-center font-bold text-sm outline-none focus:ring-1 focus:ring-blue-400" />
                  <input type="number" placeholder="M" value={day.mStr || ''} onChange={(e) => updateDay(day.date, 'mStr', e.target.value)} className="w-full bg-slate-50 border rounded-lg p-2 text-center font-bold text-sm outline-none focus:ring-1 focus:ring-blue-400" />
                </div>
                <div className="pl-2 border-l text-right min-w-[65px]">
                  <p className="text-[9px] font-bold text-blue-600">R: {day.riceRemaining}</p>
                  <p className="text-[9px] font-bold text-amber-600">D: {day.dhallRemaining}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}