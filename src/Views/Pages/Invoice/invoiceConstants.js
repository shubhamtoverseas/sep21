/* Invoice module constants */
import constData from "../../../components/ReusableComponents/constants";

const R = constData.LISTING_TRACK_ROLES;

/* Invoice dashboard column tracks — SR-06 roles (full-page profile); both name columns share one track */
export const INVOICE_LIST_TRACKS = Object.freeze({
    type: { role: R.STATUS, width: 140 },
    status: { role: R.STATUS, width: 180 }, /* the badge and its qualifier */
    payment: { role: R.STATUS, width: 140 },
    date: { role: R.DATE, width: 112 },
    ref: { role: R.REF, width: 160 }, /* sheet row 8: the full reference fits (longest stored: 20 characters) */
    name: { role: R.NAME, width: 200 },
    code: { role: R.REF, width: 140 },
    amount: { role: R.AMOUNT, width: 124 },
    staff: { role: R.STAFF, width: 132 },
    branch: { role: R.STAFF, width: 132 },
    activity: { role: R.DATE, width: 112 },
});
