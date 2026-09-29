/** Mesajele afisate dupa o actiune reusita, transmise prin `?mesaj=<cheie>` (redirect). */
export const FLASH_MESSAGES = {
  raspuns: 'Raspuns trimis.',
  'ora-acceptata': 'Ora noua a fost acceptata.',
  anulata: 'Invitatia a fost anulata.',
} as const;

export type FlashKey = keyof typeof FLASH_MESSAGES;

/** Cauta in harta fixa; parametrul din URL nu se reflecta niciodata direct in pagina. */
export function flashMessage(param: string | string[] | undefined): string | null {
  if (typeof param !== 'string' || !Object.hasOwn(FLASH_MESSAGES, param)) return null;
  return FLASH_MESSAGES[param as FlashKey];
}
