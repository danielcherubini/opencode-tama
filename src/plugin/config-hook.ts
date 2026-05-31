import type { PluginInput } from '@opencode-ai/plugin'
import { normalizeBaseURL, checkTamaHealth, discoverTamaModels, autoDetectTama, formatModelName, parseModelCapabilities } from '../utils/tama-api'

const DEFAULT_TAMA_URL = "http://127.0.0.1:11434"

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

    let tamaProvider = config.provider?.tama
    let baseURL: string

    // Token priority: env var > provider.options.apiKey > undefined
    const token = process.env.TAMA_TOKEN || tamaProvider?.options?.apiKey || undefined

    if (tamaProvider?.options?.baseURL) {
      baseURL = normalizeBaseURL(tamaProvider.options.baseURL)
    } else if (process.env.TAMA_URL) {
      baseURL = normalizeBaseURL(process.env.TAMA_URL)
    } else {
      const detectedURL = await autoDetectTama(token)
      if (!detectedURL) {
        return
      }
      baseURL = detectedURL
    }

    if (!tamaProvider) {
      if (!config.provider) {
        config.provider = {}
      }

      config.provider.tama = {
        npm: "@ai-sdk/openai-compatible",
        name: "Tama (local)",
        options: {
          baseURL: `${baseURL}/v1`,
          ...(token ? { apiKey: token } : {}),
        },
        models: {},
      }
      tamaProvider = config.provider.tama
    } else if (token && !tamaProvider.options?.apiKey) {
      tamaProvider.options = { ...(tamaProvider.options ?? {}), apiKey: token }
    }

    const isHealthy = await checkTamaHealth(baseURL, token)
    if (!isHealthy) {
      console.warn(`[opencode-tama] Tama appears offline at ${baseURL}`)
      return
    }

    const models = await discoverTamaModels(baseURL, token)
    if (models.length === 0) {
      console.warn('[opencode-tama] No models discovered - ensure tama serve is running')
      return
    }

    const existingModels = tamaProvider.models || {}
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
      config.provider.tama.models = {
        ...existingModels,
        ...discoveredModels,
      }
    }

    await toastNotifier.info(`Loaded ${models.length} models from tama`)
  }
}