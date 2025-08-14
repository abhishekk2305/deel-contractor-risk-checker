-- Global Contractor Risk Checker - Database Seeds
-- Generated: 2025-08-14

-- Insert Countries
INSERT INTO countries (id, iso, name, flag, last_updated) VALUES
('e80c377e-cb2b-45f5-9f78-9603599cd7df', 'US', 'United States', '🇺🇸', NOW()),
('32a51bdc-766a-4f42-880a-a1804220499c', 'GB', 'United Kingdom', '🇬🇧', NOW()),
('cccb2f42-973a-4075-85f1-a44a9209bffd', 'CA', 'Canada', '🇨🇦', NOW()),
('f72e354e-3d73-4648-801c-5978c25ec889', 'DE', 'Germany', '🇩🇪', NOW()),
('aadf9cd8-8be2-4a48-812d-d7786c65ac99', 'FR', 'France', '🇫🇷', NOW()),
('c95c405b-4e7f-422a-8deb-c7acf9084066', 'FI', 'Finland', '🇫🇮', NOW()),
('c60e53e8-a1ef-40c9-91bd-fe7b4d1afc72', 'NL', 'Netherlands', '🇳🇱', NOW()),
('9d103f24-aa13-4eaf-a430-b354ed00c481', 'CH', 'Switzerland', '🇨🇭', NOW()),
('6a451bb6-ed1f-4c2d-bdf9-39eb1df04c5f', 'RO', 'Romania', '🇷🇴', NOW()),
('3acd74df-ac71-4447-a15f-fe8a93ec8fe4', 'PL', 'Poland', '🇵🇱', NOW()),
('90ce62ab-d19f-41ce-91b3-0743c3ab1bf3', 'JP', 'Japan', '🇯🇵', NOW()),
('0ce49f41-d33b-40c9-b254-489f-a74a-9b50ce82f2fb', 'AU', 'Australia', '🇦🇺', NOW()),
('fac5dae9-6555-468e-bd10-6686d155a8cf', 'IR', 'Iran', '🇮🇷', NOW());

-- Insert Admin User
INSERT INTO users (id, username, email, password, role, permissions, department, is_active, created_at) VALUES
('admin-user-id', 'admin', 'admin@deel.com', '$2b$10$encrypted_password_hash', 'admin', '["read", "write", "admin"]', 'Compliance', true, NOW());

-- Insert Compliance Rules for Major Countries
INSERT INTO compliance_rules (id, country_id, rule_type, description, severity, effective_from, source_url, status, version, updated_at) VALUES
-- United States Rules
('rule-us-tax', 'e80c377e-cb2b-45f5-9f78-9603599cd7df', 'tax', 'Obligations for tax withholding on contractor payments', 7, '2024-01-01', 'https://irs.gov/contractor-rules', 'published', 1, NOW()),
('rule-us-classification', 'e80c377e-cb2b-45f5-9f78-9603599cd7df', 'classification', 'Guidelines for properly classifying workers as employees vs contractors', 8, '2024-01-01', 'https://dol.gov/contractor-classification', 'published', 1, NOW()),
('rule-us-privacy', 'e80c377e-cb2b-45f5-9f78-9603599cd7df', 'privacy', 'Requirements for handling contractor personal data', 9, '2024-01-01', 'https://ftc.gov/privacy-act', 'published', 1, NOW()),

-- United Kingdom Rules
('rule-uk-tax', '32a51bdc-766a-4f42-880a-a1804220499c', 'tax', 'Obligations for tax withholding on contractor payments', 7, '2024-01-01', 'https://gov.uk/contractor-tax', 'published', 1, NOW()),
('rule-uk-classification', '32a51bdc-766a-4f42-880a-a1804220499c', 'classification', 'Guidelines for properly classifying workers as employees vs contractors', 8, '2024-01-01', 'https://gov.uk/ir35-rules', 'published', 1, NOW()),
('rule-uk-privacy', '32a51bdc-766a-4f42-880a-a1804220499c', 'privacy', 'Requirements for handling contractor personal data under GDPR', 9, '2024-01-01', 'https://ico.org.uk/gdpr', 'published', 1, NOW()),

-- Germany Rules
('rule-de-tax', 'f72e354e-3d73-4648-801c-5978c25ec889', 'tax', 'Steuerliche Verpflichtungen bei Auftragnehmerzahlungen', 7, '2024-01-01', 'https://bundesfinanzministerium.de/contractor', 'published', 1, NOW()),
('rule-de-classification', 'f72e354e-3d73-4648-801c-5978c25ec889', 'classification', 'Richtlinien zur ordnungsgemäßen Klassifizierung von Arbeitnehmern vs. Auftragnehmern', 8, '2024-01-01', 'https://bmas.de/contractor-rules', 'published', 1, NOW()),
('rule-de-privacy', 'f72e354e-3d73-4648-801c-5978c25ec889', 'privacy', 'Anforderungen für den Umgang mit personenbezogenen Daten von Auftragnehmern', 9, '2024-01-01', 'https://bfdi.bund.de/dsgvo', 'published', 1, NOW()),

-- Canada Rules  
('rule-ca-tax', 'cccb2f42-973a-4075-85f1-a44a9209bffd', 'tax', 'Tax obligations for contractor payments in Canada', 7, '2024-01-01', 'https://cra-arc.gc.ca/contractor-tax', 'published', 1, NOW()),
('rule-ca-classification', 'cccb2f42-973a-4075-85f1-a44a9209bffd', 'classification', 'Guidelines for worker classification in Canada', 8, '2024-01-01', 'https://canada.ca/worker-classification', 'published', 1, NOW()),
('rule-ca-privacy', 'cccb2f42-973a-4075-85f1-a44a9209bffd', 'privacy', 'Personal Information Protection Act requirements', 9, '2024-01-01', 'https://priv.gc.ca/pipeda', 'published', 1, NOW());

-- Insert Ruleset Versions  
INSERT INTO ruleset_versions (id, country_id, version, published_at, notes, published_by) VALUES
('version-us-1', 'e80c377e-cb2b-45f5-9f78-9603599cd7df', 1, NOW(), 'Initial United States compliance ruleset', 'admin@deel.com'),
('version-uk-1', '32a51bdc-766a-4f42-880a-a1804220499c', 1, NOW(), 'Initial United Kingdom compliance ruleset', 'admin@deel.com'),
('version-de-1', 'f72e354e-3d73-4648-801c-5978c25ec889', 1, NOW(), 'Initial Germany compliance ruleset', 'admin@deel.com'),
('version-ca-1', 'cccb2f42-973a-4075-85f1-a44a9209bffd', 1, NOW(), 'Initial Canada compliance ruleset', 'admin@deel.com');

-- Insert External Data Sources for Provider Integration
INSERT INTO external_data_sources (id, name, provider, api_endpoint, data_type, country, refresh_frequency, is_active, last_sync_at, last_sync_status, api_config, created_at) VALUES
('complyadvantage-global', 'ComplyAdvantage Global Screening', 'complyadvantage', 'https://api.complyadvantage.com/searches', 'sanctions-pep', NULL, 'realtime', true, NOW(), 'healthy', '{"timeout": 5000, "retries": 3}', NOW()),
('newsapi-global', 'NewsAPI Adverse Media', 'newsapi', 'https://newsapi.org/v2/everything', 'adverse-media', NULL, 'realtime', true, NOW(), 'healthy', '{"timeout": 8000, "retries": 2}', NOW()),
('world-bank-country-risk', 'World Bank Country Risk Data', 'worldbank', 'https://api.worldbank.org/v2/country', 'country-baseline', NULL, 'daily', true, NOW(), 'healthy', '{"timeout": 10000}', NOW());

-- Sample Risk Data Cache entries
INSERT INTO risk_data_cache (id, data_source_id, country, data_key, data, score, confidence, expires_at, created_at) VALUES
('cache-us-baseline', 'world-bank-country-risk', 'US', 'country_risk_baseline', '{"governanceScore": 85, "ruleOfLaw": 88, "corruptionIndex": 82}', 15, 95, NOW() + INTERVAL '24 hours', NOW()),
('cache-gb-baseline', 'world-bank-country-risk', 'GB', 'country_risk_baseline', '{"governanceScore": 92, "ruleOfLaw": 94, "corruptionIndex": 89}', 12, 95, NOW() + INTERVAL '24 hours', NOW()),
('cache-de-baseline', 'world-bank-country-risk', 'DE', 'country_risk_baseline', '{"governanceScore": 88, "ruleOfLaw": 91, "corruptionIndex": 86}', 14, 95, NOW() + INTERVAL '24 hours', NOW());

-- Insert Rule Templates for common compliance scenarios
INSERT INTO rule_templates (id, name, description, category, template_fields, default_severity, applicable_regions, source_type, tags, is_active, created_by, created_at, updated_at) VALUES
('template-tax-withholding', 'Tax Withholding Requirements', 'Standard tax withholding obligations for contractor payments', 'tax', '{"withholding_rate": "number", "threshold_amount": "number", "reporting_frequency": "select"}', 7, '["US", "CA", "AU", "GB"]', 'government', '["tax", "withholding", "payments"]', true, 'admin-user-id', NOW(), NOW()),
('template-worker-classification', 'Worker Classification Guidelines', 'Rules for distinguishing employees from independent contractors', 'employment', '{"control_factors": "array", "economic_factors": "array", "relationship_factors": "array"}', 8, '["US", "CA", "AU", "GB", "EU"]', 'government', '["classification", "employment", "contractor"]', true, 'admin-user-id', NOW(), NOW()),
('template-data-privacy', 'Data Privacy Compliance', 'Requirements for handling contractor personal information', 'data_privacy', '{"consent_required": "boolean", "retention_period": "number", "cross_border_restrictions": "boolean"}', 9, '["EU", "CA", "US-CA"]', 'regulation', '["privacy", "gdpr", "data-protection"]', true, 'admin-user-id', NOW(), NOW());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_compliance_rules_country_status ON compliance_rules(country_id, status);
CREATE INDEX IF NOT EXISTS idx_risk_scores_created_at ON risk_scores(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contractors_created_at ON contractors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_external_data_sources_active ON external_data_sources(is_active);
CREATE INDEX IF NOT EXISTS idx_risk_data_cache_expires ON risk_data_cache(expires_at);