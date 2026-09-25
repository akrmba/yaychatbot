# Data Processing Agreement (DPA)
## Between [CONTROLLER LEGAL NAME] and YayChatbot / [PROCESSOR LEGAL NAME]

> **Instructions:** Complete all `[PLACEHOLDER]` sections with legal counsel before execution.
> This template is based on GDPR Article 28 requirements.

---

**This Data Processing Agreement** ("Agreement") is entered into as of [DATE] between:

**Controller:** [CONTROLLER LEGAL NAME], registered at [ADDRESS], ("Controller")

**Processor:** [PROCESSOR LEGAL NAME], registered at [ADDRESS], operating the YayChatbot service ("Processor")

---

### 1. Definitions

Terms used in this Agreement have the meanings given in the EU General Data Protection Regulation (GDPR) 2016/679.

---

### 2. Subject Matter and Duration

2.1 The Processor shall process personal data on behalf of the Controller for the purpose of providing the YayChatbot SaaS service as described in the main Service Agreement dated [DATE].

2.2 This Agreement commences on [DATE] and continues until termination of the Service Agreement.

---

### 3. Nature and Purpose of Processing

| Attribute | Detail |
|---|---|
| Nature | Collection, storage, retrieval, transmission, deletion of chat and lead data |
| Purpose | Lead qualification, sales automation, analytics |
| Type of personal data | Chat messages, name, email, phone, company, IP address, UTM parameters |
| Categories of data subjects | Website visitors; dashboard users |
| Duration | As per Section 2.2 |

---

### 4. Obligations of the Processor

The Processor shall:

4.1 Process personal data only on documented instructions from the Controller.

4.2 Ensure that persons authorised to process personal data are bound by confidentiality obligations.

4.3 Implement appropriate technical and organisational measures (Article 32), including:
- Encryption at rest (AES-256) and in transit (TLS 1.2+)
- Role-based access control (RBAC)
- API key hashing (SHA-256)
- Automated data retention enforcement
- Audit logging of all sensitive actions

4.4 Not engage sub-processors without prior written authorisation from the Controller. Current authorised sub-processors are listed in Annex B.

4.5 Assist the Controller in responding to data subject rights requests within 72 hours of receipt.

4.6 Notify the Controller of any personal data breach without undue delay and no later than 48 hours after becoming aware.

4.7 Delete or return all personal data upon termination of the Service Agreement, at the Controller's choice.

4.8 Make available all information necessary to demonstrate compliance with this Article and allow for audits.

---

### 5. Obligations of the Controller

The Controller shall:

5.1 Ensure there is a lawful basis for processing before instructing the Processor.

5.2 Provide clear and accurate instructions to the Processor.

5.3 Ensure data subjects are informed of the processing via a compliant Privacy Policy.

---

### 6. Sub-processors

6.1 The Controller grants general authorisation for the Processor to engage sub-processors listed in Annex B.

6.2 The Processor shall impose equivalent data protection obligations on sub-processors.

6.3 The Processor shall notify the Controller of any intended changes to sub-processors at least 30 days in advance.

---

### 7. International Transfers

7.1 Any transfer of personal data to a third country shall be subject to appropriate safeguards (Standard Contractual Clauses, adequacy decision, or other GDPR Chapter V mechanism).

7.2 Current transfer mechanisms: [LIST — e.g., EU SCCs with Anthropic (US), AWS (EU-WEST-1)]

---

### 8. Liability and Indemnification

8.1 Each party shall be liable for damages caused by processing that infringes GDPR in accordance with Article 82.

8.2 [ADDITIONAL LIABILITY CAPS — to be agreed with legal counsel]

---

### 9. Governing Law

This Agreement is governed by the laws of [JURISDICTION].

---

### Annex A — Technical and Organisational Measures

| Measure | Implementation |
|---|---|
| Encryption at rest | AES-256 via database provider |
| Encryption in transit | TLS 1.2+ enforced |
| Access control | RBAC (OWNER / ADMIN / MEMBER roles) |
| Authentication | Supabase JWT + API key (SHA-256 hashed) |
| Audit logging | Immutable AuditLog table, append-only |
| Data retention | Automated daily cron, configurable per org |
| Vulnerability management | Dependency scanning, security headers (Helmet.js) |
| Incident response | [DESCRIBE PROCESS] |

---

### Annex B — Authorised Sub-processors

| Sub-processor | Purpose | Location | Transfer Mechanism |
|---|---|---|---|
| Supabase | Authentication, database hosting | [REGION] | [SCCs / Adequacy] |
| [Cloud Provider] | Infrastructure | [REGION] | [SCCs / Adequacy] |
| Anthropic | LLM inference | USA | EU SCCs |
| OpenAI | LLM inference (optional) | USA | EU SCCs |
| Stripe | Payment processing | USA | EU SCCs |
| Resend | Transactional email | [REGION] | [SCCs / Adequacy] |

---

**Signed for and on behalf of the Controller:**

Name: _____________________________ Date: _______________

**Signed for and on behalf of the Processor:**

Name: _____________________________ Date: _______________
