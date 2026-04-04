#!/bin/bash
# ============================================================
# Plan Karo Chalo — One-Command Deploy
# ============================================================
# Run this from inside the unzipped plankarochalo folder:
#   chmod +x deploy.sh && ./deploy.sh
# ============================================================

set -e
echo ""
echo "========================================="
echo "  Plan Karo Chalo — Deploy to Vercel"
echo "========================================="
echo ""

# Step 1: Check prerequisites
command -v node >/dev/null 2>&1 || { echo "ERROR: Node.js not found. Install from https://nodejs.org"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "ERROR: npm not found. Install Node.js from https://nodejs.org"; exit 1; }

echo "[1/4] Installing dependencies..."
npm install

echo ""
echo "[2/4] Building production app..."
npm run build

echo ""
echo "[3/4] Installing Vercel CLI..."
npm install -g vercel 2>/dev/null || npx vercel --version >/dev/null 2>&1

echo ""
echo "[4/4] Deploying to Vercel..."
echo ""
echo "  If this is your first time, Vercel will ask you to:"
echo "  - Log in (opens browser)"
echo "  - Set up project (accept all defaults)"
echo "  - Choose scope (your account)"
echo ""
echo "  Press Enter to continue..."
read -r

npx vercel --prod

echo ""
echo "========================================="
echo "  DEPLOYED!"
echo "========================================="
echo ""
echo "  Next steps:"
echo "  1. Set up Supabase (see README.md Step 1)"
echo "  2. Add env vars in Vercel dashboard:"
echo "     - VITE_SUPABASE_URL"
echo "     - VITE_SUPABASE_ANON_KEY"
echo "  3. Run: npx vercel --prod  (to redeploy with env vars)"
echo ""
echo "  Your app is live!"
echo "========================================="
