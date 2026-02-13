import { useState, useEffect } from 'react';
import { supabase, HAS_SUPABASE } from '../config/supabase';
// NOTE: Removed embedded MATERIALS_DATA fallback to enforce DB-only sourcing

export const useMaterials = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const MISSING_FLAG = 'ispeaktu_lesson_tracks_missing';
    // If we've previously observed the table missing, skip the fetch to avoid noisy 404s
    if (!HAS_SUPABASE || localStorage.getItem(MISSING_FLAG) === '1') {
      // If Supabase isn't available or the table was marked missing, keep materials empty
      setMaterials([]);
      setLoading(false);
      return () => { active = false; };
    }
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        // Request all columns to be tolerant of schema differences across deployments
        const { data, error: err } = await supabase
          .from('lesson_tracks')
          .select('*');
        if (err) throw err;
        if (!active) return;
        // Normalize levels to array
        const normalized = (data || [])
          .filter(t => t.active !== false)
          .map(m => {
            // Normalize title across possible column names in different schemas.
            // Prefer explicit lesson_track fields; do NOT fall back to the technical `id` as a display name.
            const title = m.lesson_track || m.lesson_track_name || m.title || m.name || m.track_name || m.trackTitle || m.display_name || 'Track';
            const levels = Array.isArray(m.levels) ? m.levels : (m.levels ? [m.levels] : []);
            return {
              id: m.id,
              title,
              levels,
              icon: m.icon || null,
              color: m.color || null,
              sort_order: typeof m.sort_order === 'number' ? m.sort_order : (typeof m.sortOrder === 'number' ? m.sortOrder : 0)
            };
          })
          // Client-side sort when server ordering is not reliable across schemas
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        setMaterials(normalized);
      } catch (e) {
          // If the table doesn't exist or request fails, cache that state and
          // fall back to the embedded `MATERIALS_DATA` so the UI remains usable.
          try {
            const status = e?.status || e?.statusCode || (e?.response && e.response.status);
            if (status === 404 || (e?.message || '').toLowerCase().includes('not found')) {
              localStorage.setItem(MISSING_FLAG, '1');
            }
          } catch (__) {}
          if (!active) return;
          console.error('Failed to load lesson_tracks from Supabase:', e);
          setError(e?.message || 'Failed to load materials');
          // Do not fall back to embedded data; keep materials empty to enforce DB-only sourcing
          setMaterials([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => { active = false; };
  }, []);

  return { materials, loading, error };
};

export default useMaterials;
