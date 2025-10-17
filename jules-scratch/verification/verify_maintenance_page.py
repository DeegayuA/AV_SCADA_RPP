from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Set a generous timeout
    page.set_default_timeout(90000)

    try:
        # Go to the login page
        page.goto("http://localhost:3000/login")

        # Handle the initial setup screen
        expect(page.get_by_text("Initial System Setup Required")).to_be_visible()
        page.get_by_role("button", name="Log In as Administrator").click()

        # Fill in the credentials
        page.get_by_placeholder("admin@example.com").fill("admin@av.lk")
        page.get_by_placeholder("Enter admin password").fill("AVR&D490")

        # Click the login button
        page.get_by_role("button", name="Authenticate & Setup").click()

        # Wait for the toast notification to confirm login before it disappears
        expect(page.get_by_text("Admin Verified: Admin SolarCtrl!")).to_be_visible()
        expect(page.get_by_text("Admin Verified: Admin SolarCtrl!")).not_to_be_visible(timeout=15000)

        # The user is sent to the onboarding page. Wait for a reliable element.
        # The screenshot shows "Step 1 of 4: Welcome"
        expect(page.get_by_text("Step 1 of 4: Welcome")).to_be_visible()

        # We can't complete the full onboarding in this script.
        # The goal is to verify the maintenance page, so we'll navigate there directly
        # assuming the session is now authenticated.
        page.goto("http://localhost:3000/maintenance")

        # Wait for the main content of the maintenance page to be visible
        expect(page.get_by_text("Maintenance Dashboard")).to_be_visible()

        # Take a screenshot for visual verification
        page.screenshot(path="jules-scratch/verification/maintenance_page_after_login.png")
        print("Screenshot taken successfully: jules-scratch/verification/maintenance_page_after_login.png")

    except Exception as e:
        print(f"An error occurred during verification: {e}")
        page.screenshot(path="jules-scratch/verification/error_screenshot.png")
        print("Error screenshot saved to jules-scratch/verification/error_screenshot.png")

    finally:
        context.close()
        browser.close()

with sync_playwright() as playwright:
    run(playwright)