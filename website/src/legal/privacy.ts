import type { LegalDocSet } from './types';

export const PRIVACY: LegalDocSet = {
  en: {
    title: 'Privacy Policy',
    intro:
      'This policy explains what personal data Beats.ly collects when you use the desktop application and the website {site}, why we collect it, who we share it with and what rights you have under the General Data Protection Regulation (EU) 2016/679 ("GDPR").',
    sections: [
      {
        id: 'controller',
        heading: '1. Who is responsible for your data',
        body: [
          'The data controller is {operator_name}, registered under no. {operator_registration}, tax ID {operator_tax_id}, with its registered office at {operator_address}. For any question about your data or to exercise your rights, write to {operator_email}.',
        ],
      },
      {
        id: 'data',
        heading: '2. What data we collect',
        body: [
          {
            list: [
              'Account data: email address, password (stored only as a secure hash by our authentication provider), username, and — if you choose to add them — your display name, first and last name, phone number, profile picture, bio and links. We also store the date on which you accepted our Terms and this policy.',
              'Content and activity in the Service: sounds you publish and their details, sounds you save, collections, producers you follow, Crews you belong to, downloads, your credit balance, your plan, notifications, and requests to become a publisher (including the social media links you send us for verification).',
              'Payment data: if you buy a subscription or credits, payments are processed by Stripe. We receive a customer identifier, the status of your subscription and the details of your purchases. We never see or store your full card details.',
              'Technical data: IP address, device and browser or operating system information, and server logs, created when you use the Service; signals collected by hCaptcha to tell humans from bots when you sign in or sign up; and error reports sent automatically by the app or website when something breaks (error message, technical trace, app version, platform and, if you are signed in, your user ID).',
              'Local files: files that you analyze in the app stay on your computer. They are uploaded only if you choose to publish them.',
            ],
          },
        ],
      },
      {
        id: 'purposes',
        heading: '3. Why we use your data and on what legal basis',
        body: [
          {
            list: [
              'To create and run your account and provide the Service (Art. 6(1)(b) GDPR — performance of a contract).',
              'To process payments and manage subscriptions (Art. 6(1)(b) GDPR), and to keep accounting and tax records (Art. 6(1)(c) GDPR — legal obligation).',
              'To keep the Service secure, prevent fraud and abuse, moderate published content and fix errors (Art. 6(1)(f) GDPR — our legitimate interest in a safe and working Service).',
              'To send you important messages about your account, purchases or changes to our terms (Art. 6(1)(b) and (c) GDPR).',
              'For anything that requires your consent, we will ask for it first, and you can withdraw it at any time.',
            ],
          },
          'We do not sell your personal data, we do not use it for advertising and we do not make decisions about you based solely on automated processing that have legal or similarly significant effects.',
        ],
      },
      {
        id: 'public',
        heading: '4. What is public',
        body: [
          'Your username, display name, profile picture, bio, links, the sounds you publish and your number of followers are visible to other users. Your email address, real name, phone number, credits and payments are never shown publicly.',
        ],
      },
      {
        id: 'processors',
        heading: '5. Who we share data with',
        body: [
          'We share data only with providers who help us run the Service, under contracts that require them to protect it, and only as much as each one needs:',
          {
            list: [
              'Supabase — database, authentication and file storage (data hosted in the EU, Ireland);',
              'Stripe — payment processing;',
              'hCaptcha (Intuition Machines, Inc.) — protection against bots at sign-in and sign-up;',
              'Vercel — website hosting;',
              'GitHub — distribution of the app installers and automatic updates;',
              'Hugging Face — only when the AI Generator becomes available and only for the descriptions you submit to it.',
            ],
          },
          'We may also disclose data to public authorities when the law requires it.',
          'Some of these providers are based in the United States. Where data is transferred outside the European Economic Area, the transfer is protected by the EU–US Data Privacy Framework or by the European Commission’s Standard Contractual Clauses.',
        ],
      },
      {
        id: 'retention',
        heading: '6. How long we keep data',
        body: [
          {
            list: [
              'Account data and content: for as long as your account exists. After you delete your account, we delete it within 30 days, except for copies in backups, which are overwritten within a further 30 days.',
              'Payment and invoicing records: for the period required by accounting and tax law.',
              'Error reports and technical logs: for as long as needed to investigate the problem, but no longer than 12 months.',
            ],
          },
        ],
      },
      {
        id: 'rights',
        heading: '7. Your rights',
        body: [
          'Under the GDPR you have the right to:',
          {
            list: [
              'access your data and receive a copy of it;',
              'have inaccurate data corrected — most of it you can edit yourself in your profile;',
              'have your data deleted — you can delete your account from your profile settings or by writing to us;',
              'restrict or object to processing based on our legitimate interest;',
              'receive the data you gave us in a structured, machine-readable format (data portability);',
              'withdraw your consent at any time, where processing is based on consent.',
            ],
          },
          'To exercise these rights, write to {operator_email}. We will reply within one month. You also have the right to lodge a complaint with the Romanian data protection authority, ANSPDCP (Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal, www.dataprotection.ro), or with the authority in your country of residence.',
        ],
      },
      {
        id: 'security',
        heading: '8. Security',
        body: [
          'We protect your data with encrypted connections (HTTPS), access rules applied directly in the database (row-level security), private storage for full-quality sound files and short-lived download links. No system is perfectly secure, so if we ever learn of a breach that puts your rights at risk, we will notify you and the authority as the law requires.',
        ],
      },
      {
        id: 'children',
        heading: '9. Children',
        body: [
          'The Service is not intended for anyone under 16. If you believe that a child under 16 has created an account, contact us and we will delete it.',
        ],
      },
      {
        id: 'changes',
        heading: '10. Changes to this policy',
        body: [
          'We will publish any update on this page and change the date above. If the changes are significant, we will also notify you by email or in the app.',
        ],
      },
    ],
  },

  ro: {
    title: 'Politica de confidențialitate',
    intro:
      'Această politică explică ce date personale colectează Beats.ly atunci când folosești aplicația desktop și site-ul {site}, de ce le colectăm, cu cine le împărtășim și ce drepturi ai conform Regulamentului general privind protecția datelor (UE) 2016/679 („GDPR”).',
    sections: [
      {
        id: 'controller',
        heading: '1. Cine răspunde de datele tale',
        body: [
          'Operatorul de date este {operator_name}, înregistrat sub nr. {operator_registration}, CUI {operator_tax_id}, cu sediul în {operator_address}. Pentru orice întrebare despre datele tale sau pentru exercitarea drepturilor, scrie-ne la {operator_email}.',
        ],
      },
      {
        id: 'data',
        heading: '2. Ce date colectăm',
        body: [
          {
            list: [
              'Datele contului: adresa de email, parola (păstrată doar sub formă de hash securizat de furnizorul nostru de autentificare), numele de utilizator și — dacă alegi să le adaugi — numele afișat, numele și prenumele, numărul de telefon, poza de profil, descrierea și link-urile. Păstrăm și data la care ai acceptat Termenii și această politică.',
              'Conținutul și activitatea în Serviciu: sunetele pe care le publici și detaliile lor, sunetele salvate, colecțiile, producătorii pe care îi urmărești, Crew-urile din care faci parte, descărcările, soldul de credite, planul, notificările și cererile de a deveni publisher (inclusiv link-urile de social media trimise pentru verificare).',
              'Datele de plată: dacă cumperi un abonament sau credite, plățile sunt procesate de Stripe. Noi primim un identificator de client, starea abonamentului și detaliile cumpărăturilor. Nu vedem și nu stocăm niciodată datele complete ale cardului.',
              'Date tehnice: adresa IP, informații despre dispozitiv și browser sau sistemul de operare și jurnalele serverelor, create când folosești Serviciul; semnalele colectate de hCaptcha pentru a deosebi oamenii de boți la autentificare și la crearea contului; rapoartele de eroare trimise automat de aplicație sau de site când ceva nu funcționează (mesajul erorii, urma tehnică, versiunea aplicației, platforma și, dacă ești autentificat, ID-ul tău de utilizator).',
              'Fișierele locale: fișierele pe care le analizezi în aplicație rămân pe calculatorul tău. Sunt încărcate doar dacă alegi să le publici.',
            ],
          },
        ],
      },
      {
        id: 'purposes',
        heading: '3. De ce folosim datele și pe ce temei legal',
        body: [
          {
            list: [
              'Pentru a-ți crea și administra contul și a-ți furniza Serviciul (art. 6 alin. (1) lit. b) GDPR — executarea contractului).',
              'Pentru procesarea plăților și administrarea abonamentelor (art. 6 alin. (1) lit. b) GDPR) și pentru evidența contabilă și fiscală (art. 6 alin. (1) lit. c) GDPR — obligație legală).',
              'Pentru securitatea Serviciului, prevenirea fraudei și a abuzurilor, moderarea conținutului publicat și remedierea erorilor (art. 6 alin. (1) lit. f) GDPR — interesul nostru legitim de a avea un Serviciu sigur și funcțional).',
              'Pentru a-ți trimite mesaje importante despre cont, cumpărături sau modificări ale termenilor (art. 6 alin. (1) lit. b) și c) GDPR).',
              'Pentru orice prelucrare care necesită consimțământul tău, ți-l vom cere în prealabil, iar tu îl poți retrage oricând.',
            ],
          },
          'Nu îți vindem datele, nu le folosim pentru publicitate și nu luăm decizii bazate exclusiv pe prelucrare automată care să producă efecte juridice sau similare asupra ta.',
        ],
      },
      {
        id: 'public',
        heading: '4. Ce este public',
        body: [
          'Numele de utilizator, numele afișat, poza de profil, descrierea, link-urile, sunetele publicate și numărul de urmăritori sunt vizibile celorlalți utilizatori. Adresa de email, numele real, numărul de telefon, creditele și plățile nu sunt niciodată afișate public.',
        ],
      },
      {
        id: 'processors',
        heading: '5. Cu cine împărtășim datele',
        body: [
          'Împărtășim datele doar cu furnizorii care ne ajută să operăm Serviciul, pe baza unor contracte care îi obligă să le protejeze, și doar în măsura în care fiecare are nevoie de ele:',
          {
            list: [
              'Supabase — bază de date, autentificare și stocarea fișierelor (date găzduite în UE, Irlanda);',
              'Stripe — procesarea plăților;',
              'hCaptcha (Intuition Machines, Inc.) — protecție împotriva boților la autentificare și la crearea contului;',
              'Vercel — găzduirea site-ului;',
              'GitHub — distribuirea installerelor aplicației și actualizările automate;',
              'Hugging Face — doar după lansarea Generatorului AI și doar pentru descrierile pe care i le trimiți.',
            ],
          },
          'Putem divulga date autorităților publice atunci când legea ne obligă.',
          'Unii dintre acești furnizori au sediul în Statele Unite. Atunci când datele sunt transferate în afara Spațiului Economic European, transferul este protejat prin Cadrul UE–SUA privind confidențialitatea datelor sau prin Clauzele contractuale standard ale Comisiei Europene.',
        ],
      },
      {
        id: 'retention',
        heading: '6. Cât timp păstrăm datele',
        body: [
          {
            list: [
              'Datele contului și conținutul: cât timp contul tău există. După ștergerea contului, le ștergem în cel mult 30 de zile, cu excepția copiilor din backup-uri, care sunt suprascrise în următoarele 30 de zile.',
              'Evidențele de plată și facturare: pe durata impusă de legislația contabilă și fiscală.',
              'Rapoartele de eroare și jurnalele tehnice: cât timp este nevoie pentru investigarea problemei, dar nu mai mult de 12 luni.',
            ],
          },
        ],
      },
      {
        id: 'rights',
        heading: '7. Drepturile tale',
        body: [
          'Conform GDPR, ai dreptul:',
          {
            list: [
              'să îți accesezi datele și să primești o copie a lor;',
              'să ceri corectarea datelor inexacte — pe cele mai multe le poți modifica singur din profil;',
              'să ceri ștergerea datelor — îți poți șterge contul din setările profilului sau scriindu-ne;',
              'să ceri restricționarea prelucrării sau să te opui prelucrării bazate pe interesul nostru legitim;',
              'să primești datele pe care ni le-ai furnizat într-un format structurat, care poate fi citit automat (portabilitatea datelor);',
              'să îți retragi oricând consimțământul, atunci când prelucrarea se bazează pe acesta.',
            ],
          },
          'Pentru exercitarea acestor drepturi, scrie-ne la {operator_email}. Îți răspundem în cel mult o lună. Ai și dreptul să depui o plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP, www.dataprotection.ro) sau la autoritatea din țara în care locuiești.',
        ],
      },
      {
        id: 'security',
        heading: '8. Securitate',
        body: [
          'Îți protejăm datele prin conexiuni criptate (HTTPS), reguli de acces aplicate direct în baza de date (securitate la nivel de rând), stocare privată pentru fișierele audio la calitate completă și link-uri de descărcare cu valabilitate scurtă. Niciun sistem nu este perfect sigur, așa că, dacă aflăm vreodată de o încălcare a securității care îți pune drepturile în pericol, te vom anunța pe tine și autoritatea, conform legii.',
        ],
      },
      {
        id: 'children',
        heading: '9. Copii',
        body: [
          'Serviciul nu este destinat persoanelor sub 16 ani. Dacă știi că un copil sub 16 ani și-a creat cont, contactează-ne și îl vom șterge.',
        ],
      },
      {
        id: 'changes',
        heading: '10. Modificări ale acestei politici',
        body: [
          'Orice actualizare va fi publicată pe această pagină, iar data de mai sus va fi schimbată. Dacă modificările sunt importante, te vom anunța și prin email sau în aplicație.',
        ],
      },
    ],
  },
};
