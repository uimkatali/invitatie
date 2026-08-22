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
  preferredTime: string;
  homeDetails: string;
  email: string;
}

export interface SelectionsErrors {
  location?: string;
  customLocation?: string;
  preferredTime?: string;
  homeDetails?: string;
  email?: string;
}

const LOCATION_IDS = new Set<string>(LOCATION_OPTIONS.map((option) => option.id));
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function validateSelections(selections: Selections): SelectionsErrors {
  const errors: SelectionsErrors = {};

  if (!selections.location || !LOCATION_IDS.has(selections.location)) {
    errors.location = 'Alege o optiune.';
  }
  if (selections.location === 'dupa-pofta-inimii' && selections.customLocation.trim() === '') {
    errors.customLocation = 'Spune-i macar o idee.';
  }
  if (!TIME_PATTERN.test(selections.preferredTime)) {
    errors.preferredTime = 'Alege o ora valida.';
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
