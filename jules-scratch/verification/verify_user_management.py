from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Login
    page.goto("http://localhost:3000/login")
    page.get_by_placeholder("user@example.com").fill("admin@av.lk")
    page.get_by_placeholder("Your secure password").fill("AVR&D490")
    page.get_by_role("button", name="Sign In Securely").click()

    # Wait for navigation to dashboard
    page.wait_for_url("http://localhost:3000/dashboard")

    # Navigate to user management page
    page.goto("http://localhost:3000/admin/users")

    # Take screenshot
    page.screenshot(path="jules-scratch/verification/user-management.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)