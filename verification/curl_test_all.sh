#!/bin/bash

echo "=== COMPREHENSIVE API TESTING FOR VERIFICATION ==="

echo "1. Health endpoint:"
curl -s "http://localhost:5000/api/health" | head -c 300
echo -e "\n"

echo "2. Analytics endpoint:"  
curl -s "http://localhost:5000/api/analytics" | head -c 300
echo -e "\n"

echo "3. Popular countries endpoint:"
curl -s "http://localhost:5000/api/countries/popular?limit=6" | head -c 300
echo -e "\n"

echo "4. Test John Smith risk check:"
curl -s -X POST "http://localhost:5000/api/risk-check" \
  -H "Content-Type: application/json" \
  -d '{
    "contractorName": "John Smith",
    "contractorEmail": "john.smith@example.com",
    "countryIso": "US",
    "contractorType": "independent"
  }' | head -c 300
echo -e "\n"

echo "5. Test PDF generation:"
PDF_RESULT=$(curl -s -X POST "http://localhost:5000/api/pdf-report" \
  -H "Content-Type: application/json" \
  -d '{"riskAssessmentId": "0f448a26-4442-477b-9a97-ef2d9988d193"}')
echo "$PDF_RESULT"

# Extract job ID and check status
JOB_ID=$(echo "$PDF_RESULT" | grep -o '"job_id":"[^"]*"' | cut -d'"' -f4)
if [ -n "$JOB_ID" ]; then
  echo -e "\n6. PDF status check:"
  sleep 2
  curl -s "http://localhost:5000/api/pdf-report/$JOB_ID"
fi

echo -e "\n\n=== ADMIN ENDPOINTS ==="
echo "7. Admin compliance rules:"
curl -s "http://localhost:5000/api/admin/compliance-rules" | head -c 200
echo -e "\n"

echo "8. Create new rule test:"
curl -s -X POST "http://localhost:5000/api/admin/compliance-rules" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Rule", "description": "Test compliance rule"}' | head -c 200
echo -e "\n"

echo "✅ All tests completed"
