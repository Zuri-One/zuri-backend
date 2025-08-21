#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting database migrations...\n');

try {
  // Change to project root directory
  const projectRoot = path.join(__dirname, '..');
  process.chdir(projectRoot);

  console.log('📁 Current directory:', process.cwd());
  console.log('📋 Running pending migrations...\n');

  // Run migrations using sequelize-cli
  const migrationCommand = 'npx sequelize-cli db:migrate';
  
  console.log(`Executing: ${migrationCommand}`);
  const output = execSync(migrationCommand, { 
    encoding: 'utf8',
    stdio: 'pipe'
  });

  console.log('✅ Migration output:');
  console.log(output);
  
  console.log('\n🎉 Database migrations completed successfully!');
  
  // Show migration status
  console.log('\n📊 Checking migration status...');
  const statusOutput = execSync('npx sequelize-cli db:migrate:status', { 
    encoding: 'utf8',
    stdio: 'pipe'
  });
  
  console.log(statusOutput);

} catch (error) {
  console.error('❌ Migration failed:');
  console.error(error.message);
  
  if (error.stdout) {
    console.error('STDOUT:', error.stdout);
  }
  
  if (error.stderr) {
    console.error('STDERR:', error.stderr);
  }
  
  process.exit(1);
}

console.log('\n✨ Migration script completed!');