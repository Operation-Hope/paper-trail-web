# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

### How to Report

**Please DO NOT report security vulnerabilities through public GitHub issues.**

Instead, use GitHub's Security Advisory feature:

1. Go to the **Security** tab of this repository
2. Click **"Report a vulnerability"**
3. Provide detailed information about the vulnerability

Alternatively, if the Security Advisory feature is not available, contact the Operation-Hope team directly through the organization's GitHub profile.

### What to Include

When reporting a vulnerability, please include:

- Type of vulnerability (XSS, CSRF, injection, etc.)
- Location of the affected code (file path and line numbers if possible)
- Step-by-step instructions to reproduce the issue
- Potential impact of the vulnerability
- Any suggested fixes or mitigations

### Response Timeline

- **Initial Response**: Within 48-72 hours
- **Status Update**: Within 5 business days
- **Resolution Target**: Depends on severity
  - Critical: 7 days
  - High: 14 days
  - Medium: 30 days
  - Low: 60 days

### What to Expect

1. **Acknowledgment**: We will confirm receipt of your report
2. **Assessment**: We will investigate and assess the severity
3. **Updates**: We will keep you informed of our progress
4. **Resolution**: We will notify you when the issue is fixed
5. **Credit**: With your permission, we will credit you in our security acknowledgments

## Security Considerations

### Frontend Application

This is a React-based frontend application. Key security considerations:

- **No Sensitive Data**: This frontend does not store or process sensitive user credentials
- **API Communication**: All API calls are made to a separate backend service
- **CORS**: Cross-origin requests are controlled by the backend CORS configuration
- **Input Validation**: User inputs are validated before being sent to the API
- **XSS Prevention**: React's built-in escaping helps prevent XSS attacks

### Dependencies

- We regularly audit dependencies using `pnpm audit`
- Dependabot is configured to automatically create PRs for security updates
- All dependencies are pinned to specific versions via `pnpm-lock.yaml`

### Deployment

- Production deployments use HTTPS
- Environment variables are used for configuration (no hardcoded secrets)
- The Express server proxies API requests to prevent CORS issues

## Security Best Practices for Contributors

When contributing code, please:

1. **Never commit secrets**: API keys, tokens, or credentials
2. **Validate all inputs**: Especially user-provided data
3. **Use parameterized queries**: When constructing API URLs
4. **Review dependencies**: Check for known vulnerabilities before adding new packages
5. **Follow React security best practices**: Avoid `dangerouslySetInnerHTML` unless absolutely necessary

## Acknowledgments

We appreciate the security researchers and community members who help keep Paper Trail secure.

<!-- Security acknowledgments will be listed here -->
