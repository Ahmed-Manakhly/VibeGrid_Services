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

// URL VAR FOR LOCAL (Host native / localhost)
// const MONGO_URI = "mongodb://admin:secret@localhost:27017/media_db?authSource=admin";
// URL VAR FOR PROD (Container network / VPS)
// const MONGO_URI = "mongodb://admin:secret@vibegrid_mongo:27017/media_db?authSource=admin";

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
