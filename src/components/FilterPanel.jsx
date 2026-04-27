import { useEffect, useRef } from "react";

const ACTIVE_OPTIONS = [
  { value: "all", label: "すべて" },
  { value: "active", label: "アクティブのみ" },
  { value: "inactive", label: "非アクティブのみ" },
];

export default function FilterPanel({ filterActive, onFilterActiveChange, onReset, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div ref={ref} style={s.panel}>
      <div style={s.header}>
        <span style={s.title}>フィルター</span>
        <button style={s.closeBtn} onClick={onClose}>✕</button>
      </div>
      <div style={s.section}>
        <div style={s.label}>アクティブ状態</div>
        {ACTIVE_OPTIONS.map(({ value, label }) => (
          <label key={value} style={s.radio}>
            <input
              type="radio"
              checked={filterActive === value}
              onChange={() => onFilterActiveChange(value)}
              style={{ accentColor: "var(--gold)" }}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <button style={s.resetBtn} onClick={onReset}>フィルターをリセット</button>
    </div>
  );
}

const s = {
  panel: {
    position: "absolute",
    top: "100%",
    right: 0,
    marginTop: "4px",
    width: "220px",
    background: "rgba(13,31,53,0.97)",
    border: "1px solid var(--gold-line)",
    borderRadius: "10px",
    backdropFilter: "blur(12px)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
    zIndex: 50,
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px 8px",
    borderBottom: "1px solid var(--gold-line)",
  },
  title: {
    fontSize: "13px",
    fontWeight: "700",
    color: "var(--gold)",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "var(--gold-dim)",
    fontSize: "14px",
    cursor: "pointer",
    padding: "2px 4px",
  },
  section: {
    padding: "12px 14px",
  },
  label: {
    fontSize: "11px",
    color: "var(--gold-dim)",
    marginBottom: "8px",
  },
  radio: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    color: "var(--gold)",
    cursor: "pointer",
    padding: "4px 0",
  },
  resetBtn: {
    display: "block",
    width: "100%",
    padding: "10px 14px",
    background: "none",
    border: "none",
    borderTop: "1px solid var(--gold-line)",
    color: "var(--gold-dim)",
    fontSize: "12px",
    cursor: "pointer",
    textAlign: "left",
  },
};
