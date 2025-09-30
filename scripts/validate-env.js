#!/usr/bin/env node

// Environment validation script for Creative NodeFlow
// Run with: node scripts/validate-env.js

const fs = require('fs');
const path = require('path');

console.log('🔍 Creative NodeFlow Environment Validator\n');

// Check if .env file exists
const envPath = path.join(process.cwd(), '.env');
const envExamplePath = path.join(process.cwd(), '.env.example');

console.log('📍 Current directory:', process.cwd());
console.log('📄 Looking for .env at:', envPath);

if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found!');
  
  if (fs.existsSync(envExamplePath)) {
    console.log('💡 Found .env.example - copy it to .env and add your keys:');
    console.log('   cp .env.example .env');
  } else {
    console.log('💡 Create .env file with:');
    console.log(`
REACT_APP_OPENAI_API_KEY=sk-proj-your-openai-key-here
REACT_APP_GOOGLE_API_KEY=your-google-gemini-key-here
REACT_APP_DEFAULT_SYSTEM_PROMPT=You are a helpful AI assistant.
    `);
  }
  process.exit(1);
}

// Read .env file
console.log('✅ .env file found');

try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  
  console.log('📋 Environment variables in .env:');
  
  const requiredVars = [
    'REACT_APP_OPENAI_API_KEY',
    'REACT_APP_GOOGLE_API_KEY'
  ];
  
  const foundVars = {};
  
  lines.forEach(line => {
    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('=').trim();
    
    if (key.startsWith('REACT_APP_')) {
      foundVars[key] = value;
      
      if (requiredVars.includes(key)) {
        if (value && value !== 'your-key-here' && value !== '') {
          console.log(`  ✅ ${key}: ${value.substring(0, 10)}... (${value.length} chars)`);
        } else {
          console.log(`  ❌ ${key}: Empty or placeholder value`);
        }
      } else {
        console.log(`  ℹ️  ${key}: ${value ? 'Set' : 'Empty'}`);
      }
    }
  });
  
  // Check for missing required vars
  const missingVars = requiredVars.filter(varName => !foundVars[varName] || foundVars[varName] === '');
  
  if (missingVars.length > 0) {
    console.log('\n❌ Missing or empty required variables:');
    missingVars.forEach(varName => {
      console.log(`  - ${varName}`);
    });
    
    console.log('\n💡 Get API keys from:');
    console.log('  - OpenAI: https://platform.openai.com/api-keys');
    console.log('  - Google Gemini: https://aistudio.google.com/apikey');
    
    process.exit(1);
  }
  
  // Validate key formats
  console.log('\n🔍 Validating key formats:');
  
  if (foundVars.REACT_APP_OPENAI_API_KEY) {
    const openaiKey = foundVars.REACT_APP_OPENAI_API_KEY;
    if (openaiKey.startsWith('sk-')) {
      console.log('  ✅ OpenAI key format looks correct');
    } else {
      console.log('  ⚠️  OpenAI key should start with "sk-"');
    }
  }
  
  if (foundVars.REACT_APP_GOOGLE_API_KEY) {
    const googleKey = foundVars.REACT_APP_GOOGLE_API_KEY;
    if (googleKey.length >= 30) {
      console.log('  ✅ Google API key length looks correct');
    } else {
      console.log('  ⚠️  Google API key seems too short');
    }
  }
  
  console.log('\n✅ Environment validation complete!');
  console.log('\n🚀 Next steps:');
  console.log('  1. Make sure development server is stopped (Ctrl+C)');
  console.log('  2. Restart with: npm start');  
  console.log('  3. Check the diagnostic panel in the app (top-left corner)');
  
} catch (error) {
  console.error('❌ Error reading .env file:', error.message);
  process.exit(1);
}