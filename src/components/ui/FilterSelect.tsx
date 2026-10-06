export interface FilterOption {
  value: string
  label: string
}

interface FilterSelectProps {
  label: string
  value: string
  options: FilterOption[]
  onChange: (value: string) => void
  /** Label for the "no filter" choice, whose value is an empty string. */
  allLabel?: string
}

export default function FilterSelect({ label, value, options, onChange, allLabel = 'All' }: FilterSelectProps) {
  return (
    <select className="filter-select" value={value} aria-label={label} onChange={(e) => onChange(e.target.value)}>
      <option value="">
        {label}: {allLabel}
      </option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
