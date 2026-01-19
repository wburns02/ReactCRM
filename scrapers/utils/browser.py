"""
Browser automation utilities using Playwright.

Provides stealth mode capabilities and common browser operations
for scraping government permit portals.
"""

import asyncio
import random
import logging
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class StealthMode(Enum):
    """Browser stealth configuration levels."""
    NONE = "none"
    BASIC = "basic"
    FULL = "full"


@dataclass
class BrowserConfig:
    """Configuration for browser automation."""
    headless: bool = True
    stealth_mode: StealthMode = StealthMode.BASIC
    viewport_width: int = 1920
    viewport_height: int = 1080
    timeout_ms: int = 30000
    user_agent: Optional[str] = None


# Common user agents for rotation
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
]


class BrowserManager:
    """
    Manages Playwright browser instances with stealth capabilities.

    Usage:
        async with BrowserManager(config) as browser:
            page = await browser.new_page()
            await page.goto("https://example.com")
    """

    def __init__(self, config: Optional[BrowserConfig] = None):
        """Initialize the browser manager."""
        self.config = config or BrowserConfig()
        self.playwright = None
        self.browser = None
        self._pages: List = []

    async def __aenter__(self):
        """Async context manager entry."""
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()

    async def start(self) -> None:
        """Start the browser."""
        try:
            from playwright.async_api import async_playwright
        except ImportError:
            raise ImportError(
                "Playwright not installed. Run:\n"
                "  pip install playwright\n"
                "  playwright install chromium"
            )

        self.playwright = await async_playwright().start()

        launch_options = {
            "headless": self.config.headless,
        }

        # Add stealth options
        if self.config.stealth_mode != StealthMode.NONE:
            launch_options["args"] = [
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-infobars",
                "--window-position=0,0",
                f"--window-size={self.config.viewport_width},{self.config.viewport_height}",
            ]

        self.browser = await self.playwright.chromium.launch(**launch_options)
        logger.info("Browser started")

    async def close(self) -> None:
        """Close all pages and the browser."""
        for page in self._pages:
            try:
                await page.close()
            except Exception:
                pass

        if self.browser:
            await self.browser.close()

        if self.playwright:
            await self.playwright.stop()

        logger.info("Browser closed")

    async def new_page(self) -> Any:
        """
        Create a new browser page with stealth configurations.

        Returns:
            Playwright Page object
        """
        if not self.browser:
            raise RuntimeError("Browser not started. Call start() first.")

        context_options = {
            "viewport": {
                "width": self.config.viewport_width,
                "height": self.config.viewport_height,
            },
            "user_agent": self.config.user_agent or random.choice(USER_AGENTS),
        }

        context = await self.browser.new_context(**context_options)

        # Apply stealth scripts
        if self.config.stealth_mode == StealthMode.FULL:
            await self._apply_stealth_scripts(context)

        page = await context.new_page()
        page.set_default_timeout(self.config.timeout_ms)

        self._pages.append(page)
        return page

    async def _apply_stealth_scripts(self, context) -> None:
        """Apply stealth JavaScript to evade bot detection."""
        stealth_js = """
        // Overwrite the `navigator.webdriver` property
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
        });

        // Pass the Chrome Test
        window.chrome = {
            runtime: {},
        };

        // Pass the Permissions Test
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
            parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
        );

        // Overwrite the `plugins` property to use a custom getter
        Object.defineProperty(navigator, 'plugins', {
            get: () => [1, 2, 3, 4, 5],
        });

        // Overwrite the `languages` property to use a custom getter
        Object.defineProperty(navigator, 'languages', {
            get: () => ['en-US', 'en'],
        });
        """
        await context.add_init_script(stealth_js)


async def wait_for_element(
    page,
    selector: str,
    timeout_ms: int = 10000,
    state: str = "visible"
) -> bool:
    """
    Wait for an element to appear on the page.

    Args:
        page: Playwright page object
        selector: CSS selector
        timeout_ms: Maximum wait time
        state: Element state to wait for ('attached', 'detached', 'visible', 'hidden')

    Returns:
        True if element found, False if timeout
    """
    try:
        await page.wait_for_selector(selector, timeout=timeout_ms, state=state)
        return True
    except Exception:
        return False


async def safe_click(page, selector: str, timeout_ms: int = 5000) -> bool:
    """
    Safely click an element, waiting for it to be clickable.

    Args:
        page: Playwright page object
        selector: CSS selector
        timeout_ms: Maximum wait time

    Returns:
        True if clicked, False if failed
    """
    try:
        await page.click(selector, timeout=timeout_ms)
        return True
    except Exception as e:
        logger.warning(f"Failed to click {selector}: {e}")
        return False


async def fill_form_field(
    page,
    selector: str,
    value: str,
    clear_first: bool = True
) -> bool:
    """
    Fill a form field with a value.

    Args:
        page: Playwright page object
        selector: CSS selector for the input
        value: Value to fill
        clear_first: Whether to clear existing value first

    Returns:
        True if filled, False if failed
    """
    try:
        if clear_first:
            await page.fill(selector, "")
        await page.fill(selector, value)
        return True
    except Exception as e:
        logger.warning(f"Failed to fill {selector}: {e}")
        return False


async def random_delay(min_ms: int = 500, max_ms: int = 2000) -> None:
    """
    Wait for a random duration to simulate human behavior.

    Args:
        min_ms: Minimum delay in milliseconds
        max_ms: Maximum delay in milliseconds
    """
    delay = random.randint(min_ms, max_ms) / 1000
    await asyncio.sleep(delay)


async def screenshot_page(page, filename: str) -> str:
    """
    Take a screenshot of the current page.

    Args:
        page: Playwright page object
        filename: Output filename

    Returns:
        Path to saved screenshot
    """
    await page.screenshot(path=filename)
    return filename


def get_random_user_agent() -> str:
    """Get a random user agent string."""
    return random.choice(USER_AGENTS)
