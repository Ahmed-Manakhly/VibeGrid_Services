require('dotenv').config();
const { MongoClient } = require('mongodb');

async function cleanMongo() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('❌ MONGO_URI not found in .env');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection('users');

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@vibegrid.manakhly.tech';
    const devEmail = process.env.DEV_USER_EMAIL || 'dev@vibegrid.manakhly.tech';

    const result = await collection.deleteMany({
      email: { $nin: [adminEmail, devEmail] }
    });

    console.log(`\n🔥 FULL MONGO WIPE — starting...`);
    console.log(`   ✅ Auth Users         — deleted ${result.deletedCount} row(s)`);
    console.log(`\n🔥 Full wipe complete. Preserved: ${adminEmail}, ${devEmail}\n`);
  } catch (err) {
    console.error('❌ Error cleaning Mongo:', err);
  } finally {
    await client.close();
  }
}

cleanMongo();
