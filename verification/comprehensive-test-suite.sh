#!/bin/bash

# Comprehensive Test Suite for Global Contractor Risk Checker
# Tests all critical functionality as specified in stabilization requirements

echo "🧪 GCRC Comprehensive Test Suite"
echo "================================="

BASE_URL="http://localhost:5000"
FAILED_TESTS=0
TOTAL_TESTS=0

# Test function
run_test() {
    local test_name="$1"
    local command="$2"
    local expected_pattern="$3"
    
    echo -n "Testing $test_name... "
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    result=$(eval "$command" 2>/dev/null)
    if echo "$result" | grep -q "$expected_pattern"; then
        echo "✅ PASS"
        return 0
    else
        echo "❌ FAIL"
        echo "   Expected: $expected_pattern"
        echo "   Got: $result"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

echo ""
echo "🌍 COUNTRIES API TESTS"
echo "====================="

# Test 1: Countries total count (should be 30+)
run_test "Countries count >= 30" \
    "curl -s '$BASE_URL/api/countries' | grep -o '\"total\":[0-9]*' | grep -o '[0-9]*'" \
    "3[0-9]"

# Test 2: Exact match search
run_test "Exact match search (India)" \
    "curl -s '$BASE_URL/api/countries?search=India'" \
    "India"

# Test 3: Partial match search
run_test "Partial search (an)" \
    "curl -s '$BASE_URL/api/countries?search=an'" \
    "Canada"

# Test 4: ISO code search
run_test "ISO code search (IN)" \
    "curl -s '$BASE_URL/api/countries?search=IN'" \
    "India"

# Test 5: Pagination
run_test "Pagination (page 1, limit 5)" \
    "curl -s '$BASE_URL/api/countries?page=1&limit=5'" \
    '\"limit\":5'

# Test 6: Empty search results
run_test "Empty search results" \
    "curl -s '$BASE_URL/api/countries?search=NONEXISTENT'" \
    '\"total\":0'

# Test 7: Diacritics search
run_test "Diacritics search (Côte)" \
    "curl -s '$BASE_URL/api/countries?search=C%C3%B4te'" \
    "Côte"

echo ""
echo "🔍 RISK CHECK API TESTS"
echo "======================"

# Test 8: Valid risk check
run_test "Valid risk check" \
    "curl -s -X POST '$BASE_URL/api/risk-check' -H 'Content-Type: application/json' -d '{\"contractorName\":\"John Doe\",\"countryIso\":\"US\",\"contractorType\":\"independent\"}'" \
    "overallScore"

# Test 9: Risk check with invalid country
run_test "Invalid country risk check" \
    "curl -s -X POST '$BASE_URL/api/risk-check' -H 'Content-Type: application/json' -d '{\"contractorName\":\"John Doe\",\"countryIso\":\"XX\",\"contractorType\":\"independent\"}'" \
    "error"

echo ""
echo "👥 ADMIN API TESTS"
echo "=================="

# Test 10: Get compliance rules
run_test "Get compliance rules" \
    "curl -s '$BASE_URL/api/compliance-rules'" \
    "rules"

# Test 11: Get admin analytics
run_test "Admin analytics endpoint" \
    "curl -s '$BASE_URL/api/admin/analytics'" \
    "200"

# Test 12: Rule versions by country
run_test "Rule versions for India" \
    "curl -s '$BASE_URL/api/admin/rules/versions?country=IN'" \
    "India"

echo ""
echo "🏥 HEALTH & MONITORING TESTS"
echo "==========================="

# Test 13: Health endpoint
run_test "Health check" \
    "curl -s '$BASE_URL/api/health'" \
    "healthy"

# Test 14: Metrics endpoint
run_test "Metrics endpoint" \
    "curl -s '$BASE_URL/metrics'" \
    "http_requests_total"

echo ""
echo "📊 ANALYTICS TESTS"
echo "=================="

# Test 15: Analytics data
run_test "Analytics data" \
    "curl -s '$BASE_URL/api/analytics'" \
    "searchCount"

echo ""
echo "🔐 SECURITY TESTS"
echo "=================="

# Test 16: Rate limiting headers
run_test "Rate limiting headers" \
    "curl -s -I '$BASE_URL/api/countries'" \
    "RateLimit-Limit"

echo ""
echo "📈 RESULTS SUMMARY"
echo "=================="

PASSED_TESTS=$((TOTAL_TESTS - FAILED_TESTS))
echo "Total Tests: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $FAILED_TESTS"

if [ $FAILED_TESTS -eq 0 ]; then
    echo "🎉 ALL TESTS PASSED!"
    exit 0
else
    echo "⚠️  $FAILED_TESTS test(s) failed"
    exit 1
fi