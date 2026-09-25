# Database Incident Runbook

**Severity:** Critical
**On-call rotation:** #alerts-production → PagerDuty
**Last reviewed:** 2025-01

---

## Symptoms

- Axiom alert: API P95 latency > 3 s
- Sentry: `PrismaClientKnownRequestError` or `connection timeout` errors
- Railway health check failing (`/health` returns 503)
- Dashboard shows blank data or loading spinners indefinitely

---

## Immediate Triage (< 5 min)

1. **Check Railway PostgreSQL service status**
   - Railway dashboard → your project → postgres service → Metrics tab
   - Look for CPU spike, connection count near limit, disk full

2. **Check API health endpoint**
   ```bash
   curl -s https://api.yaychatbot.com/health | jq .database
   ```

3. **Check connection pool in logs**
   ```bash
   railway logs --service api --environment production --tail 200 | grep -i "prisma\|pool\|timeout\|connection"
   ```

4. **Check Axiom for slow queries**
   ```apl
   ['yaychatbot-api']
   | where isnotnull(queryDurationMs) and queryDurationMs > 1000
   | summarize count(), avg(queryDurationMs) by queryName
   | order by avg_queryDurationMs desc
   ```

---

## Mitigation

### Scenario A — Connection pool exhausted

Prisma default pool size is `num_cpus * 2 + 1`. Under load this can be too small.

1. In Railway → API Variables, increase pool size:
   ```
   DATABASE_URL=postgresql://...?connection_limit=20&pool_timeout=30
   ```
2. Restart the API service (Railway auto-restarts on env var change)

### Scenario B — Long-running query blocking others

1. Connect to the database via Railway's psql proxy:
   ```bash
   railway connect postgres --environment production
   ```
2. Find blocking queries:
   ```sql
   SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
   FROM pg_stat_activity
   WHERE state != 'idle' AND query_start < now() - interval '30 seconds'
   ORDER BY duration DESC;
   ```
3. Terminate if safe:
   ```sql
   SELECT pg_terminate_backend(<pid>);
   ```

### Scenario C — Failed migration left schema inconsistent

1. Check migration status:
   ```bash
   railway run --service api pnpm --filter=@yaychatbot/api exec prisma migrate status
   ```
2. If a migration is marked failed, resolve manually:
   ```bash
   railway run --service api pnpm --filter=@yaychatbot/api exec prisma migrate resolve --rolled-back <migration_name>
   ```
3. Re-run migrations:
   ```bash
   railway run --service api pnpm --filter=@yaychatbot/api exec prisma migrate deploy
   ```

### Scenario D — Disk full

1. Railway dashboard → postgres → Storage — check usage
2. Identify large tables:
   ```sql
   SELECT relname, pg_size_pretty(pg_total_relation_size(relid))
   FROM pg_catalog.pg_statio_user_tables
   ORDER BY pg_total_relation_size(relid) DESC
   LIMIT 10;
   ```
3. Archive or purge old `AuditLog` / `UsageRecord` rows if safe:
   ```sql
   DELETE FROM "AuditLog" WHERE "createdAt" < now() - interval '90 days';
   ```
4. Upgrade Railway postgres plan if needed

---

## Recovery Verification

```bash
# API health should show database: "ok"
curl -s https://api.yaychatbot.com/health | jq .

# P95 latency should drop below 500ms
['yaychatbot-api']
| where isnotnull(durationMs)
| summarize percentile(durationMs, 95) by bin(_time, 1m)
```

---

## Post-Incident

- [ ] Document root cause in #incidents
- [ ] Add missing indexes if slow queries were the cause
- [ ] Review Prisma connection pool sizing for current traffic
- [ ] Set up Railway disk usage alert at 80% threshold
