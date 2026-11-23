const path = require('path');
const fs = require('fs');

// Try loading .env from service directory first, then root directory, then cwd
const candidateEnvPaths = [
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../../.env'),
  path.resolve(process.cwd(), '.env'),
];

for (const envPath of candidateEnvPaths) {
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    break;
  }
}

const mongoose = require('mongoose');

const includeAdmins = process.argv.includes('--include-admins');

async function cleanMongo() {
  let uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('❌ MONGO_URI not found in .env');
    process.exit(1);
  }

  // Format URI with URL-encoded credentials if needed
  try {
    if (uri.includes('@') && uri.startsWith('mongodb://')) {
      const parts = uri.replace('mongodb://', '').split('@');
      const creds = parts[0].split(':');
      if (creds.length === 2) {
        const user = encodeURIComponent(decodeURIComponent(creds[0]));
        const pass = encodeURIComponent(decodeURIComponent(creds[1]));
        uri = `mongodb://${user}:${pass}@${parts[1]}`;
      }
    }
  } catch (e) {
    // Fallback
  }

  try {
    await mongoose.connect(uri);
    console.log('\n🔥 FULL MONGO WIPE — starting...');
    const collection = mongoose.connection.collection('userauths');

    let result;
    if (includeAdmins) {
      result = await collection.deleteMany({});
      console.log(`   ✅ Auth Users         — deleted ${result.deletedCount} row(s)`);
      console.log('\n🔥 Full wipe complete. ALL users deleted, including Admins.');
    } else {
      const adminEmail = process.env.ADMIN_EMAIL;
      const devEmail = process.env.DEV_USER_EMAIL;

      result = await collection.deleteMany({
        email: { $nin: [adminEmail, devEmail].filter(Boolean) }
      });
      console.log(`   ✅ Auth Users         — deleted ${result.deletedCount} row(s)`);
      console.log(`\n🔥 Full wipe complete. Preserved: ${adminEmail || 'none'}, ${devEmail || 'none'}`);
    }
  } catch (err) {
    console.error('❌ Error cleaning Mongo:', err.message || err);
  } finally {
    await mongoose.disconnect();
  }
}

cleanMongo();
