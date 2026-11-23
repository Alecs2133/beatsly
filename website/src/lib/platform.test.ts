import { afterEach, describe, expect, it, vi } from 'vitest';
import { detectDesktopOS } from './platform';

/**
 * Aparatele de mai jos nu pot fi imitate de un browser de test: Playwright
 * raportează platforma calculatorului gazdă pentru orice user agent pe care
 * nu-l recunoaște (un Chromebook ieșea „Windows”). Aici dăm direct valorile
 * pe care le-ar citi funcția pe aparatul real.
 */
interface FakeNav {
  /** `navigator.userAgentData.platform` — lipsește în Firefox și Safari. */
  uaPlatform?: string;
  platform: string;
  ua: string;
  mobile?: boolean;
  touch?: number;
}

function withNavigator({ uaPlatform, platform, ua, mobile = false, touch = 0 }: FakeNav) {
  vi.stubGlobal('navigator', {
    userAgent: ua,
    platform,
    maxTouchPoints: touch,
    ...(uaPlatform === undefined ? {} : { userAgentData: { mobile, platform: uaPlatform } }),
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('detectDesktopOS', () => {
  it('recunoaște Linux-ul de pe calculator', () => {
    withNavigator({ uaPlatform: 'Linux', platform: 'Linux x86_64', ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131 Safari/537.36' });
    expect(detectDesktopOS()).toBe('linux');
  });

  it('recunoaște Linux și fără userAgentData (Firefox)', () => {
    withNavigator({ platform: 'Linux x86_64', ua: 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0' });
    expect(detectDesktopOS()).toBe('linux');
  });

  it('recunoaște Windows și macOS', () => {
    withNavigator({ uaPlatform: 'Windows', platform: 'Win32', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131' });
    expect(detectDesktopOS()).toBe('windows');
    withNavigator({ platform: 'MacIntel', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/17.0 Safari/605.1.15' });
    expect(detectDesktopOS()).toBe('mac');
  });

  // Android e tot pe nucleu Linux: fără verificarea separată, telefoanele ar
  // primi butonul de descărcare odată cu Linux-ul.
  it.each([
    ['telefon Android', { uaPlatform: 'Android', platform: 'Linux armv8l', ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/131 Mobile Safari/537.36', mobile: true, touch: 5 }],
    ['tabletă Android', { uaPlatform: 'Android', platform: 'Linux armv8l', ua: 'Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 Chrome/131 Safari/537.36', touch: 5 }],
    ['Fire TV', { platform: 'Linux armv7l', ua: 'Mozilla/5.0 (Linux; Android 9; AFTKA) AppleWebKit/537.36 Chrome/131 Safari/537.36' }],
    ['Smart TV Tizen', { platform: 'Linux armv7l', ua: 'Mozilla/5.0 (SMART-TV; Linux; Tizen 6.0) AppleWebKit/538.1 TV Safari/538.1' }],
    ['PlayStation 5', { platform: 'Linux', ua: 'Mozilla/5.0 (PlayStation 5 3.00) AppleWebKit/605.1.15 Safari/605.1.15' }],
    ['cască Quest', { platform: 'Linux armv8l', ua: 'Mozilla/5.0 (X11; Linux x86_64; Quest 3) OculusBrowser/33.0 Chrome/131' }],
    // Pe ChromeOS instalarea cere activat containerul de Linux — nu promitem.
    ['Chromebook', { uaPlatform: 'Chrome OS', platform: 'Linux x86_64', ua: 'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 Chrome/131 Safari/537.36' }],
    // iPadOS se dă drept Macintosh; îl deosebim după ecranul tactil.
    ['iPad', { platform: 'MacIntel', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/17.0 Safari/605.1.15', touch: 5 }],
    ['iPhone', { platform: 'iPhone', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Version/17.0 Mobile/15E148 Safari/604.1', mobile: true, touch: 5 }],
  ])('nu dă butonul de descărcare pe %s', (_name, nav) => {
    withNavigator(nav as FakeNav);
    expect(detectDesktopOS()).toBeNull();
  });

  // Steam Deck rulează SteamOS (Arch) și are ecran tactil, dar e un
  // calculator în toată regula — AppImage-ul merge pe el.
  it('dă butonul pe Steam Deck, deși are ecran tactil', () => {
    withNavigator({ uaPlatform: 'Linux', platform: 'Linux x86_64', ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131 Valve Steam GameOverlay Safari/537.36', touch: 5 });
    expect(detectDesktopOS()).toBe('linux');
  });
});
