import type { LegalDocSet } from './types';

export const TERMS: LegalDocSet = {
  en: {
    title: 'Terms of Service',
    intro:
      'These Terms govern your use of the Beats.ly desktop application and the website {site} (together, the "Service"). By creating an account or using the Service, you agree to these Terms. If you do not agree, please do not use the Service.',
    sections: [
      {
        id: 'operator',
        heading: '1. Who we are',
        body: [
          'The Service is operated by {operator_name}, registered under no. {operator_registration}, tax ID {operator_tax_id}, with its registered office at {operator_address} ("Beats.ly", "we", "us").',
          'You can contact us at {operator_email}.',
        ],
      },
      {
        id: 'service',
        heading: '2. The Service',
        body: [
          'Beats.ly is a sample library manager for music producers. Depending on your plan, it lets you:',
          {
            list: [
              'organize and analyze audio files stored on your own computer (BPM and key detection runs locally, on your device);',
              'browse, preview and download sounds published by other users in the community library;',
              'save sounds, create collections and follow producers;',
              'publish your own sounds, if your account has been approved as a publisher;',
              'use additional features that we may launch over time (such as the AI Generator), which we will describe when they become available.',
            ],
          },
          'We may change, improve or discontinue features. If we remove a paid feature you have already paid for, we will offer a fair solution, such as a proportional refund.',
        ],
      },
      {
        id: 'account',
        heading: '3. Your account',
        body: [
          'You must be at least 16 years old to create an account. If you are under 18, you need the consent of a parent or legal guardian to make purchases.',
          'You are responsible for keeping your password confidential and for all activity under your account. Tell us immediately at {operator_email} if you suspect unauthorized access.',
          'The information you give us (such as your email address) must be accurate. Your username, display name, profile picture, bio and published sounds are public to other users.',
        ],
      },
      {
        id: 'plans',
        heading: '4. Plans, credits and payments',
        body: [
          'Beats.ly offers a free plan and paid subscriptions, as well as optional one-time credit packs. Credits are used to download sounds from the community library; each download costs one credit. Plans, prices and what each one includes are shown on the Pricing page and at checkout.',
          'Payments, renewals, cancellations, the right of withdrawal and refunds are described in detail in our Payments & Refunds policy, which forms part of these Terms.',
          'Credits have no cash value, cannot be transferred to another account and cannot be exchanged for money, except where the law requires otherwise.',
        ],
      },
      {
        id: 'content',
        heading: '5. Content you publish',
        body: [
          'You keep all rights to the sounds and other content you publish ("Your Content"). By publishing Your Content on Beats.ly, you grant us a worldwide, non-exclusive, royalty-free license to host, store, reproduce, convert (for example, to generate preview files), display and distribute it through the Service, for as long as it remains published and for the time needed to remove it afterwards.',
          'When you publish a sound, you choose a license that tells other users how they may use it:',
          {
            list: [
              'Royalty-Free — the sound may be used freely in musical works, including commercial ones, without paying royalties;',
              'Attribution Required — the sound may be used provided that the author is credited;',
              'Exclusive — the sound may not be used without the author’s direct permission.',
            ],
          },
          'The license is an agreement between the author and the user who downloads the sound. Beats.ly is not a party to it and does not guarantee that it is respected, but we will act on reported abuse.',
          'You confirm that you own, or have all the rights needed for, Your Content, and that publishing it does not infringe anyone’s rights (including copyright, related rights such as those of performers and producers, trademarks or privacy). Samples taken from other recordings without permission are not allowed.',
          'Every public upload is reviewed before it goes live. We may refuse or remove any content that breaks these Terms or the law, without having to give advance notice.',
        ],
      },
      {
        id: 'use',
        heading: '6. Using downloaded sounds',
        body: [
          'You may use sounds you download only within the license chosen by their author. You may not resell, redistribute or share the sound files themselves (as standalone files or as part of another sample pack or library), unless the author expressly allows it.',
        ],
      },
      {
        id: 'acceptable-use',
        heading: '7. Acceptable use',
        body: [
          'You agree not to:',
          {
            list: [
              'upload content that is illegal, infringes the rights of others, or is hateful, violent, sexually explicit or harassing;',
              'try to access accounts, data or parts of the Service that you are not authorized to access, or get around download limits, credits or other technical restrictions;',
              'use bots, scrapers or automated means to download content in bulk;',
              'interfere with the security or operation of the Service;',
              'create accounts in bulk or use the Service to send spam.',
            ],
          },
        ],
      },
      {
        id: 'takedown',
        heading: '8. Reporting infringements',
        body: [
          'If you believe that content on Beats.ly infringes your rights, write to us at {operator_email} with: your contact details, the content concerned (title and author), the right you believe is infringed and a statement that the information is accurate. We will review the report and, where justified, remove the content and may suspend repeat offenders.',
        ],
      },
      {
        id: 'ip',
        heading: '9. Our rights',
        body: [
          'The Beats.ly application, website, name, logo and design belong to us or our licensors and are protected by law. We grant you a personal, non-exclusive, non-transferable and revocable license to install and use the application for its intended purpose. You may not copy, modify, decompile or redistribute it, except where the law expressly allows it.',
        ],
      },
      {
        id: 'termination',
        heading: '10. Suspension and closing your account',
        body: [
          'You can stop using the Service at any time and you can ask us to delete your account. Active subscriptions should be cancelled first; see the Payments & Refunds policy.',
          'We may suspend or close accounts that seriously or repeatedly break these Terms. Where possible, we will tell you the reason and give you a chance to respond.',
        ],
      },
      {
        id: 'liability',
        heading: '11. Warranties and liability',
        body: [
          'We work to keep the Service available and secure, but we provide it "as is" and cannot guarantee that it will be uninterrupted or error-free. Keep your own backups of the files that matter to you.',
          'To the extent permitted by law, we are not liable for indirect damages, such as loss of profit, data or opportunity. Nothing in these Terms limits our liability for damages caused intentionally or through gross negligence, or the rights you have as a consumer under the law.',
        ],
      },
      {
        id: 'changes',
        heading: '12. Changes to these Terms',
        body: [
          'We may update these Terms. For significant changes, we will notify you by email or in the app at least 15 days in advance. If you continue to use the Service after the changes take effect, you accept the new Terms; if you do not agree, you can close your account.',
        ],
      },
      {
        id: 'law',
        heading: '13. Applicable law and disputes',
        body: [
          'These Terms are governed by Romanian law. If you are a consumer, you also keep the protection given to you by the mandatory laws of your country of residence.',
          'If you have a complaint, please contact us first at {operator_email} — we will reply within 30 days. You can also contact the National Authority for Consumer Protection (ANPC, https://anpc.ro) or use alternative dispute resolution (SAL, https://anpc.ro/ce-este-sal/). Otherwise, disputes are settled by the competent Romanian courts.',
        ],
      },
    ],
  },

  ro: {
    title: 'Termeni și condiții',
    intro:
      'Acești Termeni reglementează folosirea aplicației desktop Beats.ly și a site-ului {site} (împreună, „Serviciul”). Prin crearea unui cont sau folosirea Serviciului, ești de acord cu acești Termeni. Dacă nu ești de acord, te rugăm să nu folosești Serviciul.',
    sections: [
      {
        id: 'operator',
        heading: '1. Cine suntem',
        body: [
          'Serviciul este operat de {operator_name}, înregistrat sub nr. {operator_registration}, CUI {operator_tax_id}, cu sediul în {operator_address} („Beats.ly”, „noi”).',
          'Ne poți contacta la {operator_email}.',
        ],
      },
      {
        id: 'service',
        heading: '2. Serviciul',
        body: [
          'Beats.ly este un manager de biblioteci de sample-uri pentru producători muzicali. În funcție de plan, îți permite:',
          {
            list: [
              'să organizezi și să analizezi fișierele audio de pe propriul calculator (detecția de BPM și tonalitate rulează local, pe dispozitivul tău);',
              'să cauți, să asculți și să descarci sunete publicate de alți utilizatori în biblioteca comunității;',
              'să salvezi sunete, să creezi colecții și să urmărești producători;',
              'să publici propriile sunete, dacă contul tău a fost aprobat ca publisher;',
              'să folosești funcționalități noi pe care le putem lansa în timp (de exemplu Generatorul AI), pe care le vom descrie când devin disponibile.',
            ],
          },
          'Putem modifica, îmbunătăți sau opri funcționalități. Dacă eliminăm o funcționalitate plătită pe care ai plătit-o deja, îți vom oferi o soluție corectă, de exemplu o rambursare proporțională.',
        ],
      },
      {
        id: 'account',
        heading: '3. Contul tău',
        body: [
          'Trebuie să ai cel puțin 16 ani ca să îți creezi un cont. Dacă ai sub 18 ani, ai nevoie de acordul unui părinte sau al reprezentantului legal pentru a face cumpărături.',
          'Ești responsabil pentru păstrarea confidențialității parolei și pentru tot ce se întâmplă în contul tău. Anunță-ne imediat la {operator_email} dacă bănuiești un acces neautorizat.',
          'Informațiile pe care ni le dai (de exemplu adresa de email) trebuie să fie corecte. Numele de utilizator, numele afișat, poza de profil, descrierea și sunetele publicate sunt vizibile public pentru ceilalți utilizatori.',
        ],
      },
      {
        id: 'plans',
        heading: '4. Planuri, credite și plăți',
        body: [
          'Beats.ly oferă un plan gratuit și abonamente plătite, precum și pachete opționale de credite, cumpărate o singură dată. Creditele se folosesc pentru a descărca sunete din biblioteca comunității; fiecare descărcare costă un credit. Planurile, prețurile și ce include fiecare sunt afișate pe pagina Prețuri și la finalizarea plății.',
          'Plățile, reînnoirile, anularea, dreptul de retragere și rambursările sunt descrise în detaliu în Politica de plăți și rambursări, care face parte din acești Termeni.',
          'Creditele nu au valoare bănească, nu pot fi transferate în alt cont și nu pot fi schimbate pe bani, cu excepția cazurilor în care legea prevede altfel.',
        ],
      },
      {
        id: 'content',
        heading: '5. Conținutul pe care îl publici',
        body: [
          'Păstrezi toate drepturile asupra sunetelor și a celorlalte materiale pe care le publici („Conținutul tău”). Publicând Conținutul tău pe Beats.ly, ne acorzi o licență mondială, neexclusivă și gratuită de a-l găzdui, stoca, reproduce, converti (de exemplu, pentru a genera fișiere de previzualizare), afișa și distribui prin intermediul Serviciului, cât timp rămâne publicat și pe durata necesară ștergerii lui ulterioare.',
          'Când publici un sunet, alegi o licență care le spune celorlalți utilizatori cum îl pot folosi:',
          {
            list: [
              'Royalty-Free — sunetul poate fi folosit liber în lucrări muzicale, inclusiv comerciale, fără plata de redevențe;',
              'Attribution Required (cu atribuire) — sunetul poate fi folosit cu condiția menționării autorului;',
              'Exclusive (exclusiv) — sunetul nu poate fi folosit fără acordul direct al autorului.',
            ],
          },
          'Licența este un acord între autor și utilizatorul care descarcă sunetul. Beats.ly nu este parte la acest acord și nu garantează respectarea lui, dar vom acționa în cazul abuzurilor raportate.',
          'Confirmi că deții Conținutul tău sau toate drepturile necesare asupra lui și că publicarea lui nu încalcă drepturile nimănui (inclusiv drepturi de autor, drepturi conexe — precum cele ale artiștilor interpreți și ale producătorilor —, mărci sau dreptul la viață privată). Nu sunt permise sample-uri preluate din alte înregistrări fără acord.',
          'Fiecare sunet public este verificat înainte să apară. Putem refuza sau elimina orice conținut care încalcă acești Termeni sau legea, fără notificare prealabilă.',
        ],
      },
      {
        id: 'use',
        heading: '6. Folosirea sunetelor descărcate',
        body: [
          'Poți folosi sunetele descărcate doar în limitele licenței alese de autorul lor. Nu ai voie să revinzi, să redistribui sau să împarți fișierele de sunet ca atare (ca fișiere separate sau ca parte a altui pachet ori a altei biblioteci de sample-uri), decât dacă autorul permite expres acest lucru.',
        ],
      },
      {
        id: 'acceptable-use',
        heading: '7. Reguli de folosire',
        body: [
          'Ești de acord să nu:',
          {
            list: [
              'încarci conținut ilegal, care încalcă drepturile altora sau care este instigator la ură, violent, sexual explicit ori hărțuitor;',
              'încerci să accesezi conturi, date sau părți ale Serviciului la care nu ai drept de acces ori să ocolești limitele de descărcare, creditele sau alte restricții tehnice;',
              'folosești boți, scrapere sau alte mijloace automate pentru a descărca conținut în masă;',
              'afectezi securitatea sau funcționarea Serviciului;',
              'creezi conturi în masă sau folosești Serviciul pentru spam.',
            ],
          },
        ],
      },
      {
        id: 'takedown',
        heading: '8. Raportarea încălcărilor',
        body: [
          'Dacă ești de părere că un conținut de pe Beats.ly îți încalcă drepturile, scrie-ne la {operator_email} și include: datele tale de contact, conținutul vizat (titlu și autor), dreptul pe care îl consideri încălcat și o declarație că informațiile sunt corecte. Vom analiza sesizarea și, când este justificat, vom elimina conținutul și putem suspenda conturile care încalcă repetat regulile.',
        ],
      },
      {
        id: 'ip',
        heading: '9. Drepturile noastre',
        body: [
          'Aplicația și site-ul Beats.ly, numele, logo-ul și designul ne aparțin nouă sau licențiatorilor noștri și sunt protejate de lege. Îți acordăm o licență personală, neexclusivă, netransferabilă și revocabilă de a instala și folosi aplicația conform destinației ei. Nu ai voie să o copiezi, modifici, decompilezi sau redistribui, cu excepția cazurilor permise expres de lege.',
        ],
      },
      {
        id: 'termination',
        heading: '10. Suspendarea și închiderea contului',
        body: [
          'Poți înceta oricând să folosești Serviciul și ne poți cere ștergerea contului. Abonamentele active trebuie anulate mai întâi; vezi Politica de plăți și rambursări.',
          'Putem suspenda sau închide conturile care încalcă grav sau în mod repetat acești Termeni. Când este posibil, îți vom comunica motivul și îți vom da ocazia să răspunzi.',
        ],
      },
      {
        id: 'liability',
        heading: '11. Garanții și răspundere',
        body: [
          'Depunem eforturi ca Serviciul să fie disponibil și sigur, dar îl oferim „ca atare” și nu putem garanta că va funcționa fără întreruperi sau erori. Păstrează-ți propriile copii de siguranță ale fișierelor importante pentru tine.',
          'În limitele permise de lege, nu răspundem pentru prejudicii indirecte, precum pierderea de profit, de date sau de oportunități. Nimic din acești Termeni nu ne limitează răspunderea pentru prejudiciile cauzate cu intenție sau din culpă gravă și nici drepturile pe care le ai prin lege în calitate de consumator.',
        ],
      },
      {
        id: 'changes',
        heading: '12. Modificarea Termenilor',
        body: [
          'Putem actualiza acești Termeni. Pentru modificările importante, te vom anunța prin email sau în aplicație cu cel puțin 15 zile înainte. Dacă folosești în continuare Serviciul după intrarea lor în vigoare, accepți noii Termeni; dacă nu ești de acord, îți poți închide contul.',
        ],
      },
      {
        id: 'law',
        heading: '13. Legea aplicabilă și litigii',
        body: [
          'Acești Termeni sunt guvernați de legea română. Dacă ești consumator, beneficiezi în continuare și de protecția oferită de legile imperative din țara în care locuiești.',
          'Dacă ai o reclamație, te rugăm să ne contactezi întâi la {operator_email} — îți răspundem în cel mult 30 de zile. Te poți adresa și Autorității Naționale pentru Protecția Consumatorilor (ANPC, https://anpc.ro) sau poți folosi procedura de soluționare alternativă a litigiilor (SAL, https://anpc.ro/ce-este-sal/). În rest, litigiile sunt soluționate de instanțele competente din România.',
        ],
      },
    ],
  },
};
