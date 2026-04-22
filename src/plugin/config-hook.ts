import type { PluginInput } from '@opencode-ai/plugin'
import { normalizeBaseURL, checkKojiHealth, discoverKojiModels, autoDetectKoji, formatModelName, parseModelCapabilities } from '../utils/koji-api'

const DEFAULT_KOJI_URL = "http://127.0.0.1:11434"

interface ToastNotifier {
  info(message: string): Promise<void>
  warning(message: string): Promise<void>
  error(message: string): Promise<void>
}

function createToastNotifier(client: PluginInput['client']): ToastNotifier {
  return {
    async info(_message: string) {
      // Stub - can be enhanced later with actual toasts
    },
    async warning(_message: string) {
    },
    async error(_message: string) {
    },
  }
}

export function createConfigHook(client: PluginInput['client']) {
  const toastNotifier = createToastNotifier(client)

  return async (config: any) => {
    if (!config || typeof config !== 'object') {
      return
    }

    let kojiProvider = config.provider?.koji
    let baseURL: string

    // Token priority: env var > provider.options.apiKey > undefined
    const token = process.env.KOJI_TOKEN || kojiProvider?.options?.apiKey || undefined

    if (kojiProvider?.options?.baseURL) {
      baseURL = normalizeBaseURL(kojiProvider.options.baseURL)
    } else if (process.env.KOJI_URL) {
      baseURL = normalizeBaseURL(process.env.KOJI_URL)
    } else {
      const detectedURL = await autoDetectKoji(token)
      if (!detectedURL) {
        console.log('[opencode-koji] Koji not detected on default ports (11434, 8080)')
        return
      }
      baseURL = detectedURL
    }

    if (!kojiProvider) {
      if (!config.provider) {
        config.provider = {}
      }

      config.provider.koji = {
        npm: "@ai-sdk/openai-compatible",
        name: "Koji (local)",
        options: {
          baseURL: `${baseURL}/v1`,
          ...(token ? { apiKey: token } : {}),
        },
        models: {},
      }
      kojiProvider = config.provider.koji
    } else if (token && !kojiProvider.options?.apiKey) {
      kojiProvider.options = { ...(kojiProvider.options ?? {}), apiKey: token }
    }

    const isHealthy = await checkKojiHealth(baseURL, token)
    if (!isHealthy) {
      console.warn(`[opencode-koji] Koji appears offline at ${baseURL}`)
      return
    }

    const models = await discoverKojiModels(baseURL, token)
    if (models.length === 0) {
      console.warn('[opencode-koji] No models discovered - ensure koji serve is running')
      return
    }

    const existingModels = kojiProvider.models || {}
    const discoveredModels: Record<string, any> = {}

    for (const model of models) {
      // model.id is already the API id (lowercased HF name), no sanitization needed
      const modelKey = model.id

      if (!existingModels[modelKey] && !existingModels[model.id]) {
        const modelConfig = parseModelCapabilities(model)
        modelConfig.name = model.name || modelKey

        discoveredModels[modelKey] = modelConfig
      }
    }

    if (Object.keys(discoveredModels).length > 0) {
      config.provider.koji.models = {
        ...existingModels,
        ...discoveredModels,
      }
      console.log(`[opencode-koji] Discovered ${Object.keys(discoveredModels).length} models`)
    }

    await toastNotifier.info(`Loaded ${models.length} models from koji`)
  }
}