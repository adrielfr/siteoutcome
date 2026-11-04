import { onRequestPost } from './functions/api/contact.js';

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/contact') {
      if (request.method !== 'POST') {
        return json({ error: 'Método não permitido.' }, 405, { Allow: 'POST' });
      }
      return onRequestPost({ request, env });
    }

    if (url.pathname.startsWith('/api/')) {
      return json({ error: 'Endpoint não encontrado.' }, 404);
    }

    return env.ASSETS.fetch(request);
  },
};
