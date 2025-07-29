import React from 'react';
import Select, { Props as SelectProps, StylesConfig, components } from 'react-select';
import { ExternalLink } from 'lucide-react';
import { cn } from "@/lib/utils";

export interface ReactSelectOption {
  label: string;
  value: string;
  token?: any;
}

interface ReactSelectProps extends Omit<SelectProps<ReactSelectOption, false>, 'options' | 'value' | 'onChange'> {
  options: ReactSelectOption[];
  value?: string;
  onValueChange?: (value: string | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  customOptionRenderer?: (option: ReactSelectOption) => React.ReactNode;
  getExplorerUrl?: (token: any) => string;
}

const customStyles: StylesConfig<ReactSelectOption, false> = {
  control: (provided, state) => ({
    ...provided,
    minHeight: '40px',
    border: '1px solid hsl(var(--border))',
    borderRadius: '6px',
    backgroundColor: 'hsl(var(--background))',
    boxShadow: state.isFocused ? '0 0 0 2px hsl(var(--ring))' : 'none',
    '&:hover': {
      borderColor: 'hsl(var(--border))',
    },
  }),
  input: (provided) => ({
    ...provided,
    color: 'hsl(var(--foreground))',
  }),
  placeholder: (provided) => ({
    ...provided,
    color: 'hsl(var(--muted-foreground))',
  }),
  singleValue: (provided) => ({
    ...provided,
    color: 'hsl(var(--foreground))',
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '6px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    zIndex: 50,
  }),
  menuList: (provided) => ({
    ...provided,
    padding: '4px',
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isFocused 
      ? 'hsl(var(--accent))' 
      : state.isSelected 
        ? 'hsl(var(--primary))' 
        : 'transparent',
    color: state.isSelected 
      ? 'hsl(var(--primary-foreground))' 
      : 'hsl(var(--foreground))',
    borderRadius: '4px',
    margin: '2px 0',
    '&:active': {
      backgroundColor: 'hsl(var(--accent))',
    },
  }),
  dropdownIndicator: (provided) => ({
    ...provided,
    color: 'hsl(var(--muted-foreground))',
    '&:hover': {
      color: 'hsl(var(--foreground))',
    },
  }),
  clearIndicator: (provided) => ({
    ...provided,
    color: 'hsl(var(--muted-foreground))',
    '&:hover': {
      color: 'hsl(var(--foreground))',
    },
  }),
  noOptionsMessage: (provided) => ({
    ...provided,
    color: 'hsl(var(--muted-foreground))',
  }),
  loadingMessage: (provided) => ({
    ...provided,
    color: 'hsl(var(--muted-foreground))',
  }),
};

// Custom option component for tokens with explorer link
const CustomOption = ({ data, getExplorerUrl, ...props }: any) => {
  const handleExplorerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.token && getExplorerUrl) {
      const url = getExplorerUrl(data.token);
      window.open(url, '_blank');
    }
  };

  return (
    <components.Option {...props}>
      <div className="flex items-center justify-between w-full">
        <span className="flex-1">{data.label}</span>
        {data.token && getExplorerUrl && (
          <button
            onClick={handleExplorerClick}
            className="ml-2 p-1 rounded hover:bg-muted/50 flex-shrink-0"
            title="View on explorer"
          >
            <ExternalLink className="h-3 w-3" />
          </button>
        )}
      </div>
    </components.Option>
  );
};

// Custom SingleValue component with explorer link for selected token
const CustomSingleValue = ({ data, getExplorerUrl, ...props }: any) => {
  const handleExplorerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.token && getExplorerUrl) {
      const url = getExplorerUrl(data.token);
      window.open(url, '_blank');
    }
  };

  return (
    <components.SingleValue {...props}>
      <div className="flex items-center gap-2">
        {data.token && getExplorerUrl && (
          <button
            onClick={handleExplorerClick}
            className="p-1 rounded hover:bg-muted/50 flex-shrink-0"
            title="View on explorer"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        )}
        <span className="truncate">{data.label}</span>
      </div>
    </components.SingleValue>
  );
};

export const ReactSelect = React.forwardRef<
  any,
  ReactSelectProps
>(({ options, value, onValueChange, placeholder, className, disabled, customOptionRenderer, getExplorerUrl, ...props }, ref) => {
  const selectedOption = options.find(option => option.value === value) || null;

  const handleChange = (newValue: ReactSelectOption | null) => {
    onValueChange?.(newValue?.value);
  };

  // Use custom components if needed
  const selectComponents = getExplorerUrl ? {
    Option: (props: any) => <CustomOption {...props} getExplorerUrl={getExplorerUrl} />,
    SingleValue: (props: any) => <CustomSingleValue {...props} getExplorerUrl={getExplorerUrl} />
  } : {};

  return (
    <div className={cn("w-full", className)}>
      <Select
        ref={ref}
        options={options}
        value={selectedOption}
        onChange={handleChange}
        placeholder={placeholder}
        isDisabled={disabled}
        isClearable
        isSearchable
        styles={customStyles}
        components={selectComponents}
        noOptionsMessage={() => "No options found"}
        {...props}
      />
    </div>
  );
});

ReactSelect.displayName = "ReactSelect";