import PDFDocument from 'pdfkit';
import { format } from 'date-fns';

class PDFService {
  generateInvoice(order, supplier, buyer) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // Header
        doc.fontSize(20).font('Helvetica-Bold').text('INVOICE', 50, 50);
        doc.fontSize(10).font('Helvetica').text(`Invoice #: ${order.invoiceNumber || order.orderNumber}`, 50, 80);
        doc.text(`Date: ${format(new Date(order.createdAt), 'dd MMM yyyy')}`, 50, 95);
        doc.text(`Order #: ${order.orderNumber}`, 50, 110);

        // Supplier Info
        doc.fontSize(12).font('Helvetica-Bold').text('From:', 50, 150);
        doc.fontSize(10).font('Helvetica');
        doc.text(supplier.businessInfo?.businessName || supplier.fullName, 50, 165);
        if (supplier.businessInfo?.gstNumber) {
          doc.text(`GST: ${supplier.businessInfo.gstNumber}`, 50, 180);
        }
        doc.text(supplier.email, 50, 195);
        if (supplier.phone) doc.text(supplier.phone, 50, 210);

        // Buyer Info
        doc.fontSize(12).font('Helvetica-Bold').text('Bill To:', 300, 150);
        doc.fontSize(10).font('Helvetica');
        doc.text(buyer.businessInfo?.businessName || buyer.fullName, 300, 165);
        doc.text(order.deliveryAddress.street, 300, 180);
        doc.text(`${order.deliveryAddress.city}, ${order.deliveryAddress.state}`, 300, 195);
        doc.text(order.deliveryAddress.postalCode, 300, 210);

        // Items Table Header
        const tableTop = 260;
        doc.moveTo(50, tableTop).lineTo(550, tableTop).stroke();
        
        doc.font('Helvetica-Bold').fontSize(10);
        doc.text('Item', 50, tableTop + 10);
        doc.text('Qty', 280, tableTop + 10);
        doc.text('Unit Price', 350, tableTop + 10);
        doc.text('Amount', 450, tableTop + 10);
        
        doc.moveTo(50, tableTop + 30).lineTo(550, tableTop + 30).stroke();

        // Items
        let y = tableTop + 45;
        doc.font('Helvetica').fontSize(10);

        order.items.forEach((item) => {
          doc.text(item.productSnapshot.name, 50, y, { width: 220 });
          doc.text(`${item.quantity} ${item.productSnapshot.unit}`, 280, y);
          doc.text(`₹${item.unitPrice.toFixed(2)}`, 350, y);
          doc.text(`₹${item.subtotal.toFixed(2)}`, 450, y);
          y += 25;
        });

        // Totals
        y += 20;
        doc.moveTo(350, y).lineTo(550, y).stroke();
        y += 15;

        doc.text('Subtotal:', 350, y);
        doc.text(`₹${order.pricing.subtotal.toFixed(2)}`, 450, y);
        y += 20;

        if (order.pricing.discount > 0) {
          doc.text('Discount:', 350, y);
          doc.text(`-₹${order.pricing.discount.toFixed(2)}`, 450, y);
          y += 20;
        }

        if (order.pricing.deliveryCharge > 0) {
          doc.text('Delivery:', 350, y);
          doc.text(`₹${order.pricing.deliveryCharge.toFixed(2)}`, 450, y);
          y += 20;
        }

        if (order.pricing.tax > 0) {
          doc.text(`Tax (${order.pricing.taxRate}%):`, 350, y);
          doc.text(`₹${order.pricing.tax.toFixed(2)}`, 450, y);
          y += 20;
        }

        doc.moveTo(350, y).lineTo(550, y).stroke();
        y += 15;

        doc.font('Helvetica-Bold').fontSize(12);
        doc.text('Total:', 350, y);
        doc.text(`₹${order.pricing.total.toFixed(2)}`, 450, y);

        // Payment Status
        y += 40;
        doc.font('Helvetica').fontSize(10);
        doc.text(`Payment Method: ${order.payment.method === 'cod' ? 'Cash on Delivery' : 'Online Payment'}`, 50, y);
        doc.text(`Payment Status: ${order.payment.status.toUpperCase()}`, 50, y + 15);

        // Footer
        doc.fontSize(8).text('Thank you for your business!', 50, 720, { align: 'center', width: 500 });
        doc.text('This is a computer-generated invoice.', 50, 735, { align: 'center', width: 500 });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

export default new PDFService();
