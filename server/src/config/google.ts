import { OAuth2Client } from "google-auth-library";

let client: OAuth2Client;

export function getGoogleClient(): OAuth2Client {
  if (!client) {
    client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }
  return client;
}
