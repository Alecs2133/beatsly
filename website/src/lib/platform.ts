/**
 * Pe ce fel de aparat e deschis site-ul. Aplicația există doar pentru
 * calculatoare cu Windows, macOS și Linux — pe telefon, tabletă, televizor
 * sau consolă butonul de descărcare nu are sens (installerul nu rulează
 * acolo).
 *
 * Verificare făcută în browser, deci orientativă: cine are linkul direct de
 * pe GitHub îl poate deschide oricum. Scopul e să nu păcălim pe nimeni să
 * descarce ceva ce nu poate instala.
 */
export type DesktopOS = 'windows' | 'mac' | 'linux';

interface UADataNavigator extends Navigator {
  userAgentData?: { mobile?: boolean; platform?: string };
}

// Telefoane, tablete, televizoare, console, căști VR.
const NOT_A_COMPUTER =
  /Android|iPhone|iPad|iPod|Mobile|Tablet|Silk|Kindle|PlayBook|BB10|Windows Phone|IEMobile|Opera Mini|SmartTV|SMART-TV|Tizen|Web0S|WebOS|NetCast|HbbTV|CrKey|AFT[A-Z]|Roku|BRAVIA|PlayStation|Xbox|Nintendo|OculusBrowser|Quest/i;

export function detectDesktopOS(): DesktopOS | null {
  if (typeof navigator === 'undefined') return null;
  const nav = navigator as UADataNavigator;
  const ua = nav.userAgent;

  if (nav.userAgentData?.mobile || NOT_A_COMPUTER.test(ua)) return null;

  const platform = nav.userAgentData?.platform || nav.platform || '';
  if (/Win/i.test(platform) || /Windows NT/i.test(ua)) return 'windows';
  if (/Mac/i.test(platform) || /Macintosh/i.test(ua)) {
    // iPadOS se prezintă ca „Macintosh” — dar un Mac nu are ecran tactil
    // (maxTouchPoints e 0 pe orice Mac, chiar și cu trackpad).
    if (nav.maxTouchPoints > 0) return null;
    return 'mac';
  }
  // Linux, dar NU Android (tot pe nucleu Linux, prins mai sus de
  // NOT_A_COMPUTER) și nici ChromeOS, unde instalarea cere activat containerul
  // de Linux — prea multă bătaie de cap ca să-i promitem butonul.
  if (!/CrOS/i.test(ua) && (/Linux|X11/i.test(platform) || /Linux|X11/i.test(ua))) return 'linux';
  // ChromeOS și restul: nu avem installer pentru ele.
  return null;
}
