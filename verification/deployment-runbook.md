# 🚀 GCRC Deployment Runbook

## Pre-Deployment Configuration

### Required Environment Variables
```bash
# Core Application
NODE_ENV=production
PORT=5000

# Database
DATABASE_URL=[NEON_POSTGRESQL_CONNECTION_STRING]

# OpenSanctions Integration (LIVE)
SANCTIONS_PROVIDER=opensanctions
OPEN_SANCTIONS_API_KEY=[API_KEY_FROM_OPENSANCTIONS]
OPEN_SANCTIONS_BASE_URL=https://api.opensanctions.org

# Optional Providers (if configured)
NEWS_API_KEY=[NEWSAPI_KEY]
SEON_API_KEY=[SEON_KEY]
AMLBOT_API_KEY=[AMLBOT_KEY]

# Security
API_JWT_SECRET=[RANDOM_256_BIT_KEY]

# Redis (optional - fallback mode available)
REDIS_URL=[UPSTASH_REDIS_URL]

# S3 Storage (optional - mock mode available)
AWS_ACCESS_KEY_ID=[AWS_KEY]
AWS_SECRET_ACCESS_KEY=[AWS_SECRET]
AWS_S3_BUCKET=[BUCKET_NAME]
AWS_REGION=[REGION]
```

## Deployment Steps

### 1. Enable Always On
```bash
# Configure Replit Deployments with Always On
- Frontend: Always On enabled
- API: Always On enabled  
- Rules Engine: Always On enabled
- Worker: Always On enabled
```

### 2. Deploy Command
```bash
# Deploy via Replit interface
# System will auto-build and start with npm run dev in production mode
```

### 3. Health Check Verification
```bash
# Verify deployment success
curl -s https://[YOUR-REPL-URL]/api/health

# Expected response:
{
  "status": "healthy",
  "database": true,
  "redis": true,
  "s3": true,
  "providers": {
    "sanctions": "opensanctions",
    "media": "newsapi"
  },
  "provider_urls": {
    "sanctions": "https://api.opensanctions.org"
  }
}
```

## Post-Deploy Checklist

### ✅ Core System Health
- [ ] `/api/health` returns 200 with all systems healthy
- [ ] Database connection established
- [ ] Redis connection (or fallback mode active)
- [ ] S3 storage accessible (or mock mode active)

### ✅ OpenSanctions Integration
- [ ] Provider shows as "opensanctions" in health check
- [ ] Live risk check returns real sanctions data
- [ ] hits_count populated in responses
- [ ] Response times < 3 seconds

### ✅ Countries Catalog
- [ ] `/api/countries` returns total ≈ 249 countries
- [ ] Unicode search working (test: query=Côte)
- [ ] Pagination functional

### ✅ Risk Assessment Engine
- [ ] POST `/api/risk-check` returns valid scores
- [ ] partialSources array empty (complete data)
- [ ] Risk tiers calculated correctly
- [ ] providerInfo includes OpenSanctions data

### ✅ PDF Generation
- [ ] POST `/api/pdf-report` accepts requests (202)
- [ ] Generated PDFs include "OpenSanctions (live)"
- [ ] Numbers formatted to 2 decimals
- [ ] Dates formatted as "Aug 14, 2025"

### ✅ Admin Functions
- [ ] Rule creation/editing working
- [ ] Version publishing functional
- [ ] Audit logs recording changes
- [ ] Analytics counters incrementing

## Security Operations

### API Key Rotation
```bash
# JWT Secret Rotation Steps:
1. Generate new 256-bit key: openssl rand -hex 32
2. Update REPL_API_JWT_SECRET in environment
3. Restart all services
4. Verify authentication still works
5. Monitor for any auth failures
```

### OpenSanctions API Key Rotation
```bash
# Steps:
1. Login to OpenSanctions dashboard
2. Generate new API key
3. Update OPEN_SANCTIONS_API_KEY in Replit Secrets
4. Restart application
5. Verify /api/health shows opensanctions provider active
```

## Rollback Procedures

### Emergency Rollback
```bash
# Via Replit Interface:
1. Go to Deployments tab
2. Select previous stable deployment
3. Click "Rollback to this deployment"
4. Verify rollback with health check
```

### Database Rollback
```bash
# If database changes need rollback:
1. Access Neon dashboard
2. Use point-in-time recovery to restore to previous state
3. Update connection strings if needed
4. Verify data integrity
```

## Monitoring & Alerting

### Key Metrics to Monitor
- Response time for `/api/risk-check` (target: < 3s)
- OpenSanctions API success rate (target: > 98%)
- Database connection health
- Error rates across all endpoints
- Request volume and rate limiting

### Log Monitoring
```bash
# Key log patterns to watch:
- "OpenSanctions screening failed" (provider issues)
- "Slow request detected" (performance)
- "High error rate detected" (system issues)
- "Sanctions check failed" (fallback usage)
```

## Scaling Considerations

### Performance Thresholds
- **CPU Usage:** Scale at 70%
- **Memory Usage:** Scale at 80%
- **Response Time:** Alert if > 3s average
- **Error Rate:** Alert if > 2%

### Cache Strategy
- OpenSanctions queries cached 30-60s
- Country data cached 24h
- Risk assessments cached 24h
- PDF reports cached permanently

## Disaster Recovery

### Data Backup Strategy
- Neon PostgreSQL: Automated daily backups
- Application logs: Persistent storage via Replit
- Configuration: Version controlled in Git

### Recovery Time Objectives
- **RTO (Recovery Time Objective):** 15 minutes
- **RPO (Recovery Point Objective):** 1 hour
- **Service Restoration:** Full functionality within 30 minutes

---

## Emergency Contacts & Resources

### Support Resources
- **OpenSanctions Support:** support@opensanctions.org
- **Neon Support:** Via dashboard support portal
- **Replit Support:** Via Replit dashboard

### Critical Documentation
- OpenSanctions API docs: https://opensanctions.org/docs/
- Neon documentation: https://neon.tech/docs
- Application monitoring: Replit deployment logs

This runbook ensures reliable deployment and operation of the GCRC system with live OpenSanctions integration.