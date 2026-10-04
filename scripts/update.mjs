#!/usr/bin/env node
import { execSync } from 'node:child_process';

console.log('\n🚀 Starting NodePeeker update...\n');

try {
  console.log('⏳ 1/4 Pulling latest code from GitHub...');
  execSync('git pull origin main', { stdio: 'inherit' });

  console.log('\n⏳ 2/4 Checking and updating dependencies...');
  execSync('npm install', { stdio: 'inherit' });

  console.log('\n⏳ 3/4 Compiling Figma plugin bundle...');
  execSync('npm run build', { stdio: 'inherit' });

  console.log('\n⏳ 4/4 Compiling MCP broker...');
  execSync('npm run bridge:build', { stdio: 'inherit' });

  console.log('\n======================================================');
  console.log('✅ NodePeeker updated successfully to the latest version!');
  console.log('👉 Please focus on Figma and reload the plugin (Ctrl+R / Cmd+R).');
  console.log('👉 If the broker is running in a terminal, restart it: npm run bridge');
  console.log('======================================================\n');
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error('\n❌ Update failed:', message);
  process.exit(1);
}
