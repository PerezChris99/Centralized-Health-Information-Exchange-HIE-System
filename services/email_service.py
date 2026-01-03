"""
Email service for sending emails (password reset, notifications, etc.)
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv

load_dotenv()


def send_email(to_email, subject, message, html=None):
    """
    Send an email using SMTP
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        message: Plain text message
        html: Optional HTML content
    """
    smtp_host = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
    smtp_port = int(os.environ.get('SMTP_PORT', 587))
    smtp_email = os.environ.get('SMTP_EMAIL')
    smtp_password = os.environ.get('SMTP_PASSWORD')
    from_name = os.environ.get('FROM_NAME', 'Health Exchange System')
    from_email = os.environ.get('FROM_EMAIL', smtp_email)
    
    if not smtp_email or not smtp_password:
        print("Warning: SMTP credentials not configured. Email not sent.")
        return False
    
    try:
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"{from_name} <{from_email}>"
        msg['To'] = to_email
        
        # Attach plain text version
        part1 = MIMEText(message, 'plain')
        msg.attach(part1)
        
        # Attach HTML version if provided
        if html:
            part2 = MIMEText(html, 'html')
            msg.attach(part2)
        
        # Connect and send
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_email, smtp_password)
            server.sendmail(from_email, to_email, msg.as_string())
        
        print(f"Email sent to {to_email}")
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        raise e
