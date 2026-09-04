import "server-only";

import twilio from "twilio";

// Lazy — la fel ca src/lib/stripe.ts: construit doar la prima folosire reală,
// ca lipsa variabilelor TWILIO_* (înainte de configurare) să nu blocheze
// build-ul sau orice rută care doar importă acest fișier.

export function getTwilioClient(): twilio.Twilio {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) throw new Error("TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN nu sunt configurate.");
  return twilio(accountSid, authToken);
}

// Access Token (JWT) pentru Twilio Voice SDK — folosit de browser ca să se
// înregistreze ca "Device" și să inițieze apeluri. `identity` leagă token-ul
// de un anumit utilizator (apare în log-urile Twilio), aici org+user, ca să
// nu se poată confunda apelurile a două organizații diferite.
export function genereazaTokenVoceTwilio(identity: string): string {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const apiKeySid = process.env.TWILIO_API_KEY_SID;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
  const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;
  if (!accountSid || !apiKeySid || !apiKeySecret || !twimlAppSid) {
    throw new Error("Variabilele TWILIO_ACCOUNT_SID/TWILIO_API_KEY_SID/TWILIO_API_KEY_SECRET/TWILIO_TWIML_APP_SID nu sunt configurate.");
  }

  const AccessToken = twilio.jwt.AccessToken;
  const VoiceGrant = AccessToken.VoiceGrant;

  const token = new AccessToken(accountSid, apiKeySid, apiKeySecret, { identity, ttl: 3600 });
  token.addGrant(new VoiceGrant({ outgoingApplicationSid: twimlAppSid, incomingAllow: false }));
  return token.toJwt();
}

