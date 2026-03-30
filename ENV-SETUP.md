# Z2B TRADER — VERCEL ENVIRONMENT VARIABLES SETUP
# Add these in Vercel → Your Project → Settings → Environment Variables

# ── REQUIRED VARIABLES ───────────────────────────────────────────────

# 1. Your Twelve Data API Key (the one you already have)
TWELVE_DATA_API_KEY=your_twelve_data_key_here

# 2. Cron job security secret (make up any random string)
CRON_SECRET=z2b_cron_secret_2024_rev

# 3. VAPID Keys for Web Push (generate once, never change)
# Generate at: https://web-push-codelab.glitch.me
# Or run: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=your_vapid_public_key_here
VAPID_PRIVATE_KEY=your_vapid_private_key_here
VAPID_EMAIL=mailto:rev@z2blegacybuilders.co.za

# ── HOW TO ADD IN VERCEL ─────────────────────────────────────────────
# 1. Go to vercel.com → z2b-trader project
# 2. Click Settings tab
# 3. Click Environment Variables in left menu
# 4. Add each variable above one by one
# 5. Set Environment to: Production, Preview, Development (all three)
# 6. Click Save
# 7. Redeploy the project

# ── GENERATE VAPID KEYS (one time only) ─────────────────────────────
# Option A - Online: https://web-push-codelab.glitch.me
#   Click "Refresh" button - copy the two keys shown
#
# Option B - Terminal:
#   npm install -g web-push
#   web-push generate-vapid-keys
#   Copy the Public Key and Private Key

# ── CRON SCHEDULE EXPLAINED ──────────────────────────────────────────
# "*/15 8-21 * * 1-5"
#  Every 15 minutes
#  Between hours 8 and 21 UTC (10AM - 11PM SAST)
#  Every day of the month
#  Every month
#  Monday to Friday only (1=Mon, 5=Fri)
#
# This covers:
#  London:        08:00 - 17:00 UTC (10AM - 7PM SAST)
#  New York:      13:00 - 22:00 UTC (3PM - 12AM SAST)
#  The cron runs until 21:00 UTC to cover most of NY session
#
# The scan-cron.js does a second check inside and skips
# if neither London nor NY is actually active at that minute

# ── API CALL BUDGET ──────────────────────────────────────────────────
# Free Twelve Data plan: 800 calls per day
# Each scan: 4 pairs × 2 timeframes = 8 calls
# Cron runs every 15 min for 13 hours = 52 runs per day
# Total calls: 52 × 8 = 416 calls per day
# Remaining: 384 calls for manual scans from the app
# WELL WITHIN the free 800/day limit ✅
