from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Navigate to the login page
        page.goto("http://localhost:3000/login")

        # Log in as admin
        page.get_by_label("Username").fill("admin")
        page.get_by_label("Password").fill("password")
        page.get_by_role("button", name="Login").click()

        # Wait for navigation to the dashboard
        expect(page).to_have_url("http://localhost:3000/dashboard")

        # Navigate to the maintenance page
        page.goto("http://localhost:3000/maintenance")
        expect(page).to_have_url("http://localhost:3000/maintenance")

        # Add a maintenance note
        # Select a device
        page.get_by_role("combobox").first.click()
        page.get_by_text("Inverter").click()

        # Add a new tag
        tag_input = page.get_by_role("combobox").nth(1)
        tag_input.fill("test-tag")
        tag_input.press("Enter")

        # Add a note
        page.get_by_placeholder("Add a note...").fill("This is a test note.")

        # Submit the note
        page.get_by_role("button", name="Add Note").click()

        # Take a screenshot
        page.screenshot(path="jules-scratch/verification/verification.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)