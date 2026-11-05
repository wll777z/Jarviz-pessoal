import threading
import unittest
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]

class InterfaceTests(unittest.TestCase):
    def test_interface(self):
        server = ThreadingHTTPServer(('127.0.0.1', 0), partial(SimpleHTTPRequestHandler, directory=str(ROOT)))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
                page = browser.new_page(viewport={'width': 1440, 'height': 1000})
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto(f'http://127.0.0.1:{server.server_port}')
                self.assertEqual(page.title(), 'JARVIZ · Assistente pessoal')
                page.get_by_role('button', name='Ouvindo', exact=True).click()
                self.assertEqual(page.locator('body').get_attribute('data-state'), 'listening')
                page.get_by_role('button', name='Em espera', exact=True).click()
                page.get_by_label('Seu comando').fill('<img src=x onerror=alert(1)>')
                page.get_by_role('button', name='Enviar comando').click()
                self.assertEqual(page.locator('body').get_attribute('data-state'), 'processing')
                page.wait_for_timeout(1600)
                self.assertEqual(page.locator('body').get_attribute('data-state'), 'speaking')
                self.assertEqual(page.locator('#conversation img').count(), 0)
                self.assertIn('<img src=x', page.locator('#conversation').inner_text())
                page.get_by_role('button', name='Em espera', exact=True).click()
                page.wait_for_timeout(2200)
                self.assertEqual(page.locator('body').get_attribute('data-state'), 'idle')
                page.get_by_role('button', name='Reduzir movimento').click()
                self.assertEqual(page.locator('html').get_attribute('data-reduced-motion'), 'true')
                page.reload()
                self.assertEqual(page.locator('html').get_attribute('data-reduced-motion'), 'true')
                page.evaluate('window.scrollTo(0, 0)')
                page.screenshot(path='/workspace/jarviz-desktop.png', full_page=True)
                page.set_viewport_size({'width': 390, 'height': 844})
                self.assertTrue(page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
                page.screenshot(path='/workspace/jarviz-mobile.png', full_page=True)
                self.assertEqual(errors, [])
                browser.close()
        finally:
            server.shutdown()
            server.server_close()

if __name__ == '__main__':
    unittest.main()
