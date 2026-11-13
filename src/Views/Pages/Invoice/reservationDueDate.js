import dayjs from "dayjs";

/* Reservation Fee (user ruling 26 Oct 2026, Contract Invoice flow): the Remaining Balance Due Date and time are at least
   48 hours from now. The Invoice API refuses anything sooner with the same rule (maidmatch-contract
   domain/invoice/reservationFee.ts, RESERVATION_FEE_MIN_DUE_HOURS); exactly 48 hours is allowed. Times are the user's
   own, as the form sends them. */
export const RESERVATION_FEE_MIN_DUE_HOURS = 48;

/** the earliest due date and time that may be picked */
export const reservationEarliestDue = (now = new Date()) => dayjs(now).add(RESERVATION_FEE_MIN_DUE_HOURS, "hour");

/** the first day the date picker offers */
export const reservationMinDate = (now = new Date()) => reservationEarliestDue(now).startOf("day").toDate();

/** a picked day ("YYYY-MM-DD") and time ("HH:mm") less than 48 hours away; false until both are picked */
export const reservationDueTooSoon = (date, time, now = new Date()) => {
    if (!date || !time) return false;
    const due = dayjs(`${ date }T${ time }:00`);
    return !due.isValid() || due.isBefore(reservationEarliestDue(now));
};

/** whether the time picker offers a slot (its hours and minutes) on the picked day; every slot until a day is picked */
export const reservationTimeAllowed = (date, slot, now = new Date()) => !reservationDueTooSoon(date, dayjs(slot).format("HH:mm"), now);
