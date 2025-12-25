import { useState, useEffect } from 'react';
import {
  Typography,
  Button,
  Segmented,
  Table,
  Tag,
  Badge,
  Alert,
  message,
  Spin,
} from 'antd';
import {
  UserOutlined,
  UserAddOutlined,
  WalletOutlined,
  FileTextOutlined,
  SolutionOutlined,
  ClockCircleOutlined,
  ExportOutlined,
  BellOutlined,
  RiseOutlined,
  FallOutlined,
  CustomerServiceOutlined,
  ToolOutlined,
  TeamOutlined,
  TrophyOutlined,
  VideoCameraOutlined,
  CalendarOutlined,
  EditOutlined,
  AudioOutlined,
} from '@ant-design/icons';
import { Line, Pie, Column } from '@ant-design/plots';
import { motion } from 'framer-motion';
import styles from './Dashboard.module.css';
import RevenueSummaryCard from './RevenueSummaryCard';
import {
  kpis,
  chartsData,
  recentRequests,
  riskyTasks,
  moduleSummary,
  alerts,
  recentContracts,
  upcomingStudioBookings,
  revenueData,
  formatCurrency,
  formatPercent,
  mapStatusToTag,
} from './adminDashboardMock';
import { getUserStatistics, getRequestStatistics, getWalletStatistics } from '../../../services/dashboardService';

const { Title, Text } = Typography;

const Dashboard = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [walletStats, setWalletStats] = useState(null);
  const [requestStats, setRequestStats] = useState(null);

  // Fetch dashboard data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [userStatsResponse, walletStatsResponse, requestStatsResponse] = await Promise.all([
          getUserStatistics(),
          getWalletStatistics(),
          getRequestStatistics(),
        ]);
        console.log("userStatsResponse", userStatsResponse);
        console.log("walletStatsResponse", walletStatsResponse);
        console.log("requestStatsResponse", requestStatsResponse);
        if (userStatsResponse?.status === 'success') {
          setDashboardData(userStatsResponse.data);
        }
        if (walletStatsResponse?.status === 'success') {
          setWalletStats(walletStatsResponse.data);
        }
        if (requestStatsResponse?.status === 'success') {
          setRequestStats(requestStatsResponse.data);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        message.error('Lỗi khi tải dữ liệu dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Map real data to KPIs (fallback to mock data if real data not available)
  const getCurrentKpis = () => {
    if (!dashboardData || !walletStats || !requestStats) {
      return kpis[timeRange];
    }

    // dashboardData is now directly UserStatisticsResponse, not {userStats: ...}
    const userStats = dashboardData || {};
    const requestData = requestStats || {};

    // Calculate total requests
    const totalRequests = requestData.totalRequests || 0;
    const byStatus = requestData.byStatus || {};
    console.log(requestData);
    
    // Open requests = all statuses except completed, cancelled, rejected
    // Backend uses lowercase enum values: pending, contract_sent, contract_approved, contract_signed, awaiting_assignment, in_progress, completed, cancelled, rejected
    const openRequests = 
      (byStatus.pending || 0) +
      (byStatus.contract_sent || 0) +
      (byStatus.contract_approved || 0) +
      (byStatus.contract_signed || 0) +
      (byStatus.awaiting_assignment || 0) +
      (byStatus.in_progress || 0);

    // Calculate active contracts from request stats (if we have contract stats in future, use that)
    // For now, use total requests as approximation (since each active contract relates to a request)
    // This is a placeholder - ideally we'd fetch contract statistics separately
    const activeContracts = totalRequests; // Placeholder - should fetch from contract statistics API

    // Calculate overdue tasks - placeholder for now
    // Ideally we'd fetch task statistics and calculate overdue from deadline dates
    const overdueTasks = 0; // Placeholder - should fetch from task statistics API

    // For now, use real data where available, mock data for trends
    // Note: Trends are calculated from historical data, not available in current API
    return {
      totalUsers: {
        value: userStats.totalUsers || 0,
        trend: 0, // Trends require historical data comparison - set to 0 for now
      },
      newUsers: {
        value: userStats.activeUsers || 0,
        trend: 0,
      },
      totalBalance: {
        value: walletStats.totalBalance ? Number(walletStats.totalBalance) : 0,
        trend: 0,
      },
      openRequests: {
        value: openRequests,
        trend: 0,
      },
      activeContracts: {
        value: activeContracts,
        trend: 0,
      },
      overdueTasks: {
        value: overdueTasks,
        trend: 0,
      },
    };
  };

  const currentKpis = getCurrentKpis();
  const currentCharts = chartsData[timeRange];

  const handleExport = () => {
    message.success('Report exported successfully!');
  };

  const kpiCards = [
    {
      key: 'totalUsers',
      label: 'Total Users',
      icon: <UserOutlined />,
      color: '#3b82f6',
      bgColor: '#eff6ff',
    },
    {
      key: 'newUsers',
      label: 'Active Users',
      icon: <UserAddOutlined />,
      color: '#8b5cf6',
      bgColor: '#f5f3ff',
    },
    {
      key: 'totalBalance',
      label: 'Total Wallet Balance',
      icon: <WalletOutlined />,
      color: '#10b981',
      bgColor: '#ecfdf5',
      isCurrency: true,
    },
    {
      key: 'openRequests',
      label: 'Open Requests',
      icon: <FileTextOutlined />,
      color: '#f59e0b',
      bgColor: '#fffbeb',
    },
    {
      key: 'activeContracts',
      label: 'Active Contracts',
      icon: <SolutionOutlined />,
      color: '#06b6d4',
      bgColor: '#ecfeff',
    },
    {
      key: 'overdueTasks',
      label: 'Overdue Tasks',
      icon: <ClockCircleOutlined />,
      color: '#ef4444',
      bgColor: '#fef2f2',
    },
  ];

  const requestColumns = [
    { title: 'Code', dataIndex: 'code', key: 'code', width: 130 },
    {
      title: 'Customer',
      dataIndex: 'customer',
      key: 'customer',
      ellipsis: true,
    },
    { title: 'Type', dataIndex: 'type', key: 'type', width: 110 },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: status => {
        const { color, text } = mapStatusToTag(status);
        return <Tag color={color}>{text}</Tag>;
      },
    },
    { title: 'Created', dataIndex: 'createdAt', key: 'createdAt', width: 100 },
    {
      title: 'Price',
      dataIndex: 'totalPrice',
      key: 'totalPrice',
      width: 120,
      render: val => formatCurrency(val),
    },
    {
      title: '',
      key: 'action',
      width: 60,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          onClick={() => message.info(`View ${record.code}`)}
        >
          View
        </Button>
      ),
    },
  ];

  const taskColumns = [
    { title: 'Task', dataIndex: 'task', key: 'task', ellipsis: true },
    { title: 'Assignee', dataIndex: 'assignee', key: 'assignee', width: 100 },
    { title: 'Due', dataIndex: 'dueDate', key: 'dueDate', width: 100 },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: status => {
        const { color, text } = mapStatusToTag(status);
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '',
      key: 'action',
      width: 60,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          onClick={() => message.info(`Open: ${record.task}`)}
        >
          Open
        </Button>
      ),
    },
  ];

  const modules = [
    {
      key: 'notation',
      icon: (
        <CustomerServiceOutlined style={{ fontSize: 24, color: '#3b82f6' }} />
      ),
      title: 'Notation Instruments',
      stat: moduleSummary.notationInstruments.total,
      sub: `Most used: ${moduleSummary.notationInstruments.mostUsed}`,
    },
    {
      key: 'equipment',
      icon: <ToolOutlined style={{ fontSize: 24, color: '#8b5cf6' }} />,
      title: 'Equipment',
      stat: `${moduleSummary.equipment.available}/${moduleSummary.equipment.booked}/${moduleSummary.equipment.maintenance}`,
      sub: 'Avail / Booked / Maint',
    },
    {
      key: 'specialists',
      icon: <TeamOutlined style={{ fontSize: 24, color: '#10b981' }} />,
      title: 'Specialists',
      stat: `${moduleSummary.specialists.active}`,
      sub: `${moduleSummary.specialists.acceptanceRate}% acceptance`,
    },
    {
      key: 'skills',
      icon: <TrophyOutlined style={{ fontSize: 24, color: '#f59e0b' }} />,
      title: 'Skills',
      stat: moduleSummary.skills.total,
      sub: `Top: ${moduleSummary.skills.topDemanded}`,
    },
    {
      key: 'demos',
      icon: <VideoCameraOutlined style={{ fontSize: 24, color: '#06b6d4' }} />,
      title: 'Demo Management',
      stat: moduleSummary.demoManagement.total,
      sub: `${moduleSummary.demoManagement.active} active`,
    },
    {
      key: 'studioBookings',
      icon: <CalendarOutlined style={{ fontSize: 24, color: '#ec4899' }} />,
      title: 'Studio Bookings',
      stat: moduleSummary.studioBookings.total,
      sub: `${moduleSummary.studioBookings.upcoming} upcoming`,
    },
    {
      key: 'revisions',
      icon: <EditOutlined style={{ fontSize: 24, color: '#f97316' }} />,
      title: 'Revision Requests',
      stat: moduleSummary.revisionRequests.pending,
      sub: `${moduleSummary.revisionRequests.approved} approved`,
    },
    {
      key: 'transcription',
      icon: <AudioOutlined style={{ fontSize: 24, color: '#14b8a6' }} />,
      title: 'Transcription Jobs',
      stat: moduleSummary.transcriptionAssignments.inProgress,
      sub: `${moduleSummary.transcriptionAssignments.pending} pending`,
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

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
          <h1>Admin Dashboard</h1>
          <p>System overview & key metrics</p>
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
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {kpiCards.map((card, index) => {
          const data = currentKpis[card.key];
          const isPositive = data.trend >= 0;
          return (
            <motion.div
              key={card.key}
              className={styles.kpiCard}
              variants={itemVariants}
            >
              <div
                className={styles.kpiIcon}
                style={{ background: card.bgColor, color: card.color }}
              >
                {card.icon}
              </div>
              <div className={styles.kpiValue}>
                {card.isCurrency
                  ? formatCurrency(data.value)
                  : data.value.toLocaleString()}
              </div>
              <div className={styles.kpiLabel}>{card.label}</div>
              {data.trend !== 0 && (
                <div
                  className={`${styles.kpiTrend} ${isPositive ? styles.trendUp : styles.trendDown}`}
                >
                  {isPositive ? <RiseOutlined /> : <FallOutlined />}
                  {formatPercent(data.trend)}
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* Charts */}
      <div className={styles.chartsGrid}>
        <motion.div
          className={styles.chartCard}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <div className={styles.chartTitle}>New Users Over Time</div>
          <div className={styles.chartWrapper}>
            <Line
              data={currentCharts.newUsersOverTime}
              xField="date"
              yField="users"
              smooth
              color="#3b82f6"
              areaStyle={{ fill: 'l(270) 0:#fff 1:#3b82f6', fillOpacity: 0.15 }}
              point={{ size: 3, shape: 'circle' }}
            />
          </div>
        </motion.div>

        <motion.div
          className={styles.chartCard}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <div className={styles.chartTitle}>Requests by Type</div>
          <div className={styles.chartWrapper}>
            <Pie
              data={currentCharts.requestsByType}
              angleField="value"
              colorField="type"
              radius={0.8}
              innerRadius={0.6}
              label={false}
              legend={{ position: 'bottom' }}
              color={['#3b82f6', '#8b5cf6', '#10b981']}
            />
          </div>
        </motion.div>

        <motion.div
          className={styles.chartCard}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <div className={styles.chartTitle}>Top-ups Volume</div>
          <div className={styles.chartWrapper}>
            <Column
              data={currentCharts.topupsVolume}
              xField="date"
              yField="amount"
              color="#10b981"
              columnStyle={{ radius: [6, 6, 0, 0] }}
              label={false}
            />
          </div>
        </motion.div>
      </div>

      {/* Tables Row 1 */}
      <div className={styles.tablesGrid}>
        <motion.div
          className={styles.tableCard}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <div className={styles.tableTitle}>Latest Service Requests</div>
          <Table
            dataSource={recentRequests}
            columns={requestColumns}
            size="small"
            pagination={false}
            scroll={{ x: 600 }}
          />
        </motion.div>

        <motion.div
          className={styles.tableCard}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <div className={styles.tableTitle}>Overdue Tasks</div>
          <Table
            dataSource={riskyTasks}
            columns={taskColumns}
            size="small"
            pagination={false}
            scroll={{ x: 500 }}
          />
        </motion.div>
      </div>

      {/* Tables Row 2 */}
      <div className={styles.tablesGrid}>
        <motion.div
          className={styles.tableCard}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <div className={styles.tableTitle}>Recent Contracts</div>
          <Table
            dataSource={recentContracts}
            columns={[
              { title: 'Code', dataIndex: 'code', key: 'code', width: 120 },
              {
                title: 'Customer',
                dataIndex: 'customer',
                key: 'customer',
                ellipsis: true,
              },
              { title: 'Type', dataIndex: 'type', key: 'type', width: 110 },
              {
                title: 'Status',
                dataIndex: 'status',
                key: 'status',
                width: 120,
                render: status => {
                  const { color, text } = mapStatusToTag(status);
                  return <Tag color={color}>{text}</Tag>;
                },
              },
              {
                title: 'Value',
                dataIndex: 'totalValue',
                key: 'totalValue',
                width: 130,
                render: val => formatCurrency(val),
              },
              {
                title: '',
                key: 'action',
                width: 60,
                render: (_, record) => (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => message.info(`View ${record.code}`)}
                  >
                    View
                  </Button>
                ),
              },
            ]}
            size="small"
            pagination={false}
            scroll={{ x: 550 }}
          />
        </motion.div>

        <motion.div
          className={styles.tableCard}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <div className={styles.tableTitle}>Upcoming Studio Bookings</div>
          <Table
            dataSource={upcomingStudioBookings}
            columns={[
              {
                title: 'Studio',
                dataIndex: 'studio',
                key: 'studio',
                width: 90,
              },
              {
                title: 'Customer',
                dataIndex: 'customer',
                key: 'customer',
                ellipsis: true,
              },
              { title: 'Date', dataIndex: 'date', key: 'date', width: 100 },
              { title: 'Time', dataIndex: 'time', key: 'time', width: 120 },
              {
                title: 'Status',
                dataIndex: 'status',
                key: 'status',
                width: 100,
                render: status => {
                  const { color, text } = mapStatusToTag(status);
                  return <Tag color={color}>{text}</Tag>;
                },
              },
            ]}
            size="small"
            pagination={false}
            scroll={{ x: 450 }}
          />
        </motion.div>
      </div>

      {/* Revenue Summary Card */}
      <RevenueSummaryCard data={revenueData[timeRange]} timeRange={timeRange} />

      {/* Module Summary */}
      <motion.div
        className={styles.modulesGrid}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {modules.map(mod => (
          <motion.div
            key={mod.key}
            className={styles.moduleCard}
            variants={itemVariants}
            onClick={() => message.info(`Navigate to ${mod.title}`)}
          >
            <div className={styles.moduleIcon}>{mod.icon}</div>
            <div className={styles.moduleTitle}>{mod.title}</div>
            <div className={styles.moduleStat}>{mod.stat}</div>
            <div className={styles.moduleSubtext}>{mod.sub}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Alerts Panel */}
      <motion.div
        className={styles.alertsPanel}
        variants={itemVariants}
        initial="hidden"
        animate="visible"
      >
        <div className={styles.alertsTitle}>
          <BellOutlined /> System Alerts
        </div>
        <div className={styles.alertsList}>
          {alerts.map((alert, idx) => (
            <Alert
              key={idx}
              message={alert.message}
              type={alert.type}
              showIcon
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;
