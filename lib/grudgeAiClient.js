/**
 * Grudge AI Hub client — use from any Grudge Studio app (browser or Node).
 *
 *   import { GrudgeAI } from './lib/grudgeAiClient.js';
 *   const ai = new GrudgeAI({ apiKey: process.env.GRUDGE_AI_KEY });
 *   const reply = await ai.chat({ message: 'Plan a quest for level 5 warriors' });
 *   const vision = await ai.vision({ text: 'Describe this logo', imageBase64: '...' });
 */

const DEFAULT_HUB = 'https://ai.grudge-studio.com';

export class GrudgeAI {
  constructor({ baseUrl = DEFAULT_HUB, apiKey = '' } = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
  }

  async _post(path, body) {
    const resp = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(data.error || data.details || `AI Hub ${resp.status}`);
    }
    return data;
  }

  /** General chat — OpenAI-style or Gemini-native body */
  async chat(body, role = 'general') {
    const path = role === 'general' ? '/v1/chat' : `/v1/agents/${role}/chat`;
    return this._post(path, body);
  }

  /** Single-turn convenience */
  async ask(message, opts = {}) {
    const data = await this.chat({ message, ...opts });
    return data.response;
  }

  /** Multi-turn with system instruction (Gemini-optimized) */
  async converse({ messages, systemInstruction, generationConfig, model, role = 'general' }) {
    return this.chat({ messages, systemInstruction, generationConfig, model }, role);
  }

  /** Vision / image analysis */
  async vision({ text, imageBase64, mimeType = 'image/png', model, role = 'general' }) {
    return this.chat({
      message: text,
      images: [{ data: imageBase64, mimeType }],
      model: model || 'google/gemini-3.5-flash',
    }, role);
  }

  async embed(texts) {
    const body = Array.isArray(texts) ? { texts } : { text: texts };
    return this._post('/v1/embed', body);
  }

  async agents() {
    const resp = await fetch(`${this.baseUrl}/v1/agents`);
    return resp.json();
  }

  async health() {
    const resp = await fetch(`${this.baseUrl}/health`);
    return resp.json();
  }
}

export default GrudgeAI;