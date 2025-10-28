// server/models/receipt.js
const mongoose = require('mongoose');

const ReceiptSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  receiptNumber: String,
  date: Date,
  paymentDate: Date,
  originalInvoiceNumber: String,
  originalInvoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  billTo: {
    name: String,
    address: String,
    email: String,
    phone: String
  },
  from: {
    name: String,
    address: String,
    email: String,
    phone: String
  },
  shipTo: {
    name: String,
    address: String
  },
  items: [
    {
      description: String,
      quantity: Number,
      rate: Number,
      amount: Number
    }
  ],
  paidAmount: Number,
  currency: { type: String, default: 'NGN' },
  taxPercent: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  paymentMethod: String,
  notes: String,
  templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Template' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Receipt', ReceiptSchema);