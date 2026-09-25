# Privacy Policy
## YayChatbot

**Last updated:** [DATE]
**Effective date:** [DATE]

> **Legal review required** before publishing. Replace all `[PLACEHOLDER]` sections.

---

### 1. Who We Are

[COMPANY LEGAL NAME] ("we", "us", "our") operates the YayChatbot service. We are the data controller for personal data collected through our platform.

**Data Controller contact:**
[COMPANY LEGAL NAME]
[ADDRESS]
[EMAIL]
[DPO EMAIL — if applicable]

---

### 2. What Data We Collect

#### 2.1 Dashboard Users (our direct customers)

| Data | Purpose | Legal Basis |
|---|---|---|
| Name, email address | Account creation, communication | Contract (Art. 6(1)(b)) |
| Password (hashed via Supabase) | Authentication | Contract |
| Billing information (via Stripe) | Payment processing | Contract |
| Usage data (conversations, tokens) | Billing, analytics | Legitimate interests |
| IP address, login timestamps | Security, fraud prevention | Legitimate interests |
| Audit log entries | Compliance, security | Legal obligation |

#### 2.2 Website Visitors (end users of our customers' widgets)

We process this data as a **data processor** on behalf of our customers (the data controllers).

| Data | Purpose |
|---|---|
| Chat messages | Providing the chat service |
| Name, email, phone, company | Lead capture (if enabled by customer) |
| IP address | Rate limiting, fraud prevention |
| UTM parameters, referrer | Analytics (if enabled by customer) |
| Session identifiers | Conversation continuity |

---

### 3. How We Use Your Data

- To provide, maintain, and improve the Service
- To process payments and manage subscriptions
- To send transactional emails (account, billing, security alerts)
- To detect and prevent fraud and abuse
- To comply with legal obligations
- To respond to data subject rights requests

We do **not** sell your personal data to third parties.

---

### 4. Data Sharing

We share data with the following categories of recipients:

| Recipient | Purpose | Location |
|---|---|---|
| Supabase | Authentication, database | [REGION] |
| [Cloud Provider] | Infrastructure hosting | [REGION] |
| Anthropic | AI inference (chat messages) | USA |
| OpenAI | AI inference (optional) | USA |
| Stripe | Payment processing | USA |
| Resend | Transactional email | [REGION] |

All sub-processors are bound by Data Processing Agreements and appropriate transfer safeguards (EU Standard Contractual Clauses where applicable).

---

### 5. International Transfers

Where we transfer personal data outside the EEA, we ensure appropriate safeguards are in place, including:
- EU Standard Contractual Clauses (SCCs)
- Adequacy decisions by the European Commission

For details of transfer mechanisms, contact us at [EMAIL].

---

### 6. Data Retention

| Data Type | Retention Period |
|---|---|
| Conversation data | Configurable per organisation (default 24 months); automatically deleted/anonymised by retention job |
| Lead contact data | Until deletion request or account termination |
| Billing records | 7 years (legal obligation) |
| Audit logs | 7 years (legal obligation) |
| Account data | Duration of account + 30 days post-termination |

---

### 7. Your Rights (GDPR)

If you are in the EEA or UK, you have the following rights:

| Right | How to Exercise |
|---|---|
| **Access** (Art. 15) | POST /api/v1/gdpr/export-request or email [EMAIL] |
| **Rectification** (Art. 16) | Update in dashboard settings or email [EMAIL] |
| **Erasure** (Art. 17) | POST /api/v1/gdpr/deletion-request or email [EMAIL] |
| **Restriction** (Art. 18) | Email [EMAIL] |
| **Portability** (Art. 20) | POST /api/v1/gdpr/export-request |
| **Object** (Art. 21) | Email [EMAIL] |
| **Withdraw consent** | Decline in consent banner or email [EMAIL] |

We will respond to requests within **30 days**. You also have the right to lodge a complaint with your supervisory authority (e.g., ICO in the UK, your national DPA in the EU).

---

### 8. Cookies and Tracking

The YayChatbot widget uses `localStorage` to store consent status (`yaychatbot_consent`). No third-party tracking cookies are set by the widget.

Our dashboard may use cookies for session management. See our [Cookie Policy — LINK] for details.

---

### 9. Security

We implement appropriate technical and organisational measures including:
- Encryption at rest (AES-256) and in transit (TLS 1.2+)
- Role-based access control
- API key hashing (SHA-256, never stored in plaintext)
- Immutable audit logging
- Automated data retention enforcement
- Regular security reviews

---

### 10. Children's Privacy

The Service is not directed at children under 16. We do not knowingly collect personal data from children. If you believe we have inadvertently collected such data, contact us at [EMAIL] for immediate deletion.

---

### 11. Changes to This Policy

We will notify you of material changes via email or in-app notification at least 30 days before they take effect. The "Last updated" date at the top of this page reflects the most recent revision.

---

### 12. Contact Us

For privacy-related questions or to exercise your rights:

**[COMPANY LEGAL NAME]**
[ADDRESS]
[EMAIL]
[DPO EMAIL — if applicable]
