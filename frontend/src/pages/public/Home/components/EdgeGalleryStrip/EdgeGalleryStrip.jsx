import { memo } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Image } from 'antd';
import classNames from 'classnames';
import styles from './EdgeGalleryStrip.module.css';

// Assets
import image1 from '../../../../../assets/images/BannerHomePage/My-Sheet-Music-Transcriptions-Guitar-3.jpg';
import image2 from '../../../../../assets/images/BannerHomePage/My-Sheet-Music-Transcriptions-Guitar-4.jpg';
import image3 from '../../../../../assets/images/BannerHomePage/My-Sheet-Music-Transcriptions-Piano-10.jpg';
import image4 from '../../../../../assets/images/BannerHomePage/My-Sheet-Music-Transcriptions-Piano-3.jpg';
import image5 from '../../../../../assets/images/BannerHomePage/My-Sheet-Music-Transcriptions-Piano-4.jpg';
import image6 from '../../../../../assets/images/BannerHomePage/My-Sheet-Music-Transcriptions-Piano-5.jpg';

const IMAGES = [
  { src: image1, alt: 'gallery-1' },
  { src: image2, alt: 'gallery-2' },
  { src: image3, alt: 'gallery-3' },
  { src: image4, alt: 'gallery-4' },
  { src: image5, alt: 'gallery-5' },
  { src: image6, alt: 'gallery-6' },
];

function EdgeGalleryStrip() {
  return (
    <section className={styles.stripSection}>
      <Container fluid className="px-0">
        <Row className={`g-4 ${styles.rowTight}`}>
          {IMAGES.map(({ src, alt }, idx) => (
            <Col
              key={alt}
              xs={6}
              sm={4}
              md={4}
              lg={2}
              className={classNames(styles.tileCol, {
                [styles.firstTile]: idx === 0,
                [styles.lastTile]: idx === IMAGES.length - 1,
              })}
            >
              <div className={styles.card}>
                <Image
                  src={src}
                  alt={alt}
                  preview={false}
                  className={styles.img}
                  loading="lazy"
                />
              </div>
            </Col>
          ))}
        </Row>
      </Container>
    </section>
  );
}

export default memo(EdgeGalleryStrip);
