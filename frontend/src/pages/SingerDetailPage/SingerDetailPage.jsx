// src/pages/SingerDetailPage/SingerDetailPage.jsx
import { useLocation } from "react-router-dom";
import { Container, Row, Col } from "react-bootstrap";
import { Button, Rate, Tabs, Typography, Tag } from "antd";
import { HeartOutlined, PlayCircleFilled } from "@ant-design/icons";
import Header from "../../components/common/Header/Header";
import Footer from "../../components/common/Footer/Footer";
import { SINGER_DETAIL_DATA as staticSingerData } from "../../constants/index";
import styles from "./SingerDetailPage.module.css";

const { Title, Text, Paragraph } = Typography;

// --- Tab Content Components ---
const ProfileTab = ({ data }) => (
  <div className={styles.tabContent}>
    {data.about.map((text, index) => (
      <Paragraph key={index}>{text}</Paragraph>
    ))}
    <div className={styles.section}>
      <Title level={5} className={styles.sectionTitle}>
        Credits
      </Title>
      <div>
        {data.credits.map((cred) => (
          <Tag key={cred}>{cred}</Tag>
        ))}
      </div>
    </div>
    <div className={styles.section}>
      <Title level={5} className={styles.sectionTitle}>
        Sounds Like
      </Title>
      <Text>{data.soundsLike.join(", ")}</Text>
    </div>
    <div className={styles.section}>
      <Title level={5} className={styles.sectionTitle}>
        Languages
      </Title>
      <Text>{data.languages.join(", ")}</Text>
    </div>
  </div>
);

const ReviewsTab = ({ data }) => (
  <div className={styles.tabContent}>
    {data.map((review) => (
      <div key={review.id} className={styles.reviewItem}>
        <Rate disabled defaultValue={review.rating} />
        {review.isVerified && <Tag color="green">Verified</Tag>}
        <Paragraph className={styles.reviewComment}>{review.comment}</Paragraph>
        <Text strong>{review.name}</Text>
      </div>
    ))}
    <Button type="primary" ghost>
      Show More
    </Button>
  </div>
);

// --- Main Page Component ---
export default function SingerDetailPage() {
  const location = useLocation();
  const { singerData } = location.state || {};

  const singer = {
    ...staticSingerData,
    ...singerData,
  };

  const tabItems = [
    {
      key: "1",
      label: "Profile",
      children: <ProfileTab data={staticSingerData.profile} />,
    },
    {
      key: "2",
      label: "Credits",
      children: <ProfileTab data={staticSingerData.profile} />,
    },
    {
      key: "3",
      label: `Reviews (${
        singer.reviewsCount || staticSingerData.reviewsCount
      })`,
      children: <ReviewsTab data={staticSingerData.reviews} />,
    },
    {
      key: "4",
      label: "Interview",
      children: (
        <div className={styles.tabContent}>Interview content goes here.</div>
      ),
    },
  ];

  return (
    <div>
      <Header />
      <div className={styles.singerHeader}>
        <Container>
          <Row className="align-items-center">
            <Col md={7}>
              <Title className={styles.singerName}>{singer.name}</Title>
              <Text className={styles.singerRoles}>
                {Array.isArray(singer.roles)
                  ? singer.roles.join(" • ")
                  : singer.roles}
              </Text>
              <div className={styles.ratingLocation}>
                <Rate disabled defaultValue={singer.rating} />
                <Text>{singer.reviews} Reviews</Text>
                <span>•</span>
                <Text>{singer.location}</Text>
              </div>
            </Col>
            <Col md={5} className="text-md-end">
              <img
                src={singer.image}
                alt={singer.name}
                className={styles.singerImage}
              />
            </Col>
          </Row>
        </Container>
      </div>
      <Container className={styles.mainContent}>
        <Row>
          <Col lg={8}>
            <div className={styles.actionsBar}>
              <Tabs defaultActiveKey="1" items={tabItems} />
              <div className={styles.actionButtons}>
                <Button icon={<HeartOutlined />}>Save to favorites</Button>
                <Button type="primary">Contact {singer.name}</Button>
              </div>
            </div>
          </Col>
          <Col lg={4}>
            <aside className={styles.sidebar}>
              <div className={styles.sidebarSection}>
                {staticSingerData.audioSamples.map((sample) => (
                  <div key={sample.id} className={styles.audioTrack}>
                    <PlayCircleFilled className={styles.playIcon} />
                    <div>
                      <Text strong>{sample.title}</Text>
                      <Text type="secondary">{sample.genre}</Text>
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles.sidebarSection}>
                <Title level={5}>Genres</Title>
                <Text>{staticSingerData.sidebar.genres.join(", ")}</Text>
              </div>
              <div className={styles.sidebarSection}>
                <Title level={5}>Vocal Style</Title>
                <Text>{staticSingerData.sidebar.vocalStyle.join(", ")}</Text>
              </div>
              <div className={styles.sidebarSection}>
                <Title level={5}>Typical Turnaround Time</Title>
                <Text>{staticSingerData.sidebar.turnaroundTime}</Text>
              </div>
            </aside>
          </Col>
        </Row>
      </Container>
      <Footer />
    </div>
  );
}
