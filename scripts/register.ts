import { REST, Routes } from "discord.js";
import type {
  APIApplication,
  RESTPutAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import * as join from "../src/commands/join";
import * as leave from "../src/commands/leave";

const rest = new REST();
rest.setToken(process.env.DISCORD_TOKEN!);
const application = await rest.get(Routes.currentApplication());
const applicationId = (application as APIApplication).id;
await rest.put(Routes.applicationCommands(applicationId), {
  body: [
    join.definition,
    leave.definition,
  ] satisfies RESTPutAPIApplicationCommandsJSONBody,
});
