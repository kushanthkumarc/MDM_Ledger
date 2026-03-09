export const ITEM_RATES = {
  rice: { primary: 0.100, middle: 0.150 }, 
  dhall: { rate: 0.015 },                 
  oil: { rate: 0.003 },                   
  salt: { rate: 0.0019 },                 
  veg: { primary: 1.48, middle: 2.48 }, 
  wood: { rate: 1.25 },                   
  maligai: { rate: 0.45 }                 
};

export const calculateInventory = (daysData, stocks) => {
  let bal = {
    r: parseFloat(stocks.rice) || 0, 
    d: parseFloat(stocks.dhall) || 0,
    o: parseFloat(stocks.oil) || 0, 
    s: parseFloat(stocks.salt) || 0,
    v: parseFloat(stocks.veg) || 0, 
    w: parseFloat(stocks.wood) || 0,
    m: parseFloat(stocks.maligai) || 0
  };

  return daysData.map((day) => {
    const p = parseFloat(day.pStr) || 0;
    const m = parseFloat(day.mStr) || 0;
    const total = p + m;

    // Default usage to 0
    let rU = 0, dU = 0, oU = 0, sU = 0, vU = 0, wU = 0, mU = 0;

    // Only perform subtraction if students were present (Total > 0)
    if (total > 0) {
      rU = (p * ITEM_RATES.rice.primary) + (m * ITEM_RATES.rice.middle);
      dU = day.dhallActive ? (total * ITEM_RATES.dhall.rate) : 0;
      oU = total * ITEM_RATES.oil.rate;
      sU = total * ITEM_RATES.salt.rate;
      vU = (p * ITEM_RATES.veg.primary) + (m * ITEM_RATES.veg.middle);
      wU = total * ITEM_RATES.wood.rate;
      mU = total * ITEM_RATES.maligai.rate;
      
      // Update the running balance
      bal.r -= rU; bal.d -= dU; bal.o -= oU; bal.s -= sU;
      bal.v -= vU; bal.w -= wU; bal.m -= mU;
    }

    return {
      ...day,
      totalStudents: total,
      riceUsed: rU.toFixed(3), riceRemaining: bal.r.toFixed(3),
      dhallUsed: dU.toFixed(3), dhallRemaining: bal.d.toFixed(3),
      oilUsed: oU.toFixed(3), oilRemaining: bal.o.toFixed(3),
      saltUsed: sU.toFixed(3), saltRemaining: bal.s.toFixed(3),
      vegUsed: vU.toFixed(2), vegRemaining: bal.v.toFixed(3),
      woodUsed: wU.toFixed(2), woodRemaining: bal.w.toFixed(3),
      maligaiUsed: mU.toFixed(2), maligaiRemaining: bal.m.toFixed(3)
    };
  });
};