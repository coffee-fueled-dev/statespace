import { FastMCP } from "fastmcp";
import { registerDefineSystem } from "./tools";

const server = new FastMCP({
  name: "My Server",
  version: "1.0.0",
});

registerDefineSystem(server);

server.start({
  transportType: "stdio",
});
