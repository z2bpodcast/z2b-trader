// Z2B Forex Scanner — Cron Job Handler
// Called every 15 min by cron-job.org during London + NY sessions

module.exports = async function handler(req, res) {

  // Session check — London 08-17 UTC, NY 13-22 UTC
  const h = new Date().getUTCHours();
  const isSession = (h >= 8 && h < 17) || (h >= 13 && h < 22);
  const isWeekday = [1,2,3,4,5].includes(new Date().getUTCDay());

  if (!isSession || !isWeekday) {
    return res.status(200).json({ status: 'skipped', utcHour: h });
  }

  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) return res.status(200).json({ status: 'no_key' });

  const PAIRS = ['EUR/USD','GBP/USD','USD/JPY','AUD/USD'];
  const TFS   = ['15min','1h'];
  const signals = [];

  for (const pair of PAIRS) {
    for (const tf of TFS) {
      try {
        const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(pair)}&interval=${tf}&outputsize=210&apikey=${apiKey}`;
        const r = await fetch(url);
        const d = await r.json();

        if (!d.values || d.values.length < 50) continue;

        const candles = d.values.reverse();
        const closes  = candles.map(c => parseFloat(c.close));
        const highs   = candles.map(c => parseFloat(c.high));
        const lows    = candles.map(c => parseFloat(c.low));

        // EMA helper
        const ema = (arr, p) => {
          const k = 2/(p+1);
          let e = arr.slice(0,p).reduce((a,b)=>a+b,0)/p;
          for(let i=p;i<arr.length;i++) e=arr[i]*k+e*(1-k);
          return e;
        };

        // RSI
        let g=0,l=0;
        for(let i=closes.length-14;i<closes.length;i++){
          const d2=closes[i]-closes[i-1];
          if(d2>0)g+=d2;else l+=Math.abs(d2);
        }
        const rsi = l===0?100:100-(100/(1+(g/14)/(l/14)));

        // EMAs
        const e9=ema(closes,9),e21=ema(closes,21),e50=ema(closes,50),e200=ema(closes,200);

        // MACD
        const macdArr=[];
        for(let i=26;i<=closes.length;i++) macdArr.push(ema(closes.slice(0,i),12)-ema(closes.slice(0,i),26));
        const macdLine=macdArr[macdArr.length-1];
        const sigLine=ema(macdArr,9);
        const hist=macdLine-sigLine;
        const prevSig=ema(macdArr.slice(0,-1),9);
        const histRising=hist>(macdArr[macdArr.length-2]-prevSig);

        // ADX
        let tr=0,dp=0,dm=0;
        for(let i=closes.length-14;i<closes.length;i++){
          tr+=Math.max(highs[i]-lows[i],Math.abs(highs[i]-closes[i-1]),Math.abs(lows[i]-closes[i-1]));
          dp+=Math.max(highs[i]-highs[i-1],0);
          dm+=Math.max(lows[i-1]-lows[i],0);
        }
        const adx=tr===0?20:Math.min(100,(Math.abs((dp/tr)-(dm/tr))/((dp/tr)+(dm/tr)))*100*1.5+10);

        const price = closes[closes.length-1];

        // 6 Gates
        const buy  = price>e200 && e9>e21&&e21>e50 && macdLine>sigLine&&histRising && rsi>=45&&rsi<=65 && adx>=20;
        const sell = price<e200 && e9<e21&&e21<e50 && macdLine<sigLine&&!histRising && rsi>=35&&rsi<=55 && adx>=20;

        if (buy || sell) {
          signals.push({ pair, tf, signal: buy?'BUY':'SELL', price: price.toFixed(5) });
        }

        await new Promise(r=>setTimeout(r,420));
      } catch(e) { continue; }
    }
  }

  // Return MINIMAL response to avoid cron-job.org size limit
  return res.status(200).json({
    ok: true,
    h,
    found: signals.length,
    // Only return signal summaries not full data
    s: signals.map(s=>`${s.signal} ${s.pair} ${s.tf}`)
  });
};
