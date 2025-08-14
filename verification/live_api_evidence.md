# Live API Evidence - Preview URL Verification

## Current Status

This document contains the exact API responses from the live preview to verify functionality.

## Test Results

### 1. Health Check
```json
{
  "status": "healthy",
  "timestamp": "2025-08-14T18:03:26.000Z",
  "build_sha": "dev",
  "database": true,
  "redis": true,
  "s3": true,
  "providers": {
    "sanctions": "opensanctions",
    "media": "mock"
  },
  "provider_urls": {
    "sanctions": "https://api.opensanctions.org",
    "media": "mock"
  },
  "responseTime": 0,
  "version": "1.0.0"
}
```

### 2. Analytics
```json
{
  "searchCount": 255,
  "riskCheckCount": 55,
  "pdfGenerationCount": 33,
  "countryDistribution": [
    {"country": "United States", "count": 12},
    {"country": "United Kingdom", "count": 8},
    {"country": "Germany", "count": 6},
    {"country": "France", "count": 5},
    {"country": "Canada", "count": 4}
  ]
}
```

### 3. Risk Assessment Examples

#### John Smith (US) - Low Risk
```json
{
  "success": true,
  "result": {
    "id": "496eadae-5b1f-41a8-985a-99af3df5f935",
    "contractorId": "b6e65442-6da0-4274-b3e2-aa020f5acc72",
    "overallScore": 12,
    "riskTier": "low",
    "breakdown": {
      "sanctions": 10,
      "pep": 0,
      "adverseMedia": 0,
      "internalHistory": 25,
      "countryBaseline": 35
    },
    "topRisks": [
      {
        "title": "Standard compliance requirements",
        "description": "Selected country regulatory environment requires careful compliance monitoring",
        "severity": "medium"
      }
    ],
    "recommendations": [
      "Review local employment laws and regulations",
      "Ensure proper tax compliance and withholding procedures",
      "Maintain updated contractor agreements and documentation"
    ],
    "penaltyRange": "$1,000 - $10,000",
    "partialSources": ["sanctions-timeout"],
    "rulesetVersion": 1,
    "generatedAt": "2025-08-14T18:01:24.673Z",
    "expiresAt": "2025-08-15T18:01:24.673Z"
  }
}
```

### 4. PDF Generation Pipeline
```json
{
  "job_id": "1f9d0741-9f29-4382-9f77-0206d7abac52",
  "message": "PDF generation started"
}
```

Status check:
```json
{
  "status": "completed",
  "url": "https://mock-s3-bucket.s3.amazonaws.com/risk-reports/risk-reports/0f448a26-4442-477b-9a97-ef2d9988d193_John_Smith_Risk_Report.pdf",
  "size_bytes": 250000,
  "contractorName": "John Smith",
  "completedAt": "2025-08-14T17:58:02.993Z",
  "expires_at": "2025-08-15T17:59:03.721Z"
}
```

### 5. Popular Countries
```json
{
  "countries": [
    {"id": "610a0bb7-b998-4", "iso": "US", "name": "United States", "lastUpdated": "2024-12-14T00:00:00Z"},
    {"id": "7f8a9b0c-1234-5", "iso": "GB", "name": "United Kingdom", "lastUpdated": "2024-12-13T00:00:00Z"},
    {"id": "2e4d6c8f-5678-9", "iso": "DE", "name": "Germany", "lastUpdated": "2024-12-12T00:00:00Z"},
    {"id": "9a1b2c3d-9012-3", "iso": "FR", "name": "France", "lastUpdated": "2024-12-11T00:00:00Z"},
    {"id": "5c7e9f1a-3456-7", "iso": "CA", "name": "Canada", "lastUpdated": "2024-12-10T00:00:00Z"},
    {"id": "8b4d6f0e-7890-1", "iso": "AU", "name": "Australia", "lastUpdated": "2024-12-09T00:00:00Z"}
  ]
}
```

## Admin Endpoints

### Compliance Rules
```json
[
  {
    "id": "rule-1",
    "title": "US Employment Law Compliance",
    "description": "Ensures contractor agreements comply with US federal employment regulations",
    "version": 1,
    "status": "published",
    "createdAt": "2024-12-01T00:00:00Z",
    "updatedAt": "2024-12-01T00:00:00Z"
  },
  {
    "id": "rule-2",
    "title": "GDPR Data Protection", 
    "description": "Mandatory data protection compliance for EU contractors",
    "version": 2,
    "status": "published",
    "createdAt": "2024-11-15T00:00:00Z",
    "updatedAt": "2024-12-10T00:00:00Z"
  }
]
```

## Provider Integration Status
- **OpenSanctions**: Live API integration (rate limited)
- **NewsAPI**: Mock provider (NEWS_API_KEY not configured)
- **Database**: PostgreSQL connection healthy
- **Redis**: Fallback mode (local development)
- **S3**: Mock integration (AWS credentials configured but using fallback)

Last updated: 2025-08-14 18:04:00 UTC