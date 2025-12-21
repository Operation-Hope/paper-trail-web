# Deployment Checklist

This document provides a comprehensive checklist for deploying the Paper Trail client to Railway.

## Prerequisites

- [x] GitHub repository for frontend (this repo)
- [x] GitHub repository for backend (`paper-trail-api`)
- [x] Backend already deployed to Railway
- [ ] Railway account with access to the project

## Frontend Deployment Steps

### 1. Connect Repository to Railway

1. Log in to Railway
2. Navigate to your Paper Trail project
3. Click "New Service" → "GitHub Repo"
4. Select `Operation-Hope/paper-trail-web` repository
5. Railway will auto-detect the `railway.json` configuration

### 2. Configure Environment Variables

In the Railway frontend service, add the following environment variable:

**Variable Name:** `VITE_API_BASE_URL`

**Value (Option A - Public URL):**
```
https://paper-trail-api.up.railway.app
```
*Replace with your actual backend Railway URL*

**Value (Option B - Internal Networking - Recommended):**
```
https://paper-trail-api.railway.internal
```
*Uses Railway's private network for service-to-service communication*

**Note:** You can find your backend's Railway URL in the backend service settings or deployment logs.

### 3. Update Backend CORS Configuration

**CRITICAL:** The backend must allow requests from the frontend origin.

In the **backend Railway service** (`paper-trail-api`), update the `ALLOWED_ORIGINS` environment variable:

**Variable Name:** `ALLOWED_ORIGINS`

**Value Format:** Comma-separated list of allowed origins
```
http://localhost:5173,https://your-frontend-url.up.railway.app
```

**Example:**
```
http://localhost:5173,https://paper-trail-web-production.up.railway.app
```

**Steps:**
1. Go to backend Railway service
2. Click "Variables" tab
3. Find or create `ALLOWED_ORIGINS` variable
4. Add frontend Railway URL to the comma-separated list
5. Save and redeploy backend if necessary

### 4. Deploy Frontend

1. Push changes to your main branch (if not already pushed)
2. Railway will automatically:
   - Install dependencies: `pnpm install`
   - Build the application: `pnpm run build`
   - Start the server: `node server.js`
3. Monitor build logs for any errors
4. Once deployed, Railway will provide a public URL

### 5. Verify Deployment

**Test the following:**

- [ ] Frontend loads successfully at Railway URL
- [ ] Open browser developer tools (Network tab)
- [ ] Test politician search functionality
- [ ] Verify API calls in Network tab:
  - [ ] Requests go to backend URL
  - [ ] CORS headers present in responses
  - [ ] No CORS errors in console
- [ ] Test donor search functionality
- [ ] Test navigation between pages
- [ ] Verify React Router works (refresh page on different routes)

**Common Issues:**

| Issue | Solution |
|-------|----------|
| CORS errors in browser console | Verify `ALLOWED_ORIGINS` includes frontend URL |
| API calls failing | Check `VITE_API_BASE_URL` is set correctly |
| 404 on page refresh | Ensure `serve -s` flag is in start command |
| Build fails | Check build logs, verify Node.js version (>= 20.19) |

## Backend Configuration Reference

### Required Backend Environment Variables

The backend (`paper-trail-api`) must have the following configuration:

**File:** `app/main.py`
```python
from flask_cors import CORS

allowed_origins = os.getenv('ALLOWED_ORIGINS', 'http://localhost:5173').split(',')
allowed_origins = [origin.strip() for origin in allowed_origins]
CORS(app, origins=allowed_origins, supports_credentials=True)
```

**Railway Environment Variables:**
```
ALLOWED_ORIGINS=http://localhost:5173,https://paper-trail-client-production.up.railway.app
```

### Testing CORS Configuration

1. Open frontend in browser
2. Open Developer Tools → Network tab
3. Perform a search
4. Click on any API request
5. Check Response Headers for:
   ```
   Access-Control-Allow-Origin: https://your-frontend-url.up.railway.app
   Access-Control-Allow-Credentials: true
   ```

If these headers are missing or show `Access-Control-Allow-Origin: *`, update the backend's `ALLOWED_ORIGINS` variable.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        User Browser                         │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ HTTPS
                            │
                ┌───────────▼──────────┐
                │   Railway Frontend   │
                │  (Static React SPA)  │
                │                      │
                │  - Serves built      │
                │    static files      │
                │  - Client-side       │
                │    routing via       │
                │    React Router      │
                └───────────┬──────────┘
                            │
                            │ HTTPS/Internal
                            │ (CORS-enabled)
                            │
                ┌───────────▼──────────┐
                │   Railway Backend    │
                │    (Flask API)       │
                │                      │
                │  - REST API          │
                │  - CORS configured   │
                │  - /api/* endpoints  │
                └───────────┬──────────┘
                            │
                            │ PostgreSQL
                            │ Protocol
                            │
                ┌───────────▼──────────┐
                │  PostgreSQL Database │
                │  (Railway Postgres)  │
                └──────────────────────┘
```

## Environment Configuration Summary

### Development (.env.development)
```bash
VITE_API_BASE_URL=http://localhost:5001
```

### Production (Railway Frontend)
```bash
VITE_API_BASE_URL=https://paper-trail-api.up.railway.app
# OR
VITE_API_BASE_URL=https://paper-trail-api.railway.internal
```

### Production (Railway Backend)
```bash
ALLOWED_ORIGINS=http://localhost:5173,https://paper-trail-web-production.up.railway.app
DB_HOST=<postgres-host>
DB_PORT=5432
DB_NAME=<database-name>
DB_USER=<database-user>
DB_PASSWORD=<database-password>
```

## Troubleshooting

### Build Fails

**Check:**
- Node.js version (should be 24+)
- pnpm lockfile is committed
- All dependencies in `package.json`
- Build logs in Railway dashboard

### CORS Errors

**Symptoms:**
- Console errors: "CORS policy: No 'Access-Control-Allow-Origin' header"
- API requests fail with status 0 or CORS error

**Solutions:**
1. Verify frontend URL is in backend's `ALLOWED_ORIGINS`
2. Ensure no trailing slashes in origins
3. Check backend CORS middleware is enabled
4. Redeploy backend after updating `ALLOWED_ORIGINS`

### API Calls Fail

**Symptoms:**
- Network errors
- 404 on API endpoints
- Requests not showing in Network tab

**Solutions:**
1. Verify `VITE_API_BASE_URL` is set in Railway
2. Check backend is running and healthy
3. Test backend URL directly in browser
4. Verify environment variable is loaded (check build logs)

### Page Refresh Returns 404

**Symptoms:**
- Direct navigation to `/politician/123` works
- Refreshing the page shows 404

**Solutions:**
1. Verify start command runs the Express proxy: `node server.js`
2. Check `railway.json` has correct start command
3. Redeploy with updated configuration

## Post-Deployment

### Optional Enhancements

After successful deployment, consider:

- [ ] Configure custom domain
- [ ] Set up staging environment
- [ ] Add health check monitoring
- [ ] Configure CDN for static assets
- [ ] Add error tracking (Sentry, etc.)
- [ ] Set up automated deployments from main branch
- [ ] Add deployment preview for pull requests

### Monitoring

Monitor the following:
- Railway deployment logs
- Application error logs
- Network request success rates
- Page load performance
- CORS errors in browser console

## Support

If deployment issues persist:
1. Check Railway status page
2. Review Railway documentation
3. Check backend and frontend logs
4. Verify all environment variables are set correctly
5. Test backend API independently using curl or Postman
