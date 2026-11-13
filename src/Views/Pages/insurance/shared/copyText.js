/* Copies text to the clipboard and resolves true only when the clipboard really took it, so the caller can report what
   actually happened (Insurance_UI_Correction_20261106 C2: "copies only the reference, with feedback and no navigation";
   PROMPT 6: an honest success / fail toast) */
const copyText = (text) => new Promise((resolve) => {
    try {
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(text).then(() => resolve(true), () => resolve(false));
            return;
        }
    } catch { /* clipboard unavailable */ }
    resolve(false);
});

export default copyText;
