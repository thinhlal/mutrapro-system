import { useLocation, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Button, Rate, Tabs, Typography, Tag, Spin, message } from 'antd';
import { PlayCircleFilled } from '@ant-design/icons';
import { SINGER_DETAIL_DATA as staticSingerData } from '../../../../constants/index';
import { getSpecialistDetail } from '../../../../services/specialistService';
import Header from '../../../../components/common/Header/Header';
import Footer from '../../../../components/common/Footer/Footer';
import styles from './SingerDetailPage.module.css';

const { Title, Text, Paragraph } = Typography;

// --- Tab Components ---
const ProfileTab = ({ specialist, skills, demos }) => (
  <div className={styles.tabContent}>
    {specialist?.bio && (
      <div className={styles.section}>
        <Title level={4} className={styles.sectionTitle}>
          About
        </Title>
        <Text>{specialist.bio}</Text>
      </div>
    )}
    {specialist?.genres && specialist.genres.length > 0 && (
      <div className={styles.section}>
        <Title level={4} className={styles.sectionTitle}>
          Genres
        </Title>
        <div className={styles.tagGroup}>
          {specialist.genres.map(genre => (
            <Tag key={genre}>{genre}</Tag>
          ))}
        </div>
      </div>
    )}
    {specialist?.credits && specialist.credits.length > 0 && (
      <div className={styles.section}>
        <Title level={4} className={styles.sectionTitle}>
          Credits
        </Title>
        <div className={styles.tagGroup}>
          {specialist.credits.map(cred => (
            <Tag key={cred}>{cred}</Tag>
          ))}
        </div>
      </div>
    )}
    {skills &&
      skills.length > 0 &&
      (() => {
        const vocalSkills = skills.filter(
          s => s.skill?.recordingCategory === 'VOCAL'
        );
        const instrumentSkills = skills.filter(
          s => s.skill?.recordingCategory === 'INSTRUMENT'
        );

        return (
          <>
            {vocalSkills.length > 0 && (
              <div className={styles.section}>
                <Title level={4} className={styles.sectionTitle}>
                  Vocal Skills
                </Title>
                <div className={styles.tagGroup}>
                  {vocalSkills.map(
                    specialistSkill =>
                      specialistSkill.skill && (
                        <Tag key={specialistSkill.skill.skillId} color="orange">
                          {specialistSkill.skill.skillName}
                        </Tag>
                      )
                  )}
                </div>
              </div>
            )}
            {instrumentSkills.length > 0 && (
              <div className={styles.section}>
                <Title level={4} className={styles.sectionTitle}>
                  Instrument Skills
                </Title>
                <div className={styles.tagGroup}>
                  {instrumentSkills.map(
                    specialistSkill =>
                      specialistSkill.skill && (
                        <Tag key={specialistSkill.skill.skillId} color="blue">
                          {specialistSkill.skill.skillName}
                        </Tag>
                      )
                  )}
                </div>
              </div>
            )}
          </>
        );
      })()}
  </div>
);

const ReviewsTab = ({ reviewsCount }) => (
  <div className={styles.tabContent}>
    <Title level={4} className={styles.sectionTitle}>
      {reviewsCount || 0} Reviews
    </Title>
    <Text>Reviews feature coming soon...</Text>
  </div>
);

const DemosTab = ({ demos }) => (
  <div className={styles.tabContent}>
    <Title level={4} className={styles.sectionTitle}>
      Demos ({demos?.length || 0})
    </Title>
    {demos && demos.length > 0 ? (
      <div>
        {demos.map(demo => (
          <div
            key={demo.demoId}
            className={styles.audioTrack}
            style={{ marginBottom: 20 }}
          >
            <PlayCircleFilled className={styles.playIcon} />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 4,
                  flexWrap: 'wrap',
                }}
              >
                <Text strong style={{ fontSize: '1.1rem' }}>
                  {demo.title}
                </Text>
                {demo.skill && (
                  <Tag
                    color={
                      demo.recordingRole === 'VOCALIST' ? 'orange' : 'blue'
                    }
                  >
                    {demo.skill.skillName}
                  </Tag>
                )}
              </div>
              {demo.description && (
                <Text
                  type="secondary"
                  style={{ display: 'block', marginBottom: 8 }}
                >
                  {demo.description}
                </Text>
              )}
              {demo.genres && demo.genres.length > 0 && (
                <div
                  style={{
                    marginBottom: 12,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  {demo.genres.map(genre => (
                    <Tag key={genre} color="orange">
                      {genre}
                    </Tag>
                  ))}
                </div>
              )}
              {demo.previewUrl ? (
                <audio controls style={{ width: '100%', marginTop: 8 }}>
                  <source src={demo.previewUrl} type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
              ) : (
                <Text type="secondary" style={{ fontStyle: 'italic' }}>
                  No preview available
                </Text>
              )}
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <Text type="secondary">Chưa có demo nào</Text>
      </div>
    )}
  </div>
);

// --- Main Page Component ---
export default function SingerDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const { specialistData } = location.state || {};

  const [loading, setLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);

  useEffect(() => {
    const fetchDetail = async () => {
      // Luôn fetch từ API để có đầy đủ thông tin (skills, demos)
      const specialistId = id || specialistData?.specialistId;

      if (specialistId) {
        setLoading(true);
        try {
          const response = await getSpecialistDetail(specialistId);

          // response từ axios là { data: ApiResponse }
          // ApiResponse có structure: { status, message, data: SpecialistDetailResponse }
          const apiResponse = response?.data || response;
          const detailData = apiResponse?.data || apiResponse;

          if (detailData) {
            setDetailData(detailData);
          }
        } catch (error) {
          message.error(error.message || 'Không thể tải thông tin specialist');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchDetail();
  }, [id, specialistData]);

  const specialist = detailData?.specialist;
  const skills = detailData?.skills || [];
  const demos = detailData?.demos || [];
  const [activeTab, setActiveTab] = useState('1');

  const tabItems = [
    {
      key: '1',
      label: 'Profile',
      children: (
        <ProfileTab specialist={specialist} skills={skills} demos={demos} />
      ),
    },
    {
      key: '2',
      label: `Reviews (${specialist?.reviews || 0})`,
      children: <ReviewsTab reviewsCount={specialist?.reviews} />,
    },
    {
      key: '3',
      label: `Demos (${demos.length})`,
      children: <DemosTab demos={demos} />,
    },
  ];

  if (loading) {
    return (
      <div>
        <Header />
        <Container style={{ padding: '100px 0', textAlign: 'center' }}>
          <Spin size="large" />
        </Container>
        <Footer />
      </div>
    );
  }

  if (!specialist) {
    return (
      <div>
        <Header />
        <Container style={{ padding: '100px 0', textAlign: 'center' }}>
          <Text>Specialist not found</Text>
        </Container>
        <Footer />
      </div>
    );
  }
  return (
    <div>
      <Header />
      <div className={styles.singerHeaderWrapper}>
        <div className={styles.diagonalBg} />

        <Container className={styles.headerContainer}>
          <Row className="align-items-center">
            <Col md={7} className={styles.headerInfo}>
              <Title level={1} className={styles.singerName}>
                {specialist.fullName}
              </Title>

              <Text className={styles.singerRoles}>
                {Array.isArray(specialist.recordingRoles) &&
                specialist.recordingRoles.length > 0
                  ? specialist.recordingRoles.join(' • ')
                  : 'Vocalist'}
              </Text>

              <div className={styles.ratingLocation}>
                <Rate
                  disabled
                  value={specialist.rating ? parseFloat(specialist.rating) : 0}
                />
                <Text>{specialist.reviews || 0} Verified Reviews</Text>
              </div>

              {specialist.experienceYears > 0 && (
                <Text className={styles.singerLocation}>
                  {specialist.experienceYears} năm kinh nghiệm
                </Text>
              )}
            </Col>
          </Row>
        </Container>

        <div className={styles.headerImageContainer}>
          {specialist.avatarUrl ? (
            <img
              src={specialist.avatarUrl}
              alt={specialist.fullName || 'Singer'}
              className={styles.singerImage}
              onError={e => {
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(specialist.fullName || 'Singer')}&size=400&background=random`;
              }}
            />
          ) : (
            <div
              className={styles.singerImage}
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #ff8c42 0%, #ec8a1c 100%)',
                fontSize: '72px',
                color: '#fff',
                fontWeight: 'bold',
                clipPath: 'polygon(30% 0, 100% 0, 100% 100%, 0% 100%)',
              }}
            >
              {specialist.fullName
                ? specialist.fullName.charAt(0).toUpperCase()
                : 'S'}
            </div>
          )}
        </div>
      </div>

      <Container className={styles.mainContent}>
        <Row>
          {/* Cột trái - Nội dung chính */}
          <Col lg={8} className={styles.mainColumn}>
            {specialist.bio && (
              <Paragraph className={styles.introParagraph}>
                {specialist.bio}
              </Paragraph>
            )}
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={tabItems}
              className={styles.profileTabs}
            />
          </Col>

          <Col lg={4}>
            <aside className={styles.sidebar}>
              {demos && demos.length > 0 && (
                <div className={styles.sidebarSection}>
                  <Title level={5}>Demos</Title>
                  {demos.slice(0, 3).map(demo => (
                    <div key={demo.demoId} style={{ marginBottom: 16 }}>
                      <div style={{ marginBottom: 8 }}>
                        <Text
                          strong
                          style={{ display: 'block', marginBottom: 4 }}
                        >
                          {demo.title}
                        </Text>
                        {demo.genres && demo.genres.length > 0 && (
                          <Text
                            type="secondary"
                            style={{ fontSize: '0.85rem' }}
                          >
                            {demo.genres.join(', ')}
                          </Text>
                        )}
                      </div>
                      {demo.previewUrl ? (
                        <audio
                          controls
                          style={{ width: '100%', height: '32px' }}
                          onClick={e => e.stopPropagation()}
                        >
                          <source src={demo.previewUrl} type="audio/mpeg" />
                        </audio>
                      ) : (
                        <Text
                          type="secondary"
                          style={{ fontSize: '0.85rem', fontStyle: 'italic' }}
                        >
                          No preview available
                        </Text>
                      )}
                      {demos.length > 3 && demo === demos[2] && (
                        <Text
                          type="secondary"
                          style={{
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            color: '#ff8c42',
                            marginTop: 8,
                            display: 'block',
                          }}
                          onClick={() => setActiveTab('3')}
                        >
                          Xem thêm {demos.length - 3} demo khác →
                        </Text>
                      )}
                    </div>
                  ))}
                  {demos.length <= 3 && (
                    <Text
                      type="secondary"
                      style={{
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        color: '#ff8c42',
                        marginTop: 8,
                        display: 'block',
                      }}
                      onClick={() => setActiveTab('3')}
                    >
                      Xem tất cả demos →
                    </Text>
                  )}
                </div>
              )}

              {specialist.genres && specialist.genres.length > 0 && (
                <div className={styles.sidebarSection}>
                  <Title level={5}>Genres</Title>
                  <Text>{specialist.genres.join(', ')}</Text>
                </div>
              )}

              {specialist.credits && specialist.credits.length > 0 && (
                <div className={styles.sidebarSection}>
                  <Title level={5}>Credits</Title>
                  <Text>{specialist.credits.join(', ')}</Text>
                </div>
              )}
            </aside>
          </Col>
        </Row>
      </Container>
      <Footer />
    </div>
  );
}
