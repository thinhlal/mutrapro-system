// src/hooks/useClientSide.js
// Custom hook để đảm bảo component chỉ render trên client side

import { useEffect, useState } from "react";

const useClientSide = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
};

export default useClientSide;
