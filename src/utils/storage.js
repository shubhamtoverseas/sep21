
export const getStoredUser = (storageType = 'session') => {
    try {
      const storage = storageType === 'local' ? localStorage : sessionStorage;
      const user = JSON.parse(storage.getItem('user'));
      return user || false;
    } catch (error) {
      console.error('Error parsing stored user:', error);
      return false; 
    }
  };
  