require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const invoiceRoutes = require('./routes/invoice');
const templateRoutes = require('./routes/template');
const receiptRoutes = require('./routes/receipt');

const app = express();
app.use(cors());
app.use(express.json());





// ensure pdf output dir
if (!fs.existsSync(process.env.PDF_OUTPUT_DIR || './generated_pdfs')) {
  fs.mkdirSync(process.env.PDF_OUTPUT_DIR || './generated_pdfs', { recursive: true });
}

app.use('/api/auth', authRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/receipts', receiptRoutes);

app.use('/api/templates', require('./routes/template'));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use('/previews', express.static(path.join(__dirname, 'public/previews')));


// serve generated pdfs (optional)
app.use('/pdfs', express.static(path.join(__dirname, process.env.PDF_OUTPUT_DIR)));

app.get("/ping", (req, res) => {
  res.send("pong");
});




const PORT = process.env.PORT || 4000;
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(()=> {
    console.log('Mongo connected');
   app.listen(4000, "0.0.0.0", () => {
  console.log("🚀 Server running on http://0.0.0.0:4000");
});

  })
  .catch(err => console.error(err));
