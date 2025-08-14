#!/bin/bash

# Comprehensive Global Contractor Risk Checker - Production API Testing
# Generated: 2025-08-14
# Usage: ./comprehensive-api-tests.sh [base_url]

BASE_URL=${1:-"http://localhost:5000"}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="api_test_results_${TIMESTAMP}.log"

echo "🚀 Comprehensive API Testing Suite - Global Contractor Risk Checker"
echo "Base URL: $BASE_URL"
echo "Timestamp: $(date)"
echo "Log file: $LOG_FILE"
echo "==========================================================================="

# Function to log test results
log_result() {
    echo "$1" | tee -a "$LOG_FILE"
}

# Function to test API endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=$4
    local description=$5
    
    echo "Testing: $description"
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "\nHTTP_CODE:%{http_code}\nTIME_TOTAL:%{time_total}" \
            -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "\nHTTP_CODE:%{http_code}\nTIME_TOTAL:%{time_total}" \
            -X "$method" \
            "$BASE_URL$endpoint")
    fi
    
    http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
    time_total=$(echo "$response" | grep "TIME_TOTAL:" | cut -d: -f2)
    body=$(echo "$response" | sed '/HTTP_CODE:/d' | sed '/TIME_TOTAL:/d')
    
    if [ "$http_code" = "$expected_status" ]; then
        log_result "✅ PASS: $description (${http_code}, ${time_total}s)"
    else
        log_result "❌ FAIL: $description (Expected: $expected_status, Got: $http_code, ${time_total}s)"
        log_result "Response: $body"
    fi
    
    echo "Response time: ${time_total}s"
    echo "Status code: $http_code"
    echo ""
}

echo "🏥 HEALTH & MONITORING ENDPOINTS"
echo "--------------------------------------------------------------------"

test_endpoint "GET" "/health" "" "200" "System health check"
test_endpoint "GET" "/ready" "" "200" "Readiness probe"
test_endpoint "GET" "/live" "" "200" "Liveness probe"
test_endpoint "GET" "/metrics" "" "200" "Prometheus metrics (plain text)"
test_endpoint "GET" "/metrics?format=json" "" "200" "Metrics in JSON format"

echo "🌍 COUNTRIES API ENDPOINTS"
echo "--------------------------------------------------------------------"

test_endpoint "GET" "/api/countries" "" "200" "Get all countries (default pagination)"
test_endpoint "GET" "/api/countries?page=1&limit=5" "" "200" "Get countries with pagination"
test_endpoint "GET" "/api/countries?search=United" "" "200" "Search countries by name"
test_endpoint "GET" "/api/countries?search=US" "" "200" "Search countries by ISO code"
test_endpoint "GET" "/api/countries?search=nonexistent" "" "200" "Search for nonexistent country"
test_endpoint "GET" "/api/countries?page=999" "" "200" "Request page beyond available data"
test_endpoint "GET" "/api/countries?limit=1000" "" "200" "Request limit above maximum"

echo "🎯 RISK ASSESSMENT ENDPOINTS"
echo "--------------------------------------------------------------------"

# Valid risk assessment - US contractor
test_endpoint "POST" "/api/risk-check" '{
    "contractorName": "John Smith",
    "contractorEmail": "john.smith@example.com",
    "countryIso": "US",
    "contractorType": "independent",
    "registrationId": "US123456789"
}' "200" "Valid risk assessment - US contractor"

# Valid risk assessment - UK contractor
test_endpoint "POST" "/api/risk-check" '{
    "contractorName": "Emma Watson",
    "contractorEmail": "emma.watson@example.com",
    "countryIso": "GB",
    "contractorType": "freelancer"
}' "200" "Valid risk assessment - UK contractor"

# Valid risk assessment - German contractor
test_endpoint "POST" "/api/risk-check" '{
    "contractorName": "Hans Mueller",
    "contractorEmail": "hans.mueller@example.de",
    "countryIso": "DE",
    "contractorType": "independent",
    "registrationId": "DE456789123"
}' "200" "Valid risk assessment - German contractor"

# High-risk country assessment
test_endpoint "POST" "/api/risk-check" '{
    "contractorName": "Ahmed Hassan",
    "contractorEmail": "ahmed@example.com",
    "countryIso": "IR",
    "contractorType": "independent"
}' "200" "High-risk country assessment - Iran"

# Invalid country code
test_endpoint "POST" "/api/risk-check" '{
    "contractorName": "Test User",
    "countryIso": "INVALID",
    "contractorType": "independent"
}' "400" "Invalid country ISO code"

# Missing required fields
test_endpoint "POST" "/api/risk-check" '{
    "contractorName": "Test User"
}' "400" "Missing required fields"

# Empty contractor name
test_endpoint "POST" "/api/risk-check" '{
    "contractorName": "",
    "countryIso": "US",
    "contractorType": "independent"
}' "400" "Empty contractor name"

# Invalid contractor type
test_endpoint "POST" "/api/risk-check" '{
    "contractorName": "Test User",
    "countryIso": "US",
    "contractorType": "invalid_type"
}' "400" "Invalid contractor type"

echo "📊 ANALYTICS ENDPOINTS"
echo "--------------------------------------------------------------------"

test_endpoint "GET" "/api/analytics" "" "200" "Get analytics data (default 30 days)"
test_endpoint "GET" "/api/analytics?days=7" "" "200" "Get analytics data (7 days)"
test_endpoint "GET" "/api/analytics?days=90" "" "200" "Get analytics data (90 days)"
test_endpoint "GET" "/api/analytics?days=365" "" "200" "Get analytics data (1 year)"

echo "📄 PDF GENERATION ENDPOINTS"
echo "--------------------------------------------------------------------"

# First, get a risk assessment ID
echo "Getting risk assessment ID for PDF generation test..."
RISK_RESPONSE=$(curl -s -X POST "$BASE_URL/api/risk-check" \
  -H "Content-Type: application/json" \
  -d '{
    "contractorName": "PDF Test User",
    "countryIso": "US",
    "contractorType": "independent"
  }')

RISK_ID=$(echo "$RISK_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4 | head -n1)

if [ -n "$RISK_ID" ]; then
    echo "Found risk assessment ID: $RISK_ID"
    
    test_endpoint "POST" "/api/pdf-generate" "{
        \"riskAssessmentId\": \"$RISK_ID\",
        \"includeDetails\": true
    }" "200" "Generate PDF for risk assessment"
    
    test_endpoint "POST" "/api/pdf-generate" "{
        \"riskAssessmentId\": \"$RISK_ID\",
        \"includeDetails\": false
    }" "200" "Generate PDF (summary only)"
else
    log_result "⚠️  SKIP: Could not get risk assessment ID for PDF generation tests"
fi

# Invalid risk assessment ID
test_endpoint "POST" "/api/pdf-generate" '{
    "riskAssessmentId": "invalid-uuid",
    "includeDetails": true
}' "400" "Invalid risk assessment ID for PDF"

# Missing risk assessment ID
test_endpoint "POST" "/api/pdf-generate" '{
    "includeDetails": true
}' "400" "Missing risk assessment ID for PDF"

echo "🔒 SECURITY & RATE LIMITING TESTS"
echo "--------------------------------------------------------------------"

echo "Testing rate limiting (rapid requests)..."
rate_limit_passes=0
rate_limit_blocks=0

for i in {1..10}; do
    response=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$BASE_URL/api/countries?page=1&limit=1")
    http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
    
    if [ "$http_code" = "200" ]; then
        rate_limit_passes=$((rate_limit_passes + 1))
    elif [ "$http_code" = "429" ]; then
        rate_limit_blocks=$((rate_limit_blocks + 1))
        log_result "✅ Rate limiting working: got 429 on request $i"
        break
    fi
done

log_result "Rate limiting test: $rate_limit_passes passes, $rate_limit_blocks blocks"

# Test CORS headers
echo "Testing CORS headers..."
cors_response=$(curl -s -I -H "Origin: https://example.com" "$BASE_URL/api/countries")
if echo "$cors_response" | grep -i "access-control-allow-origin" > /dev/null; then
    log_result "✅ CORS headers present"
else
    log_result "❌ CORS headers missing"
fi

echo "⚡ PERFORMANCE BENCHMARKS"
echo "--------------------------------------------------------------------"

echo "Running performance tests (5 concurrent requests each)..."

# Health endpoint performance
echo "Testing health endpoint performance..."
for i in {1..5}; do
    {
        time_result=$(curl -s -w "%{time_total}" -o /dev/null "$BASE_URL/health")
        echo "Health check: ${time_result}s" >> "$LOG_FILE"
    } &
done
wait

# Countries API performance  
echo "Testing countries API performance..."
for i in {1..5}; do
    {
        time_result=$(curl -s -w "%{time_total}" -o /dev/null "$BASE_URL/api/countries?limit=10")
        echo "Countries API: ${time_result}s" >> "$LOG_FILE"
    } &
done
wait

# Risk assessment performance
echo "Testing risk assessment performance..."
for i in {1..3}; do
    {
        time_result=$(curl -s -w "%{time_total}" -o /dev/null -X POST "$BASE_URL/api/risk-check" \
            -H "Content-Type: application/json" \
            -d '{
                "contractorName": "Performance Test '${i}'",
                "countryIso": "US",
                "contractorType": "independent"
            }')
        echo "Risk assessment: ${time_result}s" >> "$LOG_FILE"
    } &
done
wait

echo "🔍 DATA VALIDATION TESTS"
echo "--------------------------------------------------------------------"

# Test various edge cases
test_endpoint "POST" "/api/risk-check" '{
    "contractorName": "Special Çhars Tëst",
    "countryIso": "FR",
    "contractorType": "freelancer"
}' "200" "Special characters in contractor name"

test_endpoint "POST" "/api/risk-check" '{
    "contractorName": "Very Long Contractor Name That Exceeds Normal Expectations And Tests Input Validation",
    "countryIso": "DE",
    "contractorType": "independent"
}' "200" "Very long contractor name"

test_endpoint "GET" "/api/countries?search=🇺🇸" "" "200" "Unicode flag emoji search"

echo "📈 ANALYTICS DATA INTEGRITY"
echo "--------------------------------------------------------------------"

# Get analytics and validate structure
echo "Validating analytics data structure..."
analytics_response=$(curl -s "$BASE_URL/api/analytics")

if echo "$analytics_response" | grep -q "searchCount"; then
    log_result "✅ Analytics contains searchCount"
else
    log_result "❌ Analytics missing searchCount"
fi

if echo "$analytics_response" | grep -q "riskCheckCount"; then
    log_result "✅ Analytics contains riskCheckCount"
else
    log_result "❌ Analytics missing riskCheckCount"
fi

if echo "$analytics_response" | grep -q "topCountries"; then
    log_result "✅ Analytics contains topCountries"
else
    log_result "❌ Analytics missing topCountries"
fi

if echo "$analytics_response" | grep -q "riskTierDistribution"; then
    log_result "✅ Analytics contains riskTierDistribution"
else
    log_result "❌ Analytics missing riskTierDistribution"
fi

echo "🏁 TEST SUMMARY"
echo "==========================================================================="

# Count results
total_tests=$(grep -c "PASS\|FAIL" "$LOG_FILE")
passed_tests=$(grep -c "✅ PASS" "$LOG_FILE")
failed_tests=$(grep -c "❌ FAIL" "$LOG_FILE")
pass_rate=$(echo "scale=1; $passed_tests * 100 / $total_tests" | bc -l)

log_result "Total Tests: $total_tests"
log_result "Passed: $passed_tests"
log_result "Failed: $failed_tests"
log_result "Pass Rate: ${pass_rate}%"

if [ "$failed_tests" -eq 0 ]; then
    log_result "🎉 ALL TESTS PASSED! System is production-ready."
else
    log_result "⚠️  Some tests failed. Review the log file: $LOG_FILE"
fi

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
echo ""
echo "📋 Detailed results saved to: $LOG_FILE"
echo "🌐 Test completed at: $(date)"
echo "==========================================================================="