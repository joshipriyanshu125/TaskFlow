import nodemailer from "nodemailer";
import { config } from "../config.js";

// Gmail SMTP configuration
const gmailUser = process.env.SMTP_USER;
const gmailPass = process.env.SMTP_PASS;

let transporter = null;

if (gmailUser && gmailPass) {
  try {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });
    console.log("[Email] Gmail transporter initialized successfully");
  } catch (error) {
    console.error("[Email] Failed to initialize Gmail transporter:", error.message);
  }
} else {
  console.warn("[Email] Gmail credentials not found in .env - emails will fail");
}

export async function sendEmail({ to, subject, html, text }) {
  if (!transporter) {
    console.error("[Email] Transporter not available - check SMTP_USER and SMTP_PASS in .env");
    return { success: false, message: "Email service not configured" };
  }

  if (!to) {
    return { success: false, message: "Recipient email is required" };
  }

  try {
    const info = await transporter.sendMail({
      from: config.smtp.from || `"TaskFlow" <${gmailUser}>`,
      to,
      subject,
      text: text || html?.replace(/<[^>]*>?/gm, "") || "",
      html,
    });

    console.log(`[Email] Sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Email] Failed to send to ${to}:`, error.message);

    // Handle Gmail specific errors
    if (error.code === 'EAUTH') {
      console.error("[Email] Authentication failed - check Gmail app password settings");
    }

    return { success: false, error: error.message };
  }
}

export async function sendWelcomeEmail(user) {
  return sendEmail({
    to: user.email,
    subject: "Welcome to TaskFlow!",
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #C25508;">Hello ${user.name},</h2>
        <p>Welcome to TaskFlow! Your account has been created successfully.</p>
        <p>You can now start creating tasks and organizing your work.</p>
        <p style="color: #666; font-size: 14px;">- The TaskFlow Team</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(user, resetToken) {
  const resetUrl = `${config.clientOrigin}/reset-password?token=${resetToken}`;
  return sendEmail({
    to: user.email,
    subject: "TaskFlow - Reset Your Password",
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #C25508;">Hello ${user.name},</h2>
        <p>We received a request to reset your password for your TaskFlow account.</p>
        <p>Click the button below to create a new password:</p>
        <div style="margin: 32px 0; text-align: center;">
          <a href="${resetUrl}" style="background: #C25508; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
        <p style="background: #f5f5f5; padding: 12px; border-radius: 6px; word-break: break-all; font-size: 12px;">${resetUrl}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 12px;">This link will expire in 1 hour. If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
      </div>
    `,
  });
}

// For registered users already in the system - adds them and sends notification
export async function sendWorkspaceInvitationEmail({ to, inviterName, workspaceName, role }) {
  const loginUrl = `${config.clientOrigin || 'http://localhost:5173'}`;
  return sendEmail({
    to,
    subject: `You've been invited to join "${workspaceName}" on TaskFlow`,
    html: `
      <div style="font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #FAF7F2; padding: 32px; border-radius: 16px; border: 1px solid rgba(87, 83, 78, 0.15);">
        <h1 style="color: #C25508; font-size: 24px; margin: 0 0 24px 0; font-family: serif;">TaskFlow</h1>
        <h2 style="color: #1C1917; font-size: 20px; margin-bottom: 12px;">Workspace Invitation</h2>
        <p style="color: #57534E; font-size: 15px; line-height: 1.6;">
          <strong>${inviterName || 'A teammate'}</strong> has added you to the <strong>${workspaceName}</strong> workspace as a <strong>${role || 'member'}</strong>.
        </p>
        <p style="color: #57534E; font-size: 15px; line-height: 1.6;">
          You can now collaborate on tasks, assign action items, and organize your work together in real-time.
        </p>
        <div style="margin: 28px 0; text-align: center;">
          <a href="${loginUrl}" style="background: #C25508; color: #FFFFFF; padding: 14px 28px; text-decoration: none; border-radius: 100px; font-weight: 600; display: inline-block; font-size: 15px;">
            Open TaskFlow &amp; Get Started
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid rgba(87, 83, 78, 0.15); margin: 24px 0;">
        <p style="color: #8A847C; font-size: 13px; margin: 0;">- The TaskFlow Team</p>
      </div>
    `,
  });
}

// For non-registered users - sends a signup invitation link
export async function sendWorkspaceInviteToNewUser({ to, inviterName, workspaceName, role, signupLink }) {
  const finalLink = signupLink || `${config.clientOrigin || 'http://localhost:5173'}`;
  return sendEmail({
    to,
    subject: `${inviterName || 'Someone'} invited you to join "${workspaceName}" on TaskFlow`,
    html: `
      <div style="font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #FAF7F2; padding: 32px; border-radius: 16px; border: 1px solid rgba(87, 83, 78, 0.15);">
        <h1 style="color: #C25508; font-size: 24px; margin: 0 0 24px 0; font-family: serif;">TaskFlow</h1>
        <h2 style="color: #1C1917; font-size: 20px; margin-bottom: 12px;">You're Invited!</h2>
        <p style="color: #57534E; font-size: 15px; line-height: 1.6;">
          <strong>${inviterName || 'A teammate'}</strong> has invited you to join the <strong>${workspaceName}</strong> workspace on TaskFlow as a <strong>${role || 'member'}</strong>.
        </p>
        <p style="color: #57534E; font-size: 15px; line-height: 1.6;">
          TaskFlow is a collaborative task management platform. Create a free account to start working together with your team.
        </p>
        <div style="margin: 28px 0; text-align: center;">
          <a href="${finalLink}" style="background: #C25508; color: #FFFFFF; padding: 14px 28px; text-decoration: none; border-radius: 100px; font-weight: 600; display: inline-block; font-size: 15px;">
            Accept Invitation &amp; Sign Up
          </a>
        </div>
        <div style="background: #F0EBE3; border-radius: 10px; padding: 14px 18px; margin-bottom: 20px;">
          <p style="color: #57534E; font-size: 13px; margin: 0;">
            <strong>Tip:</strong> Sign up using this email address (<strong>${to}</strong>) so your invitation is automatically recognized.
          </p>
        </div>
        <hr style="border: none; border-top: 1px solid rgba(87, 83, 78, 0.15); margin: 24px 0;">
        <p style="color: #8A847C; font-size: 13px; margin: 0;">- The TaskFlow Team</p>
      </div>
    `,
  });
}

// Team invitation email
export async function sendTeamInvitationEmail({ to, inviterName, teamName, workspaceName, role }) {
  const loginUrl = `${config.clientOrigin || 'http://localhost:5173'}`;
  return sendEmail({
    to,
    subject: `${inviterName || 'A teammate'} invited you to join team "${teamName}" on TaskFlow`,
    html: `
      <div style="font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #FAF7F2; padding: 32px; border-radius: 16px; border: 1px solid rgba(87, 83, 78, 0.15);">
        <h1 style="color: #C25508; font-size: 24px; margin: 0 0 24px 0; font-family: serif;">TaskFlow</h1>
        <h2 style="color: #1C1917; font-size: 20px; margin-bottom: 12px;">Team Invitation</h2>
        <p style="color: #57534E; font-size: 15px; line-height: 1.6;">
          <strong>${inviterName || 'A teammate'}</strong> has invited you to join the <strong>${teamName}</strong> team${workspaceName ? ` in the <strong>${workspaceName}</strong> workspace` : ''} on TaskFlow as a <strong>${role || 'member'}</strong>.
        </p>
        <p style="color: #57534E; font-size: 15px; line-height: 1.6;">
          You can now collaborate on tasks with your team in real-time. Sign in with your email address to get started.
        </p>
        <div style="margin: 28px 0; text-align: center;">
          <a href="${loginUrl}" style="background: #C25508; color: #FFFFFF; padding: 14px 28px; text-decoration: none; border-radius: 100px; font-weight: 600; display: inline-block; font-size: 15px;">
            Open TaskFlow &amp; Get Started
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid rgba(87, 83, 78, 0.15); margin: 24px 0;">
        <p style="color: #8A847C; font-size: 13px; margin: 0;">- The TaskFlow Team</p>
      </div>
    `,
  });
}

// Daily task summary email
export async function sendDailyTaskEmail(user, tasks) {
  const loginUrl = `${config.clientOrigin || 'http://localhost:5173'}`;
  const taskListHtml = tasks.map((t) => {
    const priorityColor = {
      urgent: '#991B1B',
      high: '#C25508',
      medium: '#92400E',
      low: '#166534'
    }[t.priority] || '#57534E';

    const statusLabel = t.status === 'completed' ? 'Done' : t.status === 'in_progress' ? 'In progress' : 'To do';

    return `
      <tr style="border-bottom: 1px solid rgba(87, 83, 78, 0.08);">
        <td style="padding: 10px 0; font-weight: 600; color: var(--text-primary);">${t.title}</td>
        <td style="padding: 10px 0; font-size: 0.85rem; color: #57534E;">${statusLabel}</td>
        <td style="padding: 10px 0; font-size: 0.85rem; font-weight: 600; color: ${priorityColor};">${t.priority}</td>
        <td style="padding: 10px 0; font-size: 0.85rem; color: #57534E;">${t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No due date'}</td>
      </tr>
    `;
  }).join('');

  return sendEmail({
    to: user.email,
    subject: `Today's Tasks — TaskFlow`,
    html: `
      <div style="font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #FAF7F2; padding: 32px; border-radius: 16px; border: 1px solid rgba(87, 83, 78, 0.15);">
        <h1 style="color: #C25508; font-size: 24px; margin: 0 0 8px 0; font-family: serif;">Good morning, ${user.name || 'there'}!</h1>
        <p style="color: #57534E; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
          Here are your tasks that are due today or overdue:
        </p>
        ${tasks.length > 0 ? `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <thead>
            <tr style="border-bottom: 2px solid rgba(87, 83, 78, 0.15);">
              <th style="text-align: left; padding: 8px 0; font-size: 0.8rem; text-transform: uppercase; color: #8A847C; letter-spacing: 0.05em;">Task</th>
              <th style="text-align: left; padding: 8px 0; font-size: 0.8rem; text-transform: uppercase; color: #8A847C; letter-spacing: 0.05em;">Status</th>
              <th style="text-align: left; padding: 8px 0; font-size: 0.8rem; text-transform: uppercase; color: #8A847C; letter-spacing: 0.05em;">Priority</th>
              <th style="text-align: left; padding: 8px 0; font-size: 0.8rem; text-transform: uppercase; color: #8A847C; letter-spacing: 0.05em;">Due</th>
            </tr>
          </thead>
          <tbody>
            ${taskListHtml}
          </tbody>
        </table>
        ` : '<p style="color: #57534E; font-size: 15px; margin-bottom: 24px;">You have no tasks due today or overdue. Great job staying on top of things!</p>'}
        <div style="text-align: center; margin-top: 24px;">
          <a href="${loginUrl}" style="background: #C25508; color: #FFFFFF; padding: 12px 28px; text-decoration: none; border-radius: 100px; font-weight: 600; display: inline-block; font-size: 15px;">
            Open TaskFlow
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid rgba(87, 83, 78, 0.15); margin: 24px 0;">
        <p style="color: #8A847C; font-size: 13px; margin: 0;">- The TaskFlow Team</p>
      </div>
    `,
  });
}
