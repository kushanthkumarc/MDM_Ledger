import React, { useState, useEffect } from 'react';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  getDay, isSameDay, addMonths, subMonths, isToday
} from 'date-fns';
import { Calendar, FileText, ChevronLeft, ChevronRight, Download, X, RotateCcw } from 'lucide-react';
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
          <input type="checkbox" checked={activeItems[item]} onChange={() => setActiveItems(p => ({...p, [item]: !p[item]}))} className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500" />
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
  }).filter(d => getDay(d) !== 0);

  const daysData = daysInMonth.map(d => {
    const dateStr = format(d, 'yyyy-MM-dd');
    return { date: dateStr, display: format(d, 'MMM dd, EEE'), pStr: allData[dateStr]?.pStr || 0, mStr: allData[dateStr]?.mStr || 0 };
  });

  const computedDays = calculateInventory(daysData, stocks.rice, stocks.dhall);

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
      let daysToPrint = [];
      let periodOpening = { rice: stocks.rice, dhall: stocks.dhall };
      let title = "";

      if (view === 'daily' && selectedDates.length > 0) {
        const sortedSelected = [...selectedDates].sort((a,b) => a - b);
        const selectedStrings = sortedSelected.map(d => format(d, 'yyyy-MM-dd'));
        daysToPrint = computedDays.filter(d => selectedStrings.includes(d.date));
        
        const firstDayIdx = computedDays.findIndex(d => d.date === daysToPrint[0].date);
        if (firstDayIdx > 0) {
          periodOpening.rice = computedDays[firstDayIdx - 1].riceRemaining;
          periodOpening.dhall = computedDays[firstDayIdx - 1].dhallRemaining;
        }
        title = `MDM Entry: ${format(sortedSelected[0], 'dd MMM')} - ${format(sortedSelected[sortedSelected.length-1], 'dd MMM')}`;
      } else {
        daysToPrint = computedDays;
        title = `MDM Monthly Ledger: ${format(currentMonth, 'MMMM yyyy')}`;
      }

      const doc = new jsPDF(activeItems.rice && activeItems.dhall ? 'l' : 'p');
      doc.setFontSize(16);
      doc.setTextColor(30, 64, 175);
      doc.text(title, 14, 15);

      const summaryBody = [];
      if (activeItems.rice) summaryBody.push(['RICE', periodOpening.rice, daysToPrint[daysToPrint.length-1].riceRemaining]);
      if (activeItems.dhall) summaryBody.push(['DHALL', periodOpening.dhall, daysToPrint[daysToPrint.length-1].dhallRemaining]);

      autoTable(doc, {
        startY: 22,
        head: [['Item', 'Opening (kg)', 'Closing (kg)']],
        body: summaryBody,
        theme: 'grid',
        margin: { right: 80 }
      });

      const head = ["Date", "P", "M", "Total"];
      if (activeItems.rice) head.push("Rice Used", "Rice Bal");
      if (activeItems.dhall) head.push("Dhall Used", "Dhall Bal");

      const body = daysToPrint.map(d => {
        const row = [d.display, d.pStr, d.mStr, d.totalStudents];
        if (activeItems.rice) row.push(d.riceUsed, d.riceRemaining);
        if (activeItems.dhall) row.push(d.dhallUsed, d.dhallRemaining);
        return row;
      });

      autoTable(doc, { head: [head], body, startY: doc.lastAutoTable.finalY + 10, theme: 'grid' });
      doc.save(`MDM_Report_${format(new Date(), 'dd_MMM_yy')}.pdf`);
    } catch (e) { alert("Error generating PDF"); }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans">
      <Header riceBal={computedDays[computedDays.length-1]?.riceRemaining || 0} dhallBal={computedDays[computedDays.length-1]?.dhallRemaining || 0} />
      
      <main className="max-w-md mx-auto p-4 space-y-4">
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
          <button onClick={() => setView('daily')} className={`flex-1 py-2 rounded-lg font-bold ${view === 'daily' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'}`}>Daily</button>
          <button onClick={() => setView('monthly')} className={`flex-1 py-2 rounded-lg font-bold ${view === 'monthly' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'}`}>Monthly</button>
        </div>

        <ControlPanel activeItems={activeItems} setActiveItems={setActiveItems} stocks={stocks} updateStock={updateStock} generatePDF={generatePDF} />

        {view === 'daily' ? (
          <>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <button onClick={() => setCurrentMonth(prev => subMonths(prev, 1))} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronLeft/></button>
                <div className="text-center">
                   <h2 className="font-bold text-slate-800 leading-none">{format(currentMonth, 'MMMM yyyy')}</h2>
                </div>
                <button onClick={() => setCurrentMonth(prev => addMonths(prev, 1))} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronRight/></button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                  <div key={idx} className="text-center text-[10px] font-black text-slate-300 uppercase">{day}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {/* Fixed Alignment Spacers */}
                {Array.from({ length: (getDay(startOfMonth(currentMonth)) + 6) % 7 }).map((_, i) => (
                  <div key={`spacer-${i}`} className="aspect-square" />
                ))}

                {eachDayOfInterval({start: startOfMonth(currentMonth), end: endOfMonth(currentMonth)}).map(d => {
                  const isSel = selectedDates.some(s => isSameDay(s, d));
                  const isSun = getDay(d) === 0;
                  const isTodayDate = isToday(d);

                  return (
                    <button 
                      key={d.toString()} 
                      disabled={isSun} 
                      onClick={() => isSel ? setSelectedDates(selectedDates.filter(s => !isSameDay(s, d))) : selectedDates.length < 5 && setSelectedDates([...selectedDates, d])} 
                      className={`aspect-square rounded-lg text-sm font-bold transition-all relative 
                        ${isSun ? 'text-slate-100 cursor-not-allowed' : isSel ? 'bg-blue-600 text-white shadow-lg' : isTodayDate ? 'border-2 border-blue-200 text-blue-700' : 'text-slate-700 hover:bg-blue-50'}`}
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
            {computedDays.map(day => (
              <div key={day.date} className="bg-white p-3 rounded-xl border border-slate-100 flex items-center gap-3">
                <div className="min-w-[55px] text-center border-r pr-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">{format(new Date(day.date), 'EEE')}</p>
                  <p className="text-lg font-black text-slate-700 leading-tight">{format(new Date(day.date), 'dd')}</p>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <input type="number" placeholder="P" value={day.pStr || ''} onChange={(e) => updateDay(day.date, 'pStr', e.target.value)} className="w-full bg-slate-50 border rounded-lg p-2 text-center font-bold text-sm outline-none" />
                  <input type="number" placeholder="M" value={day.mStr || ''} onChange={(e) => updateDay(day.date, 'mStr', e.target.value)} className="w-full bg-slate-50 border rounded-lg p-2 text-center font-bold text-sm outline-none" />
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