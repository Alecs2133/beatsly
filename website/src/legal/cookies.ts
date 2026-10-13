import type { LegalDocSet } from './types';

export const COOKIES: LegalDocSet = {
  en: {
    title: 'Cookie Policy',
    intro:
      'Beats.ly uses only the storage that is strictly necessary for the website and the app to work. We do not use advertising or analytics cookies and we do not track you across other websites. Because this storage is strictly necessary, the law does not require your consent for it, but we want you to know exactly what it is.',
    sections: [
      {
        id: 'what',
        heading: '1. What we store on your device',
        body: [
          'Instead of classic cookies, the website mostly uses your browser’s local storage, which works in a similar way:',
          {
            list: [
              'Sign-in session (sb-…-auth-token) — keeps you signed in. It is deleted when you sign out.',
              'Language (beatsly_lang) — remembers whether you chose English or Romanian.',
              'Cookie notice (beatsly_cookie_notice_seen) — remembers that you have closed the notice about this policy.',
              'App connection (beatsly_pending_app_code) — temporarily holds the code that connects the desktop app to your account after you sign in on the website. It is deleted once used.',
            ],
          },
          'The desktop app keeps similar information on your computer (your session, language and app preferences).',
        ],
      },
      {
        id: 'third-parties',
        heading: '2. Third-party services',
        body: [
          {
            list: [
              'hCaptcha — when the security check is shown at sign-in or sign-up, hCaptcha may place its own cookies to tell humans from bots. These are governed by the hCaptcha privacy policy.',
              'Stripe — when you pay, the payment page is hosted by Stripe, which uses its own cookies for security and fraud prevention. These are governed by the Stripe privacy policy.',
            ],
          },
        ],
      },
      {
        id: 'control',
        heading: '3. How to control storage',
        body: [
          'You can delete stored data at any time from your browser settings (usually under "Site data" or "Cookies and site data"). If you do, you will be signed out and the site will forget your language choice. Blocking this storage completely may prevent sign-in from working.',
        ],
      },
      {
        id: 'contact',
        heading: '4. Contact',
        body: [
          'For questions about this policy, write to {operator_email}. More details about how we process personal data are in our Privacy Policy.',
        ],
      },
    ],
  },

  ro: {
    title: 'Politica de cookie-uri',
    intro:
      'Beats.ly folosește doar stocarea strict necesară funcționării site-ului și a aplicației. Nu folosim cookie-uri de publicitate sau de analiză și nu te urmărim pe alte site-uri. Deoarece această stocare este strict necesară, legea nu cere consimțământul tău pentru ea, dar vrem să știi exact ce conține.',
    sections: [
      {
        id: 'what',
        heading: '1. Ce stocăm pe dispozitivul tău',
        body: [
          'În locul cookie-urilor clasice, site-ul folosește în principal stocarea locală a browserului (local storage), care funcționează asemănător:',
          {
            list: [
              'Sesiunea de autentificare (sb-…-auth-token) — te menține autentificat. Se șterge când te deconectezi.',
              'Limba (beatsly_lang) — ține minte dacă ai ales engleza sau româna.',
              'Notificarea despre cookie-uri (beatsly_cookie_notice_seen) — ține minte că ai închis notificarea despre această politică.',
              'Conectarea aplicației (beatsly_pending_app_code) — păstrează temporar codul care leagă aplicația desktop de contul tău după ce te autentifici pe site. Se șterge după folosire.',
            ],
          },
          'Aplicația desktop păstrează informații asemănătoare pe calculatorul tău (sesiunea, limba și preferințele aplicației).',
        ],
      },
      {
        id: 'third-parties',
        heading: '2. Servicii terțe',
        body: [
          {
            list: [
              'hCaptcha — când verificarea de securitate apare la autentificare sau la crearea contului, hCaptcha poate plasa propriile cookie-uri pentru a deosebi oamenii de boți. Acestea sunt guvernate de politica de confidențialitate hCaptcha.',
              'Stripe — când plătești, pagina de plată este găzduită de Stripe, care folosește propriile cookie-uri pentru securitate și prevenirea fraudei. Acestea sunt guvernate de politica de confidențialitate Stripe.',
            ],
          },
        ],
      },
      {
        id: 'control',
        heading: '3. Cum controlezi stocarea',
        body: [
          'Poți șterge oricând datele stocate din setările browserului (de obicei la „Date site” sau „Cookie-uri și date ale site-ului”). Dacă faci asta, vei fi deconectat, iar site-ul va uita limba aleasă. Blocarea completă a acestei stocări poate împiedica autentificarea.',
        ],
      },
      {
        id: 'contact',
        heading: '4. Contact',
        body: [
          'Pentru întrebări despre această politică, scrie-ne la {operator_email}. Mai multe detalii despre modul în care prelucrăm datele personale găsești în Politica de confidențialitate.',
        ],
      },
    ],
  },
};
