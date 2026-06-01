export interface TamaModel {
  id: string
  name: string
  model?: string
  backend?: string
  context_length?: number
  limit?: {
    context: number
    output: number
  }
  modalities?: {
    input: string[]
    output: string[]
  }
  quant?: string
  gpu_layers?: number
  tool_call?: boolean
  reasoning?: boolean
  attachment?: boolean
  temperature?: boolean
}

export interface TamaModelsResponse {
  models: TamaModel[]
}

export interface TamaProviderConfig {
  npm?: string
  name?: string
  options?: {
    baseURL?: string
    apiKey?: string
  }
  models?: Record<string, any>
}

export interface DiscoveredModel {
  id: string
  key: string
  name: string
  config: Record<string, any>
}

export type LoadingStatus = 'not_loaded' | 'loading' | 'loaded' | 'error'