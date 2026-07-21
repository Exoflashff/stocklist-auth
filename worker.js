export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (path === "/status" && request.method === "GET") {
      const row = await env.stocklist_db
        .prepare("SELECT is_active, access_code FROM activation WHERE id = 1")
        .first();

      if (!row) {
        return new Response(JSON.stringify({ active: false }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      return new Response(
        JSON.stringify({ active: row.is_active === 1 }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (path === "/verify" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const submitted = (body.code || "").trim();

      const row = await env.stocklist_db
        .prepare("SELECT access_code, is_active FROM activation WHERE id = 1")
        .first();

      const correct = row && submitted === row.access_code && row.is_active === 1;

      return new Response(JSON.stringify({ valid: !!correct }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (path === "/admin") {
      return new Response(ADMIN_HTML, {
        headers: { "Content-Type": "text/html; charset=UTF-8" },
      });
    }

    if (path === "/admin-action" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const ADMIN_PASSWORD = "5282";

      if (body.password !== ADMIN_PASSWORD) {
        return new Response(JSON.stringify({ ok: false, error: "Wrong password" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      if (body.action === "toggle") {
        await env.stocklist_db
          .prepare("UPDATE activation SET is_active = ?, updated_at = datetime('now') WHERE id = 1")
          .bind(body.value ? 1 : 0)
          .run();
      }

      if (body.action === "set_code" && body.newCode) {
        await env.stocklist_db
          .prepare("UPDATE activation SET access_code = ?, updated_at = datetime('now') WHERE id = 1")
          .bind(body.newCode)
          .run();
      }

      const row = await env.stocklist_db
        .prepare("SELECT is_active, access_code FROM activation WHERE id = 1")
        .first();

      return new Response(JSON.stringify({ ok: true, current: row }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response("Not found", { status: 404 });
  },
};

const ADMIN_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>StockList Admin</title>
<style>
  body{font-family:-apple-system,sans-serif;background:#0F1720;color:#EAF2F5;margin:0;padding:24px;}
  h1{font-size:20px;color:#17B896;}
  input{width:100%;padding:12px;margin:8px 0;border-radius:8px;border:1px solid #2A3A48;background:#182430;color:#fff;box-sizing:border-box;}
  button{width:100%;padding:14px;margin:8px 0;border-radius:8px;border:none;background:#17B896;color:#06231D;font-weight:bold;font-size:16px;}
  #status{margin-top:16px;padding:12px;border-radius:8px;background:#182430;font-size:14px;}
  .danger{background:#E4573D;color:#fff;}
</style>
</head>
<body>
  <h1>StockList — Admin Control</h1>
  <input id="pw" type="password" placeholder="Admin password">
  <button onclick="checkStatus()">Check Status</button>
  <button onclick="setActive(true)">Activate All Devices</button>
  <button class="danger" onclick="setActive(false)">Block All Devices</button>
  <input id="newcode" placeholder="New activation code">
  <button onclick="setCode()">Set New Code</button>
  <div id="status">Status: not checked yet</div>

<script>
async function call(action, extra) {
  const password = document.getElementById('pw').value;
  const res = await fetch('/admin-action', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ password, action, ...extra })
  });
  const data = await res.json();
  document.getElementById('status').textContent = JSON.stringify(data, null, 2);
}
function setActive(val){ call('toggle', { value: val }); }
function setCode(){ call('set_code', { newCode: document.getElementById('newcode').value }); }
function checkStatus(){ call('noop'); }
</script>
</body>
</html>`;
