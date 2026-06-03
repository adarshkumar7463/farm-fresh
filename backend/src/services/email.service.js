import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendEmail({ to, subject, html, text }) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to,
        subject,
        html,
        text,
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent: ${info.messageId}`);
      return info;
    } catch (error) {
      logger.error('Email send error:', error);
      throw error;
    }
  }

  async sendVerificationEmail(user, otp) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .otp-box { background: white; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; border: 2px dashed #22c55e; }
          .otp { font-size: 32px; font-weight: bold; color: #22c55e; letter-spacing: 8px; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🥬 FarmFlow</h1>
            <p>Verify Your Email</p>
          </div>
          <div class="content">
            <p>Hi ${user.firstName},</p>
            <p>Welcome to FarmFlow! Please use the following OTP to verify your email address:</p>
            <div class="otp-box">
              <p class="otp">${otp}</p>
            </div>
            <p>This OTP will expire in 10 minutes.</p>
            <p>If you didn't create an account with FarmFlow, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} FarmFlow. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: user.email,
      subject: 'Verify Your Email - FarmFlow',
      html,
      text: `Your FarmFlow verification OTP is: ${otp}. This OTP will expire in 10 minutes.`,
    });
  }

  async sendPasswordResetEmail(user, otp) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .otp-box { background: white; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; border: 2px dashed #f59e0b; }
          .otp { font-size: 32px; font-weight: bold; color: #f59e0b; letter-spacing: 8px; }
          .warning { background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-top: 20px; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🥬 FarmFlow</h1>
            <p>Password Reset Request</p>
          </div>
          <div class="content">
            <p>Hi ${user.firstName},</p>
            <p>We received a request to reset your password. Use the following OTP to proceed:</p>
            <div class="otp-box">
              <p class="otp">${otp}</p>
            </div>
            <p>This OTP will expire in 10 minutes.</p>
            <div class="warning">
              <strong>⚠️ Security Notice:</strong> If you didn't request a password reset, please ignore this email and ensure your account is secure.
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} FarmFlow. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: user.email,
      subject: 'Password Reset - FarmFlow',
      html,
      text: `Your FarmFlow password reset OTP is: ${otp}. This OTP will expire in 10 minutes.`,
    });
  }

  async sendOrderConfirmationEmail(user, order) {
    const itemsList = order.items
      .map((item) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.productSnapshot.name}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity} ${item.productSnapshot.unit}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${item.subtotal.toFixed(2)}</td>
        </tr>
      `)
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .order-number { background: white; padding: 15px; border-radius: 8px; text-align: center; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; }
          th { background: #f3f4f6; padding: 12px; text-align: left; }
          .total-row { font-weight: bold; font-size: 18px; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🥬 FarmFlow</h1>
            <p>Order Confirmed! 🎉</p>
          </div>
          <div class="content">
            <p>Hi ${user.firstName},</p>
            <p>Thank you for your order! Here are the details:</p>
            
            <div class="order-number">
              <p style="margin: 0; color: #6b7280;">Order Number</p>
              <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #22c55e;">${order.orderNumber}</p>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th style="text-align: center;">Quantity</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsList}
                <tr class="total-row">
                  <td colspan="2" style="padding: 15px; text-align: right;">Total:</td>
                  <td style="padding: 15px; text-align: right; color: #22c55e;">₹${order.pricing.total.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <div style="margin-top: 20px; background: white; padding: 15px; border-radius: 8px;">
              <h3 style="margin-top: 0;">Delivery Address</h3>
              <p style="margin: 0;">
                ${order.deliveryAddress.street}<br>
                ${order.deliveryAddress.city}, ${order.deliveryAddress.state} ${order.deliveryAddress.postalCode}
              </p>
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} FarmFlow. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: user.email,
      subject: `Order Confirmed - ${order.orderNumber} - FarmFlow`,
      html,
      text: `Your FarmFlow order ${order.orderNumber} has been confirmed. Total: ₹${order.pricing.total.toFixed(2)}`,
    });
  }

  async sendOrderStatusUpdateEmail(user, order, status) {
    const statusMessages = {
      confirmed: 'Your order has been confirmed by the supplier.',
      processing: 'Your order is being prepared.',
      packed: 'Your order has been packed and is ready for dispatch.',
      out_for_delivery: 'Your order is out for delivery!',
      delivered: 'Your order has been delivered. Enjoy your fresh produce!',
      cancelled: 'Your order has been cancelled.',
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; text-transform: uppercase; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🥬 FarmFlow</h1>
            <p>Order Update</p>
          </div>
          <div class="content">
            <p>Hi ${user.firstName},</p>
            <p>Your order <strong>${order.orderNumber}</strong> has been updated:</p>
            <div style="text-align: center; margin: 30px 0;">
              <span class="status-badge" style="background: ${status === 'cancelled' ? '#fef2f2' : '#dcfce7'}; color: ${status === 'cancelled' ? '#dc2626' : '#16a34a'};">
                ${status.replace(/_/g, ' ')}
              </span>
            </div>
            <p>${statusMessages[status] || 'Your order status has been updated.'}</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} FarmFlow. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: user.email,
      subject: `Order ${status.replace(/_/g, ' ').toUpperCase()} - ${order.orderNumber} - FarmFlow`,
      html,
      text: `Your FarmFlow order ${order.orderNumber} status: ${status}. ${statusMessages[status]}`,
    });
  }
}

export default new EmailService();
