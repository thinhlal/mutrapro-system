import { useState, useEffect } from 'react';
import {
  Button,
  Segmented,
  message,
  Spin,
} from 'antd';
import toast from 'react-hot-toast';
import {
  WalletOutlined,
  ExportOutlined,
  DollarOutlined,
  TransactionOutlined,
  FundOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { motion } from 'framer-motion';
import styles from './WalletDashboard.module.css';
import { formatCurrency, formatPercent } from '../Overview/adminDashboardMock';
import { getWalletStatistics } from '../../../services/dashboardService';

const WalletDashboard = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [walletStats, setWalletStats] = useState(null);
  const [topupVolumeOverTime, setTopupVolumeOverTime] = useState(null);
  const [revenueStats, setRevenueStats] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const days = timeRange === '30d' ? 30 : timeRange === '7d' ? 7 : 1;
        const walletStatsResponse = await getWalletStatistics(days);

        if (walletStatsResponse?.status === 'success') {
          setWalletStats(walletStatsResponse.data.statistics);
          setTopupVolumeOverTime(walletStatsResponse.data.topupVolume);
          setRevenueStats(walletStatsResponse.data.revenueStatistics);
        }
      } catch (error) {
        console.error('Error fetching wallet data:', error);
        toast.error('Lỗi khi tải dữ liệu wallet', { duration: 5000, position: 'top-center' });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timeRange]);

  // Prepare revenue over time chart data for ECharts
  const getRevenueOverTimeChartOption = () => {
    if (!revenueStats?.dailyStats || revenueStats.dailyStats.length === 0) {
      return null;
    }

    const days = timeRange === '30d' ? 30 : timeRange === '7d' ? 7 : 1;
    const dateMap = new Map();
    
    revenueStats.dailyStats.forEach(stat => {
      if (stat.date) {
        const dateKey = typeof stat.date === 'string' ? stat.date : stat.date.split('T')[0];
        const topup = Number(stat.topupRevenue || 0);
        const service = Number(stat.serviceRevenue || 0);
        const backendTotal = Number(stat.totalRevenue || 0);
        // Calculate total to ensure consistency: Total = Topup + Service
        // If backend total doesn't match, use calculated total
        const calculatedTotal = topup + service;
        const total = backendTotal === calculatedTotal ? backendTotal : calculatedTotal;
        
        dateMap.set(dateKey, {
          total: total,
          topup: topup,
          service: service,
        });
      }
    });

    const dates = [];
    const totalData = [];
    const topupData = [];
    const serviceData = [];

    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;
      const displayDate = `${month}/${day}`;

      const stats = dateMap.get(dateKey) || { total: 0, topup: 0, service: 0 };
      
      dates.push(displayDate);
      totalData.push(stats.total);
      topupData.push(stats.topup);
      serviceData.push(stats.service);
    }

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
        },
        formatter: (params) => {
          let result = `${params[0].axisValue}<br/>`;
          params.forEach(param => {
            result += `${param.marker}${param.seriesName}: ${formatCurrency(param.value)}<br/>`;
          });
          return result;
        },
      },
      legend: {
        data: ['Total Revenue', 'From Top-ups', 'From Services'],
        bottom: 0,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: dates,
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value) => {
            if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
            if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
            return value;
          },
        },
      },
      series: [
        {
          name: 'Total Revenue',
          type: 'line',
          smooth: true,
          lineStyle: {
            type: 'dashed', // Dashed line để phân biệt với các đường khác
            width: 2,
          },
          // Không dùng areaStyle cho Total để tránh che khuất
          itemStyle: { 
            color: '#f59e0b',
            borderWidth: 2,
          },
          emphasis: {
            focus: 'series',
            lineStyle: {
              width: 3,
            },
          },
          data: totalData,
          z: 1, // Đặt z-index thấp hơn để các đường khác hiển thị rõ hơn
        },
        {
          name: 'From Top-ups',
          type: 'line',
          smooth: true,
          areaStyle: {
            opacity: 0.5,
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(16, 185, 129, 0.7)' },
                { offset: 1, color: 'rgba(16, 185, 129, 0.1)' },
              ],
            },
          },
          lineStyle: {
            width: 2,
          },
          itemStyle: { 
            color: '#10b981',
            borderWidth: 2,
          },
          emphasis: {
            focus: 'series',
            lineStyle: {
              width: 3,
            },
          },
          data: topupData,
          z: 2, // Z-index cao hơn để hiển thị rõ hơn
        },
        {
          name: 'From Services',
          type: 'line',
          smooth: true,
          areaStyle: {
            opacity: 0.5,
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(59, 130, 246, 0.7)' },
                { offset: 1, color: 'rgba(59, 130, 246, 0.1)' },
              ],
            },
          },
          lineStyle: {
            width: 2,
          },
          itemStyle: { 
            color: '#3b82f6',
            borderWidth: 2,
          },
          emphasis: {
            focus: 'series',
            lineStyle: {
              width: 3,
            },
          },
          data: serviceData,
          z: 2, // Z-index cao hơn để hiển thị rõ hơn
        },
      ],
    };
  };

  // Prepare revenue by source pie chart option for ECharts
  const getRevenueBySourceChartOption = () => {
    if (!revenueStats) return null;
    
    const data = [
      {
        name: 'From Top-ups',
        value: Number(revenueStats.fromTopups?.value || 0),
      },
      {
        name: 'From Services',
        value: Number(revenueStats.fromServices?.value || 0),
      },
    ].filter(item => item.value > 0);

    if (data.length === 0) return null;

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params) => {
          return `${params.name}<br/>${params.marker}${formatCurrency(params.value)} (${params.percent}%)`;
        },
      },
      legend: {
        orient: 'horizontal',
        bottom: 0,
        data: data.map(item => item.name),
      },
      series: [
        {
          name: 'Revenue by Source',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: {
            show: true,
            formatter: (params) => {
              return `${params.name}\n${formatCurrency(params.value)}`;
            },
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold',
            },
          },
          data: data,
          color: ['#10b981', '#3b82f6'],
        },
      ],
    };
  };

  // Prepare transaction count by type bar chart option for ECharts
  const getTransactionCountByTypeChartOption = () => {
    if (!walletStats?.transactionsByType || Object.keys(walletStats.transactionsByType).length === 0) {
      return null;
    }

    const typeDisplayMap = {
      topup: 'Top-up',
      payment: 'Payment',
      contract_deposit_payment: 'Contract Deposit',
      milestone_payment: 'Milestone Payment',
      recording_booking_payment: 'Recording Booking',
      revision_fee: 'Revision Fee',
      refund: 'Refund',
      withdrawal: 'Withdrawal',
      adjustment: 'Adjustment',
    };

    const data = Object.entries(walletStats.transactionsByType)
      .map(([type, count]) => ({
        name: typeDisplayMap[type] || type,
        value: Number(count || 0),
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value); // Sort descending

    if (data.length === 0) return null;

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        formatter: (params) => {
          const param = params[0];
          return `${param.name}<br/>${param.marker}${param.value.toLocaleString()} transactions`;
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: data.map(item => item.name),
        axisLabel: {
          rotate: 45, // Rotate labels if needed
          interval: 0,
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value) => {
            if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
            if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
            return value;
          },
        },
      },
      series: [
        {
          name: 'Transaction Count',
          type: 'bar',
          barWidth: '60%',
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#8b5cf6' },
                { offset: 1, color: '#6366f1' },
              ],
            },
            borderRadius: [4, 4, 0, 0],
          },
          label: {
            show: true,
            position: 'top',
            formatter: (params) => params.value.toLocaleString(),
            fontSize: 11,
          },
          data: data.map(item => item.value),
        },
      ],
    };
  };

  // Prepare transaction types pie chart option for ECharts
  const getTransactionTypesChartOption = () => {
    if (!walletStats?.transactionsByType || Object.keys(walletStats.transactionsByType).length === 0) {
      return null;
    }

    const typeDisplayMap = {
      topup: 'Top-up',
      payment: 'Payment',
      contract_deposit_payment: 'Contract Deposit',
      milestone_payment: 'Milestone Payment',
      recording_booking_payment: 'Recording Booking',
      revision_fee: 'Revision Fee',
      refund: 'Refund',
      withdrawal: 'Withdrawal',
      adjustment: 'Adjustment',
    };

    const data = Object.entries(walletStats.transactionsByType)
      .map(([type, count]) => ({
        name: typeDisplayMap[type] || type,
        value: Number(count || 0),
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);

    if (data.length === 0) return null;

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params) => {
          return `${params.name}<br/>${params.marker}${params.value.toLocaleString()} transactions (${params.percent}%)`;
        },
      },
      legend: {
        orient: 'horizontal',
        bottom: 0,
        data: data.map(item => item.name),
      },
      series: [
        {
          name: 'Transaction Types',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: {
            show: false,
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold',
            },
          },
          data: data,
          color: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#f97316'],
        },
      ],
    };
  };

  // Prepare topup volume chart option for ECharts
  const getTopupsVolumeChartOption = () => {
    if (!topupVolumeOverTime?.dailyStats || topupVolumeOverTime.dailyStats.length === 0) {
      return null;
    }

    const days = timeRange === '30d' ? 30 : timeRange === '7d' ? 7 : 1;
    const dateAmountMap = new Map();
    
    topupVolumeOverTime.dailyStats.forEach(stat => {
      if (stat.date) {
        const dateKey = typeof stat.date === 'string' ? stat.date : stat.date.split('T')[0];
        dateAmountMap.set(dateKey, Number(stat.amount || 0));
      }
    });

    const dates = [];
    const amounts = [];

    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;
      const displayDate = `${month}/${day}`;
      const amount = dateAmountMap.get(dateKey) || 0;

      dates.push(displayDate);
      amounts.push(amount);
    }

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        formatter: (params) => {
          const param = params[0];
          return `${param.axisValue}<br/>${param.marker}${formatCurrency(param.value)}`;
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisTick: {
          alignWithLabel: true,
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value) => {
            if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
            if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
            return value;
          },
        },
      },
      series: [
        {
          name: 'Top-up Volume',
          type: 'bar',
          barWidth: '60%',
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#10b981' },
                { offset: 1, color: '#059669' },
              ],
            },
            borderRadius: [6, 6, 0, 0],
          },
          label: {
            show: true,
            position: 'top',
            formatter: (params) => formatCurrency(params.value),
            fontSize: 11,
          },
          data: amounts,
        },
      ],
    };
  };

  const handleExport = () => {
    message.success('Wallet report exported successfully!');
  };

  const kpiCards = [
    {
      key: 'totalBalance',
      label: 'Total Wallet Balance',
      value: walletStats?.totalBalance ? Number(walletStats.totalBalance) : 0,
      icon: <WalletOutlined />,
      color: '#10b981',
      bgColor: '#ecfdf5',
      isCurrency: true,
    },
    {
      key: 'totalWallets',
      label: 'Total Wallets',
      value: walletStats?.totalWallets || 0,
      icon: <WalletOutlined />,
      color: '#3b82f6',
      bgColor: '#eff6ff',
    },
    {
      key: 'totalTransactions',
      label: 'Total Transactions',
      value: walletStats?.totalTransactions || 0,
      icon: <TransactionOutlined />,
      color: '#8b5cf6',
      bgColor: '#f5f3ff',
    },
    {
      key: 'totalRevenue',
      label: 'Total Revenue',
      value: revenueStats?.total?.value ? Number(revenueStats.total.value) : 0,
      icon: <DollarOutlined />,
      color: '#f59e0b',
      bgColor: '#fffbeb',
      isCurrency: true,
    },
  ];

  // Prepare average transaction value over time chart option for ECharts
  const getAverageTransactionValueChartOption = () => {
    if (!revenueStats?.dailyStats || revenueStats.dailyStats.length === 0) {
      return null;
    }

    const days = timeRange === '30d' ? 30 : timeRange === '7d' ? 7 : 1;
    const dates = [];
    const avgTopupData = [];
    const avgServiceData = [];

    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;
      const displayDate = `${month}/${day}`;

      // Find revenue stats for this date (average values already calculated in backend)
      const dailyStat = revenueStats.dailyStats.find(s => {
        const sDate = typeof s.date === 'string' ? s.date : s.date?.split('T')[0];
        return sDate === dateKey;
      });

      // Use average values from backend
      const avgTopup = dailyStat?.avgTopupTransactionValue != null 
        ? Number(dailyStat.avgTopupTransactionValue) 
        : null;
      const avgService = dailyStat?.avgServiceTransactionValue != null 
        ? Number(dailyStat.avgServiceTransactionValue) 
        : null;

      dates.push(displayDate);
      avgTopupData.push(avgTopup);
      avgServiceData.push(avgService);
    }

    // If no valid data, return null
    if (avgTopupData.every(v => v === null) && avgServiceData.every(v => v === null)) {
      return null;
    }

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
        },
        formatter: (params) => {
          let result = `${params[0].axisValue}<br/>`;
          params.forEach(param => {
            if (param.value !== null && param.value !== undefined) {
              result += `${param.marker}${param.seriesName}: ${formatCurrency(param.value)}<br/>`;
            }
          });
          return result;
        },
      },
      legend: {
        data: ['Avg Top-up Value', 'Avg Service Value'],
        bottom: 0,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisTick: {
          alignWithLabel: true,
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value) => {
            if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
            if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
            return value;
          },
        },
      },
      series: [
        {
          name: 'Avg Top-up Value',
          type: 'line',
          smooth: true,
          lineStyle: {
            width: 2,
          },
          itemStyle: { color: '#10b981' },
          data: avgTopupData,
        },
        {
          name: 'Avg Service Value',
          type: 'line',
          smooth: true,
          lineStyle: {
            width: 2,
          },
          itemStyle: { color: '#3b82f6' },
          data: avgServiceData,
        },
      ],
    };
  };

  const revenueOverTimeOption = getRevenueOverTimeChartOption();
  const revenueBySourceOption = getRevenueBySourceChartOption();
  const transactionTypesOption = getTransactionTypesChartOption();
  const transactionCountByTypeOption = getTransactionCountByTypeChartOption();
  const topupsVolumeOption = getTopupsVolumeChartOption();
  const averageTransactionValueOption = getAverageTransactionValueChartOption();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <motion.div
      className={styles.container}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Wallet & Revenue Dashboard</h1>
          <p>Wallet statistics and revenue analytics</p>
        </div>
        <div className={styles.headerRight}>
          <Segmented
            options={[
              { label: 'Today', value: 'today' },
              { label: '7 Days', value: '7d' },
              { label: '30 Days', value: '30d' },
            ]}
            value={timeRange}
            onChange={setTimeRange}
          />
          <Button
            type="primary"
            icon={<ExportOutlined />}
            onClick={handleExport}
          >
            Export Report
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <motion.div
        className={styles.kpiGrid}
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
        }}
        initial="hidden"
        animate="visible"
      >
        {kpiCards.map((card) => (
          <motion.div
            key={card.key}
            className={styles.kpiCard}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
            }}
          >
            <div
              className={styles.kpiIcon}
              style={{ background: card.bgColor, color: card.color }}
            >
              {card.icon}
            </div>
            <div className={styles.kpiValue}>
              {card.isCurrency
                ? formatCurrency(card.value)
                : card.value.toLocaleString()}
            </div>
            <div className={styles.kpiLabel}>{card.label}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Revenue Summary Cards */}
      {revenueStats && (
        <motion.div
          className={styles.revenueSummaryGrid}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <motion.div
            className={styles.kpiCard}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
            }}
            initial="hidden"
            animate="visible"
          >
            <div
              className={styles.kpiIcon}
              style={{ background: '#ecfdf5', color: '#10b981' }}
            >
              <DollarOutlined />
            </div>
            <div className={styles.kpiValue}>
              {formatCurrency(Number(revenueStats.fromTopups?.value || 0))}
            </div>
            <div className={styles.kpiLabel}>Revenue from Top-ups</div>
            {revenueStats.fromTopups?.trend !== undefined && (
              <div className={styles.kpiTrend}>
                <span className={revenueStats.fromTopups.trend >= 0 ? styles.trendUp : styles.trendDown}>
                  {revenueStats.fromTopups.trend >= 0 ? '↑' : '↓'} {formatPercent(revenueStats.fromTopups.trend)}
                </span>
              </div>
            )}
          </motion.div>
          <motion.div
            className={styles.kpiCard}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
            }}
            initial="hidden"
            animate="visible"
          >
            <div
              className={styles.kpiIcon}
              style={{ background: '#eff6ff', color: '#3b82f6' }}
            >
              <DollarOutlined />
            </div>
            <div className={styles.kpiValue}>
              {formatCurrency(Number(revenueStats.fromServices?.value || 0))}
            </div>
            <div className={styles.kpiLabel}>Revenue from Services</div>
            {revenueStats.fromServices?.trend !== undefined && (
              <div className={styles.kpiTrend}>
                <span className={revenueStats.fromServices.trend >= 0 ? styles.trendUp : styles.trendDown}>
                  {revenueStats.fromServices.trend >= 0 ? '↑' : '↓'} {formatPercent(revenueStats.fromServices.trend)}
                </span>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}

      {/* Charts Grid */}
      <div className={styles.chartsGrid}>
        {/* Revenue Over Time */}
        {revenueOverTimeOption && (
          <motion.div
            className={styles.chartCard}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className={styles.chartTitle}>Revenue Over Time</div>
            <div className={styles.chartWrapper}>
              <ReactECharts
                option={revenueOverTimeOption}
                style={{ height: '100%', width: '100%' }}
                opts={{ renderer: 'svg' }}
              />
            </div>
          </motion.div>
        )}

        {/* Revenue by Source */}
        {revenueBySourceOption && (
          <motion.div
            className={styles.chartCard}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className={styles.chartTitle}>Revenue by Source</div>
            <div className={styles.chartWrapper}>
              <ReactECharts
                option={revenueBySourceOption}
                style={{ height: '100%', width: '100%' }}
                opts={{ renderer: 'svg' }}
              />
            </div>
          </motion.div>
        )}

        {/* Topup Volume Over Time */}
        {topupsVolumeOption && (
          <motion.div
            className={styles.chartCard}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className={styles.chartTitle}>Top-up Volume Over Time</div>
            <div className={styles.chartWrapper}>
              <ReactECharts
                option={topupsVolumeOption}
                style={{ height: '100%', width: '100%' }}
                opts={{ renderer: 'svg' }}
              />
            </div>
          </motion.div>
        )}

        {/* Transaction Types Distribution */}
        {transactionTypesOption && (
          <motion.div
            className={styles.chartCard}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className={styles.chartTitle}>Transaction Types Distribution</div>
            <div className={styles.chartWrapper}>
              <ReactECharts
                option={transactionTypesOption}
                style={{ height: '100%', width: '100%' }}
                opts={{ renderer: 'svg' }}
              />
            </div>
          </motion.div>
        )}

        {/* Transaction Count by Type */}
        {transactionCountByTypeOption && (
          <motion.div
            className={styles.chartCard}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className={styles.chartTitle}>Transaction Count by Type</div>
            <div className={styles.chartWrapper}>
              <ReactECharts
                option={transactionCountByTypeOption}
                style={{ height: '100%', width: '100%' }}
                opts={{ renderer: 'svg' }}
              />
            </div>
          </motion.div>
        )}

        {/* Average Transaction Value Over Time */}
        {averageTransactionValueOption && (
          <motion.div
            className={styles.chartCard}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className={styles.chartTitle}>Average Transaction Value Over Time</div>
            <div className={styles.chartWrapper}>
              <ReactECharts
                option={averageTransactionValueOption}
                style={{ height: '100%', width: '100%' }}
                opts={{ renderer: 'svg' }}
              />
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default WalletDashboard;

