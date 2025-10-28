// server/utils/enhancedPdfGenerator.js
const PDFDocument = require('pdfkit');
const streamBuffers = require('stream-buffers');

class ProfessionalPDFGenerator {
  constructor(doc) {
    this.doc = doc;
    this.pageWidth = doc.page.width;
    this.pageHeight = doc.page.height;
    this.margins = { top: 50, right: 40, bottom: 60, left: 40 };
    this.contentWidth = this.pageWidth - this.margins.left - this.margins.right;
    this.currentY = this.margins.top;
  }

  // Header exactly like first image
  drawHeader(companyName, invoiceData, logo = null, primaryColor = null) {
    this.currentY = this.margins.top;
    const color = primaryColor || '#2c3e50';
    
    // LEFT SIDE: Company info
    if (logo) {
      try {
        const logoBuffer = Buffer.from(logo, 'base64');
        this.doc.image(logoBuffer, this.margins.left, this.currentY, {
          width: 60,
          height: 25,
          fit: [60, 25]
        });
        this.currentY += 30;
      } catch (error) {
        console.error('Logo rendering error:', error);
      }
    }
    
    // Company name
    this.doc.fillColor('#000000')
          .font('Helvetica-Bold')
          .fontSize(14)
          .text(companyName, this.margins.left, this.currentY);
    
    this.currentY += 16;
    
    // Company address
    this.doc.fillColor('#666666')
          .font('Helvetica')
          .fontSize(9)
          .text(invoiceData.companyAddress || 'Your Company Address', this.margins.left, this.currentY);
    
    this.currentY += 20;
    
    // RIGHT SIDE: Invoice title and number
    const rightX = this.pageWidth - this.margins.right - 120;
    
    // "INVOICE" title
    this.doc.fillColor('#000000')
          .font('Helvetica-Bold')
          .fontSize(20)
          .text('INVOICE', rightX, this.margins.top);
    
    // Invoice number
    this.doc.fillColor('#666666')
          .font('Helvetica-Bold')
          .fontSize(10)
          .text(invoiceData.invoiceNumber || 'INV-0001', rightX, this.margins.top + 25);
    
    this.currentY = Math.max(this.currentY, this.margins.top + 50);
    return this.currentY;
  }

  // Bill To section exactly like first image
  drawBillTo(billToData, primaryColor = null) {
    const sectionY = this.currentY;
    
    // "BILL TO" header
    this.doc.fillColor('#000000')
          .font('Helvetica-Bold')
          .fontSize(11)
          .text('BILL TO:', this.margins.left, sectionY);
    
    // Client information
    let contentY = sectionY + 15;
    
    const billToContent = [
      billToData.name,
      billToData.address,
      billToData.phone ? `Phone: ${billToData.phone}` : null,
      billToData.email ? `Email: ${billToData.email}` : null
    ].filter(Boolean);
    
    this.doc.fillColor('#000000')
          .font('Helvetica')
          .fontSize(10);
    
    billToContent.forEach(line => {
      if (line) {
        this.doc.text(line, this.margins.left, contentY);
        contentY += 12;
      }
    });
    
    this.currentY = contentY + 25;
    return this.currentY;
  }

  // Invoice details exactly like first image - right side
  drawInvoiceDetails(invoiceData, currency, primaryColor = null) {
    const detailsX = this.pageWidth - this.margins.right - 150;
    const startY = this.margins.top + 50;
    
    let contentY = startY;
    const symbol = currencySymbols[currency] || '₦';
    
    const details = [
      { label: 'Date:', value: invoiceData.date },
      { label: 'Payment Terms:', value: invoiceData.paymentTerms },
      { label: 'Due Date:', value: invoiceData.dueDate },
      { label: 'Balance Due:', value: invoiceData.balanceDue }
    ];
    
    details.forEach((detail, index) => {
      const yPos = contentY + (index * 18);
      this.doc.fillColor('#666666')
            .font('Helvetica-Bold')
            .fontSize(9)
            .text(detail.label, detailsX, yPos)
            .font('Helvetica')
            .text(detail.value || '-', detailsX + 60, yPos);
    });
    
    return this.currentY;
  }

  // Table EXACTLY like first image - clean with colored header only
  drawTable(headers, rows, currency, primaryColor = null) {
    const color = primaryColor || '#2c3e50';
    const tableTop = this.currentY;
    const rowHeight = 25;
    const headerHeight = 30;
    
    // Column widths matching first image
    const columnWidths = [280, 80, 80, 80];
    const symbol = currencySymbols[currency] || '₦';
    
    // TABLE HEADER with color background (like first image)
    this.doc.fillColor(color)
          .rect(this.margins.left, tableTop, this.contentWidth, headerHeight)
          .fill();
    
    // Header text - WHITE on colored background
    this.doc.fillColor('#ffffff')
          .font('Helvetica-Bold')
          .fontSize(11);
    
    let currentX = this.margins.left;
    headers.forEach((header, index) => {
      const align = index === 0 ? 'left' : 'right';
      this.doc.text(header, currentX + 10, tableTop + 9, {
        width: columnWidths[index] - 20,
        align: align
      });
      currentX += columnWidths[index];
    });
    
    // TABLE ROWS - clean white background with black text (like first image)
    let currentY = tableTop + headerHeight;
    
    rows.forEach((row, rowIndex) => {
      // ALL ROWS WHITE BACKGROUND - no alternating colors
      this.doc.fillColor('#ffffff')
            .rect(this.margins.left, currentY, this.contentWidth, rowHeight)
            .fill();
      
      // Row content - BLACK TEXT on white background
      this.doc.fillColor('#000000')
            .font('Helvetica')  // Regular font for items
            .fontSize(10);
      
      currentX = this.margins.left;
      
      row.forEach((cell, cellIndex) => {
        const align = cellIndex === 0 ? 'left' : 'right';
        this.doc.text(cell, currentX + 10, currentY + 8, {
          width: columnWidths[cellIndex] - 20,
          align: align
        });
        currentX += columnWidths[cellIndex];
      });
      
      // Add subtle border between rows (like first image)
      this.doc.strokeColor('#f0f0f0')
            .lineWidth(1)
            .moveTo(this.margins.left, currentY + rowHeight)
            .lineTo(this.pageWidth - this.margins.right, currentY + rowHeight)
            .stroke();
      
      currentY += rowHeight;
    });
    
    // Add bottom border to table
    this.doc.strokeColor('#cccccc')
          .lineWidth(1)
          .moveTo(this.margins.left, currentY)
          .lineTo(this.pageWidth - this.margins.right, currentY)
          .stroke();
    
    this.currentY = currentY + 25;
    return this.currentY;
  }

  // Summary section exactly like first image
  drawSummary(data, currency, primaryColor = null) {
    const color = primaryColor || '#2c3e50';
    const summaryWidth = 200;
    const summaryX = this.pageWidth - this.margins.right - summaryWidth;
    const symbol = currencySymbols[currency] || '₦';
    
    let currentY = this.currentY;
    
    data.forEach((item, index) => {
      const isTotal = index === data.length - 1;
      
      if (isTotal) {
        // Add separator before total
        this.doc.strokeColor(color)
              .lineWidth(1)
              .moveTo(summaryX, currentY - 5)
              .lineTo(summaryX + summaryWidth, currentY - 5)
              .stroke();
        currentY += 8;
      }
      
      this.doc.fillColor('#000000')
            .font(isTotal ? 'Helvetica-Bold' : 'Helvetica')
            .fontSize(isTotal ? 12 : 10);
      
      // Label
      this.doc.text(item.label, summaryX, currentY, { 
        width: 120, 
        align: 'left' 
      });
      
      // Value
      const formattedValue = `${symbol}${item.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      this.doc.text(formattedValue, summaryX + 120, currentY, { 
        width: 80, 
        align: 'right' 
      });
      
      currentY += 18;
    });
    
    this.currentY = currentY + 30;
    return this.currentY;
  }

  // Footer exactly like first image
  drawFooter(notes, paymentInfo, primaryColor = null) {
    const footerY = this.pageHeight - 40;
    
    // Notes section
    if (notes) {
      this.doc.fillColor('#666666')
            .font('Helvetica')
            .fontSize(8)
            .text(`Notes: ${notes}`, this.margins.left, footerY, {
              width: this.contentWidth / 2,
              align: 'left'
            });
    }
    
    // Payment information
    if (paymentInfo) {
      this.doc.fillColor('#666666')
            .font('Helvetica')
            .fontSize(8)
            .text(paymentInfo, this.margins.left, footerY + 12, {
              width: this.contentWidth / 2,
              align: 'left'
            });
    }
    
    // Thank you message
    this.doc.fillColor('#000000')
          .font('Helvetica-Bold')
          .fontSize(9)
          .text('Thank you for your business!', 0, this.pageHeight - 20, {
            width: this.pageWidth,
            align: 'center'
          });
  }
}

const currencySymbols = { 
  USD: '$', NGN: '₦', EUR: '€', GBP: '£', JPY: '¥', 
  CAD: 'C$', AUD: 'A$', INR: '₹', CNY: '¥'
};

/**
 * Generate PDF exactly matching your first image
 */
async function generateInvoicePDF(invoice, template = {}) {
  const doc = new PDFDocument({
    margin: 0, 
    size: 'A4',
    bufferPages: true
  });
  
  const stream = new streamBuffers.WritableStreamBuffer();
  doc.pipe(stream);

  const generator = new ProfessionalPDFGenerator(doc);
  const currency = invoice.currency || 'NGN';
  const primaryColor = template.color || '#2c3e50';

  try {
    // Prepare invoice data
    const invoiceData = {
      invoiceNumber: invoice.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
      date: new Date(invoice.date || Date.now()).toLocaleDateString('en-GB'),
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-GB') : '-',
      paymentTerms: invoice.paymentTerms || 'Net 30',
      balanceDue: `${currencySymbols[currency]}${(invoice.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      companyAddress: invoice.from?.address || 'Your Company Address'
    };

    // Header
    generator.drawHeader(
      invoice.from?.name || 'Your Company Name',
      invoiceData,
      invoice.logo,
      primaryColor
    );

    // Bill To section
    generator.drawBillTo(
      {
        name: invoice.billTo?.name || 'Client Name',
        address: invoice.billTo?.address || 'Client Address',
        phone: invoice.billTo?.phone,
        email: invoice.billTo?.email
      },
      primaryColor
    );

    // Invoice details on right side
    generator.drawInvoiceDetails(invoiceData, currency, primaryColor);

    // Table with colored header only
    const headers = ['Item', 'Quantity', 'Rate', 'Amount'];
    
    const rows = (invoice.items || [{
      description: 'No items listed',
      rate: 0,
      quantity: 0,
      amount: 0
    }]).map((item) => [
      item.description || 'Product/Service',
      (item.quantity || 0).toString(),
      `${currencySymbols[currency]}${(item.rate || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `${currencySymbols[currency]}${(item.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ]);

    generator.drawTable(headers, rows, currency, primaryColor);

    // Calculate summary
    const subtotal = invoice.items?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
    const taxAmount = invoice.taxRate ? (subtotal * invoice.taxRate / 100) : (invoice.taxAmount || 0);
    const discountAmount = invoice.discount || 0;
    const total = subtotal + taxAmount - discountAmount;

    const summaryData = [
      { label: 'Subtotal:', value: subtotal }
    ];

    if (taxAmount > 0) {
      const taxLabel = invoice.taxRate ? `Tax (${invoice.taxRate}%):` : 'Tax:';
      summaryData.push({ label: taxLabel, value: taxAmount });
    }

    if (discountAmount > 0) {
      summaryData.push({ label: 'Discount:', value: -discountAmount });
    }

    summaryData.push({ label: 'TOTAL:', value: total });

    generator.drawSummary(summaryData, currency, primaryColor);

    // Footer
    const paymentInfo = invoice.paymentInfo || (invoice.from?.bankDetails ? `Bank Transfer: ${invoice.from.bankDetails}` : '');
    
    generator.drawFooter(
      invoice.notes,
      paymentInfo,
      primaryColor
    );

  } catch (error) {
    console.error('PDF Generation Error:', error);
    doc.font('Helvetica')
       .fontSize(12)
       .text('Error generating PDF: ' + error.message, 50, 50);
  }

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(stream.getContents()));
    stream.on('error', reject);
  });
}

/**
 * Generate Receipt PDF with same structure
 */
async function generateReceiptPDF(receipt, template = {}) {
  const doc = new PDFDocument({
    margin: 0, 
    size: 'A4',
    bufferPages: true
  });
  
  const stream = new streamBuffers.WritableStreamBuffer();
  doc.pipe(stream);

  const generator = new ProfessionalPDFGenerator(doc);
  const currency = receipt.currency || 'NGN';
  const primaryColor = template.color || '#22c55e';

  try {
    // Prepare receipt data
    const receiptData = {
      receiptNumber: receipt.receiptNumber || `REC-${Date.now().toString().slice(-6)}`,
      date: new Date(receipt.date || Date.now()).toLocaleDateString('en-GB'),
      paymentDate: new Date(receipt.paymentDate || Date.now()).toLocaleDateString('en-GB'),
      paymentMethod: receipt.paymentMethod || 'Cash/Card',
      amountPaid: `${currencySymbols[currency]}${(receipt.paidAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      companyAddress: receipt.from?.address || 'Your Company Address'
    };

    // Header with RECEIPT title
    generator.drawHeader(
      receipt.from?.name || 'Your Company Name',
      {
        ...receiptData,
        invoiceNumber: receiptData.receiptNumber
      },
      receipt.logo,
      primaryColor
    );

    // Override the invoice title with RECEIPT
    const rightX = generator.pageWidth - generator.margins.right - 120;
    generator.doc.fillColor('#000000')
          .font('Helvetica-Bold')
          .fontSize(20)
          .text('RECEIPT', rightX, generator.margins.top);

    // Draw Paid By section
    generator.drawBillTo(
      {
        name: receipt.billTo?.name || 'Client Name',
        address: receipt.billTo?.address || 'Client Address',
        phone: receipt.billTo?.phone,
        email: receipt.billTo?.email
      },
      primaryColor
    );

    // Receipt details on right side
    const detailsX = generator.pageWidth - generator.margins.right - 150;
    const startY = generator.margins.top + 50;
    
    let contentY = startY;
    
    const receiptDetails = [
      { label: 'Receipt Date:', value: receiptData.date },
      { label: 'Payment Date:', value: receiptData.paymentDate },
      { label: 'Payment Method:', value: receiptData.paymentMethod },
      { label: 'Amount Paid:', value: receiptData.amountPaid }
    ];

    receiptDetails.forEach((detail, index) => {
      const yPos = contentY + (index * 18);
      generator.doc.fillColor('#666666')
            .font('Helvetica-Bold')
            .fontSize(9)
            .text(detail.label, detailsX, yPos)
            .font('Helvetica')
            .text(detail.value || '-', detailsX + 70, yPos);
    });

    // Table for receipt items
    const headers = ['Description', 'Quantity', 'Rate', 'Amount'];
    
    const rows = (receipt.items || [{
      description: 'Payment Received',
      rate: receipt.paidAmount || 0,
      quantity: 1,
      amount: receipt.paidAmount || 0
    }]).map((item) => [
      item.description || 'Payment',
      (item.quantity || 1).toString(),
      `${currencySymbols[currency]}${(item.rate || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `${currencySymbols[currency]}${(item.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ]);

    generator.drawTable(headers, rows, currency, primaryColor);

    // Payment summary
    const paidAmount = receipt.paidAmount || receipt.items?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;

    const summaryData = [
      { label: 'Amount Paid:', value: paidAmount },
      { label: 'TOTAL PAID:', value: paidAmount }
    ];

    generator.drawSummary(summaryData, currency, primaryColor);

    // Success message
    generator.doc.fillColor(primaryColor)
           .font('Helvetica-Bold')
           .fontSize(14)
           .text('✓ PAYMENT CONFIRMED', 0, generator.currentY + 10, {
             width: generator.pageWidth,
             align: 'center'
           });

    generator.currentY += 40;

    // Footer
    const paymentInfo = receipt.paymentInfo || (receipt.from?.bankDetails ? `Bank: ${receipt.from.bankDetails}` : '');
    
    generator.drawFooter(
      receipt.notes || 'Payment received successfully. Thank you!',
      paymentInfo,
      primaryColor
    );

  } catch (error) {
    console.error('PDF Generation Error:', error);
    doc.font('Helvetica')
       .fontSize(12)
       .text('Error generating PDF: ' + error.message, 50, 50);
  }

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(stream.getContents()));
    stream.on('error', reject);
  });
}

module.exports = { 
  generateInvoicePDF,
  generateReceiptPDF
};