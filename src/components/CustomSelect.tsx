'use client';

import { useEffect, useRef, useState } from 'react';

type Option = {
  label: string;
  value: string;
};

type CustomSelectProps = {
  name: string;
  options: Option[];
  defaultValue?: string;
  ariaLabel: string;
};

export default function CustomSelect({ name, options, defaultValue = '', ariaLabel }: CustomSelectProps) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find(option => option.value === value) ?? options[0];

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  return (
    <div ref={rootRef} style={{ position: 'relative', minWidth: '160px' }}>
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
        style={{
          width: '100%',
          backgroundColor: '#111A2E',
          border: `1px solid ${open ? '#4E8FD4' : '#25324D'}`,
          borderRadius: '8px',
          padding: '10px 34px 10px 14px',
          color: selected.value ? '#F5F7FB' : '#7E8AA3',
          fontSize: '14px',
          textAlign: 'left',
          cursor: 'pointer',
          boxShadow: open ? '0 0 0 3px rgba(78,143,212,0.12)' : 'none',
        }}
      >
        {selected.label}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`,
            color: '#7E8AA3',
            fontSize: '11px',
            transition: 'transform 0.15s ease',
          }}
        >
          ▾
        </span>
      </button>
      {open && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          style={{
            position: 'absolute',
            zIndex: 20,
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            backgroundColor: '#111A2E',
            border: '1px solid #25324D',
            borderRadius: '10px',
            padding: '6px',
            boxShadow: '0 18px 44px rgba(0,0,0,0.35)',
          }}
        >
          {options.map(option => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  setValue(option.value);
                  setOpen(false);
                }}
                onMouseEnter={event => { event.currentTarget.style.backgroundColor = '#16213A'; }}
                onMouseLeave={event => { event.currentTarget.style.backgroundColor = active ? 'rgba(46,139,87,0.14)' : 'transparent'; }}
                style={{
                  width: '100%',
                  border: 0,
                  borderRadius: '7px',
                  backgroundColor: active ? 'rgba(46,139,87,0.14)' : 'transparent',
                  color: active ? '#F5F7FB' : '#B6C0D1',
                  padding: '9px 10px',
                  fontSize: '13px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                {option.label}
                {active && <span style={{ color: '#2E8B57', fontWeight: 800 }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
