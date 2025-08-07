#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function deleteDirectory(dirPath) {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`✅ Deleted: ${dirPath}`);
    } else {
      console.log(`⏭️  Skipped (not found): ${dirPath}`);
    }
  } catch (error) {
    console.log(`⚠️  Error deleting ${dirPath}:`, error.message);
  }
}

console.log('🧹 Cleaning Metro cache and temporary files...\n');

// Directories to clean
const dirsToClean = [
  'node_modules/.cache',
  '.expo',
  'dist',
  '.metro',
  'tmp',
  'temp'
];

dirsToClean.forEach(deleteDirectory);

console.log('\n🎯 Metro cache cleanup completed!');
console.log('💡 You can now run: npx expo start --clear');
