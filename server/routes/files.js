const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('../config/cloudinary'); // your cloudinary config that calls cloudinary.config(...)
const streamifier = require('streamifier');

const File = require('../models/File');
const Folder = require('../models/Folder');

// multer memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// helper: upload buffer to Cloudinary (auto resource type)
function streamUpload(buffer, owner) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: `drive_${owner}`, resource_type: 'auto' },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

// POST /api/files -> upload (multipart form 'file', optional 'folder')
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const owner = req.user._id;
    const folderId = req.body.folder || null;

    if (folderId) {
      const folder = await Folder.findOne({ _id: folderId, owner });
      if (!folder) return res.status(400).json({ error: 'Invalid folder' });
    }

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // upload to Cloudinary letting Cloudinary detect type
    const result = await streamUpload(req.file.buffer, owner);

    // persist relevant metadata returned by Cloudinary
    const fileDoc = await File.create({
      name: req.file.originalname,
      url: result.secure_url,
      folder: folderId,
      owner,
      size: req.file.size,
      mimeType: req.file.mimetype,
      cloudinaryPublicId: result.public_id,
      cloudinaryResourceType: result.resource_type, // important
      cloudinaryVersion: result.version,
    });

    return res.json({ file: fileDoc });
  } catch (err) {
    console.error('Upload failed:', err);
    return res.status(500).json({ error: 'Upload failed' });
  }
});

// GET /api/files?folder=xxx
router.get('/', async (req, res) => {
  try {
    const owner = req.user._id;
    const folder = req.query.folder;
    const q = { owner };

    if (!folder || folder === 'null') q.folder = null;
    else q.folder = folder;

    const files = await File.find(q).sort({ createdAt: -1 });
    res.json({ files });
  } catch (err) {
    console.error('List failed:', err);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// DELETE /api/files/:id  (deletes cloudinary resource then DB doc)
router.delete('/:id', async (req, res) => {
  try {
    const owner = req.user._id;
    const file = await File.findOne({ _id: req.params.id, owner });
    if (!file) return res.status(404).json({ error: 'Not found' });

    if (file.cloudinaryPublicId) {
      // use stored resource type — don't pass 'auto' to destroy()
      const resourceType = file.cloudinaryResourceType || 'image';
      try {
        await cloudinary.uploader.destroy(file.cloudinaryPublicId, { resource_type: resourceType });
      } catch (e) {
        // log but continue to remove DB doc (destroy may fail if already removed)
        console.warn('Cloudinary destroy failed (continuing):', e);
      }
    }
    await File.deleteOne({ _id: file._id });
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete failed:', err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

/**
 * GET /api/files/download/:id
 * Prefer redirect to a signed Cloudinary URL so Cloudinary serves file with correct headers.
 * If you must proxy, you can fetch and stream, but redirect is simpler and avoids auth issues.
 */
// router.get('/download/:id', async (req, res) => {
//   try {
//     const owner = req.user._id;
//     const file = await File.findOne({ _id: req.params.id, owner });
//     if (!file) return res.status(404).json({ error: 'Not found' });

//     if (file.cloudinaryPublicId) {
//       const resourceType = file.cloudinaryResourceType || 'auto';
//       // Build a signed URL. Use 'attachment' flag so Cloudinary suggests download.
//       // For raw/pdf use resource_type 'raw' if that's what was stored; if stored 'image' that is fine too.
//       const signed = cloudinary.url(file.cloudinaryPublicId, {
//         resource_type: resourceType,
//         secure: true,
//         sign_url: true,
//         // flags: 'attachment' // note: older SDKs may not support flags here — see comment below
//       });

//       // If signed is a URL, redirect browser -> Cloudinary (Cloudinary will return proper headers).
//       return res.redirect(signed);
//     }

//     // fallback: if no public id, redirect to stored secure url (public)
//     return res.redirect(file.url);
//   } catch (err) {
//     console.error('Download proxy error', err);
//     res.status(502).json({ error: 'Download failed' });
//   }
// });

// inside server/routes/files.js - replace download handler with this
const fetch = require('node-fetch'); // v2 is fine
// ... other requires and code above

// helper: try to detect resource_type by using stored value or Cloudinary API
async function detectResourceType(publicId) {
  // try an explicit resource check sequence
  const tries = ['raw', 'image', 'video'];
  for (const t of tries) {
    try {
      const info = await cloudinary.api.resource(publicId, { resource_type: t });
      // if succeeded, return the resource_type returned by API (safer)
      if (info && info.resource_type) return info.resource_type;
      // some responses return without resource_type - still accept t
      return t;
    } catch (err) {
      // continue trying
    }
  }
  // last fallback
  return 'image';
}

router.get('/download/:id', async (req, res) => {
  try {
    const owner = req.user._id;
    const file = await File.findOne({ _id: req.params.id, owner }).lean();
    if (!file) return res.status(404).json({ error: 'Not found' });

    const publicId = file.cloudinaryPublicId;
    if (!publicId) {
      // fallback to public URL if no public id
      console.log('[download] no publicId, redirecting to url:', file.url);
      return res.redirect(file.url);
    }

    // use stored resource type if present; otherwise detect
    let resourceType = file.cloudinaryResourceType || null;
    if (!resourceType) {
      resourceType = await detectResourceType(publicId);
      console.log('[download] detected resource_type=', resourceType, 'for', publicId);
      // optional: persist back to db so next time we don't detect again
      try { await File.updateOne({ _id: file._id }, { cloudinaryResourceType: resourceType }); } catch(e){ /* ignore */ }
    }

    // Create a signed URL that Cloudinary will accept
    // IMPORTANT: cloudinary.url expects the public_id portion only (not full url).
    // pass resource_type as detected.
    const signedUrl = cloudinary.url(publicId, {
      resource_type: resourceType,
      secure: true,
      sign_url: true,
      // you can optionally add transformation or download flag here
    });

    console.log('[download] signedUrl:', signedUrl);

    // Quick test: verify signed URL is reachable (server->Cloudinary)
    // (optional) attempt a HEAD fetch to check status code before redirecting:
    try {
      const head = await fetch(signedUrl, { method: 'HEAD' });
      console.log('[download] head status:', head.status, head.statusText);
      if (!head.ok) {
        // log body for debug (be careful - HEAD may not give body)
        console.warn('[download] HEAD not OK, status=', head.status);
      }
    } catch (e) {
      console.warn('[download] HEAD fetch error (non-fatal):', e && e.message);
    }

    // Redirect the browser to Cloudinary signed URL
    return res.redirect(signedUrl);

    // --- If you prefer to proxy/stream the bytes through your server, replace the above redirect
    // with a fetch and pipe block (see optional proxy code below).
  } catch (err) {
    console.error('[download] proxy download error', err);
    if (err && err.http_code) {
      // log Cloudinary HTTP code if present
      console.error('[download] cloudinary error', err);
    }
    return res.status(502).json({ error: 'Download failed', detail: (err && err.message) || err });
  }
});


module.exports = router;
