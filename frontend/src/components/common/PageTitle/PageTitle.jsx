import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Component để tự động set title dựa trên route path
 * Có thể override bằng cách truyền title prop
 */
const PageTitle = ({ title, routeTitleMap }) => {
  const location = useLocation();

  useEffect(() => {
    // Nếu có title prop được truyền vào, dùng title đó
    if (title) {
      document.title = `${title} - MutraPro`;
      return;
    }

    // Nếu có routeTitleMap, tìm title theo path
    if (routeTitleMap) {
      const path = location.pathname;
      const matchedTitle = routeTitleMap[path];
      if (matchedTitle) {
        document.title = `${matchedTitle} - MutraPro`;
        return;
      }
    }

    // Fallback: dùng pathname để tạo title
    const path = location.pathname;
    const pathParts = path.split('/').filter(Boolean);
    if (pathParts.length > 0) {
      const pageName = pathParts[pathParts.length - 1];
      const formattedTitle = pageName
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      document.title = `${formattedTitle} - MutraPro`;
    } else {
      document.title = 'MutraPro';
    }
  }, [location.pathname, title, routeTitleMap]);

  return null; // Component này không render gì
};

export default PageTitle;

