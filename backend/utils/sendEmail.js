const nodemailer = require('nodemailer');
const dns = require('node:dns');

// Force Node.js to resolve IPv4 first to prevent 90-second timeouts with Gmail's IPv6 servers
dns.setDefaultResultOrder('ipv4first');
const sendEmail = async (options) => {
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD, // For Gmail, this must be an "App Password"
        },
        // Force IPv4 if IPv6 is causing slow DNS resolution issues
        tls: {
            rejectUnauthorized: true
        }
    });

    const mailOptions = {
        from: `FoodFreaky <${process.env.EMAIL_USERNAME}>`,
        to: options.email,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments, // Add this line
    };

    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
