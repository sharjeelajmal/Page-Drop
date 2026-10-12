/**
 * Small, dependency-free User-Agent classifier: device type, OS, browser and
 * known link-preview/crawler bots. Good enough for visit analytics; it does
 * not try to identify exact device models.
 */

export type DeviceType = "desktop" | "mobile" | "tablet" | "bot";

export interface ParsedAgent {
  deviceType: DeviceType;
  os: string;
  browser: string;
  /** Name of the bot/preview fetcher when deviceType is "bot". */
  bot?: string;
}

// Link-preview fetchers and crawlers. A WhatsApp/Slack/etc. hit means the link
// was pasted into that app (it fetched a preview), not that a person opened it.
const BOTS: [RegExp, string][] = [
  [/WhatsApp\//i, "WhatsApp preview"],
  [/facebookexternalhit|Facebot|meta-externalagent/i, "Facebook preview"],
  [/Slackbot|Slack-ImgProxy/i, "Slack preview"],
  [/TelegramBot/i, "Telegram preview"],
  [/Twitterbot/i, "X / Twitter preview"],
  [/LinkedInBot/i, "LinkedIn preview"],
  [/Discordbot/i, "Discord preview"],
  [/SkypeUriPreview|Teams|MicrosoftPreview/i, "Microsoft preview"],
  [/Googlebot|Google-InspectionTool|AdsBot-Google|GoogleOther/i, "Google crawler"],
  [/bingbot|BingPreview/i, "Bing crawler"],
  [/Applebot/i, "Apple crawler"],
  [/HeadlessChrome|PhantomJS|Puppeteer|Playwright/i, "Headless browser"],
  [/curl\/|Wget\/|python-requests|python-urllib|node-fetch|axios\/|Go-http-client|okhttp|undici/i, "Script / tool"],
  [/bot\b|crawler|spider|crawling|preview|monitor|uptime/i, "Other bot"],
];

export function parseUserAgent(raw: string | null | undefined): ParsedAgent {
  const ua = (raw ?? "").slice(0, 512);
  if (!ua) return { deviceType: "bot", os: "Unknown", browser: "Unknown", bot: "No user agent" };

  for (const [pattern, name] of BOTS) {
    if (pattern.test(ua)) return { deviceType: "bot", os: detectOs(ua), browser: "Bot", bot: name };
  }

  return { deviceType: detectDevice(ua), os: detectOs(ua), browser: detectBrowser(ua) };
}

function detectDevice(ua: string): DeviceType {
  if (/iPad|Tablet|PlayBook|Silk|Kindle/i.test(ua)) return "tablet";
  // Android tablets omit "Mobile"; phones include it.
  if (/Android/i.test(ua) && !/Mobile/i.test(ua)) return "tablet";
  if (/Mobi|iPhone|iPod|Android|Windows Phone|Opera Mini|IEMobile/i.test(ua)) return "mobile";
  return "desktop";
}

function detectOs(ua: string): string {
  if (/iPhone|iPod/i.test(ua)) return "iOS";
  if (/iPad/i.test(ua)) return "iPadOS";
  if (/Android/i.test(ua)) return "Android";
  if (/CrOS/i.test(ua)) return "ChromeOS";
  if (/Windows NT|Windows Phone/i.test(ua)) return "Windows";
  if (/Mac OS X|Macintosh/i.test(ua)) return "macOS";
  if (/Linux/i.test(ua)) return "Linux";
  return "Other";
}

function detectBrowser(ua: string): string {
  // In-app browsers first: they embed the engine of a regular browser.
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return "Facebook app";
  if (/Instagram/i.test(ua)) return "Instagram app";
  if (/LinkedInApp/i.test(ua)) return "LinkedIn app";
  if (/\bLine\//i.test(ua)) return "LINE app";
  if (/Snapchat/i.test(ua)) return "Snapchat app";
  if (/TikTok|musical_ly|BytedanceWebview/i.test(ua)) return "TikTok app";
  if (/Edg(e|A|iOS)?\//i.test(ua)) return "Edge";
  if (/OPR\/|Opera/i.test(ua)) return "Opera";
  if (/SamsungBrowser/i.test(ua)) return "Samsung Internet";
  if (/UCBrowser/i.test(ua)) return "UC Browser";
  if (/YaBrowser/i.test(ua)) return "Yandex";
  if (/Firefox|FxiOS/i.test(ua)) return "Firefox";
  if (/CriOS|Chrome\//i.test(ua)) return /; wv\)/i.test(ua) ? "Android WebView" : "Chrome";
  if (/Safari\//i.test(ua)) return "Safari";
  return "Other";
}
