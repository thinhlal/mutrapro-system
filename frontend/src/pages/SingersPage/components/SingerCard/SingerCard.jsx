import { Card, Typography, Rate } from "antd";
import styles from "./SingerCard.module.css";

const { Title, Text, Paragraph } = Typography;

export default function SingerCard({ singer }) {
  return (
    <div className="col-12 col-md-6 col-lg-4 col-xl-3 mb-4">
      <Card hoverable className={styles.card}>
        <div className={styles.imageContainer}>
          <img
            src={singer.image}
            alt={singer.name}
            className={styles.singerImage}
          />
          {singer.isOnline && <div className={styles.onlineBadge}>ONLINE</div>}
        </div>
        <div className={styles.cardBody}>
          <Text strong className={styles.roles}>
            {Array.isArray(singer.roles)
              ? singer.roles.join(" • ")
              : singer.roles}
          </Text>
          <Title level={5} className={styles.name}>
            {singer.name}
          </Title>
          <Text type="secondary" className={styles.location}>
            {singer.location}
          </Text>

          <div className={styles.rating}>
            <Rate
              disabled
              defaultValue={singer.rating}
              style={{ fontSize: 14 }}
            />
            <Text type="secondary" className={styles.reviews}>
              ({singer.reviews})
            </Text>
          </div>

          <Paragraph
            className={styles.description}
            ellipsis={{ rows: 3, expandable: false }}
          >
            {singer.description}
          </Paragraph>

          <div className={styles.credits}>
            <Text strong className={styles.creditsTitle}>
              CREDITS
            </Text>
            <Text type="secondary" className={styles.creditsList}>
              {singer.credits.join(", ")}
            </Text>
          </div>
        </div>
      </Card>
    </div>
  );
}
