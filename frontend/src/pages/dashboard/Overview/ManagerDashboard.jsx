import { useState } from 'react';
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
import { Line, Column } from '@ant-design/plots';
import { motion } from 'framer-motion';
import styles from './Dashboard.module.css';
import {
  kpis,
  chartsData,
  pipelineData,
  unassignedTasks,
  overloadedSpecialists,
  slaAtRisk,
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


const ManagerDashboard = () => {
  const [timeRange, setTimeRange] = useState('7d');

  const currentKpis = kpis[timeRange];
  const currentCharts = chartsData[timeRange];

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
      key: 'inQuotation',
      label: 'In Quotation',
      icon: <DollarOutlined />,
      color: '#8b5cf6',
      bgColor: '#f5f3ff',
    },
    {
      key: 'inProgress',
      label: 'In Progress',
      icon: <ClockCircleOutlined />,
      color: '#f59e0b',
      bgColor: '#fffbeb',
    },
    {
      key: 'awaitingFeedback',
      label: 'Awaiting Feedback',
      icon: <MessageOutlined />,
      color: '#06b6d4',
      bgColor: '#ecfeff',
    },
    {
      key: 'completed',
      label: 'Completed',
      icon: <CheckCircleOutlined />,
      color: '#10b981',
      bgColor: '#ecfdf5',
    },
    {
      key: 'unassignedTasks',
      label: 'Unassigned Tasks',
      icon: <ExclamationCircleOutlined />,
      color: '#ef4444',
      bgColor: '#fef2f2',
    },
    {
      key: 'overloadedSpecialists',
      label: 'Overloaded Specialists',
      icon: <WarningOutlined />,
      color: '#f97316',
      bgColor: '#fff7ed',
    },
    {
      key: 'slaAtRisk',
      label: 'SLA At Risk',
      icon: <ClockCircleOutlined />,
      color: '#dc2626',
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

      {/* Pipeline Section */}
      <div className={styles.tablesGrid}>
        <motion.div
          className={styles.tableCard}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <div className={styles.tableTitle}>
            <FileTextOutlined style={{ marginRight: 8 }} />
            New Requests
          </div>
          <Table
            dataSource={pipelineData.newRequests}
            columns={[
              { title: 'Code', dataIndex: 'code', key: 'code', width: 130 },
              {
                title: 'Customer',
                dataIndex: 'customer',
                key: 'customer',
                ellipsis: true,
              },
              { title: 'Type', dataIndex: 'type', key: 'type', width: 120 },
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
              {
                title: 'Created',
                dataIndex: 'createdAt',
                key: 'createdAt',
                width: 150,
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
            <DollarOutlined style={{ marginRight: 8 }} />
            In Quotation
          </div>
          <Table
            dataSource={pipelineData.inQuotation}
            columns={[
              { title: 'Code', dataIndex: 'code', key: 'code', width: 130 },
              {
                title: 'Customer',
                dataIndex: 'customer',
                key: 'customer',
                ellipsis: true,
              },
              { title: 'Type', dataIndex: 'type', key: 'type', width: 120 },
              {
                title: 'Days Waiting',
                dataIndex: 'daysWaiting',
                key: 'daysWaiting',
                width: 110,
                render: days => (
                  <Tag color={days > 2 ? 'red' : 'orange'}>{days} days</Tag>
                ),
              },
              {
                title: 'Est. Value',
                dataIndex: 'estimatedValue',
                key: 'estimatedValue',
                width: 120,
                render: val => formatCurrency(val),
              },
            ]}
            size="small"
            pagination={false}
            scroll={{ x: 600 }}
          />
        </motion.div>
      </div>

      <div className={styles.tablesGrid}>
        <motion.div
          className={styles.tableCard}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <div className={styles.tableTitle}>
            <ClockCircleOutlined style={{ marginRight: 8 }} />
            In Progress
          </div>
          <Table
            dataSource={pipelineData.inProgress}
            columns={[
              { title: 'Code', dataIndex: 'code', key: 'code', width: 130 },
              {
                title: 'Customer',
                dataIndex: 'customer',
                key: 'customer',
                ellipsis: true,
              },
              { title: 'Type', dataIndex: 'type', key: 'type', width: 120 },
              {
                title: 'Assigned To',
                dataIndex: 'assignedTo',
                key: 'assignedTo',
                width: 130,
              },
              {
                title: 'Progress',
                dataIndex: 'progress',
                key: 'progress',
                width: 150,
                render: progress => (
                  <Progress percent={progress} size="small" />
                ),
              },
              {
                title: 'Deadline',
                dataIndex: 'deadline',
                key: 'deadline',
                width: 120,
              },
              {
                title: 'Days Left',
                dataIndex: 'daysRemaining',
                key: 'daysRemaining',
                width: 100,
                render: days => (
                  <Tag color={days <= 2 ? 'red' : days <= 5 ? 'orange' : 'green'}>
                    {days} days
                  </Tag>
                ),
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
            <MessageOutlined style={{ marginRight: 8 }} />
            Awaiting Feedback
          </div>
          <Table
            dataSource={pipelineData.awaitingFeedback}
            columns={[
              { title: 'Code', dataIndex: 'code', key: 'code', width: 130 },
              {
                title: 'Customer',
                dataIndex: 'customer',
                key: 'customer',
                ellipsis: true,
              },
              { title: 'Type', dataIndex: 'type', key: 'type', width: 120 },
              {
                title: 'Specialist',
                dataIndex: 'specialist',
                key: 'specialist',
                width: 130,
              },
              {
                title: 'Submitted',
                dataIndex: 'submittedAt',
                key: 'submittedAt',
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
            ]}
            size="small"
            pagination={false}
            scroll={{ x: 650 }}
          />
        </motion.div>
      </div>

      {/* Charts */}
      <div className={styles.chartsGrid}>
        <motion.div
          className={styles.chartCard}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <div className={styles.chartTitle}>Pipeline Flow</div>
          <div className={styles.chartWrapper}>
            <Line
              data={currentCharts.pipelineFlow.flatMap(item => [
                { date: item.date, stage: 'New', value: item.new },
                { date: item.date, stage: 'In Quotation', value: item.inQuotation },
                { date: item.date, stage: 'In Progress', value: item.inProgress },
                { date: item.date, stage: 'Completed', value: item.completed },
              ])}
              xField="date"
              yField="value"
              seriesField="stage"
              smooth
              color={['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981']}
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
          <div className={styles.chartTitle}>Workload Distribution</div>
          <div className={styles.chartWrapper}>
            <Column
              data={currentCharts.workloadDistribution}
              xField="specialist"
              yField="tasks"
              color="#3b82f6"
              columnStyle={{ radius: [6, 6, 0, 0] }}
              label={{
                position: 'top',
                style: { fill: '#1e293b' },
              }}
            />
          </div>
        </motion.div>

        <motion.div
          className={styles.chartCard}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <div className={styles.chartTitle}>On-Time Completion Rate</div>
          <div className={styles.chartWrapper}>
            <Line
              data={currentCharts.completionRate}
              xField="date"
              yField="rate"
              smooth
              color="#10b981"
              areaStyle={{ fill: 'l(270) 0:#fff 1:#10b981', fillOpacity: 0.15 }}
              point={{ size: 3, shape: 'circle' }}
            />
          </div>
        </motion.div>
      </div>

      {/* Workload & Assignment Section */}
      <div className={styles.tablesGrid}>
        <motion.div
          className={styles.tableCard}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <div className={styles.tableTitle}>
            <ExclamationCircleOutlined style={{ marginRight: 8 }} />
            Unassigned Tasks
          </div>
          <Table
            dataSource={unassignedTasks}
            columns={[
              { title: 'Task', dataIndex: 'task', key: 'task', ellipsis: true },
              { title: 'Skill', dataIndex: 'skill', key: 'skill', width: 150 },
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
              {
                title: 'Est. Hours',
                dataIndex: 'estimatedHours',
                key: 'estimatedHours',
                width: 100,
              },
              {
                title: 'Created',
                dataIndex: 'createdAt',
                key: 'createdAt',
                width: 120,
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
            <WarningOutlined style={{ marginRight: 8 }} />
            Overloaded Specialists
          </div>
          <Table
            dataSource={overloadedSpecialists}
            columns={[
              { title: 'Specialist', dataIndex: 'name', key: 'name', width: 130 },
              {
                title: 'Tasks',
                key: 'tasks',
                width: 120,
                render: (_, record) => (
                  <span>
                    {record.currentTasks} / {record.maxCapacity}
                  </span>
                ),
              },
              {
                title: 'Utilization',
                dataIndex: 'utilization',
                key: 'utilization',
                width: 120,
                render: util => (
                  <Tag color={util > 120 ? 'red' : 'orange'}>
                    {util}%
                  </Tag>
                ),
              },
              {
                title: 'Skills',
                dataIndex: 'skills',
                key: 'skills',
                ellipsis: true,
                render: skills => skills.join(', '),
              },
              {
                title: 'Next Available',
                dataIndex: 'nextAvailable',
                key: 'nextAvailable',
                width: 130,
              },
            ]}
            size="small"
            pagination={false}
            scroll={{ x: 650 }}
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
          <ClockCircleOutlined style={{ marginRight: 8 }} />
          SLA At Risk
        </div>
        <Table
          dataSource={slaAtRisk}
          columns={[
            { title: 'Code', dataIndex: 'code', key: 'code', width: 130 },
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
              title: 'Progress',
              dataIndex: 'progress',
              key: 'progress',
              width: 150,
              render: progress => <Progress percent={progress} size="small" />,
            },
            {
              title: 'Deadline',
              dataIndex: 'deadline',
              key: 'deadline',
              width: 120,
            },
            {
              title: 'Days Left',
              dataIndex: 'daysRemaining',
              key: 'daysRemaining',
              width: 100,
              render: days => (
                <Tag color={days <= 2 ? 'red' : 'orange'}>{days} days</Tag>
              ),
            },
            {
              title: 'Risk Level',
              dataIndex: 'riskLevel',
              key: 'riskLevel',
              width: 100,
              render: level => (
                <Tag color={level === 'high' ? 'red' : 'orange'}>{level}</Tag>
              ),
            },
          ]}
          size="small"
          pagination={false}
          scroll={{ x: 800 }}
        />
      </motion.div>

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

