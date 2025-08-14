# Global Contractor Risk Checker - Deployment Runbook

**Version:** 1.0.0  
**Last Updated:** August 14, 2025  
**Target Environment:** Production

## 📋 Pre-Deployment Checklist

### Environment Validation
- [ ] Node.js 20+ installed and configured
- [ ] PostgreSQL database provisioned and accessible
- [ ] External API keys obtained and validated
- [ ] Domain name configured with SSL certificate
- [ ] Monitoring and logging infrastructure ready

### Code Preparation
- [ ] All tests passing (`npm test`)
- [ ] Build successful (`npm run build`)
- [ ] Security scan completed
- [ ] Dependencies audited (`npm audit`)
- [ ] Database schema up to date (`npm run db:push`)

## 🔧 Required Environment Variables

### Database Configuration
```bash
# Required - PostgreSQL connection
DATABASE_URL=postgresql://username:password@host:5432/dbname
PGHOST=your-database-host.com
PGPORT=5432
PGUSER=gcrc_user
PGPASSWORD=********
PGDATABASE=gcrc_production

# Database pool settings
DB_POOL_MIN=2
DB_POOL_MAX=20
DB_CONNECTION_TIMEOUT=30000
```

### External Provider APIs
```bash
# ComplyAdvantage (Sanctions & PEP Screening)
COMPLYADVANTAGE_API_KEY=********
COMPLYADVANTAGE_BASE_URL=https://api.complyadvantage.com

# NewsAPI (Adverse Media Monitoring)
NEWS_API_KEY=********
NEWS_API_BASE_URL=https://newsapi.org/v2

# Feature Flags - CRITICAL for production
FEATURE_SANCTIONS_PROVIDER=complyadvantage
FEATURE_MEDIA_PROVIDER=newsapi
```

### Application Configuration
```bash
# Application settings
NODE_ENV=production
PORT=5000
BUILD_VERSION=1.0.0
BUILD_SHA=production-commit-sha

# Security settings
JWT_SECRET=********
SESSION_SECRET=********
CORS_ORIGIN=https://your-domain.com

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
HEALTH_CHECK_INTERVAL=30000
METRICS_ENABLED=true
LOG_LEVEL=info
```

### Optional Services
```bash
# Redis (recommended for caching and rate limiting)
REDIS_URL=redis://username:password@host:6379/0

# S3 for PDF storage (optional)
AWS_ACCESS_KEY_ID=********
AWS_SECRET_ACCESS_KEY=********
AWS_S3_BUCKET=gcrc-pdfs
AWS_S3_REGION=us-east-1

# Sentry for error tracking (optional)
SENTRY_DSN=https://********@sentry.io/project-id
```

## 🚀 Deployment Steps

### Step 1: Infrastructure Setup
```bash
# 1. Provision PostgreSQL database
createdb gcrc_production

# 2. Create application user
createuser gcrc_user --createdb --no-superuser --no-createrole

# 3. Grant permissions
GRANT ALL PRIVILEGES ON DATABASE gcrc_production TO gcrc_user;
```

### Step 2: Application Deployment
```bash
# 1. Clone repository
git clone https://github.com/your-org/gcrc.git
cd gcrc

# 2. Checkout production branch/tag
git checkout v1.0.0

# 3. Install dependencies
npm ci --production

# 4. Build application
npm run build

# 5. Apply database migrations
npm run db:push
```

### Step 3: Database Seeding
```bash
# Seed with production data (30 countries + compliance rules)
psql $DATABASE_URL -f verification/database/fixed-comprehensive-seeds.sql

# Verify seeding
psql $DATABASE_URL -c "SELECT COUNT(*) FROM countries;"
# Expected: 30 countries

psql $DATABASE_URL -c "SELECT COUNT(*) FROM compliance_rules;"
# Expected: 20+ compliance rules
```

### Step 4: Service Configuration
```bash
# 1. Create systemd service file
sudo tee /etc/systemd/system/gcrc.service > /dev/null <<EOF
[Unit]
Description=Global Contractor Risk Checker
After=network.target postgresql.service

[Service]
Type=simple
User=gcrc
WorkingDirectory=/opt/gcrc
ExecStart=/usr/bin/node server/index.js
Restart=always
RestartSec=5

# Environment variables (use environment file for security)
EnvironmentFile=/etc/gcrc/environment

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/opt/gcrc/logs

[Install]
WantedBy=multi-user.target
EOF

# 2. Enable and start service
sudo systemctl enable gcrc
sudo systemctl start gcrc

# 3. Check service status
sudo systemctl status gcrc
```

### Step 5: Reverse Proxy (Nginx)
```bash
# 1. Create Nginx configuration
sudo tee /etc/nginx/sites-available/gcrc > /dev/null <<EOF
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/private.key;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/m;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    # API rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://127.0.0.1:5000;
        # ... (same proxy settings as above)
    }

    # Health checks (no rate limiting)
    location ~ ^/(health|ready|live)$ {
        proxy_pass http://127.0.0.1:5000;
        access_log off;
    }
}
EOF

# 2. Enable site and restart Nginx
sudo ln -s /etc/nginx/sites-available/gcrc /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## ✅ Post-Deployment Verification

### Health Checks
```bash
# 1. System health
curl -f https://your-domain.com/health
# Expected: HTTP 200 with JSON health status

# 2. Readiness check
curl -f https://your-domain.com/ready
# Expected: HTTP 200 with ready status

# 3. Metrics endpoint
curl -f https://your-domain.com/metrics
# Expected: HTTP 200 with Prometheus metrics
```

### Functional Testing
```bash
# 1. Run comprehensive API tests
chmod +x verification/api/comprehensive-api-tests.sh
./verification/api/comprehensive-api-tests.sh https://your-domain.com

# 2. Test risk assessment end-to-end
curl -X POST https://your-domain.com/api/risk-check \
  -H "Content-Type: application/json" \
  -d '{
    "contractorName": "Production Test User",
    "countryIso": "US", 
    "contractorType": "independent"
  }'
# Expected: HTTP 200 with risk assessment result

# 3. Test PDF generation
# (Use risk ID from previous test)
curl -X POST https://your-domain.com/api/pdf-generate \
  -H "Content-Type: application/json" \
  -d '{
    "riskAssessmentId": "RISK_ID_FROM_ABOVE",
    "includeDetails": true
  }'
# Expected: HTTP 200 with PDF URL
```

### Provider Integration Validation
```bash
# Check provider connectivity
curl https://your-domain.com/metrics?format=json | grep -E "(complyadvantage|newsapi)"

# Verify feature flags are set correctly
curl https://your-domain.com/health | grep -E "sanctions|media"
```

### Performance Verification
```bash
# 1. Response time benchmarks
ab -n 100 -c 10 https://your-domain.com/health
# Target: < 200ms average

ab -n 50 -c 5 https://your-domain.com/api/countries
# Target: < 500ms average

# 2. Load testing
curl -w "@curl-format.txt" -s -o /dev/null https://your-domain.com/api/countries
# Create curl-format.txt with timing details

# 3. Memory and CPU usage
top -p $(pgrep node)
# Monitor for memory leaks and high CPU usage
```

## 🔄 Rolling Deployment Process

### Blue-Green Deployment
```bash
# 1. Deploy to staging environment first
export DEPLOY_ENV=staging
# ... run deployment steps ...

# 2. Run full test suite against staging
./verification/api/comprehensive-api-tests.sh https://staging.your-domain.com

# 3. If tests pass, deploy to production
export DEPLOY_ENV=production

# 4. Switch traffic gradually (using load balancer)
# Direct 10% traffic to new version
# Monitor metrics and error rates
# Gradually increase to 100%
```

### Rollback Procedure
```bash
# 1. Immediate rollback (if critical issues)
sudo systemctl stop gcrc
git checkout v0.9.0  # Previous stable version
npm run build
sudo systemctl start gcrc

# 2. Database rollback (if schema changes)
# CAUTION: Only if data loss is acceptable
npm run db:rollback

# 3. DNS rollback (if using DNS switching)
# Update DNS records to point to previous version
```

## 📊 Monitoring & Alerting Setup

### Health Check Monitoring
```bash
# Set up external monitoring (e.g., Pingdom, UptimeRobot)
# Monitor these endpoints:
# - https://your-domain.com/health (every 1 minute)
# - https://your-domain.com/ready (every 5 minutes)
# - https://your-domain.com/api/countries (every 10 minutes)

# Alert conditions:
# - HTTP status != 200
# - Response time > 5 seconds
# - 3 consecutive failures
```

### Application Metrics
```bash
# Prometheus configuration
# Target: https://your-domain.com/metrics
# Scrape interval: 30s

# Key metrics to monitor:
# - request_duration_seconds (P95 < 2s)
# - request_count_total (QPS)
# - active_connections (< 100)
# - error_rate (< 5%)

# Grafana dashboards for visualization
```

### Log Management
```bash
# Configure log rotation
sudo tee /etc/logrotate.d/gcrc > /dev/null <<EOF
/opt/gcrc/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    copytruncate
}
EOF

# Centralized logging (optional - ELK stack, Splunk, etc.)
# Forward application logs to central log management
```

## 🚨 Troubleshooting Guide

### Common Issues

#### Database Connection Errors
```bash
# Check database connectivity
psql $DATABASE_URL -c "SELECT 1;"

# Verify connection pool settings
grep -E "(DB_POOL|DATABASE_URL)" /etc/gcrc/environment

# Check database locks
SELECT * FROM pg_locks WHERE NOT granted;
```

#### External Provider Timeouts
```bash
# Check provider status
curl -H "Authorization: Bearer $COMPLYADVANTAGE_API_KEY" \
  https://api.complyadvantage.com/health

curl -H "X-API-Key: $NEWS_API_KEY" \
  https://newsapi.org/v2/top-headlines?country=us&pageSize=1

# Review timeout settings in application
grep -E "(timeout|FEATURE_)" /etc/gcrc/environment
```

#### High Memory Usage
```bash
# Check for memory leaks
top -p $(pgrep node)

# Analyze heap dumps (if enabled)
node --inspect server/index.js

# Review database connection pool
SELECT count(*) FROM pg_stat_activity WHERE datname='gcrc_production';
```

#### Rate Limiting Issues
```bash
# Check rate limit status
redis-cli (if using Redis)
> KEYS rate_limit:*

# Review Nginx rate limiting
sudo tail -f /var/log/nginx/error.log | grep "limiting requests"

# Adjust rate limits if needed
sudo vim /etc/nginx/sites-available/gcrc
sudo systemctl reload nginx
```

## 📞 Emergency Contacts

### On-Call Rotation
- **Primary:** Engineering Team Lead
- **Secondary:** DevOps Engineer  
- **Escalation:** CTO/VP Engineering

### External Services
- **Database Provider:** Support contact/portal
- **ComplyAdvantage:** API support team
- **NewsAPI:** Technical support
- **Domain/SSL:** DNS provider support

## 📋 Success Criteria

### Deployment Success Metrics
- [ ] All health checks returning 200 OK
- [ ] Response times within SLA (95th percentile < 2s)
- [ ] Error rate < 2%
- [ ] All external providers responding successfully
- [ ] Database queries executing within 500ms
- [ ] PDF generation completing within 10s
- [ ] Zero critical security vulnerabilities
- [ ] Monitoring and alerting active

### Business Success Metrics
- [ ] Risk assessments completing successfully (>95% success rate)
- [ ] Provider data accuracy maintained
- [ ] Compliance rules up to date
- [ ] Analytics data collecting properly
- [ ] User workflow completing end-to-end

---

**Document Version:** 1.0.0  
**Next Review:** August 21, 2025  
**Owner:** Engineering Team