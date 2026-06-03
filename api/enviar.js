export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { dados, total, bloco1, bloco2, bloco3, bloco4, bloco5 } = req.body;
  if (!dados?.email || !dados?.nome) {
    return res.status(400).json({ error: 'Dados obrigatórios ausentes' });
  }

  const perfil = determinarPerfil(Number(total));
  const analiseHtml = gerarAnalise(req.body, perfil);
  const emailHtml = montarEmail(req.body, analiseHtml, perfil);

  const [emailResult, internoResult, sheetsResult] = await Promise.allSettled([
    enviarEmail(dados, perfil, emailHtml),
    enviarNotificacaoInterna(req.body, perfil),
    salvarNoSheets(req.body, perfil),
  ]);

  if (emailResult.status === 'rejected')
    console.error('[EMAIL PESSOA]', emailResult.reason?.message);
  if (internoResult.status === 'rejected')
    console.error('[EMAIL INTERNO]', internoResult.reason?.message);
  if (sheetsResult.status === 'rejected')
    console.error('[SHEETS]', sheetsResult.reason?.message);

  const emailEnviado = emailResult.status === 'fulfilled';

  registrarRD(req.body, perfil).catch(err => console.error('[RD]', err.message));

  return res.status(200).json({ ok: true, perfil, analiseHtml, emailEnviado });
}

// ── Perfil ───────────────────────────────────────────────────
function determinarPerfil(total) {
  if (total <= 13) return 'Comunicação como Execução';
  if (total <= 27) return 'Comunicação como Prestação de Contas';
  if (total <= 41) return 'Comunicação como Reputação';
  if (total <= 55) return 'Comunicação como Estratégia';
  return 'Comunicação como Governança';
}

// ── Análise estática por perfil ──────────────────────────────
function gerarAnalise(form, perfil) {
  const primeiroNome = form.dados.nome.split(' ')[0];
  const org = form.dados.organizacao;
  const total = Number(form.total);

  const blocos = [
    { nome: 'Comunicação e Governança',  score: Number(form.bloco1), max: 12 },
    { nome: 'Narrativa e Posicionamento', score: Number(form.bloco2), max: 12 },
    { nome: 'Transparência e Evidências', score: Number(form.bloco3), max: 16 },
    { nome: 'Impacto Social e DEI',       score: Number(form.bloco4), max: 8  },
    { nome: 'Públicos, Canais e Riscos',  score: Number(form.bloco5), max: 20 },
  ];
  const sorted = [...blocos].sort((a, b) => (a.score / a.max) - (b.score / b.max));
  const fraco = sorted[0].nome;
  const forte = sorted[sorted.length - 1].nome;

  const map = {
    'Comunicação como Execução':           analise1,
    'Comunicação como Prestação de Contas': analise2,
    'Comunicação como Reputação':           analise3,
    'Comunicação como Estratégia':          analise4,
    'Comunicação como Governança':          analise5,
  };
  return (map[perfil] || analise1)({ primeiroNome, org, total, fraco, forte });
}

const p   = (txt) => `<p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.75;">${txt}</p>`;
const h   = (txt) => `<h3 style="margin:28px 0 10px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#154F4F;">${txt}</h3>`;
const obs = () => `<p style="margin:28px 0 0;font-size:12px;color:#888;line-height:1.65;font-style:italic;border-top:1px solid #eee;padding-top:20px;">Este diagnóstico é uma leitura inicial, construída a partir de respostas objetivas. Ele não substitui uma análise aprofundada da comunicação da organização. A partir de uma conversa com a Alter, é possível qualificar essa leitura, observar materiais reais, entender o contexto institucional e desenhar caminhos mais precisos.</p>`;

function analise1({ primeiroNome, org }) {
  return [
    p(`Olá, <strong>${primeiroNome}</strong>. Este é o diagnóstico de comunicação de sustentabilidade da <strong>${org}</strong>.`),
    p(`A comunicação de sustentabilidade ainda parece estar em um estágio inicial ou muito operacional. Em geral, organizações nesse perfil tendem a comunicar ações de forma pontual, conforme demandas específicas, campanhas, eventos ou necessidades de divulgação.`),
    p(`A agenda de impacto pode até existir na prática, mas ainda não aparece organizada como narrativa. Isso faz com que boas iniciativas corram o risco de parecerem isoladas, pouco conectadas entre si ou restritas a entregas específicas.`),
    p(`Nesse estágio, a comunicação costuma atuar mais como uma etapa final do processo: algo que entra depois que o projeto já foi desenhado, aprovado ou executado. O desafio é fazer com que ela participe mais cedo das decisões, ajudando a definir públicos, linguagem, mensagens, riscos e oportunidades.`),
    h(`Oportunidades principais`),
    p(`Há um caminho importante para organizar a base da comunicação de impacto. Isso passa por identificar quais temas de sustentabilidade são realmente prioritários, que públicos precisam ser alcançados, quais mensagens precisam ser consolidadas e quais canais devem ser usados com mais critério.`),
    p(`Também pode haver oportunidade de traduzir melhor projetos e ações em uma narrativa mais ampla, capaz de explicar por que aquelas iniciativas importam, que impacto geram e como se conectam à estratégia da organização.`),
    h(`Caminhos possíveis com a Alter`),
    p(`A Alter pode apoiar a construção de uma narrativa-mãe de sustentabilidade, a definição de mensagens essenciais, o mapeamento de públicos prioritários e a criação de um plano básico de comunicação de impacto.`),
    p(`Também pode ajudar a transformar ações dispersas em uma comunicação mais clara, coerente e compreensível para diferentes públicos.`),
    obs(),
  ].join('');
}

function analise2({ primeiroNome, org }) {
  return [
    p(`Olá, <strong>${primeiroNome}</strong>. Este é o diagnóstico de comunicação de sustentabilidade da <strong>${org}</strong>.`),
    p(`A comunicação de sustentabilidade já apresenta alguma estrutura, mas ainda parece muito associada à lógica de prestação de contas, divulgação de entregas ou resposta a demandas institucionais. Nesse perfil, relatórios, dados, metas ou compromissos podem existir, mas nem sempre são usados como ativos vivos de reputação, relacionamento e posicionamento.`),
    p(`A organização pode estar comunicando o que faz, mas ainda com pouca força narrativa. Isso significa que há informação disponível, porém nem sempre traduzida em mensagens claras, acessíveis e relevantes para públicos diversos.`),
    p(`Esse perfil é comum em organizações que já avançaram na formalização da agenda ESG, climática ou de impacto, mas ainda não transformaram esse conteúdo em presença pública consistente ao longo do ano.`),
    h(`Oportunidades principais`),
    p(`O principal desafio é sair da comunicação concentrada em documentos, entregas ou momentos específicos e avançar para uma estratégia mais contínua. Relatórios, metas, compromissos e dados podem gerar conteúdos, pautas, apresentações, conversas com públicos estratégicos, artigos, entrevistas, campanhas e posicionamentos.`),
    p(`Também há oportunidade de tornar a linguagem menos técnica e mais conectada aos interesses de cada público. O que importa para uma liderança interna pode não ser o mesmo que importa para imprensa, comunidades, investidores, parceiros ou sociedade.`),
    h(`Caminhos possíveis com a Alter`),
    p(`A Alter pode apoiar o desdobramento de relatórios, dados e compromissos em narrativas, conteúdos editoriais, mensagens executivas, pautas para imprensa, peças institucionais e materiais para diferentes canais.`),
    p(`Também pode ajudar a criar uma régua de comunicação ao longo do ano, para que sustentabilidade deixe de aparecer apenas como entrega pontual e passe a sustentar reputação e relacionamento.`),
    obs(),
  ].join('');
}

function analise3({ primeiroNome, org }) {
  return [
    p(`Olá, <strong>${primeiroNome}</strong>. Este é o diagnóstico de comunicação de sustentabilidade da <strong>${org}</strong>.`),
    p(`A comunicação de sustentabilidade já contribui para fortalecer percepção pública, dar visibilidade a iniciativas relevantes e construir confiança. Nesse perfil, a organização costuma ter mensagens mais claras, algum nível de planejamento, canais ativos e preocupação com posicionamento.`),
    p(`Ainda assim, a comunicação pode estar em uma zona intermediária: mais madura do que uma simples divulgação operacional, mas ainda sem plena integração à governança, à tomada de decisão e à gestão de temas sensíveis.`),
    p(`Esse é um estágio importante, porque indica que a organização já percebe valor estratégico na comunicação. O próximo passo é aprofundar consistência, segmentação, evidências e presença qualificada nos espaços certos.`),
    h(`Oportunidades principais`),
    p(`O desafio passa a ser qualificar a narrativa e conectar melhor sustentabilidade a temas como clima, impacto social, diversidade, inovação, território, futuro, reputação e valor institucional.`),
    p(`Também pode haver espaço para fortalecer porta-vozes, organizar mensagens por públicos e criar conteúdos mais autorais. A comunicação pode deixar de apenas repercutir iniciativas e passar a ajudar a organização a ocupar conversas relevantes.`),
    p(`Nesse perfil, a linguagem ganha papel central. Não basta comunicar mais; é preciso comunicar melhor, com clareza, precisão, responsabilidade e densidade.`),
    h(`Caminhos possíveis com a Alter`),
    p(`A Alter pode apoiar a construção de territórios de fala, o refinamento da narrativa institucional, a preparação de porta-vozes, a definição de públicos prioritários e a criação de uma estratégia editorial mais robusta.`),
    p(`Também pode ajudar a transformar temas técnicos ou complexos em conteúdos mais acessíveis, sem perder rigor, profundidade ou credibilidade.`),
    obs(),
  ].join('');
}

function analise4({ primeiroNome, org }) {
  return [
    p(`Olá, <strong>${primeiroNome}</strong>. Este é o diagnóstico de comunicação de sustentabilidade da <strong>${org}</strong>.`),
    p(`A organização demonstra um nível relevante de maturidade. A comunicação de sustentabilidade já parece conectada à estratégia, à reputação e ao relacionamento com públicos importantes. Há sinais de narrativa estruturada, uso de canais, preocupação com dados, preparo institucional e maior integração entre áreas.`),
    p(`Nesse perfil, a comunicação não está restrita à execução. Ela já atua como elemento de posicionamento e pode influenciar a forma como a organização se apresenta, explica seus compromissos e constrói confiança.`),
    p(`Ainda assim, há caminhos para aprofundar a governança da comunicação. Isso significa criar fluxos mais claros, preparar melhor lideranças, lidar com temas sensíveis com mais consistência, monitorar percepção pública e transformar evidências em influência.`),
    h(`Oportunidades principais`),
    p(`O desafio não é apenas estruturar a comunicação, mas ampliar sua capacidade de gerar autoridade, presença pública e legitimidade. Organizações nesse estágio podem avançar na construção de conteúdos proprietários, agendas de influência, relacionamento com imprensa especializada, fóruns estratégicos e narrativas de futuro.`),
    p(`Também é importante olhar para coerência: a comunicação precisa sustentar uma relação equilibrada entre discurso, prática, dados, limites e desafios. Quanto mais uma organização se posiciona, mais precisa estar preparada para perguntas difíceis.`),
    h(`Caminhos possíveis com a Alter`),
    p(`A Alter pode apoiar a evolução da comunicação de impacto para uma lógica mais estratégica, com planejamento editorial, relacionamento qualificado com mídia e stakeholders, preparação de lideranças, gestão de temas sensíveis e produção de conteúdos de autoridade.`),
    p(`Também pode ajudar a transformar sustentabilidade em uma agenda permanente de reputação, e não apenas em um conjunto de entregas ou mensagens institucionais.`),
    obs(),
  ].join('');
}

function analise5({ primeiroNome, org }) {
  return [
    p(`Olá, <strong>${primeiroNome}</strong>. Este é o diagnóstico de comunicação de sustentabilidade da <strong>${org}</strong>.`),
    p(`A comunicação de sustentabilidade já aparece como parte da governança institucional. Organizações nesse perfil tendem a integrar comunicação, liderança, sustentabilidade, áreas técnicas e públicos estratégicos de forma mais consistente.`),
    p(`A agenda de impacto não é tratada apenas como divulgação, prestação de contas ou reputação. Ela passa a fazer parte da forma como a organização se posiciona, toma decisões, responde a riscos, presta contas, dialoga com a sociedade e constrói confiança.`),
    p(`Esse é o estágio mais avançado do diagnóstico, mas não significa que a comunicação esteja "resolvida". Significa que há uma base robusta para avançar em influência, autoridade pública, sofisticação narrativa e mensuração de resultados.`),
    h(`Oportunidades principais`),
    p(`O principal caminho está em ampliar a capacidade de liderar conversas complexas. Isso pode envolver clima, transição justa, biodiversidade, diversidade, cadeias de valor, territórios, direitos, inovação, desenvolvimento sustentável e futuro.`),
    p(`Nesse estágio, a comunicação pode se tornar uma plataforma de inteligência institucional: ajuda a ler contexto, antecipar riscos, orientar porta-vozes, qualificar debates e transformar conhecimento em presença pública relevante.`),
    p(`Também há oportunidade de medir melhor a contribuição da comunicação para confiança, reputação, relacionamento, engajamento e influência.`),
    h(`Caminhos possíveis com a Alter`),
    p(`A Alter pode apoiar a organização na construção de uma agenda de autoridade, na criação de produtos de conhecimento, na preparação de porta-vozes, na estratégia de relacionamento com imprensa e formadores de opinião, na facilitação de conversas complexas e na estruturação de métricas mais qualificadas de comunicação de impacto.`),
    p(`Também pode ajudar a transformar a maturidade já existente em protagonismo público, com mais clareza, consistência e capacidade de mobilização.`),
    obs(),
  ].join('');
}

// ── Enviar email via Resend ──────────────────────────────────
async function enviarEmail(dados, perfil, html) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: `Alter · Conteúdo Relevante <${process.env.EMAIL_REMETENTE}>`,
      to: [`${dados.nome} <${dados.email}>`],
      subject: `Seu diagnóstico Alter — ${perfil}`,
      html,
    }),
  });
  if (!response.ok) {
    throw new Error(`Resend: ${await response.text()}`);
  }
}

// ── Notificação interna para a Alter ────────────────────────
const PERGUNTAS = {
  q1:  'Como a comunicação de sustentabilidade é vista na organização',
  q2:  'Em que momento a comunicação entra nas iniciativas',
  q3:  'Quem define as mensagens de sustentabilidade',
  q4:  'Narrativa clara sobre sustentabilidade e impacto',
  q5:  'Clareza sobre o impacto que a organização gera',
  q6:  'Conexão com a estratégia de futuro',
  q7:  'Relatório de sustentabilidade',
  q8:  'Comunicação de metas e compromissos',
  q9:  'Tradução de dados para diferentes públicos',
  q10: 'Comunicação de limites e desafios',
  q11: 'Comunicação de diversidade, equidade e inclusão',
  q12: 'Temas sociais na agenda de sustentabilidade',
  q13: 'Adaptação da comunicação por público',
  q14: 'Públicos considerados (múltipla escolha)',
  q15: 'Canais utilizados (múltipla escolha)',
  q16: 'Gestão de temas sensíveis',
  q17: 'Porta-vozes preparados para falar sobre sustentabilidade',
  q18: 'Principais desafios apontados (múltipla escolha)',
  q19: 'Como comunicam hoje — texto livre',
};

async function enviarNotificacaoInterna(form, perfil) {
  const dados    = form.dados    || {};
  const respostas = form.respostas || {};
  const total    = form.total    || 0;
  const bloco1   = form.bloco1   || 0;
  const bloco2   = form.bloco2   || 0;
  const bloco3   = form.bloco3   || 0;
  const bloco4   = form.bloco4   || 0;
  const bloco5   = form.bloco5   || 0;

  const destino = process.env.INTERNAL_EMAIL || 'douglas@alterconteudo.com.br';
  const agora   = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  console.log('[INTERNO] Enviando notificação para', destino, '— respondente:', dados.email);

  function linha(label, valor) {
    const v = valor || '—';
    return '<tr>'
      + '<td style="padding:8px 12px;font-size:13px;font-weight:600;color:#444;background:#f9f9f9;width:38%;vertical-align:top;border-bottom:1px solid #eee;">' + label + '</td>'
      + '<td style="padding:8px 12px;font-size:13px;color:#222;background:#fff;vertical-align:top;border-bottom:1px solid #eee;">' + v + '</td>'
      + '</tr>';
  }

  const telefoneLink = dados.telefone
    ? '<a href="https://wa.me/55' + dados.telefone.replace(/\D/g, '') + '" style="color:#154F4F;">' + dados.telefone + '</a>'
    : '—';

  const dadosRows = [
    linha('Nome',              dados.nome),
    linha('Cargo',             dados.cargo),
    linha('Organização',       dados.organizacao),
    linha('E-mail',            '<a href="mailto:' + dados.email + '" style="color:#154F4F;">' + dados.email + '</a>'),
    linha('Telefone/WhatsApp', telefoneLink),
    linha('Consentimento',     dados.consentimento ? '✓ Autorizou contato' : 'Não autorizou'),
  ].join('');

  const blocos = [
    { label: 'Comunicação e Governança',  score: bloco1, max: 12 },
    { label: 'Narrativa e Posicionamento', score: bloco2, max: 12 },
    { label: 'Transparência e Evidências', score: bloco3, max: 16 },
    { label: 'Impacto Social e DEI',       score: bloco4, max: 8  },
    { label: 'Públicos, Canais e Riscos',  score: bloco5, max: 20 },
  ];

  const blocosRows = blocos.map(function(b) {
    const pct = Math.round((Number(b.score) / b.max) * 100);
    return '<tr>'
      + '<td style="padding:8px 12px;font-size:13px;font-weight:600;color:#444;background:#f9f9f9;width:38%;border-bottom:1px solid #eee;">' + b.label + '</td>'
      + '<td style="padding:8px 12px;font-size:13px;color:#154F4F;font-weight:700;background:#fff;border-bottom:1px solid #eee;">' + b.score + '/' + b.max + ' <span style="color:#999;font-weight:400;">(' + pct + '%)</span></td>'
      + '</tr>';
  }).join('');

  const respostasRows = Object.entries(PERGUNTAS).map(function(entry) {
    return linha(entry[1], respostas[entry[0]] || '—');
  }).join('');

  const html = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Novo Diagnostico</title></head>'
    + '<body style="margin:0;padding:0;background:#f4f4f2;font-family:Arial,sans-serif;">'
    + '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f2;">'
    + '<tr><td align="center" style="padding:32px 16px;">'
    + '<table width="640" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;width:100%;background:#fff;border-radius:4px;border:1px solid #e0e0e0;">'

    // Header
    + '<tr><td style="background:#154F4F;padding:24px 32px;">'
    + '<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>'
    + '<td><p style="margin:0;color:#fff;font-size:18px;font-weight:700;">Novo Diagnostico Express</p>'
    + '<p style="margin:4px 0 0;color:rgba(255,255,255,0.5);font-size:12px;">Recebido em ' + agora + '</p></td>'
    + '<td align="right"><div style="background:#FF6517;border-radius:3px;padding:6px 14px;display:inline-block;">'
    + '<p style="margin:0;color:#fff;font-size:11px;font-weight:700;">' + perfil + '</p>'
    + '<p style="margin:2px 0 0;color:#fff;font-size:20px;font-weight:700;">' + total + '/68</p>'
    + '</div></td>'
    + '</tr></table></td></tr>'

    // Dados
    + '<tr><td style="padding:24px 32px 8px;">'
    + '<p style="margin:0 0 12px;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#154F4F;">Dados do respondente</p>'
    + '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #eee;border-radius:4px;">'
    + dadosRows
    + '</table></td></tr>'

    // Pontuação por bloco
    + '<tr><td style="padding:24px 32px 8px;">'
    + '<p style="margin:0 0 12px;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#154F4F;">Pontuação por bloco</p>'
    + '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #eee;border-radius:4px;">'
    + blocosRows
    + '</table></td></tr>'

    // Respostas
    + '<tr><td style="padding:24px 32px 32px;">'
    + '<p style="margin:0 0 12px;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#154F4F;">Respostas completas</p>'
    + '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #eee;border-radius:4px;">'
    + respostasRows
    + '</table></td></tr>'

    // Footer
    + '<tr><td style="background:#f4f4f2;padding:16px 32px;border-top:1px solid #e0e0e0;">'
    + '<p style="margin:0;font-size:11px;color:#999;">Alter - Diagnostico Express - notificacao interna automatica</p>'
    + '</td></tr>'

    + '</table></td></tr></table></body></html>';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: `Alter Diagnóstico <${process.env.EMAIL_REMETENTE}>`,
      to: [destino],
      subject: `[Diagnóstico] ${dados.nome} · ${dados.organizacao} · ${perfil}`,
      html,
    }),
  });

  if (!response.ok) {
    throw new Error(`Notificação interna: ${await response.text()}`);
  }
}

// ── Registrar no RD Station ──────────────────────────────────
async function registrarRD(form, perfil) {
  if (!process.env.RD_TOKEN) return;
  const { dados, total, bloco1, bloco2, bloco3, bloco4, bloco5 } = form;
  await fetch('https://api.rd.services/platform/contacts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.RD_TOKEN}`,
    },
    body: JSON.stringify({
      contact: {
        name: dados.nome,
        email: dados.email,
        job_title: dados.cargo,
        company_name: dados.organizacao,
        mobile: dados.telefone || null,
        tags: ['diagnostico-express', 'sustentabilidade', perfil.toLowerCase().replace(/ /g, '-')],
        personal_custom_fields: {
          diagnostico_perfil: perfil,
          diagnostico_pontuacao: String(total),
          diagnostico_bloco1: String(bloco1),
          diagnostico_bloco2: String(bloco2),
          diagnostico_bloco3: String(bloco3),
          diagnostico_bloco4: String(bloco4),
          diagnostico_bloco5: String(bloco5),
        },
      },
    }),
  });
}

// ── Salvar no Google Sheets ──────────────────────────────────
async function salvarNoSheets(form, perfil) {
  if (!process.env.SHEETS_URL) return;
  console.log('[SHEETS] Salvando resposta na planilha...');
  const response = await fetch(process.env.SHEETS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...form, perfil }),
    redirect: 'follow',
  });
  if (!response.ok) {
    throw new Error('Sheets HTTP ' + response.status);
  }
  console.log('[SHEETS] Salvo com sucesso');
}

// ── HTML do email ────────────────────────────────────────────
function montarEmail(form, analiseHtml, perfil) {
  const { dados, total, bloco1, bloco2, bloco3, bloco4, bloco5 } = form;
  const ano = new Date().getFullYear();
  const orgEncoded = encodeURIComponent(dados.organizacao);
  // ← substitua pelo número real da Alter (com DDI 55)
  const waNumero = process.env.WHATSAPP_NUMERO || '5521971796860';
  const waMsg = encodeURIComponent('Oi, gostaria de falar com a equipe da Alter sobre o meu diagnóstico');

  const blocos = [
    { label: 'Comunicação e Governança',  score: bloco1, max: 12 },
    { label: 'Narrativa e Posicionamento', score: bloco2, max: 12 },
    { label: 'Transparência e Evidências', score: bloco3, max: 16 },
    { label: 'Impacto Social e DEI',       score: bloco4, max: 8  },
    { label: 'Públicos, Canais e Riscos',  score: bloco5, max: 20 },
  ];

  const barras = blocos.map(b => {
    const pct = Math.round((Number(b.score) / b.max) * 100);
    return `<tr><td style="padding:6px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="font-size:12px;color:#555;padding-bottom:4px;" colspan="2">${b.label}</td></tr>
        <tr>
          <td style="background:#e8f2f2;border-radius:2px;height:6px;">
            <div style="background:#154F4F;width:${pct}%;height:6px;border-radius:2px;"></div>
          </td>
          <td style="width:44px;text-align:right;padding-left:10px;font-size:12px;color:#154F4F;font-weight:600;white-space:nowrap;">${b.score}/${b.max}</td>
        </tr>
      </table>
    </td></tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Diagnóstico Express Alter</title></head>
<body style="margin:0;padding:0;background:#f4f4f2;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f2;">
<tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#fff;border-radius:4px;overflow:hidden;">
  <tr><td style="background:#154F4F;padding:32px 44px 28px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td><img src="https://diagnostico.alterconteudo.com.br/logo-alter.png" alt="Alter" width="120" style="display:block;height:auto;"></td>
      <td align="right"><p style="margin:0;color:rgba(255,255,255,0.35);font-size:10px;letter-spacing:0.1em;text-transform:uppercase;">Diagnóstico Express</p></td>
    </tr></table>
  </td></tr>
  <tr><td style="background:#154F4F;padding:0 44px 40px;">
    <table cellpadding="0" cellspacing="0" border="0" style="background:#FF6517;border-radius:3px;overflow:hidden;"><tr>
      <td style="padding:10px 20px;">
        <p style="margin:0;color:rgba(255,255,255,0.75);font-size:9px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">Seu perfil</p>
        <p style="margin:4px 0 0;color:#fff;font-size:17px;font-weight:600;">${perfil}</p>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:24px 44px 0;"><hr style="border:none;border-top:1px solid #eef2f2;margin:0;"></td></tr>
  <tr><td style="padding:28px 44px 36px;">${analiseHtml}</td></tr>
  <tr><td style="padding:0 44px 44px;">
    <table cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="background:#25D366;border-radius:3px;">
        <a href="https://wa.me/${waNumero}?text=${waMsg}"
           style="display:block;padding:13px 28px;color:#fff;text-decoration:none;font-size:14px;font-weight:500;">
          Falar agora com nosso time →
        </a>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="background:#0d0d0d;padding:28px 44px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td>
        <img src="https://diagnostico.alterconteudo.com.br/logo-alter.png" alt="Alter" width="80" style="display:block;height:auto;opacity:0.7;margin-bottom:12px;">
        <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.25);line-height:1.5;">Você recebeu esta análise por ter preenchido o Diagnóstico Express no site da Alter.</p>
      </td>
      <td align="right" valign="top"><p style="margin:0;font-size:11px;color:rgba(255,255,255,0.2);">© ${ano}</p></td>
    </tr></table>
  </td></tr>
</table></td></tr></table>
</body></html>`;
}
