# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.x.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

### How to Report

**Please do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please report security vulnerabilities by emailing the maintainers directly or using GitHub's private vulnerability reporting feature.

### What to Include

When reporting a vulnerability, please include:

1. **Description** of the vulnerability
2. **Steps to reproduce** the issue
3. **Potential impact** assessment
4. **Suggested fix** (if you have one)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial assessment**: Within 1 week
- **Resolution target**: Depends on severity
  - Critical: 24-48 hours
  - High: 1 week
  - Medium: 2 weeks
  - Low: Next release

### What to Expect

1. We will acknowledge your report promptly
2. We will investigate and keep you informed of progress
3. We will credit you in the security advisory (unless you prefer anonymity)
4. We will notify you when the fix is released

## Security Best Practices for Users

When deploying Build CV:

1. **Environment Variables**
   - Never commit `.env.local` or credentials to version control
   - Use strong, unique tokens for database access
   - Rotate credentials periodically

2. **Database Security**
   - Use Turso's authentication tokens
   - Restrict database access to your application
   - Regular backups of your data

3. **Deployment**
   - Deploy on trusted platforms (Vercel, etc.)
   - Enable HTTPS
   - Keep dependencies updated

## Known Security Considerations

- This application stores professional career data
- No authentication system is built-in (single-user design)
- For multi-user scenarios, implement access control at the deployment level

## Dependencies

We regularly update dependencies to patch known vulnerabilities. Run `npm audit` to check for issues in your installation.
