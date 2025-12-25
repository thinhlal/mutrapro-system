import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Button,
  Segmented,
  Table,
  Tag,
  Badge,
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
  RiseOutlined,
  FallOutlined,
  CustomerServiceOutlined,
  ToolOutlined,
  TeamOutlined,
  TrophyOutlined,
  CalendarOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { Line, Pie, Column } from '@ant-design/plots';
import { motion } from 'framer-motion';
import styles from './Dashboard.module.css';
import RevenueSummaryCard from './RevenueSummaryCard';
import {
  formatCurrency,
  formatPercent,
  mapStatusToTag,
} from './adminDashboardMock';
import { getUserStatistics, getRequestStatistics, getWalletStatistics, getProjectStatistics, getLatestServiceRequests, getLatestContracts, getAllSpecialistModuleStatistics } from '../../../services/dashboardService';

const { Title, Text } = Typography;

const Dashboard = () => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState('7d');
  const [initialLoading, setInitialLoading] = useState(true); // Loading ban đầu (chỉ KPI cards)
  const [chartsLoading, setChartsLoading] = useState(true); // Loading cho charts/tables
  const [dashboardData, setDashboardData] = useState(null);
  const [walletStats, setWalletStats] = useState(null);
  const [requestStats, setRequestStats] = useState(null); // requests và notationInstruments
  const [projectStats, setProjectStats] = useState(null); // contracts và tasks
  const [userStatsOverTime, setUserStatsOverTime] = useState(null);
  const [topupVolumeOverTime, setTopupVolumeOverTime] = useState(null);
  const [latestRequests, setLatestRequests] = useState(null);
  const [latestContracts, setLatestContracts] = useState(null);
  const [revenueStats, setRevenueStats] = useState(null);
  const [specialistModuleStats, setSpecialistModuleStats] = useState(null); // specialists, skills

  // Fetch dashboard data với progressive loading
  useEffect(() => {
    const fetchData = async () => {
      setInitialLoading(true);
      setChartsLoading(true);
      try {
        // Determine days based on timeRange
        const days = timeRange === '30d' ? 30 : timeRange === '7d' ? 7 : 1;

        // Load KPI data trước (statistics cơ bản)
        const [userStatsResponse, walletStatsResponse, requestStatsResponse, projectStatsResponse, specialistModuleStatsResponse] = await Promise.all([
          getUserStatistics(days),
          getWalletStatistics(days),
          getRequestStatistics(),
          getProjectStatistics(),
          getAllSpecialistModuleStatistics(),
        ]);

        // Set KPI data ngay khi có
        if (userStatsResponse?.status === 'success') {
          setDashboardData(userStatsResponse.data.statistics);
          setUserStatsOverTime(userStatsResponse.data.statisticsOverTime);
        }
        if (walletStatsResponse?.status === 'success') {
          setWalletStats(walletStatsResponse.data.statistics);
          setTopupVolumeOverTime(walletStatsResponse.data.topupVolume);
          setRevenueStats(walletStatsResponse.data.revenueStatistics);
        }
        if (requestStatsResponse?.status === 'success') {
          setRequestStats(requestStatsResponse.data);
        }
        if (projectStatsResponse?.status === 'success') {
          setProjectStats(projectStatsResponse.data);
        }
        if (specialistModuleStatsResponse?.status === 'success') {
          setSpecialistModuleStats(specialistModuleStatsResponse.data);
        }

        // KPI data đã load xong
        setInitialLoading(false);

        // Load charts/tables data sau (có thể chậm hơn)
        const [latestRequestsResponse, latestContractsResponse] = await Promise.all([
          getLatestServiceRequests(10),
          getLatestContracts(10),
        ]);

        if (latestRequestsResponse?.status === 'success') {
          setLatestRequests(latestRequestsResponse.data);
        }
        if (latestContractsResponse?.status === 'success') {
          setLatestContracts(latestContractsResponse.data);
        }

        setChartsLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        message.error('Lỗi khi tải dữ liệu dashboard');
        setInitialLoading(false);
        setChartsLoading(false);
      }
    };

    fetchData();
  }, [timeRange]);

  // Map real data to KPIs
  const getCurrentKpis = () => {
    if (!dashboardData || !walletStats || !requestStats || !projectStats) {
      return {
        totalUsers: { value: 0, trend: 0 },
        activeUsers: { value: 0, trend: 0 },
        totalBalance: { value: 0, trend: 0 },
        openRequests: { value: 0, trend: 0 },
        activeContracts: { value: 0, trend: 0 },
      };
    }

    const userStats = dashboardData || {};
    const requestData = requestStats?.requests || {};
    const contractData = projectStats?.statistics?.contracts || {};

    // Calculate total requests
    const totalRequests = requestData.totalRequests || 0;
    const byStatus = requestData.byStatus || {};

    // Open requests = all statuses except completed, cancelled, rejected
    // Backend uses lowercase enum values: pending, contract_sent, contract_approved, contract_signed, awaiting_assignment, in_progress, completed, cancelled, rejected
    const openRequests =
      (byStatus.pending || 0) +
      (byStatus.contract_sent || 0) +
      (byStatus.contract_approved || 0) +
      (byStatus.contract_signed || 0) +
      (byStatus.awaiting_assignment || 0) +
      (byStatus.in_progress || 0);

    // Calculate active contracts from contract stats
    // Active contracts = active + active_pending_assignment
    const contractByStatus = contractData.byStatus || {};
    const activeContracts =
      (contractByStatus.active || 0) +
      (contractByStatus.active_pending_assignment || 0);

    // Note: Trends require historical data comparison, currently set to 0
    return {
      totalUsers: {
        value: userStats.totalUsers || 0,
        trend: 0, // Trends require historical data comparison - set to 0 for now
      },
      activeUsers: {
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
    };
  };

  const currentKpis = getCurrentKpis();

  // Map user statistics over time to chart format
  const getNewUsersOverTimeData = () => {
    if (!userStatsOverTime?.dailyStats || userStatsOverTime.dailyStats.length === 0) {
      return [];
    }

    // Determine days based on timeRange
    const days = timeRange === '30d' ? 30 : timeRange === '7d' ? 7 : 1;

    // Create a map of date -> count from API response
    const dateCountMap = new Map();
    userStatsOverTime.dailyStats.forEach(stat => {
      if (stat.date) {
        // Handle date string (YYYY-MM-DD)
        const dateKey = typeof stat.date === 'string' ? stat.date : stat.date.split('T')[0];
        dateCountMap.set(dateKey, stat.count || 0);
      }
    });

    // Generate all dates in the range and fill missing dates with 0
    const result = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      // Format date as YYYY-MM-DD for lookup
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;

      // Format date as MM/DD for display
      const displayDate = `${month}/${day}`;

      // Get count from map, default to 0 if not found
      const count = dateCountMap.get(dateKey) || 0;

      result.push({
        date: displayDate,
        users: count,
      });
    }

    return result;
  };

  // Map topup volume over time to chart format
  const getTopupsVolumeData = () => {
    if (!topupVolumeOverTime?.dailyStats || topupVolumeOverTime.dailyStats.length === 0) {
      return [];
    }

    // Determine days based on timeRange
    const days = timeRange === '30d' ? 30 : timeRange === '7d' ? 7 : 1;

    // Create a map of date -> amount from API response
    const dateAmountMap = new Map();
    topupVolumeOverTime.dailyStats.forEach(stat => {
      if (stat.date) {
        // Handle date string (YYYY-MM-DD)
        const dateKey = typeof stat.date === 'string' ? stat.date : stat.date.split('T')[0];
        dateAmountMap.set(dateKey, stat.amount || 0);
      }
    });

    // Generate all dates in the range and fill missing dates with 0
    const result = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      // Format date as YYYY-MM-DD for lookup
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;

      // Format date as MM/DD for display
      const displayDate = `${month}/${day}`;

      // Get amount from map, default to 0 if not found
      const amount = dateAmountMap.get(dateKey) || 0;

      result.push({
        date: displayDate,
        amount: amount,
      });
    }

    return result;
  };

  // Map request statistics by type to chart format
  const getRequestsByTypeData = () => {
    if (!requestStats?.requests?.byType || Object.keys(requestStats.requests.byType).length === 0) {
      return [];
    }

    // Map ServiceType enum (lowercase) to display names
    const typeDisplayMap = {
      transcription: 'Transcription',
      arrangement: 'Arrangement',
      arrangement_with_recording: 'Arrangement + Recording',
      recording: 'Recording',
    };

    // Convert byType map to chart format
    const result = Object.entries(requestStats.requests.byType)
      .map(([type, count]) => ({
        type: typeDisplayMap[type] || type,
        value: count || 0,
      }))
      .filter(item => item.value > 0) // Only include types with count > 0
      .sort((a, b) => b.value - a.value); // Sort by value descending

    return result;
  };

  // Map contracts by status to chart format
  const currentCharts = {
    newUsersOverTime: getNewUsersOverTimeData(),
    requestsByType: getRequestsByTypeData(),
    topupsVolume: getTopupsVolumeData(),
  };

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
      key: 'activeUsers',
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
  ];

  const requestColumns = [
    {
      title: 'Customer',
      dataIndex: 'customer',
      key: 'customer',
      ellipsis: true, width: 130
    },
    { title: 'Type', dataIndex: 'type', key: 'type', width: 110 },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 150,
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
          onClick={() => {
            console.log('View clicked, record:', record);
            if (record.requestId) {
              navigate(`/admin/service-requests/${record.requestId}`);
            } else {
              message.warning('Request ID not available');
            }
          }}
        >
          View
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
      stat: requestStats?.notationInstruments?.total ?? 0,
      sub: `Most used: ${requestStats?.notationInstruments?.mostUsed ?? 'N/A'}`,
    },
    {
      key: 'equipment',
      icon: <ToolOutlined style={{ fontSize: 24, color: '#8b5cf6' }} />,
      title: 'Equipment',
      stat: projectStats?.moduleStatistics?.equipment
        ? `${projectStats.moduleStatistics.equipment.available}/${projectStats.moduleStatistics.equipment.booked}/${projectStats.moduleStatistics.equipment.maintenance}`
        : '0/0/0',
      sub: 'Avail / Booked / Maint',
    },
    {
      key: 'specialists',
      icon: <TeamOutlined style={{ fontSize: 24, color: '#10b981' }} />,
      title: 'Specialists',
      stat: specialistModuleStats?.specialists?.active ?? 0,
      sub: `Active specialists`,
    },
    {
      key: 'skills',
      icon: <TrophyOutlined style={{ fontSize: 24, color: '#f59e0b' }} />,
      title: 'Skills',
      stat: specialistModuleStats?.skills?.total ?? 0,
      sub: `Top: ${specialistModuleStats?.skills?.topDemanded ?? 'N/A'}`,
    },
    {
      key: 'studioBookings',
      icon: <CalendarOutlined style={{ fontSize: 24, color: '#ec4899' }} />,
      title: 'Studio Bookings',
      stat: projectStats?.moduleStatistics?.studioBookings?.total ?? 0,
      sub: projectStats?.moduleStatistics?.studioBookings
        ? `${projectStats.moduleStatistics.studioBookings.upcoming} upcoming`
        : '0 upcoming',
    },
    {
      key: 'revisions',
      icon: <EditOutlined style={{ fontSize: 24, color: '#f97316' }} />,
      title: 'Revision Requests',
      stat: projectStats?.moduleStatistics?.revisions?.pending ?? 0,
      sub: projectStats?.moduleStatistics?.revisions
        ? `${projectStats.moduleStatistics.revisions.approved} approved`
        : '0 approved',
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

  // Chỉ hiển thị full loading nếu chưa có data nào
  if (initialLoading && !dashboardData && !walletStats && !requestStats && !projectStats) {
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
        {currentCharts.newUsersOverTime && currentCharts.newUsersOverTime.length > 0 && (
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
        )}

        {currentCharts.requestsByType && currentCharts.requestsByType.length > 0 && (
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
        )}

        {currentCharts.topupsVolume && currentCharts.topupsVolume.length > 0 && (
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
        )}
      </div>

      {/* Tables Row */}
      <div className={styles.tablesGrid}>
        <motion.div
          className={styles.tableCard}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <div className={styles.tableTitle}>Latest Service Requests</div>
          {chartsLoading ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <Spin />
            </div>
          ) : (
            <Table
              dataSource={latestRequests?.content?.map((req, index) => ({
                key: req.requestId || index,
                requestId: req.requestId,
                customer: req.contactName || 'N/A',
                type: req.requestType === 'transcription' ? 'Transcription' :
                      req.requestType === 'arrangement' ? 'Arrangement' :
                      req.requestType === 'arrangement_with_recording' ? 'Arrangement + Recording' :
                      req.requestType === 'recording' ? 'Recording' : req.requestType || 'N/A',
                status: req.status || 'pending',
                createdAt: req.createdAt ? new Date(req.createdAt).toISOString().split('T')[0] : 'N/A',
                totalPrice: req.totalPrice != null ? Number(req.totalPrice) : 0,
              })) || []}
              columns={requestColumns}
              size="small"
              pagination={false}
              scroll={{ x: 600 }}
            />
          )}
        </motion.div>

        <motion.div
          className={styles.tableCard}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <div className={styles.tableTitle}>Recent Contracts</div>
          {chartsLoading ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <Spin />
            </div>
          ) : (
            <Table
              dataSource={latestContracts?.content?.map((contract, index) => ({
                key: contract.contractId || index,
                contractId: contract.contractId,
                code: contract.contractNumber || `CT-${index}`,
                customer: contract.nameSnapshot || 'N/A',
                type: contract.contractType === 'transcription' ? 'Transcription' :
                      contract.contractType === 'arrangement' ? 'Arrangement' :
                      contract.contractType === 'arrangement_with_recording' ? 'Arrangement + Recording' :
                      contract.contractType === 'recording' ? 'Recording' :
                      contract.contractType === 'bundle' ? 'Bundle (T+A+R)' : contract.contractType || 'N/A',
                status: contract.status || 'draft',
                createdAt: contract.createdAt ? new Date(contract.createdAt).toISOString().split('T')[0] : 'N/A',
                totalPrice: contract.totalPrice != null ? Number(contract.totalPrice) : 0,
              })) || []}
              columns={[
                { title: 'Code', dataIndex: 'code', key: 'code', width: 120 },
                {
                  title: 'Customer',
                  dataIndex: 'customer',
                  key: 'customer',
                  ellipsis: true,
                  width: 130
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
                  title: '',
                  key: 'action',
                  width: 60,
                  render: (_, record) => (
                    <Button
                      type="link"
                      size="small"
                      onClick={() => {
                        console.log('View contract clicked, record:', record);
                        if (record.contractId) {
                          navigate(`/admin/contracts/${record.contractId}`);
                        } else {
                          message.warning('Contract ID not available');
                        }
                      }}
                    >
                      View
                    </Button>
                  ),
                },
              ]}
              size="small"
              pagination={false}
              scroll={{ x: 600 }}
            />
          )}
        </motion.div>
      </div>

      {/* Revenue Summary Card */}
      <RevenueSummaryCard data={revenueStats} timeRange={timeRange} />

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
    </motion.div>
  );
};

export default Dashboard;
