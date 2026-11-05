import os
import subprocess
import tempfile
import unittest
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]

class InterfaceTests(unittest.TestCase):
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
                    errors = []
                    page.on('pageerror', lambda error: errors.append(str(error)))
                    page.goto(f'http://127.0.0.1:{port}')
                    expect(page.locator('#settings-dialog')).to_be_visible()
                    page.get_by_label('Chave OpenRouter', exact=True).fill('test-only-not-a-real-key')
                    page.get_by_label('Pasta autorizada (caminho completo)').fill(str(root))
                    page.locator('#voice-enabled').uncheck()
                    page.get_by_role('button', name='Salvar', exact=True).click()
                    expect(page.locator('#settings-message')).to_contain_text('Salvo')
                    self.assertEqual(page.locator('#api-key').input_value(), '')
                    page.get_by_role('button', name='Fechar', exact=True).click()
                    page.get_by_label('Seu comando').fill('<img src=x onerror=alert(1)>')
                    page.get_by_role('button', name='Enviar comando').click()
                    expect(page.locator('#conversation')).to_contain_text('Olá. Esta resposta veio do provedor de teste.')
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
                    page.get_by_label('Serviço de voz').select_option('fish')
                    page.get_by_label('Chave Fish Audio (opcional)').fill('test-fish-key-not-real')
                    page.get_by_role('button', name='Salvar', exact=True).click()
                    expect(page.locator('#settings-message')).to_contain_text('Salvo')
                    self.assertEqual(page.locator('#fish-key').input_value(), '')
                    page.evaluate('''window.__played = false; window.__cspViolations = [];
                      document.addEventListener('securitypolicyviolation', e => window.__cspViolations.push(e.violatedDirective));
                      const original = window.Audio;
                      window.Audio = function(...args) { const audio = new original(...args); audio.addEventListener('playing', () => window.__played = true); return audio; };''')
                    page.get_by_role('button', name='Testar voz', exact=True).click()
                    page.wait_for_function('() => window.__played === true')
                    self.assertEqual(page.evaluate('window.__cspViolations'), [])
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
