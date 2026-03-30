// Z2B Forex Scanner — Minimal Cron Handler
// Tiny response to stay within cron-job.org free plan limits

module.exports = async function handler(req, res) {

  // Session check — London 08-17 UTC, New York 13-22 UTC
  const h = new Date().getUTCHours();
  const d = new Date().getUTCDay();
  const london  = h >= 8  && h < 17;
  const newYork = h >= 13 && h < 22;
  const weekday = d >= 1  && d <= 5;

  // Outside session or weekend — skip silently
  if (!weekday || (!london && !newYork)) {
    return res.status(200).send('ok:skip');
  }

  const key = process.env.TWELVE_DATA_API_KEY;
  if (!key) return res.status(200).send('ok:nokey');

  const PAIRS = ['EUR/USD','GBP/USD','USD/JPY','AUD/USD'];
  const TFS   = ['15min','1h'];
  const found = [];

  for (const pair of PAIRS) {
    for (const tf of TFS) {
      try {
        const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(pair)}&interval=${tf}&outputsize=210&apikey=${key}`;
        const r = await fetch(url);
        const d2 = await r.json();
        if (!d2.values || d2.values.length < 50) continue;

        const c  = d2.values.reverse().map(x => parseFloat(x.close));
        const h2 = d2.values.map(x => parseFloat(x.high));
        const l  = d2.values.map(x => parseFloat(x.low));

        // EMA helper
        const ema = (a, p) => {
          const k = 2/(p+1);
          let e = a.slice(0,p).reduce((s,v)=>s+v,0)/p;
          for(let i=p;i<a.length;i++) e=a[i]*k+e*(1-k);
          return e;
        };

        const e9=ema(c,9),e21=ema(c,21),e50=ema(c,50),e200=ema(c,200);

        // RSI
        let g=0,ls=0;
        for(let i=c.length-14;i<c.length;i++){
          const diff=c[i]-c[i-1];
          if(diff>0)g+=diff; else ls+=Math.abs(diff);
        }
        const rsi=ls===0?100:100-(100/(1+(g/14)/(ls/14)));

        // MACD
        const ma=[];
        for(let i=26;i<=c.length;i++) ma.push(ema(c.slice(0,i),12)-ema(c.slice(0,i),26));
        const ml=ma[ma.length-1], sl2=ema(ma,9);
        const prevH=ma[ma.length-2]-(ma.length>1?ema(ma.slice(0,-1),9):sl2);
        const rising=(ml-sl2)>prevH;

        // ADX
        let tr=0,dp=0,dm=0;
        for(let i=c.length-14;i<c.length;i++){
          tr+=Math.max(h2[i]-l[i],Math.abs(h2[i]-c[i-1]),Math.abs(l[i]-c[i-1]));
          dp+=Math.max(h2[i]-h2[i-1],0);
          dm+=Math.max(l[i-1]-l[i],0);
        }
        const adx=tr===0?20:Math.min(100,(Math.abs(dp/tr-dm/tr)/((dp/tr+dm/tr)||1))*150+10);

        const p=c[c.length-1];
        const buy =p>e200&&e9>e21&&e21>e50&&ml>sl2&&rising&&rsi>=45&&rsi<=65&&adx>=20;
        const sell=p<e200&&e9<e21&&e21<e50&&ml<sl2&&!rising&&rsi>=35&&rsi<=55&&adx>=20;

        if(buy||sell) found.push(`${buy?'BUY':'SELL'} ${pair} ${tf}`);

        await new Promise(r=>setTimeout(r,450));
      } catch(e){ continue; }
    }
  }

  // Ultra minimal response — plain text only
  return res.status(200).send('ok:' + found.length + (found.length ? ':' + found.join('|') : ''));
};
