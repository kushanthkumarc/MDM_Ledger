import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Download, X, RotateCcw, FileText, IndianRupee } from 'lucide-react';
import Header from './components/Header';
import DailyCard from './components/DailyCard';
import { calculateInventory } from './utils/mdmLogic';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ControlPanel = ({ activeItems, setActiveItems, stocks, newStockAdded, updateStock, updateArrivalStock, generatePDF, view }) => (
  <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-4">
    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 border-b pb-3">
      {Object.keys(activeItems).map(item => (
        <label key={item} className="flex items-center gap-1 cursor-pointer font-bold text-slate-500 capitalize text-[10px]">
          <input type="checkbox" checked={activeItems[item]} onChange={() => setActiveItems(p => ({...p, [item]: !p[item]}))} className="w-3 h-3 rounded text-blue-600" />
          {item}
        </label>
      ))}
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {Object.keys(activeItems).map(item => activeItems[item] && (
        <div key={item} className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex gap-2">
          <div className={`flex-1 text-center ${view !== 'daily' ? 'border-r border-slate-200 pr-1' : ''}`}>
            <p className="text-[7px] font-black text-slate-400 uppercase">{item} (Op)</p>
            <input type="number" value={stocks[item]} onChange={(e) => updateStock(item, e.target.value)} className="w-full bg-transparent font-bold text-xs text-center outline-none" placeholder="0" />
          </div>
          {view !== 'daily' && (
            <div className="flex-1 text-center pl-1">
              <p className="text-[7px] font-black text-blue-400 uppercase">{item} (New)</p>
              <input type="number" value={newStockAdded[item]} onChange={(e) => updateArrivalStock(item, e.target.value)} className="w-full bg-transparent font-bold text-xs text-center outline-none" placeholder="0" />
            </div>
          )}
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
  const [newStockAdded, setNewStockAdded] = useState({ rice: 0, dhall: 0, oil: 0, salt: 0, veg: 0, wood: 0, maligai: 0 });
  const [allData, setAllData] = useState({});

  useEffect(() => {
    const monthKey = format(currentMonth, 'yyyy-MM');
    const saved = JSON.parse(localStorage.getItem(`mdm_master`)) || {};
    setAllData(saved);
    const op = {}; const arr = {};
    Object.keys(activeItems).forEach(key => { 
      op[key] = parseFloat(localStorage.getItem(`${key}_Stock_${monthKey}`)) || 0;
      arr[key] = parseFloat(localStorage.getItem(`${key}_Arrival_${monthKey}`)) || 0;
    });
    setStocks(op); setNewStockAdded(arr);
  }, [currentMonth]);

  const daysInMonth = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const daysData = daysInMonth.map(d => {
    const dateStr = format(d, 'yyyy-MM-dd');
    return { ...allData[dateStr], date: dateStr, display: format(d, 'MMM dd, EEE'), pStr: allData[dateStr]?.pStr || 0, mStr: allData[dateStr]?.mStr || 0, dhallActive: allData[dateStr]?.dhallActive || false };
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

  const updateArrivalStock = (item, val) => {
    const monthKey = format(currentMonth, 'yyyy-MM');
    setNewStockAdded(prev => ({ ...prev, [item]: val }));
    localStorage.setItem(`${item}_Arrival_${monthKey}`, val);
  };

  const generatePDF = () => {
    try {
      let daysToPrint = [];
      let periodOpening = {};
      const isDaily = view === 'daily' && selectedDates.length > 0;

      if (isDaily) {
        const sorted = [...selectedDates].sort((a, b) => a - b);
        daysToPrint = computedDays.filter(d => sorted.some(s => isSameDay(new Date(d.date), s)));
        const firstIdx = computedDays.findIndex(d => d.date === daysToPrint[0].date);
        
        if (firstIdx > 0) {
          // Get closing of day BEFORE report starts
          const p = computedDays[firstIdx - 1];
          periodOpening = { rice: p.riceRemaining, dhall: p.dhallRemaining, oil: p.oilRemaining, salt: p.saltRemaining, veg: p.vegRemaining, wood: p.woodRemaining, maligai: p.maligaiRemaining };
        } else {
          // Report starts on Day 1: Op + New
          Object.keys(stocks).forEach(k => periodOpening[k] = (parseFloat(stocks[k]) || 0) + (parseFloat(newStockAdded[k]) || 0));
        }
      } else {
        daysToPrint = computedDays.filter(d => getDay(new Date(d.date)) !== 0);
        Object.keys(stocks).forEach(k => periodOpening[k] = (parseFloat(stocks[k]) || 0) + (parseFloat(newStockAdded[k]) || 0));
      }

      const doc = new jsPDF('l');
      doc.setFontSize(14);
      doc.text(`MDM Master Ledger - ${format(currentMonth, 'MMMM yyyy')} (${isDaily ? 'Daily Report' : 'Monthly Summary'})`, 14, 12);

      // --- SUMMARY TABLE (REMAINS CORRECT) ---
      const summaryHead = isDaily ? [["Item", "Opening Balance", "Total Used", "Closing Balance"]] : [["Item", "Opening Balance", "New Stock", "Total (Op+New)", "Total Used", "Final Closing"]];
      const summaryRows = [];
      Object.keys(activeItems).forEach(k => {
        if (activeItems[k]) {
          const op = parseFloat(periodOpening[k] || 0);
          const used = daysToPrint.reduce((acc, d) => acc + parseFloat(d[`${k}Used`] || 0), 0);
          if (isDaily) summaryRows.push([k.toUpperCase(), op.toFixed(3), used.toFixed(3), (op - used).toFixed(3)]);
          else {
            const added = parseFloat(newStockAdded[k] || 0);
            summaryRows.push([k.toUpperCase(), (op-added).toFixed(3), added.toFixed(3), op.toFixed(3), used.toFixed(3), (op - used).toFixed(3)]);
          }
        }
      });

      autoTable(doc, { startY: 18, head: summaryHead, body: summaryRows, theme: 'grid', styles: { fontSize: isDaily ? 10 : 7, halign: 'center' }, headStyles: { fillColor: isDaily ? [30, 64, 175] : [71, 85, 105] } });

      // --- THE FIX: VIRTUAL DAILY TABLE ---
      // We recalculate the "Bal" column row-by-row based on ONLY printed days to avoid "leaks"
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
        // Comm keys
        commKeys.forEach(k => {
          const u = parseFloat(d[`${k}Used`] || 0);
          runningBal[k] = (parseFloat(runningBal[k]) || 0) - u;
          row.push(u.toFixed(3), parseFloat(runningBal[k]).toFixed(3));
        });
        // Money keys
        moneyKeys.forEach(k => {
          const u = parseFloat(d[`${k}Used`] || 0);
          runningBal[k] = (parseFloat(runningBal[k]) || 0) - u;
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
    <div className="min-h-screen bg-slate-50 pb-24 font-sans">
      <Header riceBal={computedDays[computedDays.length-1]?.riceRemaining || 0} dhallBal={computedDays[computedDays.length-1]?.dhallRemaining || 0} />
      <main className="max-w-md mx-auto p-4 space-y-4">
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
          <button onClick={() => setView('daily')} className={`flex-1 py-2 rounded-lg font-bold transition-all ${view === 'daily' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'}`}>Daily</button>
          <button onClick={() => setView('monthly')} className={`flex-1 py-2 rounded-lg font-bold transition-all ${view === 'monthly' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'}`}>Monthly</button>
        </div>
        <ControlPanel activeItems={activeItems} setActiveItems={setActiveItems} stocks={stocks} newStockAdded={newStockAdded} updateStock={updateStock} updateArrivalStock={updateArrivalStock} generatePDF={generatePDF} view={view} />
        {view === 'daily' ? (
          <>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <button onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}><ChevronLeft/></button>
                <h2 className="font-bold">{format(currentMonth, 'MMMM yyyy')}</h2>
                <button onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}><ChevronRight/></button>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {daysInMonth.map(d => {
                  const isSel = selectedDates.some(s => isSameDay(s, d));
                  const isSun = getDay(d) === 0;
                  return (
                    <button key={d.toString()} disabled={isSun} onClick={() => isSel ? setSelectedDates(selectedDates.filter(s => !isSameDay(s, d))) : selectedDates.length < 5 && setSelectedDates([...selectedDates, d])} 
                      className={`aspect-square rounded-lg text-sm font-bold ${isSun ? 'text-slate-100' : isSel ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-700 hover:bg-blue-50'}`}>{format(d, 'd')}</button>
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
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1 mb-2">
               <h3 className="text-[10px] font-black text-slate-400 uppercase">Monthly Ledger</h3>
               <button onClick={resetMonthData} className="text-red-500 flex items-center gap-1 text-[10px] font-bold"><RotateCcw size={12}/> Reset</button>
            </div>
            {computedDays.filter(day => getDay(new Date(day.date)) !== 0).map(day => (
              <div key={day.date} className="bg-white p-3 rounded-xl border border-slate-100 flex items-center gap-3">
                <div className="min-w-[50px] text-center border-r pr-2"><p className="text-[10px] font-bold text-slate-400 uppercase">{format(new Date(day.date), 'EEE')}</p><p className="text-lg font-black text-slate-700">{format(new Date(day.date), 'dd')}</p></div>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <input type="number" value={day.pStr || ''} onChange={(e) => updateDay(day.date, 'pStr', e.target.value)} className="w-full bg-slate-50 border rounded-lg p-2 text-center font-bold text-sm" placeholder="P" />
                  <input type="number" value={day.mStr || ''} onChange={(e) => updateDay(day.date, 'mStr', e.target.value)} className="w-full bg-slate-50 border rounded-lg p-2 text-center font-bold text-sm" placeholder="M" />
                </div>
                {activeItems.dhall && <button onClick={() => updateDay(day.date, 'dhallActive', !day.dhallActive)} className={`p-2 rounded-lg border ${day.dhallActive ? 'bg-amber-500 text-white' : 'bg-slate-50 text-slate-300'}`}><FileText size={18}/></button>}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}