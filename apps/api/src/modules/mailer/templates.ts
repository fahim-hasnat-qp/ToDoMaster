/** Minimal, inline-styled email bodies — no external template engine needed for two emails. */

export function verifyEmailTemplate(verifyUrl: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Verify your email</h2>
      <p>Thanks for signing up for ToDoMaster. Click below to verify your email address:</p>
      <p><a href="${verifyUrl}" style="display:inline-block;padding:10px 20px;background:#6C8EF5;color:#fff;border-radius:8px;text-decoration:none;">Verify Email</a></p>
      <p>Or paste this link into your browser: ${verifyUrl}</p>
      <p style="color:#888;font-size:12px;">This link expires in 24 hours. If you didn't create this account, you can ignore this email.</p>
    </div>
  `;
}

export function passwordResetTemplate(resetUrl: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Reset your password</h2>
      <p>We received a request to reset your ToDoMaster password. Click below to choose a new one:</p>
      <p><a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#6C8EF5;color:#fff;border-radius:8px;text-decoration:none;">Reset Password</a></p>
      <p>Or paste this link into your browser: ${resetUrl}</p>
      <p style="color:#888;font-size:12px;">This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
    </div>
  `;
}
