# SUPPLYFLOW Deployment Guide

This document outlines how to deploy SUPPLYFLOW in a production environment using a dual-hosting architecture.

## Architecture Overview

SUPPLYFLOW is split into two distinct parts:
1. **Frontend (Website):** React/Vite application. Deployed to Vercel.
2. **Backend (Live Monitoring Engine):** Node.js/TypeScript service. Deployed to an "Always-On" host (Render or Railway).

*Why?* The backend requires a 24/7 continuous WebSocket connection to Twelve Data. Serverless platforms like Vercel close connections after 10 seconds and cannot support this.

---

## 1. Deploying the Backend (Render/Railway)

1. Connect your GitHub repository to [Render.com](https://render.com) or [Railway.app](https://railway.app).
2. Create a new **Web Service**.
3. Set the following configuration:
   - **Build Command:** npm install
   - **Start Command:** npm run server
4. Add the following **Environment Variables**:
   SUPABASE_URL=https://<your-project-id>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<your-secret-service-role-key>
   MARKET_DATA_API_KEY=<your-twelvedata-key>
5. Deploy. Once deployed, note the public URL (e.g., https://supplyflow-backend.onrender.com).
6. Verify it is running by visiting https://supplyflow-backend.onrender.com/health in your browser.

---

## 2. Deploying the Frontend (Vercel)

1. Connect your GitHub repository to [Vercel](https://vercel.com).
2. Create a new Project. Vercel will automatically detect Vite.
3. Add the following **Environment Variables**:
   VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your-anon-key>
   VITE_BACKEND_URL=https://supplyflow-backend.onrender.com
4. Deploy.

*Note: NEVER put your SUPABASE_SERVICE_ROLE_KEY or MARKET_DATA_API_KEY in Vercel.*
