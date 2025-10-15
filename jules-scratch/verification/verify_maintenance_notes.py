import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        try:
            await page.goto("http://localhost:3000/maintenance", timeout=120000)
            await page.wait_for_selector("text=Maintenance Notes Log", timeout=120000)

            # Verify the main components are visible
            await expect(page.locator("text=Maintenance Notes Log")).to_be_visible()
            await expect(page.locator('button:has-text("Export to CSV")')).to_be_visible()

            # Take a screenshot of the initial state
            await page.screenshot(path="jules-scratch/verification/maintenance-notes.png")

            print("Successfully verified the maintenance notes page.")

        except Exception as e:
            print(f"An error occurred: {e}")
            await page.screenshot(path="jules-scratch/verification/error.png")

        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())