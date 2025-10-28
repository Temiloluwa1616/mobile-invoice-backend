const mongoose = require('mongoose');
const InvoiceSchema = new mongoose.Schema({
   logo: {
    type: String, // base64 encoded image
    required: false
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  invoiceNumber: String,
  date: Date,
  dueDate: Date,
  paymentTerms: String,
  poNumber: String,
  billTo: {
    name: String,
    address: String,
    email: String,
    phone: String
  },
  shipTo: {
    name: String,
    address: String
  },
  from: {
    name: String,
    address: String,
    email: String,
    phone: String
  },
  items: [
    {
      description: String,
      quantity: Number,
      rate: Number,
      amount: Number
    }
  ],
  
  currency: { type: String, default: 'NGN' },
  subtotalOptional: { type: Boolean, default: false },
  taxPercent: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  notes: String,
  templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Template' },
  color: { type: String, default: '#242a33ff' },
  type: { type: String, enum: ['invoice','receipt'], default: 'invoice' },
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Invoice', InvoiceSchema);