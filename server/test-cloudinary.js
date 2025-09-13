
require('dotenv').config();
const cloudinary = require('./config/cloudinary');

async function test() {
  try {
    const res = await cloudinary.api.resources({ max_results: 1 });
    console.log('✅ Cloudinary OK, sample resources:', res.resources?.length || 0);
  } catch (err) {
    console.error('❌ Cloudinary error:', err.message);
  }
}

test();
