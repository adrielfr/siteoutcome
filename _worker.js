/**
 * Cloudflare Pages Advanced Worker
 * 
 * 1. Processa requisições de backend (ex: POST /api/contato -> grava no D1)
 * 2. Serve todos os arquivos estáticos normalmente via env.ASSETS.fetch(request)
 */

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);

      // Rota da API de formulário de contato
      if (url.pathname === "/api/contato" && request.method === "POST") {
        try {
          if (!env.DB) {
            return new Response(
              JSON.stringify({
                error: "Banco de dados D1 não vinculado. Verifique a configuração do binding 'DB' no painel da Cloudflare."
              }),
              { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
            );
          }

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

          // Honeypot anti-spam
          if (body["bot-field"] && body["bot-field"].trim() !== "") {
            return new Response(
              JSON.stringify({ success: true, message: "Mensagem recebida com sucesso." }),
              { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } }
            );
          }

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

          const query = `
            INSERT INTO leads (nome, whatsapp, empresa, interesse, mensagem)
            VALUES (?, ?, ?, ?, ?)
          `;

          await env.DB.prepare(query)
            .bind(nome, whatsapp, empresa, interesse, mensagem)
            .run();

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

      // Serve os arquivos estáticos normalmente (HTML, CSS, imagens)
      if (env.ASSETS && typeof env.ASSETS.fetch === "function") {
        return await env.ASSETS.fetch(request);
      }

      return new Response("Serviço de arquivos estáticos temporariamente indisponível.", { status: 503 });
    } catch (err) {
      return new Response("Erro no Worker: " + err.message, { status: 500 });
    }
  },
};
