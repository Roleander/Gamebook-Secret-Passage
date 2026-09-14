/**
 * Script para construir la versión Electron de Secret Passage
 * 
 * Ejecutar: node scripts/build-electron.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT_DIR, 'out');
const ELECTRON_DIR = path.join(ROOT_DIR, 'electron');

console.log('🔨 Building Secret Passage for Desktop...\n');

// Step 1: Build Next.js with static export
console.log('📦 Building Next.js (static export)...');
try {
  // Create a temporary next.config for static export
  const tempConfig = `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;`;

  const configPath = path.join(ROOT_DIR, 'next.config.ts');
  const originalConfig = fs.readFileSync(configPath, 'utf8');
  
  // Save original and write temp config
  fs.writeFileSync(configPath + '.bak', originalConfig);
  fs.writeFileSync(configPath, tempConfig);

  // Build
  execSync('npm run build', { 
    cwd: ROOT_DIR, 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });

  // Restore original config
  fs.writeFileSync(configPath, originalConfig);
  fs.unlinkSync(configPath + '.bak');

  console.log('✅ Next.js build complete\n');
} catch (error) {
  console.error('❌ Next.js build failed:', error.message);
  process.exit(1);
}

// Step 2: Copy Electron files
console.log('📂 Copying Electron files...');
const electronMain = fs.readFileSync(
  path.join(ELECTRON_DIR, 'main.js'), 
  'utf8'
);

// Update main.js for production
const prodMain = electronMain.replace(
  'const isDev = process.env.NODE_ENV === \'development\';',
  'const isDev = false;'
);

fs.writeFileSync(path.join(OUT_DIR, 'main.js'), prodMain);
console.log('✅ Electron files copied\n');

// Step 3: Create package.json for Electron
console.log('📝 Creating Electron package.json...');
const electronPackage = {
  name: 'secret-passage',
  version: '1.0.0',
  description: 'Editor de Librojuegos - Secret Passage',
  main: 'main.js',
  author: 'Roleander',
  license: 'MIT',
  homepage: 'https://secretpassage.app',
  repository: {
    type: 'git',
    url: 'https://github.com/Roleander/Gamebook-Secret-Passage'
  }
};

fs.writeFileSync(
  path.join(OUT_DIR, 'package.json'),
  JSON.stringify(electronPackage, null, 2)
);
console.log('✅ Electron package.json created\n');

console.log('🎉 Build ready! To create installers run:');
console.log('   cd out && npx electron-builder --win');
console.log('   cd out && npx electron-builder --mac');
console.log('   cd out && npx electron-builder --linux');
