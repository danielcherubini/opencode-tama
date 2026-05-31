import type { Plugin, PluginInput } from '@opencode-ai/plugin'
import { createConfigHook } from './config-hook'

export const TamaPlugin: Plugin = async (input: PluginInput) => {
  const { client } = input

  if (!client || typeof client !== 'object') {
    return {
      config: async () => {},
    }
  }

  return {
    config: createConfigHook(client),
  }
}