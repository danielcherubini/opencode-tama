import type { TamaModel, TamaModelsResponse } from '../types'

const DEFAULT_TAMA_URL = "http://localhost:11434"
const TAMA_OPENCODE_MODELS_ENDPOINT = "/tama/v1/opencode/models"
const TAMA_V1_MODELS_ENDPOINT = "/v1/models"

export function normalizeBaseURL(baseURL: string = DEFAULT_TAMA_URL): string {
  let normalized = baseURL.replace(/\/+$/, '')
  if (normalized.endsWith('/v1')) {
    normalized = normalized.slice(0, -3)
  }
  return normalized
}

export function buildAPIURL(baseURL: string, endpoint: string = TAMA_OPENCODE_MODELS_ENDPOINT): string {
  const normalized = normalizeBaseURL(baseURL)
  return `${normalized}${endpoint}`
}

export function buildAuthHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function checkTamaHealth(baseURL: string = DEFAULT_TAMA_URL, token?: string): Promise<boolean> {
  try {
    const url = buildAPIURL(baseURL, TAMA_OPENCODE_MODELS_ENDPOINT)
    const response = await fetch(url, {
      method: "GET",
      headers: buildAuthHeaders(token),
      signal: AbortSignal.timeout(3000),
    })
    return response.ok
  } catch {
    return false
  }
}

export async function discoverTamaModels(baseURL: string = DEFAULT_TAMA_URL, token?: string): Promise<TamaModel[]> {
  try {
    const url = buildAPIURL(baseURL, TAMA_OPENCODE_MODELS_ENDPOINT)
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...buildAuthHeaders(token),
      },
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        console.warn(`[opencode-tama] Tama rejected auth (${response.status}) — check TAMA_TOKEN`)
      } else {
        console.warn(`[opencode-tama] Tama returned ${response.status}: ${response.statusText}`)
      }
      return []
    }

    const data = (await response.json()) as { models: TamaModel[] }
    return data.models ?? []
  } catch (error) {
    console.warn(`[opencode-tama] Failed to discover models: ${error instanceof Error ? error.message : String(error)}`)
    return []
  }
}

export async function autoDetectTama(token?: string): Promise<string | null> {
  const ports = [11434, 8080]
  for (const port of ports) {
    const baseURL = `http://127.0.0.1:${port}`
    const isHealthy = await checkTamaHealth(baseURL, token)
    if (isHealthy) {
      console.log(`[opencode-tama] Auto-detected tama at ${baseURL}`)
      return baseURL
    }
  }
  return null
}

export function formatModelName(model: TamaModel): string {
  if (model.name && model.name !== model.id) {
    return model.name
  }
  const parts = model.id.split('/')
  const modelName = parts[parts.length - 1] ?? model.id
  return modelName.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim()
}

export function parseModelCapabilities(model: TamaModel): Record<string, any> {
  const config: Record<string, any> = {
    id: model.id,
  }

  if (model.limit) {
    config.limit = model.limit
  } else if (model.context_length) {
    config.limit = {
      context: model.context_length,
      output: model.context_length,
    }
  }

  if (model.modalities) {
    config.modalities = model.modalities
  }

  return config
}