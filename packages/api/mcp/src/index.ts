import { FastMCP } from "fastmcp";
import { version } from "../package.json";
import { semVer } from "./libs";
import { generateStatespaceViaTRPCTool } from "./tools";

const server = new FastMCP({
  name: "Statespace",
  version: semVer.parse(version),
  health: {
    enabled: true,
    message: "ok",
    path: "/healthz",
    status: 200,
  },
});

// Register tools
server.addTool(generateStatespaceViaTRPCTool);

server.start({
  transportType: "httpStream",
  httpStream: {
    port: 8080,
    host: "0.0.0.0", // Bind to all interfaces for Docker
  },
});
