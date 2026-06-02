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

  let emailEnviado = true;
  try {
    await enviarEmail(dados, perfil, emailHtml);
  } catch (err) {
    console.error('Erro email:', err);
    emailEnviado = false;
  }

  registrarRD(req.body, perfil).catch(() => {});

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

const p = (txt) => `<p style="margin:0 0 16px;font-size:15px;color:#444444;line-height:1.75;">${txt}</p>`;
const h = (txt) => `<h3 style="margin:28px 0 10px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#154F4F;">${txt}</h3>`;
const b = (txt) => `<strong style="color:#154F4F;">${txt}</strong>`;

function analise1({ primeiroNome, org, total, fraco, forte }) {
  return [
    p(`Olá, <strong>${primeiroNome}</strong>.`),
    p(`O diagnóstico da <strong>${org}</strong> revela algo que muitas organizações vivem, mas poucas assumem com clareza: a comunicação ainda não encontrou seu lugar estratégico. Isso não é um problema de competência — é uma questão de momento e de estrutura.`),
    h('Leitura do momento'),
    p(`Com <strong>${total} pontos de 68 possíveis</strong>, a ${org} está na fase de execução: a comunicação entra depois que as coisas acontecem, para registrar e divulgar. É um ponto de partida honesto — e reconhecer isso já é um diferencial importante.`),
    h('O que os números revelam'),
    p(`O bloco com maior oportunidade de desenvolvimento é <strong>${fraco}</strong>. Isso significa que a organização provavelmente tem muito mais impacto real do que consegue mostrar. O desafio não é o que se faz — é como se conta.`),
    h('Três oportunidades concretas'),
    p(`${b('1. Construir a narrativa central.')} Antes de qualquer canal ou campanha, a ${org} precisa de uma resposta clara: "qual impacto geramos e por quê isso importa?" Uma narrativa validada internamente transforma como tudo é comunicado.`),
    p(`${b('2. Incluir comunicação no início dos projetos.')} Quando a comunicação entra só no fim, perde a chance de moldar a percepção desde o começo. Mudar esse momento é o que separa organizações que apenas divulgam das que constroem reputação.`),
    p(`${b('3. Mapear os públicos prioritários.')} Com quem a ${org} precisa falar para avançar nos seus objetivos? Definir isso orienta onde investir energia e recursos.`),
    h('O que a Alter pode fazer'),
    p(`Trabalhamos com organizações exatamente neste estágio. Nosso ponto de entrada costuma ser a construção da narrativa estratégica de sustentabilidade — um processo de 4 a 6 semanas que entrega a base de tudo: mensagens, posicionamento e os primeiros conteúdos para ativar essa comunicação.`),
    p(`Se fizer sentido conversar sobre como isso se aplica à ${org}, estamos disponíveis.`),
  ].join('');
}

function analise2({ primeiroNome, org, total, fraco, forte }) {
  return [
    p(`Olá, <strong>${primeiroNome}</strong>.`),
    p(`A <strong>${org}</strong> já deu um passo importante: existe uma estrutura de comunicação de sustentabilidade funcionando. O diagnóstico mostra, porém, que essa comunicação ainda opera principalmente no modo reativo — respondendo a obrigações e demandas, mais do que construindo algo proativo.`),
    h('Leitura do momento'),
    p(`Com <strong>${total} pontos de 68</strong>, a organização está no estágio de prestação de contas: relatório publicado, informações disponíveis, mas ainda pouco ativadas. O que foi produzido cumpre um papel, mas poderia trabalhar muito mais — como ativo de reputação e ferramenta de posicionamento.`),
    h('O que os números revelam'),
    p(`O principal gap identificado está em <strong>${fraco}</strong>. A ${org} provavelmente tem dados e conteúdo de qualidade — o que falta é transformá-los em mensagens que realmente movem percepções e diferenciam a organização.`),
    h('Três oportunidades concretas'),
    p(`${b('1. Ativar o que já foi produzido.')} O relatório de sustentabilidade e os dados existentes são matéria-prima subutilizada. Um plano de conteúdo ancorado nesses materiais pode gerar meses de comunicação relevante sem precisar criar do zero.`),
    p(`${b('2. Conectar sustentabilidade à visão de futuro.')} Investidores, parceiros estratégicos e imprensa especializada querem entender não apenas o que foi feito, mas para onde a organização está indo. Essa conexão ainda está em desenvolvimento.`),
    p(`${b('3. Preparar porta-vozes.')} Com mensagens claras e repertório preparado, lideranças se tornam multiplicadores — e isso muda o alcance da comunicação de forma significativa.`),
    h('O que a Alter pode fazer'),
    p(`Nosso trabalho nesse estágio envolve a criação de um Guia de Narrativa de Sustentabilidade e um plano de conteúdo para os 12 meses seguintes — estruturando a comunicação para que ela deixe de ser esforço pontual e vire ativo permanente.`),
    p(`Se quiser entender como aplicar isso à realidade da ${org}, podemos marcar uma conversa.`),
  ].join('');
}

function analise3({ primeiroNome, org, total, fraco, forte }) {
  return [
    p(`Olá, <strong>${primeiroNome}</strong>.`),
    p(`A <strong>${org}</strong> está num momento interessante: a comunicação já saiu do modo reativo e começa a construir algo consistente. Com <strong>${total} pontos</strong>, o diagnóstico mostra uma organização que entende o valor da comunicação de sustentabilidade — e que está no limiar entre comunicar bem e comunicar com estratégia.`),
    h('Leitura do momento'),
    p(`O estágio de Reputação é onde mais organizações ficam estagnadas. Há esforço real, há conteúdo de qualidade, mas ainda falta integração: a comunicação ainda não está totalmente conectada à estratégia de negócio, e os diferentes públicos ainda recebem mensagens pouco diferenciadas.`),
    h('O que os números revelam'),
    p(`O ponto mais desenvolvido é <strong>${forte}</strong> — uma base sólida. O gap principal está em <strong>${fraco}</strong>, que é onde o próximo salto de maturidade vai acontecer.`),
    h('Três oportunidades concretas'),
    p(`${b('1. Elevar a comunicação para dentro da governança.')} O salto para o estágio Estratégia acontece quando a comunicação participa das decisões, não apenas da divulgação. Isso exige clareza sobre quais temas comunicar, com que frequência e com quais evidências.`),
    p(`${b('2. Trabalhar a diferenciação por público.')} Investidores precisam de uma conversa diferente da imprensa. A comunidade local precisa de uma conversa diferente dos colaboradores. Adaptar mensagens sem perder coerência é uma das capacidades mais valiosas — e ainda em desenvolvimento.`),
    p(`${b('3. Fortalecer a comunicação de temas sensíveis.')} Organizações neste estágio já estão expostas o suficiente para que a ausência de posicionamento seja notada. Ter mensagens preparadas e porta-vozes treinados é proteção e diferencial ao mesmo tempo.`),
    h('O que a Alter pode fazer'),
    p(`Para organizações neste estágio, nosso trabalho mais impactante envolve dois movimentos: mapear os gaps específicos de cada bloco e construir um Plano de Comunicação de Sustentabilidade integrado ao planejamento anual. O resultado é uma comunicação que para de ser esforço isolado e passa a ser parte do que move a organização.`),
    p(`Se fizer sentido aprofundar essa conversa, estamos à disposição.`),
  ].join('');
}

function analise4({ primeiroNome, org, total, fraco, forte }) {
  return [
    p(`Olá, <strong>${primeiroNome}</strong>.`),
    p(`O diagnóstico da <strong>${org}</strong> revela uma maturidade real. Com <strong>${total} pontos</strong>, a comunicação já opera de forma integrada à estratégia — não é um departamento à parte, mas parte de como a organização se posiciona e avança seus objetivos.`),
    h('Leitura do momento'),
    p(`No estágio Estratégia, a comunicação já passou por muitas transformações importantes: existe narrativa clara, há integração com lideranças, e os dados de sustentabilidade são usados ativamente. O desafio agora é de sofisticação — passar de uma comunicação estratégica para uma comunicação de governança.`),
    h('O que os números revelam'),
    p(`A área mais desenvolvida é <strong>${forte}</strong>, o que demonstra consistência e maturidade. O refinamento mais relevante está em <strong>${fraco}</strong> — provavelmente o caminho mais direto para o próximo nível.`),
    h('Três oportunidades concretas'),
    p(`${b('1. Assumir a liderança pública em temas específicos.')} A ${org} tem credencial para mais do que comunicar — tem credencial para liderar conversas. Escolher 1 ou 2 temas onde há real expertise e posicionar lideranças como referências pode mudar o patamar de influência.`),
    p(`${b('2. Trabalhar a comunicação de limites e desafios.')} A transparência sobre o que ainda não está resolvido é, paradoxalmente, o que mais constrói credibilidade com públicos sofisticados. Organizações no estágio de Governança comunicam avanços e desafios com o mesmo cuidado.`),
    p(`${b('3. Integrar comunicação ao processo de decisão.')} Quais decisões de negócio têm implicações de comunicação? Quem é consultado? Como se avalia o impacto reputacional antes de agir? Ter esse protocolo é o que define o estágio de Governança.`),
    h('O que a Alter pode fazer'),
    p(`Com organizações neste nível, trabalhamos com projetos de posicionamento público de liderança, frameworks de comunicação para temas sensíveis e materiais de alta complexidade — relatórios integrados, estratégias de influência com públicos-chave e comunicação em situações críticas.`),
    p(`Se quiser conversar sobre o que faz mais sentido para o próximo ciclo da ${org}, estamos disponíveis.`),
  ].join('');
}

function analise5({ primeiroNome, org, total, fraco, forte }) {
  return [
    p(`Olá, <strong>${primeiroNome}</strong>.`),
    p(`O diagnóstico da <strong>${org}</strong> confirma o que poucas organizações alcançam: a comunicação de sustentabilidade opera no nível de governança. Com <strong>${total} pontos de 68 possíveis</strong>, estamos falando de uma maturidade que coloca a ${org} num grupo muito seleto.`),
    h('Leitura do momento'),
    p(`No estágio de Governança, a comunicação não é mais uma função — é uma capacidade institucional. Ela participa das decisões, influencia públicos estratégicos e é tratada como ativo de longo prazo. O desafio neste patamar é de refinamento contínuo e posicionamento cada vez mais sofisticado.`),
    h('O que os números revelam'),
    p(`A consistência em todos os blocos é evidente. O ponto mais forte é <strong>${forte}</strong>. Se há margem de desenvolvimento, ela está em <strong>${fraco}</strong> — provavelmente em aspectos de fronteira como influência em políticas públicas ou antecipação de crises reputacionais.`),
    h('Três oportunidades concretas'),
    p(`${b('1. Liderar a construção de padrões do setor.')} A ${org} tem a posição e a credibilidade para influenciar como o setor como um todo se comunica. Associações, fóruns e iniciativas coletivas são espaços onde a organização pode exercer liderança real.`),
    p(`${b('2. Desenvolver comunicação de influência com poder público.')} Organizações no nível de Governança estão em posição de contribuir para políticas — e isso exige um conjunto diferente de ferramentas e abordagens de comunicação.`),
    p(`${b('3. Investir em inteligência reputacional.')} Monitorar não apenas menções, mas percepções reais de públicos-chave é o que permite antecipar movimentos e proteger o que foi construído ao longo de anos.`),
    h('O que a Alter pode fazer'),
    p(`Para organizações no estágio de Governança, trabalhamos com projetos de alto impacto: estratégias de influência, relatórios integrados de nível internacional, comunicação para tomadores de decisão e suporte em situações críticas.`),
    p(`Se há um projeto específico que exige esse nível de sofisticação, queremos conhecer. Estamos à disposição.`),
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

// ── HTML do email ────────────────────────────────────────────
function montarEmail(form, analiseHtml, perfil) {
  const { dados, total, bloco1, bloco2, bloco3, bloco4, bloco5 } = form;
  const ano = new Date().getFullYear();
  const orgEncoded = encodeURIComponent(dados.organizacao);
  // ← substitua pelo número real da Alter (com DDI 55)
  const waNumero = process.env.WHATSAPP_NUMERO || '55XXXXXXXXXXX';
  const waMsg = encodeURIComponent('Olá! Acabei de fazer o Diagnóstico Express da Alter e gostaria de conversar sobre um diagnóstico mais aprofundado.');

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
        <p style="margin:4px 0 0;color:#fff;font-size:17px;font-weight:600;">${perfil}</p>
      </td>
      <td style="padding:10px 20px;border-left:1px solid rgba(255,255,255,0.3);">
        <p style="margin:0;color:rgba(255,255,255,0.75);font-size:9px;letter-spacing:0.1em;text-transform:uppercase;">Pontuação total</p>
        <p style="margin:4px 0 0;color:#fff;font-size:24px;font-weight:700;line-height:1;">${total}<span style="font-size:13px;font-weight:400;opacity:0.6;">/68</span></p>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:32px 44px 8px;">
    <p style="margin:0 0 14px;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#154F4F;">Pontuação por bloco</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">${barras}</table>
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
        <p style="margin:0;color:#fff;font-size:13px;font-weight:600;">ALTER</p>
        <p style="margin:3px 0 10px;color:rgba(255,255,255,0.35);font-size:10px;">Conteúdo Relevante</p>
        <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.25);line-height:1.5;">Você recebeu esta análise por ter preenchido o Diagnóstico Express no site da Alter.</p>
      </td>
      <td align="right" valign="top"><p style="margin:0;font-size:11px;color:rgba(255,255,255,0.2);">© ${ano}</p></td>
    </tr></table>
  </td></tr>
</table></td></tr></table>
</body></html>`;
}
