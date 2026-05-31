# OpenCode Tama Plugin

Auto-discovers models from [Tama](https://github.com/danielcherubini/tama) local AI server and provides OpenCode with model configuration.

## Features

- **Auto-detection**: Finds tama running on default ports (11434, 8080)
- **Model Discovery**: Queries `/v1/opencode/models` for rich model metadata
- **Configuration Enhancement**: Adds model metadata (context limits, name, etc.)
- **Graceful Fallback**: Works even if tama is offline

## Installation

Add to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-tama"]
}
```

Or install via npm:

```bash
npm install opencode-tama
```

## Usage

Simply install the plugin - it will auto-detect tama and discover models.

### Manual Configuration

If you want to use a custom tama instance:

```json
{
  "provider": {
    "tama": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Tama (local)",
      "options": {
        "baseURL": "http://localhost:11434/v1"
      }
    }
  }
}
```

The plugin will still enhance this with auto-discovered models, merging with any manually configured ones.

### Authentication

If your tama instance is gated behind a bearer token (e.g. a public endpoint fronted by a reverse proxy), set the token in one of two ways:

1. **`TAMA_TOKEN` environment variable** (highest priority):

   ```bash
   export TAMA_TOKEN=your-token-here
   ```

2. **`apiKey` in your `opencode.json`** provider options:

   ```json
   {
     "provider": {
       "tama": {
         "npm": "@ai-sdk/openai-compatible",
         "options": {
           "baseURL": "https://tama.example.com/v1",
           "apiKey": "your-token-here"
         }
       }
     }
   }
   ```

The token is sent as `Authorization: Bearer <token>` on both model discovery and inference requests. When unset, no auth header is sent (fine for localhost).

## How It Works

1. On opencode startup, the `config` hook is called
2. Plugin checks for existing `tama` provider or auto-detects on default ports
3. Queries `GET /v1/opencode/models` from tama
4. Merges discovered models into opencode's configuration
5. Models appear in `/models` list automatically

## Requirements

- Tama running with `tama serve`
- OpenCode with plugin support

## License

MIT