#!/usr/bin/env node

/**
 * Simple script to check if environment variables are configured
 * Run with: node check-env.js
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log("🔍 Checking environment configuration...\n");

// Check if .env.local exists
const envPath = join(__dirname, ".env.local");
const envExists = existsSync(envPath);

if (!envExists) {
  console.log("❌ .env.local file NOT FOUND");
  console.log("📝 Create one by copying .env.local.template:");
  console.log("   cp .env.local.template .env.local\n");
  process.exit(1);
}

console.log("✅ .env.local file exists");

// Read and parse .env.local
const envContent = readFileSync(envPath, "utf-8");
const lines = envContent.split("\n");

const requiredVars = {
  VITE_SUPABASE_URL: false,
  VITE_SUPABASE_ANON_KEY: false,
  VITE_STRIPE_PUBLISHABLE_KEY: false,
};

lines.forEach((line) => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith("#")) {
    const [key, value] = trimmed.split("=");
    if (key && value && requiredVars.hasOwnProperty(key.trim())) {
      const val = value.trim();
      if (val && !val.includes("your_") && !val.includes("_here")) {
        requiredVars[key.trim()] = true;
      }
    }
  }
});

console.log("\n📋 Environment Variables:");
Object.entries(requiredVars).forEach(([key, isSet]) => {
  console.log(`   ${isSet ? "✅" : "❌"} ${key}`);
});

const allSet = Object.values(requiredVars).every((v) => v);

if (allSet) {
  console.log("\n✨ All environment variables are configured!");
  console.log("\n📝 Next steps:");
  console.log("   1. Restart your dev server: npm run dev");
  console.log("   2. Deploy Edge Functions (see DEPLOYMENT_GUIDE.md)");
  console.log("   3. Add STRIPE_SECRET_KEY to Supabase Edge Function secrets");
  process.exit(0);
} else {
  console.log(
    "\n⚠️  Some environment variables are missing or have placeholder values"
  );
  console.log("📝 Edit .env.local and add the actual values");
  console.log(
    "   - Get Supabase keys from: https://app.supabase.com/project/YOUR_PROJECT/settings/api"
  );
  console.log(
    "   - Get Stripe key from: https://dashboard.stripe.com/test/apikeys"
  );
  process.exit(1);
}
