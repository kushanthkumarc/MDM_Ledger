import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Download, X, RotateCcw, FileText, IndianRupee } from 'lucide-react';
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
          <p className="text-[8px] font-black text-slate-400 uppercase text-center">{item}</p>
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

  useEffect(() => {
    const monthKey = format(currentMonth, 'yyyy-MM');
    const saved = JSON.parse(localStorage.getItem(`mdm_master`)) || {};
    setAllData(saved);
    const newStocks = {};
    Object.keys(activeItems).forEach(key => { newStocks[key] = localStorage.getItem(`${key}_Stock_${monthKey}`) || 0; });
    setStocks(newStocks);
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

  const resetMonthData = () => {
    if (window.confirm(`Clear all data for ${format(currentMonth, 'MMMM')}?`)) {
      const newData = { ...allData };
      daysInMonth.forEach(d => delete newData[format(d, 'yyyy-MM-dd')]);
      setAllData(newData);
      localStorage.setItem(`mdm_master`, JSON.stringify(newData));
    }
  };

const generatePDF = () => {
  try {
    let daysToPrint = [];
    let periodOpening = { ...stocks };
    
    if (view === 'daily' && selectedDates.length > 0) {
      const sorted = [...selectedDates].sort((a, b) => a - b);
      daysToPrint = computedDays.filter(d => sorted.some(s => isSameDay(new Date(d.date), s)));
      const firstIdx = computedDays.findIndex(d => d.date === daysToPrint[0].date);
      if (firstIdx > 0) {
        const p = computedDays[firstIdx-1];
        periodOpening = { rice: p.riceRemaining, dhall: p.dhallRemaining, oil: p.oilRemaining, salt: p.saltRemaining, veg: p.vegRemaining, wood: p.woodRemaining, maligai: p.maligaiRemaining };
      }
    } else {
      daysToPrint = computedDays.filter(d => getDay(new Date(d.date)) !== 0);
    }

    const doc = new jsPDF('l');
    doc.setFontSize(14);
    doc.text(`MDM Master Ledger - ${format(currentMonth, 'MMMM yyyy')}`, 14, 12);

    // --- NEW SUMMARY TABLE (Opening & Closing) ---
    const summaryHead = [["Item Name", "Opening Balance", "Total Used", "Closing Balance"]];
    const summaryRows = [];
    Object.keys(activeItems).forEach(key => {
      if (activeItems[key]) {
        const totalUsed = daysToPrint.reduce((acc, d) => acc + parseFloat(d[`${key}Used`] || 0), 0);
        summaryRows.push([
          key.toUpperCase(), 
          periodOpening[key], 
          totalUsed.toFixed(3), 
          daysToPrint[daysToPrint.length - 1][`${key}Remaining`]
        ]);
      }
    });

    autoTable(doc, {
      startY: 18,
      head: summaryHead,
      body: summaryRows,
      theme: 'grid',
      styles: { fontSize: 7, halign: 'center' },
      headStyles: { fillColor: [71, 85, 105] },
      margin: { right: 140 } // Keeps it compact on the left
    });
    // ----------------------------------------------

    const commodityKeys = ["rice", "dhall", "oil", "salt"];
    const monetaryKeys = ["veg", "wood", "maligai"];

    const activeComms = commodityKeys.filter(k => activeItems[k]);
    const activeMoney = monetaryKeys.filter(k => activeItems[k]);

    const head1 = [
      { content: 'Date', rowSpan: 3, styles: { halign: 'center', valign: 'middle' } },
      { content: 'Student Attendance', colSpan: 3, styles: { halign: 'center', fillColor: [71, 85, 105] } }
    ];
    if (activeComms.length > 0) head1.push({ content: 'Commodity Inventory (KG / LTR / GM)', colSpan: activeComms.length * 2, styles: { halign: 'center', fillColor: [30, 64, 175] } });
    if (activeMoney.length > 0) head1.push({ content: 'Monetary Expenses (RUPEES)', colSpan: activeMoney.length * 2, styles: { halign: 'center', fillColor: [21, 128, 61] } });

    const head2 = ["P", "M", "Tot"];
    activeComms.forEach(k => head2.push({ content: k.toUpperCase(), colSpan: 2, styles: { halign: 'center' } }));
    activeMoney.forEach(k => head2.push({ content: k.toUpperCase(), colSpan: 2, styles: { halign: 'center' } }));

    const head3 = ["", "", ""]; 
    [...activeComms, ...activeMoney].forEach(() => head3.push("Used", "Bal"));

    const body = daysToPrint.map(d => {
      const row = [d.display, d.pStr, d.mStr, d.totalStudents];
      activeComms.forEach(k => row.push(d[`${k}Used`], d[`${k}Remaining`]));
      activeMoney.forEach(k => row.push(d[`${k}Used`], d[`${k}Remaining`]));
      return row;
    });

    autoTable(doc, {
      head: [head1, head2, head3],
      body: body,
      startY: doc.lastAutoTable.finalY + 10, // Starts after the summary table
      theme: 'grid',
      styles: { fontSize: 5.5, cellPadding: 0.8, halign: 'center', lineWidth: 0.1 },
      headStyles: { fontSize: 5, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 18 } }
    });

    doc.save(`MDM_Ledger_${format(new Date(), 'dd_MMM')}.pdf`);
  } catch (e) { console.error(e); alert("PDF Error"); }
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
              <div className="flex justify-between items-center mb-4">
                <button onClick={() => setCurrentMonth(prev => subMonths(prev, 1))} className="p-2 hover:bg-slate-100 rounded-full"><ChevronLeft/></button>
                <h2 className="font-bold text-slate-800">{format(currentMonth, 'MMMM yyyy')}</h2>
                <button onClick={() => setCurrentMonth(prev => addMonths(prev, 1))} className="p-2 hover:bg-slate-100 rounded-full"><ChevronRight/></button>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (<div key={idx} className="text-center text-[10px] font-black text-slate-300 uppercase">{day}</div>))}
                {Array.from({ length: (getDay(startOfMonth(currentMonth)) + 6) % 7 }).map((_, i) => (<div key={i} />))}
                {daysInMonth.map(d => {
                  const isSel = selectedDates.some(s => isSameDay(s, d));
                  const isSun = getDay(d) === 0;
                  return (
                    <button key={d.toString()} disabled={isSun} onClick={() => isSel ? setSelectedDates(selectedDates.filter(s => !isSameDay(s, d))) : selectedDates.length < 5 && setSelectedDates([...selectedDates, d])} 
                      className={`aspect-square rounded-lg text-sm font-bold relative ${isSun ? 'text-slate-100' : isSel ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-700 hover:bg-blue-50'}`}>
                      {format(d, 'd')}
                      {isSel && <div className="absolute top-0 right-0 w-2 h-2 bg-green-400 rounded-full border border-white"></div>}
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
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1 mb-2">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Monthly Ledger</h3>
               <button onClick={resetMonthData} className="text-red-500 flex items-center gap-1 text-[10px] font-bold uppercase"><RotateCcw size={12}/> Reset Month</button>
            </div>
            {computedDays.filter(day => getDay(new Date(day.date)) !== 0).map(day => (
              <div key={day.date} className="bg-white p-3 rounded-xl border border-slate-100 flex items-center gap-3">
                <div className="min-w-[50px] text-center border-r pr-2"><p className="text-[10px] font-bold text-slate-400 leading-none uppercase">{format(new Date(day.date), 'EEE')}</p><p className="text-lg font-black text-slate-700">{format(new Date(day.date), 'dd')}</p></div>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <input type="number" value={day.pStr || ''} onChange={(e) => updateDay(day.date, 'pStr', e.target.value)} className="w-full bg-slate-50 border rounded-lg p-2 text-center font-bold text-sm" placeholder="P" />
                  <input type="number" value={day.mStr || ''} onChange={(e) => updateDay(day.date, 'mStr', e.target.value)} className="w-full bg-slate-50 border rounded-lg p-2 text-center font-bold text-sm" placeholder="M" />
                </div>
                {activeItems.dhall && <button onClick={() => updateDay(day.date, 'dhallActive', !day.dhallActive)} className={`p-2 rounded-lg border transition-all ${day.dhallActive ? 'bg-amber-500 border-amber-600 text-white shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-300'}`}><FileText size={18}/></button>}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}