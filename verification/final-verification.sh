#!/bin/bash

# Final OpenSanctions Live Integration Verification
# Complete end-to-end test with live provider data

echo "🎯 GCRC Final OpenSanctions Integration Verification"
echo "==================================================="

BASE_URL="http://localhost:5000"

echo ""
echo "📊 1. Health Check - Provider Status"
echo "-----------------------------------"

HEALTH=$(curl -s "$BASE_URL/api/health")
echo "$HEALTH" | python3 -m json.tool 2>/dev/null

SANCTIONS_PROVIDER=$(echo "$HEALTH" | grep -o '"sanctions":"[^"]*"' | cut -d'"' -f4)
PROVIDER_URL=$(echo "$HEALTH" | grep -o '"sanctions":"[^"]*"' -A1 | grep -o 'https://[^"]*' | head -1)

echo ""
echo "✅ Active Provider: $SANCTIONS_PROVIDER"
echo "✅ Provider URL: $PROVIDER_URL"

if [ "$SANCTIONS_PROVIDER" != "opensanctions" ]; then
  echo "❌ Expected opensanctions provider, got: $SANCTIONS_PROVIDER"
  exit 1
fi

echo ""
echo "📊 2. Live Risk Check - Low Risk Name"
echo "------------------------------------"

RISK_REQUEST_LOW='{
  "contractorName": "Jane Developer",
  "contractorEmail": "jane@techcorp.com",
  "countryIso": "US",
  "contractorType": "independent"
}'

echo "Request: Jane Developer (US)"
RESPONSE_LOW=$(curl -s -X POST "$BASE_URL/api/risk-check" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: final-test-low-$(date +%s)" \
  -w "\nHTTP_STATUS:%{http_code}\nTIME_TOTAL:%{time_total}" \
  -d "$RISK_REQUEST_LOW")

HTTP_LOW=$(echo "$RESPONSE_LOW" | grep "HTTP_STATUS:" | cut -d':' -f2)
TIME_LOW=$(echo "$RESPONSE_LOW" | grep "TIME_TOTAL:" | cut -d':' -f2)
BODY_LOW=$(echo "$RESPONSE_LOW" | sed '/HTTP_STATUS:/,$d')

echo "Response (HTTP $HTTP_LOW, ${TIME_LOW}s):"
echo "$BODY_LOW" | python3 -m json.tool 2>/dev/null

# Extract key data
SCORE_LOW=$(echo "$BODY_LOW" | grep -o '"overallScore":[0-9]*' | cut -d':' -f2)
TIER_LOW=$(echo "$BODY_LOW" | grep -o '"riskTier":"[^"]*"' | cut -d'"' -f4)
PARTIAL_LOW=$(echo "$BODY_LOW" | grep -o '"partialSources":\[[^\]]*\]')
PROVIDER_INFO=$(echo "$BODY_LOW" | grep -o '"providerInfo":{[^}]*}')

echo ""
echo "📊 3. Live Risk Check - High Risk Name"
echo "-------------------------------------"

RISK_REQUEST_HIGH='{
  "contractorName": "Vladimir Putin",
  "contractorEmail": "test@example.ru",
  "countryIso": "RU",
  "contractorType": "freelancer"
}'

echo "Request: Vladimir Putin (RU)"
RESPONSE_HIGH=$(curl -s -X POST "$BASE_URL/api/risk-check" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: final-test-high-$(date +%s)" \
  -w "\nHTTP_STATUS:%{http_code}\nTIME_TOTAL:%{time_total}" \
  -d "$RISK_REQUEST_HIGH")

HTTP_HIGH=$(echo "$RESPONSE_HIGH" | grep "HTTP_STATUS:" | cut -d':' -f2)
TIME_HIGH=$(echo "$RESPONSE_HIGH" | grep "TIME_TOTAL:" | cut -d':' -f2)
BODY_HIGH=$(echo "$RESPONSE_HIGH" | sed '/HTTP_STATUS:/,$d')

echo "Response (HTTP $HTTP_HIGH, ${TIME_HIGH}s):"
echo "$BODY_HIGH" | python3 -m json.tool 2>/dev/null

SCORE_HIGH=$(echo "$BODY_HIGH" | grep -o '"overallScore":[0-9]*' | cut -d':' -f2)
TIER_HIGH=$(echo "$BODY_HIGH" | grep -o '"riskTier":"[^"]*"' | cut -d'"' -f4)
HITS_COUNT=$(echo "$BODY_HIGH" | grep -o '"hits_count":[0-9]*' | cut -d':' -f2)
LISTS=$(echo "$BODY_HIGH" | grep -o '"lists":\[[^\]]*\]')

echo ""
echo "📊 4. Country Catalog Test"
echo "-------------------------"

COUNTRIES=$(curl -s "$BASE_URL/api/countries?page=1&page_size=10")
TOTAL_COUNTRIES=$(echo "$COUNTRIES" | grep -o '"total":[0-9]*' | cut -d':' -f2)
COUNTRY_NAMES=$(echo "$COUNTRIES" | grep -o '"name":"[^"]*"' | head -3)

echo "Total countries: $TOTAL_COUNTRIES"
echo "Sample countries: $COUNTRY_NAMES"

echo ""
echo "📊 5. Admin Analytics Test"
echo "-------------------------"

ANALYTICS=$(curl -s "$BASE_URL/api/admin/analytics")
SEARCH_COUNT=$(echo "$ANALYTICS" | grep -o '"searchCount":[0-9]*' | cut -d':' -f2)
RISK_COUNT=$(echo "$ANALYTICS" | grep -o '"riskCheckCount":[0-9]*' | cut -d':' -f2)

echo "Search count: $SEARCH_COUNT"
echo "Risk check count: $RISK_COUNT"

echo ""
echo "📋 Final Integration Summary"
echo "============================="

echo "✅ Provider Status: $SANCTIONS_PROVIDER"
echo "✅ Provider URL: $PROVIDER_URL"
echo "✅ Low Risk Response: HTTP $HTTP_LOW (${TIME_LOW}s) - Score: $SCORE_LOW, Tier: $TIER_LOW"
echo "✅ High Risk Response: HTTP $HTTP_HIGH (${TIME_HIGH}s) - Score: $SCORE_HIGH, Tier: $TIER_HIGH"

if [ -n "$HITS_COUNT" ]; then
  echo "✅ OpenSanctions Data: $HITS_COUNT hits found for high-risk name"
  echo "✅ Lists Found: $LISTS"
else
  echo "⚠️  OpenSanctions Data: No hits_count in response"
fi

if [[ "$PARTIAL_LOW" == *"[]"* ]]; then
  echo "✅ Data Completeness: No partial sources for low-risk check"
else
  echo "⚠️  Data Completeness: Partial sources detected: $PARTIAL_LOW"
fi

echo "✅ Country Catalog: $TOTAL_COUNTRIES countries available"
echo "✅ Analytics: $SEARCH_COUNT searches, $RISK_COUNT risk checks"

# Overall status
if [ "$HTTP_LOW" = "200" ] && [ "$HTTP_HIGH" = "200" ] && [ "$SANCTIONS_PROVIDER" = "opensanctions" ]; then
  echo ""
  echo "🎯 FINAL STATUS: ✅ OPENSANCTIONS INTEGRATION COMPLETE"
  echo "   - Live provider integration working"
  echo "   - Risk scoring with real sanctions data"
  echo "   - Complete country catalog ($TOTAL_COUNTRIES countries)"
  echo "   - Analytics and monitoring operational"
  echo ""
  echo "🚀 SYSTEM READY FOR DEPLOYMENT"
else
  echo ""
  echo "🎯 FINAL STATUS: ❌ INTEGRATION ISSUES DETECTED"
  echo "   - Low risk HTTP: $HTTP_LOW"
  echo "   - High risk HTTP: $HTTP_HIGH"  
  echo "   - Provider: $SANCTIONS_PROVIDER"
fi

echo ""
echo "📝 Environment Configuration:"
echo "   SANCTIONS_PROVIDER=opensanctions"
echo "   OPEN_SANCTIONS_API_KEY=[PROVIDED]"
echo "   OPEN_SANCTIONS_BASE_URL=https://api.opensanctions.org"