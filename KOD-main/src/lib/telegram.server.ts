export async function telegramCall(method: string, body: object) {
  const key = process.env["TELEGRAM_API_KEY"];
  if (!key) throw new Error("Telegram is not connected.");

  const response = await fetch(`https://api.telegram.org/bot${key}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Telegram [${response.status}]: ${error}`);
    throw new Error(`Telegram [${response.status}]: ${error}`);
  }

  const json = (await response.json()) as {
    ok: boolean;
    result?: { username?: string };
    description?: string;
  };

  if (!json.ok) {
    throw new Error(json.description ?? "Telegram request failed.");
  }

  return json.result;
}

export async function hashText(text: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function randomCode() {
  return Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
}

export async function webhookSecret(key: string) {
  const bytes = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`telegram-webhook:${key}`))
  );
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function sameSecret(a: string, b: string) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < b.length; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
