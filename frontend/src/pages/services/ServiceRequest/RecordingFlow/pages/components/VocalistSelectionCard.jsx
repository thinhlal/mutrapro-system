// VocalistSelectionCard.jsx - Card cho vocalist selection trong flow
import { Card, Typography, Rate, Button, Space, Tag, Avatar } from 'antd';
import { EyeOutlined, CheckOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import styles from './VocalistSelectionCard.module.css';

const { Title, Text, Paragraph } = Typography;

function VocalistSelectionCard({
  specialist,
  isSelected,
  onSelect,
  onViewDetail,
  selectedId,
  disabled = false,
}) {
  const navigate = useNavigate();

  const handleCardClick = e => {
    // Prevent navigation if clicking on buttons
    if (e.target.closest('button') || e.target.closest('a')) {
      return;
    }
    // Select on card click (if not disabled)
    if (onSelect && !disabled) {
      onSelect(specialist.specialistId);
    }
  };

  const handleViewDetail = e => {
    e.stopPropagation();
    e.preventDefault();
    if (onViewDetail) {
      onViewDetail(specialist.specialistId);
    } else {
      // Default: navigate to detail page with flow context
      navigate(`/pros/singer/${specialist.specialistId}`, {
        state: {
          specialistData: specialist,
          fromFlow: true,
          returnTo: '/recording-flow/vocalist-selection',
          returnState: {
            fromFlow: true,
            step: 1,
            selectedVocalist: selectedId || null,
          },
        },
      });
    }
  };

  const handleSelect = e => {
    e.stopPropagation();
    if (onSelect && !disabled) {
      onSelect(specialist.specialistId);
    }
  };

  // Format data từ backend
  const avatarUrl = specialist?.avatarUrl || 'https://via.placeholder.com/300';
  const fullName = specialist?.fullName || 'Unknown';
  const bio = specialist?.bio || '';
  const rating = specialist?.rating ? parseFloat(specialist.rating) : 0;
  const reviews = specialist?.reviews || 0;
  const genres = specialist?.genres || [];
  const credits = specialist?.credits || [];
  const experienceYears = specialist?.experienceYears || 0;

  return (
    <div className={`col-12 col-md-6 col-lg-4 col-xl-3 mb-4 ${styles.cardWrapper}`}>
      <Card
        hoverable={!disabled}
        className={`${styles.card} ${isSelected ? styles.selected : ''} ${disabled ? styles.disabled : ''}`}
        onClick={handleCardClick}
        styles={{ body: { padding: 0 } }}
      >
        <div className={styles.imageContainer}>
          <Avatar
            src={avatarUrl}
            alt={fullName}
            shape="square"
            style={{ width: '100%', height: '100%', borderRadius: 0 }}
            className={styles.singerImage}
          >
            {fullName.charAt(0).toUpperCase()}
          </Avatar>
          <div className={styles.hoverOverlay}></div>
          {specialist?.mainDemoPreviewUrl && (
            <div className={styles.audioPlayerContainer}>
              <Text className={styles.demoText}>Bấm để nghe bản demo</Text>
              <audio
                controls
                className={styles.audioPlayer}
                onClick={e => e.stopPropagation()}
                onPlay={e => e.stopPropagation()}
              >
                <source src={specialist.mainDemoPreviewUrl} type="audio/mpeg" />
              </audio>
            </div>
          )}
          {isSelected && (
            <div className={styles.selectedOverlay}>
              <CheckOutlined className={styles.checkIcon} />
            </div>
          )}
        </div>
        <div className={styles.cardBody}>
          <Title level={5} className={styles.name}>
            {fullName}
          </Title>
          {experienceYears > 0 && (
            <Text type="secondary" className={styles.location}>
              {experienceYears} năm kinh nghiệm
            </Text>
          )}
          <div className={styles.rating}>
            <Rate disabled value={rating} style={{ fontSize: 14 }} />
            <Text type="secondary" className={styles.reviews}>
              ({reviews} reviews)
            </Text>
          </div>
          <Paragraph className={styles.description} ellipsis={{ rows: 2 }}>
            {bio || '\u00A0'}
          </Paragraph>
          {genres.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <Text
                strong
                style={{ fontSize: 12, display: 'block', marginBottom: 4 }}
              >
                GENRES
              </Text>
              <div>
                {genres.slice(0, 3).map(genre => (
                  <Tag key={genre} color="blue" style={{ marginBottom: 4 }}>
                    {genre}
                  </Tag>
                ))}
                {genres.length > 3 && (
                  <Tag color="default">+{genres.length - 3}</Tag>
                )}
              </div>
            </div>
          )}
          {credits.length > 0 && (
            <div className={styles.credits}>
              <Text strong className={styles.creditsTitle}>
                CREDITS
              </Text>
              <Text type="secondary" className={styles.creditsList} ellipsis>
                {credits.slice(0, 2).join(', ')}
                {credits.length > 2 && ` +${credits.length - 2} more`}
              </Text>
            </div>
          )}
          <div className={styles.actionButtons}>
            <Space size="small" style={{ width: '100%' }}>
              <Button
                type="default"
                icon={<EyeOutlined />}
                onClick={handleViewDetail}
                size="small"
                style={{ flex: 1 }}
              >
                View Detail
              </Button>
              <Button
                type={isSelected ? 'primary' : 'default'}
                icon={isSelected ? <CheckOutlined /> : null}
                onClick={handleSelect}
                size="small"
                style={{ flex: 1 }}
                disabled={disabled && !isSelected}
              >
                {isSelected ? 'Selected' : disabled ? 'Đã đủ' : 'Select'}
              </Button>
            </Space>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default VocalistSelectionCard;
