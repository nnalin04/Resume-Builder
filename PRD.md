# Building an AI Resume Builder SaaS for Under ₹3,000/Month

The entire stack — hosting, AI, parsing, payments, storage — can run for **under ₹500/month ($6) at launch** and stay well within ₹3,000/month ($35) at 500 users. The key insight: combine Oracle Cloud's free ARM tier (24 GB RAM), Gemini's free AI API, Cloudflare's free CDN/storage, and Cashfree's promotional 1.6% payment rate (sign up before March 31, 2026). This report covers every component with exact pricing, architectural decisions, and cost projections across all ten research areas.

---

## 1. Resume parsing: Tika for free, Affinda for accuracy

Resume parsing splits into two distinct problems: **text extraction** (getting raw text from PDF/DOCX) and **field extraction** (identifying name, email, skills, experience). Java has excellent libraries for the first; the second requires either custom NLP or a paid API.

**Java text extraction libraries (all free, Apache 2.0 license):**

| Library | Best For | Limitation |
|---------|----------|------------|
| **Apache Tika 3.1** | Unified parsing of PDF, DOCX, DOC, RTF — auto-detects format | Returns flat unstructured text only |
| **Apache PDFBox 3.0.7** | PDF-specific extraction, page manipulation | No semantic understanding; weak on tables and multi-column layouts |
| **Apache POI 5.3** | DOCX/DOC parsing with preserved paragraph structure | Memory-heavy; no semantic extraction |

Tika wraps both PDFBox and POI behind a single API, making it the clear starting point. However, all three only extract raw text — they cannot identify which text is a "name" versus a "skill." Rule-based regex extraction achieves roughly **60–75% field-level accuracy** and breaks on creative layouts, multi-column designs, and non-standard section headers.

**AI-powered resume parsing APIs solve this problem at a cost:**

| Service | Cost Per Parse | Annual Min | Accuracy | Free Tier |
|---------|---------------|------------|----------|-----------|
| **Affinda** | $0.045–$0.133 | $800/year (6K parses) | 85–95%+, 100+ fields extracted | 14-day trial |
| **Textkernel (Sovren)** | ~$0.10 | ~$1,200/year | 95%+, gold standard | Trial available |
| **RChilli** | ~$0.015 | ~$900/year | Good for English | Trial available |
| **Eden AI** | Pass-through + $0–99/month platform fee | Varies by provider | Aggregates Affinda, Daxtra, others | $10 free credit |

**Recommended approach — hybrid, two-phase:**

**Phase 1 (MVP, $0/month):** Use Apache Tika for text extraction plus simple regex/heuristics for contact info (email, phone, name via patterns). Feed the extracted text to your AI/LLM (Gemini or DeepSeek) with a structured prompt asking it to return JSON with fields like name, email, skills, experience. This costs virtually nothing — the LLM call for parsing one resume is under **$0.002**. At 100 users/month, that's $0.20.

**Phase 2 (scaling):** Add Affinda at $800/year (6,000 parses) when accuracy becomes a competitive differentiator or volume exceeds what LLM-based parsing handles efficiently. Affinda returns structured JSON with 100+ fields and handles edge cases (scanned PDFs, creative layouts) that LLM prompting misses.

The LLM-based parsing approach is particularly compelling in 2026 because models like Gemini 2.5 Flash and DeepSeek V3.2 handle structured extraction remarkably well at negligible cost.

---

## 2. AI costs for resume optimization are negligible at any scale

This is the most surprising finding: **AI API costs are essentially a non-factor** for a resume builder, even at scale. A typical resume optimization — sending a resume (~1,000 tokens), job description (~700 tokens), and system prompt (~400 tokens) and receiving optimized sections (~1,100 tokens) — costs between **$0.0005 and $0.003** depending on the model.

**Current pricing landscape (March 2026):**

| Model | Input/1M Tokens | Output/1M Tokens | Cost Per Optimization | Quality |
|-------|----------------|-------------------|----------------------|---------|
| **Gemini 2.5 Flash** | $0.15 | $0.60 | ~$0.001 | ★★★★ Good |
| **DeepSeek V3.2** | $0.28 | $0.42 | ~$0.001 | ★★★★ Good |
| **GPT-5 Nano** | $0.05 | $0.40 | ~$0.0006 | ★★★ Acceptable |
| **GPT-5 Mini** | $0.25 | $2.00 | ~$0.003 | ★★★★½ Very Good |
| **Groq (Llama 3.1 8B)** | $0.05 | $0.08 | ~$0.0002 | ★★½ Fair |
| **Groq (Llama 4 Maverick)** | $0.20 | $0.60 | ~$0.001 | ★★★★ Good |
| **Mistral Medium 3** | $0.40 | $2.00 | ~$0.003 | ★★★★ Good+ |
| **Claude Haiku 4.5** | $1.00 | $5.00 | ~$0.008 | ★★★★ Good |

**Monthly cost projections:**

| Scale | Gemini 2.5 Flash | DeepSeek V3.2 | GPT-5 Mini |
|-------|-----------------|---------------|------------|
| 100 optimizations | $0.10 | $0.11 | $0.27 |
| 500 optimizations | $0.50 | $0.53 | $1.36 |
| 5,000 optimizations | $5.00 | $5.25 | $13.65 |

**Gemini's free tier is the launch weapon.** Google AI Studio offers Gemini 2.5 Flash at zero cost — no credit card required — with limits of **1,000 requests/day** and 250K tokens/minute. For a product launching with 100 users/month (likely 200–500 total AI calls/month), the free tier covers everything. Even at 500 users doing 3 optimizations each, 1,500 monthly calls stays comfortably within free limits.

**Recommended multi-model strategy:**

1. **Launch:** Gemini 2.5 Flash free tier — $0/month
2. **Early growth (500+ users):** DeepSeek V3.2 as primary — ~$0.50/month
3. **Production quality:** GPT-5 Mini — ~$3–14/month at 1K–5K optimizations
4. **Premium tier offering:** GPT-5 or Claude Sonnet 4.5 for a "premium optimization" feature that justifies higher pricing

Use **OpenRouter** as your API gateway — single integration, 300+ models, automatic fallback routing, and no per-token markup (only a 5.5% fee on credit purchases). This lets you switch models without code changes.

---

## 3. LinkedIn import: only two legally safe paths remain

The LinkedIn data landscape shifted dramatically in 2025. **Proxycurl — the most popular LinkedIn scraping API ($10M ARR) — was sued by LinkedIn/Microsoft and shut down permanently.** This is the defining event for any startup considering LinkedIn data integration.

**What the official LinkedIn API actually provides (free, self-service):**

Sign In with LinkedIn (OpenID Connect) returns only: name, email, profile photo, headline. **No work experience, education, skills, or any resume-relevant data.** Full profile access requires LinkedIn Partner Program approval, which costs $7,200+/year and is effectively unavailable to bootstrapped startups.

**The two viable approaches:**

**Primary — LinkedIn PDF Upload ($0/month, zero legal risk):** Users go to their LinkedIn profile → click "More" → "Save to PDF" → upload to your app. LinkedIn's own PDF export contains structured sections (Contact Info, Summary, Experience, Education, Skills). Parse this PDF using Tika + your LLM for field extraction. This is exactly what Rezi.ai, Kickresume, and Resumonk do. The UX requires 3–4 extra clicks from the user, but a clear in-app guide with screenshots makes this painless. **This is the industry-standard approach for bootstrapped resume builders.**

**Secondary — Chrome Extension (Phase 2, low-medium legal risk):** A lightweight Chrome extension reads the user's own authenticated LinkedIn profile page and sends structured data to your backend. User-initiated, which improves the legal position. Only worth building after reaching 1,000+ users to justify the development investment.

**What not to do:** Do not use RapidAPI LinkedIn scrapers ($50–200/month), PhantomBuster (€69+/month), or any server-side scraping. LinkedIn is actively pursuing legal action, and India's Digital Personal Data Protection Act (full compliance required by May 2027) adds additional regulatory risk. The Proxycurl shutdown proves that even successful scraping businesses cannot survive LinkedIn's legal resources.

---

## 4. Cashfree beats Razorpay on cost — sign up before March 31

For small-ticket Indian SaaS transactions (₹149–649), payment gateway fees directly impact margins. The difference between gateways is significant.

**Head-to-head comparison:**

| Feature | Cashfree (Promo) | Cashfree (Standard) | Razorpay (One-time) | Razorpay (Subscription) |
|---------|-----------------|--------------------|--------------------|------------------------|
| Base fee | **1.6%** | 1.95% | 2.00% | 2.99% |
| Effective (incl. 18% GST) | **1.89%** | 2.30% | 2.36% | 3.53% |
| Subscription surcharge | None | None | N/A | +0.99% |
| Setup fee | ₹0 | ₹0 | ₹0 | ₹0 |
| Settlement | T+0/T+1 available | T+2 standard | T+2 standard | T+2 standard |

**Cashfree's 10th anniversary promo (1.6% flat)** is available for new signups from September 18, 2025 through **March 31, 2026**, valid for 12 months. Conditions: monthly gross transaction value under ₹1 crore and minimum 40% UPI share. A resume builder easily meets both conditions.

**Per-transaction impact on your pricing:**

| Transaction | Cashfree (1.6% promo) | Razorpay (subscription) | You Save |
|------------|----------------------|------------------------|----------|
| ₹199 single download | ₹3.76 fee → ₹195.24 net | ₹7.03 fee → ₹191.97 net | ₹3.27/txn |
| ₹499 monthly plan | ₹9.43 fee → ₹489.57 net | ₹17.61 fee → ₹481.39 net | ₹8.18/txn |
| ₹649 monthly plan | ₹12.27 fee → ₹636.73 net | ₹22.91 fee → ₹626.09 net | ₹10.64/txn |

**UPI AutoPay for subscriptions** works perfectly for this product. Your ₹399–649/month pricing is well under the ₹15,000 auto-debit limit, meaning recurring charges process without requiring user re-authentication each month. Customers approve the mandate once via UPI PIN, then payments auto-debit monthly with a 24-hour pre-notification.

**Freemium implementation:** Track at the application layer — store `downloads_used` in your users table. Require email registration before even the free download (prevents abuse and builds your user base). After the first free PDF download, redirect to a payment page offering both one-time purchase (₹149–249) and monthly subscription (₹399–649).

**Recommendation:** Start with **Cashfree** to lock in the 1.6% promotional rate. Keep Razorpay as a fallback if Cashfree's support or success rates prove inadequate. Avoid Stripe India entirely — it's invite-only, lacks UPI AutoPay, and is designed for international payments.

---

## 5. Authentication: Spring Security JWT with Google OAuth

With 6 years of Spring Boot experience, Spring Security is the natural choice. Here's the optimal setup:

**Core architecture — stateless JWT with refresh tokens:**

- **Spring Security 6.x** with `SecurityFilterChain` (the modern component-based configuration, not the deprecated `WebSecurityConfigurerAdapter`)
- **Access tokens (JWT):** Short-lived (15–30 minutes), signed with RS256 or HS256, stored in memory (JavaScript variable, not localStorage)
- **Refresh tokens:** Long-lived (7–30 days), stored as HttpOnly Secure cookie, persisted in PostgreSQL with device fingerprint
- **Password storage:** BCrypt with strength 12 via `BCryptPasswordEncoder` (Spring Security default)
- **CSRF protection:** Disabled for stateless JWT API (standard practice for SPA + REST API architecture)
- **CORS:** Configured for your React frontend domain only

**Google OAuth2 login (highest-value social login for India):**

Spring Boot's `spring-boot-starter-oauth2-client` handles the entire OAuth2 flow. Configure Google as a provider in `application.yml` with your client ID/secret from Google Cloud Console. The flow: React frontend redirects to Google → user authenticates → Google redirects back with authorization code → Spring Boot exchanges code for tokens → extract email/name from Google's ID token → create or link local user account → issue your own JWT.

**Session management for freemium tracking:**

```
users table: id, email, password_hash, name, auth_provider (LOCAL/GOOGLE), 
             free_downloads_used, subscription_status, subscription_expiry,
             created_at, updated_at
             
refresh_tokens table: id, user_id, token_hash, device_info, expires_at, created_at
```

The `free_downloads_used` counter in the users table is the simplest way to enforce the "1 free download" limit. Check this before every download request; increment on successful free download; bypass the check if `subscription_status = ACTIVE`.

---

## 6. PDF generation: Flying Saucer for MVP, Gotenberg for production

The PDF generation choice directly determines resume template quality. Two clear winners emerged from the research:

**Option A — Flying Saucer + Thymeleaf (MVP, pure Java, $0):**

Flying Saucer (LGPL license, SaaS-safe) renders well-formed XHTML + CSS 2.1 to PDF via OpenPDF. Pair it with Spring Boot's Thymeleaf template engine: design resume templates as XHTML files with CSS styling, bind data using Thymeleaf expressions, render to PDF in-process in **~50–200ms**. Zero additional infrastructure — it runs inside your Spring Boot JVM.

The limitation is CSS 2.1 only — no Flexbox or Grid. This means clean, classic resume layouts work perfectly (single-column, two-column via floats, tables), but highly creative modern designs are constrained. For a resume builder, this is often fine — most professional resumes use traditional layouts.

**Option B — Gotenberg Docker sidecar (production, best quality, $0):**

Gotenberg is an MIT-licensed Docker container wrapping headless Chromium. Send HTML via HTTP POST, receive pixel-perfect PDF. Full CSS3 support including Flexbox, Grid, custom fonts, and modern JavaScript. Output is identical to Chrome's print-to-PDF. Requires **~512MB–1GB RAM** for the Docker container.

**What to avoid:**

| Library | Why Not |
|---------|---------|
| **iText 7/9** | AGPL license requires source disclosure for SaaS; commercial license starts at $10,000/year |
| **wkhtmltopdf** | Officially abandoned, removed from Homebrew (Dec 2024), uses frozen 2016 WebKit, security vulnerabilities |
| **Apache PDFBox** (for generation) | Low-level coordinate-based positioning — impractical for styled documents |
| **JasperReports** | Absolute positioning templates, steep learning curve, wrong tool for resumes |

**Recommendation:** Start with **Flying Saucer + Thymeleaf** for the MVP. Design 5–8 clean resume templates in XHTML/CSS 2.1. Migrate to **Gotenberg** when template sophistication becomes a competitive differentiator or when you want to empower designers to create templates using modern CSS. Both are free and SaaS-friendly.

---

## 7. Infrastructure under ₹3,000/month with massive headroom

The hosting landscape offers remarkable value for bootstrapped products. The optimal stack costs between **$0 and $5/month** at launch.

**Recommended stack — Oracle Cloud Free + Cloudflare ecosystem:**

| Component | Service | Monthly Cost |
|-----------|---------|-------------|
| Backend (Spring Boot + PostgreSQL) | Oracle Cloud ARM (2 OCPU, 12 GB RAM, 100 GB disk) | **$0** |
| File storage (resumes, PDFs) | Cloudflare R2 (10 GB free, zero egress fees) | **$0** |
| Frontend (React SPA) | Cloudflare Pages (unlimited bandwidth) | **$0** |
| DNS + SSL | Cloudflare (free plan) | **$0** |
| Domain name | .com or .in registration | ~$10/year |
| **Total at launch** | | **~$1/month** |

Oracle Cloud's Always Free tier is genuinely remarkable: **4 ARM OCPUs and 24 GB RAM** configurable across up to 4 VMs, with 200 GB block storage and 10 TB/month bandwidth. This is enough to run Spring Boot, PostgreSQL, and even a Gotenberg container comfortably. The catch: ARM instances sometimes show "Out of Capacity" errors in popular regions. Fix this by upgrading to a Pay-As-You-Go account (free resources remain free, but capacity restrictions lift) and targeting a less popular region.

**Cloudflare R2's zero egress pricing** is critical for a resume builder. Every PDF download is an egress event — with AWS S3, this costs $0.09/GB. With R2, it's free. The 10 GB free storage tier handles thousands of resumes.

**Cloudflare Pages** serves the React frontend from 330+ global edge locations with unlimited bandwidth, completely free. This is superior to Vercel's free tier (which restricts commercial use on the Hobby plan).

**Fallback stack — Hetzner + Neon ($5/month):**

If Oracle Cloud proves unreliable, Hetzner's CAX11 ARM server (2 vCPU, 4 GB RAM, 40 GB SSD) costs €4.49/month (~$5) after the April 2026 price increase. Pair with Neon's free PostgreSQL tier (0.5 GB storage, auto scale-to-zero) or self-host PostgreSQL on the same VPS.

**Database options ranked:**

| Service | Free Tier | Best For |
|---------|-----------|----------|
| **Self-hosted PostgreSQL** on Oracle/Hetzner | Uses VPS resources | Production (no pausing, no limits) |
| **Neon** | 0.5 GB, 191 compute hours/month | Development + early production (serverless, scales to zero) |
| **Supabase** | 500 MB, pauses after 1 week inactivity | Development only (pausing is problematic for production) |

**Cost at scale:**

| Users/Month | Oracle Free Stack | Hetzner Stack | What Changes |
|-------------|------------------|---------------|-------------|
| 100 | $0–1 | $5 | Nothing — free tiers cover everything |
| 500 | $0–2 | $10–12 | R2 may exceed 10 GB free tier (+$0.60) |
| 2,000 | $5–10 | $20–25 | Upgrade VPS, add managed DB |
| 5,000+ | $15–30 | $30–50 | Split services, add load balancing |

---

## 8. Indian competitors leave clear gaps in pricing and features

The Indian resume builder market is fragmented between expensive international players (Zety at ₹2,200/month, Resume.io at ₹2,089/month) and ultra-budget Indian tools (BigResume at ₹75/month, NextCV at ₹100 one-time). The sweet spot is underserved.

**Pricing landscape:**

| Tier | Players | Monthly Price | Annual Price |
|------|---------|--------------|-------------|
| Ultra-budget | BigResume, NextCV, Resumemaker.in | ₹75–100 | ₹625 |
| Budget | ResumeGyani, Naukri, HyreSnap | ₹199–499 | ₹899 |
| Mid-range | Hiration, Novoresume | ₹499–899 | ₹999–3,899 |
| Premium | Zety, Resume.io | ₹2,089–2,200 | ₹5,799–6,800 |

**Your proposed pricing (₹149–249 single, ₹399–649/month) sits in the budget-to-mid-range sweet spot** — affordable enough for students and freshers, yet positioned above ultra-budget tools to signal quality.

**Critical market gaps your product can exploit:**

Indian users **strongly prefer one-time payments** over subscriptions — auto-renewal is the single most common complaint across Zety and Resume.io reviews. Offering both a ₹199 single-download option and a monthly plan addresses this directly. Most international players lock PDF downloads behind expensive paywalls (Zety only offers TXT on free tier), making your "1 free PDF download" model genuinely competitive.

**ATS optimization/scoring** is the #1 feature Indian job seekers value, yet most budget tools don't offer it. AI-powered keyword matching against job descriptions is a high-value differentiator that costs you under $0.003 per use. **UPI payment support** is table stakes for India — international players lose conversions by not supporting it. And the **fresher/student segment** (10M+ graduates entering India's job market annually) remains underserved by quality tools.

The most valued features across competitor reviews: ATS scoring, AI content suggestions (especially for freshers who struggle with phrasing), LinkedIn-to-resume import, professional templates, and PDF download capability.

---

## 9. Total monthly cost stays under ₹800 at launch, ₹2,500 at 500 users

Here's the complete cost breakdown assuming the recommended stack:

**At launch (100 users/month):**

| Component | Service | Monthly Cost |
|-----------|---------|-------------|
| Hosting (backend + DB) | Oracle Cloud Free ARM | $0 |
| Frontend CDN | Cloudflare Pages | $0 |
| File storage | Cloudflare R2 free tier | $0 |
| AI/LLM (200 optimizations) | Gemini 2.5 Flash free tier | $0 |
| Resume parsing (100 parses) | Tika + LLM prompt (~$0.20) | $0.20 |
| Payment gateway fees | Cashfree 1.89% on ~₹15,000 revenue | ~₹283 (~$3.40) |
| Domain + DNS | Cloudflare + domain | ~$1 |
| Email (transactional) | Resend free tier (3K emails/month) | $0 |
| **Total** | | **~$5/month (₹415)** |

**At moderate scale (500 users/month):**

| Component | Service | Monthly Cost |
|-----------|---------|-------------|
| Hosting | Oracle Free or Hetzner CAX11 | $0–5 |
| Frontend CDN | Cloudflare Pages | $0 |
| File storage (50 GB) | Cloudflare R2 ($0.015/GB beyond 10 GB) | $0.60 |
| AI/LLM (1,500 optimizations) | DeepSeek V3.2 or Gemini paid | $0.50–1.50 |
| Resume parsing (500 parses) | Tika + LLM prompt | $1.00 |
| Payment gateway fees | Cashfree 1.89% on ~₹75,000 revenue | ~₹1,418 (~$17) |
| Domain + DNS | Cloudflare | $1 |
| Email (transactional) | Resend Starter ($20 for 50K emails) | $0–20 |
| **Total** | | **~$20–45/month (₹1,660–3,740)** |

At 500 users/month, the total stays **under ₹3,000/month if using Oracle Free** or just barely over with Hetzner. The payment gateway fee is the largest cost component — and it's proportional to revenue, so it's self-funding. Note that the AI costs (LLM for optimization + parsing) total under **$3/month even at 500 users** — this is the most counterintuitive finding of the entire analysis.

**Revenue projection at 500 users/month** (assuming 5% conversion to paid at ₹399 average): 25 paying users × ₹399 = ₹9,975/month revenue. Infrastructure cost of ₹2,000 means **~80% gross margin** from day one.

---

## 10. Recommended architecture for the complete system

**High-level component diagram:**

```
[React SPA on Cloudflare Pages]
         ↕ REST API (HTTPS)
[Spring Boot Backend on Oracle Cloud ARM]
    ├── Spring Security (JWT + Google OAuth2)
    ├── Resume Parser Service (Tika + LLM structured extraction)
    ├── AI Optimization Service (Gemini/DeepSeek via OpenRouter)
    ├── PDF Generation Service (Flying Saucer / Gotenberg)
    ├── Payment Service (Cashfree webhooks)
    └── PostgreSQL (self-hosted on same VM)
         ↕ S3-compatible API
[Cloudflare R2 — resume uploads + generated PDFs]
```

**Database schema (core tables):**

```sql
users (id, email, password_hash, name, auth_provider, profile_photo_url,
       free_downloads_used, subscription_status, subscription_plan,
       subscription_expiry, cashfree_customer_id, created_at, updated_at)

resumes (id, user_id, title, template_id, resume_data_json, 
         original_file_url, generated_pdf_url, is_optimized,
         created_at, updated_at)

resume_versions (id, resume_id, version_number, resume_data_json, 
                 optimization_source_jd, created_at)

payments (id, user_id, cashfree_order_id, amount, currency, 
          payment_method, status, type [ONE_TIME/SUBSCRIPTION], created_at)

subscriptions (id, user_id, cashfree_subscription_id, plan, 
               status, current_period_start, current_period_end, created_at)

templates (id, name, category, thumbnail_url, template_file_path, 
           is_premium, sort_order)
```

The `resume_data_json` column stores the full structured resume as a JSONB field in PostgreSQL — this is more flexible than normalizing every resume field into separate tables and makes it trivial to support different resume sections per template.

**AI optimization pipeline flow:**

1. User pastes job description → frontend sends JD text + selected resume ID to `/api/optimize`
2. Backend fetches resume data from PostgreSQL, constructs prompt: system instructions + resume JSON + job description
3. Calls AI API (Gemini/DeepSeek via OpenRouter) with structured output instructions (return JSON)
4. Parses AI response → generates diff/comparison showing changes
5. Frontend displays side-by-side comparison with keyword highlights
6. User accepts changes → backend saves new `resume_version` → triggers PDF regeneration

**File upload and storage flow:**

1. User uploads PDF/DOCX → Spring Boot receives multipart file
2. Store original file to Cloudflare R2 via S3-compatible API (`aws-sdk` or `minio-java`)
3. Extract text via Tika → send to LLM for structured extraction → populate `resume_data_json`
4. When user downloads → generate PDF from template + data via Flying Saucer → cache generated PDF on R2
5. Serve PDF to user via R2 presigned URL (zero egress cost)

**Key technical decisions:**

- **Store resumes as structured JSON, not raw text.** This enables template switching, partial editing, and AI optimization at the field level rather than regenerating entire documents.
- **Use Cloudflare R2 presigned URLs** for downloads rather than streaming through your backend. This offloads bandwidth and reduces server load.
- **Implement rate limiting** on AI endpoints (Spring Boot `@RateLimiter` or Bucket4j) to prevent abuse during the free tier.
- **Use WebClient (non-blocking)** for AI API calls to avoid tying up servlet threads during the 2–5 second LLM response time.
- **Deploy with Docker Compose** on Oracle Cloud ARM: one container for Spring Boot, one for PostgreSQL, and optionally one for Gotenberg. The 24 GB RAM handles all three comfortably.

---

## Conclusion: a viable product at near-zero infrastructure cost

The economics of building an AI-powered resume builder in 2026 are remarkably favorable. **AI API costs have collapsed to the point where 500 resume optimizations cost less than a cup of coffee.** Free-tier cloud infrastructure from Oracle and Cloudflare eliminates hosting costs entirely at launch. The real costs are your time (development) and payment gateway fees (which are proportional to revenue).

Three decisions matter most for success. First, **sign up for Cashfree before March 31, 2026** to lock in the 1.6% promotional rate — this saves ₹8–11 per subscription transaction versus Razorpay. Second, **use the LLM-as-parser approach** (Tika for text extraction + Gemini/DeepSeek for structured field extraction) rather than paying for a dedicated parsing API — this saves $800+/year while providing comparable accuracy for a resume builder's use case. Third, **target freshers and students with UPI payments and one-time purchase options** — this is the largest underserved segment in India's resume builder market, where 10M+ graduates enter the workforce annually and most cannot afford ₹2,000/month international tools.

The complete recommended stack: Spring Boot on Oracle Cloud ARM, React on Cloudflare Pages, PostgreSQL self-hosted, Cloudflare R2 for storage, Gemini 2.5 Flash (free) → DeepSeek V3.2 for AI, Flying Saucer for PDF generation, Cashfree for payments, and LinkedIn PDF upload for profile import. **Total monthly cost at launch: under ₹500.** Total at 500 users: under ₹2,500. The ₹3,000/month budget has more than enough headroom.