# Local Docker setup
"///{DATABASE_URL="postgresql://reviewer:changeme@db:5432/code_reviewer"
APP_URL="http://localhost:3000"
SESSION_COOKIE_NAME="session_token"

# Email. Leave blank to print OTP/reset messages in the app container logs.
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=mycodereviewer@gmail.com
SMTP_PASSWORD=gdoh qkli wkqv thcq
EMAIL_FROM="AI Code Reviewer <mycodereviewer@gmail.com>"

# Later, when you add Google Gemini:
# GEMINI_API_KEY=
}///"