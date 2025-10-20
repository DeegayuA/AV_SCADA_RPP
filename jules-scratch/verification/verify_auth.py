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

        # Log in
        await page.goto("http://localhost:3000/login")
        await page.fill('input[name="email"]', 'admin@av.lk')
        await page.fill('input[name="password"]', 'AVR&D490')
        await page.click('button[type="submit"]')

        # Wait for navigation to the dashboard
        await page.wait_for_url("http://localhost:3000/")

        # Go to user management page
        await page.click('text="User Management"')
        await page.wait_for_url("http://localhost:3000/admin/users")

        # Wait for the users table to be populated
        await page.get_by_role("cell", name="admin@av.lk").first.wait_for()
        await page.get_by_role("cell", name="operator@av.lk").first.wait_for()
        await page.get_by_role("cell", name="viewer@av.lk").first.wait_for()

        # Take a screenshot
        await page.screenshot(path="jules-scratch/verification/verification.png")

        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())