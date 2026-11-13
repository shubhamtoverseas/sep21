let isLoggingOut = false;

export const forceLogout = async () => {
    if (isLoggingOut) return;
    isLoggingOut = true;
    try {
        const { persistor } = await import('../redux/store');
        await persistor.purge();
        await persistor.flush();
    } catch (error) {
        console.error('Force logout: persist purge failed', error);
    }
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login';
};

export const isLoggedOutResponse = (body) =>
    body?.is_logged_out === true || body?.data?.is_logged_out === true;
