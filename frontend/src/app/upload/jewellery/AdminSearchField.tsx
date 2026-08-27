'use client';

export default function AdminSearchField({
  value,
  onChange,
  placeholder,
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <label className={`relative block w-full ${className}`}>
      <span className="sr-only">{placeholder}</span>
      <svg
        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3-3" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white border border-gray-100 rounded-full pl-11 pr-4 py-2.5 text-sm text-navy outline-none focus:border-navy shadow-sm"
      />
    </label>
  );
}

export function textMatchesQuery(query: string, ...values: Array<string | null | undefined>) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const compact = q.replace(/\s+/g, '');
  return values.some((raw) => {
    const s = String(raw || '').toLowerCase();
    if (!s) return false;
    return s.includes(q) || s.replace(/\s+/g, '').includes(compact);
  });
}
