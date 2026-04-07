#!/usr/bin/env python3
"""
Bigin → SM Advisors CRM Import Script
Imports Companies, Contacts, and Sales Deals from Bigin CSV exports.

Requirements:
    pip install supabase python-dotenv

Setup:
    Create a .env file (or export env vars) with:
        SUPABASE_URL=https://your-project.supabase.co
        SUPABASE_SERVICE_KEY=your-service-role-key   <-- use SERVICE ROLE, not anon key

Usage:
    python import_bigin.py

    CSV files must be in the same directory as this script:
        Companies_2026_04_06.csv
        Contacts_2026_04_06.csv
        Pipelines_2026_04_06.csv
"""

import csv
import os
import sys
import uuid
from datetime import datetime

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

try:
    from supabase import create_client, Client
except ImportError:
    print("ERROR: supabase package not found. Run: pip install supabase python-dotenv")
    sys.exit(1)

# ─── Config ────────────────────────────────────────────────────────────────────

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print(
        "ERROR: Missing environment variables.\n"
        "Set SUPABASE_URL and SUPABASE_SERVICE_KEY in a .env file or shell environment.\n"
        "Use the SERVICE ROLE key (not the anon key) to bypass row-level security."
    )
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

BATCH_SIZE = 50

# CSV file names (must be in the same directory as this script)
COMPANIES_CSV = "Companies_2026_04_06.csv"
CONTACTS_CSV  = "Contacts_2026_04_06.csv"
PIPELINES_CSV = "Pipelines_2026_04_06.csv"

# ─── Stage mapping: Bigin → our sales_stage enum ──────────────────────────────

STAGE_MAP: dict[str, str] = {
    "Qualification":        "qualified",
    "Needs Analysis":       "discovery",
    "Proposal/Price Quote": "proposal",
    "Negotiation":          "negotiation",
    "Cold Deal":            "lead",
    "Lead":                 "lead",
    "Closed Won":           "closed_won",
    "Service Complete":     "closed_won",
    "Closed Lost":          "closed_lost",
}

# ─── Helpers ───────────────────────────────────────────────────────────────────

def clean(val: str | None) -> str | None:
    """Return stripped string or None if empty."""
    if val is None:
        return None
    stripped = val.strip()
    return stripped if stripped else None


def parse_date(val: str | None) -> str | None:
    """Parse various date/datetime strings to ISO date string."""
    if not val or not val.strip():
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%m/%d/%Y", "%m/%d/%y"):
        try:
            return datetime.strptime(val.strip(), fmt).date().isoformat()
        except ValueError:
            continue
    return None


def infer_category(bigin_tag: str | None) -> str:
    """
    Map the Bigin tag field to our contact_category enum.
    Bigin tags observed: Referral, Prospect, Client, COI, Personal
    Default: prospect
    """
    tag = (bigin_tag or "").strip().lower()
    if "referral" in tag or "coi" in tag or "center of influence" in tag:
        return "center_of_influence"
    if "client" in tag:
        return "client"
    if "personal" in tag:
        return "personal"
    if "former" in tag:
        return "former_client"
    return "prospect"


def batch_insert(table: str, rows: list[dict], label: str) -> None:
    """Insert rows in batches and print progress."""
    total = len(rows)
    if total == 0:
        print(f"  No {label} to insert.")
        return
    for i in range(0, total, BATCH_SIZE):
        chunk = rows[i : i + BATCH_SIZE]
        supabase.table(table).insert(chunk).execute()
        print(f"  {label}: {min(i + BATCH_SIZE, total)}/{total}")
    print(f"  Done — {total} {label} inserted.")


def upsert_tags(tag_names: set[str]) -> dict[str, str]:
    """Upsert tags by name, return {name: id} map."""
    name_to_id: dict[str, str] = {}
    for name in sorted(tag_names):
        result = supabase.table("tags").upsert(
            {"name": name, "color": "#6B7280"},
            on_conflict="name"
        ).execute()
        if result.data:
            name_to_id[name] = result.data[0]["id"]
    return name_to_id


# ─── 1. Import Companies ───────────────────────────────────────────────────────

print("\n=== 1/3  Importing Companies ===")

bigin_company_to_our_id: dict[str, str] = {}  # bigin_id → our UUID
company_tag_pairs: list[tuple[str, str]] = []  # (our_company_id, tag_name)
companies_batch: list[dict] = []

with open(COMPANIES_CSV, newline="", encoding="utf-8-sig") as f:
    for row in csv.DictReader(f):
        our_id = str(uuid.uuid4())
        bigin_id = row["Company Id"].strip()
        bigin_company_to_our_id[bigin_id] = our_id

        companies_batch.append({
            "id":           our_id,
            "name":         row["Company Name"].strip(),
            "phone":        clean(row.get("Phone")),
            "website":      clean(row.get("Website")),
            "description":  clean(row.get("Description")),
            "address_line1": clean(row.get("Billing Street")),
            "city":         clean(row.get("Billing City")),
            "state":        clean(row.get("Billing State")),
            "zip":          clean(row.get("Billing Code")),
            "qb_customer_id": clean(row.get("QuickBooks ID")),
        })

        tag_val = clean(row.get("Tag"))
        if tag_val:
            company_tag_pairs.append((our_id, tag_val))

batch_insert("companies", companies_batch, "companies")

# Tags for companies
print("\n  Upserting company tags...")
company_unique_tags = {t for _, t in company_tag_pairs}
tag_name_to_id = upsert_tags(company_unique_tags)

company_tag_rows = [
    {"company_id": cid, "tag_id": tag_name_to_id[tag]}
    for cid, tag in company_tag_pairs
    if tag in tag_name_to_id
]
batch_insert("company_tags", company_tag_rows, "company_tag rows")


# ─── 2. Import Contacts ────────────────────────────────────────────────────────

print("\n=== 2/3  Importing Contacts ===")

bigin_contact_to_our_id: dict[str, str] = {}  # bigin_id → our UUID
contact_category_rows: list[dict] = []
contact_tag_pairs: list[tuple[str, str]] = []  # (our_contact_id, tag_name)
contacts_batch: list[dict] = []

with open(CONTACTS_CSV, newline="", encoding="utf-8-sig") as f:
    for row in csv.DictReader(f):
        our_id = str(uuid.uuid4())
        bigin_id = row["Contact Id"].strip()
        bigin_contact_to_our_id[bigin_id] = our_id

        bigin_company_id = clean(row.get("Company Name.id"))
        company_id = bigin_company_to_our_id.get(bigin_company_id or "", None)

        email_opt_out = (row.get("Email Opt Out") or "false").strip().lower() == "true"

        contacts_batch.append({
            "id":                       our_id,
            "company_id":               company_id,
            "first_name":               row["First Name"].strip(),
            "last_name":                row["Last Name"].strip(),
            "title":                    clean(row.get("Title")),
            "email":                    clean(row.get("Email")),
            "mobile":                   clean(row.get("Mobile")),
            "phone":                    clean(row.get("Phone")),
            "linkedin_url":             clean(row.get("LinkedIn Profile")),
            "description":              clean(row.get("Description")),
            "referral_source":          clean(row.get("Referral Source")),
            "association_or_affiliation": clean(row.get("Association or Affiliation")),
            "email_opt_out":            email_opt_out,
            "qb_contact_id":            clean(row.get("QuickBooks ID")),
        })

        tag_val = clean(row.get("Tag"))
        category = infer_category(tag_val)
        contact_category_rows.append({
            "contact_id": our_id,
            "category":   category,
        })

        if tag_val:
            contact_tag_pairs.append((our_id, tag_val))

batch_insert("contacts", contacts_batch, "contacts")
batch_insert("contact_categories", contact_category_rows, "contact_category rows")

# Tags for contacts
print("\n  Upserting contact tags...")
contact_unique_tags = {t for _, t in contact_tag_pairs}
new_tags = contact_unique_tags - set(tag_name_to_id.keys())
if new_tags:
    tag_name_to_id.update(upsert_tags(new_tags))

contact_tag_rows = [
    {"contact_id": cid, "tag_id": tag_name_to_id[tag]}
    for cid, tag in contact_tag_pairs
    if tag in tag_name_to_id
]
batch_insert("contact_tags", contact_tag_rows, "contact_tag rows")


# ─── 3. Import Sales Deals (Pipelines) ────────────────────────────────────────

print("\n=== 3/3  Importing Sales Deals ===")

deals_batch: list[dict] = []
unmapped_stages: set[str] = set()

with open(PIPELINES_CSV, newline="", encoding="utf-8-sig") as f:
    for row in csv.DictReader(f):
        bigin_company_id = clean(row.get("Company Name.id"))
        bigin_contact_id = clean(row.get("Contact Name.id"))

        company_id = bigin_company_to_our_id.get(bigin_company_id or "", None)
        contact_id = bigin_contact_to_our_id.get(bigin_contact_id or "", None)

        stage_raw = (row.get("Stage") or "").strip()
        stage = STAGE_MAP.get(stage_raw)
        if not stage:
            unmapped_stages.add(stage_raw)
            stage = "lead"  # safe fallback

        amount_str = clean(row.get("Amount"))
        try:
            amount = float(amount_str) if amount_str else None
        except ValueError:
            amount = None

        deals_batch.append({
            "company_id":          company_id,
            "contact_id":          contact_id,
            "title":               row["Deal Name"].strip(),
            "description":         clean(row.get("Description")),
            "stage":               stage,
            "value":               amount,
            "expected_close_date": parse_date(row.get("Closing Date")),
        })

batch_insert("sales_deals", deals_batch, "sales deals")

if unmapped_stages:
    print(f"\n  WARNING: These Bigin stages had no mapping and defaulted to 'lead':")
    for s in sorted(unmapped_stages):
        print(f"    - '{s}'")
    print("  Update STAGE_MAP in this script and re-run if needed.")

# ─── Done ──────────────────────────────────────────────────────────────────────

print("\n=== Import Complete ===")
print(f"  Companies : {len(companies_batch)}")
print(f"  Contacts  : {len(contacts_batch)}")
print(f"  Deals     : {len(deals_batch)}")
print("\nAll done. Open the CRM and verify a few records look correct.")
