<div align="center">
  <h1>⚡ SupplyFlow</h1>
  <p>A professional trading journal built for Supply & Demand traders.</p>
  <p>
    <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" />
    <img src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite" />
    <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript" />
    <img src="https://img.shields.io/badge/Tailwind-4-38BDF8?logo=tailwindcss" />
  </p>
</div>

---

## Features

- 📒 **Trade Journal** — Log and review every trade with full S&D context
- 📊 **Analytics** — Win rate, R:R analysis, P&L tracking
- 🗓️ **Trading Calendar** — Visual day-by-day performance heatmap
- 🧱 **S&D Framework** — Built-in Supply & Demand methodology reference
- 🛡️ **Discipline Tracker** — Monitor rule-following and mindset
- 📝 **Periodic Reviews** — Weekly/monthly structured review prompts
- 💾 **Data Backup** — Export/import JSON backups and CSV exports

---

## Running Locally

**Prerequisites:** Node.js 18+

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/supplyflow.git
   cd supplyflow
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local and add your GEMINI_API_KEY
   ```

4. **Start the dev server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

---

## Deploying to Vercel

### Option A — One-click via Vercel Dashboard (Recommended)

1. Push your code to GitHub (see below)
2. Go to [vercel.com/new](https://vercel.com/new)
3. Click **"Import Git Repository"** → select your `supplyflow` repo
4. Vercel auto-detects **Vite** — no config changes needed
5. Add environment variable:
   - `GEMINI_API_KEY` → your Gemini API key
6. Click **Deploy** 🚀

Your app will be live at `https://supplyflow-xxx.vercel.app` within ~1 minute.

### Push Code to GitHub (first time)

```bash
git init
git add .
git commit -m "Initial commit: SupplyFlow trading journal"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/supplyflow.git
git push -u origin main
```

After that, every push to `main` will **automatically re-deploy** on Vercel.

### Adding Environment Variables on Vercel

1. Go to your project on [vercel.com](https://vercel.com)
2. **Settings → Environment Variables**
3. Add `GEMINI_API_KEY` with your key value
4. Select environments: ✅ Production ✅ Preview ✅ Development
5. Click **Save** — Vercel will redeploy automatically

---

## Project Structure

```
supplyflow/
├── src/
│   ├── App.tsx                 # Root component & navigation
│   ├── types.ts                # TypeScript types
│   ├── components/             # UI components by view
│   │   ├── Dashboard/
│   │   ├── Trades/
│   │   ├── Analytics/
│   │   ├── Calendar/
│   │   ├── Discipline/
│   │   ├── Methodology/
│   │   ├── Reviews/
│   │   ├── Settings/
│   │   ├── TradeDetail/
│   │   └── TradeEntry/
│   ├── services/
│   │   └── tradeRepository.ts  # localStorage data layer
│   └── data/
│       └── demoTrades.ts       # Sample trades for first launch
├── public/
├── vercel.json                 # Vercel SPA routing config
├── vite.config.ts
└── .env.example
```

---

## Data Storage

> **Note:** All data is stored in your browser's `localStorage`. This means data is:
> - ✅ Persists across browser sessions
> - ❌ Not synced across devices or browsers
> - ❌ Lost if you clear browser storage

Use **Settings → Export Backup** to download a JSON backup of all your trades regularly.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | TypeScript type check |
