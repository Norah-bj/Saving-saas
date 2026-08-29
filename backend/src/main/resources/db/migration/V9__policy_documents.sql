-- Org-scoped policy/constitution reference text — previously mock-only on
-- both member/Policies.tsx and loan-committee/Policy.tsx's reference list
-- (same gap, documented twice). Read-only reference content; no edit
-- endpoint exists yet (not asked for). Seeded identically for every
-- organization since it's generic cooperative governance language, not
-- something that varies per tenant today.

CREATE TABLE policy_documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    category        TEXT NOT NULL CHECK (category = ANY (ARRAY[
                        'membership', 'savings', 'shares', 'loan', 'guarantor',
                        'suspension', 'exit', 'privacy'])),
    title           TEXT NOT NULL,
    summary         TEXT NOT NULL,
    body            TEXT[] NOT NULL,
    updated_at      DATE NOT NULL,
    UNIQUE (organization_id, category)
);

CREATE INDEX idx_policy_documents_organization_id ON policy_documents (organization_id);

-- Seed the same 8 default policies for every organization that exists today.
-- AuthService.register() seeds the same set for every organization created
-- from here on.
INSERT INTO policy_documents (organization_id, category, title, summary, body, updated_at)
SELECT o.id, v.category, v.title, v.summary, v.body, v.updated_at
FROM organizations o
CROSS JOIN (VALUES
    ('membership', 'Membership Policy',
     'Eligibility, registration, and identity verification requirements for new members.',
     ARRAY[
        'Membership is open to all confirmed employees of the district and its affiliated institutions.',
        'Registration requires a valid National ID and Employee ID verified against the district''s employee registry.',
        'The National ID is the member''s unique identifier across the platform; the Employee ID remains unique within the organization.',
        'New members must complete a Membership Application Form, countersigned by the Secretary.'
     ], DATE '2025-11-02'),
    ('savings', 'Savings Policy',
     'How monthly, voluntary, and payroll-deducted savings are collected and recorded.',
     ARRAY[
        'Monthly savings are deducted directly from salary through the district''s HR payroll system and imported by the Accountant each month.',
        'Members may additionally make voluntary savings deposits at any time.',
        'All savings are recorded in the member''s Savings Statement with a running balance, similar to a bank statement.',
        'Savings withdrawals are only permitted upon exit from the cooperative, subject to Organization Admin approval.'
     ], DATE '2025-11-02'),
    ('shares', 'Shares Policy',
     'Share pricing, purchases, and withdrawal rules.',
     ARRAY[
        'Each share is valued at 5,000 RWF.',
        'Every member holds a minimum of 5 founding shares upon registration.',
        'Additional shares may be purchased at any time in whole-share increments.',
        'Share withdrawal requests are reviewed by the Organization Admin and are subject to available cooperative liquidity.'
     ], DATE '2025-11-02'),
    ('loan', 'Loan Policy',
     'Interest, insurance, eligibility, and repayment rules.',
     ARRAY[
        'Members become eligible for a loan after a minimum of three months of continuous savings.',
        'Standard interest is 5% of the requested loan amount, applied once over the loan period.',
        'A 1% insurance fee applies only when the requested amount exceeds the member''s total savings — this is exactly when a guarantor is required.',
        'If the requested amount is within the member''s savings, no guarantor and no insurance fee are required.',
        'Repayment is deducted automatically from salary every month through HR payroll; there are no late-payment penalties since repayment is salary-based.',
        'Loan applications pass through: Submitted -> Under Review -> Guarantor Approval (if required) -> Committee Review -> Approved -> Contract Generated -> Disbursed -> Repaying -> Completed.'
     ], DATE '2026-01-20'),
    ('guarantor', 'Guarantor Policy',
     'Rules governing who can guarantee a loan and their obligations.',
     ARRAY[
        'A guarantor must be an active member in good standing.',
        'A member actively guaranteeing another member''s loan cannot apply for a new loan of their own until that guarantee is released.',
        'Guarantors are notified of the outstanding balance and status of loans they have guaranteed at all times.',
        'If a borrower defaults, the guarantor''s savings may be used to cover the outstanding balance, subject to Loan Committee review.'
     ], DATE '2025-11-02'),
    ('suspension', 'Suspension Policy',
     'Grounds and process for suspending a member.',
     ARRAY[
        'Members may be suspended by the Organization Admin for repeated missed contributions, fraudulent activity, or violation of the cooperative constitution.',
        'Suspended members retain visibility of their savings and loan history but cannot apply for new loans, purchase shares, or vote at meetings.',
        'Suspension decisions may be appealed to the Board within 30 days.'
     ], DATE '2025-09-10'),
    ('exit', 'Exit Policy',
     'How members formally leave the cooperative and settle balances.',
     ARRAY[
        'Members wishing to exit must submit a Membership Exit Request to the Secretary.',
        'All outstanding loan balances must be settled, or a repayment arrangement approved, before exit is finalized.',
        'Savings and share value are refunded within 30 days of an approved exit request.'
     ], DATE '2025-09-10'),
    ('privacy', 'Privacy Policy',
     'How member data is collected, used, and protected.',
     ARRAY[
        'Member financial data is only accessible to the member themselves and authorized organization officers (Secretary, Accountant, Loan Committee, Organization Admin) strictly for cooperative operations.',
        'Data is never shared with third parties without member consent, except where required by Rwandan law.',
        'Each organization''s data is logically isolated from other organizations on the platform.'
     ], DATE '2025-09-10')
) AS v(category, title, summary, body, updated_at);
