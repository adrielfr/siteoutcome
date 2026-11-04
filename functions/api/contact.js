const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });

const MAX_BODY_SIZE = 8192;
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const ALLOWED_FIELDS = new Set([
  'bot-field',
  'nome',
  'whatsapp',
  'empresa',
  'interesse',
  'mensagem',
  'cf-turnstile-response',
]);
const ALLOWED_INTERESTS = new Set([
  'Ainda não sei, quero conversar',
  'Resposta Instantânea',
  'Fluxo de Vendas',
  'Visão Clara',
  'As três soluções',
  'Desenvolvimento de Sites',
  'Agentes de IA',
  'Leads',
  'CRM',
  'Automação de WhatsApp e chatbot',
  'Integrações',
]);

const field = (formData, name, maxLength) => {
  const value = formData.get(name);
  if (value === null) return '';
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length <= maxLength ? trimmed : null;
};

const readBody = async (request) => {
  const reader = request.body?.getReader();
  if (!reader) return { body: '' };

  const chunks = [];
  let byteLength = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      byteLength += value.byteLength;
      if (byteLength > MAX_BODY_SIZE) {
        await reader.cancel();
        return { tooLarge: true };
      }
      chunks.push(value);
    }
  } catch (error) {
    return { error };
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return { body: new TextDecoder('utf-8', { fatal: true }).decode(bytes) };
  } catch (error) {
    return { error };
  }
};

export async function onRequestPost({ request, env }) {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.split(';', 1)[0].trim().toLowerCase() !== 'application/x-www-form-urlencoded') {
    return json({ error: 'Formato de envio inválido.' }, 415);
  }

  const contentLength = request.headers.get('content-length');
  if (contentLength !== null) {
    if (!/^[0-9]+$/.test(contentLength)) {
      return json({ error: 'Tamanho do formulário inválido.' }, 400);
    }
    const size = Number(contentLength);
    if (!Number.isSafeInteger(size) || size < 0) {
      return json({ error: 'Tamanho do formulário inválido.' }, 400);
    }
    if (size > MAX_BODY_SIZE) {
      return json({ error: 'O formulário excede o tamanho permitido.' }, 413);
    }
  }

  const result = await readBody(request);
  if (result.error) {
    console.error('Não foi possível ler o formulário de contato.', result.error);
    return json({ error: 'Não foi possível ler os dados do formulário.' }, 400);
  }
  if (result.tooLarge) {
    return json({ error: 'O formulário excede o tamanho permitido.' }, 413);
  }

  const formData = new URLSearchParams(result.body);
  if ((formData.get('bot-field') || '').trim()) {
    return json({ success: true });
  }

  for (const key of formData.keys()) {
    if (!ALLOWED_FIELDS.has(key) || formData.getAll(key).length > 1) {
      return json({ error: 'O formulário contém campos inválidos.' }, 400);
    }
  }

  const name = field(formData, 'nome', 120);
  const whatsapp = field(formData, 'whatsapp', 40);
  const company = field(formData, 'empresa', 120);
  const interest = field(formData, 'interesse', 80);
  const message = field(formData, 'mensagem', 2000);
  const turnstileToken = field(formData, 'cf-turnstile-response', 2048);

  if ([name, whatsapp, company, interest, message, turnstileToken].includes(null)) {
    return json({ error: 'Revise os campos: algum valor excede o limite permitido.' }, 400);
  }
  if (!name || !whatsapp) {
    return json({ error: 'Nome e WhatsApp são obrigatórios.' }, 400);
  }
  if (!ALLOWED_INTERESTS.has(interest)) {
    return json({ error: 'Selecione uma opção válida de interesse.' }, 400);
  }

  if (!/^[0-9\s()+.-]+$/.test(whatsapp)) {
    return json({ error: 'Informe um WhatsApp válido com DDD.' }, 400);
  }
  const phoneDigits = whatsapp.replace(/[^0-9]/g, '');
  if (phoneDigits.length !== 10 && phoneDigits.length !== 11) {
    return json({ error: 'Informe um WhatsApp com DDD e 10 ou 11 dígitos.' }, 400);
  }
  const phonePrefixLength = phoneDigits.length === 11 ? 7 : 6;
  const normalizedWhatsapp = `(${phoneDigits.slice(0, 2)}) ${phoneDigits.slice(2, phonePrefixLength)}-${phoneDigits.slice(phonePrefixLength)}`;

  if (!turnstileToken) {
    return json({ error: 'Confirme a verificação de segurança antes de enviar.' }, 400);
  }
  if (!env.TURNSTILE_SECRET_KEY) {
    console.error('O secret TURNSTILE_SECRET_KEY não está configurado.');
    return json({ error: 'A verificação de segurança está temporariamente indisponível.' }, 503);
  }

  let verification;
  let verificationResponse;
  try {
    verificationResponse = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: env.TURNSTILE_SECRET_KEY,
        response: turnstileToken,
      }),
      signal: AbortSignal.timeout(5000),
    });
    verification = await verificationResponse.json();
  } catch (error) {
    console.error('Não foi possível verificar o token Turnstile.', error);
    return json({ error: 'Não foi possível validar a verificação de segurança. Tente novamente.' }, 503);
  }

  if (!verification || typeof verification !== 'object' || Array.isArray(verification)) {
    console.error('O serviço Turnstile retornou uma resposta inválida.');
    return json({ error: 'Não foi possível validar a verificação de segurança. Tente novamente.' }, 503);
  }
  if (!verificationResponse.ok) {
    const errorCodes = Array.isArray(verification['error-codes'])
      ? verification['error-codes'].filter((code) => typeof code === 'string')
      : [];
    console.error('O serviço de verificação Turnstile retornou um erro.', verificationResponse.status, errorCodes);
    return json({ error: 'Não foi possível validar a verificação de segurança. Tente novamente.' }, 503);
  }

  if (verification.success !== true) {
    console.warn('O Turnstile rejeitou o envio.', verification['error-codes'] || []);
    return json({ error: 'A verificação de segurança expirou ou não foi aprovada. Tente novamente.' }, 403);
  }
  if (
    verification.hostname !== new URL(request.url).hostname ||
    verification.action !== 'contact'
  ) {
    console.warn('A resposta Turnstile não corresponde ao domínio ou à ação esperada.');
    return json({ error: 'A verificação de segurança não corresponde a este formulário.' }, 403);
  }

  if (!env.OUTCOME_DB) {
    console.error('O binding D1 OUTCOME_DB não está configurado.');
    return json({ error: 'O formulário está temporariamente indisponível.' }, 503);
  }

  try {
    await env.OUTCOME_DB.prepare(
      `INSERT INTO contact_submissions (name, whatsapp, company, interest, message)
       VALUES (?, ?, ?, ?, ?)`,
    )
      .bind(name, normalizedWhatsapp, company || null, interest || null, message || null)
      .run();
  } catch (error) {
    console.error('Não foi possível salvar o formulário de contato no D1.', error);
    return json({ error: 'Não foi possível salvar sua mensagem. Tente novamente.' }, 500);
  }

  return json({ success: true });
}
