import { getCities, getDistrictsByCityCode } from 'turkey-neighbourhoods';

export type Koordinat = { lat: number; lng: number };

const TURKIYE_MERKEZ: Koordinat = { lat: 39.0, lng: 35.0 };

const IL_KODU_KOORDINATLARI: Record<string, Koordinat> = {
  '01': { lat: 36.9862, lng: 35.3253 },
  '02': { lat: 37.7644, lng: 38.2763 },
  '03': { lat: 38.7567, lng: 30.5433 },
  '04': { lat: 39.7147, lng: 43.0401 },
  '05': { lat: 40.6533, lng: 35.8331 },
  '06': { lat: 39.9199, lng: 32.8543 },
  '07': { lat: 36.9081, lng: 30.6956 },
  '08': { lat: 41.1816, lng: 41.8217 },
  '09': { lat: 37.845, lng: 27.8396 },
  '10': { lat: 39.6492, lng: 27.8861 },
  '11': { lat: 40.1419, lng: 29.9793 },
  '12': { lat: 38.8847, lng: 40.4939 },
  '13': { lat: 38.4012, lng: 42.1078 },
  '14': { lat: 40.7358, lng: 31.6061 },
  '15': { lat: 37.7203, lng: 30.2908 },
  '16': { lat: 40.1956, lng: 29.0601 },
  '17': { lat: 40.1555, lng: 26.4127 },
  '18': { lat: 40.5999, lng: 33.6153 },
  '19': { lat: 40.5489, lng: 34.9533 },
  '20': { lat: 37.7742, lng: 29.0875 },
  '21': { lat: 37.9136, lng: 40.2172 },
  '22': { lat: 41.6772, lng: 26.556 },
  '23': { lat: 38.6743, lng: 39.2232 },
  '24': { lat: 39.7392, lng: 39.4901 },
  '25': { lat: 39.9086, lng: 41.2769 },
  '26': { lat: 39.7767, lng: 30.5206 },
  '27': { lat: 37.0594, lng: 37.3825 },
  '28': { lat: 40.917, lng: 38.3874 },
  '29': { lat: 40.46, lng: 39.4718 },
  '30': { lat: 37.5744, lng: 43.7408 },
  '31': { lat: 38.4023, lng: 27.1049 },
  '32': { lat: 37.7644, lng: 30.5522 },
  '33': { lat: 36.812, lng: 34.6389 },
  '34': { lat: 41.0138, lng: 28.9497 },
  '35': { lat: 38.4127, lng: 27.1384 },
  '36': { lat: 40.5983, lng: 43.0855 },
  '37': { lat: 41.3781, lng: 33.7753 },
  '38': { lat: 38.7322, lng: 35.4853 },
  '39': { lat: 41.7351, lng: 27.2252 },
  '40': { lat: 39.1458, lng: 34.1639 },
  '41': { lat: 40.7401, lng: 30.0056 },
  '42': { lat: 37.8713, lng: 32.4846 },
  '43': { lat: 39.4242, lng: 29.9833 },
  '44': { lat: 38.3502, lng: 38.3167 },
  '45': { lat: 38.612, lng: 27.4265 },
  '46': { lat: 37.5847, lng: 36.9264 },
  '47': { lat: 37.3131, lng: 40.7436 },
  '48': { lat: 37.2181, lng: 28.3665 },
  '49': { lat: 38.7316, lng: 41.4848 },
  '50': { lat: 38.625, lng: 34.7122 },
  '51': { lat: 37.9658, lng: 34.6793 },
  '52': { lat: 40.9778, lng: 37.8905 },
  '53': { lat: 41.0208, lng: 40.5219 },
  '54': { lat: 39.5033, lng: 32.0758 },
  '55': { lat: 41.2798, lng: 36.3361 },
  '56': { lat: 37.9293, lng: 41.9413 },
  '57': { lat: 42.0268, lng: 35.1625 },
  '58': { lat: 39.7483, lng: 37.0161 },
  '59': { lat: 40.9781, lng: 27.511 },
  '60': { lat: 40.3139, lng: 36.5544 },
  '61': { lat: 41.005, lng: 39.7269 },
  '62': { lat: 39.0992, lng: 39.5435 },
  '63': { lat: 37.1671, lng: 38.7939 },
  '64': { lat: 38.6735, lng: 29.4058 },
  '65': { lat: 38.4946, lng: 43.3832 },
  '66': { lat: 39.82, lng: 34.8044 },
  '67': { lat: 41.4514, lng: 31.7931 },
  '68': { lat: 38.3725, lng: 34.0254 },
  '69': { lat: 40.2563, lng: 40.2229 },
  '70': { lat: 37.1811, lng: 33.215 },
  '71': { lat: 39.8453, lng: 33.5064 },
  '72': { lat: 37.8874, lng: 41.1322 },
  '73': { lat: 37.5139, lng: 42.4543 },
  '74': { lat: 41.6358, lng: 32.3375 },
  '75': { lat: 41.1087, lng: 42.7022 },
  '76': { lat: 39.9237, lng: 44.045 },
  '77': { lat: 40.655, lng: 29.2769 },
  '78': { lat: 41.2049, lng: 32.6277 },
  '79': { lat: 36.7161, lng: 37.115 },
  '80': { lat: 37.0742, lng: 36.2478 },
  '81': { lat: 40.8389, lng: 31.1639 },
};

const normalize = (value: string) =>
  value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]/g, '');

const CITIES = getCities();
const IL_AD_TO_CODE = new Map(CITIES.map((city) => [normalize(city.name), city.code]));
const ILCE_LIST_BY_IL_CODE = new Map<string, string[]>();
const ILCE_KOORDINAT_BY_IL_ILCE = new Map<string, Koordinat>();
const ILCE_KOORDINAT_BY_NAME = new Map<string, Koordinat>();

for (const city of CITIES) {
  const ilceler = getDistrictsByCityCode(city.code);
  const merkez = IL_KODU_KOORDINATLARI[city.code] ?? TURKIYE_MERKEZ;
  ILCE_LIST_BY_IL_CODE.set(city.code, ilceler);

  const ilKey = normalize(city.name);
  for (const ilce of ilceler) {
    const ilceKey = normalize(ilce);
    ILCE_KOORDINAT_BY_IL_ILCE.set(`${ilKey}|${ilceKey}`, merkez);
    if (!ILCE_KOORDINAT_BY_NAME.has(ilceKey)) {
      ILCE_KOORDINAT_BY_NAME.set(ilceKey, merkez);
    }
  }
}

export const ILLER = CITIES.map((city) => city.name);

export const ILCELER = (il: string): string[] => {
  const ilCode = IL_AD_TO_CODE.get(normalize(il));
  if (!ilCode) return [];
  return ILCE_LIST_BY_IL_CODE.get(ilCode) ?? [];
};

export const getKoordinat = (ilce?: string | null, il?: string | null): Koordinat => {
  const ilKey = normalize(il ?? '');
  const ilceKey = normalize(ilce ?? '');

  if (ilKey && ilceKey) {
    const districtCoord = ILCE_KOORDINAT_BY_IL_ILCE.get(`${ilKey}|${ilceKey}`);
    if (districtCoord) return districtCoord;
  }

  if (ilKey) {
    const ilCode = IL_AD_TO_CODE.get(ilKey);
    if (ilCode && IL_KODU_KOORDINATLARI[ilCode]) return IL_KODU_KOORDINATLARI[ilCode];
  }

  if (ilceKey) {
    const byDistrictName = ILCE_KOORDINAT_BY_NAME.get(ilceKey);
    if (byDistrictName) return byDistrictName;
  }

  return TURKIYE_MERKEZ;
};
