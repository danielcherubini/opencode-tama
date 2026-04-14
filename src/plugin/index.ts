import type { Plugin, PluginInput } from '@opencode-ai/plugin'
import { createConfigHook } from './config-hook'

export const KojiPlugin: Plugin = async (input: PluginInput) => {
  console.log('[opencode-koji] Koji plugin initializing')

  const { client } = input

  if (!client || typeof client !== 'object') {
    console.error('[opencode-koji] Invalid client provided to plugin')
    return {
      config: async () => {},
    }
  }

  return {
    config: createConfigHook(client),
  }
}