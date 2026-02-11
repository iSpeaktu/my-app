import { useState, useEffect } from 'react';
import { supabase, HAS_SUPABASE } from '../config/supabase';

export const useMaterials = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const MISSING_FLAG = 'ispeaktu_lesson_tracks_missing';
    // If we've previously observed the table missing, skip the fetch to avoid noisy 404s
    if (!HAS_SUPABASE || localStorage.getItem(MISSING_FLAG) === '1') {
      setMaterials([]);
      setLoading(false);
      return () => { active = false; };
    }
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const { data, error: err } = await supabase
          .from('lesson_tracks')
          .select('id, title, levels, icon, color, sort_order, active')
          .order('sort_order', { ascending: true });
        if (err) throw err;
        if (!active) return;
        // Normalize levels to array
        const normalized = (data || [])
          .filter(t => t.active !== false)
          .map(m => ({
            id: m.id,
            title: m.title,
            levels: Array.isArray(m.levels) ? m.levels : (m.levels ? [m.levels] : []),
            icon: m.icon || null,
            color: m.color || null,
            sort_order: typeof m.sort_order === 'number' ? m.sort_order : 0
          }));
        setMaterials(normalized);
      } catch (e) {
        // If the table doesn't exist, supabase may surface a 404; cache that state to avoid repeated fetches
        try {
          const status = e?.status || e?.statusCode || (e?.response && e.response.status);
          if (status === 404 || (e?.message || '').toLowerCase().includes('not found')) {
            localStorage.setItem('ispeaktu_materials_missing', '1');
          }
        } catch (__) {}
        if (!active) return;
        setError(e?.message || 'Failed to load materials');
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
