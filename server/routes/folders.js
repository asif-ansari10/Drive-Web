// server/routes/folders.js
const express = require('express');
const router = express.Router();
const Folder = require('../models/Folder');
const File = require('../models/File'); // optional: used if you want to cascade deletes
const { requireAuth } = require('../middleware/auth'); // <- IMPORTED

// NOTE: server.js mounts this router with requireAuth already:
// app.use('/api/folders', requireAuth, folderRoutes);
// but importing and using requireAuth here is safe if you want per-route control.

/**
 * GET /api/folders?parent=<id>
 * if parent is 'null' or missing -> root (parent === null)
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const owner = req.user._id;
    let { parent } = req.query;
    if (parent === 'null' || parent === '' || parent === undefined) parent = null;
    const q = { owner, parent };
    const folders = await Folder.find(q).sort({ createdAt: -1 });
    res.json({ folders });
  } catch (err) {
    console.error('Get folders error', err);
    res.status(500).json({ error: 'Failed to list folders' });
  }
});

// create folder
router.post('/', requireAuth, async (req, res) => {
  try {
    const owner = req.user._id;
    const { name, parent } = req.body;
    const folder = await Folder.create({ name, parent: parent || null, owner });
    res.json({ folder });
  } catch (err) {
    console.error('Create folder error', err);
    res.status(500).json({ error: 'Create folder failed' });
  }
});

// PATCH /api/folders/:id -> rename or update metadata
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const owner = req.user._id;
    const id = req.params.id;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Missing name' });

    const folder = await Folder.findOneAndUpdate(
      { _id: id, owner },
      { name: name.trim() },
      { new: true }
    );

    if (!folder) return res.status(404).json({ error: 'Folder not found' });

    res.json({ folder });
  } catch (err) {
    console.error('Folder rename error:', err);
    res.status(500).json({ error: 'Rename failed' });
  }
});

// DELETE folder (simple) - remove folder and optionally cascade-delete files/subfolders
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const owner = req.user._id;
    const id = req.params.id;

    // Basic delete: remove the folder
    await Folder.deleteOne({ _id: id, owner });

    // Optional: cascade delete files and child folders (uncomment if you want)
    // await File.deleteMany({ folder: id, owner });
    // await Folder.deleteMany({ parent: id, owner });

    res.json({ ok: true });
  } catch (err) {
    console.error('Delete folder error:', err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

/**
 * NOTE: put more specific routes BEFORE `/:id` so they don't get shadowed.
 * GET /api/folders/ancestors/:id -> return array of ancestors from root -> this folder
 */
router.get('/ancestors/:id', requireAuth, async (req, res) => {
  try {
    const owner = req.user._id;
    let folder = await Folder.findOne({ _id: req.params.id, owner });
    if (!folder) return res.status(404).json({ error: 'Folder not found' });

    const chain = [];
    // walk up parents until null
    while (folder) {
      chain.unshift({ _id: folder._id, name: folder.name });
      if (!folder.parent) break;
      folder = await Folder.findOne({ _id: folder.parent, owner });
    }

    res.json({ ancestors: chain });
  } catch (err) {
    console.error("Ancestors fetch failed:", err);
    res.status(500).json({ error: 'Failed to fetch ancestors' });
  }
});

// GET /api/folders/:id -> return folder doc
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const owner = req.user._id;
    const id = req.params.id;
    const folder = await Folder.findOne({ _id: id, owner });
    if (!folder) return res.status(404).json({ error: 'Folder not found' });
    res.json({ folder });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load folder' });
  }
});

module.exports = router;
