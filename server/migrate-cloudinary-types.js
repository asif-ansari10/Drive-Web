// server/migrate-cloudinary-types.js (verbose)
require('dotenv').config();
const mongoose = require('mongoose');
const cloudinary = require('./config/cloudinary');
const File = require('./models/File');

const MONGO = process.env.MONGO_URI;

async function run() {
  console.log('Connecting to Mongo...');
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });

  // Find files that have a public id but no resource type stored
  const files = await File.find({ cloudinaryPublicId: { $exists: true }, $or: [{ cloudinaryResourceType: { $exists: false } }, { cloudinaryResourceType: null }] }).lean();
  console.log('Files to check:', files.length);

  if (files.length === 0) {
    console.log('No files need migration. Exiting.');
    process.exit(0);
  }

  for (const f of files) {
    console.log('---');
    console.log('Checking file _id:', f._id, 'publicId:', f.cloudinaryPublicId, 'mimeType:', f.mimeType);
    const tries = ['image', 'video', 'raw'];
    let found = false;
    for (const t of tries) {
      try {
        const info = await cloudinary.api.resource(f.cloudinaryPublicId, { resource_type: t });
        console.log(`  -> Found resource_type=${info.resource_type} (tried ${t})`);
        await File.updateOne({ _id: f._id }, {
          cloudinaryResourceType: info.resource_type || t,
          cloudinaryVersion: info.version || (f.cloudinaryVersion || null)
        });
        console.log('  -> Updated DB for', f._id);
        found = true;
        break;
      } catch (err) {
        // log small error and continue
        console.log(`  (not ${t})`);
      }
    }
    if (!found) {
      console.warn('  !!! Could not detect resource_type for', f._id, 'publicId:', f.cloudinaryPublicId);
    }
  }

  console.log('Migration done.');
  process.exit(0);
}

run().catch(err => {
  console.error('Migration script error:', err);
  process.exit(2);
});
