/**
 * Generate a friendly device name from user agent string and platform
 */
export function generateDeviceName(userAgent: string | null, platform: string | null): string {
  if (!userAgent && !platform) {
    return 'Unknown Device';
  }

  const ua = userAgent || '';
  const plat = platform || '';

  // Try to detect device type
  let deviceType = 'Device';
  if (/(iPhone|iPad|iPod)/i.test(ua)) {
    deviceType = /iPad/i.test(ua) ? 'iPad' : 'iPhone';
  } else if (/Android/i.test(ua)) {
    deviceType = /Mobile/i.test(ua) ? 'Android Phone' : 'Android Tablet';
  } else if (/(Macintosh|Mac OS X)/i.test(ua) || /Mac/i.test(plat)) {
    deviceType = 'Mac';
  } else if (/Windows/i.test(ua) || /Win/i.test(plat)) {
    deviceType = 'Windows PC';
  } else if (/Linux/i.test(ua) || /Linux/i.test(plat)) {
    deviceType = 'Linux PC';
  }

  // Try to detect browser
  let browser = '';
  if (/Edg\//i.test(ua)) {
    browser = ' (Edge)';
  } else if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) {
    browser = ' (Chrome)';
  } else if (/Firefox/i.test(ua)) {
    browser = ' (Firefox)';
  } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    browser = ' (Safari)';
  }

  return deviceType + browser;
}

/**
 * Detect platform from user agent string
 */
export function detectPlatform(userAgent: string | null): string {
  if (!userAgent) return 'Unknown';

  if (/(iPhone|iPad|iPod)/i.test(userAgent)) return 'iOS';
  if (/Android/i.test(userAgent)) return 'Android';
  if (/(Macintosh|Mac OS X)/i.test(userAgent)) return 'macOS';
  if (/Windows/i.test(userAgent)) return 'Windows';
  if (/Linux/i.test(userAgent)) return 'Linux';

  return 'Unknown';
}
