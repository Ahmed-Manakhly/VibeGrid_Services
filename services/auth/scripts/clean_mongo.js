require('dotenv').config();
const { MongoClient } = require('mongodb');

const includeAdmins = process.argv.includes('--include-admins');

async function cleanMongo() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('❌ MONGO_URI not found in .env');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('\n🔥 FULL MONGO WIPE — starting...');
    const db = client.db();
    const collection = db.collection('userauths'); // Mongoose defaults to lowercase + 's'

    let result;
    if (includeAdmins) {
      result = await collection.deleteMany({});
      console.log(`   ✅ Auth Users         — deleted ${result.deletedCount} row(s)`);
      console.log('\n🔥 Full wipe complete. ALL users deleted, including Admins.');
    } else {
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@vibegrid.manakhly.tech';
      const devEmail = process.env.DEV_USER_EMAIL || 'dev@vibegrid.manakhly.tech';
      // Also preserve the old local one just in case
      const oldAdmin = 'admin@vibegrid.local';

      result = await collection.deleteMany({
        email: { $nin: [adminEmail, devEmail, oldAdmin] }
      });
      console.log(`   ✅ Auth Users         — deleted ${result.deletedCount} row(s)`);
      console.log(`\n🔥 Full wipe complete. Preserved: ${adminEmail}, ${devEmail}`);
    }
  } catch (err) {
    console.error('❌ Error cleaning Mongo:', err);
  } finally {
    await client.close();
  }
}

cleanMongo();
