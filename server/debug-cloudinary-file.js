// debug-cloudinary-file.js
require('dotenv').config();
const mongoose = require('mongoose');
const cloudinary = require('./config/cloudinary');
const File = require('./models/File'); // adjust path if needed

const MONGO = process.env.MONGO_URI;

async function run(fileId) {
  if (!fileId) {
    console.error('Usage: node debug-cloudinary-file.js <fileId>');
    process.exit(1);
  }

  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Mongo connected');

  const file = await File.findById(fileId).lean();
  if (!file) {
    console.error('File not found in DB:', fileId);
    process.exit(1);
  }

  console.log('DB file doc:\n', JSON.stringify(file, null, 2));

  if (!file.cloudinaryPublicId) {
    console.warn('No cloudinaryPublicId saved. secure URL:', file.url);
    process.exit(0);
  }

  // candidate resource types to try
  const candidates = [];
  if (file.resourceType && file.resourceType !== 'auto') candidates.push(file.resourceType);
  // guess from mime
  if (file.mimeType && file.mimeType.startsWith('image/')) candidates.push('image');
  if (file.mimeType && file.mimeType.startsWith('video/')) candidates.push('video');
  // always include raw and image and video as fallbacks
  ['raw', 'image', 'video'].forEach(c => { if (!candidates.includes(c)) candidates.push(c); });

  console.log('Will try cloudinary.api.resource on public_id with resource_type candidates:', candidates);

  for (const resource_type of candidates) {
    try {
      const info = await cloudinary.api.resource(file.cloudinaryPublicId, { resource_type });
      console.log(`cloudinary.api.resource succeeded for resource_type=${resource_type}:\n`, {
        resource_type: info.resource_type,
        secure_url: info.secure_url,
        url: info.url,
        bytes: info.bytes,
        format: info.format,
        access_mode: info.access_mode, // may indicate 'authenticated' etc
      });
      // exit after first success
      process.exit(0);
    } catch (err) {
      console.warn(`cloudinary.api.resource failed for resource_type=${resource_type}:`, err && err.message);
    }
  }

  console.error('All attempts failed. As a last check, printing the stored secure URL and trying a curl via node-fetch:');

  try {
    const fetch = (await import('node-fetch')).default;
    const res = await fetch(file.url);
    console.log('Direct fetch of file.url status:', res.status, res.statusText);
    const txt = await res.text().catch(()=>'<non-text body>');
    console.log('Direct fetch body (first 500 chars):', txt.slice(0,500));
  } catch (err) {
    console.warn('Direct fetch attempt threw:', err && err.message);
  }

  process.exit(1);
}

// Run: node debug-cloudinary-file.js <fileId>
const fid = process.argv[2];
run(fid).catch(err => { console.error(err); process.exit(2); });
