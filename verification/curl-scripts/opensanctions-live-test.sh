#!/bin/bash

# OpenSanctions Live Integration Test
# Demonstrates real OpenSanctions API integration

echo "🔍 GCRC OpenSanctions Live Integration Test"
echo "==========================================="

BASE_URL="http://localhost:5000"

# Set environment properly
export SANCTIONS_PROVIDER=opensanctions
export OPEN_SANCTIONS_BASE_URL=https://api.opensanctions.org

echo ""
echo "📊 Environment Setup"
echo "-------------------"
echo "SANCTIONS_PROVIDER: $SANCTIONS_PROVIDER"
echo "OPEN_SANCTIONS_BASE_URL: $OPEN_SANCTIONS_BASE_URL"

echo ""
echo "📊 Health Check"
echo "--------------"

HEALTH=$(curl -s "$BASE_URL/api/health")
echo "$HEALTH" | python3 -m json.tool 2>/dev/null

PROVIDER=$(echo "$HEALTH" | grep -o '"sanctions":"[^"]*"' | cut -d'"' -f4)
PROVIDER_URL=$(echo "$HEALTH" | grep -o '"sanctions":"https://[^"]*"' | cut -d'"' -f4)

echo ""
echo "Active provider: $PROVIDER"
echo "Provider URL: $PROVIDER_URL"

echo ""
echo "📊 Direct OpenSanctions API Test"
echo "-------------------------------"

echo "Testing direct OpenSanctions API..."
DIRECT_TEST=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  "https://api.opensanctions.org/search?q=John&scope=names&limit=3")

DIRECT_HTTP=$(echo "$DIRECT_TEST" | grep "HTTP_STATUS:" | cut -d':' -f2)
DIRECT_BODY=$(echo "$DIRECT_TEST" | sed '/HTTP_STATUS:/,$d')

echo "Direct API response (HTTP $DIRECT_HTTP):"
echo "$DIRECT_BODY" | python3 -m json.tool 2>/dev/null || echo "$DIRECT_BODY"

echo ""
echo "📊 Live Risk Check Test"
echo "----------------------"

RISK_REQUEST='{
  "contractorName": "John Smith",
  "contractorEmail": "john.smith@example.com",
  "countryIso": "US",
  "contractorType": "independent"
}'

echo "Risk check request:"
echo "$RISK_REQUEST" | python3 -m json.tool 2>/dev/null

echo ""
echo "Making live risk check..."

RISK_RESPONSE=$(curl -s -X POST "$BASE_URL/api/risk-check" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: opensanctions-test-$(date +%s)" \
  -w "\nHTTP_STATUS:%{http_code}\nTIME_TOTAL:%{time_total}" \
  -d "$RISK_REQUEST")

HTTP_CODE=$(echo "$RISK_RESPONSE" | grep "HTTP_STATUS:" | cut -d':' -f2)
TIME_TOTAL=$(echo "$RISK_RESPONSE" | grep "TIME_TOTAL:" | cut -d':' -f2)
RESPONSE_BODY=$(echo "$RISK_RESPONSE" | sed '/HTTP_STATUS:/,$d')

echo "Risk check response (HTTP $HTTP_CODE, ${TIME_TOTAL}s):"
echo "$RESPONSE_BODY" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE_BODY"

# Extract OpenSanctions specific data
HITS_COUNT=$(echo "$RESPONSE_BODY" | grep -o '"hits_count":[0-9]*' | cut -d':' -f2)
LISTS=$(echo "$RESPONSE_BODY" | grep -o '"lists":\[[^\]]*\]')
TOP_MATCHES=$(echo "$RESPONSE_BODY" | grep -o '"top_matches":\[[^\]]*\]')
SANCTIONS_DETAILS=$(echo "$RESPONSE_BODY" | grep -o '"provider":"opensanctions"')
PARTIAL_SOURCES=$(echo "$RESPONSE_BODY" | grep -o '"partialSources":\[[^\]]*\]')

echo ""
echo "📋 OpenSanctions Integration Results"
echo "----------------------------------"
echo "✓ HTTP Status: $HTTP_CODE"
echo "✓ Response Time: ${TIME_TOTAL}s"
echo "✓ Provider Status: $PROVIDER"
echo "✓ Direct API Status: $DIRECT_HTTP"

if [ -n "$SANCTIONS_DETAILS" ]; then
  echo "✓ OpenSanctions Provider: Active"
  echo "✓ Hits Count: ${HITS_COUNT:-'0'}"
  echo "✓ Lists Found: ${LISTS:-'[]'}"
  echo "✓ Top Matches: ${TOP_MATCHES:-'[]'}"
else
  echo "⚠️  OpenSanctions Provider: Not detected in response"
fi

if [ -n "$PARTIAL_SOURCES" ]; then
  echo "⚠️  Partial Sources: $PARTIAL_SOURCES"
else
  echo "✓ Complete Data: No partial sources"
fi

echo ""
echo "📊 High-Risk Name Test"
echo "--------------------"

# Test with a name more likely to appear in sanctions lists
HIGH_RISK_REQUEST='{
  "contractorName": "Putin",
  "contractorEmail": "test@example.com",
  "countryIso": "RU",
  "contractorType": "freelancer"
}'

echo "Testing high-risk name: Putin"
HIGH_RISK_RESPONSE=$(curl -s -X POST "$BASE_URL/api/risk-check" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: opensanctions-high-test-$(date +%s)" \
  -w "\nHTTP_STATUS:%{http_code}" \
  -d "$HIGH_RISK_REQUEST")

HIGH_HTTP=$(echo "$HIGH_RISK_RESPONSE" | grep "HTTP_STATUS:" | cut -d':' -f2)
HIGH_BODY=$(echo "$HIGH_RISK_RESPONSE" | sed '/HTTP_STATUS:/,$d')

HIGH_HITS=$(echo "$HIGH_BODY" | grep -o '"hits_count":[0-9]*' | cut -d':' -f2)
HIGH_SCORE=$(echo "$HIGH_BODY" | grep -o '"overallScore":[0-9]*' | cut -d':' -f2)

echo "High-risk test results:"
echo "  - HTTP Status: $HIGH_HTTP"
echo "  - Hits Count: ${HIGH_HITS:-'0'}"
echo "  - Overall Score: ${HIGH_SCORE:-'0'}"

echo ""
echo "🎯 Summary"
echo "----------"

if [ "$HTTP_CODE" = "200" ] && [ "$DIRECT_HTTP" = "200" ]; then
  echo "✅ OpenSanctions Integration: WORKING"
  echo "   - Provider correctly configured: $PROVIDER"
  echo "   - Direct API accessible: HTTP $DIRECT_HTTP"
  echo "   - Risk checks processing: HTTP $HTTP_CODE"
  echo "   - Response time: ${TIME_TOTAL}s"
else
  echo "❌ OpenSanctions Integration: ISSUES"
  echo "   - Risk check HTTP: $HTTP_CODE"
  echo "   - Direct API HTTP: $DIRECT_HTTP"
  echo "   - Provider: $PROVIDER"
fi

echo ""
echo "📝 Required Environment Variables:"
echo "   SANCTIONS_PROVIDER=opensanctions"
echo "   OPEN_SANCTIONS_BASE_URL=https://api.opensanctions.org"
echo ""
echo "📝 Note: OpenSanctions is a public API requiring no authentication"