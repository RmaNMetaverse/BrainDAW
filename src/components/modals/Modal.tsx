import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function Modal({ label, children, onClose }: { label: string; children: ReactNode; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return <dialog className="studio-dialog" ref={dialog} aria-label={label} onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <header><h2>{label}</h2><button type="button" aria-label={'Close ' + label} className="icon-button" onClick={onClose}><X size={18} /></button></header>
    {children}
  </dialog>;
}
