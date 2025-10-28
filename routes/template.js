// server/routes/template.js
const express = require('express');
const router = express.Router();
const Template = require('../models/template1');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Setup for logo upload
const upload = multer({
  dest: path.join(__dirname, '..', 'public', 'uploads'),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// --- Seed sample templates (Enhanced) ---
router.get('/seed', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).send({ message: 'Seed endpoint not available in production' });
    }

    const samples = [
      {
        name: 'Professional Blue',
        type: 'invoice',
        layoutJSON: {
          name: 'Professional Invoice',
          color: '#2563eb',
          font: 'Helvetica',
          showLogo: true,
          logoPath: null
        },
        previewImage: '/previews/professional-blue.jpg' // 👈
      },
      {
        name: 'Modern Green',
        type: 'receipt',
        layoutJSON: {
          name: 'Modern Receipt',
          color: '#16a34a',
          font: 'Helvetica',
          showLogo: true,
          logoPath: null
        },
        previewImage: '/previews/modern-green.jpg'
      },
      {
        name: 'Elegant Purple',
        type: 'invoice',
        layoutJSON: {
          name: 'Elegant Invoice',
          color: '#7c3aed',
          font: 'Helvetica',
          showLogo: false,
          logoPath: null
        },
        previewImage: '/previews/elegant-purple.jpg'
      },
      {
        name: 'Minimalist Gray',
        type: 'receipt',
        layoutJSON: {
          name: 'Minimalist Receipt',
          color: '#4b5563',
          font: 'Helvetica',
          showLogo: false,
          logoPath: null
        },
        previewImage: '/previews/minimalist-gray.jpg'
      }
    ];

    await Template.deleteMany({});
    const created = await Template.insertMany(samples);
    res.send({ message: 'Templates seeded successfully', templates: created });
  } catch (err) {
    console.error('Seed error:', err);
    res.status(500).send({ message: 'Failed to seed templates', error: err.message });
  }
});


// --- Get all templates (public) ---
router.get('/', async (req, res) => {
  try {
    const list = await Template.find();
    console.log('Templates in database:', list.map(t => ({ name: t.name, id: t._id })));
    res.send(list);
  } catch (err) {
    console.error('Get templates error:', err);
    res.status(500).send({ message: 'Failed to fetch templates', error: err.message });
  }
});

// --- Get templates by type ---
router.get('/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const templates = await Template.find({ type });
    res.send(templates);
  } catch (err) {
    console.error('Get templates by type error:', err);
    res.status(500).send({ message: 'Failed to fetch templates', error: err.message });
  }
});

// --- Create a template (auth required) ---
router.post('/', auth, async (req, res) => {
  try {
    const { name, type, layoutJSON } = req.body;
    
    // Basic validation
    if (!name || !type) {
      return res.status(400).send({ message: 'Name and type are required' });
    }

    const payload = {
      name,
      type,
      layoutJSON: {
        ...layoutJSON,
        // Ensure required fields
        color: layoutJSON?.color || '#2563eb',
        font: layoutJSON?.font || 'Helvetica',
        showLogo: layoutJSON?.showLogo !== undefined ? layoutJSON.showLogo : true,
      },
      createdBy: req.userId
    };

    const t = await Template.create(payload);
    res.status(201).send(t);
  } catch (err) {
    console.error('Create template error:', err);
    
    if (err.name === 'ValidationError') {
      return res.status(400).send({ message: 'Invalid template data', error: err.message });
    }
    
    res.status(500).send({ message: 'Failed to create template', error: err.message });
  }
});

// --- Upload a logo and attach to template ---
router.post('/:id/logo', auth, upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send({ message: 'No file uploaded' });
    }

    const t = await Template.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.userId },
      { 
        'layoutJSON.logoPath': `/uploads/${req.file.filename}`,
        'layoutJSON.showLogo': true
      },
      { new: true }
    );
    
    if (!t) {
      return res.status(404).send({ message: 'Template not found or not authorized' });
    }
    
    res.send(t);
  } catch (err) {
    console.error('Upload logo error:', err);
    
    if (err.message === 'Only image files are allowed') {
      return res.status(400).send({ message: err.message });
    }
    
    res.status(500).send({ message: 'Failed to upload logo', error: err.message });
  }
});

// --- Remove logo from template ---
router.delete('/:id/logo', auth, async (req, res) => {
  try {
    const t = await Template.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.userId },
      { 
        'layoutJSON.logoPath': null,
        'layoutJSON.showLogo': false
      },
      { new: true }
    );
    
    if (!t) {
      return res.status(404).send({ message: 'Template not found or not authorized' });
    }
    
    res.send(t);
  } catch (err) {
    console.error('Remove logo error:', err);
    res.status(500).send({ message: 'Failed to remove logo', error: err.message });
  }
});

// --- Update a template (auth required) ---
router.put('/:id', auth, async (req, res) => {
  try {
    const t = await Template.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.userId },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!t) {
      return res.status(404).send({ message: 'Template not found or not authorized' });
    }
    
    res.send(t);
  } catch (err) {
    console.error('Update template error:', err);
    
    if (err.name === 'ValidationError') {
      return res.status(400).send({ message: 'Invalid template data', error: err.message });
    }
    
    res.status(500).send({ message: 'Failed to update template', error: err.message });
  }
});

// --- Get template by ID ---
router.get('/:id', async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).send({ message: 'Template not found' });
    }
    res.send(template);
  } catch (err) {
    console.error('Get template error:', err);
    res.status(500).send({ message: 'Failed to fetch template', error: err.message });
  }
});

// --- Delete a template (auth required) ---
router.delete('/:id', auth, async (req, res) => {
  try {
    const t = await Template.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.userId,
    });
    
    if (!t) {
      return res.status(404).send({ message: 'Template not found or not authorized' });
    }
    
    res.send({ message: 'Template deleted successfully', id: t._id });
  } catch (err) {
    console.error('Delete template error:', err);
    res.status(500).send({ message: 'Failed to delete template', error: err.message });
  }
});

module.exports = router;