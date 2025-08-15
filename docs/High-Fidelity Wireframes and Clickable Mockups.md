Title: High-Fidelity Wireframes and Clickable Mockups
Product: Global Contractor Risk Checker (Deel)
Owner: [Your Name]
Date: [Insert Date]
Version: 1.0

Purpose and scope

Purpose: Provide stakeholder-ready visuals of all key screens with interaction notes so engineering and design can implement consistently.

Scope:

High-fidelity screens (desktop + mobile)

Clickable prototype flow

Component states (loading, empty, error)

Accessibility and responsive rules

Asset references (exported PNGs/PDFs)

Design system and branding

Brand: Deel

Colors (example, confirm with Deel brand guide):

Primary: #0F172A

Accent: #2D68FF

Success (Low risk): #10B981

Warning (Medium risk): #F59E0B

Danger (High risk): #EF4444

Text: #0B1220 / #6B7280 (muted)

Background: #FFFFFF / #0F172A (dark mode, Phase 2)

Typography: Inter (regular, medium, semibold)

Iconography: Standard UI icons (search, filter, download, info), vector SVG

Spacing: 8px baseline grid

Breakpoints: sm ≤ 640px, md ≤ 768px, lg ≤ 1024px, xl ≤ 1280px

Screen inventory
Desktop

D1 Landing / Home

D2 Search Results

D3 Country Detail

D4 Risk Check Results (post-check summary)

D5 PDF Lead Capture Modal (optional/public mode)

D6 Admin: Rules CMS (list + editor)

D7 Admin: Analytics Dashboard

D8 Notifications Preferences
Mobile

M1 Landing

M2 Search Results

M3 Country Detail

M4 Risk Check Results

M5 PDF Modal

M6 Admin list views (condensed)

Clickable prototype flow
Primary user flow (customer HR/Compliance)

Landing (D1/M1) → search_submit → Search Results (D2/M2)

Click country row → Country Detail (D3/M3)

Click “Run Risk Check” → Risk Check Results (D4/M4)

Click “Download PDF” → PDF Modal (D5/M5) → Download

Admin flow

Admin Dashboard (D7) → Rules CMS (D6) → Edit → Publish → Analytics (D7)

Detailed screen specs and annotations
D1: Landing / Home

Hero: “Check Contractor Compliance in 150+ Countries”

Components:

Search bar (autocomplete countries)

Filters: contractor_type (Independent/EOR/Freelancer), payment_method (Wire/ACH/Crypto/PayPal)

Featured countries list (chips with risk badges)

Secondary CTA (optional): “How risk score works”

States:

Loading: none

Empty: not applicable

Error: network banner if initial fetch fails

Actions:

On submit → D2 with query + filters

D2: Search Results

Layout: Table with columns: Country | Risk | Last Updated | Actions

Risk badges: Low (green), Medium (amber), High (red)

Filters persist in left sidebar/top bar on mobile

Pagination or infinite scroll

Actions:

Row click → D3

States:

Loading: table skeleton rows (5–10)

Empty: “No results. Adjust filters.”

Error: “Unable to load results. Retry.”

D3: Country Detail

Header: Country name, ISO, flag icon, Last Updated

Cards:

Risk Badge + short paragraph overview

Top 3 Compliance Risks (bullets with icons)

Actionable Recommendations (3–5 bullets)

Penalty Range (info panel)

Sources (links when available)

Primary action: “Run Risk Check”

Secondary action: “Download PDF”

States:

Loading: card skeletons

Error: “We couldn’t load details. Try again.”

No source links: collapse “Sources” section

D4: Risk Check Results

Context: after submitting the risk check form (if separate) or within country detail if inline

Summary:

Contractor summary: name (if provided), country, type, payment_method

Score (0–100) with tier badge

Top 3 risks + Recommendations summary (pulled + tailored)

Source status: show which sources contributed; tag partial_sources when any fail

Actions:

“Download PDF”

“Re-run” (rate-limited with timer)

States:

Loading: skeletons with “Fetching sources…”

Partial sources: amber inline alert “Some sources unavailable; results may be partial.”

D5: PDF Lead Capture Modal (optional)

Fields: Name, Email (if public mode)

Validation: required if gating is enabled; email format

Legal copy: “By downloading, you agree to our Privacy Policy.”

Actions:

“Generate PDF” → trigger server-side generation (spinner overlay)

States:

Loading: “Generating your report…”

Success: auto-download + “Report generated” toast

Error: “Couldn’t generate PDF. Please retry.”

D6: Admin — Rules CMS

List view:

Columns: Country | Rule Type | Severity | Updated | Status (Draft/Published) | Actions

Search and filters (country, rule_type, status)

Editor:

Fields: rule_type (enum), description (rich text), severity (1–5), country (select), effective_from (date), source_url

Versioning: “Create new version” and version history view with diff

Workflow: Draft → Publish (confirmation modal)

States:

Save spinner; error inline validations; toast on success

D7: Admin — Analytics Dashboard

Cards:

Searches by day/week

Risk checks run and tier distribution

PDF downloads and lead conversions

Top searched countries

Filters: date range, country, type

States:

Loading skeleton charts

Empty: “No events for selected range”

D8: Notifications Preferences

List of subscribed countries with toggle

CTA: “Subscribe to updates for this country” on country detail

States:

Confirmation toast on subscribe/unsubscribe

Component states and patterns

Buttons: Primary (filled accent), Secondary (outline), Destructive (danger)

Inputs: error state with helper text; disabled styles; loading spinners on async actions

Tables:

Row height: 48px

Text truncation with tooltip on overflow

Sortable columns: Country, Last Updated

Badges:

Low: green; Medium: amber; High: red; Partial: amber tag

Alerts:

Info: subtle blue

Warning: amber

Error: red

Modals:

Close on ESC, overlay click (except during critical operations)

Focus trap for accessibility

Accessibility

WCAG 2.1 AA

Color contrast ≥ 4.5:1 for text

Keyboard navigation:

Tab order defined

Skip-to-content link

Focus visible styles

ARIA:

aria-live for async status (“Generating PDF…”)

aria-invalid and describedby for form errors

Screen reader labels for badges: e.g., “Risk level: High”

Responsiveness

Mobile layouts:

Filters collapse into drawer

Tables convert to stacked cards:

Country (title), Risk (badge), Last Updated, chevron

Sticky bottom bar for primary actions (e.g., “Download PDF”)

Desktop:

Two-column layout on country detail (summary + details)

Persistent filter sidebar on search results

Asset references
Insert your actual assets in /docs/wireframes and update the list:

D1-landing.png

D2-search-results.png

D3-country-detail.png

D4-risk-check-results.png

D5-pdf-modal.png

D6-admin-rules-list.png

D6-admin-rule-editor.png

D7-admin-analytics.png

D8-notifications.png

M1–M6 mobile equivalents (e.g., M3-country-detail-mobile.png)

Prototype link

Figma project: [Insert Figma URL]

Pages/frames:

01 Landing

02 Search Results

03 Country Detail

04 Risk Check Results

05 PDF Modal

06 Admin – Rules

07 Admin – Analytics

08 Notifications

Prototype settings:

Device: Desktop (1440), Mobile (375)

Overflow behavior: No scroll on modals

Interaction notes: Hover on badges shows definition; error banners clickable to expand details

Handoff notes for engineering

Use Tailwind utility classes; follow spacing and breakpoint rules.

Implement skeleton loaders for list and detail pages.

Respect rate-limit feedback in UI (e.g., “Try again in 25s”).

Ensure all analytics events in Analytics-and-Metrics.md are fired from the relevant UI actions.

Internationalization hooks: keep strings centralized even if only EN in v1.

Change log

v1.0: Initial high-fidelity spec with asset placeholders and prototype structure.

