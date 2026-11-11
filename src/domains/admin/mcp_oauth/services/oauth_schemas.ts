import { z } from "zod";
import { OAUTH_ACCESS_VALUES } from "../types/oauth_types";

const param = z.string().max(2048).optional();

export const oauthDecisionSchema = z
  .object({
    authorization: z.object({
      response_type: param,
      client_id: param,
      redirect_uri: param,
      code_challenge: param,
      code_challenge_method: param,
      state: param,
      scope: param,
      resource: param,
    }),
    decision: z.enum(["approve", "deny"]),
    access: z.enum(OAUTH_ACCESS_VALUES),
  })
  .strict();
