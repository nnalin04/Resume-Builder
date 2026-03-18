Review all staged and unstaged changes in the repository for correctness, security, and quality.

Steps:
1. Run `git diff HEAD` to get the full diff of all changes.
2. For each changed file, evaluate:
   - **Correctness**: Does the logic match the intent? Are there obvious bugs?
   - **Security**: Any SQL injection, XSS, unvalidated inputs, exposed secrets, or insecure JWT handling?
   - **API contracts**: Do request/response DTOs match between backend, AI service, and mobile?
   - **Error handling**: Are errors properly caught and returned as structured responses?
   - **Flutter**: Are Riverpod providers correctly scoped? Is Dio error handling in place?
   - **Spring Boot**: Are new endpoints secured (`@PreAuthorize` or security config)? Are DTOs validated (`@Valid`)?
   - **FastAPI**: Are Pydantic schemas used for all inputs/outputs? Are Gemini calls wrapped in try/except?
3. List issues found, grouped by severity: **Critical**, **Warning**, **Suggestion**.
4. For critical issues, show the problematic code and a corrected version.
