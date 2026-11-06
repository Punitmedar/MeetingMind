#!/usr/bin/env python3
"""
MeetingMind Admin Bootstrap Script
==================================
Creates the first admin account (or promotes an existing user to admin).

Usage:
    python create_admin.py

The script reads credentials interactively. Never pass passwords as command-
line arguments — they would appear in shell history and process listings.
"""

import getpass
import re
import sys
from datetime import datetime, timezone

from pwdlib import PasswordHash

# Import after setting up venv
try:
    from database import users_collection
    from config import SECRET_KEY  # ensures .env is loaded
except ImportError as exc:
    print(f"\n[ERROR] Could not import project modules: {exc}")
    print("Run this script from the backend directory with the virtual environment activated:")
    print("  .\\venv\\Scripts\\activate")
    print("  python create_admin.py\n")
    sys.exit(1)


def _valid_email(email: str) -> bool:
    at = email.find("@")
    if at <= 0:
        return False
    domain = email[at + 1:]
    return "." in domain and len(domain) > 2


def main() -> None:
    print("\n══════════════════════════════════════")
    print("  MeetingMind — Admin Account Bootstrap")
    print("══════════════════════════════════════\n")

    # --- Collect email ---
    while True:
        email = input("Admin email: ").strip().lower()
        if _valid_email(email):
            break
        print("  ✗  Enter a valid email address.\n")

    # --- Check existing user ---
    existing = users_collection.find_one({"email": email})

    if existing:
        current_role = existing.get("role", "user")
        if current_role == "admin":
            print(f"\n  ℹ  {email} is already an admin. Nothing to do.\n")
            sys.exit(0)

        confirm = input(
            f"\n  User '{email}' exists with role '{current_role}'.\n"
            f"  Promote to admin? [y/N]: "
        ).strip().lower()
        if confirm != "y":
            print("  Aborted.\n")
            sys.exit(0)

        users_collection.update_one(
            {"_id": existing["_id"]},
            {"$set": {"role": "admin"}},
        )
        print(f"\n  ✓  {email} has been promoted to admin.\n")
        sys.exit(0)

    # --- New admin user: collect and validate password ---
    print(f"\n  Creating new admin account for: {email}")
    print("  Password requirements: at least 8 characters.\n")

    while True:
        password = getpass.getpass("  Password (input hidden): ")
        if len(password) < 8:
            print("  ✗  Password must be at least 8 characters.\n")
            continue
        confirm_pw = getpass.getpass("  Confirm password (input hidden): ")
        if password != confirm_pw:
            print("  ✗  Passwords do not match. Try again.\n")
            continue
        break

    # --- Hash and insert ---
    password_hash = PasswordHash.recommended()
    hashed = password_hash.hash(password)
    # Immediately discard plaintext
    del password, confirm_pw

    user_doc = {
        "email": email,
        "password": hashed,
        "name": "Admin",
        "role": "admin",
        "created_at": datetime.now(timezone.utc),
    }

    result = users_collection.insert_one(user_doc)
    print(f"\n  ✓  Admin account created.")
    print(f"     Email : {email}")
    print(f"     ID    : {result.inserted_id}")
    print(f"\n  Log in at http://localhost:8080/login\n")


if __name__ == "__main__":
    main()
