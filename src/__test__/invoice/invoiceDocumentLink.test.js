import React from "react";
import fs from "fs";
import path from "path";
import { render, screen, fireEvent } from "@testing-library/react";
import { safeDocumentUrl, openDocument, downloadDocument } from "../../Views/Pages/Invoice/documentLink";
import ApprovePaymentModal from "../../components/Layout/popups/invoice-popups/ApprovePaymentModal";

/* SEC-28 (performance & security track, approved 22 Oct): the refund and exchange screens, the proof preview and the
   approve / mark-status popups followed a stored payment document's address as it came — into an <a href> or
   window.open — with no scheme check. They now go through documentLink, which follows a web address (http / https)
   exactly as before and nothing else. */

const WEB = "https://bucket.example/invoices/payment/receipt.pdf";
const NOT_WEB = ["javascript:alert(1)", "JavaScript:alert(1)", " javascript:alert(1)", "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)", "/invoices/payment/receipt.pdf", "", null, undefined, {}];

afterEach(() => jest.restoreAllMocks());

const captureLinks = () => {
    const made = [];
    const create = document.createElement.bind(document);
    jest.spyOn(document, "createElement").mockImplementation((tag, ...rest) => {
        const element = create(tag, ...rest);
        made.push(element);
        return element;
    });
    const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    return { made, click };
};

test("a web address is opened and downloaded exactly as the screens did", () => {
    const open = jest.spyOn(window, "open").mockImplementation(() => null);
    openDocument(WEB);
    expect(open).toHaveBeenCalledWith(WEB, "_blank", "noopener");

    const { made, click } = captureLinks();
    downloadDocument("http://bucket.example/r.png", "r.png");
    expect(made).toHaveLength(1);
    expect([made[0].href, made[0].download, made[0].target]).toEqual(["http://bucket.example/r.png", "r.png", "_blank"]);
    expect(click).toHaveBeenCalledTimes(1);
    expect(safeDocumentUrl(WEB)).toBe(WEB);
});

test("any other address is neither opened nor downloaded", () => {
    const open = jest.spyOn(window, "open").mockImplementation(() => null);
    const { made, click } = captureLinks();
    for (const url of NOT_WEB) {
        expect(safeDocumentUrl(url)).toBeNull();
        openDocument(url);
        downloadDocument(url, "x.pdf");
    }
    expect(open).not.toHaveBeenCalled();
    expect(made).toHaveLength(0);
    expect(click).not.toHaveBeenCalled();
});

test("the approve popup's View opens a web address and nothing else", () => {
    const open = jest.spyOn(window, "open").mockImplementation(() => null);
    const props = { onClose: () => {}, onConfirm: () => {}, invoiceRef: "I-HKH000320", statusLabel: "Pending Paid" };
    const { unmount } = render(<ApprovePaymentModal { ...props } proof={ { url: "javascript:alert(1)", fileName: "x.pdf" } } />);
    fireEvent.click(screen.getByText("key_view"));
    expect(open).not.toHaveBeenCalled();
    unmount();
    render(<ApprovePaymentModal { ...props } proof={ { url: WEB, fileName: "receipt.pdf" } } />);
    fireEvent.click(screen.getByText("key_view"));
    expect(open).toHaveBeenCalledWith(WEB, "_blank", "noopener");
});

test("no payment-document link in the Invoice screens or popups bypasses documentLink", () => {
    const SRC = path.resolve(__dirname, "../..");
    const filesUnder = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return filesUnder(full);
        return /\.jsx?$/.test(entry.name) ? [full] : [];
    });
    const sink = /\.href\s*=\s*(uploadedPhoto|url\b|proof|attachment|document)|window\.open\(\s*(url\b|proofUrl|uploadedPhoto|proof|attachment|document)/;
    const hits = [...filesUnder(path.join(SRC, "Views/Pages/Invoice")), ...filesUnder(path.join(SRC, "components/Layout/popups/invoice-popups"))]
        .filter((file) => !file.endsWith("documentLink.js"))
        .flatMap((file) => fs.readFileSync(file, "utf8").split(/\r?\n/)
            .map((line, i) => (sink.test(line) ? `${ path.relative(SRC, file) }:${ i + 1 }` : null))
            .filter(Boolean));
    expect(hits).toEqual([]);
});
