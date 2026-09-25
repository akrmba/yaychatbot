# Data Protection Impact Assessment (DPIA)
## YayChatbot — [VERSION 1.0 — DRAFT]

> **Instructions:** Complete all `[PLACEHOLDER]` sections before publishing.
> This template follows GDPR Article 35 requirements.

---

### 1. Overview

| Field | Value |
|---|---|
| Project / System Name | YayChatbot |
| Data Controller | [ORGANISATION LEGAL NAME] |
| DPO / Privacy Contact | [DPO NAME] — [EMAIL] |
| Assessment Date | [DATE] |
| Review Date | [DATE + 12 MONTHS] |
| Version | 1.0 |

---

### 2. Description of Processing

**Purpose of processing:**
YayChatbot collects visitor chat messages, lead contact details (name, email, phone, company), and session metadata (IP address, UTM parameters) to qualify sales leads and route them to human agents or calendar bookings.

**Categories of personal data:**
- Visitor chat messages (free text — may contain special category data if volunteered)
- Lead contact details: name, email, phone, company
- Session metadata: IP address, browser user-agent, UTM parameters, timestamp
- Conversation transcripts

**Categories of data subjects:**
- Website visitors / prospective customers of the data controller's clients
- Dashboard users (employees of the data controller's clients)

**Recipients:**
- [ORGANISATION NAME] (data processor)
- Sub-processors: [LIST SUB-PROCESSORS — e.g., Supabase, AWS RDS, Anthropic, OpenAI, Stripe, Resend]

**Transfers to third countries:**
- [YES / NO] — If yes, list countries and safeguards (SCCs, adequacy decision, etc.)

**Retention period:**
- Conversation data: configurable per organisation (default 24 months), enforced by automated retention job
- Lead data: retained until deletion request or organisation offboarding
- Audit logs: 7 years (legal obligation)

---

### 3. Necessity and Proportionality

| Question | Answer |
|---|---|
| Is the processing necessary for the stated purpose? | Yes — chat transcripts are required to qualify leads and provide context to human agents |
| Could the purpose be achieved with less data? | [ASSESS — e.g., could IP address be hashed immediately?] |
| Legal basis for processing | Legitimate interests (Art. 6(1)(f)) / Consent (Art. 6(1)(a)) where requireConsent flag is enabled |
| Special category data? | Not intentionally collected; visitors may volunteer health/political data in free text — mitigated by consent banner and data minimisation guidance |

---

### 4. Risk Assessment

| Risk | Likelihood | Severity | Residual Risk | Mitigation |
|---|---|---|---|---|
| Unauthorised access to conversation data | Medium | High | Low | Encryption at rest (AES-256), TLS in transit, RBAC, API key hashing |
| Data subject unable to exercise rights | Low | High | Low | GDPR endpoints (deletion-request, export-request) implemented |
| Retention beyond stated period | Low | Medium | Low | Automated daily retention cron job |
| Sub-processor breach (LLM provider) | Low | High | Medium | DPA with sub-processors; no PII in system prompts by default |
| Consent not obtained where required | Low | High | Low | requireConsent flag in playbook config; consent banner in widget |
| Cross-border transfer without safeguards | [ASSESS] | High | [ASSESS] | [SCCs / adequacy decision required] |

---

### 5. Consultation

| Stakeholder | Consulted? | Date | Notes |
|---|---|---|---|
| DPO | [YES/NO] | [DATE] | |
| Legal counsel | [YES/NO] | [DATE] | |
| Engineering lead | [YES/NO] | [DATE] | |
| Data subjects (sample) | [YES/NO] | [DATE] | |

---

### 6. DPO Opinion

> [DPO NAME] reviewed this DPIA on [DATE] and [APPROVED / RAISED CONCERNS — detail here].

---

### 7. Sign-off

| Role | Name | Signature | Date |
|---|---|---|---|
| Data Controller representative | | | |
| DPO | | | |

---

*This document must be reviewed annually or whenever the processing changes materially.*
