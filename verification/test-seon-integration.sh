#!/bin/bash

# Test script for SEON sanctions provider integration
# Usage: ./test-seon-integration.sh

echo "🔍 GCRC SEON Integration Test"
echo "==============================="

# Set environment for testing
export SANCTIONS_PROVIDER=seon
export SEON_API_KEY=${SEON_API_KEY:-"test-key-placeholder"}
export SEON_API_URL=${SEON_API_URL:-"https://api.seon.io"}

BASE_URL="http://localhost:5000"

echo "📊 Testing Health Endpoint"
echo "-------------------------"
HEALTH_RESPONSE=$(curl -s "$BASE_URL/api/health")
echo "Health check response:"
echo "$HEALTH_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$HEALTH_RESPONSE"

echo ""
echo "📊 Testing Provider Status"
echo "-------------------------"
PROVIDER_STATUS=$(echo "$HEALTH_RESPONSE" | grep -o '"sanctions":"[^"]*"' | cut -d'"' -f4)
echo "Active sanctions provider: $PROVIDER_STATUS"

if [ "$PROVIDER_STATUS" != "seon" ]; then
  echo "⚠️  Warning: Expected SEON provider, got: $PROVIDER_STATUS"
fi

echo ""
echo "🧪 Testing Risk Check with SEON"
echo "------------------------------"

# Test risk check request
RISK_REQUEST='{
  "contractorName": "John Doe",
  "contractorEmail": "john.doe@example.com", 
  "countryIso": "IN",
  "contractorType": "independent"
}'

echo "Making risk check request..."
RISK_RESPONSE=$(curl -s -X POST "$BASE_URL/api/risk-check" \
  -H "Content-Type: application/json" \
  -d "$RISK_REQUEST")

echo "Risk check response:"
echo "$RISK_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RISK_RESPONSE"

echo ""
echo "🔍 Checking Response Structure"
echo "-----------------------------"

# Validate required fields in response
OVERALL_SCORE=$(echo "$RISK_RESPONSE" | grep -o '"overallScore":[0-9]*' | cut -d':' -f2)
RISK_TIER=$(echo "$RISK_RESPONSE" | grep -o '"riskTier":"[^"]*"' | cut -d'"' -f4)
TOP_RISKS=$(echo "$RISK_RESPONSE" | grep -o '"topRisks":\[[^\]]*\]')
RECOMMENDATIONS=$(echo "$RISK_RESPONSE" | grep -o '"recommendations":\[[^\]]*\]')

echo "✓ Overall Score: ${OVERALL_SCORE:-'Missing'}"
echo "✓ Risk Tier: ${RISK_TIER:-'Missing'}"
echo "✓ Top Risks: ${TOP_RISKS:0:50}..."
echo "✓ Recommendations: ${RECOMMENDATIONS:0:50}..."

if [ -n "$OVERALL_SCORE" ] && [ -n "$RISK_TIER" ]; then
  echo ""
  echo "✅ SEON Integration Test: PASSED"
  echo "   - Provider: $PROVIDER_STATUS" 
  echo "   - Score: $OVERALL_SCORE"
  echo "   - Tier: $RISK_TIER"
else
  echo ""
  echo "❌ SEON Integration Test: FAILED"
  echo "   Missing required response fields"
fi

echo ""
echo "📝 Environment Variables Needed:"
echo "   SANCTIONS_PROVIDER=seon"
echo "   SEON_API_KEY=your_seon_api_key"
echo "   SEON_API_URL=https://api.seon.io"
echo ""
echo "Test completed."