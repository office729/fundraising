// Link Calendly folosit pentru sesiunile de consiliere 1 la 1 / onboarding cu
// Vlad Plăcintă — același eveniment folosit deja pe salveazaoinima.ro
// (vezi /programeaza-intalnire-one-to-one/). `hide_event_type_details` e
// parametru oficial Calendly și reduce zgomotul vizual din embed.
//
// NU adăugăm `hide_gdpr_banner=1`: ar ascunde bannerul propriu de consimțământ
// al Calendly, deși embed-ul setează cookie-uri proprii (vezi Politica de
// cookies, secțiunea Cookie-uri terțe).
export const CALENDLY_CONSULTANTA_URL =
  "https://calendly.com/salveazaoinima/vlad-placinta-consultanta-fundraising?hide_event_type_details=1";
