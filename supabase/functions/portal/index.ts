import { handleRequest } from "./email_notify.ts";
Deno.serve(handleRequest);
