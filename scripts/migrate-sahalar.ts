import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const loadEnvLocal = (): void => {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!existsSync(envPath)) {
    return;
  }

  const envContent = readFileSync(envPath, 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    value = value.replace(/\\n/g, '\n');

    process.env[key] = value;
  }
};

loadEnvLocal();

type FirestoreTypedValue = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  nullValue?: null;
  timestampValue?: string;
  mapValue?: {
    fields?: Record<string, FirestoreTypedValue>;
  };
  arrayValue?: {
    values?: FirestoreTypedValue[];
  };
};

type FirestoreParsedValue = string | number | boolean | null | FirestoreParsedMap | FirestoreParsedValue[];

interface FirestoreParsedMap {
  [key: string]: FirestoreParsedValue;
}

interface FirestoreDocument {
  name: string;
  fields?: Record<string, FirestoreTypedValue>;
}

interface FirestoreListResponse {
  documents?: FirestoreDocument[];
  nextPageToken?: string;
}

interface SahaInsert {
  user_id: null;
  saha_adi: string;
  telefon: string;
  il: string | null;
  ilce: string | null;
  lat: number | null;
  lng: number | null;
  format: string | null;
  fiyat: number | null;
  slot_suresi: number | null;
  acilis_saati: string | null;
  kapanis_saati: string | null;
  durum: 'aktif' | 'pasif';
  kurallar: string | null;
}

interface MusaitlikInsert {
  saha_id: string;
  tarih: string;
  slot: string;
  durum: 'bos' | 'dolu';
}

const isParsedMap = (value: FirestoreParsedValue | undefined): value is FirestoreParsedMap =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toTrimmedString = (value: FirestoreParsedValue | undefined): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return null;
};

const toNumber = (value: FirestoreParsedValue | undefined): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const toInteger = (value: FirestoreParsedValue | undefined): number | null => {
  const parsed = toNumber(value);
  return parsed === null ? null : Math.trunc(parsed);
};

const normalizeSahaDurumu = (value: FirestoreParsedValue | undefined): 'aktif' | 'pasif' => {
  const normalized = toTrimmedString(value)?.toLocaleLowerCase('tr-TR');
  return normalized === 'aktif' ? 'aktif' : 'pasif';
};

const normalizeMusaitlikDurumu = (value: FirestoreParsedValue | undefined): 'bos' | 'dolu' => {
  const normalized = toTrimmedString(value)?.toLocaleLowerCase('tr-TR');
  return normalized === 'dolu' ? 'dolu' : 'bos';
};

const parseFirestoreValue = (value: FirestoreTypedValue): FirestoreParsedValue => {
  if (typeof value.stringValue === 'string') return value.stringValue;
  if (typeof value.integerValue === 'string') return Number(value.integerValue);
  if (typeof value.doubleValue === 'number') return value.doubleValue;
  if (typeof value.booleanValue === 'boolean') return value.booleanValue;
  if (Object.prototype.hasOwnProperty.call(value, 'nullValue')) return null;
  if (typeof value.timestampValue === 'string') return value.timestampValue;

  if (value.mapValue?.fields) {
    const parsedMap: FirestoreParsedMap = {};
    for (const [key, nestedValue] of Object.entries(value.mapValue.fields)) {
      parsedMap[key] = parseFirestoreValue(nestedValue);
    }
    return parsedMap;
  }

  if (value.arrayValue?.values) {
    return value.arrayValue.values.map(parseFirestoreValue);
  }

  return null;
};

const parseFirestoreDocument = (doc: FirestoreDocument): FirestoreParsedMap => {
  const parsed: FirestoreParsedMap = {};
  const fields = doc.fields ?? {};

  for (const [key, value] of Object.entries(fields)) {
    parsed[key] = parseFirestoreValue(value);
  }

  return parsed;
};

const parseMusaitlikKey = (key: string): { tarih: string; slot: string } | null => {
  const separatorIndex = key.indexOf('_');
  if (separatorIndex <= 0) return null;

  const tarih = key.slice(0, separatorIndex).trim();
  const slot = key.slice(separatorIndex + 1).trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(tarih)) return null;
  if (!slot) return null;

  return { tarih, slot };
};

const extractMusaitlikRows = (rawMusaitlik: FirestoreParsedValue | undefined, sahaId: string): MusaitlikInsert[] => {
  const rows: MusaitlikInsert[] = [];

  if (isParsedMap(rawMusaitlik)) {
    for (const [key, value] of Object.entries(rawMusaitlik)) {
      const parsedKey = parseMusaitlikKey(key);
      if (!parsedKey) continue;

      rows.push({
        saha_id: sahaId,
        tarih: parsedKey.tarih,
        slot: parsedKey.slot,
        durum: normalizeMusaitlikDurumu(value),
      });
    }
    return rows;
  }

  if (Array.isArray(rawMusaitlik)) {
    for (const item of rawMusaitlik) {
      if (!isParsedMap(item)) continue;

      const tarih = toTrimmedString(item.tarih);
      const slot = toTrimmedString(item.slot);
      if (!tarih || !slot) continue;

      rows.push({
        saha_id: sahaId,
        tarih,
        slot,
        durum: normalizeMusaitlikDurumu(item.durum),
      });
    }
  }

  return rows;
};

const buildSahaInsert = (sahaData: FirestoreParsedMap, docId: string): SahaInsert | null => {
  const sahaAdi = toTrimmedString(sahaData.sahaAdi) ?? toTrimmedString(sahaData.saha_adi);
  const telefon = toTrimmedString(sahaData.telefon);

  if (!sahaAdi || !telefon) {
    console.log(`[SKIP] ${docId}: sahaAdi veya telefon eksik.`);
    return null;
  }

  return {
    user_id: null,
    saha_adi: sahaAdi,
    telefon,
    il: toTrimmedString(sahaData.il),
    ilce: toTrimmedString(sahaData.ilce),
    lat: toNumber(sahaData.lat),
    lng: toNumber(sahaData.lng),
    format: toTrimmedString(sahaData.format),
    fiyat: toInteger(sahaData.fiyat),
    slot_suresi: toInteger(sahaData.slotSuresi ?? sahaData.slot_suresi),
    acilis_saati: toTrimmedString(sahaData.acilisSaati ?? sahaData.acilis_saati),
    kapanis_saati: toTrimmedString(sahaData.kapanisSaati ?? sahaData.kapanis_saati),
    durum: normalizeSahaDurumu(sahaData.durum),
    kurallar: toTrimmedString(sahaData.kurallar),
  };
};

const fetchSahaDocuments = async (projectId: string, apiKey: string): Promise<FirestoreDocument[]> => {
  const documents: FirestoreDocument[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/sahalar`);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('pageSize', '300');
    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Firestore request failed (${response.status}): ${errorBody}`);
    }

    const payload = (await response.json()) as FirestoreListResponse;
    if (Array.isArray(payload.documents)) {
      documents.push(...payload.documents);
    }

    pageToken = payload.nextPageToken;
  } while (pageToken);

  return documents;
};

const getDocId = (name: string): string => {
  const parts = name.split('/');
  return parts[parts.length - 1] ?? 'unknown';
};

const getRequiredEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Eksik env değişkeni: ${key}`);
  }
  return value;
};

const main = async (): Promise<void> => {
  const firebaseProjectId = getRequiredEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  const firebaseApiKey = getRequiredEnv('NEXT_PUBLIC_FIREBASE_API_KEY');
  const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseServiceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  console.log('Firebase sahalar koleksiyonu okunuyor...');
  const firestoreDocs = await fetchSahaDocuments(firebaseProjectId, firebaseApiKey);
  console.log(`Toplam ${firestoreDocs.length} saha bulundu.`);

  let aktarilanSaha = 0;
  let atlananSaha = 0;
  let hataliSaha = 0;
  let aktarilanMusaitlik = 0;

  for (const firestoreDoc of firestoreDocs) {
    const docId = getDocId(firestoreDoc.name);
    const sahaData = parseFirestoreDocument(firestoreDoc);
    const sahaInsert = buildSahaInsert(sahaData, docId);

    if (!sahaInsert) {
      atlananSaha += 1;
      continue;
    }

    const { data: insertedSaha, error: sahaInsertError } = await supabase
      .from('sahalar')
      .insert(sahaInsert)
      .select('id')
      .single();

    if (sahaInsertError || !insertedSaha?.id) {
      console.log(`[ERROR] ${docId}: saha insert başarısız`, sahaInsertError);
      hataliSaha += 1;
      continue;
    }

    aktarilanSaha += 1;

    const musaitlikRows = extractMusaitlikRows(sahaData.musaitlik, insertedSaha.id);
    if (musaitlikRows.length === 0) {
      continue;
    }

    const { error: musaitlikError } = await supabase
      .from('musaitlik')
      .upsert(musaitlikRows, { onConflict: 'saha_id,tarih,slot' });

    if (musaitlikError) {
      console.log(`[ERROR] ${docId}: musaitlik upsert başarısız`, musaitlikError);
      continue;
    }

    aktarilanMusaitlik += musaitlikRows.length;
  }

  console.log('--- MIGRATION OZETI ---');
  console.log(`Aktarılan saha: ${aktarilanSaha}`);
  console.log(`Atlanan saha: ${atlananSaha}`);
  console.log(`Hatalı saha: ${hataliSaha}`);
  console.log(`Aktarılan musaitlik satırı: ${aktarilanMusaitlik}`);

  if (hataliSaha > 0) {
    process.exitCode = 1;
  }
};

main().catch((error: unknown) => {
  console.log('Migration script hata verdi:', error);
  process.exitCode = 1;
});
