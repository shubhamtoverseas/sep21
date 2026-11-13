import fs from "fs";
import path from "path";

/* UI Step 8 — the invoice list (UI verification 14 Oct, rows A-01 … A-96): page header, KPI strip, selection bar, filter
   bar and table follow the prototype (Invoice_Dashboard.html). UI only: every fetch, filter and action sends what it
   sent before. */

const SRC = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(SRC, rel), "utf8");
const EN = JSON.parse(fs.readFileSync(path.resolve(SRC, "../public/locales/en/translation.json"), "utf8"));

const INV = "Views/Pages/Invoice/";
const PAGE = read(INV + "Invoice.js");
const CSS = read(INV + "InvoiceList.module.css");
const rule = (selector) => {
    const at = CSS.indexOf(selector + " {");
    return at < 0 ? "" : CSS.slice(at, CSS.indexOf("}", at) + 1);
};

describe("UI Step 8 · page header, KPI strip, selection bar, foot", () => {
    test("A-01, A-03: the shared dashboard title; 16px from the header rule to the KPI strip", () => {
        expect(CSS).toContain(".invoiceList .pageTitle { font-size: 24px; font-weight: 650; letter-spacing: -0.022em; line-height: 1.15; }");
        expect(CSS).toContain(".invoiceList .pageHeader { margin-bottom: 4px; }");
        // the shared listing sheet keeps the other listings' title
        expect(rule(".pageTitle")).toMatch(/font-size: 22px;\s+font-weight: 600;/);
        expect(PAGE).toContain("<div className={`${ styles.pageWrap } ${ styles.invoiceList }`}>");
        expect(rule(".pageWrap")).toContain("gap: var(--space-3);");
    });

    test("A-02: 'Last refresh HH:MM' under the subtitle, from when the page last loaded the list", () => {
        expect(PAGE).toContain("useEffect(() => { setRefreshedAt(new Date()); }, [invoices]);");
        expect(PAGE).toContain("{ refreshedAt && <div className={ styles.pageStats }>{ t('key_last_refresh') } <b>{ dayjs(refreshedAt).format('HH:mm') }</b></div> }");
        expect(EN.key_last_refresh).toBe("Last refresh");
        expect(rule(".pageStats")).toMatch(/gap: 4px 18px;\s+margin-top: 5px;\s+font-size: 11\.5px;\s+color: var\(--text-3\);/);
        expect(rule(".pageStats b")).toMatch(/color: var\(--text-1\);\s+font-weight: 600;\s+font-variant-numeric: tabular-nums;/);
    });

    test("A-05: the New invoice menu takes the shared menu values", () => {
        expect(rule(".newInvoiceMenu")).toMatch(/top: calc\(100% \+ 6px\);[\s\S]*border-radius: 8px;\s+box-shadow: var\(--shadow-2\);\s+min-width: 220px;\s+padding: 4px;/);
        expect(rule(".newInvoiceMenuHeader")).toMatch(/font-weight: 600;[\s\S]*padding: 4px 8px;/);
        expect(rule(".newInvoiceMenuItem")).toMatch(/gap: 8px;\s+padding: 6px 8px;\s+border-radius: 5px;\s+font-size: 12\.5px;\s+color: var\(--text-2\);/);
        expect(CSS).toContain(".newInvoiceMenuItem svg { color: var(--text-3); flex-shrink: 0; }");
    });

    test("A-07 … A-10: KPI cells 8px 14px with line-2 dividers, a second-row rule at 1100px, 10px below the strip", () => {
        expect(rule(".statItem")).toContain("padding: 8px 14px;");
        expect(CSS).toContain(".statItem + .statItem { border-left: 1px solid var(--line-2); }");
        expect(rule(".statsStrip")).not.toMatch(/gap: 0 1px|background: var\(--line-1\)/);
        expect(rule(".statsStrip")).toContain("margin-bottom: -2px;");
        expect(CSS).toMatch(/@media \(max-width: 1100px\) \{\s+\.statsStrip \{ grid-template-columns: repeat\(3, 1fr\); \}\s+\.statItem:nth-child\(3n \+ 1\) \{ border-left: 0; \}\s+\.statItem:nth-child\(n \+ 4\) \{ border-top: 1px solid var\(--line-2\); \}/);
    });

    test("A-12: KPI amounts are rounded, negatives in parentheses, '—' for no value", () => {
        expect(PAGE).toContain("const fmtAmt = useCallback((n) => (n == null || n === '' ? '—' : formatHK(Math.round(Number(n)))), []);");
        const { formatHK } = require("../../utils/utils");
        expect([formatHK(Math.round(-1200.4)), formatHK(Math.round(2500.6))]).toEqual(["(HK$1,200)", "HK$2,501"]);
    });

    test("A-13, A-14: '3 invoices selected · all pending paid · [actions]'", () => {
        expect(PAGE).toContain("{ (isSelectedItems.length === 1 ? t('key_invoice') : t('key_invoices')).toLowerCase() } selected");
        expect(PAGE).toMatch(/<\/span>\s+<span className=\{styles\.selectionSep\}>·<\/span>\s+<div className=\{styles\.selectionActions\}>/);
        expect(rule(".selectionBarInfo")).not.toContain("flex: 1;");
    });

    test("A-89: the foot is a strip under the table card (12px text-3), no longer inside it", () => {
        expect(PAGE).not.toContain("footer={");
        expect(PAGE).toMatch(/<\/Suspense>\s+<div className=\{styles\.tableFoot\}>/);
        const table = read(INV + "InvoiceTable.js");
        expect(table).not.toMatch(/\{ footer \}|footer: PropTypes|isMultiCheck, footer,/);
        expect(CSS).toContain(".invoiceList .tableFoot { font-size: 12px; color: var(--text-3); }");
    });
});

describe("UI Step 8 · filter bar", () => {
    const FILTER = read(INV + "InvoiceFilter.js");
    const popover = FILTER.slice(FILTER.indexOf("className={filterStyles.filterDropdownHeader}"), FILTER.indexOf("{/* Actions */}"));
    const labels = [...popover.matchAll(/<label className=\{filterStyles\.filterLabel\}>\{translation\('([a-z_]+)'\)\}<\/label>/g)].map((m) => m[1]);

    test("A-19 … A-22: 'Search invoices…', the ? help with its popover, 8px / 28px insets, a light focus wash", () => {
        expect(FILTER).toContain("placeholder={translation('key_search_invoices')}");
        expect(EN.key_search_invoices).toBe("Search invoices…");
        expect(EN.key_invoice_search_help).toBe("Search by Invoice Ref, employer, worker, code or amount.");
        expect(FILTER).toMatch(/onChange=\{onSearch\}\s+\/>\s+<SearchHelp \/>/);
        expect(FILTER).toContain("<span id=\"invoice-search-help\" className={filterStyles.searchHelpPop} role=\"tooltip\">{translation('key_invoice_search_help')}</span>");
        expect(FILTER).toContain("if (e.key !== 'Escape' || !open) return;");
        expect(read("components/Icon/Icon.jsx")).toContain("  help: <><circle cx=\"12\" cy=\"12\" r=\"9\" />");
        expect(CSS).toContain(".invoiceList .controlsSearch > svg { left: 8px; }");
        expect(CSS).toContain(".invoiceList .searchHelpBtn svg { position: static; transform: none; color: inherit; }");
        expect(CSS).toContain(".invoiceList .controlsSearchInput { padding: 0 34px 0 28px; }");
        expect(CSS).toContain(".invoiceList .controlsSearchInput:focus { box-shadow: 0 0 0 2px var(--accent-bg); }");
        // the shared search keeps the other listings' values
        expect(rule(".controlsSearchInput")).toContain("padding: 0 12px 0 34px;");
        expect(CSS).toContain(".searchHelpPop { display: none; position: absolute; top: calc(100% + 8px); right: -6px; z-index: 40; width: 300px;");
    });

    test("A-24 … A-26, A-38: Filters / Columns at 0 10px, the .kbd count chip, the popover on the Filters button, Escape closes it", () => {
        expect(CSS).toContain(".invoiceList .controlsRow .filterCtl { padding: 0 10px; gap: 6px; }");
        expect(rule(".controlsRow .filterCtl")).not.toContain("padding");
        expect(rule(".filterCountBadge")).toMatch(/border-radius: 3px;[\s\S]*padding: 1px 4px;/);
        expect(rule(".filterCountBadge")).not.toContain("margin-left");
        expect(FILTER).toContain("setFilterPopPos({ top: btnRect.bottom - wrapRect.top + 6, left: btnRect.left - wrapRect.left });");
        expect(FILTER).toContain("const handleEscape = (e) => { if (e.key === 'Escape') setShowFiltersPanel(false); };");
    });

    test("A-30, A-32 … A-36: reference fields first in the reference order, 'Status' / 'Staff', 'All', 36px controls", () => {
        expect(labels.slice(0, 6)).toEqual(["key_status", "key_contract_invoice_status", "key_payment_method", "key_flags_relationships", "key_staff", "key_branch"]);
        expect(labels.slice(6)).toEqual(["key_date_range", "key_location", "key_nationality", "key_worker_type", "key_code", "key_contract_category", "key_contract_status", "key_type_internal", "key_sort_by"]);
        expect((popover.match(/placeholder=\{translation\('key_all'\)\}/g) || []).length).toBe(13);
        expect(popover).not.toMatch(/placeholder="Any /);
        expect(EN.key_any_flag).toBeUndefined();
        expect(FILTER).toContain("    minHeight: '36px',");
        expect(FILTER).toMatch(/color: 'var\(--text-4\)',\s+whiteSpace: 'nowrap',/);
    });

    test("A-39: the Columns chooser ends with a 'Clear' that turns every column back on", () => {
        expect(FILTER).toContain("<button type=\"button\" onClick={onReset}>{translation('key_clear')}</button>");
        expect(FILTER).toContain("onReset={() => handleFieldItems((kababOptions[0]?.subItem ?? []).map(optionValue))}");
        expect(CSS).toContain(".columnsFoot { border-top: 1px solid var(--line-2); margin-top: 4px; padding: 4px 4px 2px; }");
    });

    test("A-41 … A-49: the applied strip — plain 'Applied:', 'Clear filters', reference spacing, chip keys", () => {
        expect(rule(".appliedStrip")).toMatch(/gap: 8px;\s+padding: 8px 16px;\s+border-top: 1px solid var\(--line-2\);/);
        expect(rule(".appliedLabel")).toMatch(/font-size: 12px;\s+color: var\(--text-4\);\s+margin-right: 4px;/);
        expect(rule(".appliedLabel")).not.toMatch(/uppercase|font-weight/);
        expect(FILTER).toContain("onClick={clearAllFilters}>{translation('key_clear_filters')}</button>");
        expect(rule(".clearAll")).toMatch(/padding: 0;\s+font-size: 11\.5px;/);
        expect(rule(".filterChip")).toMatch(/border-radius: 4px;\s+padding: 2px 4px 2px 8px;/);
        expect(CSS).toContain(".filterChipK { color: var(--text-3); margin-right: 4px; }");
        expect(rule(".filterChipX")).toMatch(/border-radius: 3px;\s+color: var\(--text-4\);/);
        expect(FILTER).toContain("{ key: 'contract_status', k: 'Approval', options: contractGlobalOptions },");
        expect(FILTER).toContain("chips.push({ id: 'worker_type', k: 'Worker Type', v: opt.label");
    });
});

describe("the shared listing sheet", () => {
    test("every class a page reads from InvoiceList.module.css is defined in it (the sheet is shared by the other listings)", () => {
        const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]));
        const users = walk(path.join(SRC, "Views")).concat(walk(path.join(SRC, "components"))).filter((f) => /\.jsx?$/.test(f));
        const missing = [];
        let readers = 0;
        for (const file of users) {
            const s = fs.readFileSync(file, "utf8");
            const imp = s.match(/import (\w+) from ["'][./]*(?:Views\/Pages\/Invoice\/|Invoice\/|\.\/)?InvoiceList\.module\.css["']/);
            if (!imp) continue;
            readers += 1;
            for (const m of s.matchAll(new RegExp(`\\b${ imp[1] }\\.([A-Za-z0-9_]+)`, "g"))) {
                if (!new RegExp(`\\.${ m[1] }\\b`).test(CSS)) missing.push(`${ path.relative(SRC, file) }: ${ m[1] }`);
            }
        }
        expect(readers).toBeGreaterThan(50);
        expect([...new Set(missing)]).toEqual([]);
    });
});

describe("UI Step 8 · table", () => {
    const TABLE = read(INV + "InvoiceTable.js");
    const COLS = read(INV + "InvoiceListTableColumns.js");

    test("A-51, A-52, A-54: a 38px selection column, the only pinned one; every header cell on bg-subtle (invoice list only)", () => {
        expect(TABLE).not.toContain("stickyCol2");
        expect(CSS).not.toContain("stickyCol2");
        expect(CSS).toContain(".invoiceList .tableCard tbody td:first-child { padding: 0 8px !important; width: 38px; }");
        expect(CSS).toContain(".invoiceList .tableCard thead th { padding: 0 11px !important; background: var(--bg-subtle) !important; }");
        // the shared listing sheet keeps the other listings' 32px selection column
        expect(CSS).toMatch(/\.tableCard tbody td:first-child \{\s+padding: 0 8px !important;\s+text-align: center;\s+width: 32px;/);
    });

    test("A-55 … A-58, A-60: sortable headers — text-1 when sorted, bg-sunken hover, a 10px icon, next-action title, Enter / Space; ascending → descending → cleared", () => {
        expect(TABLE).toContain("${ col.sortKey ? styles.thSortable : '' } ${ sorted ? styles.thSorted : '' }");
        expect(TABLE).toContain(": sorted === 'DESC' ? `Clear sort on ${ col.header }, restore the default order`");
        expect(TABLE).toContain("tabIndex={ col.sortKey ? 0 : undefined }");
        expect(TABLE).toContain("title={ nextSort }");
        expect(TABLE).toContain("<Icon name={name} size={10} strokeWidth={1.8} />");
        expect(TABLE).not.toContain("marginLeft: '4px'");
        expect(CSS).toContain(".invoiceList .tableCard thead th.thSortable:hover { background: var(--bg-sunken) !important; color: var(--text-2) !important; }");
        expect(CSS).toContain(".invoiceList .tableCard thead th.thSorted:hover { color: var(--text-1) !important; }");
        expect(PAGE).toContain("const clear = current === 'DESC';");
        // the filters as last set (performance track A-04: the sort handler stays the same while the search text changes)
        expect(PAGE).toContain("? { ...filtersRef.current, sort_by: constData.invoiceFilters.sort_by, sort_order: constData.invoiceFilters.sort_order, page: 1 }");
    });

    test("A-61 … A-63: rows open from the keyboard with a focus ring; --bg-selected rows; the reference .cb", () => {
        expect(TABLE).toContain("onKeyDown={ (e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); entityClick(row); } } }");
        expect(CSS).toContain(".invoiceList .tableCard tbody tr:focus-visible { outline: 2px solid #2563eb; outline-offset: -2px; }");
        expect(CSS).toContain(".invoiceList .rowSelected:hover td { background: var(--bg-selected) !important; }");
        expect(CSS).toContain(".invoiceList .cb { width: 16px; height: 16px; border-width: 1.5px; border-radius: 3px; }");
        expect(TABLE).toContain("<Icon name=\"check\" size={11} strokeWidth={2.4} />");
    });

    test("A-64, A-65, A-67, A-68: reference column widths", () => {
        const { INVOICE_LIST_TRACKS } = require("../../Views/Pages/Invoice/invoiceConstants");
        expect([INVOICE_LIST_TRACKS.type.width, INVOICE_LIST_TRACKS.payment.width, INVOICE_LIST_TRACKS.status.width, INVOICE_LIST_TRACKS.name.width, INVOICE_LIST_TRACKS.amount.width])
            .toEqual([140, 140, 180, 200, 124]);
    });

    test("A-40, A-73, A-75: 'Activity'; the payment tooltip; a missing date is the muted dash", () => {
        expect(EN.key_last_activity).toBe("Activity");
        expect(COLS).toContain("const review = row?.status === 2 ? t('key_payment_review_pending') : confirmed ? t('key_payment_confirmed') : undefined;");
        expect(COLS).toContain("<span className={ styles.paymentCell } title={ review }>");
        expect(COLS).toMatch(/: <span className=\{ styles\.mutedDash \}>—<\/span>,\s+\},\s+\{\s+\/\* Invoice Ref/);
    });

    test("A-76 … A-83: names 500, code links 12px / 400 with Enter and a focus ring, 'Open … Details — CODE', plain codes 12px / 400", () => {
        expect(CSS).toContain(".entityCell { color: var(--text-1); font-size: 13px; font-weight: 500; line-height: 19.5px; }");
        expect(CSS).toContain(".employerCell { color: var(--text-1); font-size: 13px; font-weight: 500; line-height: 19.5px; }");
        expect(CSS).toContain(".zhSub { color: inherit; }");
        expect(CSS).toContain(".invoiceList .codeLink { font-size: 12px; font-weight: 400; line-height: 18px; }");
        expect(CSS).toContain(".invoiceList .codeLink:hover { text-decoration: none; }");
        expect(CSS).toContain(".invoiceList .codeLink:focus-visible { outline: 2px solid #2f6fec; outline-offset: 2px; border-radius: 2px; background: #edf2ff; }");
        expect(COLS).toContain("title={ `${ t('key_open') } ${ t('key_worker_details') } — ${ code }` }");
        expect(COLS).toContain("title={ `${ t('key_open') } ${ t('key_employer_details') } — ${ code }` }");
        expect((COLS.match(/onKeyDown=\{ \(e\) => \{ if \(e\.key === 'Enter'\)/g) || []).length).toBe(2);
        expect(rule(".codeNeutral")).toMatch(/font-size: 12px;\s+font-weight: 400;\s+line-height: 18px;/);
    });

    test("A-84 … A-87: one neutral avatar with 10.5px initials, 'First S.' with the full name as title, Branch in the cell colour", () => {
        expect(COLS).not.toMatch(/hueOf|AVATAR_HUES/);
        expect(COLS).toContain("<span className={ styles.csAvatar }>{ initialsOf(row.staff_name) }</span>");
        expect(COLS).toContain("<span className={ styles.staffName } title={ row.staff_name }>{ abbrevOwner(row.staff_name) }</span>");
        expect(CSS).toContain(".invoiceList .csAvatar { font-size: 10.5px; background: oklch(0.96 0.008 250); color: oklch(0.46 0.022 250); border-color: oklch(0.89 0.012 250); }");
        expect(COLS).toMatch(/render: \(row\) => row\?\.branch_name\s+\? row\.branch_name\s+:/);
        const src = COLS.slice(COLS.indexOf("const abbrevOwner"), COLS.indexOf("};", COLS.indexOf("const abbrevOwner")) + 2);
        const abbrevOwner = new Function(`${ src.replace("const abbrevOwner =", "return") }`)();
        expect([abbrevOwner("Linda Wong"), abbrevOwner("Mary Ann Chan"), abbrevOwner("Cher"), abbrevOwner("Chan 陳")]).toEqual(["Linda W.", "Mary C.", "Cher", "Chan 陳"]);
    });
});
