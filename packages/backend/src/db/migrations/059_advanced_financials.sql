-- Migration 059: Advanced Financials
-- Financial statements, consolidation, budgeting, multi-currency, tax compliance
-- Part of Phase 10: Advanced Financials (Weeks 27-28)

-- ============================================================================
-- FINANCIAL STATEMENT TEMPLATES
-- Templates for generating financial statements
-- ============================================================================

CREATE TABLE IF NOT EXISTS financial_statement_templates (
    template_id VARCHAR(20) PRIMARY KEY,
    template_name VARCHAR(255) NOT NULL,
    statement_type VARCHAR(50) NOT NULL, -- BALANCE_SHEET, INCOME_STATEMENT, CASH_FLOW, RETAINED_EARNINGS, EQUITY_CHANGES
    description TEXT,
    template_config JSONB NOT NULL, -- Line items structure, calculations, formatting
    currency VARCHAR(3) DEFAULT 'USD',
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(50),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_stmttemplate_type ON financial_statement_templates(statement_type);
CREATE INDEX idx_stmttemplate_active ON financial_statement_templates(is_active);

-- ============================================================================
-- GENERATED FINANCIAL STATEMENTS
-- Store generated financial statements
-- ============================================================================

CREATE TABLE IF NOT EXISTS generated_financial_statements (
    statement_id VARCHAR(20) PRIMARY KEY,
    template_id VARCHAR(20),
    statement_type VARCHAR(50) NOT NULL,
    statement_name VARCHAR(255) NOT NULL,
    period_type VARCHAR(20) NOT NULL, -- MONTHLY, QUARTERLY, ANNUAL, CUSTOM
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    fiscal_year INTEGER NOT NULL,
    fiscal_period INTEGER, -- 1-12 for monthly, 1-4 for quarterly
    entity_id VARCHAR(20), -- For multi-entity
    currency VARCHAR(3) DEFAULT 'USD',
    statement_data JSONB NOT NULL, -- Full statement with line items and values
    generated_at TIMESTAMP DEFAULT NOW(),
    generated_by VARCHAR(50),
    is_finalized BOOLEAN DEFAULT FALSE,
    finalized_at TIMESTAMP,
    finalized_by VARCHAR(50),
    FOREIGN KEY (template_id) REFERENCES financial_statement_templates(template_id)
);

CREATE INDEX idx_genstmt_period ON generated_financial_statements(period_start, period_end);
CREATE INDEX idx_genstmt_type ON generated_financial_statements(statement_type);
CREATE INDEX idx_genstmt_entity ON generated_financial_statements(entity_id);
CREATE INDEX idx_genstmt_final ON generated_financial_statements(is_finalized);

-- ============================================================================
-- CONSOLIDATED FINANCIAL STATEMENTS
-- Multi-entity consolidation with elimination entries
-- ============================================================================

CREATE TABLE IF NOT EXISTS consolidated_statements (
    consolidation_id VARCHAR(20) PRIMARY KEY,
    consolidation_name VARCHAR(255) NOT NULL,
    statement_type VARCHAR(50) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    fiscal_year INTEGER NOT NULL,
    fiscal_period INTEGER,
    base_currency VARCHAR(3) DEFAULT 'USD',
    consolidation_method VARCHAR(50) DEFAULT 'FULL', -- FULL, PROPORTIONAL, EQUITY
    elimination_journal_id VARCHAR(50), -- Reference to elimination journal entry
    statement_data JSONB NOT NULL,
    entity_breakdown JSONB, -- Data by entity before consolidation
    intercompany_eliminations DECIMAL(15,2) DEFAULT 0,
    minority_interest DECIMAL(15,2) DEFAULT 0,
    generated_at TIMESTAMP DEFAULT NOW(),
    generated_by VARCHAR(50),
    is_finalized BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (consolidation_id) REFERENCES generated_financial_statements(statement_id)
);

CREATE INDEX idx_consolid_period ON consolidated_statements(period_start, period_end);
CREATE INDEX idx_consolid_type ON consolidated_statements(statement_type);

-- ============================================================================
-- BUDGET VS ACTUAL ANALYSIS
-- Track budget performance and variances
-- ============================================================================

CREATE TABLE IF NOT EXISTS budget_actual_analyses (
    analysis_id VARCHAR(20) PRIMARY KEY,
    analysis_name VARCHAR(255) NOT NULL,
    budget_id VARCHAR(20),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    entity_id VARCHAR(20),
    currency VARCHAR(3) DEFAULT 'USD',
    total_budget_amount DECIMAL(15,2) DEFAULT 0,
    total_actual_amount DECIMAL(15,2) DEFAULT 0,
    variance_amount DECIMAL(15,2) DEFAULT 0,
    variance_percent DECIMAL(5,2) DEFAULT 0,
    favorable_variance DECIMAL(15,2) DEFAULT 0,
    unfavorable_variance DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(50),
    FOREIGN KEY (budget_id) REFERENCES budgets(budget_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS budget_actual_details (
    detail_id VARCHAR(20) PRIMARY KEY,
    analysis_id VARCHAR(20) NOT NULL,
    account_id VARCHAR(20) NOT NULL,
    budget_amount DECIMAL(12,2) NOT NULL,
    actual_amount DECIMAL(12,2) NOT NULL,
    variance_amount DECIMAL(12,2) GENERATED ALWAYS AS (actual_amount - budget_amount) STORED,
    variance_percent DECIMAL(5,2),
    account_name VARCHAR(255),
    account_type VARCHAR(50),
    is_favorable BOOLEAN DEFAULT TRUE,
    notes TEXT,
    FOREIGN KEY (analysis_id) REFERENCES budget_actual_analyses(analysis_id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES chart_of_accounts(account_id)
);

CREATE INDEX idx_budgetactual_analysis ON budget_actual_details(analysis_id);
CREATE INDEX idx_budgetactual_account ON budget_actual_details(account_id);

-- ============================================================================
-- MULTI-CURRENCY REVALUATION
-- Track foreign currency revaluation gains/losses
-- ============================================================================

CREATE TABLE IF NOT EXISTS currency_revaluation (
    revaluation_id VARCHAR(20) PRIMARY KEY,
    revaluation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    exchange_rate DECIMAL(12,6) NOT NULL,
    previous_rate DECIMAL(12,6),
    revaluation_method VARCHAR(50) DEFAULT 'CURRENT', -- CURRENT, AVERAGE, HISTORICAL
    gain_amount DECIMAL(15,2) DEFAULT 0,
    loss_amount DECIMAL(15,2) DEFAULT 0,
    net_amount DECIMAL(15,2) GENERATED ALWAYS AS (gain_amount - loss_amount) STORED,
    accounts_revalued INTEGER DEFAULT 0,
    journal_entry_id VARCHAR(50),
    description TEXT,
    posted_by VARCHAR(50),
    posted_at TIMESTAMP DEFAULT NOW(),
    fiscal_period_id VARCHAR(20),
    entity_id VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS currency_revaluation_details (
    detail_id VARCHAR(20) PRIMARY KEY,
    revaluation_id VARCHAR(20) NOT NULL,
    account_id VARCHAR(20) NOT NULL,
    foreign_currency_balance DECIMAL(12,2) NOT NULL,
    original_domestic_amount DECIMAL(12,2) NOT NULL,
    revalued_domestic_amount DECIMAL(12,2) NOT NULL,
    gain_amount DECIMAL(12,2) DEFAULT 0,
    loss_amount DECIMAL(12,2) DEFAULT 0,
    FOREIGN KEY (revaluation_id) REFERENCES currency_revaluation(revaluation_id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES chart_of_accounts(account_id)
);

CREATE INDEX idx_currrev_date ON currency_revaluation(revaluation_date DESC);
CREATE INDEX idx_currrev_currency ON currency_revaluation(from_currency, to_currency);
CREATE INDEX idx_currrevdetail_id ON currency_revaluation_details(revaluation_id);

-- ============================================================================
-- INTERCOMPANY TRANSACTIONS
-- Track transactions between related entities
-- ============================================================================

CREATE TABLE IF NOT EXISTS intercompany_transactions (
    transaction_id VARCHAR(20) PRIMARY KEY,
    transaction_number VARCHAR(50) UNIQUE NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    from_entity_id VARCHAR(20) NOT NULL,
    to_entity_id VARCHAR(20) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL, -- SALE, PURCHASE, TRANSFER, LOAN, DIVIDEND, ROYALTY, SERVICE_FEE
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    description TEXT,
    reference_document VARCHAR(100), -- PO number, SO number, etc.
    from_entity_journal_id VARCHAR(50),
    to_entity_journal_id VARCHAR(50),
    elimination_journal_id VARCHAR(50),
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, POSTED, ELIMINATED, PARTIALLY_ELIMINATED
    posted_date DATE,
    eliminated_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(50),
    FOREIGN KEY (from_entity_id) REFERENCES entities(entity_id),
    FOREIGN KEY (to_entity_id) REFERENCES entities(entity_id)
);

CREATE TABLE IF NOT EXISTS intercompany_transaction_lines (
    line_id VARCHAR(20) PRIMARY KEY,
    transaction_id VARCHAR(20) NOT NULL,
    line_number INTEGER NOT NULL,
    account_id VARCHAR(20) NOT NULL,
    description TEXT,
    amount DECIMAL(12,2) NOT NULL,
    quantity DECIMAL(10,2),
    from_percentage DECIMAL(5,2) DEFAULT 100, -- For partial eliminations
    to_percentage DECIMAL(5,2) DEFAULT 100,
    eliminated_amount DECIMAL(12,2) DEFAULT 0,
    FOREIGN KEY (transaction_id) REFERENCES intercompany_transactions(transaction_id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES chart_of_accounts(account_id)
);

CREATE INDEX idx_intercomp_date ON intercompany_transactions(transaction_date DESC);
CREATE INDEX idx_intercomp_from ON intercompany_transactions(from_entity_id);
CREATE INDEX idx_intercomp_to ON intercompany_transactions(to_entity_id);
CREATE INDEX idx_intercomp_status ON intercompany_transactions(status);
CREATE INDEX idx_intercomplines_id ON intercompany_transaction_lines(transaction_id);

-- ============================================================================
-- TAX COMPLIANCE
-- Extended tax tracking and reporting
-- ============================================================================

CREATE TABLE IF NOT EXISTS tax_compliance_periods (
    period_id VARCHAR(20) PRIMARY KEY,
    tax_authority VARCHAR(100) NOT NULL, -- IRS, HMRC, IRD, etc.
    tax_type VARCHAR(50) NOT NULL, -- INCOME, SALES, PAYROLL, GST, VAT
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    filing_due_date DATE NOT NULL,
    filed_date DATE,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, FILED, OVERDUE, PAID
    tax liability DECIMAL(15,2) DEFAULT 0,
    tax_paid DECIMAL(15,2) DEFAULT 0,
    balance_due DECIMAL(15,2) GENERATED ALWAYS AS (tax_liability - tax_paid) STORED,
    penalty_amount DECIMAL(15,2) DEFAULT 0,
    interest_amount DECIMAL(15,2) DEFAULT 0,
    entity_id VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS tax_payments (
    payment_id VARCHAR(20) PRIMARY KEY,
    period_id VARCHAR(20),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(50), -- CHECK, WIRE, ACH, CREDIT_CARD
    reference_number VARCHAR(100),
    bank_account_id VARCHAR(20),
    journal_entry_id VARCHAR(50),
    notes TEXT,
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (period_id) REFERENCES tax_compliance_periods(period_id)
);

CREATE INDEX idx_taxperiod_authority ON tax_compliance_periods(tax_authority);
CREATE INDEX idx_taxperiod_due ON tax_compliance_periods(filing_due_date DESC);
CREATE INDEX idx_taxpayments_period ON tax_payments(period_id);

-- ============================================================================
-- FINANCIAL RATIOS
-- Track key financial performance indicators
-- ============================================================================

CREATE TABLE IF NOT EXISTS financial_ratios (
    ratio_id VARCHAR(20) PRIMARY KEY,
    entity_id VARCHAR(20),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    ratio_category VARCHAR(50) NOT NULL, -- LIQUIDITY, PROFITABILITY, EFFICIENCY, SOLVENCY, COVERAGE
    ratio_name VARCHAR(100) NOT NULL,
    ratio_value DECIMAL(12,4),
    ratio_formula TEXT,
    comparison_value DECIMAL(12,4), -- Previous period, industry average, etc.
    comparison_type VARCHAR(50), -- PREVIOUS_PERIOD, BUDGET, INDUSTRY, TARGET
    trend VARCHAR(20), -- IMPROVING, DECLINING, STABLE
    notes TEXT,
    calculated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (entity_id) REFERENCES entities(entity_id)
);

CREATE INDEX idx_finratios_entity ON financial_ratios(entity_id);
CREATE INDEX idx_finratios_period ON financial_ratios(period_start, period_end);
CREATE INDEX idx_finratios_category ON financial_ratios(ratio_category);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Balance Sheet View
CREATE OR REPLACE VIEW v_balance_sheet AS
SELECT
    e.entity_id,
    e.entity_name,
    fs.period_start,
    fs.period_end,
    fs.currency,
    fs.statement_data->'assets' as assets_section,
    fs.statement_data->'liabilities' as liabilities_section,
    fs.statement_data->'equity' as equity_section,
    fs.statement_data->'total_assets' as total_assets,
    fs.statement_data->'total_liabilities' as total_liabilities,
    fs.statement_data->'total_equity' as total_equity,
    fs.is_finalized,
    fs.generated_at
FROM generated_financial_statements fs
JOIN entities e ON fs.entity_id = e.entity_id
WHERE fs.statement_type = 'BALANCE_SHEET'
ORDER BY fs.period_end DESC;

-- Income Statement View
CREATE OR REPLACE VIEW v_income_statement AS
SELECT
    e.entity_id,
    e.entity_name,
    fs.period_start,
    fs.period_end,
    fs.currency,
    fs.statement_data->'revenue' as revenue_section,
    fs.statement_data->'expenses' as expenses_section,
    fs.statement_data->'gross_profit' as gross_profit,
    fs.statement_data->'operating_income' as operating_income,
    fs.statement_data->'net_income' as net_income,
    fs.is_finalized,
    fs.generated_at
FROM generated_financial_statements fs
JOIN entities e ON fs.entity_id = e.entity_id
WHERE fs.statement_type = 'INCOME_STATEMENT'
ORDER BY fs.period_end DESC;

-- Cash Flow View
CREATE OR REPLACE VIEW v_cash_flow AS
SELECT
    e.entity_id,
    e.entity_name,
    fs.period_start,
    fs.period_end,
    fs.currency,
    fs.statement_data->'operating' as operating_activities,
    fs.statement_data->'investing' as investing_activities,
    fs.statement_data->'financing' as financing_activities,
    fs.statement_data->'net_cash_flow' as net_cash_flow,
    fs.statement_data->'beginning_cash' as beginning_cash,
    fs.statement_data->'ending_cash' as ending_cash,
    fs.is_finalized,
    fs.generated_at
FROM generated_financial_statements fs
JOIN entities e ON fs.entity_id = e.entity_id
WHERE fs.statement_type = 'CASH_FLOW'
ORDER BY fs.period_end DESC;

-- Budget vs Actual Summary View
CREATE OR REPLACE VIEW v_budget_vs_actual_summary AS
SELECT
    ba.analysis_id,
    ba.analysis_name,
    ba.period_start,
    ba.period_end,
    e.entity_name,
    ba.currency,
    ba.total_budget_amount,
    ba.total_actual_amount,
    ba.variance_amount,
    ba.variance_percent,
    CASE
        WHEN ba.variance_amount >= 0 THEN 'FAVORABLE'
        ELSE 'UNFAVORABLE'
    END as variance_status,
    ba.created_at
FROM budget_actual_analyses ba
LEFT JOIN entities e ON ba.entity_id = e.entity_id
ORDER BY ba.period_end DESC;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to generate balance sheet
CREATE OR REPLACE FUNCTION generate_balance_sheet(
    p_entity_id VARCHAR,
    p_period_start DATE,
    p_period_end DATE,
    p_generated_by VARCHAR
) RETURNS VARCHAR AS $$
DECLARE
    v_statement_id VARCHAR;
    v_template_id VARCHAR;
    v_assets DECIMAL;
    v_liabilities DECIMAL;
    v_equity DECIMAL;
BEGIN
    -- Get default balance sheet template
    SELECT template_id INTO v_template_id
    FROM financial_statement_templates
    WHERE statement_type = 'BALANCE_SHEET' AND is_default = TRUE
    LIMIT 1;

    IF v_template_id IS NULL THEN
        RAISE EXCEPTION 'No balance sheet template found';
    END IF;

    -- Calculate totals from chart of accounts
    SELECT COALESCE(SUM(CASE WHEN account_type IN ('ASSET', 'BANK', 'RECEIVABLE')
                          AND account_type NOT IN ('CONTRA_ASSET') THEN current_balance ELSE 0 END), 0)
    INTO v_assets
    FROM account_balances ab
    JOIN chart_of_accounts coa ON ab.account_id = coa.account_id
    WHERE ($1::text IS NULL OR ab.entity_id = $1)
      AND ab.balance_date <= p_period_end;

    SELECT COALESCE(SUM(CASE WHEN account_type IN ('LIABILITY', 'PAYABLE')
                          THEN current_balance ELSE 0 END), 0)
    INTO v_liabilities
    FROM account_balances ab
    JOIN chart_of_accounts coa ON ab.account_id = coa.account_id
    WHERE ($1::text IS NULL OR ab.entity_id = $1)
      AND ab.balance_date <= p_period_end;

    -- Equity = Assets - Liabilities
    v_equity := v_assets - v_liabilities;

    -- Create statement record
    v_statement_id := 'BS-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD-HH24MISS-') || substring(md5(random()::text), 1, 6);

    INSERT INTO generated_financial_statements (
        statement_id, template_id, statement_type, statement_name,
        period_type, period_start, period_end, fiscal_year,
        entity_id, statement_data, generated_by
    ) VALUES (
        v_statement_id, v_template_id, 'BALANCE_SHEET',
        'Balance Sheet - ' || p_period_end,
        'CUSTOM', p_period_start, p_period_end, EXTRACT(YEAR FROM p_period_end),
        p_entity_id,
        jsonb_build_object(
            'total_assets', v_assets,
            'total_liabilities', v_liabilities,
            'total_equity', v_equity,
            'assets_section', jsonb_build_object('total', v_assets),
            'liabilities_section', jsonb_build_object('total', v_liabilities),
            'equity_section', jsonb_build_object('total', v_equity)
        ),
        p_generated_by
    );

    RETURN v_statement_id;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate currency revaluation gain/loss
CREATE OR REPLACE FUNCTION calculate_currency_revaluation(
    p_revaluation_date DATE,
    p_from_currency VARCHAR,
    p_to_currency VARCHAR DEFAULT 'USD',
    p_exchange_rate DECIMAL,
    p_entity_id VARCHAR DEFAULT NULL
) RETURNS VARCHAR AS $$
DECLARE
    v_revaluation_id VARCHAR;
    v_total_gain DECIMAL := 0;
    v_total_loss DECIMAL := 0;
BEGIN
    v_revaluation_id := 'CURRREV-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD-HH24MISS-') || substring(md5(random()::text), 1, 6);

    -- Calculate gain/loss for each account with foreign currency balance
    FOR v_account IN
        SELECT DISTINCT
            ab.account_id,
            ab.current_balance as foreign_balance,
            ab.current_balance * COALESCE(
                (SELECT MAX(previous_rate) FROM currency_revaluation
                 WHERE from_currency = p_from_currency AND to_currency = p_to_currency
                 AND revaluation_date < p_revaluation_date),
                p_exchange_rate
            ) as original_domestic
        FROM account_balances ab
        JOIN chart_of_accounts coa ON ab.account_id = coa.account_id
        JOIN accounts a ON ab.account_id = a.account_id
        WHERE a.currency = p_from_currency
          AND ($4::text IS NULL OR ab.entity_id = p_entity_id)
          AND ab.balance_date = p_revaluation_date
    LOOP
        DECLARE
            v_revalued_amount DECIMAL;
            v_gain_loss DECIMAL;
        BEGIN
            v_revalued_amount := v_account.foreign_balance * p_exchange_rate;
            v_gain_loss := v_revalued_amount - v_account.original_domestic;

            IF v_gain_loss > 0 THEN
                v_total_gain := v_total_gain + v_gain_loss;
            ELSE
                v_total_loss := v_total_loss + ABS(v_gain_loss);
            END IF;

            -- Create detail record
            INSERT INTO currency_revaluation_details (
                detail_id, revaluation_id, account_id,
                foreign_currency_balance, original_domestic_amount,
                revalued_domestic_amount, gain_amount, loss_amount
            ) VALUES (
                'CRD-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD-HH24MISS-') || substring(md5(random()::text), 1, 6),
                v_revaluation_id, v_account.account_id,
                v_account.foreign_balance, v_account.original_domestic,
                v_revalued_amount,
                CASE WHEN v_gain_loss > 0 THEN v_gain_loss ELSE 0 END,
                CASE WHEN v_gain_loss < 0 THEN ABS(v_gain_loss) ELSE 0 END
            );
        END;
    END LOOP;

    -- Create revaluation header
    INSERT INTO currency_revaluation (
        revaluation_id, revaluation_date, from_currency, to_currency,
        exchange_rate, gain_amount, loss_amount,
        accounts_revalued, description
    ) VALUES (
        v_revaluation_id, p_revaluation_date, p_from_currency, p_to_currency,
        p_exchange_rate, v_total_gain, v_total_loss,
        (SELECT COUNT(*) FROM currency_revaluation_details WHERE revaluation_id = v_revaluation_id),
        'Currency revaluation for ' || p_from_currency || ' to ' || p_to_currency
    );

    RETURN v_revaluation_id;
END;
$$ LANGUAGE plpgsql;

-- Function to record intercompany transaction
CREATE OR REPLACE FUNCTION record_intercompany_transaction(
    p_from_entity_id VARCHAR,
    p_to_entity_id VARCHAR,
    p_transaction_type VARCHAR,
    p_amount DECIMAL,
    p_description TEXT,
    p_reference_document VARCHAR,
    p_created_by VARCHAR
) RETURNS VARCHAR AS $$
DECLARE
    v_transaction_id VARCHAR;
    v_transaction_number VARCHAR;
BEGIN
    v_transaction_id := 'ICT-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD-HH24MISS-') || substring(md5(random()::text), 1, 6);
    v_transaction_number := 'ICT-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || substring(md5(random()::text), 1, 4);

    INSERT INTO intercompany_transactions (
        transaction_id, transaction_number, transaction_date,
        from_entity_id, to_entity_id, transaction_type,
        amount, description, reference_document, created_by
    ) VALUES (
        v_transaction_id, v_transaction_number, CURRENT_DATE,
        p_from_entity_id, p_to_entity_id, p_transaction_type,
        p_amount, p_description, p_reference_document, p_created_by
    );

    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update updated_at for statement templates
CREATE OR REPLACE FUNCTION update_statement_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_statement_template_timestamp ON financial_statement_templates;
CREATE TRIGGER trg_update_statement_template_timestamp
    BEFORE UPDATE ON financial_statement_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_statement_template_timestamp();

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert default financial statement templates
DO $$
BEGIN
    -- Balance Sheet Template
    INSERT INTO financial_statement_templates (
        template_id, template_name, statement_type, description,
        template_config, is_default
    ) VALUES (
        'BS-DEFAULT', 'Standard Balance Sheet', 'BALANCE_SHEET',
        'Standard balance sheet format with assets, liabilities, and equity',
        jsonb_build_object(
            'format', 'STANDARD',
            'sections', jsonb_build_array(
                jsonb_build_object('name', 'Assets', 'type', 'ASSET'),
                jsonb_build_object('name', 'Liabilities', 'type', 'LIABILITY'),
                jsonb_build_object('name', 'Equity', 'type', 'EQUITY')
            )
        ),
        TRUE
    ) ON CONFLICT DO NOTHING;

    -- Income Statement Template
    INSERT INTO financial_statement_templates (
        template_id, template_name, statement_type, description,
        template_config, is_default
    ) VALUES (
        'IS-DEFAULT', 'Standard Income Statement', 'INCOME_STATEMENT',
        'Standard income statement with revenue, expenses, and net income',
        jsonb_build_object(
            'format', 'STANDARD',
            'sections', jsonb_build_array(
                jsonb_build_object('name', 'Revenue', 'type', 'REVENUE'),
                jsonb_build_object('name', 'Cost of Goods Sold', 'type', 'EXPENSE'),
                jsonb_build_object('name', 'Operating Expenses', 'type', 'OPERATING_EXPENSE'),
                jsonb_build_object('name', 'Other Income/Expense', 'type', 'OTHER')
            )
        ),
        TRUE
    ) ON CONFLICT DO NOTHING;

    -- Cash Flow Template
    INSERT INTO financial_statement_templates (
        template_id, template_name, statement_type, description,
        template_config, is_default
    ) VALUES (
        'CF-DEFAULT', 'Standard Cash Flow', 'CASH_FLOW',
        'Standard cash flow statement with operating, investing, and financing activities',
        jsonb_build_object(
            'format', 'STANDARD',
            'method', 'INDIRECT', -- DIRECT or INDIRECT
            'sections', jsonb_build_array(
                jsonb_build_object('name', 'Operating Activities', 'type', 'OPERATING'),
                jsonb_build_object('name', 'Investing Activities', 'type', 'INVESTING'),
                jsonb_build_object('name', 'Financing Activities', 'type', 'FINANCING')
            )
        ),
        TRUE
    ) ON CONFLICT DO NOTHING;
END $$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO opsui_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO opsui_app;
