import os
import subprocess
import tempfile
import unittest
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]

class InterfaceTests(unittest.TestCase):
    def test_static_pages_preview(self):
        subprocess.run(['node', 'scripts/build-pages.mjs'], cwd=ROOT, check=True, capture_output=True)
        server = ThreadingHTTPServer(('127.0.0.1', 0), partial(SimpleHTTPRequestHandler, directory=str(ROOT / 'dist')))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(executable_path=os.environ.get('JARVIZ_CHROMIUM', '/usr/bin/chromium'), args=['--no-sandbox'])
                page = browser.new_page(viewport={'width': 390, 'height': 844})
                requests, errors = [], []
                page.on('request', lambda req: requests.append(req.url))
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto(f'http://127.0.0.1:{server.server_port}')
                expect(page.locator('.preview-banner')).to_be_visible()
                expect(page.locator('#settings-dialog')).not_to_be_visible()
                expect(page.locator('#settings-button')).not_to_be_visible()
                expect(page.get_by_role('link', name='Baixar aplicativo completo ↗')).to_have_attribute('href', 'https://github.com/wll777z/Jarviz-pessoal/archive/refs/heads/main.zip')
                page.get_by_label('Seu comando').fill('Olá')
                page.get_by_role('button', name='Enviar comando').click()
                expect(page.locator('#conversation')).to_contain_text('Nenhum comando foi executado nesta página.')
                self.assertTrue(page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
                self.assertFalse(any('/api/' in url for url in requests))
                self.assertEqual(errors, [])
                browser.close()
        finally:
            server.shutdown()
            server.server_close()

    def test_functional_interface(self):
        with tempfile.TemporaryDirectory(prefix='jarviz-ui-') as directory:
            root = Path(directory)
            (root / 'notes.txt').write_text('conteúdo de teste')
            process = subprocess.Popen(['node', 'tests/fixture-server.mjs'], cwd=ROOT, env={**os.environ, 'JARVIZ_TEST_DATA': str(root / 'private')}, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            try:
                port = process.stdout.readline().strip()
                self.assertTrue(port.isdigit(), port)
                with sync_playwright() as p:
                    browser = p.chromium.launch(executable_path=os.environ.get('JARVIZ_CHROMIUM', '/usr/bin/chromium'), args=['--no-sandbox'])
                    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
                    page.add_init_script("""
                      window.__speechCalls = [];
                      window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
                      const voices = [
                        { voiceURI: 'maria', name: 'Microsoft Maria', lang: 'pt-BR', localService: true },
                        { voiceURI: 'daniel', name: 'Microsoft Daniel', lang: 'pt-BR', localService: true }
                      ];
                      Object.defineProperty(window, 'speechSynthesis', { value: {
                        getVoices: () => voices, addEventListener: () => {}, removeEventListener: () => {}, cancel: () => {},
                        speak: utterance => {
                          window.__speechCalls.push({ voice: utterance.voice?.voiceURI, pitch: utterance.pitch, rate: utterance.rate });
                          utterance.onstart?.(); setTimeout(() => utterance.onend?.(), 100);
                        }
                      }});
                      if (!localStorage.getItem('jarviz-preferences')) localStorage.setItem('jarviz-preferences', JSON.stringify({ provider: 'fish', enabled: true }));
                    """)
                    errors = []
                    page.on('pageerror', lambda error: errors.append(str(error)))
                    page.goto(f'http://127.0.0.1:{port}')
                    expect(page.locator('#settings-dialog')).to_be_visible()
                    page.get_by_role('button', name='Testar voz', exact=True).click()
                    expect(page.locator('#voice-test-message')).to_contain_text('em reprodução')
                    self.assertEqual(page.locator('#fish-key').count(), 0)
                    self.assertEqual(page.evaluate('window.__speechCalls[0].voice'), 'daniel')
                    self.assertLess(page.evaluate('window.__speechCalls[0].pitch'), 1)
                    page.get_by_label('Chave OpenRouter', exact=True).fill('test-only-not-a-real-key')
                    page.get_by_label('Pasta autorizada (caminho completo)').fill(str(root))
                    page.locator('#voice-enabled').uncheck()
                    page.get_by_role('button', name='Salvar', exact=True).click()
                    expect(page.locator('#settings-message')).to_contain_text('Salvo')
                    self.assertEqual(page.locator('#api-key').input_value(), '')
                    page.get_by_role('button', name='Testar IA', exact=True).click()
                    expect(page.locator('#ai-test-message')).to_contain_text('respondeu')
                    page.get_by_role('button', name='Fechar', exact=True).click()
                    page.get_by_label('Seu comando').fill('<img src=x onerror=alert(1)>')
                    page.get_by_role('button', name='Enviar comando').click()
                    expect(page.locator('#conversation')).to_contain_text('Olá. Esta resposta veio do provedor de teste.')
                    expect(page.locator('#latest-answer')).to_contain_text('Olá. Esta resposta veio do provedor de teste.')
                    self.assertEqual(page.locator('#conversation img').count(), 0)
                    expect(page.locator('body')).to_have_attribute('data-state', 'idle')
                    page.get_by_label('Seu comando').fill('Leia o arquivo')
                    page.get_by_role('button', name='Enviar comando').click()
                    expect(page.locator('#approval-panel')).to_be_visible()
                    expect(page.locator('#approval-details')).to_contain_text('notes.txt')
                    self.assertTrue(page.get_by_role('button', name='Enviar comando').is_disabled())
                    page.reload()
                    expect(page.locator('#approval-panel')).to_be_visible()
                    page.get_by_role('button', name='Aprovar e executar').click()
                    expect(page.locator('#conversation')).to_contain_text('Ação concluída no provedor de teste.')
                    expect(page.locator('#approval-panel')).not_to_be_visible()
                    page.get_by_role('button', name='Reduzir movimento', exact=True).click()
                    page.reload()
                    expect(page.locator('html')).to_have_attribute('data-reduced-motion', 'true')
                    page.get_by_label('Seu comando').fill('Leia o arquivo outra vez')
                    page.get_by_role('button', name='Enviar comando').click()
                    expect(page.locator('#approval-panel')).to_be_visible()
                    page.get_by_role('button', name='Recusar', exact=True).click()
                    expect(page.locator('#approval-panel')).not_to_be_visible()
                    page.get_by_role('button', name='Limpar conversa').click()
                    expect(page.locator('#conversation')).to_contain_text('Conversa apagada.')
                    page.evaluate('window.scrollTo(0,0)')
                    page.screenshot(path='/workspace/jarviz-functional-desktop.png', full_page=True)
                    page.set_viewport_size({'width': 390, 'height': 844})
                    self.assertTrue(page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
                    page.get_by_role('button', name='Configurações e voz').click()
                    expect(page.locator('#settings-dialog')).to_be_visible()
                    self.assertTrue(page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
                    page.get_by_label('Voz', exact=True).select_option('maria')
                    page.get_by_role('button', name='Testar voz', exact=True).click()
                    self.assertEqual(page.evaluate('window.__speechCalls.at(-1).voice'), 'maria')
                    page.get_by_role('button', name='Parar voz', exact=True).evaluate('(button) => button.click()')
                    page.get_by_role('button', name='Fechar', exact=True).click()
                    page.screenshot(path='/workspace/jarviz-functional-mobile.png', full_page=True)
                    self.assertEqual(errors, [])
                    browser.close()
            finally:
                process.terminate()
                try:
                    process.communicate(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.communicate()

if __name__ == '__main__':
    unittest.main()
