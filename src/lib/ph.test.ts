import { describe, expect, it } from 'vitest';
import { hexToRgb } from './color';
import { comparisonMetrics, DEMO_PROFILE, estimatePh, parseProfile, validateProfile, type ReferenceProfile } from './ph';

const gray: ReferenceProfile = { id: 'gray', name: 'Synthetic linear fixture', synthetic: true, points: [{ ph: 6, hex: '#707070' }, { ph: 8, hex: '#A0A0A0' }] };

describe('pH reference profiles', () => {
  it('rejects absent, malformed, duplicated and out-of-range references', () => {
    expect(validateProfile(null).length).toBeGreaterThan(0);
    expect(validateProfile({ ...gray, points: [] }).length).toBeGreaterThan(0);
    expect(validateProfile({ ...gray, points: new Array(2) }).length).toBe(2);
    expect(validateProfile({ ...gray, points: [{ ph: 6, hex: '#707070' }, { ph: 6, hex: '#A0A0A0' }] }).join(' ')).toContain('more than once');
    expect(validateProfile({ ...gray, points: [{ ph: -1, hex: 'bad!' }, { ph: NaN, hex: '#222222' }] }).length).toBe(3);
    expect(() => parseProfile('not json')).toThrow('valid JSON');
    expect(() => parseProfile('{"name":"x"}')).toThrow();
  });
  it('imports valid data, canonicalizes colors and sorts known pH values', () => {
    const parsed = parseProfile(JSON.stringify({ ...gray, points: [{ ph: 8, hex: '#abc' }, { ph: 6, hex: '#fff' }] }));
    expect(parsed.points).toEqual([{ ph: 6, hex: '#FFFFFF' }, { ph: 8, hex: '#AABBCC' }]);
  });
});

describe('reference-based pH estimation', () => {
  it.each(DEMO_PROFILE.points)('matches exact synthetic reference pH $ph', point => {
    const result = estimatePh(hexToRgb(point.hex)!, DEMO_PROFILE);
    expect(result.estimate).toBe(point.ph); expect(result.deltaE).toBeCloseTo(0, 10);
    expect(result.interpolated).toBe(false); expect(result.warnings.join(' ')).toContain('Synthetic');
  });
  it('interpolates only an adjacent locally compatible Lab segment', () => {
    const result = estimatePh({ r: 136, g: 136, b: 136 }, gray);
    expect(result.status).toBe('interpolated');
    expect(result.estimate).toBeGreaterThan(6.9); expect(result.estimate).toBeLessThan(7.1);
    expect(result.range).toEqual([6, 8]);
    expect(result.warnings.join(' ')).toContain('Decimal places');
  });
  it('refuses unrelated colors, duplicate colors and non-adjacent ambiguity', () => {
    expect(estimatePh({ r: 255, g: 0, b: 255 }, gray).estimate).toBeNull();
    const ambiguous = { ...gray, points: [{ ph: 6, hex: '#707070' }, { ph: 8, hex: '#707070' }] };
    expect(estimatePh({ r: 112, g: 112, b: 112 }, ambiguous).status).toBe('ambiguous');
    const nonAdjacent = { ...gray, points: [{ ph: 2, hex: '#707070' }, { ph: 7, hex: '#00CC33' }, { ph: 12, hex: '#717171' }] };
    expect(estimatePh({ r: 112, g: 112, b: 112 }, nonAdjacent).estimate).toBeNull();
  });
  it('includes every competing reference in the ambiguity bracket', () => {
    const repeated = { ...gray, points: [{ ph: 2, hex: '#707070' }, { ph: 7, hex: '#707070' }, { ph: 12, hex: '#707070' }] };
    const result = estimatePh({ r: 112, g: 112, b: 112 }, repeated);
    expect(result.status).toBe('ambiguous');
    expect(result.range).toEqual([2, 12]);
  });
  it('warns even an exact endpoint cannot resolve out-of-range physical samples', () => {
    expect(estimatePh({ r: 112, g: 112, b: 112 }, gray).warnings.join(' ')).toContain('range endpoint');
  });
  it('does not extrapolate beyond endpoints or interpolate across coarse references', () => {
    const below = estimatePh({ r: 90, g: 90, b: 90 }, gray);
    expect(below.status).toBe('unsupported'); expect(below.estimate).toBeNull();
    const coarse = { ...gray, points: [{ ph: 2, hex: '#707070' }, { ph: 12, hex: '#A0A0A0' }] };
    expect(estimatePh({ r: 136, g: 136, b: 136 }, coarse).interpolated).toBe(false);
    expect(() => estimatePh({ r: 112, g: 112, b: 112 }, { ...gray, points: [] })).toThrow();
  });
  it('computes descriptive errors from actual supplied comparisons', () => {
    expect(comparisonMetrics([{ estimate: 7, reference: 6 }, { estimate: 7, reference: 9 }])).toEqual({ mae: 1.5, rmse: Math.sqrt(2.5) });
    expect(comparisonMetrics([])).toEqual({ mae: 0, rmse: 0 });
    expect(() => comparisonMetrics([{ estimate: 7, reference: NaN }])).toThrow();
  });
});
