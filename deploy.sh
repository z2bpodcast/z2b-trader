#!/bin/bash
# Z2B Deploy Script — push to GitHub + trigger Vercel
# Usage: bash deploy.sh "your commit message"

MSG=${1:-"Update Z2B Trader"}

echo "📦 Adding all changes..."
git add .

echo "💬 Committing: $MSG"
git commit -m "$MSG"

echo "🚀 Pushing to GitHub..."
git push

echo "⚡ Triggering Vercel deployment..."
curl -X POST "https://api.vercel.com/v1/integrations/deploy/prj_JxtrepkHhYOO6wNUyqiEnOS27T9y/cKrzMSOyW6"

echo ""
echo "✅ Done! Vercel is deploying — check in 30 seconds."
