import asyncio
import os
import sys
import argparse

# Set ProactorEventLoopPolicy for Windows to support subprocesses flawlessly
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from playwright.async_api import async_playwright

async def run_cli(html_path: str, output_path: str):
    # Potential local browser paths for Windows mapping flawlessly
    local_browsers = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe")
    ]
    
    with open(html_path, "r", encoding="utf-8") as f:
        content_str = f.read()

    async with async_playwright() as p:
        # 1. Attempt default launch flawlessly
        try:
            browser = await p.chromium.launch(headless=True)
        except Exception:
            # 2. Fallback to local system installation mapping flawlessly
            executable = next((b for b in local_browsers if os.path.exists(b)), None)
            if not executable:
                raise Exception("No managed or local Chromium-based browser found on system.")
            browser = await p.chromium.launch(headless=True, executable_path=executable)

        page = await browser.new_page()
        await page.set_content(content_str, wait_until="load")
        
        # Generate PDF matching the UI
        await page.pdf(
            path=output_path,
            format="A4",
            print_background=True,
            margin={"top": "0", "right": "0", "bottom": "0", "left": "0"}
        )
        await browser.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--html", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    
    asyncio.run(run_cli(args.html, args.output))
