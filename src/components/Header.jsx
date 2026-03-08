import React from 'react';
import { LayoutDashboard } from 'lucide-react';

export default function Header({ balance }) {
  return (
    <header className="sticky top-0 z-20 bg-blue-700 text-white p-4 shadow-lg flex justify-between items-end rounded-b-2xl">
      <div className="flex items-center gap-3">
        <div className="bg-white/20 p-2 rounded-lg">
          <LayoutDashboard size={24} />
        </div>
        <div>
          <h1 className="text-lg font-bold leading-none">Smart Ledger</h1>
          <p className="text-[10px] opacity-70 tracking-tight">MDM Inventory System</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-[10px] uppercase opacity-70 font-bold">Closing Stock</p>
        <p className="text-2xl font-black leading-none">{balance}<span className="text-sm ml-1 font-normal opacity-80">kg</span></p>
      </div>
    </header>
  );
}