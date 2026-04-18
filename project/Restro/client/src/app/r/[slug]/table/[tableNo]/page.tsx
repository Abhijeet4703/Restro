'use client';

import { useEffect, use } from 'react';

export default function MenuPage({ params }: { params: Promise<{ slug: string; tableNo: string }> }) {
  const { slug, tableNo } = use(params);

  useEffect(() => {
    // Redirect to the server-rendered template page which works globally
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    const serverBase = apiUrl.replace(/\/api\/?$/, '');
    window.location.replace(`${serverBase}/template-preview/${slug}?table=${tableNo}`);
  }, [slug, tableNo]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-slate-500 text-sm">Loading menu...</p>
      </div>
    </div>
  );
}
