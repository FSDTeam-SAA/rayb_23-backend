const config = require("../../config");
const sendEmailMessage = require("../../utils/sendMessageEmail");
const sendMessageTemplate = require("../../utils/sendMessageTemplate");

const sendMessage = async (payload) => {
  const { email, subject, message, phone, address } = payload;
  if ((!email || !subject || !message, !phone || !address)) {
    throw new Error("Please fill all the fields");
  }
  const result = await sendEmailMessage({
    from: email,
    to: config.email.adminEmail,
    subject,
    html: sendMessageTemplate({ email, subject, message }),
  });
  if (!result.success) {
    throw new Error(`Failed to send email: ${result.error}`);
  }

  return;
};

const contractService = {
  sendMessage,
};
module.exports = contractService;
