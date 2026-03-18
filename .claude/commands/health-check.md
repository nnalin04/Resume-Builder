Check the health of all running services in the Personal Health Coach system.

Steps:
1. Check if Docker containers are running: `docker compose ps`
2. Hit the backend health endpoint: `curl -s http://localhost:8080/actuator/health`
3. Hit the AI service health endpoint: `curl -s http://localhost:8000/health`
4. Report which services are up, which are down, and any error output.
5. If a service is down, check its logs with `docker compose logs --tail=50 <service>` and summarize the problem.
