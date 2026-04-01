const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false, // SSL
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
    },
});

const sendEmail = async ({ to, subject, html }) => {
    try {
        await transporter.sendMail({
            from: `"Skin Routine" <${process.env.SUPPORT_EMAIL}>`,
            to,
            subject,
            html,
        });
        console.log("Email sent");
    } catch (error) {
        console.error("Email error:", error);
    }
};

module.exports = sendEmail