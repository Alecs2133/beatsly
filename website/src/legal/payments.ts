import type { LegalDocSet } from './types';

export const PAYMENTS: LegalDocSet = {
  en: {
    title: 'Payments, Subscriptions & Refunds',
    intro:
      'This policy explains how paying for Beats.ly works: what you can buy, how subscriptions renew and how to cancel them, your right of withdrawal as a consumer and when you can get a refund. It forms part of our Terms of Service.',
    sections: [
      {
        id: 'what',
        heading: '1. What you can buy',
        body: [
          {
            list: [
              'Subscriptions — the Producer Pack (30 download credits per day) and the Ultimate Pack (downloads without credits, the AI Generator once available, and the option to apply for a publisher tag). Subscriptions are billed monthly.',
              'Credit packs — one-time purchases of a fixed number of download credits.',
            ],
          },
          'The free plan includes 3 download credits per day. Daily credits top your balance up to your plan’s daily amount; they do not add up from one day to the next. Purchased credits stay in your balance and do not expire while your account exists.',
        ],
      },
      {
        id: 'prices',
        heading: '2. Prices and payment',
        body: [
          'Prices are shown in US dollars (USD) on the Pricing page and, together with any applicable taxes, on the checkout page before you pay. Your bank may charge currency conversion fees.',
          'Payments are processed securely by Stripe. We do not see or store your card details. After a successful payment, you will receive a confirmation by email.',
        ],
      },
      {
        id: 'renewal',
        heading: '3. Renewal and cancellation',
        body: [
          'Subscriptions renew automatically every month, on the same day, until you cancel them. The renewal amount is charged to the payment method you used.',
          'You can cancel at any time from your profile, under "Manage subscription". Cancellation stops future renewals; you keep the benefits of your plan until the end of the period you have already paid for. After that, your account automatically returns to the free plan.',
          'If we change the price of a subscription, we will tell you at least 30 days before the change applies to you, and you can cancel before then.',
        ],
      },
      {
        id: 'withdrawal',
        heading: '4. Right of withdrawal (consumers in the EU)',
        body: [
          'As a consumer, you normally have 14 days to withdraw from an online contract without giving a reason (Government Emergency Ordinance no. 34/2014).',
          {
            list: [
              'Subscriptions: if you ask us to start the service immediately and then withdraw within 14 days of purchase, we will refund the price minus an amount proportional to the period in which you used the service.',
              'Credit packs: credits are digital content delivered immediately. At checkout, we ask for your express consent to receive them right away and your acknowledgement that, as a result, you lose the right of withdrawal once the credits are added to your account.',
            ],
          },
          'To withdraw, send us an unambiguous statement at {operator_email} within the 14 days (you can use the model withdrawal form from Annex 1 to Government Emergency Ordinance no. 34/2014, but you do not have to). We will refund you within 14 days, using the same payment method.',
        ],
      },
      {
        id: 'refunds',
        heading: '5. Other refunds',
        body: [
          'Apart from the right of withdrawal, we will refund you if you were charged by mistake (for example, twice for the same purchase) or if a paid feature you bought does not work because of a problem on our side that we cannot fix within a reasonable time. Write to us at {operator_email} with the date and amount of the payment.',
          'Credits that have already been used to download sounds cannot be refunded.',
        ],
      },
      {
        id: 'failed',
        heading: '6. Failed payments',
        body: [
          'If a renewal payment fails, Stripe may try again over the following days. If the payment still cannot be made, the subscription is cancelled and your account returns to the free plan. Credits you bought separately are not affected.',
        ],
      },
      {
        id: 'complaints',
        heading: '7. Questions and complaints',
        body: [
          'For any question or complaint about a payment, write to {operator_email}. We will reply within 30 days. You can also contact the National Authority for Consumer Protection (ANPC, https://anpc.ro) or use alternative dispute resolution (SAL, https://anpc.ro/ce-este-sal/).',
        ],
      },
    ],
  },

  ro: {
    title: 'Plăți, abonamente și rambursări',
    intro:
      'Această politică explică cum funcționează plățile pentru Beats.ly: ce poți cumpăra, cum se reînnoiesc abonamentele și cum le anulezi, dreptul tău de retragere ca și consumator și când poți primi banii înapoi. Face parte din Termenii și condițiile noastre.',
    sections: [
      {
        id: 'what',
        heading: '1. Ce poți cumpăra',
        body: [
          {
            list: [
              'Abonamente — Producer Pack (30 de credite de descărcare pe zi) și Ultimate Pack (descărcări fără credite, Generatorul AI după lansare și posibilitatea de a aplica pentru un tag de publisher). Abonamentele se facturează lunar.',
              'Pachete de credite — cumpărături unice ale unui număr fix de credite de descărcare.',
            ],
          },
          'Planul gratuit include 3 credite de descărcare pe zi. Creditele zilnice îți completează soldul până la cantitatea zilnică a planului tău; nu se adună de la o zi la alta. Creditele cumpărate rămân în sold și nu expiră cât timp contul tău există.',
        ],
      },
      {
        id: 'prices',
        heading: '2. Prețuri și plată',
        body: [
          'Prețurile sunt afișate în dolari americani (USD) pe pagina Prețuri și, împreună cu eventualele taxe aplicabile, pe pagina de plată, înainte să plătești. Banca ta poate percepe comisioane de conversie valutară.',
          'Plățile sunt procesate în siguranță de Stripe. Noi nu vedem și nu stocăm datele cardului tău. După o plată reușită vei primi o confirmare pe email.',
        ],
      },
      {
        id: 'renewal',
        heading: '3. Reînnoire și anulare',
        body: [
          'Abonamentele se reînnoiesc automat în fiecare lună, în aceeași zi, până când le anulezi. Suma reînnoirii este debitată de pe metoda de plată folosită.',
          'Poți anula oricând din profil, la „Gestionează abonamentul”. Anularea oprește reînnoirile viitoare; păstrezi beneficiile planului până la finalul perioadei deja plătite. După aceea, contul tău revine automat la planul gratuit.',
          'Dacă modificăm prețul unui abonament, te anunțăm cu cel puțin 30 de zile înainte ca modificarea să ți se aplice, iar tu poți anula înainte de această dată.',
        ],
      },
      {
        id: 'withdrawal',
        heading: '4. Dreptul de retragere (consumatori din UE)',
        body: [
          'Ca și consumator, ai în mod normal 14 zile pentru a te retrage dintr-un contract încheiat online, fără să dai vreo justificare (OUG nr. 34/2014).',
          {
            list: [
              'Abonamente: dacă ne ceri să începem furnizarea serviciului imediat și te retragi în 14 zile de la cumpărare, îți rambursăm prețul minus o sumă proporțională cu perioada în care ai folosit serviciul.',
              'Pachete de credite: creditele sunt conținut digital livrat imediat. La plată îți cerem acordul expres de a le primi imediat și confirmarea că, în consecință, îți pierzi dreptul de retragere odată ce creditele sunt adăugate în cont.',
            ],
          },
          'Pentru retragere, trimite-ne o declarație neechivocă la {operator_email} în termenul de 14 zile (poți folosi modelul de formular de retragere din Anexa 1 la OUG nr. 34/2014, dar nu este obligatoriu). Îți returnăm banii în cel mult 14 zile, prin aceeași metodă de plată.',
        ],
      },
      {
        id: 'refunds',
        heading: '5. Alte rambursări',
        body: [
          'Pe lângă dreptul de retragere, îți rambursăm banii dacă ai fost taxat din greșeală (de exemplu, de două ori pentru aceeași cumpărătură) sau dacă o funcționalitate plătită nu funcționează din cauza unei probleme de partea noastră pe care nu o putem remedia într-un timp rezonabil. Scrie-ne la {operator_email} cu data și suma plății.',
          'Creditele deja folosite pentru descărcarea sunetelor nu pot fi rambursate.',
        ],
      },
      {
        id: 'failed',
        heading: '6. Plăți eșuate',
        body: [
          'Dacă plata unei reînnoiri eșuează, Stripe poate încerca din nou în zilele următoare. Dacă plata tot nu poate fi efectuată, abonamentul este anulat, iar contul revine la planul gratuit. Creditele cumpărate separat nu sunt afectate.',
        ],
      },
      {
        id: 'complaints',
        heading: '7. Întrebări și reclamații',
        body: [
          'Pentru orice întrebare sau reclamație legată de o plată, scrie-ne la {operator_email}. Îți răspundem în cel mult 30 de zile. Te poți adresa și Autorității Naționale pentru Protecția Consumatorilor (ANPC, https://anpc.ro) sau poți folosi procedura de soluționare alternativă a litigiilor (SAL, https://anpc.ro/ce-este-sal/).',
        ],
      },
    ],
  },
};
