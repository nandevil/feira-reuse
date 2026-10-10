// Supabase Edge Function "sync-feirante-sheet".
// Chamada pelo gatilho on_feirante_insert (ver SETUP.md): adiciona uma linha
// na planilha "Feirantes - Feira Reuse Araruama" a cada nova candidatura.
// Colunas: Data | Nome | WhatsApp | Produtos | Status | Origem
// Segredos usados: GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID.

function toPem(rawKey: string) {
  return rawKey.replace(/\\n/g, "\n");
}

function base64url(input: ArrayBuffer | string) {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let str = "";
  bytes.forEach((b) => (str += String.fromCharCode(b)));
  return btoa(str).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function getAccessToken(clientEmail: string, privateKeyPem: string) {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };
  const unsigned = base64url(JSON.stringify(header)) + "." + base64url(JSON.stringify(claim));

  const pemBody = privateKeyPem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const binaryDer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned)
  );
  const jwt = unsigned + "." + base64url(signature);

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });
  const data = await resp.json();
  if (!data.access_token) throw new Error("Falha ao obter token do Google: " + JSON.stringify(data));
  return data.access_token as string;
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const record = payload.record;
    if (!record) {
      return new Response(JSON.stringify({ error: "Sem 'record' no payload." }), { status: 400 });
    }

    const clientEmail = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL")!;
    const privateKey = toPem(Deno.env.get("GOOGLE_PRIVATE_KEY")!);
    const sheetId = Deno.env.get("GOOGLE_SHEET_ID")!;

    const accessToken = await getAccessToken(clientEmail, privateKey);

    const dataFormatada = new Date(record.created_at).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo"
    });
    const row = [
      dataFormatada,
      record.nome,
      record.whatsapp,
      record.produtos,
      record.status,
      record.origem ?? ""
    ];

    const range = "Feirantes!A:F";
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;
    const sheetResp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ values: [row] })
    });

    if (!sheetResp.ok) {
      const errText = await sheetResp.text();
      return new Response(JSON.stringify({ error: "Erro na API do Sheets: " + errText }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
