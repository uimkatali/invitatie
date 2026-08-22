import { describe, it, expect } from 'vitest';
import { LOCATION_OPTIONS, validateSelections, isValid, locationLabel, formatDateTime, type Selections } from './selections';

function baseSelections(overrides: Partial<Selections> = {}): Selections {
  return {
    location: 'munte',
    customLocation: '',
    preferredDateTime: '2026-09-14T18:30',
    homeDetails: '',
    email: 'ea@example.com',
    ...overrides,
  };
}

describe('LOCATION_OPTIONS', () => {
  it('includes all 9 required options', () => {
    const ids = LOCATION_OPTIONS.map((o) => o.id);
    expect(ids).toEqual([
      'munte',
      'mare',
      'road-trip',
      'vizitat',
      'acasa-parinti',
      'explorat',
      'scoala-soferi',
      'acasa',
      'dupa-pofta-inimii',
    ]);
  });
});

describe('validateSelections', () => {
  it('accepts a fully valid submission with no conditional fields', () => {
    expect(validateSelections(baseSelections())).toEqual({});
  });

  it('requires a location', () => {
    const errors = validateSelections(baseSelections({ location: '' as Selections['location'] }));
    expect(errors.location).toBeDefined();
  });

  it('rejects an unknown location id', () => {
    const errors = validateSelections(baseSelections({ location: 'luna' as Selections['location'] }));
    expect(errors.location).toBeDefined();
  });

  it('requires customLocation when location is "dupa-pofta-inimii"', () => {
    const errors = validateSelections(baseSelections({ location: 'dupa-pofta-inimii', customLocation: '' }));
    expect(errors.customLocation).toBeDefined();
  });

  it('accepts "dupa-pofta-inimii" with a filled customLocation', () => {
    const errors = validateSelections(
      baseSelections({ location: 'dupa-pofta-inimii', customLocation: 'un picnic surpriza' })
    );
    expect(errors.customLocation).toBeUndefined();
  });

  it('requires homeDetails when location is "acasa"', () => {
    const errors = validateSelections(baseSelections({ location: 'acasa', homeDetails: '' }));
    expect(errors.homeDetails).toBeDefined();
  });

  it('does not require homeDetails for other locations', () => {
    const errors = validateSelections(baseSelections({ location: 'mare', homeDetails: '' }));
    expect(errors.homeDetails).toBeUndefined();
  });

  it('requires a valid datetime-local value', () => {
    expect(validateSelections(baseSelections({ preferredDateTime: '' })).preferredDateTime).toBeDefined();
    expect(validateSelections(baseSelections({ preferredDateTime: '2026-13-40T25:99' })).preferredDateTime).toBeDefined();
    expect(validateSelections(baseSelections({ preferredDateTime: '2026-09-14T18:30' })).preferredDateTime).toBeUndefined();
  });

  it('requires a valid email', () => {
    expect(validateSelections(baseSelections({ email: 'nu-e-email' })).email).toBeDefined();
    expect(validateSelections(baseSelections({ email: 'ea@example.com' })).email).toBeUndefined();
  });
});

describe('isValid', () => {
  it('is true for an empty errors object', () => {
    expect(isValid({})).toBe(true);
  });

  it('is false when any error key is present', () => {
    expect(isValid({ email: 'bad' })).toBe(false);
  });
});

describe('locationLabel', () => {
  it('returns the Romanian label for a known id', () => {
    expect(locationLabel('road-trip')).toBe('Road trip');
  });

  it('falls back to the raw id for an unknown value', () => {
    expect(locationLabel('luna')).toBe('luna');
  });
});

describe('formatDateTime', () => {
  it('formats a valid datetime-local value in Romanian', () => {
    expect(formatDateTime('2026-09-14T18:30')).toBe('14 septembrie 2026, ora 18:30');
  });

  it('pads single-digit days unchanged (no leading zero stripped incorrectly)', () => {
    expect(formatDateTime('2026-01-05T09:05')).toBe('5 ianuarie 2026, ora 09:05');
  });

  it('falls back to the raw value for malformed input', () => {
    expect(formatDateTime('not-a-date')).toBe('not-a-date');
  });
});
