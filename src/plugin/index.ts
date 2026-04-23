import type { Plugin, PluginInput } from '@opencode-ai/plugin'
import { createConfigHook } from './config-hook'

export const TamaPlugin: Plugin = async (input: PluginInput) => {
  console.log('[opencode-tama] Tama plugin initializing')

  const { client } = input

  if (!client || typeof client !== 'object') {
    console.error('[opencode-tama] Invalid client provided to plugin')
    return {
      config: async () => {},
    }
  }

  return {
    config: createConfigHook(client),
  }
}