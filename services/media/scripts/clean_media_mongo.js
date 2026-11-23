const path = require('path');
const fs = require('fs');

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

async function cleanMediaMongo() {
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
    console.log('\n🧹 MEDIA MONGO WIPE — starting...');
    const collection = mongoose.connection.collection('mediaassets');

    const result = await collection.deleteMany({});
    console.log(`   ✅ Media Assets Metadata — deleted ${result.deletedCount} document(s)`);
    console.log('\n✅ Media Mongo wipe complete.\n');
  } catch (err) {
    console.error('❌ Error cleaning Media Mongo:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

cleanMediaMongo();
