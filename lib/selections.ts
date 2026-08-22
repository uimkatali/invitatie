export const LOCATION_OPTIONS = [
  { id: 'munte', label: 'Munte' },
  { id: 'mare', label: 'Mare' },
  { id: 'road-trip', label: 'Road trip' },
  { id: 'vizitat', label: 'Vizitat (oras / muzeu / obiectiv)' },
  { id: 'acasa-parinti', label: 'Acasa la parinti' },
  { id: 'explorat', label: 'Explorat locuri noi' },
  { id: 'scoala-soferi', label: 'Scoala de soferi' },
  { id: 'acasa', label: 'Acasa' },
  { id: 'dupa-pofta-inimii', label: 'Dupa pofta inimii' },
] as const;

export type LocationId = (typeof LOCATION_OPTIONS)[number]['id'];

export interface Selections {
  location: LocationId | '';
  customLocation: string;
  preferredDateTime: string;
  homeDetails: string;
  email: string;
}

export interface SelectionsErrors {
  location?: string;
  customLocation?: string;
  preferredDateTime?: string;
  homeDetails?: string;
  email?: string;
}

const LOCATION_IDS = new Set<string>(LOCATION_OPTIONS.map((option) => option.id));
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/;

export function validateSelections(selections: Selections): SelectionsErrors {
  const errors: SelectionsErrors = {};

  if (!selections.location || !LOCATION_IDS.has(selections.location)) {
    errors.location = 'Alege o optiune.';
  }
  if (selections.location === 'dupa-pofta-inimii' && selections.customLocation.trim() === '') {
    errors.customLocation = 'Spune-i macar o idee.';
  }
  if (!DATETIME_PATTERN.test(selections.preferredDateTime)) {
    errors.preferredDateTime = 'Alege data si ora intalnirii.';
  }
  if (selections.location === 'acasa' && selections.homeDetails.trim() === '') {
    errors.homeDetails = 'Spune ce sa pregatesc.';
  }
  if (!EMAIL_PATTERN.test(selections.email)) {
    errors.email = 'Adresa de email nu e valida.';
  }

  return errors;
}

export function isValid(errors: SelectionsErrors): boolean {
  return Object.keys(errors).length === 0;
}

export function locationLabel(id: string): string {
  return LOCATION_OPTIONS.find((option) => option.id === id)?.label ?? id;
}

const MONTHS_RO = [
  'ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
  'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie',
];

// Formats a `datetime-local` value ("YYYY-MM-DDTHH:MM") for display in the
// summary email. Falls back to the raw value for anything malformed rather
// than throwing, since this only ever feeds a text label.
export function formatDateTime(value: string): string {
  const match = DATETIME_PATTERN.exec(value);
  if (!match) return value;
  const [datePart, timePart] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const monthName = MONTHS_RO[month - 1];
  if (!monthName) return value;
  return `${day} ${monthName} ${year}, ora ${timePart}`;
}
