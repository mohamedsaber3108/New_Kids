// Language of a piece of chat text, for the lang attribute (judge b42/b58 UX).
// Same rule as the server's replyLang: Arabic letters -> 'ar', otherwise 'en'.
export const textLang=text=>/[\u0600-\u06FF]/.test(String(text??''))?'ar':'en';
