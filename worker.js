export default { async fetch(request, env) {
  const url = new URL(request.url); const path = url.pathname;
  const cors = { "Access-Control-Allow-Origin": "*" };
  if (path === "/debug") {
    return new Response(JSON.stringify({
      hasBinding: !!env.stocklist_db,
      bindingType: typeof env.stocklist_db,
      envKeys: Object.keys(env)
    }), { headers: { "Content-Type": "application/json", ...cors } });
  }
  return new Response("ok");
} };
