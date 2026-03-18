---
name: security-audit
description: Use when someone wants a security audit, security review, wants to check if the app is safe, verify OWASP compliance, check for vulnerabilities, or ensure the app is secure before release.
argument-hint: "optional: scope — full | backend | mobile | ai-service | auth | deps"
disable-model-invocation: true
---

## What This Skill Does

Spawns the `security-engineer` agent to audit the system for vulnerabilities across OWASP Mobile Top 10, OWASP API Security Top 10, and health-data privacy standards. Routes all fixes through `project-manager` to the correct engineer.

## Steps

### 1. Determine scope

From `$ARGUMENTS`:
- `full` or no argument → audit everything
- `backend` → Spring Boot + Spring Security only
- `mobile` → Flutter app, AndroidManifest, secure storage
- `ai-service` → FastAPI, Gemini data handling
- `auth` → JWT, OAuth, token storage end-to-end
- `deps` → dependency vulnerability scan only

### 2. Gather security-relevant context in parallel

**AndroidManifest:**
!`cat mobile/android/app/src/main/AndroidManifest.xml`

**Spring Security config:**
!`find backend/src/main/java -name "*SecurityConfig*" -o -name "*JwtFilter*" | xargs cat 2>/dev/null | head -150`

**JWT token handling:**
!`find backend/src/main/java -name "*JwtUtil*" -o -name "*TokenUtil*" -o -name "*JwtService*" | xargs cat 2>/dev/null | head -100`

**Mobile secure storage usage:**
!`grep -rn "flutter_secure_storage\|SharedPreferences\|shared_preferences" mobile/lib/ --include="*.dart" | grep -v "test" | head -30`

**FastAPI auth middleware:**
!`find ai-service/app -name "*.py" | xargs grep -l "auth\|token\|key" 2>/dev/null | head -5 | xargs cat 2>/dev/null | head -100`

**Dependency files:**
!`cat backend/pom.xml | grep -A2 "<dependency>" | grep "artifactId\|version" | head -60`
!`cat ai-service/requirements.txt 2>/dev/null || cat ai-service/pyproject.toml 2>/dev/null | head -40`
!`cat mobile/pubspec.yaml | grep -A1 "dependencies:" | head -40`

**Check for hardcoded secrets:**
!`grep -rn "jwt_secret\|gemini_key\|api_key\|password\s*=\s*['\"]" backend/src/ ai-service/app/ mobile/lib/ --include="*.java" --include="*.py" --include="*.dart" 2>/dev/null | grep -v "test\|#\|//"  | head -20`

**Rate limiting config (Bucket4j):**
!`find backend/src -name "*.java" | xargs grep -l "Bucket4j\|RateLimit\|@RateLimit" 2>/dev/null | head -3 | xargs cat 2>/dev/null | head -80`

### 3. Check for dependency CVEs

**Backend:**
```bash
cd backend && mvn org.owasp:dependency-check-maven:check -DfailBuildOnCVSS=7 2>&1 | tail -20
```
(Note: this may take a while. If mvn dependency-check is not installed, note it as a gap.)

**AI Service:**
```bash
cd ai-service && pip install safety --quiet && safety check 2>&1 | tail -20
```

**Flutter:**
```bash
cd mobile && flutter pub outdated 2>&1 | head -30
```

### 4. Spawn security-engineer agent

```
You are performing a security audit for the Personal Health Coach system.

## Scope
$ARGUMENTS [or "Full system audit" if no argument]

## AndroidManifest
[content]

## Spring Security + JWT Configuration
[content]

## Mobile Token/Storage Usage
[grep results]

## FastAPI Auth
[content]

## Dependency Files (pom.xml, requirements.txt, pubspec.yaml)
[content]

## Hardcoded Secrets Check
[grep results — flag any findings]

## Dependency CVE Check Results
Backend: [mvn output]
AI Service: [safety output]
Flutter: [flutter pub outdated output]

## Instructions
1. Audit all provided context against your full security checklist.
2. Produce your standard Security Audit Report.
3. For each finding, prepare a HANDOFF to project-manager with:
   - Exact file/line reference
   - OWASP category
   - Severity
   - Specific fix
   - Which engineer should fix it (java-expert / flutter-expert / python-expert / devops-engineer)
4. End with a PASS / CONDITIONAL PASS / FAIL release recommendation.
```

### 5. Route critical and high findings

If the report contains any **Critical** or **High** findings, immediately spawn `project-manager`:

```
HANDOFF: security-engineer → project-manager

Security audit complete. [N] issues require immediate attention.

## Critical Findings (block release)
[paste Critical section]

## High Findings (fix before production)
[paste High section]

## Routing Table
[paste routing summary from security report]

## Instructions
1. Create work items for all Critical and High findings.
2. Route each to the correct engineer with the specific fix.
3. Critical findings must block the current sprint and be fixed before any release.
4. Return a prioritised fix plan.
```

### 6. Present to user

Show the full security report. Prepend:
> "Security Audit complete: [N] Critical, [N] High, [N] Medium, [N] Low findings."
> "Release recommendation: **[PASS / CONDITIONAL PASS / FAIL]**"

If FAIL: "The following must be fixed before any production deployment: [list Critical issues]"

## Notes

- Never print actual secret values — only flag that they exist and where
- The dependency CVE check commands may be slow or require network — if they timeout, note it and proceed with manual review
- If `$ARGUMENTS` is `deps`, skip steps 2-4 and only run the dependency checks
