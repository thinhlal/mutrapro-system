import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Button, Rate, Tabs, Typography, Tag, Spin, message } from 'antd';
import { PlayCircleFilled, ArrowLeftOutlined } from '@ant-design/icons';
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
      <div className={styles.demosContainer}>
        {demos.map(demo => (
          <div key={demo.demoId} className={styles.audioTrack}>
            <div className={styles.playIconContainer}>
              <PlayCircleFilled className={styles.playIcon} />
            </div>
            <div className={styles.audioTrackContent}>
              <div className={styles.audioTrackHeader}>
                <Text className={styles.audioTrackTitle}>{demo.title}</Text>
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
                <Text className={styles.audioTrackDescription}>
                  {demo.description}
                </Text>
              )}
              {demo.genres && demo.genres.length > 0 && (
                <div className={styles.audioTrackGenres}>
                  {demo.genres.map(genre => (
                    <Tag key={genre} color="orange">
                      {genre}
                    </Tag>
                  ))}
                </div>
              )}
              {demo.previewUrl ? (
                <div className={styles.audioPlayerWrapper}>
                  <audio controls>
                    <source src={demo.previewUrl} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              ) : (
                <Text className={styles.noPreviewText}>
                  No preview available
                </Text>
              )}
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className={styles.emptyDemosState}>
        <PlayCircleFilled className={styles.emptyDemosIcon} />
        <Text className={styles.emptyDemosText}>Chưa có demo nào</Text>
      </div>
    )}
  </div>
);

// --- Main Page Component ---
export default function SingerDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { specialistData, fromFlow, returnTo, returnState } = location.state || {};

  const [loading, setLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);

  const handleBack = () => {
    if (fromFlow && returnTo) {
      // Navigate back to recording flow with state
      navigate(returnTo, { state: returnState });
    } else {
      // Default: go back in history
      navigate(-1);
    }
  };

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
          // SpecialistDetailResponse có structure: { specialist, skills, demos }
          const apiResponse = response?.data || response;
          const specialistDetailData = apiResponse?.data || apiResponse;

          if (specialistDetailData) {
            // Backend trả về SpecialistDetailResponse với structure { specialist, skills, demos }
            if (specialistDetailData.specialist) {
              // Đúng structure, dùng trực tiếp
              setDetailData(specialistDetailData);
            } else {
              // Fallback: nếu không có structure đúng, coi như toàn bộ data là specialist object
              // (trường hợp này không nên xảy ra với endpoint mới)
              setDetailData({
                specialist: specialistDetailData,
                skills: [],
                demos: [],
              });
            }
          }
        } catch (error) {
          console.error('Error fetching specialist detail:', error);
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
      <div
        style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}
      >
        <Header />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div
            className={styles.singerHeaderWrapper}
            style={{ minHeight: '500px' }}
          >
            <Container
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '500px',
              }}
            >
              <Spin size="large" />
            </Container>
          </div>
          <Container
            className={styles.mainContent}
            style={{ flex: 1, minHeight: '400px' }}
          >
            <div style={{ height: '400px' }}></div>
          </Container>
        </div>
        <Footer />
      </div>
    );
  }

  if (!specialist) {
    return (
      <div
        style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}
      >
        <Header />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div
            className={styles.singerHeaderWrapper}
            style={{ minHeight: '500px' }}
          >
            <Container
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '500px',
              }}
            >
              <Text style={{ color: '#fff', fontSize: '1.2rem' }}>
                Specialist not found
              </Text>
            </Container>
          </div>
          <Container
            className={styles.mainContent}
            style={{ flex: 1, minHeight: '400px' }}
          >
            <div style={{ height: '400px' }}></div>
          </Container>
        </div>
        <Footer />
      </div>
    );
  }
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}
    >
      <Header />
      <div className={styles.singerHeaderWrapper}>
        <div className={styles.diagonalBg} />

        <Container className={styles.headerContainer}>
          <Row className="align-items-center">
            <Col md={7} className={styles.headerInfo}>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={handleBack}
                style={{
                  marginBottom: 16,
                  color: '#fff',
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                }}
                ghost
              >
                {fromFlow ? 'Back to Selection' : 'Back'}
              </Button>
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
                borderRadius: '50%',
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
