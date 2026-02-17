import { useState, useEffect } from 'react';

export function useBranches() {
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/branches`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
                });
                if (!res.ok) throw new Error('Failed to fetch branches');
                const data = await res.json();
                setBranches(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchBranches();
    }, []);

    return { branches, loading, error };
}
