import { logout } from './Slices/Auth';
import { persistor } from './store';

const logoutMiddleware = (store) => (next) => (action) => {
    const result = next(action);

    if (
         action.type?.endsWith('/rejected') &&
        (
            action.payload?.data?.data?.is_logged_out ||
            action?.payload?.message === 'Token Invalid'
        )
    ) {
        (async () => {
            try {
                await persistor.purge();
                await persistor.flush();
                store.dispatch(logout());
            } catch (error) {
                console.error('Error during logout middleware:', error);
            }
        })();
    }

    return result;
};

export default logoutMiddleware;
