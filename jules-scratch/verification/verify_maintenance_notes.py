from playwright.sync_api import sync_playwright, Page, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Log in as operator
    page.goto("http://localhost:3000/login")
    page.wait_for_timeout(5000) # 5 second delay
    page.get_by_placeholder("name@example.com").fill("operator@example.com")
    page.get_by_placeholder("password").fill("password")
    page.get_by_role("button", name="Login").click()
    expect(page).to_have_url("http://localhost:3000/dashboard")

    # Navigate to maintenance page
    page.goto("http://localhost:3000/maintenance")

    # Fill out maintenance note form
    page.get_by_role("button", name="Select a device").click()
    page.get_by_text("Inverter").click()
    page.locator('input[id="itemNumber"]').fill("5")
    page.get_by_role("button", name="Select or create a tag").click()
    page.get_by_placeholder("Search...").fill("Test Tag")
    page.get_by_role("button", name='Create "Test Tag"').click()
    page.get_by_label("Note (optional)").fill("This is a test note.")
    page.get_by_role("button", name="Submit Note").click()

    # Log out
    page.get_by_role("button", name="Logout").click()
    expect(page).to_have_url("http://localhost:3000/login")

    # Log in as admin
    page.wait_for_timeout(5000) # 5 second delay
    page.get_by_placeholder("name@example.com").fill("admin@example.com")
    page.get_by_placeholder("password").fill("password")
    page.get_by_role("button", name="Login").click()
    expect(page).to_have_url("http://localhost:3000/dashboard")

    # Navigate to maintenance page
    page.goto("http://localhost:3000/maintenance")

    # Go to maintenance notes tab
    page.get_by_role("tab", name="Maintenance Notes").click()

    # Take screenshot
    page.screenshot(path="jules-scratch/verification/verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)