# Widget Not Loading Runbook

**Severity:** Critical (revenue-impacting — chatbot invisible to end users)
**On-call rotation:** #alerts-production → PagerDuty
**Last reviewed:** 2025-01

---

## Symptoms

- Cloudflare alert: cdn.yaychatbot.com 5xx rate > 1%
- Customer reports: "Chat widget not appearing on our site"
- Browser console: `Failed to load resource: net::ERR_*` for `cdn.yaychatbot.com/widget/...`
- Uptime check failing for `https://cdn.yaychatbot.com/widget/latest/widget.js`

---

## Immediate Triage (< 5 min)

1. **Manually fetch the widget**
   ```bash
   curl -I https://cdn.yaychatbot.com/widget/latest/widget.js
   ```
   Expected: `HTTP/2 200`, `content-type: application/javascript`

2. **Check Cloudflare R2 status**
   - https://www.cloudflarestatus.com
   - Cloudflare dashboard → R2 → your bucket → Objects — confirm `widget/latest/widget.js` exists

3. **Check last successful CI deploy**
   - GitHub → Actions → Deploy Production — did the `deploy-widget` job succeed?
   - If it failed, the `latest` path may not have been updated

4. **Check Cloudflare Cache Analytics**
   - Cloudflare dashboard → Analytics → Cache — look for cache miss spike or origin errors

---

## Mitigation

### Scenario A — R2 object missing / corrupted

Re-deploy the widget manually from a known-good commit:

```bash
# From your local machine with production secrets
git checkout <last-good-sha>
pnpm --filter=@yaychatbot/widget build

CLOUDFLARE_ACCOUNT_ID=xxx \
CLOUDFLARE_R2_ACCESS_KEY_ID=xxx \
CLOUDFLARE_R2_SECRET_ACCESS_KEY=xxx \
R2_BUCKET_NAME=yaychatbot-widget \
WIDGET_VERSION=$(git rev-parse --short HEAD) \
node scripts/deploy-widget-r2.mjs
```

### Scenario B — Cloudflare R2 regional outage

R2 is globally distributed but if a region is degraded:

1. Verify by fetching from a different region:
   ```bash
   curl -I --resolve cdn.yaychatbot.com:443:<alternative-ip> https://cdn.yaychatbot.com/widget/latest/widget.js
   ```
2. If confirmed R2 outage, activate the fallback CDN origin:
   - Cloudflare dashboard → DNS → temporarily point `cdn` CNAME to the backup origin
   - Or enable "Always Online" in Cloudflare caching settings

### Scenario C — Bad deploy broke the widget JS

The widget threw a JS error on load (check browser console):

1. Identify the last working version from R2:
   ```bash
   # List recent versioned uploads
   aws s3 ls s3://yaychatbot-widget/widget/ \
     --endpoint-url https://<account-id>.r2.cloudflarestorage.com \
     --recursive | sort | tail -20
   ```
2. Roll back `latest` to the previous good version:
   ```bash
   aws s3 cp \
     s3://yaychatbot-widget/widget/<good-sha>/widget.js \
     s3://yaychatbot-widget/widget/latest/widget.js \
     --endpoint-url https://<account-id>.r2.cloudflarestorage.com \
     --cache-control "public, max-age=300, s-maxage=300" \
     --content-type "application/javascript; charset=utf-8"
   ```
3. Purge Cloudflare cache:
   ```bash
   curl -X POST "https://api.cloudflare.com/client/v4/zones/<zone-id>/purge_cache" \
     -H "Authorization: Bearer <cf-token>" \
     -H "Content-Type: application/json" \
     -d '{"files":["https://cdn.yaychatbot.com/widget/latest/widget.js"]}'
   ```

### Scenario D — CORS / CSP blocking the widget

Customer's site has a Content Security Policy blocking the CDN domain:

1. Confirm in browser DevTools → Console:
   ```
   Refused to load script 'https://cdn.yaychatbot.com/...' because it violates the following Content Security Policy directive
   ```
2. Advise the customer to add to their CSP:
   ```
   script-src 'self' https://cdn.yaychatbot.com;
   connect-src 'self' https://api.yaychatbot.com;
   ```
3. Verify R2 bucket CORS headers include the customer's origin

---

## Recovery Verification

```bash
# Widget should return 200 with correct content-type
curl -sI https://cdn.yaychatbot.com/widget/latest/widget.js | grep -E "HTTP|content-type|cache-control"

# Uptime check should go green within 2 minutes
# Cloudflare 5xx rate should drop to 0
```

---

## Post-Incident

- [ ] Document root cause in #incidents
- [ ] Add widget smoke test to CI (load widget in headless browser, assert no JS errors)
- [ ] Review whether size-budget check caught the bad build
- [ ] Consider adding a secondary CDN fallback URL in the embed snippet
