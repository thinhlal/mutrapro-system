import styles from "./PricingPage.module.css";
import { Container, Row, Col } from "react-bootstrap";
import { Button } from "antd";
import { ArrowRightOutlined } from "@ant-design/icons";

import Header from "../../components/common/Header/Header";
import Pricing from "./components/Pricing/Pricing";
import BackToTop from "../../components/common/BackToTop/BackToTop";
import Footer from "../../components/common/Footer/Footer";

const PricingPage = () => {
    return (
        <div className={styles.pageContainer}>
            <Header />

            <main>
                <Pricing />

            </main>

            <Footer />
            <BackToTop />
        </div>
    );
};

export default PricingPage;
