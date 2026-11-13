export const jsonToXlsxBlob = async (rows, sheetName = 'Sheet1', options = {}) => {
    const { moneyColumns = [], moneyFormat, autoFitColumns = false } = options;
    const mod = await import('xlsx');
    // Handle both module shapes (ESM namespace or CJS default interop)
    const XLSX = mod?.utils ? mod : mod.default;
    const worksheet = XLSX.utils.json_to_sheet(rows);

    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    if (headers.length > 0 && moneyColumns.length > 0 && moneyFormat) {
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        headers.forEach((header, colIndex) => {
            if (!moneyColumns.includes(header)) return;
            for (let row = 1; row <= range.e.r; row++) {
                const cell = worksheet[XLSX.utils.encode_cell({ r: row, c: colIndex })];
                if (cell && typeof cell.v === 'number') {
                    cell.t = 'n';
                    cell.z = moneyFormat;
                }
            }
        });
    }
    if (autoFitColumns && headers.length > 0) {
        worksheet['!cols'] = headers.map((header) => ({ wch: Math.max(header.length + 2, 14) }));
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/octet-stream' });
};
