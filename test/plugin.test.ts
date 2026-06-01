import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { normalizeBaseURL, buildAPIURL, formatModelName, parseModelCapabilities } from '../src/utils/tama-api'
import type { TamaModel } from '../src/types'

describe('tama-api utils', () => {
  describe('normalizeBaseURL', () => {
    it('removes trailing slashes', () => {
      expect(normalizeBaseURL('http://localhost:11434/')).toBe('http://localhost:11434')
    })

    it('removes /v1 suffix', () => {
      expect(normalizeBaseURL('http://localhost:11434/v1')).toBe('http://localhost:11434')
    })

    it('handles full URL with path', () => {
      expect(normalizeBaseURL('http://localhost:11434/v1/')).toBe('http://localhost:11434')
    })
  })

  describe('buildAPIURL', () => {
    it('appends /v1/opencode/models to base URL', () => {
      expect(buildAPIURL('http://localhost:11434')).toBe('http://localhost:11434/v1/opencode/models')
    })

    it('uses custom endpoint', () => {
      expect(buildAPIURL('http://localhost:11434', '/v1/chat/completions')).toBe('http://localhost:11434/v1/chat/completions')
    })
  })

  describe('formatModelName', () => {
    it('uses name field if provided', () => {
      const model: TamaModel = {
        id: 'mudler/gemma-4-26b-a4b-it',
        name: 'Gemma 4 26B',
        context_length: 262144,
      }
      expect(formatModelName(model)).toBe('Gemma 4 26B')
    })

    it('extracts model name from ID when name not provided', () => {
      const model: TamaModel = {
        id: 'bartowski/OmniCoder-8B-GGUF',
        context_length: 8192,
      }
      expect(formatModelName(model)).toBe('OmniCoder 8B GGUF')
    })

    it('handles simple model names', () => {
      const model: TamaModel = {
        id: 'llama3',
      }
      expect(formatModelName(model)).toBe('llama3')
    })

    it('replaces dashes and underscores with spaces', () => {
      const model: TamaModel = {
        id: 'qwen_qwen3-coder-30b',
      }
      expect(formatModelName(model)).toBe('qwen qwen3 coder 30b')
    })
  })

  describe('parseModelCapabilities', () => {
    it('extracts basic model config', () => {
      const model: TamaModel = {
        id: 'llama3',
      }
      const config = parseModelCapabilities(model)
      expect(config.id).toBe('llama3')
    })

    it('extracts context_length', () => {
      const model: TamaModel = {
        id: 'llama3',
        context_length: 8192,
      }
      const config = parseModelCapabilities(model)
      expect(config.limit).toEqual({ context: 8192, output: 8192 })
    })

    it('sets capability flags from model data', () => {
      const model: TamaModel = {
        id: 'test-model',
        tool_call: true,
        reasoning: true,
        attachment: true,
        temperature: true,
      }
      const config = parseModelCapabilities(model)
      expect(config.tool_call).toBe(true)
      expect(config.reasoning).toBe(true)
      expect(config.attachment).toBe(true)
      expect(config.temperature).toBe(true)
    })

    it('defaults capability flags when not provided', () => {
      const model: TamaModel = {
        id: 'test-model',
      }
      const config = parseModelCapabilities(model)
      expect(config.tool_call).toBe(true)
      expect(config.reasoning).toBe(false)
      expect(config.attachment).toBe(false)
      expect(config.temperature).toBe(true)
    })
  })
})

describe('config hook', () => {
  let savedTamaURL: string | undefined
  let savedTamaToken: string | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    // Isolate from the developer's shell env — these vars leak into tests otherwise
    savedTamaURL = process.env.TAMA_URL
    savedTamaToken = process.env.TAMA_TOKEN
    delete process.env.TAMA_URL
    delete process.env.TAMA_TOKEN
  })

  afterEach(() => {
    if (savedTamaURL !== undefined) process.env.TAMA_URL = savedTamaURL
    if (savedTamaToken !== undefined) process.env.TAMA_TOKEN = savedTamaToken
  })

  it('should detect tama on default port', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ models: [] }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const { createConfigHook } = await import('../src/plugin/config-hook')
    const hook = createConfigHook({} as any)

    const config: any = { provider: {} }
    await hook(config)

    expect(config.provider.tama).toBeDefined()
    expect(config.provider.tama.options.baseURL).toBe('http://127.0.0.1:11434/v1')
  })

  it('should use configured baseURL if provider exists', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ models: [] }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const { createConfigHook } = await import('../src/plugin/config-hook')
    const hook = createConfigHook({} as any)

    const config: any = {
      provider: {
        tama: {
          options: { baseURL: 'http://localhost:8080/v1' },
        },
      },
    }
    await hook(config)

    expect(config.provider.tama.options.baseURL).toBe('http://localhost:8080/v1')
  })

  it('should use TAMA_URL environment variable if configured', async () => {
    process.env.TAMA_URL = 'http://env-tama:1234'
    
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ models: [] }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const { createConfigHook } = await import('../src/plugin/config-hook')
    const hook = createConfigHook({} as any)

    const config: any = { provider: {} }
    await hook(config)

    expect(config.provider.tama.options.baseURL).toBe('http://env-tama:1234/v1')
    
    delete process.env.TAMA_URL
  })

  it('should send Authorization: Bearer when TAMA_TOKEN is set', async () => {
    process.env.TAMA_TOKEN = 'secret-token'

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ models: [] }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const { createConfigHook } = await import('../src/plugin/config-hook')
    const hook = createConfigHook({} as any)

    const config: any = { provider: {} }
    await hook(config)

    // Every fetch (auto-detect health + discover) should carry the bearer token
    for (const call of mockFetch.mock.calls) {
      const headers = call[1].headers as Record<string, string>
      expect(headers.Authorization).toBe('Bearer secret-token')
    }
    expect(config.provider.tama.options.apiKey).toBe('secret-token')

    delete process.env.TAMA_TOKEN
  })

  it('should use provider.options.apiKey when TAMA_TOKEN is unset', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ models: [] }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const { createConfigHook } = await import('../src/plugin/config-hook')
    const hook = createConfigHook({} as any)

    const config: any = {
      provider: {
        tama: {
          options: { baseURL: 'http://remote.example:11434/v1', apiKey: 'from-config' },
        },
      },
    }
    await hook(config)

    const [, init] = mockFetch.mock.calls[0]!
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer from-config')
  })

  it('should not send Authorization header when no token is available', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ models: [] }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const { createConfigHook } = await import('../src/plugin/config-hook')
    const hook = createConfigHook({} as any)

    const config: any = { provider: {} }
    await hook(config)

    for (const call of mockFetch.mock.calls) {
      const headers = (call[1]?.headers ?? {}) as Record<string, string>
      expect(headers.Authorization).toBeUndefined()
    }
  })

  it('should merge discovered models with existing', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          models: [
            { id: 'mudler/gemma-4-26b-a4b-it', name: 'Gemma 4 26B', context_length: 262144 },
            { id: 'mudler/Qwen3.5-35B-A3B-APEX-GGUF', name: 'Qwen3.5 35B', context_length: 262144 },
          ],
        }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const { createConfigHook } = await import('../src/plugin/config-hook')
    const hook = createConfigHook({} as any)

    const config: any = {
      provider: {
        tama: {
          options: { baseURL: 'http://localhost:11434/v1' },
          models: {
            'manual-model': { name: 'Manual Model' },
          },
        },
      },
    }
    await hook(config)

    // Add models one by one to debug
    // Regex [^a-zA-Z0-9_-] replaces / and . with _, so Qwen3.5-35B -> Qwen3_5-35B
    expect(config.provider.tama.models['manual-model']).toEqual({ name: 'Manual Model' })
    expect(config.provider.tama.models['mudler/gemma-4-26b-a4b-it']).toBeDefined()
    expect(config.provider.tama.models['mudler/Qwen3.5-35B-A3B-APEX-GGUF']).toBeDefined()
  })
})