import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # --- Unauthenticated User Test ---
        await page.goto("http://localhost:3000/dashboard")
        await page.wait_for_url("http://localhost:3000/login")

        # --- Admin User Test ---
        await page.goto("http://localhost:3000/login")
        await page.fill('input[name="email"]', 'admin@av.lk')
        await page.fill('input[name="password"]', 'AVR&D490')
        await page.click('button[type="submit"]')
        await page.wait_for_url("http://localhost:3000/admin")

        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())