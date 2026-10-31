import React, { createContext, forwardRef, useContext, useState } from 'react';

const PrivacyContext = createContext(false);

export function PrivacyProvider({ hidden, children }: { hidden: boolean; children: React.ReactNode }) {
  return <PrivacyContext.Provider value={hidden}>{children}</PrivacyContext.Provider>;
}

type ValueProps = React.HTMLAttributes<HTMLElement> & {
  as?: 'span' | 'strong' | 'div' | 'h3';
};

/** Render one fixed mask, regardless of the amount or the number of digits. */
export function PrivateValue({ as: Tag = 'span', children, ...props }: ValueProps) {
  const hidden = useContext(PrivacyContext);
  return <Tag {...props} data-private-value="" aria-label={hidden ? 'Valor oculto' : props['aria-label']}>
    {hidden ? '****' : children}
  </Tag>;
}

/** Keep native numeric validation and reveal the editable amount only while focused. */
export const PrivateAmountInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function PrivateAmountInput({ onFocus, onBlur, ...props }, ref) {
  const privateMode = useContext(PrivacyContext);
  const [focused, setFocused] = useState(false);
  const masked = privateMode && !focused;
  return <span className="privacy-amount-field">
    <input {...props} ref={ref} data-amount-hidden={masked || undefined}
      aria-valuetext={masked ? 'Valor oculto' : props['aria-valuetext']}
      onFocus={event => { setFocused(true); onFocus?.(event); }}
      onBlur={event => { setFocused(false); onBlur?.(event); }} />
    {masked && <span className="privacy-input-mask" aria-hidden="true">****</span>}
  </span>;
});
