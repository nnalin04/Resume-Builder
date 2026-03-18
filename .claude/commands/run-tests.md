Run the full test suite across all layers of the Personal Health Coach system.

Steps:
1. **Backend tests** — `cd backend && mvn test -q` — report pass/fail counts and any failures.
2. **AI service tests** — `cd ai-service && python3 -m pytest -v` — report pass/fail counts and any failures.
3. **Mobile tests** — `cd mobile && flutter test` — report pass/fail counts and any failures.
4. Summarize overall results: how many tests passed, failed, or errored per layer.
5. For any failing test, show the error message and suggest a fix if the cause is clear.
