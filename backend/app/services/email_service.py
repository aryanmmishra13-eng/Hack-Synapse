"""
Email Notification Service for Campus Sports Hub.

Sends rich HTML transactional emails for key auth and booking events.
Primary provider: Brevo (formerly Sendinblue - https://brevo.com)
Secondary providers: Resend, SMTP (Brevo/Gmail Relay), Console logger (dev mode)

Configure via environment variables:
  BREVO_API_KEY       - Brevo API Key (e.g. xkeysib-...)
  BREVO_SENDER_EMAIL  - Brevo verified sender email (default: FROM_EMAIL or "noreply@campussportshub.edu")
  BREVO_SENDER_NAME   - Sender name (default: "Campus Sports Hub")

  RESEND_API_KEY      - Resend API Key (fallback)
  RESEND_FROM         - Resend sender (fallback)
  
  SMTP_HOST           - e.g. smtp-relay.brevo.com or smtp.gmail.com (fallback)
  SMTP_PORT           - e.g. 587
  SMTP_USER           - Brevo/Gmail login username
  SMTP_PASS           - Brevo/Gmail SMTP key or app password
  FROM_EMAIL          - displayed sender address
"""

import os
import smtplib
import logging
import re
import json
import urllib.request
import urllib.error
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)

# App Name
APP_NAME = os.getenv("APP_NAME", "Campus Sports Hub")
FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@campussportshub.edu")

# Brevo Configuration (Primary)
BREVO_API_KEY = os.getenv("BREVO_API_KEY", "")
BREVO_SENDER_EMAIL = os.getenv("BREVO_SENDER_EMAIL", os.getenv("FROM_EMAIL", "aryanmmishra13@gmail.com"))
BREVO_SENDER_NAME = os.getenv("BREVO_SENDER_NAME", APP_NAME)

# Resend Configuration (Alternative)
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
RESEND_FROM = os.getenv("RESEND_FROM", f"{APP_NAME} <onboarding@resend.dev>")

# SMTP Configuration (Fallback / Brevo SMTP Relay)
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")


def _send_brevo(to_email: str, subject: str, html_body: str) -> bool:
    """Send transactional email via Brevo REST API v3."""
    if not BREVO_API_KEY:
        return False
    try:
        url = "https://api.brevo.com/v3/smtp/email"
        headers = {
            "api-key": BREVO_API_KEY,
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        payload = {
            "sender": {
                "name": BREVO_SENDER_NAME,
                "email": BREVO_SENDER_EMAIL
            },
            "to": [
                {
                    "email": to_email
                }
            ],
            "subject": subject,
            "htmlContent": html_body
        }

        # Try with httpx if available, fallback to urllib
        try:
            import httpx
            resp = httpx.post(url, json=payload, headers=headers, timeout=10.0)
            if resp.status_code in (200, 201):
                msg_id = resp.json().get("messageId", "sent")
                logger.info(f"[EmailService/Brevo] Email sent to {to_email}: {subject} (MessageId: {msg_id})")
                return True
            else:
                logger.warning(f"[EmailService/Brevo] API returned status {resp.status_code}: {resp.text}")
                return False
        except ImportError:
            data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(url, data=data, headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=10) as response:
                if response.status in (200, 201):
                    logger.info(f"[EmailService/Brevo] Email sent to {to_email}: {subject}")
                    return True
                return False
    except Exception as exc:
        logger.warning(f"[EmailService/Brevo] Send failed to {to_email}: {exc}")
        return False


def _send_resend(to_email: str, subject: str, html_body: str) -> bool:
    """Attempt to send email via Resend API."""
    if not RESEND_API_KEY:
        return False
    try:
        try:
            import resend
            resend.api_key = RESEND_API_KEY
            r = resend.Emails.send({
                "from": RESEND_FROM,
                "to": [to_email],
                "subject": subject,
                "html": html_body
            })
            email_id = r.get("id") if isinstance(r, dict) else getattr(r, "id", "sent")
            logger.info(f"[EmailService/Resend] Email sent to {to_email}: {subject} (ID: {email_id})")
            return True
        except ImportError:
            import httpx
            headers = {
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json"
            }
            payload = {
                "from": RESEND_FROM,
                "to": [to_email],
                "subject": subject,
                "html": html_body
            }
            resp = httpx.post("https://api.resend.com/emails", json=payload, headers=headers, timeout=10.0)
            if resp.status_code in (200, 201):
                logger.info(f"[EmailService/Resend] HTTP Email sent to {to_email}: {subject}")
                return True
            else:
                logger.warning(f"[EmailService/Resend] API returned status {resp.status_code}: {resp.text}")
                return False
    except Exception as exc:
        logger.warning(f"[EmailService/Resend] Send failed to {to_email}: {exc}")
        return False


def _send_smtp(to_email: str, subject: str, html_body: str) -> bool:
    """Attempt to send via SMTP / Brevo SMTP Relay. Returns True on success."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{APP_NAME} <{FROM_EMAIL}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=8) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(FROM_EMAIL, to_email, msg.as_string())
        logger.info(f"[EmailService/SMTP] Email sent to {to_email}: {subject}")
        return True
    except Exception as exc:
        logger.warning(f"[EmailService/SMTP] SMTP send failed to {to_email}: {exc}")
        return False


def _dispatch(to_email: str, subject: str, html_body: str):
    """Send via Brevo if configured, else Resend, else SMTP, else console."""
    # 1. Primary: Brevo API
    if BREVO_API_KEY:
        if _send_brevo(to_email, subject, html_body):
            return
        logger.warning(f"[EmailService] Brevo delivery failed for {to_email}, trying next provider...")

    # 2. Secondary: Resend API
    if RESEND_API_KEY:
        if _send_resend(to_email, subject, html_body):
            return
        logger.warning(f"[EmailService] Resend delivery failed for {to_email}, trying SMTP fallback...")

    # 3. Fallback: SMTP / Brevo SMTP Relay
    if SMTP_HOST and SMTP_USER and SMTP_PASS:
        if _send_smtp(to_email, subject, html_body):
            return
        logger.warning(f"[EmailService] SMTP delivery failed for {to_email}, falling back to console.")

    # 4. Development / Fallback Console Logger
    text = re.sub(r"<[^>]+>", "", html_body)
    text = re.sub(r"&[a-zA-Z0-9#]+;", " ", text)   # strip HTML entities
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    safe_subject = subject.encode("ascii", errors="replace").decode("ascii")
    safe_text = text.encode("ascii", errors="replace").decode("ascii")
    print("\n" + "=" * 72)
    print(f"[DEV EMAIL] To      : {to_email}")
    print(f"[DEV EMAIL] Subject : {safe_subject}")
    print(f"[DEV EMAIL] Body    :\n{safe_text[:1500]}")
    print("=" * 72 + "\n")


def _base_template(title: str, preheader: str, body_html: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>{title}</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:Arial,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;">{preheader}</span>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
             style="background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">
        <tr>
          <td style="background:linear-gradient(135deg,#10b981,#0ea5e9);padding:28px 32px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;">🏆 {APP_NAME}</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:11px;
                      letter-spacing:1px;text-transform:uppercase;">BOOK · PLAY · TRAIN · WIN</p>
          </td>
        </tr>
        <tr><td style="padding:32px;">{body_html}</td></tr>
        <tr>
          <td style="background:#0f172a;padding:20px 32px;text-align:center;border-top:1px solid #334155;">
            <p style="margin:0;color:#64748b;font-size:11px;">
              Automated message from {APP_NAME}. Do not reply.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def send_welcome_email(name: str, email: str, role: str = "STUDENT"):
    """Sent when a new user registers."""
    role_label = role.title()
    features = [
        "Book sports courts in real-time",
        "Join or create tournaments",
        "Rent equipment &amp; gear",
        "Track performance &amp; earn medals",
        "Find training partners &amp; live games",
    ]
    li_html = "".join(
        f'<li style="margin-bottom:8px;color:#94a3b8;font-size:13px;">'
        f'<span style="color:#10b981;margin-right:8px;">&#10003;</span>{f}</li>'
        for f in features
    )
    body = f"""
    <h2 style="margin:0 0 8px;color:#f1f5f9;font-size:20px;font-weight:700;">
      Welcome, {name}! &#127881;
    </h2>
    <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 20px;">
      Your <strong style="color:#10b981;">{role_label}</strong> account is ready.
      Start booking courts, joining tournaments, and competing today.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="background:#0f172a;border-radius:10px;padding:16px 20px;border:1px solid #334155;">
          <p style="margin:0;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Account</p>
          <p style="margin:6px 0 0;color:#f1f5f9;font-size:15px;font-weight:700;">{name}</p>
          <p style="margin:2px 0 0;color:#10b981;font-size:13px;">{email}</p>
        </td>
      </tr>
    </table>
    <ul style="margin:0 0 24px;padding:0;list-style:none;">{li_html}</ul>
    <div style="text-align:center;">
      <a href="http://127.0.0.1:3000/app"
         style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#10b981,#0ea5e9);
                color:#fff;font-weight:700;font-size:14px;text-decoration:none;border-radius:10px;">
        Open Dashboard &rarr;
      </a>
    </div>"""
    html = _base_template(f"Welcome to {APP_NAME}!", f"Welcome {name}! Your account is ready.", body)
    _dispatch(email, f"&#127942; Welcome to {APP_NAME}, {name}!", html)


def send_login_notification(name: str, email: str, role: str = "STUDENT"):
    """Sent on each successful login as a security notice."""
    from datetime import datetime
    now_str = datetime.now().strftime("%d %b %Y at %I:%M %p")
    role_label = role.title()
    body = f"""
    <h2 style="margin:0 0 8px;color:#f1f5f9;font-size:20px;font-weight:700;">
      New Sign-In Detected &#128272;
    </h2>
    <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 20px;">
      Hi <strong style="color:#f1f5f9;">{name}</strong>, a sign-in was recorded on your {role_label} account.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="background:#0f172a;border-radius:10px;padding:16px 20px;border:1px solid #334155;">
          <table width="100%">
            <tr>
              <td style="color:#64748b;font-size:12px;padding:4px 0;">Account:</td>
              <td style="color:#f1f5f9;font-size:13px;font-weight:600;text-align:right;">{email}</td>
            </tr>
            <tr>
              <td style="color:#64748b;font-size:12px;padding:4px 0;">Role:</td>
              <td style="color:#10b981;font-size:13px;font-weight:600;text-align:right;">{role_label}</td>
            </tr>
            <tr>
              <td style="color:#64748b;font-size:12px;padding:4px 0;">Time:</td>
              <td style="color:#f1f5f9;font-size:13px;text-align:right;">{now_str}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <p style="color:#64748b;font-size:12px;line-height:1.6;margin:0 0 20px;">
      If this wasn't you, contact the sports desk immediately.
    </p>
    <div style="text-align:center;">
      <a href="http://127.0.0.1:3000/app"
         style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#10b981,#0ea5e9);
                color:#fff;font-weight:700;font-size:14px;text-decoration:none;border-radius:10px;">
        Open Dashboard &rarr;
      </a>
    </div>"""
    html = _base_template("Sign-In Alert — Campus Sports Hub",
                          f"New sign-in on your Campus Sports Hub account at {now_str}.", body)
    _dispatch(email, f"&#128272; New Sign-In to {APP_NAME}", html)


def send_otp_email(name: str, email: str, otp: str, expires_minutes: int = 10):
    """Sent during registration to verify the student's email address."""
    # Split OTP into individual digits for big-box display
    digits_html = "".join(
        f'<span style="display:inline-block;width:40px;height:52px;line-height:52px;'
        f'background:#0f172a;border:2px solid #10b981;border-radius:10px;'
        f'font-size:28px;font-weight:800;color:#10b981;text-align:center;'
        f'margin:0 4px;font-family:monospace;">{d}</span>'
        for d in otp
    )
    body = f"""
    <h2 style="margin:0 0 8px;color:#f1f5f9;font-size:20px;font-weight:700;">
      Verify Your Email &#128273;
    </h2>
    <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 24px;">
      Hi <strong style="color:#f1f5f9;">{name}</strong>, use the one-time code below
      to complete your Campus Sports Hub registration.
    </p>
    <div style="text-align:center;margin-bottom:24px;">{digits_html}</div>
    <div style="background:#0f172a;border-radius:10px;padding:14px 18px;border:1px solid #334155;margin-bottom:20px;">
      <table width="100%">
        <tr>
          <td style="color:#64748b;font-size:12px;">&#9201; Expires in:</td>
          <td style="color:#f59e0b;font-size:13px;font-weight:700;text-align:right;">{expires_minutes} minutes</td>
        </tr>
        <tr>
          <td style="color:#64748b;font-size:12px;">&#128274; Valid for:</td>
          <td style="color:#f1f5f9;font-size:13px;text-align:right;">One-time use only</td>
        </tr>
      </table>
    </div>
    <p style="color:#64748b;font-size:12px;line-height:1.6;margin:0 0 4px;">
      If you didn&apos;t request this code, you can safely ignore this email.
    </p>"""
    html = _base_template(
        f"Your {APP_NAME} Verification Code",
        f"Your OTP is {otp} \u2014 expires in {expires_minutes} minutes.",
        body,
    )
    _dispatch(email, f"&#128273; Your {APP_NAME} Verification Code: {otp}", html)


def send_booking_confirmation_email(name: str, email: str, facility_name: str,
                                    sport_name: str, booking_date: str,
                                    start_time: str, end_time: str, qr_code: str):
    """Sent when a student's booking is confirmed."""
    body = f"""
    <h2 style="margin:0 0 8px;color:#f1f5f9;font-size:20px;font-weight:700;">
      Booking Confirmed! &#9989;
    </h2>
    <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 20px;">
      Hi <strong style="color:#f1f5f9;">{name}</strong>, your court reservation is confirmed.
      Show your QR pass at the admin check-in desk on the day of play.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="background:#0f172a;border-radius:10px;padding:16px 20px;border:1px solid #10b981;">
          <table width="100%">
            <tr><td colspan="2" style="color:#10b981;font-size:11px;font-weight:700;
                text-transform:uppercase;letter-spacing:1px;padding-bottom:10px;">Booking Details</td></tr>
            <tr>
              <td style="color:#64748b;font-size:12px;padding:4px 0;">Facility:</td>
              <td style="color:#f1f5f9;font-size:13px;font-weight:600;text-align:right;">{facility_name}</td>
            </tr>
            <tr>
              <td style="color:#64748b;font-size:12px;padding:4px 0;">Sport:</td>
              <td style="color:#f1f5f9;font-size:13px;text-align:right;">{sport_name}</td>
            </tr>
            <tr>
              <td style="color:#64748b;font-size:12px;padding:4px 0;">Date:</td>
              <td style="color:#f1f5f9;font-size:13px;font-weight:600;text-align:right;">{booking_date}</td>
            </tr>
            <tr>
              <td style="color:#64748b;font-size:12px;padding:4px 0;">Time:</td>
              <td style="color:#10b981;font-size:13px;font-weight:700;text-align:right;">{start_time} &ndash; {end_time}</td>
            </tr>
            <tr>
              <td style="color:#64748b;font-size:12px;padding:4px 0;">Pass Code:</td>
              <td style="color:#f1f5f9;font-size:11px;font-family:monospace;text-align:right;">{qr_code}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <div style="text-align:center;">
      <a href="http://127.0.0.1:3000/app/my-bookings"
         style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#10b981,#0ea5e9);
                color:#fff;font-weight:700;font-size:14px;text-decoration:none;border-radius:10px;">
        View My Booking &rarr;
      </a>
    </div>"""
    html = _base_template("Booking Confirmed — Campus Sports Hub",
                          f"{facility_name} booked for {booking_date} at {start_time}!", body)
    _dispatch(email, f"&#9989; Booking Confirmed — {facility_name} on {booking_date}", html)
