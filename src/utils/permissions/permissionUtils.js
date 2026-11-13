import { getPermissionModule, findPermission, isAdminUser } from '../../services/commonService';


const PERMISSION_GRANTED = 'y';

/**
 * Generic permission handler
 * @param {Object} permissionList 
 * @param {string} moduleName 
 * @param {Object} permissionConfig - Mapping of { permissionKey: "category_id" }
 * @returns {Object} - Mapped permissions { canX: boolean }
 */
export const getModulePermissions = (permissionList, moduleName, permissionConfig) => {
    const isAdmin = isAdminUser();
    
    // Admin gets all permissions
    if (isAdmin) {
        return Object.keys(permissionConfig).reduce((acc, key) => {
            acc[key] = true;
            return acc;
        }, {});
    }

    const module = getPermissionModule(permissionList?.data, moduleName);
    const buildPermission = {};

    // Initialize all permissions as false
    Object.values(permissionConfig).forEach(categoryId => {
        buildPermission[categoryId] = false;
    });

    // Set permissions based on module data
    if (module?.category) {
        module.category.forEach((category) => {
            if (!category?.id) return;
            const permission = findPermission(module, category.id);
            if (permission?.selected_value === PERMISSION_GRANTED) {
                buildPermission[category.id] = true;
            }
        });
    }
    
    return Object.entries(permissionConfig).reduce((acc, [outputKey, categoryId]) => {
        acc[outputKey] = buildPermission[categoryId];
        return acc;
    }, {});
};