/**
 * Cloudflare Pages Function - Endpoint de captura de leads
 * Rota automática: POST /api/contato
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // 1. Validar se o banco D1 está vinculado
    if (!env.DB) {
      return new Response(
        JSON.stringify({
          error: "Banco de dados não vinculado. Configure o D1 binding 'DB' no painel da Cloudflare."
        }),
        { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    // 2. Extrair dados da requisição (suporta JSON ou FormData)
    let body = {};
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      body = await request.json();
    } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      body = Object.fromEntries(formData);
    } else {
      return new Response(
        JSON.stringify({ error: "Formato de dados não suportado." }),
        { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    // 3. Honeypot anti-spam (se preenchido, rejeita silenciosamente como bot)
    if (body["bot-field"] && body["bot-field"].trim() !== "") {
      return new Response(
        JSON.stringify({ success: true, message: "Mensagem recebida com sucesso." }),
        { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    // 4. Validação básica de campos obrigatórios
    const nome = (body.nome || "").trim();
    const whatsapp = (body.whatsapp || "").trim();
    const empresa = (body.empresa || "").trim();
    const interesse = (body.interesse || "").trim();
    const mensagem = (body.mensagem || "").trim();

    if (!nome || !whatsapp) {
      return new Response(
        JSON.stringify({ error: "Nome e WhatsApp são obrigatórios." }),
        { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    // 5. Inserir lead no Cloudflare D1
    const query = `
      INSERT INTO leads (nome, whatsapp, empresa, interesse, mensagem)
      VALUES (?, ?, ?, ?, ?)
    `;

    await env.DB.prepare(query)
      .bind(nome, whatsapp, empresa, interesse, mensagem)
      .run();

    // 6. Resposta de sucesso
    return new Response(
      JSON.stringify({
        success: true,
        message: "Mensagem enviada com sucesso! Entraremos em contato em breve."
      }),
      { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Ocorreu um erro ao salvar o contato.",
        detalhes: err.message
      }),
      { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }
}

