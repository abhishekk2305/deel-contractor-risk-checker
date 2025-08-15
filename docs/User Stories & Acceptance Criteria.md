
## **1. User Stories & Acceptance Criteria**

### **A. HR Manager / Compliance Officer**

**User Story 1:** Search for Contractor Compliance by Country

* **As an** HR Manager
* **I want to** search a country and see the contractor compliance risk
* **So that** I can quickly assess legal and financial risk before onboarding

**Acceptance Criteria:**

1. Search bar allows input of country name (autocomplete supported).
2. Filters available for contractor type (Independent/EOR/Freelancer) and payment method.
3. Search results show country, risk badge (Low/Medium/High), last updated date.
4. Clicking a country opens the **Country Detail Page** with detailed risks and recommendations.

---

**User Story 2:** View Detailed Compliance Risks

* **As an** HR Manager
* **I want to** view top 3 compliance risks, penalties, and actionable recommendations per country
* **So that** I can take immediate preventive action

**Acceptance Criteria:**

1. Country detail page displays risk badge prominently.
2. Top 3 compliance risks are clearly listed with short descriptions.
3. Penalty ranges are shown in local currency.
4. Recommendations are actionable and localized.
5. Last updated date is visible.

---

**User Story 3:** Export PDF Report

* **As an** HR Manager
* **I want to** export the compliance assessment to a PDF
* **So that** I can share it with my team or keep records

**Acceptance Criteria:**

1. PDF is branded with Deel logo and optional CTA “Book a Compliance Call.”
2. PDF includes risk badge, top 3 risks, recommendations, and penalty ranges.
3. User can download the PDF after optionally entering name/email (lead capture).
4. PDF generation works on both desktop and mobile.

---

### **B. Contractor / Freelancer (Optional Public User)**

**User Story 4:** Check Compliance Requirements

* **As a** Contractor
* **I want to** see high-level compliance requirements for my country
* **So that** I can prepare required documents for Deel onboarding

**Acceptance Criteria:**

1. Contractor can search country and view risk badge.
2. High-level compliance summary is displayed.
3. Recommendations are simplified and readable.
4. Option to download PDF (gated or ungated).

---

### **C. Admin / Deel Internal Team**

**User Story 5:** Manage Compliance Rules

* **As an** Admin
* **I want to** add, edit, or delete compliance rules per country
* **So that** the database stays accurate and up to date

**Acceptance Criteria:**

1. Admin panel allows CRUD operations on compliance rules.
2. Each rule shows country, type, description, severity, and last updated timestamp.
3. Version history is maintained automatically.
4. Only Admin role can access these functionalities.

---

**User Story 6:** Analytics & Reporting

* **As an** Admin
* **I want to** see analytics for searches, PDF downloads, and lead capture conversions
* **So that** I can measure product usage and ROI

**Acceptance Criteria:**

1. Dashboard displays top searched countries and trends over time.
2. PDF downloads tracked per country and contractor type.
3. Lead capture conversion metrics shown in chart format.
4. Dashboard is filterable by date and role.

---

### **D. Notifications / Alerts (Optional)**

**User Story 7:** Receive Update Notifications

* **As an** HR Manager
* **I want to** get notified when compliance rules are updated for countries I manage
* **So that** I can stay compliant

**Acceptance Criteria:**

1. Push/email notifications sent for rule updates.
2. Notification includes country, risk change, and brief description.
3. HR Manager can opt in/out of notifications.

---

This covers **all main roles and features**. Each story includes **clear acceptance criteria** that can be used by engineers and QA to validate completion.

