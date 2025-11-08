import { useLocation } from 'react-router-dom';
import { Container, Row, Col } from 'react-bootstrap';
import { Button, Rate, Tabs, Typography, Tag } from 'antd';
import { HeartOutlined, PlayCircleFilled } from '@ant-design/icons';
import { SINGER_DETAIL_DATA as staticSingerData } from '../../../../constants/index';
import Header from '../../../../components/common/Header/Header';
import Footer from '../../../../components/common/Footer/Footer';
import styles from './SingerDetailPage.module.css';

const { Title, Text, Paragraph } = Typography;

// --- Tab Components ---
const ProfileTab = ({ data }) => (
  <div className={styles.tabContent}>
    <div className={styles.section}>
      <Title level={5} className={styles.sectionTitle}>
        Languages
      </Title>
      <Text>{data.languages.join(', ')}</Text>
    </div>
    <div className={styles.section}>
      <Title level={4} className={styles.sectionTitle}>
        Credits
      </Title>
      <div className={styles.tagGroup}>
        {data.credits.map(cred => (
          <Tag key={cred}>{cred}</Tag>
        ))}
      </div>
    </div>
    <div className={styles.section}>
      <Title level={4} className={styles.sectionTitle}>
        Sounds Like
      </Title>
      <Text>{data.soundsLike.join(', ')}</Text>
    </div>
  </div>
);

const ReviewsTab = ({ data }) => (
  <div className={styles.tabContent}>
    <Title level={4} className={styles.sectionTitle}>
      {data.length} Reviews - {staticSingerData.repeatClients} Repeat Clients
    </Title>
    {data.map(review => (
      <div key={review.id} className={styles.reviewItem}>
        <div className={styles.reviewHeader}>
          <Text strong>{review.name}</Text>
          <Rate
            disabled
            defaultValue={review.rating}
            style={{ fontSize: 16 }}
          />
        </div>
        <Paragraph className={styles.reviewComment}>{review.comment}</Paragraph>
        {review.isVerified && <Tag color="green">Verified</Tag>}
      </div>
    ))}
    <Button type="default" style={{ marginTop: '1rem' }}>
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
      key: '1',
      label: 'Profile',
      children: <ProfileTab data={staticSingerData.profile} />,
    },
    {
      key: '2',
      label: `Reviews (${
        singer.reviewsCount || staticSingerData.reviewsCount
      })`,
      children: <ReviewsTab data={staticSingerData.reviews} />,
    },
    {
      key: '3',
      label: 'Interview',
      children: (
        <div className={styles.tabContent}>Interview content goes here.</div>
      ),
    },
  ];

  return (
    <div>
      <Header />
      <div className={styles.singerHeaderWrapper}>
        <div className={styles.diagonalBg} />

        <Container className={styles.headerContainer}>
          <Row className="align-items-center">
            <Col md={7} className={styles.headerInfo}>
              <Title level={1} className={styles.singerName}>
                {singer.name}
              </Title>

              <Text className={styles.singerRoles}>
                {Array.isArray(singer.roles)
                  ? singer.roles.join(' • ')
                  : singer.roles}
              </Text>

              <div className={styles.ratingLocation}>
                <Rate disabled defaultValue={singer.rating} />
                <Text>{singer.reviews} Verified Reviews</Text>
              </div>

              <Text className={styles.singerLocation}>{singer.location}</Text>
            </Col>
          </Row>
        </Container>

        <div className={styles.headerImageContainer}>
          <img
            src={singer.image}
            alt={singer.name}
            className={styles.singerImage}
          />
        </div>
      </div>

      <Container className={styles.mainContent}>
        <Row>
          {/* Cột trái - Nội dung chính */}
          <Col lg={8} className={styles.mainColumn}>
            {/* NEW: Thêm đoạn giới thiệu trên Tabs */}
            <Paragraph className={styles.introParagraph}>
              {staticSingerData.profile.about[0]}
            </Paragraph>
            <Paragraph className={styles.introParagraph}>
              {staticSingerData.profile.about[1]}
            </Paragraph>
            <Tabs
              defaultActiveKey="1"
              items={tabItems}
              className={styles.profileTabs}
            />
          </Col>

          <Col lg={4}>
            <aside className={styles.sidebar}>
              <div className={styles.actionButtons}>
                <Button icon={<HeartOutlined />} size="large" block>
                  Save to favorites
                </Button>
                <Button type="primary" size="large" block>
                  Contact {singer.name}
                </Button>
              </div>

              <div className={styles.sidebarSection}>
                {staticSingerData.audioSamples.map(sample => (
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
                <Title level={5}>Top Genres</Title>
                <Text>{staticSingerData.sidebar.genres.join(', ')}</Text>
              </div>
              <div className={styles.sidebarSection}>
                <Title level={5}>Sound Alike</Title>
                <Text>{staticSingerData.sidebar.vocalStyle.join(', ')}</Text>
              </div>
              <div className={styles.sidebarSection}>
                <Title level={5}>Studio Gear</Title>
                <Text>
                  Manley Studio Reference Microphone, Apollo Twin, Pro Tools
                </Text>
              </div>
            </aside>
          </Col>
        </Row>
      </Container>
      <Footer />
    </div>
  );
}
