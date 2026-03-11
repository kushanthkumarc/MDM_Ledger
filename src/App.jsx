import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Download, X, RotateCcw, FileText, PackagePlus } from 'lucide-react';
import Header from './components/Header';
import DailyCard from './components/DailyCard';
import { calculateInventory } from './utils/mdmLogic';
import jsPDF from 'jspdf'; 
import autoTable from 'jspdf-autotable';

const ControlPanel = ({ activeItems, setActiveItems, stocks, updateStock, generatePDF }) => (
  <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-4">
    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 border-b pb-3">
      {Object.keys(activeItems).map(item => (
        <label key={item} className="flex items-center gap-1 cursor-pointer font-bold text-slate-500 capitalize text-[10px]">
          <input type="checkbox" checked={activeItems[item]} onChange={() => setActiveItems(p => ({...p, [item]: !p[item]}))} className="w-3 h-3 rounded text-blue-600" />
          {item}
        </label>
      ))}
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {Object.keys(activeItems).map(item => activeItems[item] && (
        <div key={item} className="bg-slate-50 p-2 rounded-xl border border-slate-100">
          <p className="text-[7px] font-black text-slate-400 uppercase text-center">{item} (Op. Bal)</p>
          <input type="number" value={stocks[item]} onChange={(e) => updateStock(item, e.target.value)} className="w-full bg-transparent font-bold text-xs text-center outline-none" placeholder="0" />
        </div>
      ))}
    </div>
    <button onClick={generatePDF} className="w-full bg-blue-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">
      <Download size={18}/> Download Full Report
    </button>
  </div>
);

export default function App() {
  const [view, setView] = useState('daily'); 
  const [selectedDates, setSelectedDates] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeItems, setActiveItems] = useState({ rice: true, dhall: true, oil: true, salt: true, veg: true, wood: true, maligai: true });
  const [stocks, setStocks] = useState({ rice: 0, dhall: 0, oil: 0, salt: 0, veg: 0, wood: 0, maligai: 0 });
  const [allData, setAllData] = useState({});
  const [showArrivalId, setShowArrivalId] = useState(null); 

  useEffect(() => {
    const monthKey = format(currentMonth, 'yyyy-MM');
    const saved = JSON.parse(localStorage.getItem(`mdm_master`)) || {};
    setAllData(saved);
    const op = {}; 
    Object.keys(activeItems).forEach(key => { 
      op[key] = parseFloat(localStorage.getItem(`${key}_Stock_${monthKey}`)) || 0;
    });
    setStocks(op);
  }, [currentMonth]);

  const daysInMonth = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  
  const daysData = daysInMonth.map(d => {
    const dateStr = format(d, 'yyyy-MM-dd');
    return { 
      ...allData[dateStr], 
      date: dateStr, 
      display: format(d, 'MMM dd, EEE'), 
      pStr: allData[dateStr]?.pStr || 0, 
      mStr: allData[dateStr]?.mStr || 0, 
      dhallActive: allData[dateStr]?.dhallActive || false,
      arrivals: allData[dateStr]?.arrivals || null 
    };
  });

  const computedDays = calculateInventory(daysData, stocks);

  const updateDay = (dateStr, field, val) => {
    const newData = { ...allData, [dateStr]: { ...(allData[dateStr] || {}), [field]: val } };
    setAllData(newData);
    localStorage.setItem(`mdm_master`, JSON.stringify(newData));
  };

  const updateStock = (item, val) => {
    const monthKey = format(currentMonth, 'yyyy-MM');
    setStocks(prev => ({ ...prev, [item]: val }));
    localStorage.setItem(`${item}_Stock_${monthKey}`, val);
  };

  const generatePDF = () => {
    try {
      // 1. Calculate total arrivals for the month for the Summary Table
      const newStockAdded = {};
      Object.keys(activeItems).forEach(item => {
        newStockAdded[item] = daysInMonth.reduce((acc, d) => {
          const dateStr = format(d, 'yyyy-MM-dd');
          return acc + parseFloat(allData[dateStr]?.arrivals?.[item] || 0);
        }, 0);
      });

      let daysToPrint = [];
      let periodOpening = {};
      const isDaily = view === 'daily' && selectedDates.length > 0;

      if (isDaily) {
        const sorted = [...selectedDates].sort((a, b) => a - b);
        daysToPrint = computedDays.filter(d => sorted.some(s => isSameDay(new Date(d.date), s)));
        const firstIdx = computedDays.findIndex(d => d.date === daysToPrint[0].date);
        
        if (firstIdx > 0) {
          // Report starts mid-month: Start with the previous day's CLOSING balance
          const p = computedDays[firstIdx - 1];
          periodOpening = { rice: p.riceRemaining, dhall: p.dhallRemaining, oil: p.oilRemaining, salt: p.saltRemaining, veg: p.vegRemaining, wood: p.woodRemaining, maligai: p.maligaiRemaining };
        } else {
          // Starting from Day 1: Start with ONLY the Opening Balance from your inputs
          Object.keys(stocks).forEach(k => periodOpening[k] = parseFloat(stocks[k]) || 0);
        }
      } else {
        // Monthly View: Filter out Sundays and start with ONLY the Opening Balance
        daysToPrint = computedDays.filter(d => getDay(new Date(d.date)) !== 0);
        Object.keys(stocks).forEach(k => periodOpening[k] = parseFloat(stocks[k]) || 0);
      }

      const doc = new jsPDF('l');
      doc.setFontSize(14);
      doc.text(`MDM Master Ledger - ${format(currentMonth, 'MMMM yyyy')} (${isDaily ? 'Daily Report' : 'Monthly Summary'})`, 14, 12);

      // --- STAGE 1: SUMMARY TABLE (Corrected to show Opening + New) ---
      const summaryHead = isDaily ? [["Item", "Opening Balance", "Total Used", "Closing Balance"]] : [["Item", "Opening Balance", "New Stock", "Total (Op+New)", "Total Used", "Final Closing"]];
      const summaryRows = [];
      Object.keys(activeItems).forEach(k => {
        if (activeItems[k]) {
          const op = parseFloat(periodOpening[k] || 0);
          const used = daysToPrint.reduce((acc, d) => acc + parseFloat(d[`${k}Used`] || 0), 0);
          if (isDaily) {
            summaryRows.push([k.toUpperCase(), op.toFixed(3), used.toFixed(3), (op - used).toFixed(3)]);
          } else {
            const added = parseFloat(newStockAdded[k] || 0);
            summaryRows.push([k.toUpperCase(), op.toFixed(3), added.toFixed(3), (op + added).toFixed(3), used.toFixed(3), (op + added - used).toFixed(3)]);
          }
        }
      });

      autoTable(doc, { startY: 18, head: summaryHead, body: summaryRows, theme: 'grid', styles: { fontSize: isDaily ? 10 : 7, halign: 'center' }, headStyles: { fillColor: isDaily ? [30, 64, 175] : [71, 85, 105] } });

      // --- STAGE 2: VIRTUAL DAILY TABLE (Corrected Balance Logic) ---
      let runningBal = { ...periodOpening }; 
      const commKeys = ["rice", "dhall", "oil", "salt"].filter(k => activeItems[k]);
      const moneyKeys = ["veg", "wood", "maligai"].filter(k => activeItems[k]);

      const h1 = [{ content: 'Date', rowSpan: 3, styles: { halign: 'center', valign: 'middle' } }, { content: 'Attendance', colSpan: 3, styles: { halign: 'center', fillColor: [71, 85, 105] } }];
      if (commKeys.length > 0) h1.push({ content: 'Commodities (Kg/L/Gm)', colSpan: commKeys.length * 2, styles: { halign: 'center', fillColor: [30, 64, 175] } });
      if (moneyKeys.length > 0) h1.push({ content: 'Monetary (Rupees)', colSpan: moneyKeys.length * 2, styles: { halign: 'center', fillColor: [21, 128, 61] } });

      const h2 = ["P", "M", "Tot"];
      [...commKeys, ...moneyKeys].forEach(k => h2.push({ content: k.toUpperCase(), colSpan: 2, styles: { halign: 'center' } }));
      const h3 = ["", "", ""]; [...commKeys, ...moneyKeys].forEach(() => h3.push("Used", "Bal"));

      const body = daysToPrint.map(d => {
        const row = [d.display, d.pStr, d.mStr, d.totalStudents];
        // Comm keys: Balance = Prev + Daily Arrival - Today Used
        commKeys.forEach(k => {
          const arr = parseFloat(d.arrivals?.[k] || 0);
          const u = parseFloat(d[`${k}Used`] || 0);
          runningBal[k] = (parseFloat(runningBal[k]) || 0) + arr - u;
          row.push(u.toFixed(3), parseFloat(runningBal[k]).toFixed(3));
        });
        // Money keys: Balance = Prev + Daily Arrival - Today Used
        moneyKeys.forEach(k => {
          const arr = parseFloat(d.arrivals?.[k] || 0);
          const u = parseFloat(d[`${k}Used`] || 0);
          runningBal[k] = (parseFloat(runningBal[k]) || 0) + arr - u;
          row.push(u.toFixed(2), parseFloat(runningBal[k]).toFixed(3));
        });
        return row;
      });

      autoTable(doc, { head: [h1, h2, h3], body: body, startY: doc.lastAutoTable.finalY + 15, theme: 'grid', styles: { fontSize: isDaily ? 8.5 : 5.5, halign: 'center' }, headStyles: { fontSize: 5 } });
      doc.save(`MDM_${isDaily ? 'Daily' : 'Monthly'}_Report.pdf`);
    } catch (e) { console.error(e); alert("PDF Error"); }
  };

  const resetMonthData = () => { if (window.confirm(`Clear data?`)) { const n = { ...allData }; daysInMonth.forEach(d => delete n[format(d, 'yyyy-MM-dd')]); setAllData(n); localStorage.setItem(`mdm_master`, JSON.stringify(n)); } };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans text-slate-900">
      <Header riceBal={computedDays[computedDays.length-1]?.riceRemaining || 0} dhallBal={computedDays[computedDays.length-1]?.dhallRemaining || 0} />
      <main className="max-w-md mx-auto p-4 space-y-4">
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
          <button onClick={() => setView('daily')} className={`flex-1 py-2 rounded-lg font-bold transition-all ${view === 'daily' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'}`}>Daily View</button>
          <button onClick={() => setView('monthly')} className={`flex-1 py-2 rounded-lg font-bold transition-all ${view === 'monthly' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'}`}>Monthly View</button>
        </div>

        <ControlPanel activeItems={activeItems} setActiveItems={setActiveItems} stocks={stocks} updateStock={updateStock} generatePDF={generatePDF} />

        {view === 'daily' ? (
          <>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <button onClick={() => setCurrentMonth(prev => subMonths(prev, 1))} className="p-1 hover:bg-slate-100 rounded-full"><ChevronLeft/></button>
                <h2 className="font-black text-slate-700">{format(currentMonth, 'MMMM yyyy')}</h2>
                <button onClick={() => setCurrentMonth(prev => addMonths(prev, 1))} className="p-1 hover:bg-slate-100 rounded-full"><ChevronRight/></button>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-[10px] font-black text-slate-400 text-center uppercase mb-1">{day}</div>
                ))}
                {[...Array(getDay(startOfMonth(currentMonth)))].map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}
                {daysInMonth.map(d => {
                  const isSel = selectedDates.some(s => isSameDay(s, d));
                  const isSun = getDay(d) === 0;
                  return (
                    <button key={d.toString()} disabled={isSun} 
                      onClick={() => isSel ? setSelectedDates(selectedDates.filter(s => !isSameDay(s, d))) : selectedDates.length < 5 && setSelectedDates([...selectedDates, d])} 
                      className={`aspect-square rounded-lg text-sm font-bold transition-all ${isSun ? 'text-red-200' : isSel ? 'bg-blue-600 text-white shadow-md' : 'text-slate-700 hover:bg-blue-50'} ${isToday(d) && !isSel ? 'border-2 border-blue-600' : ''}`}>
                      {format(d, 'd')}
                    </button>
                  );
                })}
              </div>
            </div>
            {selectedDates.sort((a,b)=>a-b).map(date => (
              <div key={date.toString()} className="relative">
                <button onClick={() => setSelectedDates(selectedDates.filter(s => !isSameDay(s, date)))} className="absolute -top-1 -right-1 bg-slate-800 text-white rounded-full p-1 z-10"><X size={10}/></button>
                <DailyCard day={computedDays.find(d => d.date === format(date, 'yyyy-MM-dd'))} onUpdate={updateDay} activeItems={activeItems} isFocus={true} />
              </div>
            ))}
          </>
        ) : (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center relative">
                <button onClick={() => setCurrentMonth(prev => subMonths(prev, 1))} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-slate-50 rounded-full"><ChevronLeft size={20}/></button>
                <div>
                  <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest">Monthly Ledger</p>
                  <h2 className="font-black text-slate-700 text-lg">{format(currentMonth, 'MMMM yyyy')}</h2>
                </div>
                <button onClick={() => setCurrentMonth(prev => addMonths(prev, 1))} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-slate-50 rounded-full"><ChevronRight size={20}/></button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Attendance, Dhall & Deliveries</h3>
                  <button onClick={resetMonthData} className="text-red-500 text-[10px] font-bold flex items-center gap-1 hover:opacity-70"><RotateCcw size={12}/> Reset Month</button>
              </div>
              
              {computedDays.filter(day => getDay(new Date(day.date)) !== 0).map(day => {
                // COLOR FIX: Strict numeric check for live updates
                const dayArrivals = allData[day.date]?.arrivals;
                const hasArrivals = dayArrivals && Object.values(dayArrivals).some(v => parseFloat(v) > 0);
                const isDhallActive = allData[day.date]?.dhallActive || false;
                
                return (
                  <div key={day.date} className="flex flex-col bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:border-blue-100 transition-colors">
                    <div className="p-3 flex items-center gap-3">
                      <div className="min-w-[45px] py-1 bg-slate-50 rounded-xl text-center border border-slate-100">
                        <p className="text-[7px] font-black text-slate-400 uppercase">{format(new Date(day.date), 'EEE')}</p>
                        <p className="text-xl font-black text-slate-700 leading-none">{format(new Date(day.date), 'dd')}</p>
                      </div>
                      
                      <div className="flex-1 grid grid-cols-2 gap-1.5">
                        <div className="relative group">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-300 group-focus-within:text-blue-400">P</span>
                          <input type="number" value={allData[day.date]?.pStr || ''} onChange={(e) => updateDay(day.date, 'pStr', e.target.value)} className="w-full bg-slate-50/50 border border-slate-100 rounded-xl py-2.5 pr-2 pl-5 text-center font-bold text-sm outline-none focus:bg-white focus:border-blue-300 transition-all" placeholder="0" />
                        </div>
                        <div className="relative group">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-300 group-focus-within:text-blue-400">M</span>
                          <input type="number" value={allData[day.date]?.mStr || ''} onChange={(e) => updateDay(day.date, 'mStr', e.target.value)} className="w-full bg-slate-50/50 border border-slate-100 rounded-xl py-2.5 pr-2 pl-5 text-center font-bold text-sm outline-none focus:bg-white focus:border-blue-300 transition-all" placeholder="0" />
                        </div>
                      </div>

                      <div className="flex gap-1.5">
                        {activeItems.dhall && (
                          <button 
                            onClick={() => updateDay(day.date, 'dhallActive', !isDhallActive)} 
                            className={`px-2 py-1.5 rounded-xl border flex flex-col items-center justify-center min-w-[42px] transition-all active:scale-90 ${
                              isDhallActive 
                              ? 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-100' 
                              : 'bg-white text-slate-300 border-slate-100'
                            }`}
                          >
                            <span className="text-[6px] font-black uppercase mb-0.5">Dhall</span>
                            <FileText size={14}/>
                            <span className="text-[6px] font-black mt-0.5">{isDhallActive ? 'ON' : 'OFF'}</span>
                          </button>
                        )}
                        <button 
                          onClick={() => setShowArrivalId(showArrivalId === day.date ? null : day.date)} 
                          className={`px-2 py-1.5 rounded-xl border flex flex-col items-center justify-center min-w-[42px] transition-all active:scale-90 ${
                            hasArrivals 
                            ? 'bg-green-600 text-white border-green-700 shadow-md ring-2 ring-green-100' 
                            : 'bg-white text-slate-300 border-slate-100'
                          }`}
                        >
                          <span className="text-[6px] font-black uppercase mb-0.5">Stock</span>
                          <PackagePlus size={14}/>
                          <span className="text-[6px] font-black mt-0.5">{hasArrivals ? 'ADDED' : 'ADD'}</span>
                        </button>
                      </div>
                    </div>

                    {showArrivalId === day.date && (
                      <div className="bg-green-50 p-3 border-t border-green-100 animate-in slide-in-from-top duration-300">
                        <div className="flex items-center gap-2 mb-2">
                           <div className="h-[1px] flex-1 bg-green-200"></div>
                           <span className="text-[8px] font-black text-green-700 uppercase tracking-widest">New Stock Received</span>
                           <div className="h-[1px] flex-1 bg-green-200"></div>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {Object.keys(activeItems).map(item => activeItems[item] && (
                            <div key={item}>
                              <p className="text-[7px] font-black text-green-700 uppercase text-center mb-0.5">{item}</p>
                              <input 
                                type="number" 
                                value={allData[day.date]?.arrivals?.[item] || ''} 
                                onChange={(e) => {
                                  const existingArrivals = allData[day.date]?.arrivals || {};
                                  const newArr = { ...existingArrivals, [item]: e.target.value };
                                  updateDay(day.date, 'arrivals', newArr);
                                }}
                                className="w-full bg-white border border-green-200 rounded-lg p-1.5 text-center text-xs font-bold outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                                placeholder="0"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}