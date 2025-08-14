-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create countries table
CREATE TABLE countries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  iso VARCHAR(3) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  flag TEXT,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create compliance_rules table
CREATE TABLE compliance_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL,
  description TEXT NOT NULL,
  severity INTEGER NOT NULL CHECK (severity >= 1 AND severity <= 10),
  effective_from DATE NOT NULL,
  source_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create ruleset_versions table
CREATE TABLE ruleset_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  published_by TEXT NOT NULL
);

-- Create contractors table
CREATE TABLE contractors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('independent', 'eor', 'freelancer')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('wire', 'ach', 'crypto', 'paypal')),
  registration_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create risk_scores table
CREATE TABLE risk_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  tier TEXT NOT NULL CHECK (tier IN ('low', 'medium', 'high')),
  top_risks JSONB NOT NULL,
  recommendations JSONB NOT NULL,
  penalty_range TEXT NOT NULL,
  partial_sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  ruleset_version INTEGER NOT NULL,
  breakdown JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create pdf_reports table
CREATE TABLE pdf_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create audit_logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  diff JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create subscriptions table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_countries_iso ON countries(iso);
CREATE INDEX idx_rules_country_status ON compliance_rules(country_id, status);
CREATE INDEX idx_scores_contractor_created ON risk_scores(contractor_id, created_at DESC);
CREATE INDEX idx_ruleset_versions_country_version ON ruleset_versions(country_id, version DESC);
CREATE INDEX idx_contractors_country ON contractors(country_id);
CREATE INDEX idx_pdf_reports_contractor ON pdf_reports(contractor_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity, entity_id);
CREATE INDEX idx_subscriptions_user_country ON subscriptions(user_id, country_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_compliance_rules_updated_at
  BEFORE UPDATE ON compliance_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert seed data for countries
INSERT INTO countries (iso, name, flag, last_updated) VALUES
('US', 'United States', '🇺🇸', NOW()),
('GB', 'United Kingdom', '🇬🇧', NOW()),
('BR', 'Brazil', '🇧🇷', NOW()),
('DE', 'Germany', '🇩🇪', NOW()),
('FR', 'France', '🇫🇷', NOW()),
('CA', 'Canada', '🇨🇦', NOW()),
('AU', 'Australia', '🇦🇺', NOW()),
('IN', 'India', '🇮🇳', NOW()),
('JP', 'Japan', '🇯🇵', NOW()),
('SG', 'Singapore', '🇸🇬', NOW()),
('NL', 'Netherlands', '🇳🇱', NOW()),
('ES', 'Spain', '🇪🇸', NOW()),
('IT', 'Italy', '🇮🇹', NOW()),
('MX', 'Mexico', '🇲🇽', NOW()),
('AR', 'Argentina', '🇦🇷', NOW()),
('CL', 'Chile', '🇨🇱', NOW()),
('CO', 'Colombia', '🇨🇴', NOW()),
('PE', 'Peru', '🇵🇪', NOW()),
('PL', 'Poland', '🇵🇱', NOW()),
('RO', 'Romania', '🇷🇴', NOW()),
('UA', 'Ukraine', '🇺🇦', NOW()),
('ZA', 'South Africa', '🇿🇦', NOW()),
('NG', 'Nigeria', '🇳🇬', NOW()),
('EG', 'Egypt', '🇪🇬', NOW()),
('KE', 'Kenya', '🇰🇪', NOW()),
('TH', 'Thailand', '🇹🇭', NOW()),
('VN', 'Vietnam', '🇻🇳', NOW()),
('PH', 'Philippines', '🇵🇭', NOW()),
('ID', 'Indonesia', '🇮🇩', NOW()),
('MY', 'Malaysia', '🇲🇾', NOW());

-- Insert sample compliance rules
DO $$
DECLARE
    us_id UUID;
    gb_id UUID;
    br_id UUID;
    de_id UUID;
BEGIN
    SELECT id INTO us_id FROM countries WHERE iso = 'US';
    SELECT id INTO gb_id FROM countries WHERE iso = 'GB';
    SELECT id INTO br_id FROM countries WHERE iso = 'BR';
    SELECT id INTO de_id FROM countries WHERE iso = 'DE';

    -- US Rules
    INSERT INTO compliance_rules (country_id, rule_type, description, severity, effective_from, status, version) VALUES
    (us_id, 'Tax Compliance', 'State-level contractor tax obligations requiring careful documentation and compliance monitoring', 7, '2024-01-01', 'published', 1),
    (us_id, 'Worker Classification', 'IRS guidelines for independent contractor vs employee classification', 5, '2024-01-01', 'published', 1),
    (us_id, 'Payment Processing', 'Banking infrastructure and payment method compliance requirements', 3, '2024-01-01', 'published', 1);

    -- UK Rules
    INSERT INTO compliance_rules (country_id, rule_type, description, severity, effective_from, status, version) VALUES
    (gb_id, 'IR35 Compliance', 'Off-payroll working rules for contractors providing services through intermediaries', 8, '2024-01-01', 'published', 1),
    (gb_id, 'Worker Classification', 'Employment status determination and contractor classification requirements', 6, '2024-01-01', 'published', 1),
    (gb_id, 'Data Protection', 'GDPR compliance requirements for contractor data handling', 7, '2024-01-01', 'published', 1);

    -- Brazil Rules
    INSERT INTO compliance_rules (country_id, rule_type, description, severity, effective_from, status, version) VALUES
    (br_id, 'Worker Classification', 'CLT vs contractor guidelines and employment relationship determination', 9, '2024-01-01', 'published', 1),
    (br_id, 'Tax Compliance', 'Complex federal and state tax obligations for independent contractors', 8, '2024-01-01', 'published', 1),
    (br_id, 'Social Security', 'INSS contributions and social security compliance requirements', 7, '2024-01-01', 'published', 1);

    -- Germany Rules
    INSERT INTO compliance_rules (country_id, rule_type, description, severity, effective_from, status, version) VALUES
    (de_id, 'Scheinselbständigkeit', 'False self-employment regulations and contractor classification', 8, '2024-01-01', 'published', 1),
    (de_id, 'Data Protection', 'GDPR compliance and data handling requirements for contractors', 7, '2024-01-01', 'published', 1),
    (de_id, 'Tax Compliance', 'German tax obligations and withholding requirements for contractors', 6, '2024-01-01', 'published', 1);
END $$;

-- Create initial ruleset versions
DO $$
DECLARE
    country_rec RECORD;
BEGIN
    FOR country_rec IN SELECT id, iso FROM countries WHERE iso IN ('US', 'GB', 'BR', 'DE')
    LOOP
        INSERT INTO ruleset_versions (country_id, version, published_by, notes) VALUES
        (country_rec.id, 1, 'System', 'Initial ruleset for ' || country_rec.iso);
    END LOOP;
END $$;

-- Create a default admin user (password should be hashed in production)
INSERT INTO users (username, email, password, role) VALUES
('admin', 'admin@deel.com', '$2b$10$dummy.hash.for.demo.purposes.only', 'admin'),
('demo', 'demo@deel.com', '$2b$10$dummy.hash.for.demo.purposes.only', 'user');
