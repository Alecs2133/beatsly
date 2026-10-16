import React from 'react';
import './controls.css';

interface HardwareSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}

/** Comutator cu LED, ca pe un echipament audio. */
export const HardwareSwitch: React.FC<HardwareSwitchProps> = ({ checked, onChange, label, disabled }) => (
  <button
    type="button"
    role="switch"
    className="hw-switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
  />
);
