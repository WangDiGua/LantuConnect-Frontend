import React from 'react';
import { Theme } from '../../types';
import { LantuSelect } from './LantuSelect';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  placeholder?: string;
  className?: string;
  theme: Theme;
  disabled?: boolean;
}

export const FilterSelect: React.FC<FilterSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = '请选择...',
  className = '',
  theme,
  disabled = false,
}) => (
  <LantuSelect
    value={value}
    onChange={onChange}
    options={options}
    theme={theme}
    placeholder={placeholder}
    disabled={disabled}
    className={className}
  />
);
