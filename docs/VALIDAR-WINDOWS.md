# Validação Windows do usuário

A execução de desenvolvimento foi Linux; não representa teste de som, permissões e programas no Windows.

1. Execute Iniciar-Jarviz.cmd com Node 24, preserve a configuração existente e confirme o endereço 127.0.0.1.
2. Testar IA: conferir modelo usado, cota e compatibilidade. Não copiar chaves para mensagens de diagnóstico.
3. Testar pesquisa: conferir fontes reais e datas, e abrir um link. Rede com proxy não é suportada pelo adaptador de páginas; não contornar política.
4. Testar voz: Português e Clássico, velocidade e parar. No Clássico, a voz britânica depende das vozes instaladas e não traduz o texto.
5. Se desejar Piper, instalar manualmente motor e modelo licenciado, configurar caminhos, testar geração/cache e parar; provocar caminho incorreto e conferir fallback.
6. Modo conversação: autorizar microfone, pergunta simples, pergunta com aprovação e retomada; interromper pelo botão e encerrar. Confirmar que a própria voz do Jarviz não é transcrita.
7. Capturar tela: cancelar seletor, escolher janela/aba, verificar prévia; sem consentimento não deve enviar. Usar modelo visual compatível e remover imagem depois.
8. Memória opt-in: guardar nota não sensível, conversar, reiniciar servidor, retomar conversa, esquecer nota, excluir histórico e desabilitar. Conferir retenção/limite.
9. Arquivos: usar pasta de teste com cópias; aprovar criação/busca/movimento e recusar exclusão. Conferir bloqueio de caminhos protegidos e fora da raiz.
10. Diagnóstico: consultar sistema/processos/rede; só habilitar PowerShell se necessário e ler cada comando antes de aprovar. Não iniciar como administrador.

Registrar resultados, versão do Windows/navegador, modelo escolhido e mensagens de erro, sem chaves, arquivos privados ou capturas sensíveis.
