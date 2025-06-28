const { companyName } = require("../lib/companyName");

const verificationCodeTemplate = (code) => `
  <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: auto; background-color: #f3f4f6; padding: 30px;">
    <div style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
      
      <header style="background: linear-gradient(90deg, #4f46e5, #6366f1); padding: 24px; text-align: center; color: #ffffff;">
        <h2 style="margin: 0; font-size: 24px;">Welcome to ${companyName}</h2>
        <p style="margin: 6px 0 0; font-size: 14px;">Secure your account with the code below</p>
      </header>

      <main style="padding: 30px 25px;">
        <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 18px;">
          Hi there,
        </p>

        <p style="font-size: 16px; color: #374151; line-height: 1.6;">
          We received a request to verify your account on <strong>${companyName}</strong>. Please use the code below:
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <span style="display: inline-block; background-color: #eef2ff; color: #4f46e5; font-size: 30px; font-weight: bold; padding: 16px 32px; border-radius: 10px; letter-spacing: 4px;">
            ${code}
          </span>
        </div>

        <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
          This code will expire in <strong>5 minutes</strong>. If you didn't request this, you can safely ignore this email.
        </p>
      </main>

      <footer style="background-color: #f9fafb; text-align: center; padding: 16px; font-size: 12px; color: #9ca3af;">
        &copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.
      </footer>

    </div>
  </div>
`;

module.exports = verificationCodeTemplate;
