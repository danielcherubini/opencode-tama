import type { KojiModel, KojiModelsResponse } from '../types'

const DEFAULT_KOJI_URL = "http://localhost:11434"
const KOJI_OPENCODE_MODELS_ENDPOINT = "/koji/v1/opencode/models"
const KOJI_V1_MODELS_ENDPOINT = "/v1/models"

export function normalizeBaseURL(baseURL: string = DEFAULT_KOJI_URL): string {
  let normalized = baseURL.replace(/\/+$/, '')
  if (normalized.endsWith('/v1')) {
    normalized = normalized.slice(0, -3)
  }
  return normalized
}

export function buildAPIURL(baseURL: string, endpoint: string = KOJI_OPENCODE_MODELS_ENDPOINT): string {
  const normalized = normalizeBaseURL(baseURL)
  return `${normalized}${endpoint}`
}

export async function checkKojiHealth(baseURL: string = DEFAULT_KOJI_URL): Promise<boolean> {
  try {
    const url = buildAPIURL(baseURL, KOJI_OPENCODE_MODELS_ENDPOINT)
    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    })
    return response.ok
  } catch {
    return false
  }
}

export async function discoverKojiModels(baseURL: string = DEFAULT_KOJI_URL): Promise<KojiModel[]> {
  try {
    const url = buildAPIURL(baseURL, KOJI_OPENCODE_MODELS_ENDPOINT)
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      console.warn(`[opencode-koji] Koji returned ${response.status}: ${response.statusText}`)
      return []
    }

    const data = (await response.json()) as { models: KojiModel[] }
    return data.models ?? []
  } catch (error) {
    console.warn(`[opencode-koji] Failed to discover models: ${error instanceof Error ? error.message : String(error)}`)
    return []
  }
}

export async function autoDetectKoji(): Promise<string | null> {
  const ports = [11434, 8080]
  for (const port of ports) {
    const baseURL = `http://127.0.0.1:${port}`
    const isHealthy = await checkKojiHealth(baseURL)
    if (isHealthy) {
      console.log(`[opencode-koji] Auto-detected koji at ${baseURL}`)
      return baseURL
    }
  }
  return null
}

export function formatModelName(model: KojiModel): string {
  if (model.name && model.name !== model.id) {
    return model.name
  }
  const parts = model.id.split('/')
  const modelName = parts[parts.length - 1] ?? model.id
  return modelName.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim()
}

export function parseModelCapabilities(model: KojiModel): Record<string, any> {
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