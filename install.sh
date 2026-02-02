#!/usr/bin/env bash
set -e

echo "🟣 Installing ZZ language..."

# 1. Check Node
if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js is required but not installed."
  echo "👉 Install from https://nodejs.org (v18+ recommended)"
  exit 1
fi

NODE_VERSION=$(node -v)
echo "✅ Node found: $NODE_VERSION"

# 2. Install dependencies
echo "📦 Installing dependencies..."
npm install

# 3. Install globally
echo "🔗 Linking zz globally..."
npm link

# 4. Test
if command -v zz >/dev/null 2>&1; then
  echo "🎉 ZZ installed successfully!"
  echo "👉 Try: zz --help"
else
  echo "❌ Something went wrong. 'zz' not found in PATH."
  exit 1
fi
