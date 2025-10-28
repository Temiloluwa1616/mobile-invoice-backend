const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Receipt = require('../models/receipt');
const Invoice = require('../models/invoice');
const Template = require('../models/template1');
const pdfGen = require('../utils/pdfGenerator'); 
const jwt = require('jsonwebtoken');

// Create receipt 
router.post('/', auth, async (req, res) => {
  try {
    const data = req.body;
    data.user = req.userId;
    const rec = await Receipt.create(data);
    res.status(201).send(rec);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: err.message });
  }
});


// Generate receipt directly from an invoice
router.post('/from-invoice/:invoiceId', auth, async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { paidAmount, paymentMethod, notes } = req.body;

    const invoice = await Invoice.findOne({ _id: invoiceId, user: req.userId });
    if (!invoice) return res.status(404).send({ message: 'Invoice not found' });

    // Calculate total properly including tax and discount
    const subtotal = invoice.items.reduce((sum, item) => sum + (item.amount || 0), 0);
    const taxAmount = invoice.taxPercent ? (subtotal * invoice.taxPercent / 100) : 0;
    const discountAmount = invoice.discount || 0;
    const total = subtotal + taxAmount - discountAmount;

    const receipt = await Receipt.create({
      user: req.userId,
      invoiceId: invoice._id,
      templateId: invoice.templateId,
      receiptNumber: `REC-${Date.now().toString().slice(-6)}`,
      date: new Date(),
      originalInvoiceNumber: invoice.invoiceNumber,
      originalInvoiceId: invoice._id,
      billTo: invoice.billTo,
      from: invoice.from,
      shipTo: invoice.shipTo,
      items: invoice.items,
      paidAmount: paidAmount || total,
      currency: invoice.currency,
      taxPercent: invoice.taxPercent,
      discount: invoice.discount,
      paymentMethod: paymentMethod || 'Bank Transfer',
      notes: notes || `Payment received for invoice ${invoice.invoiceNumber}`,
      paymentDate: new Date(),
    });

    res.status(201).send(receipt);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: err.message });
  }
});

// Get all user receipts
router.get('/', auth, async (req, res) => {
  try {
    const all = await Receipt.find({ user: req.userId }).populate('templateId');
    res.send(all);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: err.message });
  }
});

// Get single receipt
router.get('/:id', auth, async (req, res) => {
  try {
    const rec = await Receipt.findOne({ _id: req.params.id, user: req.userId }).populate('templateId');
    if (!rec) return res.status(403).send({ message: 'Not authorized' });
    res.send(rec);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: err.message });
  }
});

// Update receipt
router.put('/:id', auth, async (req, res) => {
  try {
    const rec = await Receipt.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!rec) return res.status(404).send({ message: 'Receipt not found' });
    res.send(rec);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: err.message });
  }
});

// Generate PDF
router.get('/:id/pdf', async (req, res) => {
  let userId = req.userId;
  if (!userId && req.query.token) {
    try {
      const decoded = jwt.verify(req.query.token, process.env.JWT_SECRET);
      userId = decoded.id;
    } catch (err) {
      return res.status(401).send({ message: "Invalid token in query" });
    }
  }

  try {
    const rec = await Receipt.findOne({ _id: req.params.id, user: userId }).populate("templateId");
    if (!rec) return res.status(403).send({ message: "Not authorized" });

    const template = rec.templateId
      ? rec.templateId.layoutJSON
      : (await Template.findOne({ type: "receipt" }))?.layoutJSON;

    const pdfBuffer = await pdfGen.generateReceiptPDF(rec, template);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=receipt_${rec._id}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: err.message });
  }
});

// Delete receipt
router.delete('/:id', auth, async (req, res) => {
  try {
    const rec = await Receipt.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!rec) return res.status(404).send({ message: 'Receipt not found' });
    res.send({ message: 'Receipt deleted successfully', id: rec._id });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: err.message });
  }
});

module.exports = router;