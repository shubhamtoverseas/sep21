import translation from "../../utils/translation";
export const PrintInvoiceTemplate = (printContents) => `
<html>
    <head>
        <link 
            rel="stylesheet" 
            href="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css" 
            integrity="sha384-xOolHFLEh07PJGoPkLv1IbcEPTNtaed2xpHsD9ESMhqIYd0nLMwNLD69Npy4HI+N" 
            crossorigin="anonymous"
        >
        <title>${translation('key_print_invoice')}</title>
        <style>
            /* Margin Utilities */
            .mt23 { margin-top: 23px; }
            .mb23 { margin-bottom: 23px; }
            .mt18 { margin-top: 18px; }
            .mb18 { margin-bottom: 18px; }
            .mtb23 { 
                margin-top: 23px; 
                margin-bottom: 23px; 
            }
            .mb40 { margin-bottom: 40px; }

            /* Payment Type Invoice Styles */
            .payment-type-invoice {
                background-color: #fff;
                border-radius: 10px;
            }

            .payment-type-invoice .title {
                font-size: 12px;
                color: #9e9e9e;
            }

            .payment-type-invoice .desc {
                font-size: 14px;
                color: rgba(0, 0, 0, 0.87);
                font-weight: 500;
            }

            .payment-type-invoice .entity-name-id {
                color: #000;
                font-size: 16px;
                font-style: normal;
                font-weight: 600;
                line-height: 28px; 
                letter-spacing: 0.024px;
            }

            .payment-type-invoice .payment-information {
                color: var(--Black-High-Emphasis, #212121);
                font-size: 20px;
                font-style: normal;
                font-weight: 700;
                line-height: normal;
                letter-spacing: 0.03px;
            }

            .payment-type-invoice .payment-information-title {
                color: #89898B;
                font-size: 12px;
                font-style: normal;
                font-weight: 400;
                line-height: normal;
                letter-spacing: 0.018px;
            }

            .payment-type-invoice .payment-information-desc {
                color: #242426;
                font-size: 16px;
                font-style: normal;
                font-weight: 500;
                line-height: normal;
                letter-spacing: 0.024px;
            }

            .payment-type-invoice h5.black {
                font-size: 24px;
                font-weight: 700;
                color: #000;
            }

            .payment-type-invoice tfoot .border-top td {
                border-top: 1.5px solid #000;
                padding-top: 8px;
            }

            .payment-type-invoice tfoot tr:last-child td {
                border-top: 1.5px solid #000;
                color: var(--Black-High-Emphasis, #212121);
                font-size: 24px;
                font-style: normal;
                font-weight: 700;
                line-height: normal;
                letter-spacing: 0.036px;
            }

            /* General Text Styles */
            .bottom-desc {
                color: var(--Black-Inactive, #757575);
                font-size: 14px;
                font-style: normal;
                font-weight: 400;
                line-height: normal;
                letter-spacing: 0.021px;
            }

            /* Table Styles */
            table td {
                color: #242426;
                font-size: 12px;
                font-style: normal;
                font-weight: 400;
                line-height: normal;
                letter-spacing: 0.018px;
            }

            .table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
                font-size: 14px;
            }

            .table th,
            .table td {
                padding: 10px 8px;
                text-align: left;
            }

            .table th {
                font-weight: 600;
                color: #000;
                border-bottom: 1px solid #000;
            }

            .table td {
                vertical-align: top;
                color: #333;
            }

            .table tfoot td {
                padding-top: 6px;
                font-weight: 500;
            }

            .table tr td:last-child,
            .table tr th:last-child {
                text-align: right;
            }

            .table tfoot tr.bold td {
                font-weight: 700;
            }

            /* Layout & Container */
            .invoice-container {
                width: 800px;
                margin: 0 auto;
                font-family: "Inter", Arial, sans-serif;
                color: #000;
                background: #fff;
                padding: 40px 50px;
                border-radius: 10px;
            }

            /* Components */
            .brand-logo {
                height: 40px;
            }

            .invoice-chip {
                border-radius: 40px;
                padding: 4px 14px;
                font-size: 14px;
                font-weight: 500;
                border: none;
            }

            .invoice-chip.paid {
                background-color: #e7f8ee;
                color: #1a8f54;
            }

            .entity-detail-wrapper {
                min-width: 220px;
            }

            .entity-detail-wrapper h6 {
                font-weight: 500;
                color: #666;
            }

            .entity-detail-wrapper p {
                color: #000;
                margin-bottom: 2px;
            }

            /* Border Utilities */
            .border-dark {
                border-color: #000 !important;
            }

            .border-top {
                border-top: 1px solid #000;
            }

            .border-bottom {
                border-bottom: 1px solid #000;
            }

            /* Text Utilities */
            .bold {
                font-weight: 700;
            }

            .fw-700 {
                font-weight: 700;
            }

            .text-custom {
                color: #cc0000;
            }

            .table-custom td {
                font-weight: 600;
                color: #b22222;
            }

            .blue {
                color: #0073e6;
            }

            /* Background & Body */
            .pdf-container,
            body {
                background: #fff !important;
            }
        </style>
    </head>
    <body>
        ${printContents}
    </body>
</html>
`;