/**
 * Shared utility functions for Mizofy
 */

/**
 * Scrubs technical metadata and channel markers (Tg, @Username, [GroupTags]) 
 * to protect user privacy and project a premium brand image.
 */
const sanitizeName = (name) => {
    if (!name) return '';
    return name
        .replace(/Tg\s*@\w+|@\w+/gi, '') // Remove Telegram channel handles
        .replace(/\[.*?\]/g, '')       // Remove group/tag brackets
        .replace(/\.mkv|\.mp4|\.avi/gi, '') // Remove extensions
        .replace(/Season\s*(\d+)/gi, 'S$1')
        .replace(/Episode\s*(\d+)/gi, 'E$1')
        .replace(/\s+/g, ' ')           // Collapse spaces
        .trim();
};

module.exports = { sanitizeName };
