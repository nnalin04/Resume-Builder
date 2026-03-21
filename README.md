# AI Resume Builder

🚀 **Live App:** [https://resume-builder-black-nu.vercel.app/](https://resume-builder-black-nu.vercel.app/)

An AI-powered Resume Builder SaaS built for efficiency and cost-effectiveness. This platform allows users to create, parse, and optimize their resumes using state-of-the-art AI, while keeping the infrastructure running costs under ₹3,000/month.

## Features

- **AI Resume Parsing**: Extracts structured data (name, email, skills, experience) from uploaded PDFs and DOCX files using Apache Tika and AI models like Gemini/DeepSeek.
- **AI Optimization**: Matches and optimizes user resumes against job descriptions to improve ATS scoring and readability. 
- **Professional Templates**: Clean, classic resume layouts generated with precision.
- **LinkedIn Integration**: Import profile data via LinkedIn's PDF export feature.
- **Freemium Model**: First PDF download is free; affordable one-time and monthly subscription plans for Indian job seekers and freshers.
- **UPI Payments integration**: Fast and easy checkout via Cashfree.

## Tech Stack

- **Frontend**: React Single Page Application (SPA), deployed on Vercel.
- **Backend**: Spring Boot 3 + Spring Security (JWT & Google OAuth2).
- **Database**: PostgreSQL (Store resumes as structured JSONB for maximum flexibility).
- **AI Models**: Gemini 2.5 Flash / DeepSeek V3.2 routed via OpenRouter.
- **File Storage**: Cloudflare R2 (for resumes and generated PDFs).
- **PDF Generation**: Flying Saucer + Thymeleaf (MVP) / Gotenberg (Production).
- **Payment Gateway**: Cashfree.
- **Infrastructure**: Designed to run efficiently on Oracle Cloud Free ARM instances.

## Try it out!

You can build and optimize your resume right now over at: [resume-builder-black-nu.vercel.app](https://resume-builder-black-nu.vercel.app/)
