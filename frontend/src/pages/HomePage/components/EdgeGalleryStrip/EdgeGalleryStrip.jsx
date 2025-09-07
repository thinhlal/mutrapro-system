import { FC } from "react";
import { Container, Row, Col } from "react-bootstrap";
import { Image } from "antd";
import styles from "./EdgeGalleryStrip.module.css";

// Import từng ảnh (sau này bạn thay bằng ảnh thật trong assets của dự án)
import image1 from "../../../../assets/images/BannerHomePage/My-Sheet-Music-Transcriptions-Guitar-3.jpg";
import image2 from "../../../../assets/images/BannerHomePage/My-Sheet-Music-Transcriptions-Guitar-4.jpg";
import image3 from "../../../../assets/images/BannerHomePage/My-Sheet-Music-Transcriptions-Piano-10.jpg";
import image4 from "../../../../assets/images/BannerHomePage/My-Sheet-Music-Transcriptions-Piano-3.jpg";
import image5 from "../../../../assets/images/BannerHomePage/My-Sheet-Music-Transcriptions-Piano-4.jpg";
import image6 from "../../../../assets/images/BannerHomePage/My-Sheet-Music-Transcriptions-Piano-5.jpg";

const EdgeGalleryStrip = () => {
  return (
    <section className={styles.stripSection}>
      <Container fluid className="px-0">
        <Row className={`g-4 ${styles.rowTight}`}>
          <Col
            xs={6}
            sm={4}
            md={4}
            lg={2}
            className={`${styles.tileCol} ${styles.firstTile}`}
          >
            <div className={styles.card}>
              <Image
                src={image1}
                alt="gallery-1"
                preview={false}
                className={styles.img}
                loading="lazy"
              />
            </div>
          </Col>

          <Col xs={6} sm={4} md={4} lg={2} className={styles.tileCol}>
            <div className={styles.card}>
              <Image
                src={image2}
                alt="gallery-2"
                preview={false}
                className={styles.img}
                loading="lazy"
              />
            </div>
          </Col>

          <Col xs={6} sm={4} md={4} lg={2} className={styles.tileCol}>
            <div className={styles.card}>
              <Image
                src={image3}
                alt="gallery-3"
                preview={false}
                className={styles.img}
                loading="lazy"
              />
            </div>
          </Col>

          <Col xs={6} sm={4} md={4} lg={2} className={styles.tileCol}>
            <div className={styles.card}>
              <Image
                src={image4}
                alt="gallery-4"
                preview={false}
                className={styles.img}
                loading="lazy"
              />
            </div>
          </Col>

          <Col xs={6} sm={4} md={4} lg={2} className={styles.tileCol}>
            <div className={styles.card}>
              <Image
                src={image5}
                alt="gallery-5"
                preview={false}
                className={styles.img}
                loading="lazy"
              />
            </div>
          </Col>

          <Col
            xs={6}
            sm={4}
            md={4}
            lg={2}
            className={`${styles.tileCol} ${styles.lastTile}`}
          >
            <div className={styles.card}>
              <Image
                src={image6}
                alt="gallery-6"
                preview={false}
                className={styles.img}
                loading="lazy"
              />
            </div>
          </Col>
        </Row>
      </Container>
    </section>
  );
};

export default EdgeGalleryStrip;
