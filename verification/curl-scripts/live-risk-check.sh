#!/bin/bash

# Live Risk Check Test with SEON Provider
# Demonstrates real provider integration

BASE_URL="http://localhost:5000"

echo "🔍 GCRC Live Risk Check with SEON"
echo "================================="
echo ""

# Test 1: India contractor
echo "📊 Test 1: India Contractor Risk Check"
echo "-------------------------------------"

RISK_REQUEST_IN='{
  "contractorName": "Raj Patel",
  "contractorEmail": "raj.patel@techcorp.in",
  "countryIso": "IN", 
  "contractorType": "independent"
}'

echo "Request payload:"
echo "$RISK_REQUEST_IN" | python3 -m json.tool 2>/dev/null

echo ""
echo "Making API call..."

RESPONSE_IN=$(curl -s -X POST "$BASE_URL/api/risk-check" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)-in" \
  -w "\nHTTP_STATUS:%{http_code}\nTIME_TOTAL:%{time_total}" \
  -d "$RISK_REQUEST_IN")

HTTP_CODE=$(echo "$RESPONSE_IN" | grep "HTTP_STATUS:" | cut -d':' -f2)
TIME_TOTAL=$(echo "$RESPONSE_IN" | grep "TIME_TOTAL:" | cut -d':' -f2)
RESPONSE_BODY=$(echo "$RESPONSE_IN" | sed '/HTTP_STATUS:/,$d')

echo "Response (HTTP $HTTP_CODE, ${TIME_TOTAL}s):"
echo "$RESPONSE_BODY" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE_BODY"

echo ""
echo "📊 Test 2: High-Risk Country Check"
echo "---------------------------------"

RISK_REQUEST_IR='{
  "contractorName": "Ahmad Hassan",
  "contractorEmail": "ahmad@example.ir",
  "countryIso": "IR",
  "contractorType": "freelancer"
}'

echo "Request payload:"
echo "$RISK_REQUEST_IR" | python3 -m json.tool 2>/dev/null

echo ""
echo "Making API call..."

RESPONSE_IR=$(curl -s -X POST "$BASE_URL/api/risk-check" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)-ir" \
  -w "\nHTTP_STATUS:%{http_code}\nTIME_TOTAL:%{time_total}" \
  -d "$RISK_REQUEST_IR")

HTTP_CODE_IR=$(echo "$RESPONSE_IR" | grep "HTTP_STATUS:" | cut -d':' -f2)
TIME_TOTAL_IR=$(echo "$RESPONSE_IR" | grep "TIME_TOTAL:" | cut -d':' -f2)
RESPONSE_BODY_IR=$(echo "$RESPONSE_IR" | sed '/HTTP_STATUS:/,$d')

echo "Response (HTTP $HTTP_CODE_IR, ${TIME_TOTAL_IR}s):"
echo "$RESPONSE_BODY_IR" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE_BODY_IR"

echo ""
echo "📊 Provider Verification"
echo "-----------------------"

# Check health endpoint for provider status
HEALTH=$(curl -s "$BASE_URL/api/health")
SANCTIONS_PROVIDER=$(echo "$HEALTH" | grep -o '"sanctions":"[^"]*"' | cut -d'"' -f4)
MEDIA_PROVIDER=$(echo "$HEALTH" | grep -o '"media":"[^"]*"' | cut -d'"' -f4)

echo "Active providers:"
echo "  - Sanctions: $SANCTIONS_PROVIDER"
echo "  - Media: $MEDIA_PROVIDER"

echo ""
echo "📋 Summary"
echo "----------"
echo "✓ Live SEON integration test completed"
echo "✓ Provider status: $SANCTIONS_PROVIDER"
echo "✓ Response times: ${TIME_TOTAL}s, ${TIME_TOTAL_IR}s"
echo ""
echo "🔑 Required Environment Variables:"
echo "   SANCTIONS_PROVIDER=seon"
echo "   SEON_API_KEY=your_actual_api_key"
echo "   SEON_API_URL=https://api.seon.io"