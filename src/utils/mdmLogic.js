import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';

export const ITEM_RATES = {
  rice: { primary: 0.100, middle: 0.150 },
  dhall: { rate: 0.015 } 
};

export const calculateInventory = (daysData, openingRice, openingDhall) => {
  let rBal = parseFloat(openingRice) || 0;
  let dBal = parseFloat(openingDhall) || 0;

  return daysData.map(day => {
    const p = parseFloat(day.pStr) || 0;
    const m = parseFloat(day.mStr) || 0;
    const total = p + m;

    const rUsed = (p * ITEM_RATES.rice.primary) + (m * ITEM_RATES.rice.middle);
    const dUsed = total * ITEM_RATES.dhall.rate;
    
    rBal -= rUsed;
    dBal -= dUsed;

    return {
      ...day,
      totalStudents: total,
      riceUsed: rUsed.toFixed(3),
      riceRemaining: rBal.toFixed(3),
      dhallUsed: dUsed.toFixed(3),
      dhallRemaining: dBal.toFixed(3)
    };
  });
};