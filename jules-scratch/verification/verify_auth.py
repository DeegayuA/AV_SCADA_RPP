import asyncio
from playwright.async_api import async_playwright
import bcrypt
import json
import os
from uuid import uuid4

async def main():
    # Create users
    users = [
        {
            "id": str(uuid4()),
            "username": "admin@av.lk",
            "password": bcrypt.hashpw("AVR&D490".encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
            "role": "admin",
            "name": "Admin SolarCtrl"
        },
        {
            "id": str(uuid4()),
            "username": "operator@av.lk",
            "password": bcrypt.hashpw("operator123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
            "role": "operator",
            "name": "Operator Prime"
        },
        {
            "id": str(uuid4()),
            "username": "viewer@av.lk",
            "password": bcrypt.hashpw("viewer123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
            "role": "viewer",
            "name": "Guest Observer"
        }
    ]

    users_file_path = 'config/users.json'
    with open(users_file_path, 'w') as f:
        json.dump(users, f, indent=2)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # --- Admin User Test ---
        # Log in as admin
        await page.goto("http://localhost:3000/login")
        await page.fill('input[name="email"]', 'admin@av.lk')
        await page.fill('input[name="password"]', 'AVR&D490')
        await page.click('button[type="submit"]')
        await page.wait_for_url("http://localhost:3000/control")

        # Go to user management page
        await page.goto("http://localhost:3000/admin/users")

        # Verify initial users
        await page.get_by_role("cell", name="admin@av.lk").first.wait_for()
        await page.get_by_role("cell", name="operator@av.lk").first.wait_for()
        await page.get_by_role("cell", name="viewer@av.lk").first.wait_for()

        # Create a new user
        await page.click('text="Create User"')
        await page.fill('input[id="username"]', 'newuser@test.com')
        await page.fill('input[id="password"]', 'password')
        await page.click('button:has-text("Create")')

        # Verify new user
        await page.get_by_role("cell", name="newuser@test.com").first.wait_for()

        # Edit the new user's role
        await page.get_by_role("row", name="newuser@test.com viewer").get_by_role("button", name="Edit").click()
        await page.click('button[role="combobox"]')
        await page.click('text="operator"')
        await page.click('button:has-text("Save")')

        # Verify role change
        await page.get_by_role("cell", name="operator").nth(1).wait_for()

        # Delete the new user
        await page.get_by_role("row", name="newuser@test.com operator").get_by_role("button", name="Delete").click()
        await page.click('button:has-text("Delete")')

        # Verify user is deleted
        await page.wait_for_function("() => !document.body.innerText.includes('newuser@test.com')")

        # Take a screenshot
        await page.screenshot(path="jules-scratch/verification/verification.png")

        # Logout
        await page.goto("http://localhost:3000/")
        await page.click('button:has-text("Logout")')
        await page.wait_for_url("http://localhost:3000/login")

        # --- Operator User Test ---
        await page.goto("http://localhost:3000/login")
        await page.fill('input[name="email"]', 'operator@av.lk')
        await page.fill('input[name="password"]', 'operator123')
        await page.click('button[type="submit"]')
        await page.wait_for_url("http://localhost:3000/maintenance")
        await page.goto("http://localhost:3000/")
        await page.click('button:has-text("Logout")')
        await page.wait_for_url("http://localhost:3000/login")

        # --- Viewer User Test ---
        await page.goto("http://localhost:3000/login")
        await page.fill('input[name="email"]', 'viewer@av.lk')
        await page.fill('input[name="password"]', 'viewer123')
        await page.click('button[type="submit"]')
        await page.wait_for_url("http://localhost:3000/dashboard")
        await page.goto("http://localhost:3000/")
        await page.click('button:has-text("Logout")')
        await page.wait_for_url("http://localhost:3000/login")


        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())