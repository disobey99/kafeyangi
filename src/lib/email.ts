import nodemailer from "nodemailer";

function smtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim(),
  );
}

export function isEmailConfigured() {
  return smtpConfigured();
}

function getTransporter() {
  if (!smtpConfigured()) {
    throw new Error("SMTP sozlanmagan");
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER!.trim();
  // App Password bo'shliqlari bo'lsa ham ishlasin
  const pass = process.env.SMTP_PASS!.replace(/\s+/g, "");
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST!.trim(),
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  const from =
    process.env.EMAIL_FROM?.trim() ||
    `Nookline <${process.env.SMTP_USER}>`;

  const transporter = getTransporter();
  await transporter.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html ?? `<p>${input.text.replace(/\n/g, "<br/>")}</p>`,
  });
}

export async function sendPasswordResetCode(to: string, code: string) {
  const subject = "Nookline — parolni tiklash kodi";
  const text = [
    "Parolni tiklash uchun kod:",
    "",
    code,
    "",
    "Kod 15 daqiqa amal qiladi.",
    "Agar bu so'rovni siz yubormagan bo'lsangiz, e'tibor bermang.",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:420px;margin:0 auto;padding:24px;color:#1c1917">
      <p style="margin:0 0 12px;font-size:16px">Parolni tiklash uchun kod:</p>
      <p style="margin:0 0 16px;font-size:32px;font-weight:700;letter-spacing:0.2em;color:#16a398">${code}</p>
      <p style="margin:0;font-size:13px;color:#78716c">Kod 15 daqiqa amal qiladi. So'rovni siz yubormagan bo'lsangiz, e'tibor bermang.</p>
    </div>
  `;

  await sendEmail({ to, subject, text, html });
}
