# Statespace MCP Agent

A chat CLI agent that connects to the Statespace MCP server using `mcp-use`.

## Setup

1. Install dependencies:

```bash
bun install
```

2. Create a `.env` file with your OpenAI API key:

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

3. Make sure your Statespace MCP server is running:

```bash
# From the workspace root
docker-compose up mcp-server
```

## Usage

Start the chat agent:

```bash
bun run start
```

## Example Interactions

- "What tools are available?"
- "Help me model a Tower of Hanoi system"
- "Define a state machine for a simple game"
- "Create a transition system for a vending machine"

Type `exit` to quit the chat.

## Features

- 🤖 Interactive chat with GPT-4
- 🔧 Real-time tool usage visualization
- 🎯 Integration with Statespace MCP server
- 📊 Streaming responses with step-by-step progress
- 👋 Graceful shutdown handling
