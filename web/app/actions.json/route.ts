import { ActionsJson, createActionHeaders } from "@solana/actions";

const headers = createActionHeaders();

const payload: ActionsJson = {
  rules: [{ pathPattern: "/blinks", apiPath: "/blinks" }],
};

export const GET = async () => Response.json(payload, { headers });

export const OPTIONS = async () => Response.json(null, { headers });
