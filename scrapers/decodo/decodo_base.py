#!/usr/bin/env python3
"""
Decodo API Base Scraper

Provides common functionality for scraping Tennessee contract counties
that are not in the TDEC FileNet system.

Contract Counties (9 total):
- Blount, Davidson, Hamilton, Jefferson, Knox, Madison, Sevier, Shelby, Williamson

Decodo API Docs: https://help.decodo.com/docs/web-scraping-api-introduction
"""

import logging
import os
import time
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, List
import requests

logger = logging.getLogger(__name__)


class DecodoScraper:
    """Base class for Decodo-powered scrapers."""

    # Decodo API Configuration
    API_URL = 'https://scraper-api.decodo.com/v2/scrape'
    ASYNC_URL = 'https://scraper-api.decodo.com/v2/task'
    BATCH_URL = 'https://scraper-api.decodo.com/v2/task/batch'
    RESULTS_URL = 'https://scraper-api.decodo.com/v2/task/{task_id}/results'

    def __init__(
        self,
        username: Optional[str] = None,
        password: Optional[str] = None,
        session_id: Optional[str] = None
    ):
        """
        Initialize Decodo scraper.

        Args:
            username: Decodo username (or DECODO_USERNAME env var)
            password: Decodo password (or DECODO_PASSWORD env var)
            session_id: Optional session ID for maintaining state
        """
        self.username = username or os.getenv('DECODO_USERNAME')
        self.password = password or os.getenv('DECODO_PASSWORD')
        self.session_id = session_id

        if not self.username or not self.password:
            raise ValueError(
                "Decodo credentials required. Set DECODO_USERNAME and DECODO_PASSWORD "
                "environment variables or pass them to the constructor."
            )

    def scrape(
        self,
        url: str,
        render_js: bool = True,
        parse: bool = False,
        extra_params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Scrape a URL using Decodo's Web Scraping API (synchronous).

        Args:
            url: The URL to scrape
            render_js: Whether to use JavaScript rendering (Chrome)
            parse: Whether to parse the output
            extra_params: Additional parameters to pass to the API

        Returns:
            Dict with the scraping result
        """
        payload = {
            'target': 'universal',
            'url': url,
            'headless': 'chrome' if render_js else 'html',
        }

        if parse:
            payload['parse'] = True

        if self.session_id:
            payload['session_id'] = self.session_id

        if extra_params:
            payload.update(extra_params)

        try:
            logger.debug(f"Scraping: {url}")
            start_time = time.time()

            response = requests.post(
                self.API_URL,
                json=payload,
                auth=(self.username, self.password),
                timeout=120
            )

            elapsed = time.time() - start_time
            logger.debug(f"Request completed in {elapsed:.2f}s")

            if response.status_code == 200:
                return {
                    'success': True,
                    'content': response.text,
                    'status_code': response.status_code,
                    'elapsed_seconds': elapsed
                }
            else:
                logger.error(f"Decodo API error: {response.status_code}")
                return {
                    'success': False,
                    'error': response.text,
                    'status_code': response.status_code,
                    'elapsed_seconds': elapsed
                }

        except requests.Timeout:
            logger.error(f"Request timed out for {url}")
            return {
                'success': False,
                'error': 'Request timed out',
                'status_code': 0
            }
        except Exception as e:
            logger.error(f"Request failed: {e}")
            return {
                'success': False,
                'error': str(e),
                'status_code': 0
            }

    def scrape_async(
        self,
        url: str,
        callback_url: Optional[str] = None,
        render_js: bool = True
    ) -> Dict[str, Any]:
        """
        Scrape a URL asynchronously for long-running tasks.

        Args:
            url: The URL to scrape
            callback_url: Optional webhook URL for completion notification
            render_js: Whether to use JavaScript rendering

        Returns:
            Dict with task ID for later retrieval
        """
        payload = {
            'target': 'universal',
            'url': url,
            'headless': 'chrome' if render_js else 'html',
        }

        if callback_url:
            payload['callback_url'] = callback_url

        if self.session_id:
            payload['session_id'] = self.session_id

        try:
            response = requests.post(
                self.ASYNC_URL,
                json=payload,
                auth=(self.username, self.password),
                timeout=30
            )

            if response.status_code == 200:
                data = response.json()
                return {
                    'success': True,
                    'task_id': data.get('task_id'),
                    'status': 'queued'
                }
            else:
                return {
                    'success': False,
                    'error': response.text,
                    'status_code': response.status_code
                }

        except Exception as e:
            logger.error(f"Async request failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def get_task_results(self, task_id: str) -> Dict[str, Any]:
        """
        Get results from an async task.

        Args:
            task_id: The task ID returned from scrape_async

        Returns:
            Dict with the scraping result
        """
        try:
            response = requests.get(
                self.RESULTS_URL.format(task_id=task_id),
                auth=(self.username, self.password),
                timeout=30
            )

            if response.status_code == 200:
                return {
                    'success': True,
                    'content': response.text,
                    'status': 'complete'
                }
            elif response.status_code == 202:
                return {
                    'success': True,
                    'status': 'processing'
                }
            else:
                return {
                    'success': False,
                    'error': response.text,
                    'status_code': response.status_code
                }

        except Exception as e:
            logger.error(f"Failed to get task results: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def scrape_with_session(
        self,
        urls: List[str],
        render_js: bool = True,
        delay_seconds: float = 2.0
    ) -> List[Dict[str, Any]]:
        """
        Scrape multiple URLs while maintaining session state.

        Useful for sites that require login or maintain state between pages.

        Args:
            urls: List of URLs to scrape in order
            render_js: Whether to use JavaScript rendering
            delay_seconds: Delay between requests

        Returns:
            List of results for each URL
        """
        # Generate session ID if not set
        if not self.session_id:
            self.session_id = f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            logger.info(f"Created session: {self.session_id}")

        results = []
        for i, url in enumerate(urls):
            logger.info(f"[{i+1}/{len(urls)}] Scraping: {url}")

            result = self.scrape(url, render_js=render_js)
            results.append(result)

            if i < len(urls) - 1:
                time.sleep(delay_seconds)

        return results


# Tennessee Contract Counties Configuration
CONTRACT_COUNTIES = {
    'blount': {
        'name': 'Blount County',
        'population': 135000,
        'portal': None,  # TBD
        'health_dept': None,  # TBD
    },
    'davidson': {
        'name': 'Davidson County (Nashville)',
        'population': 700000,
        'portal': None,  # Property File Search - needs parcel ID
        'health_dept': 'https://www.nashville.gov/departments/health/environmental-health/septic-and-sewage-disposal-systems',
    },
    'hamilton': {
        'name': 'Hamilton County (Chattanooga)',
        'population': 370000,
        'portal': None,  # TBD
        'health_dept': None,  # TBD
    },
    'jefferson': {
        'name': 'Jefferson County',
        'population': 55000,
        'portal': None,  # TBD
        'health_dept': None,  # TBD
    },
    'knox': {
        'name': 'Knox County (Knoxville)',
        'population': 480000,
        'portal': 'https://epw-permitsubmit.knoxcountytn.gov/',
        'health_dept': 'https://www.knoxcounty.org/health/groundwater_protection/',
    },
    'madison': {
        'name': 'Madison County (Jackson)',
        'population': 100000,
        'portal': None,  # TBD
        'health_dept': None,  # TBD
    },
    'sevier': {
        'name': 'Sevier County (Gatlinburg)',
        'population': 100000,
        'portal': None,  # TBD
        'health_dept': None,  # TBD
    },
    'shelby': {
        'name': 'Shelby County (Memphis)',
        'population': 930000,
        'portal': None,  # No online search
        'health_dept': 'https://www.shelbytnhealth.com/179/Water-Quality-Septic-Tank-Program',
    },
    'williamson': {
        'name': 'Williamson County (Franklin)',
        'population': 250000,
        'portal': 'https://williamson.idtplans.com/secure/',  # Requires login
        'health_dept': 'https://www.williamsoncounty-tn.gov/126/Sewage-Disposal',
        'notes': 'Requires septic company login. Can only view one record at a time.'
    },
}
