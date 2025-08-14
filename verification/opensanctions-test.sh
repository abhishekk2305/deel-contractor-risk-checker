#!/bin/bash

# OpenSanctions Integration Test Script
# Tests live OpenSanctions API integration with GCRC

echo "🔍 GCRC OpenSanctions Integration Test"
echo "====================================="

# Set environment for OpenSanctions
export SANCTIONS_PROVIDER=opensanctions
export OPEN_SANCTIONS_BASE_URL=https://api.opensanctions.org

BASE_URL="http://localhost:5000"

echo ""
echo "📊 1. Health Check - Provider Status"
echo "-----------------------------------"
HEALTH_RESPONSE=$(curl -s "$BASE_URL/api/health")
echo "$HEALTH_RESPONSE" | python3 -m json.tool 2>/dev/null

PROVIDER_STATUS=$(echo "$HEALTH_RESPONSE" | grep -o '"sanctions":"[^"]*"' | cut -d'"' -f4)
PROVIDER_URL=$(echo "$HEALTH_RESPONSE" | grep -o '"sanctions":"https://[^"]*"' | cut -d'"' -f4)

echo ""
echo "Active Provider: $PROVIDER_STATUS"
echo "Provider URL: $PROVIDER_URL"

if [ "$PROVIDER_STATUS" != "opensanctions" ]; then
  echo "⚠️  Warning: Expected opensanctions provider, got: $PROVIDER_STATUS"
fi

echo ""
echo "📊 2. Low-Risk Contractor Test"
echo "-----------------------------"

RISK_REQUEST_LOW='{
  "contractorName": "Jane Developer",
  "contractorEmail": "jane.dev@techcorp.com",
  "countryIso": "US",
  "contractorType": "independent"
}'

echo "Request:"
echo "$RISK_REQUEST_LOW" | python3 -m json.tool 2>/dev/null

echo ""
echo "Response:"
RESPONSE_LOW=$(curl -s -X POST "$BASE_URL/api/risk-check" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-low-$(date +%s)" \
  -w "\nHTTP_STATUS:%{http_code}\nTIME_TOTAL:%{time_total}" \
  -d "$RISK_REQUEST_LOW")

HTTP_CODE_LOW=$(echo "$RESPONSE_LOW" | grep "HTTP_STATUS:" | cut -d':' -f2)
TIME_TOTAL_LOW=$(echo "$RESPONSE_LOW" | grep "TIME_TOTAL:" | cut -d':' -f2)
RESPONSE_BODY_LOW=$(echo "$RESPONSE_LOW" | sed '/HTTP_STATUS:/,$d')

echo "$RESPONSE_BODY_LOW" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE_BODY_LOW"

# Extract OpenSanctions specific data
HITS_COUNT=$(echo "$RESPONSE_BODY_LOW" | grep -o '"hits_count":[0-9]*' | cut -d':' -f2)
LISTS=$(echo "$RESPONSE_BODY_LOW" | grep -o '"lists":\[[^\]]*\]')
TOP_MATCHES=$(echo "$RESPONSE_BODY_LOW" | grep -o '"top_matches":\[[^\]]*\]')

echo ""
echo "OpenSanctions Data:"
echo "  - HTTP Status: $HTTP_CODE_LOW"
echo "  - Response Time: ${TIME_TOTAL_LOW}s"
echo "  - Hits Count: ${HITS_COUNT:-'Not found'}"
echo "  - Lists Found: ${LISTS:-'None'}"
echo "  - Top Matches: ${TOP_MATCHES:-'None'}"

echo ""
echo "📊 3. High-Risk Country Test"
echo "---------------------------"

RISK_REQUEST_HIGH='{
  "contractorName": "Ahmad Hassan",
  "contractorEmail": "ahmad@example.ir",
  "countryIso": "IR",
  "contractorType": "freelancer"
}'

echo "Request:"
echo "$RISK_REQUEST_HIGH" | python3 -m json.tool 2>/dev/null

echo ""
echo "Response:"
RESPONSE_HIGH=$(curl -s -X POST "$BASE_URL/api/risk-check" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-high-$(date +%s)" \
  -w "\nHTTP_STATUS:%{http_code}\nTIME_TOTAL:%{time_total}" \
  -d "$RISK_REQUEST_HIGH")

HTTP_CODE_HIGH=$(echo "$RESPONSE_HIGH" | grep "HTTP_STATUS:" | cut -d':' -f2)
TIME_TOTAL_HIGH=$(echo "$RESPONSE_HIGH" | grep "TIME_TOTAL:" | cut -d':' -f2)
RESPONSE_BODY_HIGH=$(echo "$RESPONSE_HIGH" | sed '/HTTP_STATUS:/,$d')

echo "$RESPONSE_BODY_HIGH" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE_BODY_HIGH"

echo ""
echo "📊 4. Direct OpenSanctions API Test"
echo "----------------------------------"

echo "Testing direct OpenSanctions API call..."
DIRECT_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  "https://api.opensanctions.org/search?q=John%20Smith&scope=names&limit=5")

DIRECT_HTTP_CODE=$(echo "$DIRECT_RESPONSE" | grep "HTTP_STATUS:" | cut -d':' -f2)
DIRECT_BODY=$(echo "$DIRECT_RESPONSE" | sed '/HTTP_STATUS:/,$d')

echo "Direct API Response (HTTP $DIRECT_HTTP_CODE):"
echo "$DIRECT_BODY" | python3 -m json.tool 2>/dev/null || echo "$DIRECT_BODY"

echo ""
echo "📋 Summary"
echo "----------"

if [ "$HTTP_CODE_LOW" = "200" ] && [ "$HTTP_CODE_HIGH" = "200" ]; then
  echo "✅ OpenSanctions Integration: PASSED"
  echo "   - Provider: $PROVIDER_STATUS"
  echo "   - Response times: ${TIME_TOTAL_LOW}s, ${TIME_TOTAL_HIGH}s"
  echo "   - Direct API: HTTP $DIRECT_HTTP_CODE"
else
  echo "❌ OpenSanctions Integration: FAILED"
  echo "   - Low risk HTTP: $HTTP_CODE_LOW"
  echo "   - High risk HTTP: $HTTP_CODE_HIGH"
  echo "   - Direct API: HTTP $DIRECT_HTTP_CODE"
fi

echo ""
echo "🔧 Environment Setup Required:"
echo "   export SANCTIONS_PROVIDER=opensanctions"
echo "   export OPEN_SANCTIONS_BASE_URL=https://api.opensanctions.org"
echo ""
echo "📝 Note: OpenSanctions is a public API with no authentication required"
echo "📝 Rate limits may apply - implement caching for production use"