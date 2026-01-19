"""
PDF download and text extraction utilities for septic permit documents.
"""

import os
import logging
import hashlib
from typing import Optional, Dict, Any
from urllib.parse import urlparse
import requests

logger = logging.getLogger(__name__)


def download_pdf(
    url: str,
    output_dir: str,
    filename: Optional[str] = None,
    timeout: int = 30,
    headers: Optional[Dict[str, str]] = None
) -> Optional[str]:
    """
    Download a PDF file from a URL.

    Args:
        url: URL of the PDF to download
        output_dir: Directory to save the file
        filename: Optional custom filename (defaults to URL-based name)
        timeout: Request timeout in seconds
        headers: Optional HTTP headers

    Returns:
        Path to downloaded file, or None if failed
    """
    if not url:
        logger.warning("No URL provided for PDF download")
        return None

    os.makedirs(output_dir, exist_ok=True)

    # Generate filename if not provided
    if not filename:
        # Use URL hash + path to create unique filename
        url_hash = hashlib.md5(url.encode()).hexdigest()[:8]
        parsed = urlparse(url)
        path_part = os.path.basename(parsed.path) or "document"
        if not path_part.endswith('.pdf'):
            path_part += '.pdf'
        filename = f"{url_hash}_{path_part}"

    filepath = os.path.join(output_dir, filename)

    # Skip if already downloaded
    if os.path.exists(filepath):
        logger.info(f"PDF already exists: {filepath}")
        return filepath

    default_headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/pdf,*/*',
    }
    if headers:
        default_headers.update(headers)

    try:
        response = requests.get(
            url,
            headers=default_headers,
            timeout=timeout,
            stream=True
        )
        response.raise_for_status()

        # Verify it's actually a PDF
        content_type = response.headers.get('content-type', '')
        if 'pdf' not in content_type.lower() and not url.endswith('.pdf'):
            logger.warning(f"Response may not be PDF: {content_type}")

        with open(filepath, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)

        logger.info(f"Downloaded PDF: {filepath}")
        return filepath

    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to download PDF from {url}: {e}")
        return None


def extract_pdf_text(filepath: str) -> Optional[str]:
    """
    Extract text content from a PDF file.

    Args:
        filepath: Path to the PDF file

    Returns:
        Extracted text, or None if extraction failed
    """
    if not os.path.exists(filepath):
        logger.error(f"PDF file not found: {filepath}")
        return None

    try:
        # Try PyPDF2 first
        try:
            from PyPDF2 import PdfReader
            reader = PdfReader(filepath)
            text_parts = []
            for page in reader.pages:
                text_parts.append(page.extract_text() or "")
            return "\n".join(text_parts)
        except ImportError:
            pass

        # Try pdfplumber as fallback
        try:
            import pdfplumber
            with pdfplumber.open(filepath) as pdf:
                text_parts = []
                for page in pdf.pages:
                    text_parts.append(page.extract_text() or "")
                return "\n".join(text_parts)
        except ImportError:
            pass

        logger.warning("No PDF library available. Install PyPDF2 or pdfplumber.")
        return None

    except Exception as e:
        logger.error(f"Failed to extract text from {filepath}: {e}")
        return None


def parse_permit_from_pdf(text: str) -> Dict[str, Any]:
    """
    Parse permit information from extracted PDF text.

    This is a basic parser - extend with regex patterns specific
    to the permit formats you encounter.

    Args:
        text: Extracted PDF text

    Returns:
        Dictionary of parsed fields
    """
    import re

    result = {}

    # Common patterns to look for
    patterns = {
        'permit_number': [
            r'Permit\s*(?:#|No\.?|Number)?\s*:?\s*([A-Z0-9\-]+)',
            r'PERMIT\s*(?:#|NO\.?|NUMBER)?\s*:?\s*([A-Z0-9\-]+)',
        ],
        'address': [
            r'(?:Property|Site|Location)\s*Address\s*:?\s*(.+?)(?:\n|$)',
            r'Address\s*:?\s*(\d+.+?)(?:\n|$)',
        ],
        'parcel': [
            r'(?:Parcel|APN|Tax\s*ID)\s*(?:#|No\.?)?\s*:?\s*([0-9\-\.]+)',
        ],
        'install_date': [
            r'(?:Install|Installation)\s*Date\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})',
            r'Date\s*(?:Issued|Installed)\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})',
        ],
        'system_type': [
            r'(?:System|Tank)\s*Type\s*:?\s*(.+?)(?:\n|$)',
            r'Type\s*of\s*System\s*:?\s*(.+?)(?:\n|$)',
        ],
        'tank_size': [
            r'Tank\s*(?:Size|Capacity)\s*:?\s*(\d+)\s*(?:gal|gallons?)?',
            r'(\d+)\s*(?:gal|gallon)\s*tank',
        ],
        'bedrooms': [
            r'(?:Number\s*of\s*)?Bedrooms?\s*:?\s*(\d+)',
            r'(\d+)\s*(?:bed|bedroom|br)',
        ],
    }

    for field, patterns_list in patterns.items():
        for pattern in patterns_list:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                result[field] = match.group(1).strip()
                break

    return result


def batch_download_pdfs(
    urls: list,
    output_dir: str,
    max_concurrent: int = 3,
    delay_between: float = 1.0
) -> Dict[str, Optional[str]]:
    """
    Download multiple PDFs with rate limiting.

    Args:
        urls: List of PDF URLs
        output_dir: Directory to save files
        max_concurrent: Maximum concurrent downloads (not currently used)
        delay_between: Delay between downloads in seconds

    Returns:
        Dictionary mapping URLs to local file paths (or None if failed)
    """
    import time

    results = {}
    for url in urls:
        results[url] = download_pdf(url, output_dir)
        time.sleep(delay_between)

    successful = sum(1 for v in results.values() if v)
    logger.info(f"Downloaded {successful}/{len(urls)} PDFs")

    return results
