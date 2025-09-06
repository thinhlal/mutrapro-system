// src/pages/HomePage/HomePage.jsx
import Header from "../../components/common/Header/Header";
import styles from "./HomePage.module.css";

const HomePage = () => {
  return (
    <div>
      {/* Header */}
      <Header />

      {/* Nội dung chính */}
      <div className={styles.content}>
        <h1>Welcome to MuTraPro</h1>
      </div>
    </div>
  );
};

export default HomePage;
