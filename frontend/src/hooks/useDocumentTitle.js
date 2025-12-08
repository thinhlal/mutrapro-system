import { useEffect } from 'react';

/**
 * Hook để set document title động
 * @param {string} title - Title của trang
 */
export const useDocumentTitle = title => {
  useEffect(() => {
    const previousTitle = document.title;

    // Set title mới
    if (title) {
      document.title = `${title} - MutraPro`;
    } else {
      document.title = 'MutraPro';
    }

    // Restore title cũ khi unmount
    return () => {
      document.title = previousTitle;
    };
  }, [title]);
};

export default useDocumentTitle;
