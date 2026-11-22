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

const { MongoClient } = require('mongodb');

const includeAdmins = process.argv.includes('--include-admins');

// URL VAR FOR LOCAL (Host native / localhost)
// const MONGO_URI = "mongodb://admin:secret@localhost:27017/auth_db?authSource=admin";
// URL VAR FOR PROD (Container network / VPS)
// const MONGO_URI = "mongodb://admin:secret@vibegrid_mongo:27017/auth_db?authSource=admin";

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
      const adminEmail = process.env.ADMIN_EMAIL;
      const devEmail = process.env.DEV_USER_EMAIL;

      result = await collection.deleteMany({
        email: { $nin: [adminEmail, devEmail].filter(Boolean) }
      });
      console.log(`   ✅ Auth Users         — deleted ${result.deletedCount} row(s)`);
      console.log(`\n🔥 Full wipe complete. Preserved: ${adminEmail || 'none'}, ${devEmail || 'none'}`);
    }
  } catch (err) {
    console.error('❌ Error cleaning Mongo:', err);
  } finally {
    await client.close();
  }
}

cleanMongo();
