# Site Outcome

Site estático servido pelo Worker `siteoutcome`. O formulário é gravado no banco D1 `outcome-db` por `/api/contact`, com os arquivos do site servidos pelo binding `ASSETS`.

## Configuração do formulário

O `wrangler.jsonc` define o Worker, o binding de assets e o binding D1 `OUTCOME_DB` para o banco `outcome-db` (`8b59ed0c-52af-4bd2-8eb7-9230880fa2cc`). O `.assetsignore` impede que arquivos de código, migrações e documentação sejam publicados como assets públicos.

Para aplicar a tabela no D1 remoto e publicar, com Wrangler instalado e autenticado na conta Cloudflare correta:

```sh
npx wrangler d1 migrations apply outcome-db --remote
npx wrangler deploy
```

As migrações são versionadas em `migrations/`. Os envios ficam na tabela `contact_submissions`; o endpoint valida o conteúdo e usa parâmetros SQL vinculados antes de inserir os dados. O arquivo `functions/api/contact.js` contém o handler compartilhado pelo Worker.

## Turnstile

O formulário usa um widget Turnstile gerenciado. O hostname `siteoutcome.adrielfr.workers.dev` deve estar autorizado nas configurações do widget; adicione também qualquer domínio personalizado utilizado.

Configure a chave secreta como secret do Worker — não a coloque no HTML, no `wrangler.jsonc` nem no Git:

```sh
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler deploy
```

O comando solicita a chave no terminal. O endpoint valida o token no serviço oficial do Turnstile, além de conferir o hostname e a ação `contact`, antes de gravar o formulário no D1.
