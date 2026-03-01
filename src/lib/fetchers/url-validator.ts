/**
 * URL Validation Utility
 *
 * SSRF prevention: validates URLs before fetching.
 * Blocks private IPs, cloud metadata endpoints, and suspicious URLs.
 */

// Private IP ranges to block
const PRIVATE_IP_PATTERNS = [
    /^10\./,                      // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
    /^192\.168\./,                // 192.168.0.0/16
    /^127\./,                     // 127.0.0.0/8 (localhost)
    /^169\.254\./,                // 169.254.0.0/16 (link-local, AWS metadata)
    /^0\./,                       // 0.0.0.0/8
    /^100\.(6[4-9]|[7-9][0-9]|1[0-2][0-7])\./, // 100.64.0.0/10 (CGNAT)
];

// Blocked hostnames
const BLOCKED_HOSTNAMES = [
    'localhost',
    'metadata.google.internal',
    'metadata.google.com',
    '169.254.169.254',  // AWS/GCP metadata
    'metadata',
    'instance-data',
];

// Maximum URL length
const MAX_URL_LENGTH = 2048;

// Allowed schemes
const ALLOWED_SCHEMES = ['http:', 'https:'];

export interface UrlValidationResult {
    valid: boolean;
    error?: string;
    url?: URL;
}

/**
 * Validate URL for SSRF prevention
 */
export const validateUrl = (urlString: string): UrlValidationResult => {
    // Check length
    if (!urlString || urlString.length > MAX_URL_LENGTH) {
        return { valid: false, error: 'URL is empty or too long' };
    }

    // Parse URL
    let url: URL;
    try {
        url = new URL(urlString);
    } catch {
        return { valid: false, error: 'Invalid URL format' };
    }

    // Check scheme
    if (!ALLOWED_SCHEMES.includes(url.protocol)) {
        return { valid: false, error: `Scheme not allowed: ${url.protocol}` };
    }

    // Check blocked hostnames
    const hostname = url.hostname.toLowerCase();
    if (BLOCKED_HOSTNAMES.includes(hostname)) {
        return { valid: false, error: `Hostname blocked: ${hostname}` };
    }

    // Check private IP patterns
    for (const pattern of PRIVATE_IP_PATTERNS) {
        if (pattern.test(hostname)) {
            return { valid: false, error: `Private IP not allowed: ${hostname}` };
        }
    }

    // Check for IP address format and validate
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipMatch = hostname.match(ipv4Regex);
    if (ipMatch) {
        const octets = ipMatch.slice(1).map(Number);

        // Check loopback
        if (octets[0] === 127) {
            return { valid: false, error: 'Loopback address not allowed' };
        }

        // Check link-local
        if (octets[0] === 169 && octets[1] === 254) {
            return { valid: false, error: 'Link-local address not allowed' };
        }
    }

    return { valid: true, url };
};

/**
 * Validate URL and throw if invalid
 */
export const requireValidUrl = (urlString: string): URL => {
    const result = validateUrl(urlString);
    if (!result.valid) {
        throw new Error(`URL validation failed: ${result.error}`);
    }
    return result.url!;
};
