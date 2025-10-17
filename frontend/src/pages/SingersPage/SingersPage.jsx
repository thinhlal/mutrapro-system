import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Typography } from "antd";
import { FEMALE_SINGERS_DATA, MALE_SINGERS_DATA } from "../../constants/index";
import Header from "../../components/common/Header/Header";
import Footer from "../../components/common/Footer/Footer";
import SingerCard from "./components/SingerCard/SingerCard";
import SingerFilter from "./components/SingerFilter/SingerFilter";
import HeroSingerSection from "./components/HeroSingerSection/HeroSingerSection";
import styles from "./SingersPage.module.css";
import BackToTop from "../../components/common/BackToTop/BackToTop";

const { Title } = Typography;

const SingersPage = () => {
  const { gender } = useParams();
  const [singersData, setSingersData] = useState([]);
  const [pageTitle, setPageTitle] = useState("");

  useEffect(() => {
    if (gender === "female") {
      setSingersData(FEMALE_SINGERS_DATA);
      setPageTitle("Female Singers");
    } else if (gender === "male") {
      setSingersData(MALE_SINGERS_DATA);
      setPageTitle("Male Singers");
    } else {
      setSingersData([]);
      setPageTitle("Singers Not Found");
    }
  }, [gender]);

  return (
    <div className={styles.page}>
      <Header />
      <HeroSingerSection />
      <SingerFilter />
      <div className="container py-5">
        <Title level={1} className={styles.pageTitle}>
          {pageTitle}
        </Title>
        <div className="row">
          {singersData.map((singer) => (
            <SingerCard key={singer.id} singer={singer} />
          ))}
        </div>
      </div>
      <Footer />
      <BackToTop />
    </div>
  );
};

export default SingersPage;
