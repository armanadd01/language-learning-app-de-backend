# Vercel Deployment (nosql-backend)

## Project settings
- **Framework preset**: Other
- **Root Directory**: `nosql-backend`
- **Install Command**: `npm install`
- **Build Command**: `npm run build:vercel`
- **Output Directory**: (leave empty / default)
- **Serverless Function**: `api/index.ts`

## Environment variables
Set these in Vercel (Project → Settings → Environment Variables):

- `MONGODB_URI`
  - Example: `mongodb+srv://user:pass@cluster.mongodb.net/language_app?retryWrites=true&w=majority`

- `JWT_SECRET`
  - Any random string (use `openssl rand -base64 32`)

- `CORS_ORIGIN`
  - Example: `https://your-frontend-domain.vercel.app`

- `NODE_ENV` (optional)
  - Set to `production`

## Notes
- Vercel will serve all requests from `api/index.ts` (serverless handler).
- MongoDB connection is cached across invocations.
- If you need to run one-off scripts (seed/import), run them locally before deploying.
- Ensure your MongoDB Atlas allows access from Vercel’s IPs (0.0.0.0/0).

## Post-deploy
- Test: `https://your-backend.vercel.app/health`
- Update your frontend’s `.env` to point to the Vercel backend URL.
