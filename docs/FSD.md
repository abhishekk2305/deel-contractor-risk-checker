Functional Specification Document (FSD)

Project Name: Global Contractor Risk Checker (GCRC)
Version: 1.0
Prepared By: Abhishek Dhama
Date: 14/08/2025

Purpose
This FSD defines the functional behavior of the Deel-native Global Contractor Risk Checker (GCRC). It translates the PRD into implementable, testable features covering user workflows, data inputs/outputs, validations, permissions, and error handling.

Scope
In scope:

Contractor risk check integrated in Deel onboarding

Search and country detail views with risk badges

Risk scoring using external sources and Deel internal history

PDF report generation (Deel-branded)

Admin CMS for rules with version history

Analytics dashboard (searches, PDF downloads, conversions)

Notifications for rule updates (opt-in)
Out of scope (v1):

Multi-language UI (can be Phase 2)

Custom risk model per client

Bulk risk checks via CSV (API-first in Phase 2)

User Roles and Permissions

Customer HR Manager: Run risk checks, view/download reports

Customer Compliance Officer: Same as HR + manage notification subscriptions

Deel Admin: Manage compliance rules, view analytics, audit trails

Read-only Stakeholder: View results and PDFs only

Functional Modules
A) Risk Check

Inputs: contractor_name (string), country (ISO), contractor_type (enum: independent, EOR, freelancer), payment_method (enum: wire, ach, crypto, paypal), registration_id (optional), email (optional for record).

Process:

Validate inputs

Query internal risk history (Deel)

Query external sources: sanctions/PEP, adverse media, business registries (if configured)

Compute risk score (0–100) and classification (Low/Medium/High)

Compose top 3 risks, recommendations, penalty ranges (by country)

Outputs:

score (0–100), tier (low|medium|high)

top_risks[] (3 entries), recommendations[] (3–5)

penalty_range, last_updated, source_summary

Validations:

country is ISO 3166-1 alpha-2

contractor_type/payment_method allowed values

rate limit: max 10 checks/min/user

Error states:

External API timeout → partial response with “source_unavailable” tags; UI shows non-blocking warning

Invalid inputs → 422 with field-level messages

Exceeded rate limit → 429 with retry-after

B) Search and Country Detail

Search:

Autocomplete by country name

Filters: contractor_type, payment_method

Country detail:

Risk badge (color-coded)

Top risks, recommendations, penalties, last updated

Link to “Run risk check” pre-filled with country

C) PDF Report

Trigger: From country detail or post-risk-check screen

Flow:

Optional lead capture (name, email) if used in public mode

Generate PDF server-side with Deel branding

Content:

Contractor + country summary

Risk badge + score

Top risks, recommendations, penalties

Timestamp, version of ruleset

SLA: Generate within 5 seconds p95

D) Admin CMS

Manage compliance rules per country (CRUD)

Fields: rule_type, description, severity, country, effective_from, source_url

Version history (immutable); diff view

Publish workflow: draft → published

Permissions: Deel Admin only; audit log on changes

E) Analytics Dashboard (Admin)

Metrics:

Searches by country (daily/weekly)

PDF downloads

Risk checks run and distribution by tier

Lead captures (if public mode used)

Filters: date range, country, contractor_type

F) Notifications

Users can subscribe to countries

When published rules change:

Send email/in-app notification

Payload: country, summary of change, link to detail

UI/UX States and Validation Messages

Loading states: skeletons for table and detail cards

Empty states: “No results found. Try adjusting filters.”

Error banners:

“Some sources were unavailable. Showing partial results.”

“Please correct the highlighted fields.”

Acceptance Criteria (module-level)

Risk check returns score and tier for valid input within 2s p95 (excluding PDF).

PDFs generated and downloadable within 5s p95.

Admin edits create new version entries; previous versions preserved.

Analytics events recorded for search_submit, filter_change, country_view, risk_check_success, pdf_generate, pdf_download_success, admin_rule_publish.

Non-functional (functional ties)

Rate limits enforced; users receive clear 429 UI state

Audit log entries on all Admin CRUD

Data retention: PDFs and logs retained per policy (see TSD)

Edge Cases

Country unsupported → show informative message and link to contact

Duplicate contractor risk checks within 30 seconds → return cached result with “cache_hit”