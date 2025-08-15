Analytics and Metrics Plan
Product: Global Contractor Risk Checker
Owner: Abhishek Dhama
Date: 14/08/2025

Measurement goals

Demonstrate adoption, value, and reliability

Identify friction points in search → detail → PDF funnel

Provide operational observability for engineering

Event taxonomy (client and server)

filter_change: {filter_name, from, to}

country_view: {country, from_search: bool}

risk_check_request: {country, contractor_type, payment_method}

risk_check_error: {error_code, source}

pdf_click: {country, context: detail|post_check}

pdf_generate: {duration_ms, ruleset_version}

pdf_download_success: {bytes}

admin_rule_create|update|publish: {rule_id, country, version}

notification_opt_in|opt_out: {country}

notification_sent: {country, change_summary}

KPIs

Adoption: DAU/WAU, orgs using risk check, feature penetration

Funnel conversion:

search → country_view (%)

country_view → risk_check (%)

risk_check → pdf_generate (%)

pdf_generate → pdf_download_success (%)

Performance/reliability:

p95 latency per endpoint

Error rate by integration

PDF p95 time

Content freshness:

% countries updated in last 90 days

Ruleset coverage

Dashboards

PM dashboard: funnel, country distribution, top searches, top-risk countries

Eng dashboard: latency, error rates, source failures, cache_hit ratio

Ops dashboard: notifications sent, opt-in coverage, SLA adherence

Data governance

PII minimization: store only necessary fields (hashed emails if public mode)

Retention: raw event logs 90 days; aggregated metrics 12 months

Access control: role-based; audit logs for exports
