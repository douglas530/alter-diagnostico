# Briefing Técnico — Diagnóstico Express Alter
**Para:** Desenvolvedor WordPress  
**Projeto:** Landing page com formulário inteligente de diagnóstico de comunicação  
**Estimativa:** 2 a 4 horas

---

## O que é o projeto

Uma landing page standalone no WordPress com um formulário de 19 perguntas.  
Ao enviar, o sistema:
1. Calcula a pontuação automaticamente (já feito no JS do frontend)
2. Chama a API do Claude (Anthropic) para gerar uma análise personalizada
3. Envia um email HTML com a análise para o respondente via Resend
4. Registra o lead no RD Station Marketing (opcional)

O arquivo `index.html` contém **todo o frontend** pronto. Sua tarefa é:
- Hospedar esse HTML como página WordPress
- Criar o endpoint PHP que faz as chamadas de API com segurança

---

## Estrutura de arquivos entregues

```
alter-diagnostico/
├── public/
│   └── index.html     ← Frontend completo (não mexer)
├── api/
│   └── enviar.js      ← Referência da lógica de backend (adaptar para PHP)
└── README.md
```

---

## Tarefa 1 — Criar a página WordPress

### Opção A (recomendada): Page template em branco

Criar um arquivo `page-diagnostico.php` no tema filho:

```php
<?php
/*
 * Template Name: Diagnóstico Express
 * Template Post Type: page
 */
// Sem header, sem footer — página totalmente customizada
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Diagnóstico Express — Alter</title>
</head>
<body>
<?php
// Cola aqui o conteúdo do <body> do index.html
// (tudo entre <body> e </body>, sem as tags em si)
?>
</body>
</html>
```

Depois criar uma página no WordPress, selecionar o template "Diagnóstico Express" e publicar.

### Opção B: Plugin de HTML customizado

Instalar o plugin **"Raw HTML"** ou **"Insert PHP Code Snippet"** e colar o HTML numa página com esse shortcode. Mais simples, menos elegante.

---

## Tarefa 2 — Criar o endpoint PHP (o backend)

O formulário no frontend faz um `POST` para `/api/enviar` com JSON.  
No WordPress, isso vira uma rota REST customizada.

### Adicionar no `functions.php` do tema filho:

```php
<?php
// ── Registrar rota REST ──────────────────────────────────────
add_action('rest_api_init', function () {
    register_rest_route('alter/v1', '/enviar', [
        'methods'             => 'POST',
        'callback'            => 'alter_enviar_diagnostico',
        'permission_callback' => '__return_true',
    ]);
});

// ── Handler principal ────────────────────────────────────────
function alter_enviar_diagnostico(WP_REST_Request $request) {
    $form = $request->get_json_params();

    if (empty($form['dados']['email']) || empty($form['dados']['nome'])) {
        return new WP_Error('dados_invalidos', 'Dados obrigatórios ausentes', ['status' => 400]);
    }

    $dados      = $form['dados'];
    $respostas  = $form['respostas'];
    $total      = intval($form['total']);
    $bloco1     = intval($form['bloco1']);
    $bloco2     = intval($form['bloco2']);
    $bloco3     = intval($form['bloco3']);
    $bloco4     = intval($form['bloco4']);
    $bloco5     = intval($form['bloco5']);
    $perfil     = alter_determinar_perfil($total);

    // 1. Gerar análise com Claude
    $analise_html = alter_gerar_analise($form, $perfil);
    if (is_wp_error($analise_html)) {
        return $analise_html;
    }

    // 2. Montar e enviar email
    $email_html = alter_montar_email($form, $analise_html, $perfil);
    $enviado    = alter_enviar_email($dados, $perfil, $email_html);
    if (is_wp_error($enviado)) {
        return $enviado;
    }

    // 3. Registrar no RD Station (não bloqueia se falhar)
    alter_registrar_rd($form, $perfil);

    return rest_ensure_response(['ok' => true]);
}

// ── Determinar perfil ────────────────────────────────────────
function alter_determinar_perfil(int $total): string {
    if ($total <= 13) return 'Comunicação como Execução';
    if ($total <= 27) return 'Comunicação como Prestação de Contas';
    if ($total <= 41) return 'Comunicação como Reputação';
    if ($total <= 55) return 'Comunicação como Estratégia';
    return 'Comunicação como Governança';
}

// ── Chamar Claude API ────────────────────────────────────────
function alter_gerar_analise(array $form, string $perfil): string|WP_Error {
    $dados     = $form['dados'];
    $respostas = $form['respostas'];

    $prompt = "Você é consultor(a) sênior da Alter, agência especializada em comunicação de sustentabilidade e impacto.

Você acaba de receber as respostas do Diagnóstico Express de {$dados['nome']}, {$dados['cargo']} da organização {$dados['organizacao']}.

PONTUAÇÃO TOTAL: {$form['total']}/68 pontos
PERFIL IDENTIFICADO: {$perfil}

PONTUAÇÃO POR BLOCO:
- Bloco 1 — Comunicação como execução ou governança: {$form['bloco1']}/12 pts
- Bloco 2 — Narrativa, clareza e posicionamento: {$form['bloco2']}/12 pts
- Bloco 3 — Transparência, relatório, metas e evidências: {$form['bloco3']}/16 pts
- Bloco 4 — Impacto social, diversidade e coerência: {$form['bloco4']}/8 pts
- Bloco 5 — Públicos, canais, riscos e influência: {$form['bloco5']}/20 pts

RESPOSTAS PRINCIPAIS:
1. Como a comunicação é vista: {$respostas['q1']}
2. Quando entra no processo: {$respostas['q2']}
3. Quem define as mensagens: {$respostas['q3']}
4. Narrativa clara: {$respostas['q4']}
5. Clareza sobre impacto: {$respostas['q5']}
6. Conexão com futuro: {$respostas['q6']}
7. Relatório: {$respostas['q7']}
8. Metas e compromissos: {$respostas['q8']}
9. Dados para públicos: {$respostas['q9']}
10. Limites e desafios: {$respostas['q10']}
11. Diversidade e inclusão: {$respostas['q11']}
12. Temas sociais: {$respostas['q12']}
13. Adaptação por público: {$respostas['q13']}
14. Públicos considerados: {$respostas['q14']}
15. Canais utilizados: {$respostas['q15']}
16. Temas sensíveis: {$respostas['q16']}
17. Porta-vozes: {$respostas['q17']}
Principais desafios: {$respostas['q18']}
Como comunicam hoje: {$respostas['q19']}

TAREFA: Gere análise personalizada em HTML para email (sem DOCTYPE, html, head, body).
Seções: saudação, leitura do momento, perfil de maturidade, o que os números revelam,
três oportunidades concretas, o que a Alter pode fazer, fechamento.
Cores: #154F4F (verde) e #FF6517 (laranja). Tom: direto, caloroso, sofisticado. ~700 palavras.
Retorne APENAS o HTML.";

    $response = wp_remote_post('https://api.anthropic.com/v1/messages', [
        'timeout' => 60,
        'headers' => [
            'Content-Type'      => 'application/json',
            'x-api-key'         => ALTER_ANTHROPIC_KEY,
            'anthropic-version' => '2023-06-01',
        ],
        'body' => wp_json_encode([
            'model'      => 'claude-sonnet-4-20250514',
            'max_tokens' => 2000,
            'messages'   => [['role' => 'user', 'content' => $prompt]],
        ]),
    ]);

    if (is_wp_error($response)) {
        return new WP_Error('claude_error', 'Erro ao conectar com a IA', ['status' => 502]);
    }

    $body = json_decode(wp_remote_retrieve_body($response), true);
    $text = $body['content'][0]['text'] ?? null;

    if (!$text) {
        return new WP_Error('claude_vazio', 'IA não retornou conteúdo', ['status' => 502]);
    }

    return $text;
}

// ── Enviar email via Resend ──────────────────────────────────
function alter_enviar_email(array $dados, string $perfil, string $html): true|WP_Error {
    $response = wp_remote_post('https://api.resend.com/emails', [
        'timeout' => 30,
        'headers' => [
            'Content-Type'  => 'application/json',
            'Authorization' => 'Bearer ' . ALTER_RESEND_KEY,
        ],
        'body' => wp_json_encode([
            'from'    => 'Alter · Conteúdo Relevante <' . ALTER_EMAIL_REMETENTE . '>',
            'to'      => ["{$dados['nome']} <{$dados['email']}>"],
            'subject' => "Seu diagnóstico Alter — {$perfil}",
            'html'    => $html,
        ]),
    ]);

    if (is_wp_error($response) || wp_remote_retrieve_response_code($response) >= 400) {
        return new WP_Error('resend_error', 'Erro ao enviar email', ['status' => 502]);
    }

    return true;
}

// ── Registrar lead no RD Station ─────────────────────────────
function alter_registrar_rd(array $form, string $perfil): void {
    if (!defined('ALTER_RD_TOKEN') || !ALTER_RD_TOKEN) return;

    $dados = $form['dados'];

    wp_remote_post('https://api.rd.services/platform/contacts', [
        'timeout' => 15,
        'headers' => [
            'Content-Type'  => 'application/json',
            'Authorization' => 'Bearer ' . ALTER_RD_TOKEN,
        ],
        'body' => wp_json_encode([
            'contact' => [
                'name'         => $dados['nome'],
                'email'        => $dados['email'],
                'job_title'    => $dados['cargo'],
                'company_name' => $dados['organizacao'],
                'mobile'       => $dados['telefone'] ?? null,
                'tags'         => [
                    'diagnostico-express',
                    'sustentabilidade',
                    strtolower(str_replace(' ', '-', $perfil)),
                ],
                'personal_custom_fields' => [
                    'diagnostico_perfil'    => $perfil,
                    'diagnostico_pontuacao' => (string) $form['total'],
                    'diagnostico_bloco1'    => (string) $form['bloco1'],
                    'diagnostico_bloco2'    => (string) $form['bloco2'],
                    'diagnostico_bloco3'    => (string) $form['bloco3'],
                    'diagnostico_bloco4'    => (string) $form['bloco4'],
                    'diagnostico_bloco5'    => (string) $form['bloco5'],
                ],
            ],
        ]),
    ]);
}

// ── Montar HTML do email ─────────────────────────────────────
function alter_montar_email(array $form, string $analise_html, string $perfil): string {
    $dados  = $form['dados'];
    $total  = $form['total'];
    $ano    = date('Y');
    $org    = urlencode($dados['organizacao']);

    $blocos = [
        ['label' => 'Comunicação e Governança',  'score' => $form['bloco1'], 'max' => 12],
        ['label' => 'Narrativa e Posicionamento', 'score' => $form['bloco2'], 'max' => 12],
        ['label' => 'Transparência e Evidências', 'score' => $form['bloco3'], 'max' => 16],
        ['label' => 'Impacto Social e DEI',       'score' => $form['bloco4'], 'max' => 8],
        ['label' => 'Públicos, Canais e Riscos',  'score' => $form['bloco5'], 'max' => 20],
    ];

    $barras = '';
    foreach ($blocos as $b) {
        $pct     = round(($b['score'] / $b['max']) * 100);
        $barras .= "
        <tr><td style='padding:6px 0;'>
          <table width='100%' cellpadding='0' cellspacing='0' border='0'>
            <tr><td style='font-size:12px;color:#555;padding-bottom:4px;' colspan='2'>{$b['label']}</td></tr>
            <tr>
              <td style='background:#e8f2f2;border-radius:2px;height:6px;'>
                <div style='background:#154F4F;width:{$pct}%;height:6px;border-radius:2px;'></div>
              </td>
              <td style='width:44px;text-align:right;padding-left:10px;font-size:12px;color:#154F4F;font-weight:600;white-space:nowrap;'>{$b['score']}/{$b['max']}</td>
            </tr>
          </table>
        </td></tr>";
    }

    return <<<HTML
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Diagnóstico Express Alter</title></head>
<body style="margin:0;padding:0;background:#f4f4f2;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f2;">
<tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" border="0"
       style="max-width:600px;width:100%;background:#ffffff;border-radius:4px;overflow:hidden;">
  <tr><td style="background:#154F4F;padding:36px 44px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td><p style="margin:0;color:#fff;font-size:22px;font-weight:700;">ALTER</p>
          <p style="margin:3px 0 0;color:rgba(255,255,255,0.45);font-size:10px;letter-spacing:0.14em;text-transform:uppercase;">Conteúdo Relevante</p></td>
      <td align="right"><p style="margin:0;color:rgba(255,255,255,0.35);font-size:10px;letter-spacing:0.1em;text-transform:uppercase;">Diagnóstico Express</p></td>
    </tr></table>
  </td></tr>
  <tr><td style="background:#154F4F;padding:0 44px 40px;">
    <table cellpadding="0" cellspacing="0" border="0" style="background:#FF6517;border-radius:3px;overflow:hidden;"><tr>
      <td style="padding:10px 20px;">
        <p style="margin:0;color:rgba(255,255,255,0.75);font-size:9px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">Seu perfil</p>
        <p style="margin:4px 0 0;color:#fff;font-size:17px;font-weight:600;">$perfil</p>
      </td>
      <td style="padding:10px 20px;border-left:1px solid rgba(255,255,255,0.3);">
        <p style="margin:0;color:rgba(255,255,255,0.75);font-size:9px;letter-spacing:0.1em;text-transform:uppercase;">Pontuação total</p>
        <p style="margin:4px 0 0;color:#fff;font-size:24px;font-weight:700;line-height:1;">$total<span style="font-size:13px;font-weight:400;opacity:0.6;">/68</span></p>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:32px 44px 8px;">
    <p style="margin:0 0 14px;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#154F4F;">Pontuação por bloco</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">$barras</table>
  </td></tr>
  <tr><td style="padding:24px 44px 0;"><hr style="border:none;border-top:1px solid #eef2f2;margin:0;"></td></tr>
  <tr><td style="padding:28px 44px 36px;">$analise_html</td></tr>
  <tr><td style="padding:0 44px 44px;">
    <table cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="background:#154F4F;border-radius:3px;">
        <a href="mailto:contato@alter.com.br?subject=Diagnóstico+Express+$org"
           style="display:block;padding:13px 28px;color:#fff;text-decoration:none;font-size:14px;font-weight:500;">
          Conversar com a Alter →
        </a>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="background:#0d0d0d;padding:28px 44px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td>
        <p style="margin:0;color:#fff;font-size:13px;font-weight:600;">ALTER</p>
        <p style="margin:3px 0 10px;color:rgba(255,255,255,0.35);font-size:10px;">Conteúdo Relevante</p>
        <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.25);line-height:1.5;">Você recebeu esta análise por ter preenchido o Diagnóstico Express no site da Alter.</p>
      </td>
      <td align="right" valign="top"><p style="margin:0;font-size:11px;color:rgba(255,255,255,0.2);">© $ano</p></td>
    </tr></table>
  </td></tr>
</table></td></tr></table>
</body></html>
HTML;
}
```

---

## Tarefa 3 — Chaves de API no wp-config.php

Adicionar **antes** da linha `/* That's all, stop editing! */`:

```php
// Alter Diagnóstico Express — chaves de API
define('ALTER_ANTHROPIC_KEY', 'sk-ant-XXXXXXXXXXXXXXXX');   // console.anthropic.com
define('ALTER_RESEND_KEY',    're_XXXXXXXXXXXXXXXX');        // resend.com → API Keys
define('ALTER_EMAIL_REMETENTE', 'diagnostico@alter.com.br'); // domínio verificado no Resend
define('ALTER_RD_TOKEN',      '');                           // deixar vazio se não usar RD
```

---

## Tarefa 4 — Atualizar a URL do endpoint no HTML

No arquivo `public/index.html`, localizar a função `chamarBackend` e trocar a URL:

```js
// Antes:
const res = await fetch('/api/enviar', {

// Depois (URL do WordPress REST API):
const res = await fetch('/wp-json/alter/v1/enviar', {
```

---

## Tarefa 5 — CORS (se necessário)

Se o formulário estiver num subdomínio diferente do WordPress, adicionar no `functions.php`:

```php
add_action('rest_api_init', function () {
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
    add_filter('rest_pre_serve_request', function ($value) {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type');
        return $value;
    });
}, 15);
```

---

## Checklist de entrega

- [ ] Página criada com template em branco
- [ ] HTML do formulário no template
- [ ] Endpoint `/wp-json/alter/v1/enviar` respondendo
- [ ] Chaves no `wp-config.php`
- [ ] URL do endpoint atualizada no HTML
- [ ] Teste de envio completo (preencher o formulário e receber o email)
- [ ] Domínio verificado no Resend

---

## Contas a criar antes de começar

| Serviço | URL | Plano | Custo |
|---------|-----|-------|-------|
| Resend | resend.com | Gratuito | 3.000 emails/mês grátis |
| Anthropic | console.anthropic.com | Pay-as-you-go | ~$0,01 por diagnóstico |
| RD Station | (já tem conta) | Plano atual | — |

---

## Contato para dúvidas
contato@alter.com.br
