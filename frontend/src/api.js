const BASE_URL = "http://localhost:8000";

export async function assessAccount(payload) {
  const res = await fetch(`${BASE_URL}/v1/assess`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}
