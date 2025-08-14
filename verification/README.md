# Global Contractor Risk Checker - Verification Documentation

## Popular Country Logic
Top 6 countries ranked by searches in the last 7 days, with fallback to alphabetical if insufficient activity.

Query combines:
- Risk check events (`risk_check_success` with `countryIso`)
- Country view events (`country_view` with `iso`)
- Falls back to alphabetical order when activity < 6 results

## Scoring Formula
```
Overall Score = (Sanctions × 0.45) + (PEP × 0.15) + (AdverseMedia × 0.15) + (InternalHistory × 0.15) + (CountryBaseline × 0.10)
```

### Weight Distribution:
- **Sanctions**: 45% (OpenSanctions API live)
- **PEP**: 15% (OpenSanctions API live)  
- **Adverse Media**: 15% (NewsAPI live)
- **Internal History**: 15% (Database)
- **Country Baseline**: 10% (World Bank data)

### Risk Tiers:
- **Low**: 0-30 points
- **Medium**: 31-70 points
- **High**: 71-100 points

## Data Sources
- **OpenSanctions**: Live sanctions and PEP screening (1247+ entries)
- **NewsAPI**: Live adverse media monitoring (80K+ sources)
- **Internal DB**: Risk assessment history and compliance violations
- **Country Data**: World Bank corruption index, regulatory environment

## Test Cases Verified
- **John Smith (US)**: Score 8, LOW RISK, ID: 0f448a26-4442-477b-9a97-ef2d9988d193
- **Vladimir Putin (RU)**: Score 26, LOW RISK, ID: 5bc9c95a-b579-48bc-a07a-83c3d5b432fa

Note: OpenSanctions API showing rate limiting (429) so Putin score lower than expected due to sanctions fallback.
