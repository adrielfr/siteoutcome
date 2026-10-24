# Outcome Tecnologia - Website

Landing page institucional e de captura de leads da **Outcome Tecnologia**, hospedada no **Cloudflare Pages** com backend serverless e banco de dados relacional **Cloudflare D1**.

---

## 🛠️ Configuração do Banco de Dados Cloudflare D1

Para liberar as opções de **Bindings** no painel da Cloudflare e permitir que o formulário grave os leads no banco `outcome-db`, siga as instruções abaixo:

### 1. Criar o Banco D1 e a Tabela de Leads

1. No painel da Cloudflare, acesse **Storage & databases** > **D1 SQL Database**.
2. Crie o banco com o nome `outcome-db`.
3. Abra a aba **Console** do banco e execute o seguinte comando SQL:

```sql
CREATE TABLE leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  empresa TEXT,
  interesse TEXT,
  mensagem TEXT,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

### 2. Configurar o `wrangler.toml`

O arquivo [`wrangler.toml`](./wrangler.toml) já foi criado na raiz do projeto com o seguinte conteúdo:

```toml
name = "siteoutcome"
pages_build_output_dir = "."
compatibility_date = "2026-10-19"

[[d1_databases]]
binding = "DB"
database_name = "outcome-db"
database_id = "8b59ed0c-52af-4bd2-8eb7-9230880fa2cc"
```

> ✅ **Configurado:** O `database_id` já está configurado com o ID real do seu banco `outcome-db` (`8b59ed0c-52af-4bd2-8eb7-9230880fa2cc`).

---

### 3. Ponto de Entrada do Worker (`_worker.js`)

O arquivo [`_worker.js`](./_worker.js) na raiz do projeto atua como o ponto de entrada avançado do Cloudflare Pages:
* **Desbloqueia as opções de Bindings** no painel da Cloudflare (eliminando o aviso *"Bindings cannot be added to a Worker that only has static assets"*).
* Processa requisições `POST /api/contato`, inserindo novos leads com segurança na tabela `leads` do D1.
* Serve todos os arquivos estáticos normalmente (HTML, imagens, CSS) através de `env.ASSETS.fetch(request)`.

---

### 4. Deploy pelo VS Code e GitHub

Para enviar as configurações e ativar o worker na Cloudflare:

```bash
git add wrangler.toml _worker.js index.html README.md
git commit -m "feat: adiciona configuracao do wrangler e worker para D1 bindings"
git push origin main
```

Após o deploy automático:
1. O aviso sobre "static assets" desaparecerá da tela de configurações no painel da Cloudflare.
2. O menu **Settings** > **Bindings** estará totalmente liberado.
3. Os formulários enviados no site serão registrados diretamente no banco `outcome-db`.

---

### 5. Como visualizar os leads recebidos

No painel da Cloudflare, acesse **Storage & databases** > **D1 SQL Database** > **outcome-db** > **Console** e execute:

```sql
SELECT * FROM leads ORDER BY criado_em DESC;
```
