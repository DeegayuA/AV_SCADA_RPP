from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Login
    page.goto("http://localhost:3002/login")
    page.get_by_placeholder("Email address").fill("admin@av.lk")
    page.get_by_placeholder("Password").fill("superadminpassword")
    page.get_by_role("button", name="Sign in", exact=True).click()

    # Wait for navigation to dashboard
    page.wait_for_url("http://localhost:3002/dashboard")

    # Navigate to user management page
    page.goto("http://localhost:3002/admin/users")

    # Add a new user
    page.get_by_placeholder("Email").fill("test-user@example.com")
    page.get_by_placeholder("Password").fill("password")
    page.get_by_role("combobox").select_option("operator")
    page.get_by_role("button", name="Add User").click()

    # Wait for the new user to appear in the table
    page.wait_for_selector("text=test-user@example.com")

    # Take screenshot
    page.screenshot(path="jules-scratch/verification/user-management.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)