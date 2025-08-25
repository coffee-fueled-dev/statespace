import { ChatOpenAI } from "@langchain/openai";
import { MCPAgent, MCPClient } from "mcp-use";
import { createInterface } from "readline";

async function main() {
  console.log("🚀 Initializing Statespace MCP Agent...");

  const config = {
    mcpServers: { statespace: { url: "http://localhost:8080/mcp" } },
  };

  // Create MCPClient from config
  const client = MCPClient.fromDict(config);

  const llm = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0.7,
  });

  // Create the agent
  const agent = new MCPAgent({
    llm,
    client,
    maxSteps: 10,
  });

  console.log("✅ Agent ready! You can now chat with the Statespace system.");
  console.log("💡 Try asking things like:");
  console.log("   - 'What tools are available?'");
  console.log("   - 'Help me model a Tower of Hanoi system'");
  console.log("   - 'Define a state machine for a simple game'");
  console.log("   - Type 'exit' to quit\n");

  // Set up readline interface for chat
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const askQuestion = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  };

  // Main chat loop
  while (true) {
    try {
      const userInput = await askQuestion("🤖 You: ");

      if (userInput.toLowerCase() === "exit") {
        console.log("👋 Goodbye!");
        break;
      }

      if (!userInput.trim()) {
        continue;
      }

      console.log("🤔 Agent is thinking...\n");

      // Stream the response to show real-time progress
      const stream = agent.stream(userInput);
      let finalResult = "";

      for await (const step of stream) {
        if (step.action) {
          console.log(`🔧 Using tool: ${step.action.tool}`);
          console.log(
            `📝 Input: ${JSON.stringify(step.action.toolInput, null, 2)}`
          );
        }
        if (step.observation) {
          console.log(`📊 Result: ${step.observation}`);
          console.log("---");
        }
      }

      // Get the final result
      finalResult = await agent.run(userInput);
      console.log(`\n🎯 **Agent**: ${finalResult}\n`);
    } catch (error) {
      console.error("❌ Error:", error);
      console.log("Please try again.\n");
    }
  }

  // Clean up
  rl.close();
  await client.closeAllSessions();
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n👋 Shutting down gracefully...");
  process.exit(0);
});

main().catch((error) => {
  console.error("💥 Fatal error:", error);
  process.exit(1);
});
