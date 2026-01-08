/**
 * ValueInput Component
 *
 * Dynamic value input that adapts based on field type and operator.
 */

import { useState } from 'react';
import { cn } from '@/lib/utils.ts';
import type { RuleOperator } from '@/api/types/customerSuccess.ts';
import type { FieldDefinition } from './FieldPicker.tsx';
import { operatorNeedsSecondValue, operatorNeedsNoValue } from './OperatorSelect.tsx';

interface ValueInputProps {
  field: FieldDefinition;
  operator: RuleOperator;
  value: unknown;
  value2?: unknown;
  onChange: (value: unknown) => void;
  onValue2Change?: (value: unknown) => void;
  className?: string;
}

export function ValueInput({
  field,
  operator,
  value,
  value2,
  onChange,
  onValue2Change,
  className,
}: ValueInputProps) {
  // No input needed for null operators
  if (operatorNeedsNoValue(operator)) {
    return (
      <div className={cn('px-3 py-2 text-sm text-gray-500 italic', className)}>
        No value needed
      </div>
    );
  }

  // Render based on field type
  const renderInput = (inputValue: unknown, inputOnChange: (v: unknown) => void, placeholder?: string) => {
    switch (field.type) {
      case 'number':
        return (
          <NumberInput
            value={inputValue as number | undefined}
            onChange={inputOnChange}
            placeholder={placeholder}
            className={className}
          />
        );

      case 'boolean':
        return (
          <BooleanInput
            value={inputValue as boolean | undefined}
            onChange={inputOnChange}
            className={className}
          />
        );

      case 'date':
        return (
          <DateInput
            value={inputValue as string | undefined}
            onChange={inputOnChange}
            className={className}
          />
        );

      case 'select':
        return (
          <SelectInput
            value={inputValue as string | undefined}
            options={field.options || []}
            onChange={inputOnChange}
            multiple={operator === 'in' || operator === 'not_in'}
            className={className}
          />
        );

      case 'string':
      default:
        return operator === 'in' || operator === 'not_in' ? (
          <MultiValueInput
            value={inputValue as string[] | undefined}
            onChange={inputOnChange}
            placeholder={placeholder}
            className={className}
          />
        ) : (
          <TextInput
            value={inputValue as string | undefined}
            onChange={inputOnChange}
            placeholder={placeholder}
            className={className}
          />
        );
    }
  };

  // For 'between' operator, show two inputs
  if (operatorNeedsSecondValue(operator)) {
    return (
      <div className="flex items-center gap-2">
        {renderInput(value, onChange, 'From')}
        <span className="text-gray-500 text-sm">and</span>
        {onValue2Change && renderInput(value2, onValue2Change, 'To')}
      </div>
    );
  }

  return renderInput(value, onChange);
}

// ============================================
// Input Components
// ============================================

interface TextInputProps {
  value: string | undefined;
  onChange: (value: unknown) => void;
  placeholder?: string;
  className?: string;
}

function TextInput({ value, onChange, placeholder, className }: TextInputProps) {
  return (
    <input
      type="text"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || 'Enter value...'}
      className={cn(
        'w-full px-3 py-2 text-sm rounded-lg border transition-colors',
        'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600',
        'text-gray-900 dark:text-white placeholder-gray-400',
        'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
        className
      )}
    />
  );
}

interface NumberInputProps {
  value: number | undefined;
  onChange: (value: unknown) => void;
  placeholder?: string;
  className?: string;
}

function NumberInput({ value, onChange, placeholder, className }: NumberInputProps) {
  return (
    <input
      type="number"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
      placeholder={placeholder || 'Enter number...'}
      className={cn(
        'w-full px-3 py-2 text-sm rounded-lg border transition-colors',
        'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600',
        'text-gray-900 dark:text-white placeholder-gray-400',
        'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
        className
      )}
    />
  );
}

interface BooleanInputProps {
  value: boolean | undefined;
  onChange: (value: unknown) => void;
  className?: string;
}

function BooleanInput({ value, onChange, className }: BooleanInputProps) {
  return (
    <div className={cn('flex gap-2', className)}>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={cn(
          'px-4 py-2 text-sm rounded-lg border transition-colors',
          value === true
            ? 'bg-primary text-white border-primary'
            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-primary'
        )}
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={cn(
          'px-4 py-2 text-sm rounded-lg border transition-colors',
          value === false
            ? 'bg-primary text-white border-primary'
            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-primary'
        )}
      >
        No
      </button>
    </div>
  );
}

interface DateInputProps {
  value: string | undefined;
  onChange: (value: unknown) => void;
  className?: string;
}

function DateInput({ value, onChange, className }: DateInputProps) {
  const [mode, setMode] = useState<'absolute' | 'relative'>('absolute');

  if (mode === 'relative') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <input
          type="number"
          value={typeof value === 'string' && value.startsWith('-') ? parseInt(value.slice(1)) : ''}
          onChange={(e) => onChange(`-${e.target.value}d`)}
          placeholder="Days"
          className="w-20 px-3 py-2 text-sm rounded-lg border bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
        <span className="text-sm text-gray-500">days ago</span>
        <button
          type="button"
          onClick={() => setMode('absolute')}
          className="text-xs text-primary hover:underline"
        >
          Use date
        </button>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <input
        type="date"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 px-3 py-2 text-sm rounded-lg border bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
      />
      <button
        type="button"
        onClick={() => setMode('relative')}
        className="text-xs text-primary hover:underline whitespace-nowrap"
      >
        Use relative
      </button>
    </div>
  );
}

interface SelectInputProps {
  value: string | string[] | undefined;
  options: { value: string; label: string }[];
  onChange: (value: unknown) => void;
  multiple?: boolean;
  className?: string;
}

function SelectInput({ value, options, onChange, multiple, className }: SelectInputProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedValues = multiple
    ? (Array.isArray(value) ? value : value ? [value] : [])
    : [];
  const singleValue = !multiple ? (value as string) : undefined;

  const handleSelect = (optionValue: string) => {
    if (multiple) {
      if (selectedValues.includes(optionValue)) {
        onChange(selectedValues.filter(v => v !== optionValue));
      } else {
        onChange([...selectedValues, optionValue]);
      }
    } else {
      onChange(optionValue);
      setIsOpen(false);
    }
  };

  const getLabel = (val: string) => options.find(o => o.value === val)?.label || val;

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full px-3 py-2 text-left text-sm rounded-lg border transition-colors',
          'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600',
          'hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary'
        )}
      >
        {multiple ? (
          selectedValues.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {selectedValues.map(v => (
                <span
                  key={v}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded"
                >
                  {getLabel(v)}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(v);
                    }}
                    className="hover:text-primary-hover"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <span className="text-gray-400">Select values...</span>
          )
        ) : (
          <span className={singleValue ? 'text-gray-900 dark:text-white' : 'text-gray-400'}>
            {singleValue ? getLabel(singleValue) : 'Select...'}
          </span>
        )}
        <svg
          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden">
          <div className="max-h-48 overflow-y-auto p-1">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={cn(
                  'w-full px-3 py-2 text-left text-sm rounded-lg transition-colors flex items-center justify-between',
                  'hover:bg-gray-100 dark:hover:bg-gray-700',
                  (multiple ? selectedValues.includes(option.value) : singleValue === option.value) && 'bg-primary/10 text-primary'
                )}
              >
                <span>{option.label}</span>
                {(multiple ? selectedValues.includes(option.value) : singleValue === option.value) && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface MultiValueInputProps {
  value: string[] | undefined;
  onChange: (value: unknown) => void;
  placeholder?: string;
  className?: string;
}

function MultiValueInput({ value, onChange, placeholder, className }: MultiValueInputProps) {
  const [inputValue, setInputValue] = useState('');
  const values = value || [];

  const addValue = () => {
    if (inputValue.trim() && !values.includes(inputValue.trim())) {
      onChange([...values, inputValue.trim()]);
      setInputValue('');
    }
  };

  const removeValue = (v: string) => {
    onChange(values.filter(val => val !== v));
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addValue();
            }
          }}
          placeholder={placeholder || 'Type and press Enter...'}
          className="flex-1 px-3 py-2 text-sm rounded-lg border bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
        <button
          type="button"
          onClick={addValue}
          className="px-3 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
        >
          Add
        </button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded"
            >
              {v}
              <button
                type="button"
                onClick={() => removeValue(v)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
