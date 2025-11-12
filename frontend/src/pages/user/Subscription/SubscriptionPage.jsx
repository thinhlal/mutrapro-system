import React from 'react';
import { Card, Button, Typography, Tag } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import ProfileLayout from '../../../layouts/ProfileLayout/ProfileLayout';
import styles from './SubscriptionPage.module.css';

const { Title, Text } = Typography;

const SubscriptionPage = () => {
  const currentPlan = {
    name: 'Free Plan',
    price: 0,
    features: [
      'Up to 3 transcriptions per month',
      'Basic audio quality',
      'Email support',
      'Standard processing time',
    ],
  };

  const plans = [
    {
      id: 1,
      name: 'Basic',
      price: 19,
      period: 'month',
      features: [
        'Up to 10 transcriptions per month',
        'High audio quality',
        'Priority email support',
        'Fast processing time',
        'PDF export',
      ],
      recommended: false,
    },
    {
      id: 2,
      name: 'Professional',
      price: 49,
      period: 'month',
      features: [
        'Unlimited transcriptions',
        'Premium audio quality',
        '24/7 priority support',
        'Express processing',
        'All export formats',
        'API access',
      ],
      recommended: true,
    },
  ];

  return (
    <ProfileLayout>
      <div className={styles.subscriptionContent}>
        <Title level={2}>Subscription</Title>
        <Text type="secondary" className={styles.subtitle}>
          Manage your subscription plan
        </Text>

        <div className={styles.currentPlan}>
          <Card>
            <div className={styles.planHeader}>
              <div>
                <Title level={4} style={{ marginBottom: 8 }}>
                  Current Plan
                </Title>
                <Title level={3} style={{ marginBottom: 0 }}>
                  {currentPlan.name}
                </Title>
              </div>
              <Tag color="blue">Active</Tag>
            </div>
            <ul className={styles.featuresList}>
              {currentPlan.features.map((feature, index) => (
                <li key={index}>
                  <CheckOutlined className={styles.checkIcon} />
                  {feature}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Title level={3} style={{ marginTop: 40, marginBottom: 24 }}>
          Upgrade Your Plan
        </Title>

        <div className={styles.plansGrid}>
          {plans.map(plan => (
            <Card
              key={plan.id}
              className={`${styles.planCard} ${plan.recommended ? styles.recommended : ''}`}
            >
              {plan.recommended && (
                <Tag color="orange" className={styles.recommendedTag}>
                  Recommended
                </Tag>
              )}
              <Title level={4}>{plan.name}</Title>
              <div className={styles.priceSection}>
                <Title level={2} style={{ marginBottom: 0 }}>
                  ${plan.price}
                </Title>
                <Text type="secondary">/{plan.period}</Text>
              </div>
              <ul className={styles.featuresList}>
                {plan.features.map((feature, index) => (
                  <li key={index}>
                    <CheckOutlined className={styles.checkIcon} />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                type={plan.recommended ? 'primary' : 'default'}
                size="large"
                block
                className={styles.upgradeButton}
              >
                Upgrade to {plan.name}
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </ProfileLayout>
  );
};

export default SubscriptionPage;
