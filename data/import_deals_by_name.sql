INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'Trial Innovations - Opening Retainer Fee', NULL, 'closed_lost', 5, 3000.0, 0, '2025-09-04'::date, '2025-09-04'::date, '2025-08-05 12:12:34'::timestamptz, '2025-11-03 10:06:20'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'Trial Innovations' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'Bryan Edelman' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'Brown Edwards - AI Enablement', NULL, 'qualification', 0, NULL, 25, '2026-03-05'::date, NULL, '2025-08-06 16:02:53'::timestamptz, '2026-03-05 10:30:53'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'Brown Edwards & Co LLP' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'Norman D. Yoder' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'Citizens National - AI Enablement', NULL, 'qualification', 0, NULL, 25, '2026-03-05'::date, NULL, '2025-08-06 16:04:34'::timestamptz, '2026-03-05 10:31:04'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'Citizens National Bank' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'Anthony W. Ray' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'Edmonton State - AI Enablement', NULL, 'qualification', 0, NULL, 25, '2026-03-05'::date, NULL, '2025-08-06 16:08:48'::timestamptz, '2026-03-05 10:31:35'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'Edmonton State Bank' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'Susanna Fisher' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'First Community Mortgage - AI Enablement', NULL, 'qualification', 0, NULL, 25, '2026-03-05'::date, NULL, '2025-08-06 16:10:10'::timestamptz, '2026-03-05 10:32:41'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'First Community Mortgage' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'Brian Katz' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'First National Pulaski - AI Planning', NULL, 'qualification', 0, NULL, 25, '2026-03-05'::date, NULL, '2025-08-06 16:10:33'::timestamptz, '2026-03-05 10:33:15'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'First National Bank of Pulaski' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'Mark Hayes' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'Homeland Community - AI Enablement', NULL, 'qualification', 0, 2000.0, 25, '2026-03-05'::date, NULL, '2025-08-06 16:11:16'::timestamptz, '2026-03-05 10:45:36'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'Homeland Community Bank' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'Coty Grissom' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'Macon Bank - AI Enablement', NULL, 'service_complete', 6, 2000.0, 100, '2025-11-18'::date, '2025-11-18'::date, '2025-08-06 16:11:55'::timestamptz, '2025-12-01 13:31:54'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'Macon Bank & Trust Company' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'John West' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'Studio Bank -AI Planning', NULL, 'cold_deal', 3, 0.0, 10, '2025-11-01'::date, NULL, '2025-08-06 16:14:01'::timestamptz, '2026-02-07 10:10:22'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'Studio Bank' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'Andrew Blahnik' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'Thread Bank - AI initial win', NULL, 'cold_deal', 3, 5000.0, 10, '2025-12-31'::date, NULL, '2025-08-06 16:14:18'::timestamptz, '2026-02-07 10:12:36'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'Thread Bank' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'Clif Howard' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'Upper Cumberlands - AI Enablement', NULL, 'closed_lost', 5, NULL, 0, '2025-12-31'::date, '2025-12-31'::date, '2025-08-06 16:16:08'::timestamptz, '2026-01-06 16:23:10'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'Upper Cumberlands Bancorp' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'Mike Officer' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'Wilson Bank - AI Enablement', '$5,000 to Jennifer Miller', 'qualification', 0, 0.0, 25, '2026-03-17'::date, NULL, '2025-08-06 16:16:59'::timestamptz, '2026-03-05 11:03:53'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'Wilson Bank & Trust' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'John McDearman' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'Decatur County - AI Enablement', NULL, 'closed_won', 4, 9000.0, 100, '2026-03-03'::date, '2026-03-03'::date, '2025-08-06 11:07:14'::timestamptz, '2026-03-04 09:09:48'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'Decatur County Bank' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'Kirk Goehring' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'First Community of Tennessee - AI Enablement', NULL, 'qualification', 0, NULL, 25, '2026-03-31'::date, NULL, '2025-08-06 11:07:35'::timestamptz, '2026-01-06 16:22:12'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'First Community Bank of Tennessee' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'Daniel Watson' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'InsBank - AI Enablement', NULL, 'proposal', 2, 2000.0, 60, '2026-03-31'::date, NULL, '2025-08-06 11:08:17'::timestamptz, '2026-02-07 10:01:45'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'InsBank' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'Peyton Green' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'Scott Insurance - AI Enablement', NULL, 'closed_lost', 5, 20000.0, 0, '2025-08-31'::date, '2025-08-31'::date, '2025-08-06 11:09:35'::timestamptz, '2026-03-30 15:50:23'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'Scott Insurance' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'Brandon Webb' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'Smith Wynd - AI Enablement', NULL, 'closed_lost', 5, 5000.0, 0, '2025-12-31'::date, '2025-12-31'::date, '2025-08-06 11:10:37'::timestamptz, '2025-10-03 09:33:10'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'Smith Wynd CPA' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'Benjamin Wynd' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'Truxton - AI Enablement', NULL, 'service_complete', 6, 10000.0, 100, '2025-08-31'::date, '2025-08-31'::date, '2025-08-06 11:11:25'::timestamptz, '2025-10-03 09:21:56'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'Truxton Trust Company' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'Julie Marr' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'Wedgewood Avenue - AI Enablement', NULL, 'closed_lost', 5, NULL, 0, '2025-12-31'::date, '2025-12-31'::date, '2025-08-06 11:12:18'::timestamptz, '2026-01-06 14:01:09'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'Wedgewood Avenue' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'Beau Fowler' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'Lifelong Learning', NULL, 'service_complete', 6, 500.0, 100, '2025-08-06'::date, '2025-08-06'::date, '2025-08-06 11:17:36'::timestamptz, '2025-10-03 09:21:59'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'Lipscomb University' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'Amy Hamar' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'Texas First Bank - AI Enablement', NULL, 'closed_lost', 5, 30000.0, 0, '2025-11-30'::date, '2025-11-30'::date, '2025-08-12 09:45:38'::timestamptz, '2025-12-08 08:03:52'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'Texas First Bank' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'Lincoln C McKinnon' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'TBA - AI Enablement', NULL, 'service_complete', 6, 1000.0, 100, '2025-10-28'::date, '2025-10-28'::date, '2025-08-12 09:47:57'::timestamptz, '2025-11-11 10:23:10'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'Tennessee Bankers Association' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'Sheena Freck' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'TBA - 2026 Conference Appearance', NULL, 'closed_lost', 5, 0.0, 0, '2025-12-01'::date, '2025-12-01'::date, '2025-08-12 09:49:10'::timestamptz, '2026-02-07 10:10:30'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'Tennessee Bankers Association' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'Colin Barrett' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'Maverick Business Partners- AI Enablement', NULL, 'closed_lost', 5, 4000.0, 0, '2025-12-31'::date, '2025-12-31'::date, '2025-08-27 10:09:22'::timestamptz, '2025-10-03 09:32:25'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'Maverick Business Partners, LLC' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'Barclay Bloodworth' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'TBA- Leadership Forum Training', NULL, 'closed_lost', 5, 8000.0, 0, '2025-10-31'::date, '2025-10-31'::date, '2025-09-10 13:56:32'::timestamptz, '2025-10-03 09:34:32'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'Tennessee Bankers Association' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'Sheena Freck' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'Truxton- Fractional CAIO role', NULL, 'cold_deal', 3, 90000.0, 10, '2026-01-01'::date, NULL, '2025-09-17 09:49:20'::timestamptz, '2026-02-07 10:12:56'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'Truxton Trust Company' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'Julie Marr' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'Cornerstone - AI enablement', NULL, 'qualification', 0, 3000.0, 25, '2026-03-05'::date, NULL, '2025-09-26 14:06:16'::timestamptz, '2026-03-05 10:31:20'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'Cornerstone Financial Credit Union' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'Rob Byrd' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'First Bank- AI Enablement', NULL, 'qualification', 0, NULL, 25, '2026-03-05'::date, NULL, '2025-09-29 10:58:11'::timestamptz, '2026-03-05 10:31:49'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'First Bank' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'Michael Mettee' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'Studio Bank- Fractional CFO', NULL, 'cold_deal', 3, 80000.0, 10, '2025-12-31'::date, NULL, '2025-10-03 09:30:14'::timestamptz, '2026-02-07 10:10:17'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'Studio Bank' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'Andrew Blahnik' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'The Standard - Speaking Engagement', NULL, 'service_complete', 6, 1500.0, 100, '2026-01-30'::date, '2026-01-30'::date, '2025-10-06 11:36:10'::timestamptz, '2026-02-27 13:47:06'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'The Standard' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'Kevin White' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'Decatur- Travel expenses', NULL, 'service_complete', 6, 500.0, 100, '2025-12-31'::date, '2025-12-31'::date, '2025-11-03 09:44:12'::timestamptz, '2026-01-08 12:16:34'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'Decatur County Bank' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'James (Jay) S. England' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'Grove Bank & Trust - AI Training', NULL, 'proposal', 2, 3000.0, 60, '2026-02-28'::date, NULL, '2025-11-18 14:59:44'::timestamptz, '2026-02-07 10:06:01'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'Grove Bank & Trust' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'Jose E. Cueto' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'Macon- CEO education', NULL, 'cold_deal', 3, 1000.0, 10, '2025-12-31'::date, NULL, '2025-11-18 15:01:17'::timestamptz, '2026-02-07 10:10:03'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'Macon Bank & Trust Company' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'John West' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'Macon- AI governing structure', NULL, 'cold_deal', 3, 15000.0, 10, '2025-12-31'::date, NULL, '2025-11-18 15:02:20'::timestamptz, '2026-02-07 10:09:58'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'Macon Bank & Trust Company' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'John West' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'Macon- initial win', NULL, 'proposal', 2, 5000.0, 60, '2025-12-31'::date, NULL, '2025-11-18 15:03:19'::timestamptz, '2026-03-03 13:37:40'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'Macon Bank & Trust Company' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'John West' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'Key State - Engagement', 'Initial AI Education', 'service_complete', 6, 2500.0, 100, '2026-02-28'::date, '2026-02-28'::date, '2025-11-25 10:47:41'::timestamptz, '2026-03-26 11:59:54'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'KeyState' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'Brian Amend' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'Community Bank- AI enablement', NULL, 'proposal', 2, 7000.0, 60, '2026-04-21'::date, NULL, '2025-12-03 09:22:47'::timestamptz, '2026-03-05 10:01:21'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'Community Bank' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'Brent Scott' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'BankMiami- AI management system pilot', NULL, 'closed_won', 4, 7500.0, 100, '2026-02-14'::date, '2026-02-14'::date, '2025-12-04 11:45:25'::timestamptz, '2026-02-07 09:52:30'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'BankMiami' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'Ricky Garcia' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'Circle K- AI Enablement', '10% referral fee to John DeMarco', 'closed_lost', 5, 10000.0, 0, '2026-02-28'::date, '2026-02-28'::date, '2025-12-11 12:01:43'::timestamptz, '2026-03-05 10:00:16'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'Circle K' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'Mark Houston' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'Crowe- Speaking Engagement', NULL, 'closed_lost', 5, 750.0, 0, '2026-01-09'::date, '2026-01-09'::date, '2025-12-16 09:39:28'::timestamptz, '2025-12-19 09:06:13'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'Crowe LLP' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'Amy Martens' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'South State- AI Enablement & Retainer', NULL, 'proposal', 2, 20000.0, 60, '2026-02-28'::date, NULL, '2025-12-23 10:09:44'::timestamptz, '2026-03-05 09:59:54'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'South State Bank' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'Steve Abjanich' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'Red Wing - AI Enablement', '4 sessions, an hour each, focused on enablement in ChatGPT, Lovable and Comet', 'closed_won', 4, 3000.0, 100, '2026-01-31'::date, '2026-01-31'::date, '2026-01-13 15:47:00'::timestamptz, '2026-02-02 10:51:41'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'Red Wing' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'Danny Tohme' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'Wilson Bank & Trust- Board Training', NULL, 'service_complete', 6, 1000.0, 100, '2026-02-13'::date, '2026-02-13'::date, '2026-01-29 15:30:04'::timestamptz, '2026-03-26 11:54:29'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'Wilson Bank & Trust' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'Rachel Fischer' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'Lawrence Family- AI Enablement Education', NULL, 'qualification', 0, 0.0, 25, '2026-03-05'::date, NULL, '2026-02-10 13:38:56'::timestamptz, '2026-03-05 10:40:40'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'Lawrence Family' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'Tim Schueler' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'New Peoples Bank- Board Training', NULL, 'proposal', 2, 2000.0, 60, '2026-02-28'::date, NULL, '2026-02-10 13:43:43'::timestamptz, '2026-03-05 10:06:46'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'New Peoples Bank' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'J.W. Kiser' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'ImpactFi- AI Enablement', NULL, 'closed_won', 4, 5000.0, 100, '2026-02-28'::date, '2026-02-28'::date, '2026-02-19 09:55:01'::timestamptz, '2026-02-27 13:54:49'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'ImpactFI Advisors' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'Zack Forbes' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'TN Bank- AI Enablement- board assistance', NULL, 'proposal', 2, 3000.0, 60, '2026-02-28'::date, NULL, '2026-02-19 10:07:48'::timestamptz, '2026-02-19 16:20:01'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'TNBank' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'Leslie England' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'Lineage Bank- AI strategy & enablement', NULL, 'qualification', 0, 0.0, 25, '2026-03-31'::date, NULL, '2026-02-19 10:21:05'::timestamptz, '2026-02-19 10:21:05'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'Lineage Bank' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'Eddie Maynard' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'Truxton- AI monthly', NULL, 'needs_analysis', 1, 3000.0, 40, '2026-03-31'::date, NULL, '2026-02-19 10:22:41'::timestamptz, '2026-02-19 10:22:41'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'Truxton Trust Company' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'Robbie Camp' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'Scott Insurance- Speaking engagement', NULL, 'needs_analysis', 1, 1500.0, 40, '2026-04-30'::date, NULL, '2026-03-17 16:00:36'::timestamptz, '2026-03-30 15:50:23'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'Scott Insurance' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'Justin MacKay' LIMIT 1) ct;
INSERT INTO sales_deals (company_id, contact_id, title, description, stage, stage_order, value, probability, expected_close_date, actual_close_date, created_at, updated_at)
SELECT c.id, ct.id, 'William Mills- AI Enablement', NULL, 'proposal', 2, 5000.0, 60, '2026-03-31'::date, NULL, '2026-03-18 13:50:23'::timestamptz, '2026-03-18 13:50:23'::timestamptz
FROM (SELECT id FROM companies WHERE name = 'William Mills Agency' LIMIT 1) c
CROSS JOIN (SELECT id FROM contacts WHERE first_name || ' ' || last_name = 'William Mills' LIMIT 1) ct;
