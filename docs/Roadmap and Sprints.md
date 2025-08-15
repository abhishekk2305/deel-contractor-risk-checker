Roadmap and Sprints
Product: Global Contractor Risk Checker (Deel)
Owner: Abhishek Dhama
Date: 14/08/2025

Release strategy

Phase 1: Core risk check foundation (Internal + Pilot)

Phase 2: Data breadth and customer-facing enhancements

Phase 3: Predictive insights and automation

Milestones and sprints
Phase 1 (Weeks 1–4)

M1.1 Architecture + Scaffolding (Week 1)

Backend/API skeleton, auth, logging, feature flags

Frontend shell: search, country list, detail page

DB schema migrations

M1.2 External integrations (Week 2)

Sanctions/PEP provider

Internal risk history lookup

M1.3 Risk scoring engine + Admin CMS (Week 3)

Ruleset v1, score computation contract, versioning

Admin CRUD + publish workflow

M1.4 PDF + Pilot (Week 4)

PDF generator, template, SLA benchmarks

Internal pilot in 5 countries
Acceptance gates:

p95 API latency < 1.5s

Risk score determinism under same inputs

Audit trail operational

Security review passed

Phase 2 (Weeks 5–8)

M2.1 Country data expansion (Week 5–6)

Business registries for top 30 markets

Adverse media integration

M2.2 Analytics dashboard + Notifications (Week 7)

Event collection, charts, subscriptions

M2.3 Customer-facing launch (Week 8)

Docs, support playbooks, rollout to selected enterprise accounts
Acceptance gates:

Dashboard accuracy validated

Notifications reliability > 99% delivery

Customer enablement complete

Phase 3 (Weeks 9–12)

M3.1 Predictive signals (Week 9–10)

Early warning signals (pattern-based) and feature flags

M3.2 API for enterprise (Week 11–12)

Auth, rate limiting, idempotency keys, docs
Acceptance gates:

p95 < 2s incl. predictive checks

Security pen test passed

API doc quality score (internal rubric)

Ownership and rituals

PM: roadmap, requirements, acceptance gates

Tech Lead: architecture, code quality, SLOs

Design: UX flows, accessibility

Data/ML: scoring engine, model integrity

Weekly check-in; bi-weekly sprint demos; monthly exec review