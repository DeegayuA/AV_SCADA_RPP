
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto("http://localhost:3000/control", timeout=120000)
    page.wait_for_selector('button[title="Enable Dashboard Layout Editing"]', timeout=120000)
    page.screenshot(path="jules-scratch/verification/verification.png")
    browser.close()
