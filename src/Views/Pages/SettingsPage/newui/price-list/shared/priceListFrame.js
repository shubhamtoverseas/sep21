import { createContext, useContext, useEffect } from "react";

/*
 * The Price List frame (27 Oct package, PL-UI1; layout of the package's reference Price List page): one page with a
 * section nav, the breadcrumb and the footer bar. The page shown tells the frame what the nav and the header show for
 * it — how many unsaved changes it has (the nav's dot, and Discard unsaved changes? before leaving), whether this user may
 * edit it (the View only tag), the alert under the title and, on an agency schedule, its breadcrumb — and opens other
 * Price List pages through it.
 */
export const PriceListFrameContext = createContext(null);

export const usePriceListFrame = () => useContext(PriceListFrameContext);

/**
 * A Price List page's state for the frame: its unsaved changes, whether this user may edit it, and the alert under the
 * title ("" for none).
 */
export const useFrameReport = (changes, canEdit, alert = "") => {
    const frame = usePriceListFrame();
    const report = frame?.report;
    useEffect(() => {
        if (!report) return undefined;
        report({ changes, canEdit, alert });
        return () => report({ changes: 0, canEdit: null, alert: "" });
    }, [report, changes, canEdit, alert]);
};

/** An agency schedule's breadcrumb (… › Overseas › Filipino · BGS): its label, and the way back to Overseas. */
export const useFrameCrumb = (label, onBack) => {
    const frame = usePriceListFrame();
    const setCrumb = frame?.setCrumb;
    useEffect(() => {
        if (!setCrumb) return undefined;
        setCrumb(label ? { label, onBack } : null);
        return () => setCrumb(null);
    }, [setCrumb, label, onBack]);
};

/** A link to another Price List page (asks first when this page has unsaved changes); null when it may not be opened. */
export const useFrameLink = (pageId) => {
    const frame = usePriceListFrame();
    return frame && frame.permitted(pageId) ? () => frame.go(pageId) : null;
};
