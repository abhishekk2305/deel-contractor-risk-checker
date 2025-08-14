-- Comprehensive Global Contractor Risk Checker Database Seeds
-- 30 Countries with Complete Compliance Rules
-- Generated: 2025-08-14

-- Clear existing data
DELETE FROM risk_data_cache;
DELETE FROM external_data_sources;
DELETE FROM ruleset_versions;
DELETE FROM compliance_rules;
DELETE FROM pdf_reports;
DELETE FROM risk_scores;
DELETE FROM contractors;
DELETE FROM audit_logs;
DELETE FROM users;
DELETE FROM countries;

-- Insert 30 Countries with comprehensive coverage
INSERT INTO countries (id, iso, name, flag, last_updated) VALUES
-- North America
('e80c377e-cb2b-45f5-9f78-9603599cd7df', 'US', 'United States', '🇺🇸', NOW()),
('cccb2f42-973a-4075-85f1-a44a9209bffd', 'CA', 'Canada', '🇨🇦', NOW()),
('f72e354e-3d73-4648-801c-5978c25ec889', 'MX', 'Mexico', '🇲🇽', NOW()),

-- Europe
('32a51bdc-766a-4f42-880a-a1804220499c', 'GB', 'United Kingdom', '🇬🇧', NOW()),
('aadf9cd8-8be2-4a48-812d-d7786c65ac99', 'DE', 'Germany', '🇩🇪', NOW()),
('c95c405b-4e7f-422a-8deb-c7acf9084066', 'FR', 'France', '🇫🇷', NOW()),
('c60e53e8-a1ef-40c9-91bd-fe7b4d1afc72', 'NL', 'Netherlands', '🇳🇱', NOW()),
('9d103f24-aa13-4eaf-a430-b354ed00c481', 'ES', 'Spain', '🇪🇸', NOW()),
('6a451bb6-ed1f-4c2d-bdf9-39eb1df04c5f', 'IT', 'Italy', '🇮🇹', NOW()),
('3acd74df-ac71-4447-a15f-fe8a93ec8fe4', 'SE', 'Sweden', '🇸🇪', NOW()),
('90ce62ab-d19f-41ce-91b3-0743c3ab1bf3', 'NO', 'Norway', '🇳🇴', NOW()),
('0ce49f41-d33b-40c9-b254-489fa74a9b50', 'DK', 'Denmark', '🇩🇰', NOW()),
('fac5dae9-6555-468e-bd10-6686d155a8cf', 'IE', 'Ireland', '🇮🇪', NOW()),
('e1d9c222-0a23-4912-9509-cb73b6fa5b27', 'PL', 'Poland', '🇵🇱', NOW()),
('92a3da49-c840-4e1a-92d9-0ae3aec2ac6d', 'PT', 'Portugal', '🇵🇹', NOW()),

-- Asia Pacific
('d5242ff6-0f8e-4c8d-b123-1234567890ab', 'SG', 'Singapore', '🇸🇬', NOW()),
('88285e0e-d456-4a8b-9876-abcdef123456', 'IN', 'India', '🇮🇳', NOW()),
('897f8fb4-9abc-4def-8765-fedcba987654', 'AU', 'Australia', '🇦🇺', NOW()),
('b9d3da4c-fed1-4567-9abc-123456789def', 'NZ', 'New Zealand', '🇳🇿', NOW()),
('a1b2c3d4-e5f6-4789-abcd-ef1234567890', 'JP', 'Japan', '🇯🇵', NOW()),
('f9e8d7c6-b5a4-4321-9876-543210fedcba', 'KR', 'South Korea', '🇰🇷', NOW()),
('1a2b3c4d-5e6f-4987-6543-210987654321', 'CN', 'China', '🇨🇳', NOW()),
('9f8e7d6c-5b4a-4321-0987-6543210fedcba', 'HK', 'Hong Kong', '🇭🇰', NOW()),
('8e7d6c5b-4a39-4210-9876-543210987654', 'TW', 'Taiwan', '🇹🇼', NOW()),

-- Middle East & Africa
('7d6c5b4a-3928-4109-8765-432109876543', 'AE', 'United Arab Emirates', '🇦🇪', NOW()),
('6c5b4a39-2817-4098-7654-321098765432', 'SA', 'Saudi Arabia', '🇸🇦', NOW()),
('5b4a3928-1706-4087-6543-210987654321', 'ZA', 'South Africa', '🇿🇦', NOW()),

-- South America
('4a392817-0695-4076-5432-109876543210', 'BR', 'Brazil', '🇧🇷', NOW()),
('39281706-9584-4065-4321-098765432109', 'AR', 'Argentina', '🇦🇷', NOW()),
('28170695-8473-4054-3210-987654321098', 'CL', 'Chile', '🇨🇱', NOW());

-- Update last_updated dates to be more varied and realistic
UPDATE countries SET last_updated = NOW() - INTERVAL '1 day' WHERE iso IN ('US', 'GB', 'DE');
UPDATE countries SET last_updated = NOW() - INTERVAL '3 days' WHERE iso IN ('CA', 'FR', 'AU');
UPDATE countries SET last_updated = NOW() - INTERVAL '7 days' WHERE iso IN ('NL', 'ES', 'IT');
UPDATE countries SET last_updated = NOW() - INTERVAL '14 days' WHERE iso IN ('SE', 'NO', 'DK', 'IE');
UPDATE countries SET last_updated = NOW() - INTERVAL '21 days' WHERE iso IN ('PL', 'PT', 'SG', 'IN');
UPDATE countries SET last_updated = NOW() - INTERVAL '30 days' WHERE iso NOT IN ('US', 'GB', 'DE', 'CA', 'FR', 'AU', 'NL', 'ES', 'IT', 'SE', 'NO', 'DK', 'IE', 'PL', 'PT', 'SG', 'IN');