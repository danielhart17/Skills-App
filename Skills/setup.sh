#!/bin/bash

echo "🚀 Setting up Skillz App..."

# Fix npm cache permissions
echo "🔧 Fixing npm cache permissions..."
sudo chown -R $(id -u):$(id -g) "$HOME/.npm"

# Clean npm cache
echo "🧹 Cleaning npm cache..."
npm cache clean --force

# Install dependencies
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

echo "✅ Setup complete!"
echo ""
echo "To start the development server, run:"
echo "  npm run dev"

