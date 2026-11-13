export const customStylesOfMultiSelect = (borderColor = '#979797') => ({
    multiValue: (base) => ({
        ...base,
    }),
    multiValueContainer: (base) => ({
        ...base,
    }),
    valueContainer: (base) => ({
        ...base,
        flexWrap: 'nowrap',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        maxHeight: '44px',
        padding: '2px 8px'
    }),
    control: (base) => ({
        ...base,
        minHeight: '44px',
        maxHeight: '44px',
        border: `1px solid ${borderColor}`,
        color: 'rgba(33, 33, 33, 1)',
        fontSize: '1rem',
    })
});