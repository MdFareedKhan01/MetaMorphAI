import Groq from 'groq-sdk';

import { env } from './env';

export type Provider = 'cloud' | 'local';

export type LLMRequest = {
  system: string;
  user: string;
  jsonSchema?: Record<string, unknown>;
  classification: 'public' | 'internal' | 'restricted';
};

export type LLMResponse = {
  text: string;
  provider: Provider;
  model: string;
  latency_ms: number;
};

export interface LLMAdapter {
  generate(request: LLMRequest): Promise<LLMResponse>;
}

export class TransportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransportError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class EgressBlocked extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EgressBlocked';
  }
}

/* --------------------------------------------------
 * Groq
 * -------------------------------------------------- */

export class GroqAdapter implements LLMAdapter {
  private client: Groq;

  constructor() {
    this.client = new Groq({
      apiKey: env.GROQ_API_KEY,
    });
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const started = Date.now();

    try {
      const response = await this.client.chat.completions.create({
        model: env.CLOUD_MODEL,
        messages: [
          {
            role: 'system',
            content: request.system,
          },
          {
            role: 'user',
            content: request.user,
          },
        ],
        temperature: 0,
        max_completion_tokens: 8192,
        response_format: request.jsonSchema
          ? {
              type: 'json_schema',
              json_schema: {
                name: 'structured_output',
                strict: true,
                schema: request.jsonSchema,
              },
            }
          : {
              type: 'json_object',
            },
      });

      const text = response.choices[0]?.message?.content;

      if (!text) {
        throw new TransportError(
          'Groq returned an empty response'
        );
      }

      return {
        text,
        provider: 'cloud',
        model: response.model ?? env.CLOUD_MODEL,
        latency_ms: Date.now() - started,
      };
    } catch (error: any) {
      if (
        error?.status === 429 ||
        error?.code === 'rate_limit_exceeded'
      ) {
        throw new RateLimitError(
          error?.message ?? 'Groq rate limit exceeded'
        );
      }

      if (error instanceof TransportError) {
        throw error;
      }
      console.error('Groq request failed:', {
        status: error?.status,
        code: error?.code,
        type: error?.type,
        message: error?.message,
        error: error?.error,
      });
      throw new TransportError(
        error?.message ?? 'Groq request failed'
      );
    }
  }
}

/* --------------------------------------------------
 * Ollama
 * -------------------------------------------------- */

export class OllamaAdapter implements LLMAdapter {
  async generate(request: LLMRequest): Promise<LLMResponse> {
    const started = Date.now();

    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, env.LOCAL_TIMEOUT_MS);

    try {
      const response = await fetch(
        `${env.OLLAMA_URL}/api/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: env.LOCAL_MODEL,
            messages: [
              {
                role: 'system',
                content: request.system,
              },
              {
                role: 'user',
                content: request.user,
              },
            ],
            stream: false,
            options: {
              num_ctx: env.LOCAL_NUM_CTX,
              temperature: 0,
            },
            format: request.jsonSchema ?? 'json',
          }),
        }
      );

      if (!response.ok) {
        throw new TransportError(
          `Ollama returned HTTP ${response.status}`
        );
      }

      const data = await response.json();

      const text = data?.message?.content;

      if (!text) {
        throw new TransportError(
          'Ollama returned an empty response'
        );
      }

      return {
        text,
        provider: 'local',
        model: data?.model ?? env.LOCAL_MODEL,
        latency_ms: Date.now() - started,
      };
    } catch (error: any) {
      if (error instanceof TransportError) {
        throw error;
      }

      if (error?.name === 'AbortError') {
        throw new TransportError(
          `Ollama request timed out after ${env.LOCAL_TIMEOUT_MS}ms`
        );
      }

      throw new TransportError(
        error?.message ?? 'Ollama request failed'
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const cloud = new GroqAdapter();
export const local = new OllamaAdapter();