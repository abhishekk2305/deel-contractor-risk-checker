# Overview

The Global Contractor Risk Checker (GCRC) is a production-ready web application designed for Deel to assess contractor risks across different countries. The system provides comprehensive risk assessments with real-time external provider integration, compliance rule management, PDF report generation, and analytics capabilities for making informed decisions about international contractor engagements.

## Production Status ✅
- **External Providers**: ComplyAdvantage (sanctions/PEP) + NewsAPI (adverse media) integration
- **Enhanced Risk Engine**: Multi-factor weighted scoring with real-time provider data
- **Monitoring & Metrics**: Comprehensive health checks, Prometheus metrics, structured logging  
- **Database**: Seeded with 13 countries, compliance rules, and rule templates
- **API Testing**: Complete test suite with curl scripts for all endpoints
- **Performance**: Sub-3-second risk assessments, rate limiting, error handling

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **React + Vite**: Modern React application using Vite for fast development and building
- **TypeScript**: Full type safety across the frontend codebase
- **Tailwind CSS + shadcn/ui**: Component-based styling with a consistent design system following Deel's branding
- **Wouter**: Lightweight client-side routing for navigation
- **TanStack Query**: Server state management with caching, background updates, and optimistic updates
- **React Hook Form + Zod**: Form handling with runtime validation

## Backend Architecture
- **Express.js + TypeScript**: RESTful API server with full type safety
- **Drizzle ORM**: Type-safe database queries and schema management
- **PostgreSQL**: Primary database using Neon serverless hosting
- **Modular Service Layer**: Separate services for risk engine, PDF generation, notifications, and external API integrations
- **Middleware Stack**: Authentication, rate limiting, request validation, error handling, and logging

## Database Design
- **Schema-first approach**: Shared schema definitions between frontend and backend using Drizzle
- **Normalized tables**: Countries, contractors, risk scores, compliance rules, PDF reports, and audit logs
- **Version control**: Ruleset versioning for compliance rule changes
- **UUID primary keys**: Distributed-friendly identifiers

## Authentication & Authorization
- **JWT-based authentication**: Stateless token-based auth with role-based access control
- **Role-based permissions**: Admin access for rule management and analytics
- **Optional authentication**: Public access for basic country search and information

## Enhanced Risk Assessment Engine
- **Real-time provider integration**: ComplyAdvantage API for sanctions/PEP screening, NewsAPI for adverse media monitoring
- **Multi-factor scoring**: Weighted algorithm with industry-standard parameters (sanctions: 45%, PEP: 15%, adverse media: 15%, internal history: 15%, country baseline: 10%)
- **Parallel processing**: Concurrent external provider calls with timeout handling and fallback strategies
- **Three-tier classification**: Low (<30), Medium (30-70), High (>70) risk categorization with contextual recommendations
- **Feature flags**: Environment-based provider selection supporting mock and production modes
- **Result caching**: 24-hour expiration with comprehensive metadata and provider information

## PDF Generation & Storage
- **Puppeteer-based rendering**: HTML-to-PDF conversion with Deel branding
- **AWS S3 storage**: Secure file storage with pre-signed URLs for controlled access
- **Background job processing**: Redis-based queue system for async PDF generation
- **Template system**: Reusable PDF templates with dynamic content injection

## Caching & Performance
- **Redis caching**: Application-level caching for frequently accessed data
- **Query optimization**: Efficient database queries with proper indexing
- **Rate limiting**: Redis-backed rate limiting to prevent API abuse
- **Response optimization**: Pagination, filtering, and sorting for large datasets

## Production Monitoring & Analytics
- **Health endpoints**: `/health`, `/ready`, `/live` for container orchestration
- **Prometheus metrics**: Request latency, error rates, throughput tracking with standard format export
- **Structured logging**: Pino logger with request tracing, provider integration status, and error tracking
- **Performance monitoring**: P95 latency tracking with alerting for slow requests (>2s)
- **Provider monitoring**: Real-time status tracking for ComplyAdvantage and NewsAPI integration
- **Metrics middleware**: Global request tracking with route normalization and response time analysis

# External Dependencies

## Database & Storage
- **Neon PostgreSQL**: Serverless PostgreSQL database hosting
- **AWS S3**: Object storage for PDF reports and static assets
- **Redis (Upstash)**: Caching layer and job queue management

## External APIs
- **ComplyAdvantage**: Sanctions and Politically Exposed Persons (PEP) screening
- **NewsAPI**: Adverse media monitoring and sentiment analysis
- **Postmark**: Transactional email service for notifications

## Development & Deployment
- **Drizzle Kit**: Database schema management and migrations
- **Vite**: Frontend build tool and development server
- **ESBuild**: Backend bundling for production deployment
- **TypeScript**: Static type checking across the entire stack

## UI & Styling
- **Radix UI**: Headless component primitives for accessibility
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library for consistent iconography
- **React Hook Form**: Form state management and validation

## State Management & Networking
- **TanStack Query**: Server state management with intelligent caching
- **Wouter**: Lightweight routing solution
- **Zod**: Runtime type validation and schema definition

## Monitoring & Analytics
- **Plausible**: Privacy-focused web analytics
- **Pino**: High-performance JSON logging
- **Custom error tracking**: Application-specific error handling and reporting