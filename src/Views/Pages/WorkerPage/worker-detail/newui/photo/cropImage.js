const loadImage = (url) => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
});

export const imageSizeOf = (url) => loadImage(url).then((img) => ({ width: img.naturalWidth, height: img.naturalHeight }));

export const renderHeadshot = async (url, crop) => {
    const img = await loadImage(url);
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const size = Math.max(1, Math.round((2 * crop.r / 100) * w));
    const x = Math.round((crop.cx / 100) * w - size / 2);
    const y = Math.round((crop.cy / 100) * h - size / 2);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, x, y, size, size, 0, 0, size, size);
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('headshot'))), 'image/png');
    });
};

export const readPhotoFile = (file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(null);
    reader.onload = () => {
        const img = new Image();
        img.onload = () => resolve({ file, src: reader.result, width: img.naturalWidth, height: img.naturalHeight, bytes: file.size });
        img.onerror = () => resolve(null);
        img.src = reader.result;
    };
    reader.readAsDataURL(file);
});
