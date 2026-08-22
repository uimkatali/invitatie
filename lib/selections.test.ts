import { describe, it, expect } from 'vitest';
import { LOCATION_OPTIONS, validateSelections, isValid, locationLabel, type Selections } from './selections';

function baseSelections(overrides: Partial<Selections> = {}): Selections {
  return {
    location: 'munte',
    customLocation: '',
    preferredTime: '14:30',
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

  it('requires a valid HH:MM time', () => {
    expect(validateSelections(baseSelections({ preferredTime: '' })).preferredTime).toBeDefined();
    expect(validateSelections(baseSelections({ preferredTime: '25:99' })).preferredTime).toBeDefined();
    expect(validateSelections(baseSelections({ preferredTime: '09:05' })).preferredTime).toBeUndefined();
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
