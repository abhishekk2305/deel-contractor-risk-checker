
## **UI/UX Design Document**

### **1. Design Goals**

* Clear visibility of contractor compliance risk for users.
* Fast, intuitive search and filter by country, contractor type, and payment method.
* Mobile-first responsive design.
* Deel branding consistency (colors, fonts, logos).
* Easy PDF report generation and lead capture flow.

---

### **2. User Personas**

| Persona            | Description                         | Goals                                   | Pain Points                        |
| ------------------ | ----------------------------------- | --------------------------------------- | ---------------------------------- |
| HR Manager         | Manages global contractors          | Quickly assess compliance risk          | Manual research, legal uncertainty |
| Compliance Officer | Ensures company follows labor laws  | Prevent fines and misclassification     | Hard to track multiple countries   |
| Contractor         | Needs clarity on legal requirements | Understand what’s needed for compliance | Confusing local laws               |
| Deel Admin         | Maintains compliance database       | Keep data accurate and updated          | Errors in manual updates           |

---

### **3. User Flow**

1. **Landing Page**

   * CTA: “Check Contractor Compliance”
   * Optional signup for lead capture
2. **Search & Filter**

   * Search by country
   * Filter by contractor type and payment method
3. **Country Detail Page**

   * Risk Level Badge (Low / Medium / High)
   * Top 3 Compliance Risks
   * Actionable Recommendations
   * Penalty Ranges
   * Last Updated Date
   * PDF Report Generation CTA
4. **PDF Report Download**

   * Optional gated download (Name + Email → CRM)
5. **Admin Panel**

   * Add/Edit/Delete compliance rules
   * Track version history
   * Analytics dashboard for searches, PDF downloads, and leads

---

### **4. Wireframes (Text Description)**

* **Landing Page:** Search bar centered, country list below, CTA for lead capture.
* **Search Results Page:** Table view with countries, risk level badges, filter sidebar.
* **Country Detail Page:** Card layout showing risk badge, top 3 risks, recommendations, penalties, and PDF export button.
* **PDF Report:** Deel-branded header/footer, contractor summary, risk details, actionable recommendations.
* **Admin Panel:** Left navigation menu, table of rules, edit/delete buttons, add rule form modal.
* **Analytics Dashboard:** Graphs for top searched countries, PDF downloads, conversion rate, filter by date.

---

### **5. UI Elements**

* Buttons: Primary (CTA) and Secondary (links, actions)
* Badges: Risk Levels (Green / Amber / Red)
* Tables: Search results, compliance rules
* Forms: Lead capture, rule management
* Charts: Analytics dashboard (bar chart, pie chart, line chart)

---

### **6. Branding**

* Colors: Deel’s brand palette
* Fonts: Deel standard fonts (e.g., Inter or Roboto)
* Logo placement: Top left, PDF reports header

---

### **7. Accessibility**

* WCAG 2.1 compliance
* Keyboard navigable
* Screen reader support for visually impaired users

