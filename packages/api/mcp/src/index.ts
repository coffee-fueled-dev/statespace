import { FastMCP } from "fastmcp";
import { registerDefineSystem } from "./tools";
import { version } from "../package.json";
import { semVer } from "./libs";

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

registerDefineSystem(server);

server.start({
  transportType: "httpStream",
  httpStream: {
    port: 8080,
    host: "0.0.0.0", // Bind to all interfaces for Docker
  },
});
