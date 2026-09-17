import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

export function hasGemini() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export function hasOpenAI() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function hasAnyLlm() {
  return hasGemini() || hasOpenAI();
}

function geminiModelName() {
  return process.env.GEMINI_MODEL?.trim() || "gemini-1.5-flash";
}

function openAiModelName() {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

export function extractJsonObject(text: string): Record<string, unknown> {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("A IA não retornou JSON válido.");
  }
  return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
}

async function generateWithGemini(prompt: string, json: boolean) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY não configurado.");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: geminiModelName(),
    generationConfig: {
      temperature: json ? 0.2 : 0.5,
      ...(json ? { responseMimeType: "application/json" } : {}),
    },
  });
  const result = await model.generateContent(prompt);
  const text = result.response.text()?.trim();
  if (!text) throw new Error("Gemini retornou resposta vazia.");
  return text;
}

async function generateWithOpenAI(prompt: string, json: boolean) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY não configurado.");

  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: openAiModelName(),
    temperature: json ? 0.2 : 0.5,
    ...(json ? { response_format: { type: "json_object" as const } } : {}),
    messages: [
      {
        role: "system",
        content: json
          ? "Você responde apenas JSON válido, sem markdown."
          : "Você escreve respostas curtas em português brasileiro.",
      },
      { role: "user", content: prompt },
    ],
  });

  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenAI retornou resposta vazia.");
  return text;
}

export async function generateText(prompt: string, json: boolean) {
  const errors: string[] = [];

  if (hasGemini()) {
    try {
      return await generateWithGemini(prompt, json);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Gemini falhou");
    }
  }

  if (hasOpenAI()) {
    try {
      return await generateWithOpenAI(prompt, json);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "OpenAI falhou");
    }
  }

  if (errors.length) {
    throw new Error(errors.join(" | "));
  }
  throw new Error("Nenhuma chave de IA configurada.");
}
