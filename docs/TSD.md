## **Technical Specification Document (TSD)**

**Project Name:** Global Contractor Risk Checker
**Version:** 1.0
**Prepared By:** \[Your Name]
**Date:** \[Insert Date]

---

### **1. Overview**

The TSD describes the **technical implementation** of the Global Contractor Risk Checker (GCRC) inside Deel’s ecosystem. It ensures the product is **scalable, secure, and fully integrated** with Deel’s onboarding, payroll, and compliance systems.

---

### **2. System Architecture**

**2.1 Architecture Layers**

1. **Frontend (Client Layer)**

   * Framework: Express.js with React
   * Responsive design: Tailwind CSS
   * Components: Search, country detail, risk scoring dashboard, PDF export

2. **Backend (API Layer)**

   * Framework: Node.js + Express
   * Responsibilities:

     * Handle client requests
     * Compute risk scores
     * Serve PDF reports
     * Connect to external APIs & internal Deel DB

3. **AI/Rule Engine Layer**

   * Language: Node.js/Express
   * Functions:

     * Sanctions & PEP screening
     * Adverse media scanning
     * Risk scoring computation
     * Recommendations generation

4. **Database Layer**

   * PostgreSQL for structured compliance data
   * PostgreSQL for unstructured data (media, reports)
   * Version control tables for compliance rules

5. **Integration Layer**

   * Deel internal APIs (Contractor Onboarding, Payroll, Compliance)
   * External APIs: OFAC, UN, EU sanctions lists, PEP databases
   * Optional: HubSpot/CRM for lead capture

---

### **3. Data Flow**

**Step 1:** Client enters contractor info → Frontend sends request to Backend API.
**Step 2:** Backend queries:

* Local compliance DB
* External APIs for sanctions & PEP lists
* Internal Deel compliance history
  **Step 3:** AI engine computes risk score + recommendations.
  **Step 4:** Backend returns results → Frontend displays risk badge, top 3 risks, action recommendations.
  **Step 5:** Optional: User exports PDF → Generated via Puppeteer → Stored in S3 → Download link provided.

---

### **4. Database Schema (Simplified)**

**Tables:**

1. `countries` – country name, ISO code, last updated
2. `compliance_rules` – rule ID, country, type, description, severity
3. `contractors` – contractor ID, name, country, contractor type, payment method
4. `risk_scores` – contractor ID, timestamp, score, top risks, recommendations
5. `pdf_reports` – report ID, contractor ID, generation timestamp, S3 URL

---

### **5. API Endpoints (Example)**

| Endpoint           | Method          | Input                | Output                           | Description                             |
| ------------------ | --------------- | -------------------- | -------------------------------- | --------------------------------------- |
| `/api/risk-check`  | POST            | Contractor info JSON | Risk score + top 3 risks         | Computes risk score                     |
| `/api/countries`   | GET             | None                 | List of countries + last updated | Fetch country metadata                  |
| `/api/pdf-report`  | POST            | Contractor ID        | PDF URL                          | Generates PDF report                    |
| `/api/admin/rules` | POST/PUT/DELETE | Rule data            | Success/Error                    | Admin: add/edit/delete compliance rules |

---

### **6. Security & Compliance**

* HTTPS/TLS everywhere
* JWT-based authentication for all API calls
* Role-based access control for admin functions
* AES-256 encrypted storage for sensitive contractor info
* GDPR-compliant storage & deletion policies

---

### **7. Performance & Scalability**

* API response time < 1.5s for 95% of requests
* Backend auto-scales using AWS Lambda/EC2 with load balancer
* DB optimized with indices on country, contractor type, timestamps

---

### **8. Deployment Plan**

* Frontend: Vercel
* Backend: AWS EC2 / Lambda with Docker containers
* Database: AWS RDS + MongoDB Atlas
* CI/CD: GitHub Actions → Automated testing → Deployment
* Monitoring: CloudWatch + Sentry for errors

---

### **9. Logging & Analytics**

* Track searches by country
* Track PDF downloads
* Track client actions & conversion (lead capture)
* Store logs securely in CloudWatch + optional Google Sheets sync

---

### **10. Testing & QA**

* Unit tests for API endpoints
* Integration tests with external APIs
* UI testing on desktop + mobile
* AI engine test cases for scoring accuracy
* Load testing for 1000+ concurrent requests

---
