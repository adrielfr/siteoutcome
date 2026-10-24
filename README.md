# Outcome Tecnologia - Website

Landing page institucional e de captura de leads da **Outcome Tecnologia**, hospedada no **Cloudflare Pages** com backend serverless em **Pages Functions** e banco de dados **Cloudflare D1**.

---

## 🛠️ Configuração do Cloudflare Pages e Banco D1

### 1. Criar a Tabela no Banco D1 (`outcome-db`)

No painel da Cloudflare, acesse **Storage & databases** > **D1 SQL Database** > **outcome-db** > **Console** e execute:

```sql
CREATE TABLE IF NOT EXISTS leads (
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

### 2. Configuração do Projeto no Cloudflare Pages

No painel da Cloudflare:
1. Acesse **Workers & Pages** > selecione **siteoutcome**.
2. Vá em **Settings** > **Builds & deployments**:
   - **Framework preset**: `None`
   - **Build command**: (deixe **VAZIO / em branco**)
   - **Deploy command**: (deixe **VAZIO / em branco**)
   - **Build output directory**: `/` (ou deixe em branco)
3. Vá em **Settings** > **Bindings** (ou **Functions** > **D1 database bindings**):
   - **Variable name**: `DB`
   - **D1 database**: `outcome-db`

---

### 3. Estrutura do Backend (Pages Functions)

* **Frontend:** [`index.html`](./index.html) envia os dados via `POST` para `/api/contato`.
* **Backend:** [`functions/api/contato.js`](./functions/api/contato.js) processa os dados, valida campos, filtra bots via honeypot e grava no D1 (`env.DB`).
* **Configurações:** [`wrangler.toml`](./wrangler.toml) vincula o banco D1 ao projeto.

---

### 4. Consultar Leads no Painel da Cloudflare

No painel da Cloudflare, acesse **outcome-db** > **Console** e execute:

```sql
SELECT * FROM leads ORDER BY criado_em DESC;
```
