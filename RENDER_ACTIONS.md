# Render Redeploy & Logs - Action Steps

This file contains exact steps to redeploy the app on Render and how to view deployment logs.

1) Ensure services exist
   - In Render dashboard, confirm you have a PostgreSQL service and a Redis service in the same project.
   - Copy the **Internal** URLs for both services.

2) Update Web Service Environment Variables
   - In your Web Service > Environment, set:
     - `DATABASE_URL` to the Internal Postgres URL (contains `.internal`)
     - `REDIS_URL` to the Internal Redis URL (contains `.internal`)
     - Ensure `MIGRATE_ON_START=true` is set
     - Set `API_KEY_SECRET` and `JWT_SECRET` to secure random values

3) Redeploy the Web Service
   - Option A: Click `Manual Deploy` → `Deploy latest commit`
   - Option B: Push a new commit to the connected GitHub branch (Render auto-deploys)

4) Watch Build & Runtime Logs
   - Open the Web Service in Render dashboard
   - Click `Events` → select the deploy event to see build logs
   - For runtime logs, open `Logs` tab
   - Search logs for these messages:
     - `Analytics backend listening on port` (service started)
     - `Connected to Redis` (cache connected)
     - `Migrations completed` (DB migrations ran)
     - Any `getaddrinfo ENOTFOUND` errors indicate wrong hostnames — switch to Internal URLs

5) If Postgres/Redis appear not ready
   - Verify that the Web Service and DB/Redis are in the same Render project
   - If you see DNS errors, confirm you used the Internal URLs (look for `.internal` in hostname)
   - Try restarting the Web Service after setting environment variables

6) Confirm Health
   - Once logs show startup messages, run:
     - `curl https://<your-web-service>.onrender.com/health`
   - Expect: `{"status":"ok"}`

7) If you want me to monitor logs
   - I cannot access Render from this environment, but I can help interpret logs you paste here.

---

Commit and redeploy these steps are done. If you want, I can prepare a small commit that touches a README file to trigger a Render rebuild automatically and then help you walk through the Render logs.