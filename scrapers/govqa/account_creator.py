#!/usr/bin/env python3
"""
GovQA Account Creator

Creates accounts on GovQA jurisdictions.
Requires manual CAPTCHA solving or 2Captcha integration.
"""

import json
import sys
from datetime import datetime
from pathlib import Path
from io import BytesIO

from govqa import GovQA, EmailAlreadyExists, IncorrectCaptcha, FormValidationError

from govqa_config import OUTPUT_DIR, CREDENTIALS_DIR


def save_captcha(captcha_data: dict, output_path: Path) -> tuple:
    """
    Save CAPTCHA images for manual solving.

    Returns paths to saved files.
    """
    jpeg_path = output_path / "captcha.jpg"
    wav_path = output_path / "captcha.wav"

    if "jpeg" in captcha_data:
        with open(jpeg_path, "wb") as f:
            captcha_data["jpeg"].seek(0)
            f.write(captcha_data["jpeg"].read())
        print(f"CAPTCHA image saved to: {jpeg_path}")

    if "wav" in captcha_data:
        with open(wav_path, "wb") as f:
            captcha_data["wav"].seek(0)
            f.write(captcha_data["wav"].read())
        print(f"CAPTCHA audio saved to: {wav_path}")

    return jpeg_path, wav_path


def create_account_interactive(domain: str, tenant: str):
    """
    Interactive account creation with manual CAPTCHA solving.
    """
    print(f"\n=== Creating Account on {tenant} ===")
    print(f"Domain: {domain}")

    # Initialize client
    client = GovQA(domain=domain)
    form = client.new_account_form()

    print(f"\nRequired fields: {list(form.schema['properties'].keys())}")

    # Save CAPTCHA for manual solving
    output_path = OUTPUT_DIR / tenant
    output_path.mkdir(parents=True, exist_ok=True)

    if form.captcha:
        save_captcha(form.captcha, output_path)
        print("\n>>> Open the captcha.jpg file and solve the CAPTCHA <<<")

    # Get user input
    print("\nEnter account details:")
    email = input("Email address: ").strip()
    password = input("Password: ").strip()
    first_name = input("First name: ").strip()
    last_name = input("Last name: ").strip()

    if form.captcha:
        captcha_code = input("CAPTCHA code (from image): ").strip().upper()
    else:
        captcha_code = None

    # Prepare submission
    account_data = {
        "email_address": email,
        "password": password,
        "first_name": first_name,
        "last_name": last_name,
    }

    if captcha_code:
        account_data["captcha"] = captcha_code

    # Try to create account
    try:
        result = form.submit(account_data)
        print(f"\n SUCCESS: Account created!")

        # Save credentials
        creds_file = CREDENTIALS_DIR / "jurisdictions.json"
        CREDENTIALS_DIR.mkdir(parents=True, exist_ok=True)

        creds = {}
        if creds_file.exists():
            with open(creds_file) as f:
                creds = json.load(f)

        creds[tenant] = {
            "domain": domain,
            "email": email,
            "password": password,
            "created": datetime.now().isoformat()
        }

        with open(creds_file, "w") as f:
            json.dump(creds, f, indent=2)

        print(f"Credentials saved to: {creds_file}")
        return True

    except EmailAlreadyExists:
        print("\n ERROR: Email address already exists")
        return False
    except IncorrectCaptcha:
        print("\n ERROR: CAPTCHA was incorrect")
        return False
    except FormValidationError as e:
        print(f"\n ERROR: Form validation failed: {e}")
        return False
    except Exception as e:
        print(f"\n ERROR: {e}")
        return False


def create_account_with_2captcha(domain: str, tenant: str, api_key: str):
    """
    Automated account creation using 2Captcha service.

    Requires 2Captcha API key.
    """
    # TODO: Implement 2Captcha integration
    # https://2captcha.com/api-docs
    raise NotImplementedError("2Captcha integration not yet implemented")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python account_creator.py <tenant>")
        print("Available tenants: chicagoil, piercecountywa, californiacdcr")
        sys.exit(1)

    tenant = sys.argv[1]

    # Get domain from config
    from govqa_config import get_jurisdiction

    jurisdiction = get_jurisdiction(tenant)
    if not jurisdiction:
        print(f"Unknown tenant: {tenant}")
        sys.exit(1)

    create_account_interactive(jurisdiction.domain, tenant)
