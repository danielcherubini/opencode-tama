# OpenCode Koji Plugin

Auto-discovers models from [Koji](https://github.com/danielcherubini/koji) local AI server and provides OpenCode with model configuration.

## Features

- **Auto-detection**: Finds koji running on default ports (11434, 8080)
- **Model Discovery**: Queries `/koji/v1/opencode/models` for rich model metadata
- **Configuration Enhancement**: Adds model metadata (context limits, name, etc.)
- **Graceful Fallback**: Works even if koji is offline

## Installation

Add to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-koji"]
}
```

Or install via npm:

```bash
npm install opencode-koji
```

## Usage

Simply install the plugin - it will auto-detect koji and discover models.

### Manual Configuration

If you want to use a custom koji instance:

```json
{
  "provider": {
    "koji": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Koji (local)",
      "options": {
        "baseURL": "http://localhost:11434/v1"
      }
    }
  }
}
```

The plugin will still enhance this with auto-discovered models, merging with any manually configured ones.

### Authentication

If your koji instance is gated behind a bearer token (e.g. a public endpoint fronted by a reverse proxy), set the token in one of two ways:

1. **`KOJI_TOKEN` environment variable** (highest priority):

   ```bash
   export KOJI_TOKEN=your-token-here
   ```

2. **`apiKey` in your `opencode.json`** provider options:

   ```json
   {
     "provider": {
       "koji": {
         "npm": "@ai-sdk/openai-compatible",
         "options": {
           "baseURL": "https://koji.example.com/v1",
           "apiKey": "your-token-here"
         }
       }
     }
   }
   ```

The token is sent as `Authorization: Bearer <token>` on both model discovery and inference requests. When unset, no auth header is sent (fine for localhost).

## How It Works

1. On opencode startup, the `config` hook is called
2. Plugin checks for existing `koji` provider or auto-detects on default ports
3. Queries `GET /koji/v1/opencode/models` from koji
4. Merges discovered models into opencode's configuration
5. Models appear in `/models` list automatically

## Requirements

- Koji running with `koji serve`
- OpenCode with plugin support

## License

MIT