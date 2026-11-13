import Swal from 'sweetalert2';
import './show-toast.css';

const ICON_SVG = {
    success: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m4 12 5 5L20 6"/></svg>',
    error: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16v.5"/></svg>',
};

const CLOSE_SVG = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 6 12 12M6 18 18 6"/></svg>';

export const ShowToast = (icon, title) => {
    const isError = icon === 'error';
    const toastType = isError ? 'error' : 'success';

    Swal.fire({
        html: `
            <div class="figma-toast-container">
                <span class="figma-toast-ico figma-toast-ico--${ toastType }">${ ICON_SVG[toastType] }</span>
                <span class="figma-toast-message">${ title }</span>
                <button class="figma-toast-close-btn" id="toast-close-btn" aria-label="Close">${ CLOSE_SVG }</button>
            </div>
        `,
        toast: false,
        position: 'top-end',
        showConfirmButton: false,
        showCloseButton: false,
        timer: 3000,
        timerProgressBar: false,
        width: 'auto',
        padding: '0',
        backdrop: false,
        scrollbarPadding: false,
        customClass: {
            popup: `position-fixed figma-toast figma-toast--${ toastType }`,
        },
        didOpen: (popup) => {
            const closeBtn = popup.querySelector('#toast-close-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => Swal.close());
            }
        },
    });
};
