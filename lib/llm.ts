type Provider = "deepseek" | "groq" | "openai";

interface ProviderConfig {
  url: string;
  model: string;
  apiKey: string;
}

function getConfig(provider: Provider): ProviderConfig {
  switch (provider) {
    case "groq":
      return {
        url: "https://api.groq.com/openai/v1/chat/completions",
        model: "llama-3.3-70b-versatile",
        apiKey: process.env.GROQ_API_KEY ?? "",
      };
    case "openai":
      return {
        url: "https://api.openai.com/v1/chat/completions",
        model: "gpt-4o-mini",
        apiKey: process.env.OPENAI_API_KEY ?? "",
      };
    default:
      return {
        url: "https://api.deepseek.com/chat/completions",
        model: "deepseek-chat",
        apiKey: process.env.DEEPSEEK_API_KEY ?? "",
      };
  }
}

export async function generateText(provider: string, prompt: string): Promise<string> {
  const cfg = getConfig((provider as Provider) ?? "deepseek");
  const res = await fetch(cfg.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: 150,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`LLM error (${provider}): ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

export const LLM_PROVIDERS = [
  { id: "deepseek", label: "DeepSeek", emoji: "🔵" },
  { id: "groq",     label: "Groq (Llama 3)", emoji: "⚡" },
  { id: "openai",   label: "GPT-4o Mini", emoji: "🟢" },
] as const;
