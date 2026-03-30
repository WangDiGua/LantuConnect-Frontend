import React, { useMemo } from 'react';
import DatePicker from 'react-datepicker';
import { CalendarDays } from 'lucide-react';
import { format, isValid, parse } from 'date-fns';
import type { Theme } from '../../types';
import { nativeInputClass } from '../../utils/formFieldClasses';
import 'react-datepicker/dist/react-datepicker.css';
import './lantu-date-picker.css';

type PickerMode = 'date' | 'datetime';

interface LantuDateTimePickerProps {
  theme: Theme;
  mode?: PickerMode;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
  compact?: boolean;
  min?: string;
  max?: string;
  disabled?: boolean;
  ariaLabel?: string;
  open?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

function parseValue(value: string, mode: PickerMode): Date | null {
  if (!value) return null;
  const pattern = mode === 'datetime' ? "yyyy-MM-dd'T'HH:mm" : 'yyyy-MM-dd';
  const parsed = parse(value, pattern, new Date());
  return isValid(parsed) ? parsed : null;
}

function formatValue(date: Date, mode: PickerMode): string {
  return mode === 'datetime'
    ? format(date, "yyyy-MM-dd'T'HH:mm")
    : format(date, 'yyyy-MM-dd');
}

export const LantuDateTimePicker: React.FC<LantuDateTimePickerProps> = ({
  theme,
  mode = 'date',
  value,
  onChange,
  placeholder,
  className = '',
  compact = false,
  min,
  max,
  disabled = false,
  ariaLabel,
  open,
  onOpen,
  onClose,
}) => {
  const selected = useMemo(() => parseValue(value, mode), [value, mode]);
  const minDate = useMemo(() => parseValue(min ?? '', mode), [min, mode]);
  const maxDate = useMemo(() => parseValue(max ?? '', mode), [max, mode]);
  const isDark = theme === 'dark';

  return (
    <div className={`lantu-datepicker-wrap relative ${className}`}>
      <DatePicker
        selected={selected}
        onChange={(date) => onChange(date ? formatValue(date, mode) : '')}
        onInputClick={onOpen}
        onFocus={onOpen}
        onCalendarOpen={onOpen}
        onCalendarClose={onClose}
        onClickOutside={onClose}
        open={open}
        minDate={minDate ?? undefined}
        maxDate={maxDate ?? undefined}
        showTimeSelect={mode === 'datetime'}
        timeIntervals={15}
        timeFormat="HH:mm"
        timeCaption="时间"
        dateFormat={mode === 'datetime' ? 'yyyy-MM-dd HH:mm' : 'yyyy-MM-dd'}
        placeholderText={placeholder}
        disabled={disabled}
        showPopperArrow={false}
        todayButton="今天"
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
        className={`${nativeInputClass(theme)} ${compact ? 'min-h-[2rem] px-2.5 py-1.5 text-xs' : ''} pr-9`}
        calendarClassName={`lantu-datepicker-panel ${isDark ? 'lantu-datepicker-panel-dark' : 'lantu-datepicker-panel-light'}`}
        popperClassName="lantu-datepicker-popper"
        ariaLabelledBy={ariaLabel}
      />
      <CalendarDays
        size={15}
        className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 ${
          isDark ? 'text-slate-400' : 'text-slate-500'
        }`}
      />
    </div>
  );
};

