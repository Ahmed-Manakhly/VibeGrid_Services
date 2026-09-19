require('dotenv').config();
const { MongoClient } = require('mongodb');

async function cleanMediaMongo() {
  const uri = process.env.MONGO_URI || 'mongodb://admin:VgMongo_A2026%23u7%24YnR%213vTz@localhost:27017/media_db?authSource=admin';
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
