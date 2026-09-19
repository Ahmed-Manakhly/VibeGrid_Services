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

const { MongoClient } = require('mongodb');

async function cleanMediaMongo() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('❌ MONGO_URI not found in .env');
    process.exit(1);
  }
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('\n🧹 MEDIA MONGO WIPE — starting...');
    const db = client.db('media_db');
    const collection = db.collection('mediaassets');

    const result = await collection.deleteMany({});
    console.log(`   ✅ Media Assets Metadata — deleted ${result.deletedCount} document(s)`);
    console.log('\n✅ Media Mongo wipe complete.\n');
  } catch (err) {
    console.error('❌ Error cleaning Media Mongo:', err.message);
  } finally {
    await client.close();
  }
}

cleanMediaMongo();
