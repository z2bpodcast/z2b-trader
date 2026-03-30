// ═══════════════════════════════════════════════════════════
// Z2B FOREX SCANNER — VERCEL CRON JOB
// Runs every 15 minutes during London + NY sessions only
// London: 08:00–17:00 UTC | New York: 13:00–22:00 UTC
// ═══════════════════════════════════════════════════════════

// Standard Vercel serverless function

// ── SESSION CHECK ─────────────────────────────
function isActiveTradingSession() {
  const utcHour = new Date().getUTCHours();
  const london  = utcHour >= 8  && utcHour < 17;  // 10AM–7PM SAST
  const newYork = utcHour >= 13 && utcHour < 22;  // 3PM–12AM SAST
  return london || newYork;
}

function getCurrentSession() {
  const h = new Date().getUTCHours();
  if (h >= 8  && h < 13)  return 'LONDON';
  if (h >= 13 && h < 17)  return 'LONDON + NEW YORK';
  if (h >= 17 && h < 22)  return 'NEW YORK';
  return 'OFF-HOURS';
}

// ── INDICATOR CALCULATIONS ────────────────────
function calcEMA(closes, period) {
  if (closes.length < period) return closes[closes.length - 1];
  const k = 2 / (period + 1);
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
  }
  return ema;
}

function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  return 100 - (100 / (1 + avgGain / avgLoss));
}

function calcMACD(closes) {
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  const macdLine = ema12 - ema26;
  const series = [];
  for (let i = 26; i <= closes.length; i++) {
    series.push(calcEMA(closes.slice(0, i), 12) - calcEMA(closes.slice(0, i), 26));
  }
  const signalLine = calcEMA(series, 9);
  const hist = macdLine - signalLine;
  const prevSig = series.length > 1 ? calcEMA(series.slice(0, -1), 9) : signalLine;
  const prevHist = (series[series.length - 2] || macdLine) - prevSig;
  return { macdLine, signalLine, hist, rising: hist > prevHist };
}

function calcADX(highs, lows, closes, period = 14) {
  if (closes.length < period + 2) return 20;
  let tr = 0, dp = 0, dm = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    tr += Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i-1]), Math.abs(lows[i] - closes[i-1]));
    dp += Math.max(highs[i] - highs[i-1], 0);
    dm += Math.max(lows[i-1] - lows[i], 0);
  }
  if (tr === 0) return 20;
  const diP = (dp / tr) * 100;
  const diM = (dm / tr) * 100;
  const diSum = diP + diM;
  return diSum === 0 ? 20 : Math.min(100, (Math.abs(diP - diM) / diSum) * 100 * 1.5 + 10);
}

function calcATR(highs, lows, closes, period = 14) {
  if (closes.length < period + 1) return 0.001;
  let s = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    s += Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i-1]), Math.abs(lows[i] - closes[i-1]));
  }
  return s / period;
}

// ── 6-GATE FORMULA (same as frontend) ─────────
function applyGates(candles) {
  const closes = candles.map(c => c.close);
  const highs  = candles.map(c => c.high);
  const lows   = candles.map(c => c.low);
  const price  = closes[closes.length - 1];

  const EMA9   = calcEMA(closes, 9);
  const EMA21  = calcEMA(closes, 21);
  const EMA50  = calcEMA(closes, 50);
  const EMA200 = calcEMA(closes, 200);
  const RSI14  = calcRSI(closes);
  const MACD   = calcMACD(closes);
  const ADX14  = calcADX(highs, lows, closes);

  // Gate evaluations
  const bGates = [
    price > EMA200,                              // G1: Trend
    EMA9 > EMA21 && EMA21 > EMA50,              // G2: EMA Stack
    MACD.macdLine > MACD.signalLine && MACD.rising, // G3: MACD
    RSI14 >= 45 && RSI14 <= 65,                 // G4: RSI Zone
    ADX14 >= 20,                                 // G5: ADX
    true                                         // G6: Session (checked before calling)
  ];

  const sGates = [
    price < EMA200,
    EMA9 < EMA21 && EMA21 < EMA50,
    MACD.macdLine < MACD.signalLine && !MACD.rising,
    RSI14 >= 35 && RSI14 <= 55,
    ADX14 >= 20,
    true
  ];

  const bPass = bGates.filter(Boolean).length;
  const sPass = sGates.filter(Boolean).length;

  if (bPass === 6) return { signal: 'BUY',  gates: 6, price, rsi: RSI14, adx: ADX14 };
  if (sPass === 6) return { signal: 'SELL', gates: 6, price, rsi: RSI14, adx: ADX14 };
  return { signal: null, gates: Math.max(bPass, sPass), price };
}

// ── FETCH OHLCV FROM TWELVE DATA ──────────────
async function fetchCandles(pair, tf, apiKey) {
  const intervalMap = { M15: '15min', H1: '1h' };
  const interval = intervalMap[tf];
  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(pair)}&interval=${interval}&outputsize=210&apikey=${apiKey}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    const data = await res.json();
    if (data.status === 'error' || !data.values || data.values.length < 50) return null;
    return data.values.reverse().map(c => ({
      open:  parseFloat(c.open),
      high:  parseFloat(c.high),
      low:   parseFloat(c.low),
      close: parseFloat(c.close),
    }));
  } catch (e) {
    return null;
  }
}

// ── SEND WEB PUSH NOTIFICATION ────────────────
async function sendPushNotification(subscription, payload) {
  // Web Push using VAPID
  const vapidPublicKey  = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidEmail      = process.env.VAPID_EMAIL || 'mailto:rev@z2blegacybuilders.co.za';

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.log('VAPID keys not configured');
    return false;
  }

  try {
    // Use the web-push compatible endpoint directly
    const pushUrl = subscription.endpoint;
    const body = JSON.stringify(payload);

    const response = await fetch(pushUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'TTL': '86400',
      },
      body,
    });

    return response.ok;
  } catch (e) {
    console.error('Push failed:', e);
    return false;
  }
}

// ── MAIN CRON HANDLER ─────────────────────────
module.exports = async function handler(req, res) {

  // Allow calls from cron-job.org and Vercel
  // Basic rate protection - check user agent or just allow all GET requests

  // Gate 6: Only run during London or New York session
  if (!isActiveTradingSession()) {
    const utcHour = new Date().getUTCHours();
    return new Response(JSON.stringify({
      status: 'skipped',
      reason: 'Outside trading sessions',
      utcHour,
      nextActive: utcHour < 8 ? '08:00 UTC (London)' : '13:00 UTC (NY)',
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const session = getCurrentSession();
  const apiKey  = process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ status: 'error', reason: 'No API key configured' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const PAIRS = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD'];
  const TFS   = ['M15', 'H1'];
  const RR    = { M15: 2, H1: 3 };
  const signals = [];

  // Scan all pairs and timeframes
  for (const pair of PAIRS) {
    for (const tf of TFS) {
      const candles = await fetchCandles(pair, tf, apiKey);
      if (!candles) continue;

      const result = applyGates(candles);
      if (result.signal) {
        const rrRatio = RR[tf];
        signals.push({
          pair,
          tf,
          signal: result.signal,
          price: result.price,
          rsi: result.rsi?.toFixed(1),
          adx: result.adx?.toFixed(1),
          rrRatio,
          session,
        });
      }

      // Rate limit protection — 420ms between calls
      await new Promise(r => setTimeout(r, 420));
    }
  }

  // If signals found — send push notifications
  if (signals.length > 0) {
    // Get stored push subscriptions from KV store
    const subscriptionsRaw = process.env.PUSH_SUBSCRIPTIONS;
    let subscriptions = [];
    try {
      subscriptions = subscriptionsRaw ? JSON.parse(subscriptionsRaw) : [];
    } catch (e) {
      console.log('No subscriptions stored');
    }

    for (const signal of signals) {
      const pushPayload = {
        title: `🔔 Z2B SIGNAL: ${signal.signal} ${signal.pair}`,
        body: `${signal.tf} · All 6 gates passed · RR 1:${signal.rrRatio} · ${signal.session} session · Price: ${signal.price}`,
        url: 'https://z2b-trader.vercel.app',
        signal: signal.signal,
        pair: signal.pair,
        tf: signal.tf,
      };

      for (const sub of subscriptions) {
        await sendPushNotification(sub, pushPayload);
      }
    }
  }

  return res.status(200).json({ status: 'ok', session, scanned: PAIRS.length * TFS.length, signalsFound: signals.length, signals, timestamp: new Date().toISOString() });
}
