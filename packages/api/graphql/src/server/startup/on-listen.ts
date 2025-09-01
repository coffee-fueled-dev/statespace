import os from "node:os";
import dns from "node:dns";
import https from "node:https";
import { type StateSpaceServerInstance } from "./get-yoga.js";
import { PORT } from "../environment.js";

export const onListen = async (yoga: StateSpaceServerInstance) => {
  console.info("Server is running.");

  const hostname = os.hostname();
  const graphqlEndpoint = yoga.graphqlEndpoint;

  console.info(`Hostname: ${hostname}`);
  console.info(`Local URL: localhost:${PORT}${graphqlEndpoint}`);

  dns.lookup(hostname, { family: 4 }, (err, address) => {
    if (!err) {
      console.info(`Network URL: ${address}:${PORT}${graphqlEndpoint}`);
    } else {
      console.warn("Could not resolve local network IP: %O", err);
      console.info("Network URL: Unavailable");
    }
  });

  https
    .get("https://api.ipify.org", (res) => {
      let ip = "";
      res.on("data", (chunk) => (ip += chunk));
      res.on("end", () => {
        console.info(`Public URL: ${ip}:${PORT}${graphqlEndpoint}`);
      });
    })
    .on("error", (err) => {
      console.warn("Could not resolve public IP: %O", err);
      console.info("Public URL: Unavailable");
    });
};
