import dayjs from 'dayjs';

export const changeDateFormate = (date) => {
    if (date)
        return dayjs(date).format('MM/DD/YYYY');
    else
        return "";
};

export const changeDynamicDateFormate = (date, format) => {
    if (date)
        return dayjs(date).format(format);
    else
        return "";
};

export const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};


export const getOrdinalSuffix = (number) => {
    const suffixes = ["th", "st", "nd", "rd"];
    const value = number % 100;
    const prefix = suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0];
    const text = number + "" + prefix;
    return text;
};

/* A payment-log record's type from its title (the Invoice API stores English titles), keyed as the reference recordVisuals */
export const paymentLogRecordType = (title = "") => {
    const s = String(title).toLowerCase();
    if (s.includes("exchange invoice created")) return "exchange_initiated";
    if (s.includes("invoice created")) return "invoice_created";
    if (s.includes("voided")) return s.includes("refund") ? "refund_voided" : "void";
    if (s.includes("unsettled")) return "marked_unsettled";
    if (s.includes("bad debt")) return "marked_bad_debt";
    if (s.includes("reverted")) return "revert";
    if (s.includes("reservation fee expired")) return "rf_expired";
    if (s.includes("remark")) return "remark_added";
    if (s.includes("remaining credit") && s.includes("refund")) return "surplus_refund";
    if (s.includes("remaining credit") && s.includes("written off")) return "surplus_write_off";
    if (s.includes("saved as credit")) return "surplus_credit";
    if (s.includes("confirm")) return "payment_confirmed";
    if (s.includes("payment approved")) return "payment_approved";
    if (s.includes("deposit") || s.includes("receipt") || s.includes("proof")) return "proof_uploaded";
    if (s.includes("write")) return "write_off";
    if (s.includes("adjust")) return "adjustment";
    if (s.includes("refund") && s.includes("approv")) return "refund_approved";
    if (s.includes("refund")) return "refund_initiated";
    if (s.includes("exchange")) return "exchange_initiated";
    if (s.includes("underpay")) return "underpayment_created";
    if (s.includes("payment")) return "payment_recorded";
    return "payment_recorded";
};

export const getFamilySize = () => {
    return [
        ...Array.from({ length: 19 }, (_, i) => ({
            id: i + 1,
            name: i + 1
        })),
        { id: "20+", name: "20 +" }
    ];
};

export const formatDateTime = (d) => d ? dayjs(d).format('DD MMM YYYY hh:mm A') : '—';

export const formatDate = (d) => d ? dayjs(d).format('DD MMM YYYY') : '—';

export const getInitials = (name) => (name || '').split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase();

/* Activity attribution: the automated actor is always lowercase "system", whatever case the API or the locale delivers
   (CURRENT_REQUIREMENTS Activity actor order ends in "system"; prototype activity rows carry actorName 'system'). Any other name passes through untouched. */
export const normalizeActorName = (name) => (/^\s*system\s*$/i.test(String(name ?? '')) ? 'system' : name);

export const formatRelativeTime = (target) => {
    const mins = target.diff(dayjs(), 'minute');
    const abs = Math.abs(mins);
    const prefix = mins >= 0 ? 'in ' : '';
    const suffix = mins >= 0 ? '' : ' ago';
    if (abs < 60) return prefix + Math.max(1, abs) + 'm' + suffix;
    if (abs < 1440) return prefix + Math.round(abs / 60) + 'h' + suffix;
    if (abs < 43200) return prefix + Math.round(abs / 1440) + 'd' + suffix;
    return prefix + Math.round(abs / 43200) + 'mo' + suffix;
};

export const hasPendingRefundChild = (invoice) =>
    (invoice?.childInvoices || []).some((c) => c.status === 8 && (c.invoice_type || '').includes('refund'));

/* Refund needs a refundable balance above HK$0 as the Invoice API computes it (10 Oct register #20: the money paid less
   every non-voided refund, full or partial) */
export const hasRefundableBalance = (invoice) => Number(invoice?.refundable?.amount) > 0;

/* Exchange needs a confirmed payment on the original invoice (10 Oct register #71): blocked while the Invoice API's Paid
   for it (`refundable.paid`, the figure the exchange credit is reckoned from) is HK$0 */
export const exchangeNeedsPayment = (invoice) => Boolean(invoice?.refundable) && Number(invoice.refundable.paid) <= 0;


export const formatHK = (n) => {
    if (n == null || n === '') return 'HK$0';
    const num = Number(n) || 0;
    const abs = Math.abs(num);
    const hasCents = Math.round(abs * 100) % 100 !== 0;
    const s = 'HK$' + abs.toLocaleString('en-US', {
        minimumFractionDigits: hasCents ? 2 : 0,
        maximumFractionDigits: hasCents ? 2 : 0,
    });
    return num < 0 ? `(${ s })` : s;
};

/* The detail body's signed amounts (reference formatHK): a negative reads "-HK$500"; Related Invoices rows keep
   formatHK's accounting parentheses */
export const formatHKMinus = (n) => (Number(n) < 0 ? `-${ formatHK(Math.abs(Number(n))) }` : formatHK(n));

export const toNumberOrNull = (value) => {
    const num = Number(value);
    return isNaN(num) ? null : num;
};

export const toNonZeroNumberOrNull = (value) => {
    const num = toNumberOrNull(value);
    return num === 0 ? null : num;
};

export const formatAmountUSD = (amount) => {
    if (typeof amount !== 'number') return amount;
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const preventAlphabetsOnDatePicker = (e) => {
  // Block typing alphabets
  if (e.type === 'keydown') {
    if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
      e.preventDefault();
    }
  }

  // Block pasting alphabets
  if (e.type === 'paste') {
    const pastedText = e.clipboardData.getData('text');
    if (/[a-zA-Z]/.test(pastedText)) {
      e.preventDefault();
    }
  }
};

export const calculateShiftDuration = (start, end) => {
    if (!start || !end) return '-';
    const startMs = new Date(start).getTime();
    const endMs   = new Date(end).getTime();
    if (isNaN(startMs) || isNaN(endMs)) return '-';

    const diffMs    = endMs > startMs ? endMs - startMs : endMs + 86400000 - startMs;
    const totalMins = Math.round(diffMs / (1000 * 60));

    const decimalHours = totalMins / 60;
    return parseFloat(decimalHours.toFixed(2)).toString();
};

function charValue(ch) {
    if (ch >= "0" && ch <= "9") return parseInt(ch, 10);
    return ch.toUpperCase().charCodeAt(0) - "A".charCodeAt(0) + 10;
    // A=10, B=11, ..., X=33, Y=34, Z=35
}

export const validateHKIDStripped = (raw) => validateHKID((raw || '').replace(/[()]/g, ''));

export const validateHKID = (raw) => {
    if (!raw || raw.trim() === "")
        return { valid: false, error: "HKID cannot be empty." };

    let id = raw.trim().toUpperCase().replace(/\s/g, "").replace(/\(([0-9A])\)$/, "$1");
    const len = id.length;

    if (len !== 8 && len !== 9)
        return { valid: false, error: `Invalid length (${ len }). Must be 8 or 9 characters.`, formatted: id, hkid: id };

    if (!/^[A-Z]/.test(id))
        return { valid: false, error: "First character must be a letter (A–Z).", formatted: id, hkid: id };

    if (len === 8) {
        if (!/^[A-Z][0-9]{6}[0-9A]$/.test(id))
            return { valid: false, error: "8-char format: Letter + 6 digits + check digit (0–9 or A).", formatted: id, hkid: id };
    } else {
        if (id[1] !== "X")
            return { valid: false, error: "9-char HKID: position 2 must be 'X'.", formatted: id, hkid: id };
        if (!/^[A-Z]X[0-9]{6}[0-9A]$/.test(id))
            return { valid: false, error: "9-char format: Letter + X + 6 digits + check digit (0–9 or A).", formatted: id, hkid: id };
    }

    // Weighted sum (standard HKID check digit, prototype v28HkidValid / U-0399): the eight positions before the check
    // digit take weights 9..2; a single-letter prefix is padded with a leading space worth 36 (so A123456(3) is valid).
    const HKID_SPACE_VALUE = 36;
    const body = len === 8 ? [HKID_SPACE_VALUE, ...id.slice(0, 7).split("").map(charValue)] : id.slice(0, 8).split("").map(charValue);
    const weights = [9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 8; i++) {
        sum += body[i] * weights[i];
    }

    let expected = 11 - (sum % 11);
    if (expected === 10) expected = "A";
    else if (expected === 11) expected = "0";
    else expected = String(expected);

    if (id[len - 1] !== expected)
        return { valid: false, error: `Check digit mismatch: expected '${ expected }', got '${ id[len - 1] }'.`, formatted: id, hkid: id };

    return { valid: true, formatted: `${ id.slice(0, len - 1) }(${ id[len - 1] })`, hkid: id };
}

export const calculatePrice = async (reqBody) => {
    try {
        let final_price = 0;
        let {
            base_price = 0,
            type = '',
            amount = 0,
            amount_type = '',
        } = reqBody || {};

        base_price = Number(base_price) || 0;
        amount = Number(amount) || 0;
        if (type === "credit") {
            final_price = base_price - amount;
        } else if (type === "custom_discount") {
            if (amount_type === "percentage") {
                final_price = Number((base_price - (base_price * (amount / 100))).toFixed(2));
            } else if (amount_type === "value") {
                final_price = base_price - amount;
            } else {
                final_price = base_price;
            }
        } else {
            final_price = base_price;
        }
        return { final_price };
    } catch (error) {
        return { final_price: 0 };
    }
};
export const toTitleCase = (value) => String(value ?? "").toLowerCase().replace(/(^|\s)\S/g, (match) => match.toUpperCase());

/** Route table mixes "settings/x" and "/settings/x"; always yield an absolute path. */
export const absoluteRoute = (path) => (String(path || "").startsWith("/") ? path : `/${path}`);

/** Headings must never render ALL CAPS (locale/OTA strings sometimes are): title-case only when the whole string is uppercase. */
export const headingCase = (value) => {
    const text = String(value ?? "");
    return text && text === text.toUpperCase() && text !== text.toLowerCase() ? toTitleCase(text) : text;
};

export const launchWhatsAppApp = (scheme) => {
    try { window.location.assign(scheme); return { opened: true }; } catch { return { opened: false }; }
};
