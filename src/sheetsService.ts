import { SurveyResult } from './types';

// Storage keys
const SPREADSHEET_ID_KEY = 'dass42_spreadsheet_id';

const HEADERS = [
  'ID Hasil',
  'Waktu Pengisian',
  'Nama Petugas',
  'Nama Responden',
  'Asal Ruangan',
  'Umur',
  'Jenis Kelamin',
  'Skor Depresi',
  'Kategori Depresi',
  'Skor Kecemasan',
  'Kategori Kecemasan',
  'Skor Stres',
  'Kategori Stres',
  // Q1 to Q42 scores
  ...Array.from({ length: 42 }, (_, i) => `Q${i + 1}`)
];

/**
 * Creates a new spreadsheet in the user's Google Drive with headers
 */
export async function createSpreadsheet(accessToken: string): Promise<string> {
  const url = 'https://sheets.googleapis.com/v4/spreadsheets';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: 'Database Hasil Survei TES DASS-42'
      },
      sheets: [
        {
          properties: {
            title: 'Hasil Survei'
          }
        }
      ]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gagal membuat Spreadsheet Baru: ${errText}`);
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;

  // Now, write headers using values.update
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Hasil+Survei!A1:AZ1?valueInputOption=USER_ENTERED`;
  const headerResponse = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      range: 'Hasil+Survei!A1:AZ1',
      majorDimension: 'ROWS',
      values: [HEADERS]
    })
  });

  if (!headerResponse.ok) {
    const errText = await headerResponse.text();
    throw new Error(`Gagal menulis header data spreadsheet: ${errText}`);
  }

  localStorage.setItem(SPREADSHEET_ID_KEY, spreadsheetId);
  return spreadsheetId;
}

/**
 * Appends a row of survey results to the Google Sheet
 */
export async function appendSurveyResult(
  accessToken: string,
  spreadsheetId: string,
  result: SurveyResult
): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Hasil+Survei!A1:append?valueInputOption=USER_ENTERED`;
  
  const questionAnswers = Array.from({ length: 42 }, (_, i) => result.jawaban[i + 1] ?? 0);
  
  const rowValues = [
    result.id || `DASS-${Date.now()}`,
    result.tanggal,
    result.namaPetugas,
    result.namaResponden,
    result.asalRuangan || '',
    result.umur,
    result.gender,
    result.scoreDepresi,
    result.kategoriDepresi,
    result.scoreKecemasan,
    result.kategoriKecemasan,
    result.scoreStres,
    result.kategoriStres,
    ...questionAnswers
  ];

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      range: 'Hasil+Survei!A1',
      majorDimension: 'ROWS',
      values: [rowValues]
    })
  });

  if (!response.ok) {
    // If the spreadsheet or sheet is not found, clear cached ID so we can regenerate on next attempt
    if (response.status === 404 || response.status === 403) {
      localStorage.removeItem(SPREADSHEET_ID_KEY);
    }
    const errText = await response.text();
    throw new Error(`Gagal menyimpan baris hasil survei: ${errText}`);
  }
}

/**
 * Resolves the Google Spreadsheet ID. Reuses cached ID or creates a new sheet.
 */
export async function getOrCreateSpreadsheet(accessToken: string): Promise<string> {
  const cachedId = localStorage.getItem(SPREADSHEET_ID_KEY);
  if (cachedId) {
    try {
      // Validate sheet existence
      const checkUrl = `https://sheets.googleapis.com/v4/spreadsheets/${cachedId}?fields=spreadsheetId`;
      const response = await fetch(checkUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (response.ok) {
        return cachedId;
      }
    } catch (e) {
      console.warn('Cached spreadsheet ID invalid, creating a new one', e);
    }
  }

  return await createSpreadsheet(accessToken);
}
