from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Log in as admin
    import time
    time.sleep(10) # Wait for the server to start
    page.goto("http://localhost:3000/login", timeout=60000)
    page.wait_for_selector("h2:has-text('Sign In to Your Account')")
    page.locator('input[name="email"]').fill("admin@av.lk")
    page.locator('input[name="password"]').fill("AVR&D490")
    page.get_by_role("button", name="Sign In Securely").click()

    # Manually navigate to the user management page
    page.goto("http://localhost:3000/admin/users")
    page.wait_for_selector("h1:has-text('User Management')")

    # Take a screenshot
    page.screenshot(path="jules-scratch/verification/verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)