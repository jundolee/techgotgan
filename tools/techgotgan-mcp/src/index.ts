import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createTechgotganServer } from "./server";

serveStdio(createTechgotganServer);
