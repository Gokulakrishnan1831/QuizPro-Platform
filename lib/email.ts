import nodemailer from 'nodemailer';

// Configure the nodemailer transporter
// Using Gmail as the default service for personal emails
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_EMAIL, // Your personal email (e.g., your.email@gmail.com)
        pass: process.env.SMTP_PASSWORD, // Your App Password (not your normal email password)
    },
});

export async function sendFeedbackReplyEmail(to: string, userName: string, subject: string, replyBody: string, threadUrl: string) {
    if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
        console.warn('SMTP_EMAIL or SMTP_PASSWORD is not set. Skipping email send.', { to, subject });
        return;
    }
    
    try {
        const info = await transporter.sendMail({
            from: `"Preplytics Support" <${process.env.SMTP_EMAIL}>`, // Sender address
            to: to, // List of receivers
            subject: `Re: ${subject}`,
            html: `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h2>Hi ${userName},</h2>
                    <p>An admin has replied to your feedback: <strong>"${subject}"</strong></p>
                    <blockquote style="border-left: 4px solid #ccc; padding-left: 10px; margin-left: 0;">
                        ${replyBody}
                    </blockquote>
                    <p>
                        <a href="${threadUrl}" style="background-color: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            View Full Thread
                        </a>
                    </p>
                    <p>Best,<br>Preplytics Team</p>
                </div>
            `,
        });
        console.log('Feedback reply email sent to', to, 'Message ID:', info.messageId);
    } catch (error) {
        console.error('Error sending feedback reply email:', error);
    }
}
