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
  Progress,
  Spin,
} from 'antd';
import {
  FileTextOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  CalendarOutlined,
  MessageOutlined,
  CustomerServiceOutlined,
  TrophyOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  ExportOutlined,
  BellOutlined,
  RiseOutlined,
  FallOutlined,
  BarChartOutlined,
  EditOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { motion } from 'framer-motion';
import styles from './Dashboard.module.css';
import {
  chartsData,
  pipelineData,
  milestonesDue,
  milestonesAwaitingPayment,
  revisionPending,
  upcomingBookings,
  studioAvailability,
  bookingConflicts,
  unreadChats,
  ticketsDisputes,
  ratingsFeedback,
  teamPerformance,
  alerts,
  formatCurrency,
  formatPercent,
  mapStatusToTag,
  mapPriorityToBadge,
} from './managerDashboardMock';
import { getRequestStatistics, getRequestStatisticsOverTime, getWorkloadDistribution, getCompletionRateOverTime } from '../../../services/dashboardService';


const ManagerDashboard = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [kpis, setKpis] = useState({
    newRequests: { value: 0, trend: 0 },
    inProgress: { value: 0, trend: 0 },
    completed: { value: 0, trend: 0 },
    unassignedRequests: { value: 0, trend: 0 },
  });
  const [pipelineFlowData, setPipelineFlowData] = useState(null);
  const [workloadDistributionData, setWorkloadDistributionData] = useState(null);
  const [completionRateData, setCompletionRateData] = useState(null);

  const currentKpis = kpis;

  // Fetch KPI data from APIs
  useEffect(() => {
    const fetchKpiData = async () => {
      setLoading(true);
      try {
        // Tất cả badges đều từ request-service, chỉ cần gọi một API
        const requestStatsResponse = await getRequestStatistics();

        // Map data from request-service API
        if (requestStatsResponse?.status === 'success' && requestStatsResponse?.data?.requests) {
          const requestsData = requestStatsResponse.data.requests;
          const byStatus = requestsData.byStatus || {};
          
          // Map status enum values to our KPIs (enum values are lowercase: pending, in_progress, completed)
          const newRequests = byStatus.pending || 0;
          const inProgress = byStatus.in_progress || 0;
          const completed = byStatus.completed || 0;
          const unassignedRequests = requestsData.unassignedRequests || 0;

          setKpis({
            newRequests: { value: newRequests, trend: 0 }, // Trend calculation requires previous period data
            inProgress: { value: inProgress, trend: 0 },
            completed: { value: completed, trend: 0 },
            unassignedRequests: { value: unassignedRequests, trend: 0 },
          });
        }
      } catch (error) {
        console.error('Error fetching manager dashboard KPIs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchKpiData();
  }, []);

  // Fetch chart data from APIs
  useEffect(() => {
    const fetchChartData = async () => {
      setChartsLoading(true);
      try {
        // Determine days based on timeRange
        const days = timeRange === '30d' ? 30 : timeRange === '7d' ? 7 : 1;
        
        // Fetch Pipeline Flow chart data
        const overTimeResponse = await getRequestStatisticsOverTime(days);
        
        if (overTimeResponse?.status === 'success' && overTimeResponse?.data?.dailyStats) {
          const dailyStats = overTimeResponse.data.dailyStats;
          
          // Map to chart format
          const pipelineFlow = dailyStats.map(stat => ({
            date: stat.date, // Will format in chart option
            new: stat.pending || 0,
            inProgress: stat.inProgress || 0,
            completed: stat.completed || 0,
          }));
          
          setPipelineFlowData({ pipelineFlow });
        }

        // Fetch Workload Distribution chart data
        const workloadResponse = await getWorkloadDistribution();
        
        if (workloadResponse?.status === 'success' && workloadResponse?.data?.specialists) {
          const workloadDistribution = workloadResponse.data.specialists.map(spec => ({
            specialist: spec.specialistName || spec.specialistId || 'Unknown',
            tasks: spec.taskCount || 0,
          }));
          
          setWorkloadDistributionData({ workloadDistribution });
        }

        // Fetch Completion Rate chart data
        const completionRateResponse = await getCompletionRateOverTime(days);
        
        if (completionRateResponse?.status === 'success' && completionRateResponse?.data?.dailyRates) {
          const completionRate = completionRateResponse.data.dailyRates.map(stat => ({
            date: stat.date,
            rate: stat.rate || 0, // Use 0 if null (no completed tasks)
          }));
          
          setCompletionRateData({ completionRate });
        }
      } catch (error) {
        console.error('Error fetching chart data:', error);
      } finally {
        setChartsLoading(false);
      }
    };

    fetchChartData();
  }, [timeRange]);

  // Prepare ECharts options
  const getPipelineFlowChartOption = () => {
    if (!pipelineFlowData?.pipelineFlow || pipelineFlowData.pipelineFlow.length === 0) {
      return null;
    }

    // Format dates from YYYY-MM-DD to MM/DD
    const dates = pipelineFlowData.pipelineFlow.map(item => {
      if (typeof item.date === 'string') {
        // Parse YYYY-MM-DD format
        const [year, month, day] = item.date.split('-');
        return `${month}/${day}`;
      }
      return item.date;
    });
    const newData = pipelineFlowData.pipelineFlow.map(item => item.new);
    const inProgressData = pipelineFlowData.pipelineFlow.map(item => item.inProgress);
    const completedData = pipelineFlowData.pipelineFlow.map(item => item.completed);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
        },
        formatter: (params) => {
          let result = `${params[0].axisValue}<br/>`;
          params.forEach(param => {
            result += `${param.marker}${param.seriesName}: ${param.value.toLocaleString()}<br/>`;
          });
          return result;
        },
      },
      legend: {
        data: ['New', 'In Progress', 'Completed'],
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
          formatter: (value) => value.toLocaleString(),
        },
      },
      series: [
        {
          name: 'New',
          type: 'line',
          smooth: true,
          data: newData,
          lineStyle: { width: 2 },
          itemStyle: { color: '#3b82f6' },
        },
        {
          name: 'In Progress',
          type: 'line',
          smooth: true,
          data: inProgressData,
          lineStyle: { width: 2 },
          itemStyle: { color: '#f59e0b' },
        },
        {
          name: 'Completed',
          type: 'line',
          smooth: true,
          data: completedData,
          lineStyle: { width: 2 },
          itemStyle: { color: '#10b981' },
        },
      ],
    };
  };

  const getWorkloadDistributionChartOption = () => {
    if (!workloadDistributionData?.workloadDistribution || workloadDistributionData.workloadDistribution.length === 0) {
      return null;
    }

    const workloadData = workloadDistributionData.workloadDistribution;

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        formatter: (params) => {
          const param = params[0];
          return `${param.axisValue}<br/>${param.marker}${param.seriesName}: ${param.value.toLocaleString()} tasks`;
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
        data: workloadData.map(item => item.specialist),
        axisLabel: {
          rotate: 45,
          interval: 0,
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value) => value.toLocaleString(),
        },
      },
      series: [
        {
          name: 'Tasks',
          type: 'bar',
          barWidth: '60%',
          data: workloadData.map(item => item.tasks),
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#3b82f6' },
                { offset: 1, color: '#2563eb' },
              ],
            },
            borderRadius: [6, 6, 0, 0],
          },
          label: {
            show: true,
            position: 'top',
            formatter: (params) => params.value.toLocaleString(),
          },
        },
      ],
    };
  };

  const getCompletionRateChartOption = () => {
    if (!completionRateData?.completionRate || completionRateData.completionRate.length === 0) {
      return null;
    }

    // Format dates from YYYY-MM-DD to MM/DD
    const dates = completionRateData.completionRate.map(item => {
      if (typeof item.date === 'string') {
        const [year, month, day] = item.date.split('-');
        return `${month}/${day}`;
      }
      return item.date;
    });
    const rates = completionRateData.completionRate.map(item => item.rate);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
        },
        formatter: (params) => {
          const param = params[0];
          return `${param.axisValue}<br/>${param.marker}${param.seriesName}: ${param.value}%`;
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
        min: 0,
        max: 100,
        axisLabel: {
          formatter: (value) => `${value}%`,
        },
      },
      series: [
        {
          name: 'Completion Rate',
          type: 'line',
          smooth: true,
          data: rates,
          areaStyle: {
            opacity: 0.15,
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#10b981' },
                { offset: 1, color: 'rgba(16, 185, 129, 0.1)' },
              ],
            },
          },
          lineStyle: {
            width: 2,
            color: '#10b981',
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
        },
      ],
    };
  };

  const pipelineFlowChartOption = getPipelineFlowChartOption();
  const workloadDistributionChartOption = getWorkloadDistributionChartOption();
  const completionRateChartOption = getCompletionRateChartOption();

  const handleExport = () => {
    message.success('Report exported successfully!');
  };

  const kpiCards = [
    {
      key: 'newRequests',
      label: 'New Requests',
      icon: <FileTextOutlined />,
      color: '#3b82f6',
      bgColor: '#eff6ff',
    },
    {
      key: 'inProgress',
      label: 'In Progress',
      icon: <ClockCircleOutlined />,
      color: '#f59e0b',
      bgColor: '#fffbeb',
    },
    {
      key: 'completed',
      label: 'Completed',
      icon: <CheckCircleOutlined />,
      color: '#10b981',
      bgColor: '#ecfdf5',
    },
    {
      key: 'unassignedRequests',
      label: 'Unassigned Requests',
      icon: <ExclamationCircleOutlined />,
      color: '#ef4444',
      bgColor: '#fef2f2',
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
          <h1>Manager Dashboard</h1>
          <p>Project operations & workflow management</p>
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
        style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}
      >
        {kpiCards.map((card) => {
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
                {data.value.toLocaleString()}
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
        {chartsLoading ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
            <Spin size="large" />
          </div>
        ) : (
          <>
            {pipelineFlowChartOption && (
              <motion.div
                className={styles.chartCard}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
              >
                <div className={styles.chartTitle}>Requests Created by Status Over Time</div>
                <div className={styles.chartWrapper}>
                  <ReactECharts
                    option={pipelineFlowChartOption}
                    style={{ height: '100%', width: '100%' }}
                    opts={{ renderer: 'svg' }}
                  />
                </div>
              </motion.div>
            )}

            {workloadDistributionChartOption && (
              <motion.div
                className={styles.chartCard}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
              >
                <div className={styles.chartTitle}>Workload Distribution</div>
                <div className={styles.chartWrapper}>
                  <ReactECharts
                    option={workloadDistributionChartOption}
                    style={{ height: '100%', width: '100%' }}
                    opts={{ renderer: 'svg' }}
                  />
                </div>
              </motion.div>
            )}

            {completionRateChartOption && (
              <motion.div
                className={styles.chartCard}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
              >
                <div className={styles.chartTitle}>On-Time Completion Rate</div>
                <div className={styles.chartWrapper}>
                  <ReactECharts
                    option={completionRateChartOption}
                    style={{ height: '100%', width: '100%' }}
                    opts={{ renderer: 'svg' }}
                  />
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>


      {/* Milestones/Contracts Section */}
      <div className={styles.tablesGrid}>
        <motion.div
          className={styles.tableCard}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <div className={styles.tableTitle}>
            <ClockCircleOutlined style={{ marginRight: 8 }} />
            Milestones Due Soon
          </div>
          <Table
            dataSource={milestonesDue}
            columns={[
              { title: 'Code', dataIndex: 'code', key: 'code', width: 120 },
              {
                title: 'Milestone',
                dataIndex: 'milestone',
                key: 'milestone',
                ellipsis: true,
              },
              {
                title: 'Customer',
                dataIndex: 'customer',
                key: 'customer',
                ellipsis: true,
              },
              {
                title: 'Due Date',
                dataIndex: 'dueDate',
                key: 'dueDate',
                width: 120,
              },
              {
                title: 'Days Left',
                dataIndex: 'daysRemaining',
                key: 'daysRemaining',
                width: 100,
                render: days => (
                  <Tag color={days <= 1 ? 'red' : days <= 3 ? 'orange' : 'green'}>
                    {days} days
                  </Tag>
                ),
              },
              {
                title: 'Value',
                dataIndex: 'value',
                key: 'value',
                width: 120,
                render: val => formatCurrency(val),
              },
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
            scroll={{ x: 800 }}
          />
        </motion.div>

        <motion.div
          className={styles.tableCard}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <div className={styles.tableTitle}>
            <DollarOutlined style={{ marginRight: 8 }} />
            Milestones Awaiting Payment
          </div>
          <Table
            dataSource={milestonesAwaitingPayment}
            columns={[
              { title: 'Code', dataIndex: 'code', key: 'code', width: 120 },
              {
                title: 'Milestone',
                dataIndex: 'milestone',
                key: 'milestone',
                ellipsis: true,
              },
              {
                title: 'Customer',
                dataIndex: 'customer',
                key: 'customer',
                ellipsis: true,
              },
              {
                title: 'Completed',
                dataIndex: 'completedAt',
                key: 'completedAt',
                width: 120,
              },
              {
                title: 'Days Overdue',
                dataIndex: 'daysOverdue',
                key: 'daysOverdue',
                width: 120,
                render: days => (
                  <Tag color={days > 3 ? 'red' : 'orange'}>{days} days</Tag>
                ),
              },
              {
                title: 'Amount',
                dataIndex: 'amount',
                key: 'amount',
                width: 120,
                render: val => formatCurrency(val),
              },
            ]}
            size="small"
            pagination={false}
            scroll={{ x: 700 }}
          />
        </motion.div>
      </div>

      <motion.div
        className={styles.tableCard}
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        style={{ marginBottom: 32 }}
      >
        <div className={styles.tableTitle}>
          <EditOutlined style={{ marginRight: 8 }} />
          Revision Requests Pending
        </div>
        <Table
          dataSource={revisionPending}
          columns={[
            { title: 'Code', dataIndex: 'code', key: 'code', width: 120 },
            {
              title: 'Request',
              dataIndex: 'request',
              key: 'request',
              ellipsis: true,
            },
            {
              title: 'Customer',
              dataIndex: 'customer',
              key: 'customer',
              ellipsis: true,
            },
            {
              title: 'Assigned To',
              dataIndex: 'assignedTo',
              key: 'assignedTo',
              width: 130,
            },
            {
              title: 'Requested',
              dataIndex: 'requestedAt',
              key: 'requestedAt',
              width: 120,
            },
            {
              title: 'Days Waiting',
              dataIndex: 'daysWaiting',
              key: 'daysWaiting',
              width: 110,
              render: days => (
                <Tag color={days > 3 ? 'red' : 'orange'}>{days} days</Tag>
              ),
            },
            {
              title: 'Priority',
              dataIndex: 'priority',
              key: 'priority',
              width: 100,
              render: priority => {
                const { status, text } = mapPriorityToBadge(priority);
                return <Badge status={status} text={text} />;
              },
            },
          ]}
          size="small"
          pagination={false}
          scroll={{ x: 800 }}
        />
      </motion.div>

      {/* Booking/Studio Section */}
      <div className={styles.tablesGrid}>
        <motion.div
          className={styles.tableCard}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <div className={styles.tableTitle}>
            <CalendarOutlined style={{ marginRight: 8 }} />
            Upcoming Studio Bookings
          </div>
          <Table
            dataSource={upcomingBookings}
            columns={[
              {
                title: 'Studio',
                dataIndex: 'studio',
                key: 'studio',
                width: 100,
              },
              {
                title: 'Customer',
                dataIndex: 'customer',
                key: 'customer',
                ellipsis: true,
              },
              {
                title: 'Project',
                dataIndex: 'project',
                key: 'project',
                width: 130,
              },
              { title: 'Date', dataIndex: 'date', key: 'date', width: 120 },
              { title: 'Time', dataIndex: 'time', key: 'time', width: 150 },
              {
                title: 'Duration',
                dataIndex: 'duration',
                key: 'duration',
                width: 100,
                render: dur => `${dur}h`,
              },
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
            scroll={{ x: 700 }}
          />
        </motion.div>

        <motion.div
          className={styles.tableCard}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <div className={styles.tableTitle}>
            <BarChartOutlined style={{ marginRight: 8 }} />
            Studio Availability
          </div>
          <Table
            dataSource={studioAvailability}
            columns={[
              {
                title: 'Studio',
                dataIndex: 'studio',
                key: 'studio',
                width: 100,
              },
              {
                title: 'Today',
                key: 'today',
                width: 150,
                render: (_, record) => (
                  <span>
                    {record.today.available}/{record.today.total} slots
                  </span>
                ),
              },
              {
                title: 'This Week',
                key: 'thisWeek',
                width: 150,
                render: (_, record) => (
                  <span>
                    {record.thisWeek.available}/{record.thisWeek.total} slots
                  </span>
                ),
              },
              {
                title: 'Conflicts',
                dataIndex: 'conflicts',
                key: 'conflicts',
                width: 100,
                render: conflicts => (
                  <Tag color={conflicts > 0 ? 'red' : 'green'}>
                    {conflicts}
                  </Tag>
                ),
              },
            ]}
            size="small"
            pagination={false}
            scroll={{ x: 500 }}
          />
        </motion.div>
      </div>

      {bookingConflicts.length > 0 && (
        <motion.div
          className={styles.tableCard}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          style={{ marginBottom: 32 }}
        >
          <div className={styles.tableTitle}>
            <ExclamationCircleOutlined style={{ marginRight: 8, color: '#ef4444' }} />
            Booking Conflicts
          </div>
          <Table
            dataSource={bookingConflicts}
            columns={[
              {
                title: 'Studio',
                dataIndex: 'studio',
                key: 'studio',
                width: 100,
              },
              { title: 'Date', dataIndex: 'date', key: 'date', width: 120 },
              { title: 'Time', dataIndex: 'time', key: 'time', width: 150 },
              {
                title: 'Conflict',
                dataIndex: 'conflict',
                key: 'conflict',
                ellipsis: true,
              },
              {
                title: 'Booking 1',
                dataIndex: 'booking1',
                key: 'booking1',
                width: 130,
              },
              {
                title: 'Booking 2',
                dataIndex: 'booking2',
                key: 'booking2',
                width: 130,
              },
              {
                title: 'Severity',
                dataIndex: 'severity',
                key: 'severity',
                width: 100,
                render: severity => (
                  <Tag color={severity === 'high' ? 'red' : 'orange'}>
                    {severity}
                  </Tag>
                ),
              },
            ]}
            size="small"
            pagination={false}
            scroll={{ x: 700 }}
          />
        </motion.div>
      )}

      {/* Customer Experience Section */}
      <div className={styles.tablesGrid}>
        <motion.div
          className={styles.tableCard}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <div className={styles.tableTitle}>
            <MessageOutlined style={{ marginRight: 8 }} />
            Unread Customer Messages
          </div>
          <Table
            dataSource={unreadChats}
            columns={[
              {
                title: 'Customer',
                dataIndex: 'customer',
                key: 'customer',
                ellipsis: true,
              },
              {
                title: 'Project',
                dataIndex: 'project',
                key: 'project',
                width: 130,
              },
              {
                title: 'Last Message',
                dataIndex: 'lastMessage',
                key: 'lastMessage',
                ellipsis: true,
              },
              {
                title: 'Time Ago',
                dataIndex: 'timeAgo',
                key: 'timeAgo',
                width: 120,
              },
              {
                title: 'Priority',
                dataIndex: 'priority',
                key: 'priority',
                width: 100,
                render: priority => {
                  const { status, text } = mapPriorityToBadge(priority);
                  return <Badge status={status} text={text} />;
                },
              },
            ]}
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
          <div className={styles.tableTitle}>
            <CustomerServiceOutlined style={{ marginRight: 8 }} />
            Tickets & Disputes
          </div>
          <Table
            dataSource={ticketsDisputes}
            columns={[
              {
                title: 'Ticket ID',
                dataIndex: 'ticketId',
                key: 'ticketId',
                width: 130,
              },
              {
                title: 'Customer',
                dataIndex: 'customer',
                key: 'customer',
                ellipsis: true,
              },
              {
                title: 'Subject',
                dataIndex: 'subject',
                key: 'subject',
                ellipsis: true,
              },
              {
                title: 'Project',
                dataIndex: 'project',
                key: 'project',
                width: 130,
              },
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
                title: 'Priority',
                dataIndex: 'priority',
                key: 'priority',
                width: 100,
                render: priority => {
                  const { status, text } = mapPriorityToBadge(priority);
                  return <Badge status={status} text={text} />;
                },
              },
            ]}
            size="small"
            pagination={false}
            scroll={{ x: 700 }}
          />
        </motion.div>
      </div>

      <motion.div
        className={styles.tableCard}
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        style={{ marginBottom: 32 }}
      >
        <div className={styles.tableTitle}>
          <TrophyOutlined style={{ marginRight: 8 }} />
          Recent Ratings & Feedback
        </div>
        <Table
          dataSource={ratingsFeedback}
          columns={[
            {
              title: 'Customer',
              dataIndex: 'customer',
              key: 'customer',
              ellipsis: true,
            },
            {
              title: 'Project',
              dataIndex: 'project',
              key: 'project',
              width: 130,
            },
            {
              title: 'Rating',
              dataIndex: 'rating',
              key: 'rating',
              width: 100,
              render: rating => (
                <span>
                  {'★'.repeat(rating)}
                  {'☆'.repeat(5 - rating)} ({rating}/5)
                </span>
              ),
            },
            {
              title: 'Comment',
              dataIndex: 'comment',
              key: 'comment',
              ellipsis: true,
            },
            {
              title: 'Date',
              dataIndex: 'date',
              key: 'date',
              width: 120,
            },
          ]}
          size="small"
          pagination={false}
          scroll={{ x: 800 }}
        />
      </motion.div>

      {/* Team Performance Section */}
      <motion.div
        className={styles.tableCard}
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        style={{ marginBottom: 32 }}
      >
        <div className={styles.tableTitle}>
          <TeamOutlined style={{ marginRight: 8 }} />
          Team Performance Metrics
        </div>
        <Table
          dataSource={teamPerformance}
          columns={[
            {
              title: 'Specialist',
              dataIndex: 'specialist',
              key: 'specialist',
              width: 150,
            },
            {
              title: 'Tasks Completed',
              dataIndex: 'tasksCompleted',
              key: 'tasksCompleted',
              width: 130,
            },
            {
              title: 'On-Time Rate',
              dataIndex: 'onTimeRate',
              key: 'onTimeRate',
              width: 120,
              render: rate => (
                <Tag color={rate >= 95 ? 'green' : rate >= 90 ? 'orange' : 'red'}>
                  {rate}%
                </Tag>
              ),
            },
            {
              title: 'Revision Rate',
              dataIndex: 'revisionRate',
              key: 'revisionRate',
              width: 120,
              render: rate => (
                <Tag color={rate <= 8 ? 'green' : rate <= 12 ? 'orange' : 'red'}>
                  {rate}%
                </Tag>
              ),
            },
            {
              title: 'Avg Processing Time',
              dataIndex: 'avgProcessingTime',
              key: 'avgProcessingTime',
              width: 150,
            },
            {
              title: 'Skills',
              dataIndex: 'skills',
              key: 'skills',
              ellipsis: true,
              render: skills => skills.join(', '),
            },
          ]}
          size="small"
          pagination={false}
          scroll={{ x: 800 }}
        />
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

export default ManagerDashboard;

