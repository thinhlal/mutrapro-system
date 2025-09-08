import { useState, useEffect } from "react";
import { Button } from "antd";
import { UpOutlined } from "@ant-design/icons";
import classNames from "classnames";
import styles from "./BackToTop.module.css";

function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 200);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <Button
      type="primary"
      shape="circle"
      size="large"
      icon={<UpOutlined />}
      onClick={scrollToTop}
      aria-label="Back to top"
      className={classNames(styles.backToTop, { [styles.visible]: visible })}
    />
  );
}

export default BackToTop;
