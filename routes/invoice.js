const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Invoice = require('../models/invoice');
const Template = require('../models/template1.js');
const pdfGen = require('../utils/pdfGenerator');
const jwt = require("jsonwebtoken");

// CRUD
router.post('/', auth, async (req,res) => {
  const data = req.body;
  data.user = req.userId;
  const inv = await Invoice.create(data);
  res.send(inv);
});

// Add this route to your invoices.js backend file
router.get('/search/invoices', auth, async (req, res) => {
  try {
    const { q: searchQuery, page = 1, limit = 20 } = req.query;
    
    if (!searchQuery || searchQuery.trim() === '') {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const searchRegex = new RegExp(searchQuery, 'i');
    
    const invoices = await Invoice.find({
      user: req.userId,
      $or: [
        { 'billTo.name': searchRegex },
        { 'billTo.email': searchRegex },
        { invoiceNumber: searchRegex },
        { 'from.name': searchRegex },
        { poNumber: searchRegex },
        { 'items.description': searchRegex }
      ]
    })
    .populate('templateId')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const total = await Invoice.countDocuments({
      user: req.userId,
      $or: [
        { 'billTo.name': searchRegex },
        { 'billTo.email': searchRegex },
        { invoiceNumber: searchRegex },
        { 'from.name': searchRegex },
        { poNumber: searchRegex },
        { 'items.description': searchRegex }
      ]
    });

    res.json({
      invoices,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Error searching invoices', error: error.message });
  }
});

router.get('/', auth, async (req,res) => {
  const all = await Invoice.find({ user: req.userId }).populate('templateId');
  res.send(all);
});

router.get('/:id', auth, async (req, res) => {
  const inv = await Invoice.findOne({ _id: req.params.id, user: req.userId }).populate('templateId');
  if (!inv) {
    return res.status(403).send({ message: 'Not authorized' });
  }
  res.send(inv);
});

router.put('/:id', auth, async (req,res) => {
  const inv = await Invoice.findOneAndUpdate({ _id: req.params.id, user: req.userId }, req.body, { new: true });
  res.send(inv);
});

// DELETE endpoint - Add this
router.delete('/:id', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndDelete({ 
      _id: req.params.id, 
      user: req.userId 
    });
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found or not authorized' });
    }
    
    res.json({ 
      message: 'Invoice deleted successfully',
      deletedInvoice: invoice 
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: 'Error deleting invoice', error: error.message });
  }
});

// generate PDF (invoice)
router.get("/:id/pdf", async (req, res) => {
  let userId = req.userId;
  if (!userId && req.query.token) {
    try {
      const decoded = jwt.verify(req.query.token, process.env.JWT_SECRET);
      userId = decoded.id;
    } catch (err) {
      return res.status(401).send({ message: "Invalid token in query" });
    }
  }

  const invoice = await Invoice.findOne({ _id: req.params.id, user: userId }).populate("templateId");
  if (!invoice) return res.status(403).send({ message: "Not authorized" });

  try {
    const template = invoice.templateId ? invoice.templateId.layoutJSON : null;
    const pdfBuffer = await pdfGen.generateInvoicePDF(invoice, template);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=invoice_${invoice._id}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: err.message });
  }
});

module.exports = router;