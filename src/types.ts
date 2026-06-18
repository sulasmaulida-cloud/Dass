export type SeverityCategory = 'Normal' | 'Ringan' | 'Sedang' | 'Berat' | 'Sangat Berat';

export interface ScoreRanges {
  min: number;
  max: number;
  category: SeverityCategory;
}

export interface DASSQuestion {
  id: number;
  text: string;
  category: 'Depresi' | 'Kecemasan' | 'Stres';
}

export interface SurveyResult {
  id?: string;
  tanggal: string;
  namaPetugas: string;
  namaResponden: string;
  asalRuangan: string;
  umur: string;
  gender: string;
  jawaban: Record<number, number>; // questionId -> score (0-3)
  scoreDepresi: number;
  scoreKecemasan: number;
  scoreStres: number;
  kategoriDepresi: SeverityCategory;
  kategoriKecemasan: SeverityCategory;
  kategoriStres: SeverityCategory;
}
