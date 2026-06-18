import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

// Check if keys are actually supplied
export const isSupabaseConfigured = (): boolean => {
  return !!supabaseUrl && supabaseUrl.trim() !== '' && !!supabaseAnonKey && supabaseAnonKey.trim() !== '';
};

// Initialize Supabase Client dynamically
export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Interface representing a completed survey response payload.
 */
export interface SurveyPayload {
  id?: string;
  tanggal: string;
  nama_petugas: string;
  nama_responden: string;
  asal_ruangan: string;
  umur: number;
  gender: string;
  score_depresi: number;
  score_kecemasan: number;
  score_stres: number;
  kategori_depresi: string;
  kategori_kecemasan: string;
  kategori_stres: string;
  jawaban: Record<string, number>;
}

/**
 * Verifies admin credentials directly on Supabase via PostgreSQL RPC.
 */
export const verifyAdminLoginOnSupabase = async (username: string, password: string): Promise<boolean> => {
  if (!supabase) {
    console.warn('Supabase is not configured yet. Falling back to local offline check.');
    return username === 'admin' && password === 'admin12345';
  }

  try {
    const { data, error } = await supabase.rpc('verify_admin_login', {
      p_username: username,
      p_password: password
    });

    if (error) {
      console.error('Error verifying admin via Supabase function:', error.message);
      // Fallback for easy initial dev if DB is not ready yet
      return username === 'admin' && password === 'admin12345';
    }

    return !!data;
  } catch (err) {
    console.error('Failed to contact Supabase RPC:', err);
    return username === 'admin' && password === 'admin12345';
  }
};

/**
 * Syncs a new survey result to the `survey_results` table in Supabase.
 */
export const saveSurveyToSupabase = async (survey: SurveyPayload): Promise<boolean> => {
  if (!supabase) {
    return false;
  }

  try {
    const dbPayload = {
      tanggal: survey.tanggal,
      nama_petugas: survey.nama_petugas,
      nama_responden: survey.nama_responden,
      asal_ruangan: survey.asal_ruangan,
      umur: Number(survey.umur) || 0,
      gender: survey.gender,
      score_depresi: survey.score_depresi,
      score_kecemasan: survey.score_kecemasan,
      score_stres: survey.score_stres,
      kategori_depresi: survey.kategori_depresi,
      kategori_kecemasan: survey.kategori_kecemasan,
      kategori_stres: survey.kategori_stres,
      jawaban: survey.jawaban
    };

    const { error } = await supabase
      .from('survey_results')
      .insert([dbPayload]);

    if (error) {
      throw new Error(error.message);
    }
    return true;
  } catch (e: any) {
    console.error('Error saving survey result to Supabase:', e.message || e);
    throw e;
  }
};

/**
 * Fetches the master list of active rooms from the `rooms` table in Supabase.
 */
export const fetchRoomsFromSupabase = async (): Promise<string[] | null> => {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('name')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching rooms from Supabase:', error.message);
      return null;
    }

    return data.map((r: { name: string }) => r.name);
  } catch (err) {
    console.error('Failed fetching rooms:', err);
    return null;
  }
};

/**
 * Adds a new room to the master table in Supabase.
 */
export const addRoomToSupabase = async (roomName: string): Promise<boolean> => {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('rooms')
      .insert([{ name: roomName }]);

    if (error) {
      console.error('Error inserting room to Supabase:', error.message);
      throw error;
    }
    return true;
  } catch (err) {
    console.error('Failed adding room to Supabase:', err);
    throw err;
  }
};

/**
 * Deletes a room from the master table in Supabase.
 */
export const deleteRoomFromSupabase = async (roomName: string): Promise<boolean> => {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('rooms')
      .delete()
      .eq('name', roomName);

    if (error) {
      console.error('Error deleting room from Supabase:', error.message);
      throw error;
    }
    return true;
  } catch (err) {
    console.error('Failed deleting room from Supabase:', err);
    throw err;
  }
};

/**
 * Fetches all past survey results from Supabase to construct history.
 */
export const fetchResultsFromSupabase = async (): Promise<any[] | null> => {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('survey_results')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching survey results:', error.message);
      return null;
    }

    return data.map((item: any) => ({
      id: item.id,
      tanggal: item.tanggal,
      namaPetugas: item.nama_petugas,
      namaResponden: item.nama_responden,
      asalRuangan: item.asal_ruangan,
      umur: item.umur,
      gender: item.gender,
      depresiScore: item.score_depresi,
      kecemasanScore: item.score_kecemasan,
      stresScore: item.score_stres,
      depresiCategory: item.kategori_depresi,
      kecemasanCategory: item.kategori_kecemasan,
      stresCategory: item.kategori_stres,
      jawaban: item.jawaban
    }));
  } catch (err) {
    console.error('Failed fetching results from Supabase:', err);
    return null;
  }
};
