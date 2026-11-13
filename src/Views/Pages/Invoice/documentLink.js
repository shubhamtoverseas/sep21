/* SEC-28 (performance & security track, approved 22 Oct): a stored payment document's address is opened or downloaded
   only when it is a web address (http or https), as PaymentDocumentCard already requires. The Invoice API sends each one
   as the storage address of the file; anything else (javascript:, data:, a bare path) is not followed. */
const WEB_ADDRESS = /^https?:\/\//i;

/** the address when it may be followed, else null */
export const safeDocumentUrl = (url) => (typeof url === "string" && WEB_ADDRESS.test(url) ? url : null);

/** opens a stored document in a new tab, as the screens did; an address that is not http(s) is not opened */
export const openDocument = (url) => {
    const safe = safeDocumentUrl(url);
    if (safe) window.open(safe, "_blank", "noopener");
};

/** downloads a stored document through a temporary link, as the screens did; an address that is not http(s) is not followed */
export const downloadDocument = (url, fileName) => {
    const safe = safeDocumentUrl(url);
    if (!safe) return;
    const link = document.createElement("a");
    link.href = safe;
    link.download = fileName;
    link.target = "_blank";
    link.click();
};
