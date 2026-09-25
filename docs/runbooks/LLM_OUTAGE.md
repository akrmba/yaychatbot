# LLM Outage Runbook

**Severity:** Critical
**On-call rotation:** #alerts-production → PagerDuty
**Last reviewed:** 2025-01

---

## Symptoms

- Sentry: `LlmService` errors spiking
- Axiom alert: LLM error rate > 5% over 5 min
- Users report chatbot returning "Something went wrong" or no response
- Conversations stuck in `PENDING` status

---

## Immediate Triage (< 5 min)

1. **Check provider status pages**
   - OpenAI: https://status.openai.com
   - Anthropic: https://status.anthropic.com

2. **Check Railway logs**
   ```bash
   railway logs --service api --environment production --tail 100
   ```
   Look for: `429 Too Many Requests`, `503 Service Unavailable`, `timeout`

3. **Check Axiom for error pattern**
   ```apl
   ['yaychatbot-api']
   | where level == "error" and context == "LlmService"
   | summarize count() by bin(_time, 1m), message
   | order by _time desc
   ```

---

## Mitigation

### Option A — Switch to fallback model (< 2 min)

If OpenAI is down but Anthropic is healthy (or vice versa):

1. In Railway dashboard → API service → Variables
2. Set `OPENAI_MODEL=claude-sonnet-4-6` (or swap back)
3. Railway will redeploy automatically (~60 s)

### Option B — Enable degraded mode

If both providers are down, surface a user-friendly maintenance message:

1. In Railway → Variables, set:
   ```
   LLM_DEGRADED_MODE=true
   LLM_DEGRADED_MESSAGE=Our AI is temporarily unavailable. We'll be back shortly.
   ```
2. Redeploy: `railway up --service api --environment production`

### Option C — Rate limit / quota exhausted

1. Check OpenAI usage dashboard for quota
2. Increase rate limits or add billing top-up
3. Temporarily reduce `LLM_MAX_TOKENS` to stretch quota:
   ```
   LLM_MAX_TOKENS=512
   ```

---

## Recovery Verification

```bash
# Confirm LLM calls succeeding
curl -s https://api.yaychatbot.com/health | jq .llm

# Watch error rate drop in Axiom
['yaychatbot-api']
| where context == "LlmService"
| summarize errors=countif(level=="error"), total=count() by bin(_time, 1m)
| extend error_rate = errors / todouble(total)
```

Expected: `error_rate < 0.05` sustained for 5+ minutes.

---

## Post-Incident

- [ ] File incident report in #incidents Slack channel
- [ ] Add provider outage to status page (statuspage.io)
- [ ] Review whether circuit-breaker / retry logic needs tuning
- [ ] Consider adding a second LLM provider as automatic fallback
