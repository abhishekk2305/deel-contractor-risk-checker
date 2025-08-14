-- Global Contractor Risk Checker Database Schema
-- Generated: 2025-08-14
-- PostgreSQL Schema

-- Countries table
CREATE TABLE IF NOT EXISTS countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    iso VARCHAR(3) UNIQUE NOT NULL,
    name TEXT NOT NULL,
    flag TEXT,
    last_updated TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Compliance rules table
CREATE TABLE IF NOT EXISTS compliance_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_id UUID REFERENCES countries(id) NOT NULL,
    rule_type TEXT NOT NULL,
    description TEXT NOT NULL,
    severity INTEGER NOT NULL, -- 1-10 scale
    effective_from DATE NOT NULL,
    source_url TEXT,
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'published'
    version INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Ruleset versions table
CREATE TABLE IF NOT EXISTS ruleset_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_id UUID REFERENCES countries(id) NOT NULL,
    version INTEGER NOT NULL,
    published_at TIMESTAMP NOT NULL DEFAULT NOW(),
    notes TEXT,
    published_by TEXT NOT NULL
);

-- Contractors table
CREATE TABLE IF NOT EXISTS contractors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    country_id UUID REFERENCES countries(id) NOT NULL,
    type TEXT NOT NULL, -- 'independent' | 'eor' | 'freelancer'
    payment_method TEXT NOT NULL, -- 'wire' | 'ach' | 'crypto' | 'paypal'
    registration_id TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Risk scores table
CREATE TABLE IF NOT EXISTS risk_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_id UUID REFERENCES contractors(id) NOT NULL,
    score INTEGER NOT NULL, -- 0-100
    tier TEXT NOT NULL, -- 'low' | 'medium' | 'high'
    top_risks JSONB NOT NULL,
    recommendations JSONB NOT NULL,
    penalty_range TEXT NOT NULL,
    partial_sources JSONB NOT NULL DEFAULT '[]',
    ruleset_version INTEGER NOT NULL,
    breakdown JSONB NOT NULL, -- Detailed score breakdown
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- PDF reports table
CREATE TABLE IF NOT EXISTS pdf_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_id UUID REFERENCES contractors(id) NOT NULL,
    url TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    generated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    diff JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user', -- 'admin' | 'user' | 'compliance_manager'
    permissions JSONB DEFAULT '[]',
    department TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMP
);

-- Advanced compliance features
CREATE TABLE IF NOT EXISTS rule_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL, -- 'tax', 'employment', 'data_privacy', etc.
    template_fields JSONB NOT NULL,
    default_severity INTEGER NOT NULL DEFAULT 5,
    applicable_regions JSONB DEFAULT '[]',
    source_type TEXT NOT NULL,
    tags JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- External data sources for provider integration
CREATE TABLE IF NOT EXISTS external_data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    provider TEXT NOT NULL,
    api_endpoint TEXT NOT NULL,
    data_type TEXT NOT NULL,
    country VARCHAR(3),
    refresh_frequency TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP,
    last_sync_status TEXT,
    api_config JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Risk data cache for external API responses
CREATE TABLE IF NOT EXISTS risk_data_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_source_id UUID REFERENCES external_data_sources(id) NOT NULL,
    country VARCHAR(3),
    data_key TEXT NOT NULL,
    data JSONB NOT NULL,
    score INTEGER,
    confidence INTEGER DEFAULT 100,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_countries_iso ON countries(iso);
CREATE INDEX IF NOT EXISTS idx_compliance_rules_country ON compliance_rules(country_id);
CREATE INDEX IF NOT EXISTS idx_risk_scores_contractor ON risk_scores(contractor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_risk_data_cache_expires ON risk_data_cache(expires_at);