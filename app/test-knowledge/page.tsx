"use client";

import { useState } from "react";

export default function TestKnowledgePage() {
  const [token, setToken] = useState("");
  const [problem, setProblem] = useState(
    "Next.js 15+ renvoie 403 Host not in allowlist sur les API routes en production"
  );
  const [context, setContext] = useState(
    "Next.js 16, Coolify, Traefik, domaine sslip.io"
  );
  const [solution, setSolution] = useState(
    "Ajouter experimental.serverActions.allowedOrigins avec le host de production dans next.config.ts, configurable via env ALLOWED_HOST"
  );
  const [tags, setTags] = useState("nextjs,coolify,403,deploy");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ status: number; body: unknown } | null>(null);

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/v1/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_token: token,
          problem,
          context: context.trim() || undefined,
          solution,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      });
      const body = await res.json();
      setResult({ status: res.status, body });
    } catch (err) {
      setResult({ status: 0, body: String(err) });
    } finally {
      setLoading(false);
    }
  }

  async function handleGet() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/v1/knowledge");
      const body = await res.json();
      setResult({ status: res.status, body });
    } catch (err) {
      setResult({ status: 0, body: String(err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "16px", fontFamily: "monospace" }}>
      <h1 style={{ fontSize: 18, marginBottom: 16 }}>Test — /api/v1/knowledge</h1>

      <form onSubmit={handlePost} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label style={{ fontSize: 13 }}>
          api_token
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Ton token bot"
            style={inputStyle}
          />
        </label>

        <label style={{ fontSize: 13 }}>
          problem *
          <textarea
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            rows={3}
            style={inputStyle}
          />
        </label>

        <label style={{ fontSize: 13 }}>
          context (optionnel)
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={2}
            style={inputStyle}
          />
        </label>

        <label style={{ fontSize: 13 }}>
          solution *
          <textarea
            value={solution}
            onChange={(e) => setSolution(e.target.value)}
            rows={4}
            style={inputStyle}
          />
        </label>

        <label style={{ fontSize: 13 }}>
          tags (séparés par virgules)
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="nextjs,coolify,docker"
            style={inputStyle}
          />
        </label>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="submit"
            disabled={loading}
            style={btnStyle("#6d28d9")}
          >
            {loading ? "…" : "POST Envoyer"}
          </button>
          <button
            type="button"
            onClick={handleGet}
            disabled={loading}
            style={btnStyle("#0369a1")}
          >
            {loading ? "…" : "GET Lire"}
          </button>
        </div>
      </form>

      {result && (
        <div style={{ marginTop: 20 }}>
          <div style={{
            display: "inline-block",
            padding: "2px 10px",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: "bold",
            marginBottom: 8,
            background: result.status >= 200 && result.status < 300 ? "#d1fae5" : "#fee2e2",
            color: result.status >= 200 && result.status < 300 ? "#065f46" : "#991b1b",
          }}>
            HTTP {result.status}
          </div>
          <pre style={{
            background: "#f1f5f9",
            padding: 12,
            borderRadius: 8,
            fontSize: 12,
            overflowX: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}>
            {JSON.stringify(result.body, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 4,
  padding: "8px 10px",
  fontSize: 13,
  border: "1px solid #cbd5e1",
  borderRadius: 6,
  boxSizing: "border-box",
  fontFamily: "monospace",
};

function btnStyle(bg: string): React.CSSProperties {
  return {
    flex: 1,
    padding: "10px 0",
    background: bg,
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: "bold",
    cursor: "pointer",
  };
}
