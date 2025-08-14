#!/bin/bash

# Global Contractor Risk Checker - API Testing Suite
# Generated: 2025-08-14
# Usage: ./curl-scripts.sh [base_url]

BASE_URL=${1:-"http://localhost:5000"}

echo "🔧 Testing Global Contractor Risk Checker API"
echo "Base URL: $BASE_URL"
echo "======================================"

# Health Checks
echo "🏥 Health Check Endpoints"
echo "--------------------------------------"

echo "Health status:"
curl -s "$BASE_URL/health" | jq '.'

echo -e "\nReadiness check:"
curl -s "$BASE_URL/ready" | jq '.'

echo -e "\nLiveness check:"
curl -s "$BASE_URL/live" | jq '.'

echo -e "\nMetrics (JSON format):"
curl -s "$BASE_URL/metrics?format=application/json" | jq '.'

echo -e "\n\n🌍 Countries API Testing"
echo "--------------------------------------"

echo "Get all countries (page 1):"
curl -s "$BASE_URL/api/countries?page=1&limit=5" | jq '.'

echo -e "\nSearch for US:"
curl -s "$BASE_URL/api/countries?search=United&limit=3" | jq '.'

echo -e "\n\n🎯 Risk Assessment Testing"
echo "--------------------------------------"

# Test Case 1: Low Risk Contractor (John Smith, US)
echo "Test Case 1: John Smith (US) - Expected Low-Medium Risk"
curl -s -X POST "$BASE_URL/api/risk-check" \
  -H "Content-Type: application/json" \
  -d '{
    "contractorName": "John Smith",
    "contractorEmail": "john.smith@example.com",
    "countryIso": "US",
    "contractorType": "independent",
    "registrationId": "US123456789"
  }' | jq '.'

echo -e "\n\nTest Case 2: Maria Garcia (Germany) - Expected Medium Risk"
curl -s -X POST "$BASE_URL/api/risk-check" \
  -H "Content-Type: application/json" \
  -d '{
    "contractorName": "Maria Garcia",
    "contractorEmail": "maria.garcia@example.de",
    "countryIso": "DE", 
    "contractorType": "freelancer",
    "registrationId": "DE987654321"
  }' | jq '.'

echo -e "\n\nTest Case 3: Ahmed Hassan (High-Risk Country) - Expected High Risk"
curl -s -X POST "$BASE_URL/api/risk-check" \
  -H "Content-Type: application/json" \
  -d '{
    "contractorName": "Ahmed Hassan",
    "contractorEmail": "ahmed.hassan@example.com",
    "countryIso": "IR",
    "contractorType": "independent"
  }' | jq '.'

echo -e "\n\n📊 Analytics Testing"
echo "--------------------------------------"

echo "Get analytics data (last 30 days):"
curl -s "$BASE_URL/api/analytics?days=30" | jq '.'

echo -e "\n\n📄 PDF Generation Testing"
echo "--------------------------------------"

# Get a risk assessment ID first (using the John Smith example)
RISK_ID=$(curl -s -X POST "$BASE_URL/api/risk-check" \
  -H "Content-Type: application/json" \
  -d '{
    "contractorName": "Test User",
    "countryIso": "US",
    "contractorType": "independent"
  }' | jq -r '.result.id // empty')

if [ -n "$RISK_ID" ]; then
  echo "Generating PDF for risk assessment ID: $RISK_ID"
  curl -s -X POST "$BASE_URL/api/pdf-generate" \
    -H "Content-Type: application/json" \
    -d "{
      \"riskAssessmentId\": \"$RISK_ID\",
      \"includeDetails\": true
    }" | jq '.'
else
  echo "⚠️  Could not get risk assessment ID for PDF generation test"
fi

echo -e "\n\n🔍 Advanced Search Testing"
echo "--------------------------------------"

echo "Search countries with pagination:"
curl -s "$BASE_URL/api/countries?page=1&limit=3&search=a" | jq '.countries[] | {iso: .iso, name: .name}'

echo -e "\n\n⚡ Performance Testing"
echo "--------------------------------------"

echo "Testing response times (5 concurrent requests):"
for i in {1..5}; do
  {
    time curl -s "$BASE_URL/health" > /dev/null
  } &
done
wait

echo -e "\n\n🛡️  Security Testing"
echo "--------------------------------------"

echo "Testing rate limiting (should succeed initially, then be rate limited):"
for i in {1..3}; do
  RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$BASE_URL/api/countries?page=1&limit=1")
  echo "Request $i: $RESPONSE" | tail -1
done

echo -e "\n\n🔧 Error Handling Testing"
echo "--------------------------------------"

echo "Test invalid country code:"
curl -s -X POST "$BASE_URL/api/risk-check" \
  -H "Content-Type: application/json" \
  -d '{
    "contractorName": "Test User",
    "countryIso": "INVALID",
    "contractorType": "independent"
  }' | jq '.'

echo -e "\nTest missing required fields:"
curl -s -X POST "$BASE_URL/api/risk-check" \
  -H "Content-Type: application/json" \
  -d '{
    "contractorName": "Test User"
  }' | jq '.'

echo -e "\n\n✅ API Testing Complete!"
echo "======================================"
echo ""
echo "🔗 Provider Integration Status:"
echo "Sanctions Provider: ${FEATURE_SANCTIONS_PROVIDER:-mock}"
echo "Media Provider: ${FEATURE_MEDIA_PROVIDER:-mock}" 
echo ""
echo "To enable real providers, set these environment variables:"
echo "export FEATURE_SANCTIONS_PROVIDER=complyadvantage"
echo "export FEATURE_MEDIA_PROVIDER=newsapi"
echo "export COMPLYADVANTAGE_API_KEY=your_key_here"
echo "export NEWS_API_KEY=your_key_here"