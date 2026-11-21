// Only presentation copy is cleaned; URLs, customer reviews and payment data stay intact.
export function cleanStorefrontText(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/[\p{Extended_Pictographic}\p{Regional_Indicator}\p{Emoji_Modifier}\uFE0F\u200D✦◆]/gu, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/^[ \t]+|[ \t]+$/gm, '')
    .trim();
}

export function cleanStorefrontCopy(value) {
  if (Array.isArray(value)) return value.map(cleanStorefrontCopy);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => {
    if (/url|slug|sku|image|video|review|testimonial|author|tracking|code|html/i.test(key)) return [key, item];
    if (item && typeof item === 'object') return [key, cleanStorefrontCopy(item)];
    const isCopy = /text|title|headline|subtitle|description|desc$|label|badge|pill|name$|message|material|^q$|^a$/i.test(key);
    const text = typeof item === 'string' && /description|desc$/i.test(key)
      ? item.replace(/^[ \t]*\p{Extended_Pictographic}[\uFE0F\u200D\p{Extended_Pictographic}]*[ \t]*/gmu, '- ')
      : item;
    return [key, isCopy ? cleanStorefrontText(text) : item];
  }));
}
