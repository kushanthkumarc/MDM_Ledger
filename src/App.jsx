import React, { useState, useEffect } from 'react';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  getDay, isSameDay, addMonths, subMonths, isToday
} from 'date-fns';
import { ChevronLeft, ChevronRight, Download, X, RotateCcw, FileText } from 'lucide-react';
import Header from './components/Header';
import DailyCard from './components/DailyCard';
import { calculateInventory } from './utils/mdmLogic';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ControlPanel = ({ activeItems, setActiveItems, stocks, updateStock, generatePDF }) => (
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
          <p className="text-[10px] font-bold text-blue-600 uppercase text-center">Rice Opening (kg)</p>
          <input type="number" value={stocks.rice} onChange={(e) => updateStock('rice', e.target.value)} className="w-full bg-transparent font-bold text-lg text-center outline-none" />
        </div>
      )}
      {activeItems.dhall && (
        <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
          <p className="text-[10px] font-bold text-amber-600 uppercase text-center">Dhall Opening (kg)</p>
          <input type="number" value={stocks.dhall} onChange={(e) => updateStock('dhall', e.target.value)} className="w-full bg-transparent font-bold text-lg text-center outline-none" />
        </div>
      )}
    </div>
    <button onClick={generatePDF} className="w-full bg-blue-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">
      <Download size={20}/> Download Report
    </button>
  </div>
);

export default function App() {
  const [view, setView] = useState('daily'); 
  const [selectedDates, setSelectedDates] = useState([]);
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
  });

  const daysData = daysInMonth.map(d => {
    const dateStr = format(d, 'yyyy-MM-dd');
    return { 
      date: dateStr, 
      display: format(d, 'MMM dd, EEE'), 
      pStr: allData[dateStr]?.pStr || 0, 
      mStr: allData[dateStr]?.mStr || 0,
      dhallActive: allData[dateStr]?.dhallActive || false 
    };
  });

  const computedDays = calculateInventory(daysData, stocks.rice, stocks.dhall);

  const updateDay = (dateStr, field, val) => {
    const newData = { ...allData, [dateStr]: { ...(allData[dateStr] || {pStr: 0, mStr: 0, dhallActive: false}), [field]: val } };
    setAllData(newData);
    localStorage.setItem(`mdm_master`, JSON.stringify(newData));
  };

  const updateStock = (item, val) => {
    const monthKey = format(currentMonth, 'yyyy-MM');
    setStocks(prev => ({ ...prev, [item]: val }));
    localStorage.setItem(`${item === 'rice' ? 'r' : 'd'}Stock_${monthKey}`, val);
  };

  const resetMonthData = () => {
    if (window.confirm(`Clear all entries for ${format(currentMonth, 'MMMM')}?`)) {
      const newData = { ...allData };
      daysInMonth.forEach(d => delete newData[format(d, 'yyyy-MM-dd')]);
      setAllData(newData);
      localStorage.setItem(`mdm_master`, JSON.stringify(newData));
    }
  };

  const generatePDF = () => {
    try {
      const doc = new jsPDF('p');
      doc.text(`MDM Report - ${format(currentMonth, 'MMMM yyyy')}`, 14, 15);
      const rows = computedDays.filter(d => getDay(new Date(d.date)) !== 0).map(d => [
        d.display, d.pStr, d.mStr, d.totalStudents, d.riceUsed, d.dhallActive ? d.dhallUsed : '0.000'
      ]);
      autoTable(doc, { head: [['Date', 'P', 'M', 'Total', 'Rice', 'Dhall']], body: rows, startY: 20 });
      doc.save(`MDM_${format(currentMonth, 'MMM_yyyy')}.pdf`);
    } catch (e) { alert("PDF Error"); }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans">
      <Header riceBal={computedDays[computedDays.length-1]?.riceRemaining || 0} dhallBal={computedDays[computedDays.length-1]?.dhallRemaining || 0} />
      
      <main className="max-w-md mx-auto p-4 space-y-4">
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
          <button onClick={() => setView('daily')} className={`flex-1 py-2 rounded-lg font-bold transition-all ${view === 'daily' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'}`}>Daily</button>
          <button onClick={() => setView('monthly')} className={`flex-1 py-2 rounded-lg font-bold transition-all ${view === 'monthly' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'}`}>Monthly</button>
        </div>

        <ControlPanel activeItems={activeItems} setActiveItems={setActiveItems} stocks={stocks} updateStock={updateStock} generatePDF={generatePDF} />

        {view === 'daily' ? (
          <>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-4 text-slate-800">
                <button onClick={() => setCurrentMonth(prev => subMonths(prev, 1))} className="p-2 hover:bg-slate-100 rounded-full"><ChevronLeft/></button>
                <h2 className="font-bold">{format(currentMonth, 'MMMM yyyy')}</h2>
                <button onClick={() => setCurrentMonth(prev => addMonths(prev, 1))} className="p-2 hover:bg-slate-100 rounded-full"><ChevronRight/></button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                  <div key={idx} className="text-center text-[10px] font-black text-slate-300 uppercase">{day}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: (getDay(startOfMonth(currentMonth)) + 6) % 7 }).map((_, i) => (
                  <div key={`spacer-${i}`} className="aspect-square" />
                ))}

                {daysInMonth.map(d => {
                  const isSel = selectedDates.some(s => isSameDay(s, d));
                  const isSun = getDay(d) === 0;
                  return (
                    <button 
                      key={d.toString()} 
                      disabled={isSun} 
                      onClick={() => isSel ? setSelectedDates(selectedDates.filter(s => !isSameDay(s, d))) : selectedDates.length < 5 && setSelectedDates([...selectedDates, d])} 
                      className={`aspect-square rounded-lg text-sm font-bold relative 
                        ${isSun ? 'text-slate-100' : isSel ? 'bg-blue-600 text-white shadow-lg' : isToday(d) ? 'border-2 border-blue-200 text-blue-700' : 'text-slate-700 hover:bg-blue-50'}`}
                    >
                      {format(d, 'd')}
                      {isSel && <div className="absolute top-0 right-0 w-2 h-2 bg-green-400 rounded-full border border-white"></div>}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-3">
              {[...selectedDates].sort((a,b) => a-b).map(date => (
                <div key={date.toString()} className="relative">
                  <button onClick={() => setSelectedDates(selectedDates.filter(s => !isSameDay(s, date)))} className="absolute -top-1 -right-1 bg-slate-800 text-white rounded-full p-1 z-10 border-2 border-white"><X size={10}/></button>
                  <DailyCard day={computedDays.find(d => d.date === format(date, 'yyyy-MM-dd')) || {}} onUpdate={updateDay} activeItems={activeItems} isFocus={true} />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1 mb-2">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Ledger</h3>
               <button onClick={resetMonthData} className="text-red-500 flex items-center gap-1 text-[10px] font-bold uppercase"><RotateCcw size={12}/> Reset Month</button>
            </div>
            {computedDays.filter(day => getDay(new Date(day.date)) !== 0).map(day => (
              <div key={day.date} className="bg-white p-3 rounded-xl border border-slate-100 flex items-center gap-3">
                <div className="min-w-[55px] text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">{format(new Date(day.date), 'EEE')}</p>
                  <p className="text-lg font-black text-slate-700">{format(new Date(day.date), 'dd')}</p>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <input type="number" value={day.pStr || ''} onChange={(e) => updateDay(day.date, 'pStr', e.target.value)} className="w-full bg-slate-50 border rounded-lg p-2 text-center font-bold text-sm outline-none" placeholder="P" />
                  <input type="number" value={day.mStr || ''} onChange={(e) => updateDay(day.date, 'mStr', e.target.value)} className="w-full bg-slate-50 border rounded-lg p-2 text-center font-bold text-sm outline-none" placeholder="M" />
                </div>
                <button onClick={() => updateDay(day.date, 'dhallActive', !day.dhallActive)} className={`p-2 rounded-lg transition-colors border ${day.dhallActive ? 'bg-amber-500 border-amber-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-300'}`}>
                  <FileText size={18}/>
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}