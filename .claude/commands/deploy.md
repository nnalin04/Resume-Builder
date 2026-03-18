Guide the user through deploying the Personal Health Coach system to GCP.

Steps:
1. Ask the user which environment they want to deploy to: **dev**, **uat**, or **prod**.
2. Check that the corresponding env file exists (`env.dev`, `env.uat`, or `env.prod`) and that required secrets are filled in: `JWT_SECRET`, `POSTGRES_PASSWORD`, `GEMINI_API_KEY`, `GOOGLE_CLIENT_ID`.
3. Warn if deploying to **prod** — confirm the user wants to proceed.
4. Run the appropriate deploy script:
   - dev:  `./deploy_to_gcp_dev.sh`
   - uat:  `./deploy_to_gcp_uat.sh`
   - prod: `./deploy_to_gcp_prod.sh`
5. Tail the output and report success or failure. If it fails, show the last 30 lines of output and suggest next steps.
