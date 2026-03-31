import { Resend } from 'resend';

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Generate secure 6-digit OTP using Math.random
 * @returns {string} 6-digit OTP
 */
const generateOTP = () => {
  // Generate random 6-digit number (100000 to 999999)
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Alternative OTP generation using string manipulation
 * @returns {string} 6-digit OTP
 */
const generateOTPAlt = () => {
  return Math.random().toString().slice(2, 8);
};

/**
 * Generate OTP expiry date (15 minutes from now)
 * @returns {Date} Expiry date
 */
const getOTPExpiry = () => {
  return new Date(Date.now() + 15 * 60 * 1000);
};

/**
 * Send email verification with OTP
 * @param {string} email - Recipient email
 * @param {string} otp - One-time password
 * @param {string} fullName - User's full name
 * @param {string} type - Type of email (verification/resend)
 * @returns {Promise<object>} Email sending result
 */
const sendEmailOTP = async (email, otp, fullName, type = 'verification') => {
  const year = new Date().getFullYear();
  const supportEmail = 'verification@titanblockchaincapital.com';
  
  const templates = {
    verification: {
      subject: '🔐 Verify Your Email | Titan Blockchain Capital',
      greeting: 'Welcome to Titan Blockchain Capital'
    },
    resend: {
      subject: '🔄 New Email Verification Code | Titan Blockchain Capital',
      greeting: 'Verification Code Refresh'
    }
  };
  
  const template = templates[type] || templates.verification;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${template.subject}</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: #f5f7fa;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }
        .container {
          max-width: 560px;
          margin: 40px auto;
          background: #ffffff;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 20px 35px -10px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #0A1C2F 0%, #0F2A3F 100%);
          padding: 48px 40px;
          text-align: center;
        }
        .logo {
          font-size: 32px;
          font-weight: 700;
          color: #FFD966;
          margin-bottom: 12px;
          letter-spacing: -0.5px;
        }
        .tagline {
          color: rgba(255,255,255,0.8);
          font-size: 14px;
        }
        .content {
          padding: 48px 40px;
        }
        .greeting {
          font-size: 24px;
          font-weight: 600;
          color: #1A2C3E;
          margin-bottom: 16px;
        }
        .message {
          color: #4A5B6E;
          line-height: 1.6;
          margin-bottom: 32px;
        }
        .otp-container {
          background: linear-gradient(135deg, #F8FBFE 0%, #F0F4F9 100%);
          border-radius: 16px;
          padding: 32px;
          text-align: center;
          margin: 32px 0;
          border: 1px solid #E2E8F0;
        }
        .otp-code {
          font-family: 'SF Mono', 'Monaco', monospace;
          font-size: 40px;
          font-weight: 700;
          letter-spacing: 12px;
          color: #0F2A3F;
          background: white;
          padding: 20px;
          border-radius: 12px;
          display: inline-block;
        }
        .expiry {
          color: #E67E22;
          font-size: 13px;
          margin-top: 16px;
        }
        .security-note {
          background: #FEF9E6;
          border-left: 3px solid #FFB347;
          padding: 16px 20px;
          border-radius: 12px;
          margin: 24px 0;
          font-size: 13px;
          color: #8B6B3D;
        }
        .footer {
          background: #F8FAFD;
          padding: 32px 40px;
          text-align: center;
          border-top: 1px solid #E8EDF2;
          font-size: 12px;
          color: #8A99A8;
        }
        .link {
          color: #0F2A3F;
          text-decoration: none;
        }
        @media (max-width: 600px) {
          .container { margin: 20px; }
          .content { padding: 32px 24px; }
          .otp-code { font-size: 28px; letter-spacing: 6px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">⚡ TITAN</div>
          <div class="tagline">Blockchain Capital</div>
        </div>
        <div class="content">
          <div class="greeting">${template.greeting}${fullName ? `, ${fullName}` : ''}</div>
          <div class="message">
            Thank you for choosing Titan Blockchain Capital. To secure your account and complete registration, please verify your email address using the code below.
          </div>
          <div class="otp-container">
            <div class="otp-code">${otp}</div>
            <div class="expiry">⏰ This code expires in 15 minutes</div>
          </div>
          <div class="security-note">
            🔒 <strong>Security First</strong><br>
            Never share this code with anyone. Titan Blockchain Capital will never ask for your verification code.
          </div>
          <div style="margin-top: 24px;">
            <p style="color: #8A99A8; font-size: 13px; margin: 0;">Need assistance?</p>
            <a href="mailto:${supportEmail}" style="color: #0F2A3F; text-decoration: none; font-weight: 500;">${supportEmail}</a>
          </div>
        </div>
        <div class="footer">
          <p>© ${year} Titan Blockchain Capital. All rights reserved.</p>
          <p style="margin-top: 12px;">Institutional-Grade Digital Asset Management</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
    TITAN BLOCKCHAIN CAPITAL - Email Verification
    
    ${template.greeting}${fullName ? `, ${fullName}` : ''}
    
    Your verification code is: ${otp}
    
    This code will expire in 15 minutes.
    
    Security Notice: Never share this code with anyone.
    
    Need help? Contact ${supportEmail}
    
    © ${year} Titan Blockchain Capital
  `;
  
  try {
    const { data, error } = await resend.emails.send({
      from: `Titan Blockchain Capital <verify@titanblockchaincapital.com>`,
      to: [email],
      subject: template.subject,
      html: html,
      text: text,
      headers: {
        'X-Priority': '1',
        'X-Mailer': 'Titan Verification System',
        'X-Entity-Ref-ID': `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }
    });
    
    if (error) throw error;
    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Email delivery failed:', error);
    throw new Error('Unable to send verification email. Please try again.');
  }
};

/**
 * Send SMS verification with OTP via Twilio
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} otp - One-time password
 * @param {string} countryCode - Country code (default: +1)
 * @returns {Promise<object>} SMS sending result
 */
const sendSMSOTP = async (phoneNumber, otp, countryCode = '+1') => {
  try {
    // Dynamic import for Twilio (optional - only if you want to use SMS)
    let twilioClient;
    try {
      const twilio = await import('twilio');
      twilioClient = twilio.default(
        process.env.TWILIO_ACCOUNT_SID, 
        process.env.TWILIO_AUTH_TOKEN
      );
    } catch (error) {
      console.warn('Twilio not configured, SMS will be logged only');
      console.log(`📱 SMS would be sent to ${countryCode}${phoneNumber} with OTP: ${otp}`);
      return { success: true, simulated: true, message: 'SMS would be sent here' };
    }
    
    const fullPhoneNumber = `${countryCode}${phoneNumber.replace(/\D/g, '')}`;
    
    const message = await twilioClient.messages.create({
      body: `🔐 TITAN BLOCKCHAIN CAPITAL\n\nYour verification code is: ${otp}\nValid for 15 minutes.\n\nNever share this code with anyone.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: fullPhoneNumber
    });
    
    return { success: true, sid: message.sid };
  } catch (error) {
    console.error('SMS delivery failed:', error);
    throw new Error('Unable to send SMS verification. Please try again.');
  }
};

/**
 * Send payment status email using Resend
 * @param {Object} params - Email parameters
 * @returns {Promise<object>} Email sending result
 */
const sendPaymentEmail = async ({ to, fullName, type, amount, dashboardUrl, reason }) => {
  const year = new Date().getFullYear();
  const supportEmail = 'support@titanblockchaincapital.com';
  
  const subjects = {
    submitted: '📩 Payment Receipt Received – Titan Blockchain Capital',
    approved: '✅ Payment Approved – Welcome to Titan Blockchain Capital',
    rejected: '❌ Payment Rejected – Titan Blockchain Capital',
  };

  const getHtmlBody = () => {
    switch(type) {
      case 'submitted':
        return `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${subjects.submitted}</title>
            <style>
              body { margin: 0; padding: 0; background-color: #f5f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; }
              .container { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 35px -10px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #0A1C2F 0%, #0F2A3F 100%); padding: 40px; text-align: center; }
              .logo { font-size: 28px; font-weight: 700; color: #FFD966; margin-bottom: 8px; }
              .content { padding: 40px; }
              h2 { color: #e4b84f; margin-top: 0; }
              .button { background: linear-gradient(135deg, #f6dea0 0%, #e4b84f 48%, #b47a15 100%); color: #000; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; }
              .footer { background: #F8FAFD; padding: 24px; text-align: center; font-size: 12px; color: #8A99A8; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">⚡ TITAN</div>
                <div style="color: rgba(255,255,255,0.8); font-size: 14px;">Blockchain Capital</div>
              </div>
              <div class="content">
                <h2>📩 Payment Receipt Received</h2>
                <p>Hi <strong>${fullName}</strong>,</p>
                <p>We have received your registration payment receipt of <strong>$${amount}</strong>.</p>
                <p>Your payment is currently <strong>under review</strong> by our admin team. You will be notified once it has been approved.</p>
                <div style="background: #FEF9E6; border-left: 3px solid #FFB347; padding: 16px; margin: 24px 0; border-radius: 8px;">
                  <p style="margin: 0; color: #8B6B3D; font-size: 13px;">🔒 <strong>Security Note:</strong> Never share your payment details with anyone.</p>
                </div>
                <p style="color: #888; font-size: 13px;">If you did not make this payment, please contact our support team immediately.</p>
              </div>
              <div class="footer">
                <p>© ${year} Titan Blockchain Capital. All rights reserved.</p>
                <p><a href="mailto:${supportEmail}" style="color: #0F2A3F;">${supportEmail}</a></p>
              </div>
            </div>
          </body>
          </html>
        `;
      
      case 'approved':
        return `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${subjects.approved}</title>
            <style>
              body { margin: 0; padding: 0; background-color: #f5f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; }
              .container { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 35px -10px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #0A1C2F 0%, #0F2A3F 100%); padding: 40px; text-align: center; }
              .logo { font-size: 28px; font-weight: 700; color: #FFD966; margin-bottom: 8px; }
              .content { padding: 40px; }
              h2 { color: #22c55e; margin-top: 0; }
              .button { background: linear-gradient(135deg, #f6dea0 0%, #e4b84f 48%, #b47a15 100%); color: #000; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; }
              .footer { background: #F8FAFD; padding: 24px; text-align: center; font-size: 12px; color: #8A99A8; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">⚡ TITAN</div>
                <div style="color: rgba(255,255,255,0.8); font-size: 14px;">Blockchain Capital</div>
              </div>
              <div class="content">
                <h2>✅ Payment Approved!</h2>
                <p>Hi <strong>${fullName}</strong>,</p>
                <p>Great news! Your registration payment of <strong>$${amount}</strong> has been <strong>approved</strong> and your account is now fully verified.</p>
                <p>You can now access your dashboard and start using all features of Titan Blockchain Capital.</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${dashboardUrl}" class="button">Go to Dashboard</a>
                </div>
                <p style="color: #888; font-size: 13px;">If the button doesn't work, copy and paste this link into your browser:<br/>
                  <a href="${dashboardUrl}" style="color: #e4b84f;">${dashboardUrl}</a>
                </p>
              </div>
              <div class="footer">
                <p>© ${year} Titan Blockchain Capital. All rights reserved.</p>
                <p><a href="mailto:${supportEmail}" style="color: #0F2A3F;">${supportEmail}</a></p>
              </div>
            </div>
          </body>
          </html>
        `;
      
      case 'rejected':
        return `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${subjects.rejected}</title>
            <style>
              body { margin: 0; padding: 0; background-color: #f5f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; }
              .container { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 35px -10px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #0A1C2F 0%, #0F2A3F 100%); padding: 40px; text-align: center; }
              .logo { font-size: 28px; font-weight: 700; color: #FFD966; margin-bottom: 8px; }
              .content { padding: 40px; }
              h2 { color: #ef4444; margin-top: 0; }
              .footer { background: #F8FAFD; padding: 24px; text-align: center; font-size: 12px; color: #8A99A8; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">⚡ TITAN</div>
                <div style="color: rgba(255,255,255,0.8); font-size: 14px;">Blockchain Capital</div>
              </div>
              <div class="content">
                <h2>❌ Payment Rejected</h2>
                <p>Hi <strong>${fullName}</strong>,</p>
                <p>Unfortunately, your registration payment of <strong>$${amount}</strong> could not be verified.</p>
                <div style="background: #FEF2F2; border-left: 3px solid #ef4444; padding: 16px; margin: 24px 0; border-radius: 8px;">
                  <p style="margin: 0; color: #991B1B; font-size: 13px;"><strong>Reason:</strong> ${reason}</p>
                </div>
                <p>Please resubmit your payment receipt with the correct details. If you believe this is an error, please contact our support team.</p>
              </div>
              <div class="footer">
                <p>© ${year} Titan Blockchain Capital. All rights reserved.</p>
                <p><a href="mailto:${supportEmail}" style="color: #0F2A3F;">${supportEmail}</a></p>
              </div>
            </div>
          </body>
          </html>
        `;
      
      default:
        return '';
    }
  };
  
  const getTextBody = () => {
    switch(type) {
      case 'submitted':
        return `TITAN BLOCKCHAIN CAPITAL - Payment Receipt Received\n\nHi ${fullName},\n\nWe have received your registration payment receipt of $${amount}.\n\nYour payment is currently under review by our admin team. You will be notified once it has been approved.\n\nIf you did not make this payment, please contact our support team immediately.\n\nBest regards,\nTitan Blockchain Capital Team`;
      
      case 'approved':
        return `TITAN BLOCKCHAIN CAPITAL - Payment Approved!\n\nHi ${fullName},\n\nGreat news! Your registration payment of $${amount} has been approved and your account is now fully verified.\n\nYou can now access your dashboard: ${dashboardUrl}\n\nBest regards,\nTitan Blockchain Capital Team`;
      
      case 'rejected':
        return `TITAN BLOCKCHAIN CAPITAL - Payment Rejected\n\nHi ${fullName},\n\nUnfortunately, your registration payment of $${amount} could not be verified.\n\nReason: ${reason}\n\nPlease resubmit your payment receipt with the correct details.\n\nBest regards,\nTitan Blockchain Capital Team`;
      
      default:
        return '';
    }
  };
  
  try {
    const { data, error } = await resend.emails.send({
      from: `Titan Blockchain Capital <notifications@titanblockchaincapital.com>`,
      to: [to],
      subject: subjects[type],
      html: getHtmlBody(),
      text: getTextBody(),
      headers: {
        'X-Priority': '1',
        'X-Mailer': 'Titan Payment System',
        'X-Entity-Ref-ID': `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }
    });
    
    if (error) throw error;
    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Payment email delivery failed:', error);
    // Don't throw error - email failure shouldn't break payment submission
    console.log('⚠️ Email failed but payment was recorded');
    return { success: false, error: error.message };
  }
};

export { 
  generateOTP, 
  getOTPExpiry, 
  sendEmailOTP, 
  sendSMSOTP,
  sendPaymentEmail
};