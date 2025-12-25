import { Button, Tooltip } from 'antd';
import {
  RiseOutlined,
  FallOutlined,
  MoreOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { Tiny } from '@ant-design/plots';
import { motion } from 'framer-motion';
import styles from './Dashboard.module.css';
import { formatCurrency, formatPercent } from './adminDashboardMock';

const RevenueSummaryCard = ({ data, timeRange }) => {
  // Return null if no data
  if (!data || !data.total || !data.fromTopups || !data.fromServices) {
    return null;
  }

  const metrics = [
    { 
      key: 'total', 
      label: 'Total Revenue', 
      value: data.total.value, 
      trend: data.total.trend, 
      sparkline: data.total.sparkline || [] 
    },
    { 
      key: 'topups', 
      label: 'From Top-ups', 
      value: data.fromTopups.value, 
      trend: data.fromTopups.trend, 
      sparkline: data.fromTopups.sparkline || [] 
    },
    { 
      key: 'services', 
      label: 'From Services', 
      value: data.fromServices.value, 
      trend: data.fromServices.trend, 
      sparkline: data.fromServices.sparkline || [] 
    },
  ];

  const prevLabel =
    timeRange === 'today'
      ? 'yesterday'
      : timeRange === '7d'
        ? 'prev 7d'
        : 'prev 30d';

  return (
    <motion.div
      className={styles.revenuePremiumCard}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className={styles.revenueCardHeader}>
        <div className={styles.revenueCardTitle}>
          <DollarOutlined />
          <span>Revenue Summary ({timeRange})</span>
        </div>
        <Tooltip title="View details">
          <Button
            type="text"
            icon={<MoreOutlined />}
            className={styles.revenueMoreBtn}
          />
        </Tooltip>
      </div>

      <div className={styles.revenueMetrics}>
        {metrics.map((metric, idx) => {
          const isPositive = metric.trend >= 0;
          return (
            <div key={metric.key} className={styles.revenueMetric}>
              <div className={styles.metricContent}>
                <span className={styles.metricLabel}>{metric.label}</span>
                <span className={styles.metricValue}>
                  {formatCurrency(metric.value)}
                </span>
                <div
                  className={`${styles.metricTrend} ${isPositive ? styles.trendPositive : styles.trendNegative}`}
                >
                  {isPositive ? <RiseOutlined /> : <FallOutlined />}
                  <span>
                    {formatPercent(metric.trend)} vs {prevLabel}
                  </span>
                </div>
              </div>
              <div className={styles.metricSparkline}>
                {metric.sparkline && metric.sparkline.length > 0 && (
                  <Tiny.Area
                    data={metric.sparkline.map((v, i) => ({ 
                      x: i, 
                      y: typeof v === 'number' ? v : (typeof v === 'object' && v != null ? Number(v) : 0)
                    }))}
                    xField="x"
                    yField="y"
                    height={40}
                    width={80}
                    smooth
                    areaStyle={{ fill: 'rgba(255,255,255,0.3)' }}
                    line={{
                      style: { stroke: 'rgba(255,255,255,0.8)', lineWidth: 2 },
                    }}
                  />
                )}
              </div>
              {idx < metrics.length - 1 && (
                <div className={styles.metricDivider} />
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default RevenueSummaryCard;
