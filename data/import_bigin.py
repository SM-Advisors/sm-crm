#!/usr/bin/env python3
"""
Import Bigin CSV exports into SM Advisors CRM Supabase database.

Reads Companies, Contacts, and Pipelines CSVs and generates a single SQL file
that can be run against the Supabase database.

Usage:
    python3 data/import_bigin.py > data/import.sql
    # Then run import.sql against your Supabase database
"""

import csv
import json
import os
import sys
import uuid
from datetime import datetime

DATA_DIR = os.path.dirname(os.path.abspath(__file__))

# ============================================
# ID MAPPING: Bigin IDs -> new UUIDs
# ============================================
company_id_map = {}   # bigin_id -> uuid
contact_id_map = {}   # bigin_id -> uuid
deal_id_map = {}      # bigin_id -> uuid

# Company category from Bigin Tag (applied to contacts via contact_categories)
COMPANY_TAG_TO_CATEGORY = {
    'Prospect': 'prospect',
    'Potential Prospect': 'prospect',
    'Client': 'client',
    'Referral': 'center_of_influence',
    'Contact': 'personal',
    'Dead': 'former_client',
}

# Bigin pipeline stage -> our sales_stage enum
BIGIN_STAGE_MAP = {
    'Qualification': 'qualified',
    'Needs Analysis': 'discovery',
    'Proposal/Price Quote': 'proposal',
    'Cold Deal': 'lead',
    'Closed Won': 'closed_won',
    'Closed Lost': 'closed_lost',
    'Service Complete': 'closed_won',  # delivered = won
}

# Stage order for sorting in Kanban
STAGE_ORDER = {
    'lead': 0,
    'qualified': 1,
    'discovery': 2,
    'proposal': 3,
    'negotiation': 4,
    'closed_won': 5,
    'closed_lost': 6,
}


def sql_escape(val):
    """Escape a string for SQL insertion."""
    if val is None or val == '':
        return 'NULL'
    escaped = val.replace("'", "''")
    return f"'{escaped}'"


def sql_timestamp(val):
    """Convert Bigin timestamp to SQL timestamptz."""
    if not val:
        return 'NULL'
    return f"'{val}'::timestamptz"


def sql_date(val):
    """Convert date string to SQL date."""
    if not val:
        return 'NULL'
    return f"'{val}'::date"


def sql_decimal(val):
    """Convert amount to SQL decimal."""
    if not val:
        return 'NULL'
    try:
        return str(float(val))
    except ValueError:
        return 'NULL'


def generate_uuid():
    return str(uuid.uuid4())


def read_csv(filename):
    path = os.path.join(DATA_DIR, filename)
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        return list(reader)


def import_companies(rows):
    """Generate SQL for companies table."""
    lines = []
    lines.append('-- ============================================')
    lines.append('-- COMPANIES')
    lines.append('-- ============================================')

    # Track company tag for later use with contacts
    company_categories = {}  # bigin_company_id -> category

    for row in rows:
        bigin_id = row['Company Id']
        new_id = generate_uuid()
        company_id_map[bigin_id] = new_id

        tag = row.get('Tag', '').strip()
        if tag and tag in COMPANY_TAG_TO_CATEGORY:
            company_categories[bigin_id] = COMPANY_TAG_TO_CATEGORY[tag]

        name = row['Company Name'].strip()
        phone = row.get('Phone', '').strip()
        website = row.get('Website', '').strip()
        description = row.get('Description', '').strip()
        qb_id = row.get('QuickBooks ID', '').strip()
        street = row.get('Billing Street', '').strip()
        city = row.get('Billing City', '').strip()
        state = row.get('Billing State', '').strip()
        zip_code = row.get('Billing Code', '').strip()
        affiliation = row.get('Association or Affiliation', '').strip()
        created = row.get('Created Time', '')
        modified = row.get('Modified Time', '')

        # Use description field for affiliation if no description exists
        if affiliation and not description:
            description = f"Affiliation: {affiliation}"
        elif affiliation and description:
            description = f"{description}\nAffiliation: {affiliation}"

        lines.append(
            f"INSERT INTO companies (id, name, phone, website, description, "
            f"qb_customer_id, address_line1, city, state, zip, "
            f"created_at, updated_at) VALUES ("
            f"'{new_id}', {sql_escape(name)}, {sql_escape(phone)}, "
            f"{sql_escape(website)}, {sql_escape(description)}, "
            f"{sql_escape(qb_id)}, {sql_escape(street)}, {sql_escape(city)}, "
            f"{sql_escape(state)}, {sql_escape(zip_code)}, "
            f"{sql_timestamp(created)}, {sql_timestamp(modified)});"
        )

    return lines, company_categories


def import_contacts(rows, company_categories):
    """Generate SQL for contacts and contact_categories tables."""
    lines = []
    lines.append('')
    lines.append('-- ============================================')
    lines.append('-- CONTACTS')
    lines.append('-- ============================================')

    category_lines = []
    tag_names = set()
    contact_tag_lines = []

    for row in rows:
        bigin_id = row['Contact Id']
        new_id = generate_uuid()
        contact_id_map[bigin_id] = new_id

        first_name = row.get('First Name', '').strip()
        last_name = row.get('Last Name', '').strip()
        title = row.get('Title', '').strip()
        email = row.get('Email', '').strip()
        phone = row.get('Phone', '').strip()
        mobile = row.get('Mobile', '').strip()
        home_phone = row.get('Home Phone', '').strip()
        linkedin = row.get('LinkedIn Profile', '').strip()
        description = row.get('Description', '').strip()
        affiliation = row.get('Association or Affiliation', '').strip()
        referral = row.get('Referral Source', '').strip()
        email_opt_out = row.get('Email Opt Out', 'false').strip().lower() == 'true'
        qb_id = row.get('QuickBooks ID', '').strip()
        created = row.get('Created Time', '')
        modified = row.get('Modified Time', '')
        tag = row.get('Tag', '').strip()

        # Company lookup
        bigin_company_id = row.get('Company Name.id', '').strip()
        company_uuid = company_id_map.get(bigin_company_id)

        # Use mobile as phone if no phone, or home_phone
        if not phone and mobile:
            phone = mobile
            mobile = ''
        if not phone and home_phone:
            phone = home_phone

        company_id_sql = f"'{company_uuid}'" if company_uuid else 'NULL'

        lines.append(
            f"INSERT INTO contacts (id, company_id, first_name, last_name, title, "
            f"email, phone, mobile, linkedin_url, description, "
            f"referral_source, association_or_affiliation, email_opt_out, "
            f"qb_contact_id, created_at, updated_at) VALUES ("
            f"'{new_id}', {company_id_sql}, {sql_escape(first_name)}, "
            f"{sql_escape(last_name)}, {sql_escape(title)}, {sql_escape(email)}, "
            f"{sql_escape(phone)}, {sql_escape(mobile)}, {sql_escape(linkedin)}, "
            f"{sql_escape(description)}, {sql_escape(referral)}, "
            f"{sql_escape(affiliation)}, {str(email_opt_out).lower()}, "
            f"{sql_escape(qb_id)}, {sql_timestamp(created)}, {sql_timestamp(modified)});"
        )

        # Contact category: derive from company's Bigin tag
        if bigin_company_id and bigin_company_id in company_categories:
            cat = company_categories[bigin_company_id]
            cat_id = generate_uuid()
            category_lines.append(
                f"INSERT INTO contact_categories (id, contact_id, category) "
                f"VALUES ('{cat_id}', '{new_id}', '{cat}');"
            )

        # Handle contact-level tags
        if tag:
            # Some tags are comma-separated
            for t in tag.split(','):
                t = t.strip()
                if t and t not in ('false', 'true'):
                    tag_names.add(t)
                    contact_tag_lines.append((new_id, t))

    # Generate tag inserts
    tag_lines = []
    tag_id_map = {}
    if tag_names:
        tag_lines.append('')
        tag_lines.append('-- ============================================')
        tag_lines.append('-- TAGS')
        tag_lines.append('-- ============================================')
        for tname in sorted(tag_names):
            tid = generate_uuid()
            tag_id_map[tname] = tid
            tag_lines.append(
                f"INSERT INTO tags (id, name) VALUES ('{tid}', {sql_escape(tname)}) "
                f"ON CONFLICT (name) DO NOTHING;"
            )

    # Generate contact_tag junction inserts
    ct_lines = []
    if contact_tag_lines:
        ct_lines.append('')
        ct_lines.append('-- CONTACT TAGS')
        for contact_uuid, tname in contact_tag_lines:
            tid = tag_id_map.get(tname)
            if tid:
                ct_lines.append(
                    f"INSERT INTO contact_tags (contact_id, tag_id) "
                    f"VALUES ('{contact_uuid}', '{tid}') ON CONFLICT DO NOTHING;"
                )

    # Category lines
    cat_section = []
    if category_lines:
        cat_section.append('')
        cat_section.append('-- ============================================')
        cat_section.append('-- CONTACT CATEGORIES')
        cat_section.append('-- ============================================')
        cat_section.extend(category_lines)

    return lines + tag_lines + ct_lines + cat_section


def import_pipelines(rows):
    """Generate SQL for sales_deals table."""
    lines = []
    lines.append('')
    lines.append('-- ============================================')
    lines.append('-- SALES DEALS')
    lines.append('-- ============================================')

    for row in rows:
        bigin_id = row['Deal Id']
        new_id = generate_uuid()
        deal_id_map[bigin_id] = new_id

        title = row['Deal Name'].strip()
        bigin_company_id = row.get('Company Name.id', '').strip()
        bigin_contact_id = row.get('Contact Name.id', '').strip()
        amount = row.get('Amount', '').strip()
        bigin_stage = row.get('Stage', '').strip()
        closing_date = row.get('Closing Date', '').strip()
        description = row.get('Description', '').strip()
        created = row.get('Created Time', '')
        modified = row.get('Modified Time', '')

        company_uuid = company_id_map.get(bigin_company_id)
        contact_uuid = contact_id_map.get(bigin_contact_id)
        stage = BIGIN_STAGE_MAP.get(bigin_stage, 'lead')
        order = STAGE_ORDER.get(stage, 0)

        company_id_sql = f"'{company_uuid}'" if company_uuid else 'NULL'
        contact_id_sql = f"'{contact_uuid}'" if contact_uuid else 'NULL'

        # Set probability based on stage
        probability_map = {
            'lead': 10, 'qualified': 25, 'discovery': 40,
            'proposal': 60, 'negotiation': 80,
            'closed_won': 100, 'closed_lost': 0,
        }
        probability = probability_map.get(stage, 0)

        # For "Service Complete" deals, set actual_close_date
        actual_close = 'NULL'
        if bigin_stage == 'Service Complete' or bigin_stage == 'Closed Won':
            actual_close = sql_date(closing_date)
        elif bigin_stage == 'Closed Lost':
            actual_close = sql_date(closing_date)

        lines.append(
            f"INSERT INTO sales_deals (id, company_id, contact_id, title, "
            f"description, stage, stage_order, value, probability, "
            f"expected_close_date, actual_close_date, "
            f"created_at, updated_at) VALUES ("
            f"'{new_id}', {company_id_sql}, {contact_id_sql}, "
            f"{sql_escape(title)}, {sql_escape(description)}, "
            f"'{stage}', {order}, {sql_decimal(amount)}, {probability}, "
            f"{sql_date(closing_date)}, {actual_close}, "
            f"{sql_timestamp(created)}, {sql_timestamp(modified)});"
        )

    return lines


def main():
    print('-- ============================================')
    print('-- SM Advisors CRM: Bigin CSV Import')
    print(f'-- Generated: {datetime.now().isoformat()}')
    print('-- ============================================')
    print()
    print('BEGIN;')
    print()

    # 1. Companies
    company_rows = read_csv('Companies_2026_04_06.csv')
    company_lines, company_categories = import_companies(company_rows)
    for line in company_lines:
        print(line)

    # 2. Contacts (depends on companies for FK)
    contact_rows = read_csv('Contacts_2026_04_06.csv')
    contact_lines = import_contacts(contact_rows, company_categories)
    for line in contact_lines:
        print(line)

    # 3. Pipelines (depends on companies + contacts for FKs)
    pipeline_rows = read_csv('Pipelines_2026_04_06.csv')
    pipeline_lines = import_pipelines(pipeline_rows)
    for line in pipeline_lines:
        print(line)

    print()
    print('COMMIT;')

    # Summary to stderr
    print(f'\n-- Import summary:', file=sys.stderr)
    print(f'--   Companies: {len(company_id_map)}', file=sys.stderr)
    print(f'--   Contacts:  {len(contact_id_map)}', file=sys.stderr)
    print(f'--   Deals:     {len(deal_id_map)}', file=sys.stderr)


if __name__ == '__main__':
    main()
