Risk Register
Product: Global Contractor Risk Checker
Owner: Abhishek Dhama
Date: 14/08/2025

Method

Impact: Low/Med/High

Likelihood: Low/Med/High

Trigger: detectable signal

Mitigation: planned response

Owner: accountable role

Items

External API instability

Impact: High; Likelihood: Med

Trigger: Error rate > 3% over 15 min

Mitigation: circuit breakers, retries with backoff, fallback sources, partial UI

Owner: Eng Lead

False positives/negatives in risk scoring

Impact: High; Likelihood: Med

Trigger: Internal QA variance > target threshold

Mitigation: multi-source corroboration, human-in-the-loop reviews, versioned ruleset with A/B

Owner: Data/ML Lead

Data staleness by country

Impact: Med; Likelihood: Med

Trigger: last_updated > 90 days for N% of countries

Mitigation: update cadences, admin alerts, ownership per region

Owner: Content Ops

Legal/privacy constraints (GDPR/CCPA)

Impact: High; Likelihood: Low

Trigger: DPIA gaps or DSR backlog

Mitigation: DPIA, DPA with providers, data minimization, retention policies

Owner: Legal/Privacy

Performance regressions

Impact: Med; Likelihood: Med

Trigger: p95 latency breach for 3 consecutive days

Mitigation: autoscaling, caching, query tuning, SLO alerting

Owner: Eng Lead

Customer confusion (score interpretation)

Impact: Med; Likelihood: Med

Trigger: support tickets with “score meaning” tag increase

Mitigation: on-page education, “how score is calculated” modal, tooltips

Owner: PM + Design

Abuse/rate-limit evasion

Impact: Low; Likelihood: Med

Trigger: anomalous usage patterns

Mitigation: per-user/org throttles, IP-based heuristics, CAPTCHAs (public mode)

Owner: Security

Misalignment with Deel modules

Impact: Med; Likelihood: Low

Trigger: integration friction during pilot

Mitigation: embed UI in onboarding flow; align APIs early with internal teams

Owner: PM

Monitoring and review

Weekly risk review during Phase 1–2; monthly thereafter

Risk burndown chart linked to acceptance gates