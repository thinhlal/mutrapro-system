// VocalistSelectionCard.jsx - Card cho vocalist selection trong flow
import { Card, Typography, Rate, Button, Space } from 'antd';
import { EyeOutlined, CheckOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import styles from './VocalistSelectionCard.module.css';

const { Title, Text, Paragraph } = Typography;

export default function VocalistSelectionCard({
  singer,
  isSelected,
  onSelect,
  onViewDetail,
  selectedId,
}) {
  const navigate = useNavigate();

  const handleCardClick = e => {
    // Prevent navigation if clicking on buttons
    if (e.target.closest('button') || e.target.closest('a')) {
      return;
    }
    // Select on card click
    if (onSelect) {
      onSelect(singer.id);
    }
  };

  const handleViewDetail = e => {
    e.stopPropagation();
    e.preventDefault();
    if (onViewDetail) {
      onViewDetail(singer.id);
    } else {
      // Default: navigate to detail page with flow context
      navigate(`/pros/singer/${singer.id}`, {
        state: {
          singerData: singer,
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
    if (onSelect) {
      onSelect(singer.id);
    }
  };

  return (
    <div className="col-12 col-md-6 col-lg-4 col-xl-3 mb-4">
      <Card
        hoverable
        className={`${styles.card} ${isSelected ? styles.selected : ''}`}
        onClick={handleCardClick}
        styles={{ body: { padding: 0 } }}
      >
        <div className={styles.imageContainer}>
          <img
            src={singer.image}
            alt={singer.name}
            className={styles.singerImage}
          />
          {singer.isOnline && <div className={styles.onlineBadge}>ONLINE</div>}
          {isSelected && (
            <div className={styles.selectedOverlay}>
              <CheckOutlined className={styles.checkIcon} />
            </div>
          )}
        </div>
        <div className={styles.cardBody}>
          <Text strong className={styles.roles}>
            {Array.isArray(singer.roles)
              ? singer.roles.join(' • ')
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
          <Paragraph className={styles.description} ellipsis={{ rows: 2 }}>
            {singer.description}
          </Paragraph>
          <div className={styles.credits}>
            <Text strong className={styles.creditsTitle}>
              CREDITS
            </Text>
            <Text type="secondary" className={styles.creditsList} ellipsis>
              {singer.credits.join(', ')}
            </Text>
          </div>
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
              >
                {isSelected ? 'Selected' : 'Select'}
              </Button>
            </Space>
          </div>
        </div>
      </Card>
    </div>
  );
}
