export function SearchFilterBar({
  searchValue,
  onSearchChange,
  onFilterChange,
  searchLabel = 'Search',
  searchMaxLength,
  filters = [],
}) {
  return (
    <div className="search-filter-bar">
      <div className="search-field">
        <label className="visually-hidden" htmlFor="table-search">
          {searchLabel}
        </label>
        <input
          id="table-search"
          maxLength={searchMaxLength}
          type="search"
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchLabel}
        />
      </div>
      {filters.map((filter) => (
        <div className="filter-field" key={filter.name}>
          <label htmlFor={`filter-${filter.name}`}>{filter.label}</label>
          <select
            id={`filter-${filter.name}`}
            value={filter.value}
            onChange={(event) => onFilterChange(filter.name, event.target.value)}
          >
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  )
}
