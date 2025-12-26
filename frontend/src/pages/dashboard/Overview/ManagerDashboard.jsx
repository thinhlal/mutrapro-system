import { useState, useEffect } from 'react';
import {
  Typography,
  Button,
  Segmented,
  Tag,
  message,
  Spin,
} from 'antd';
import {
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  RiseOutlined,
  FallOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { motion } from 'framer-motion';
import styles from './Dashboard.module.css';
import {
  chartsData,
  pipelineData,
  formatCurrency,
  formatPercent,
  mapStatusToTag,
} from './managerDashboardMock';
import { getRequestStatistics, getWorkloadDistribution, getCompletionRateOverTime, getProjectStatistics } from '../../../services/dashboardService';


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
  const [workloadDistributionData, setWorkloadDistributionData] = useState(null);
  const [completionRateData, setCompletionRateData] = useState(null);
  const [taskTypeData, setTaskTypeData] = useState(null);
  const [contractTypeData, setContractTypeData] = useState(null);
  const [requestTypeData, setRequestTypeData] = useState(null);
  const [radarData, setRadarData] = useState(null);

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
            rate: stat.rate || 0,
            totalCompleted: stat.totalCompleted || 0,
            onTimeCompleted: stat.onTimeCompleted || 0,
          }));
          
          setCompletionRateData({ completionRate });
        }

        // Fetch Request Statistics for Request Type and Status charts
        const requestStatsResponse = await getRequestStatistics();
        
        if (requestStatsResponse?.status === 'success' && requestStatsResponse?.data?.requests) {
          const requestsData = requestStatsResponse.data.requests;
          
          // Extract request type distribution
          if (requestsData.byType) {
            const requestTypeDistribution = Object.entries(requestsData.byType || {})
              .map(([type, count]) => ({
                name: formatRequestTypeName(type),
                value: count || 0,
              }))
              .filter(item => item.value > 0)
              .sort((a, b) => b.value - a.value);
            
            setRequestTypeData({ distribution: requestTypeDistribution });
          }
          
        }

        // Fetch Project Statistics for Task and Contract Type charts
        const projectStatsResponse = await getProjectStatistics();
        
        if (projectStatsResponse?.status === 'success' && projectStatsResponse?.data?.statistics) {
          const stats = projectStatsResponse.data.statistics;
          
          // Extract task type distribution
          if (stats.tasks?.byType) {
            const taskTypeDistribution = Object.entries(stats.tasks.byType || {})
              .map(([type, count]) => ({
                name: formatTaskTypeName(type),
                value: count || 0,
              }))
              .filter(item => item.value > 0)
              .sort((a, b) => b.value - a.value);
            
            setTaskTypeData({ distribution: taskTypeDistribution });
          }
          
          // Extract contract type distribution
          if (stats.contracts?.byType) {
            const contractTypeDistribution = Object.entries(stats.contracts.byType || {})
              .map(([type, count]) => ({
                name: formatContractTypeName(type),
                value: count || 0,
              }))
              .filter(item => item.value > 0)
              .sort((a, b) => b.value - a.value);
            
            setContractTypeData({ distribution: contractTypeDistribution });
          }
          
          // Prepare Radar Chart data: Normalize metrics for comparison
          const totalRequests = requestStatsResponse?.data?.requests?.totalRequests || 0;
          const totalContracts = stats.contracts?.totalContracts || 0;
          const totalTasks = stats.tasks?.totalTasks || 0;
          const completedTasks = stats.tasks?.byStatus?.completed || 0;
          
          // Find max value for normalization (scale 0-100)
          const maxValue = Math.max(totalRequests, totalContracts, totalTasks, completedTasks, 1);
          
          setRadarData({
            requests: totalRequests,
            contracts: totalContracts,
            tasks: totalTasks,
            completed: completedTasks,
            maxValue: maxValue,
          });
        }
      } catch (error) {
        console.error('Error fetching chart data:', error);
      } finally {
        setChartsLoading(false);
      }
    };

    fetchChartData();
  }, [timeRange]);

  // Helper function to format request type name for display
  const formatRequestTypeName = (type) => {
    const typeMap = {
      'transcription': 'Transcription',
      'arrangement': 'Arrangement',
      'arrangement_with_recording': 'Arrangement + Recording',
      'recording': 'Recording',
      'full_production': 'Full Production',
    };
    return typeMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Helper function to format task type name for display
  const formatTaskTypeName = (type) => {
    const typeMap = {
      'transcription': 'Transcription',
      'arrangement': 'Arrangement',
      'recording_supervision': 'Recording Supervision',
    };
    return typeMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Helper function to format contract type name for display
  const formatContractTypeName = (type) => {
    const typeMap = {
      'transcription': 'Transcription',
      'arrangement': 'Arrangement',
      'arrangement_with_recording': 'Arrangement + Recording',
      'recording': 'Recording',
      'bundle': 'Bundle',
    };
    return typeMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };


  // Prepare ECharts options
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

  // Tasks Completed vs On-Time Completed Over Time (Dual-Axis Line Chart)
  const getTasksCompletedChartOption = () => {
    if (!completionRateData?.completionRate || completionRateData.completionRate.length === 0) {
      return null;
    }

    const dates = completionRateData.completionRate.map(item => {
      if (typeof item.date === 'string') {
        const [year, month, day] = item.date.split('-');
        return `${month}/${day}`;
      }
      return item.date;
    });
    const totalCompleted = completionRateData.completionRate.map(item => item.totalCompleted || 0);
    const onTimeCompleted = completionRateData.completionRate.map(item => item.onTimeCompleted || 0);

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
        data: ['Total Completed', 'On-Time Completed'],
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
          name: 'Total Completed',
          type: 'line',
          smooth: true,
          data: totalCompleted,
          lineStyle: { width: 2, color: '#3b82f6' },
          itemStyle: { color: '#3b82f6' },
          areaStyle: {
            opacity: 0.1,
            color: '#3b82f6',
          },
        },
        {
          name: 'On-Time Completed',
          type: 'line',
          smooth: true,
          data: onTimeCompleted,
          lineStyle: { width: 2, color: '#10b981' },
          itemStyle: { color: '#10b981' },
          areaStyle: {
            opacity: 0.1,
            color: '#10b981',
          },
        },
      ],
    };
  };

  // Generic function to create horizontal bar chart option
  const createHorizontalBarChartOption = (data, seriesName, unitName, colors) => {
    if (!data?.distribution || data.distribution.length === 0) {
      return null;
    }

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        formatter: (params) => {
          const param = params[0];
          return `${param.name}<br/>${param.marker}${param.seriesName}: ${param.value.toLocaleString()} ${unitName}`;
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value) => value.toLocaleString(),
        },
      },
      yAxis: {
        type: 'category',
        data: data.distribution.map(item => item.name),
        axisLabel: {
          interval: 0,
        },
      },
      series: [
        {
          name: seriesName,
          type: 'bar',
          data: data.distribution.map((item, index) => ({
            value: item.value,
            itemStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 1,
                y2: 0,
                colorStops: [
                  { offset: 0, color: colors[index % colors.length] },
                  { offset: 1, color: colors[index % colors.length] + '80' },
                ],
              },
              borderRadius: [0, 8, 8, 0],
            },
          })),
          label: {
            show: true,
            position: 'right',
            formatter: (params) => params.value.toLocaleString(),
          },
        },
      ],
    };
  };

  const getRequestTypeChartOption = () => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    return createHorizontalBarChartOption(requestTypeData, 'Requests', 'requests', colors);
  };

  const getTaskTypeChartOption = () => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    return createHorizontalBarChartOption(taskTypeData, 'Tasks', 'tasks', colors);
  };

  const getContractTypeChartOption = () => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    return createHorizontalBarChartOption(contractTypeData, 'Contracts', 'contracts', colors);
  };

  // Gauge Chart - Completion Rate
  const getCompletionRateGaugeOption = () => {
    if (!completionRateData?.completionRate || completionRateData.completionRate.length === 0) {
      return null;
    }

    // Calculate average completion rate
    const rates = completionRateData.completionRate
      .map(item => item.rate || 0)
      .filter(rate => rate > 0);
    
    if (rates.length === 0) return null;
    
    const avgRate = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;

    return {
      tooltip: {
        formatter: '{a} <br/>{b} : {c}%',
      },
      series: [
        {
          name: 'Completion Rate',
          type: 'gauge',
          progress: {
            show: true,
            width: 18,
          },
          axisLine: {
            lineStyle: {
              width: 18,
            },
          },
          axisTick: {
            show: false,
          },
          splitLine: {
            length: 15,
            lineStyle: {
              width: 2,
              color: '#999',
            },
          },
          axisLabel: {
            distance: 25,
            color: '#999',
            fontSize: 12,
          },
          anchor: {
            show: true,
            showAbove: true,
            size: 25,
            itemStyle: {
              borderWidth: 10,
            },
          },
          title: {
            show: false,
          },
          detail: {
            valueAnimation: true,
            fontSize: 30,
            offsetCenter: [0, '70%'],
            formatter: '{value}%',
            color: '#10b981',
            fontWeight: 'bold',
          },
          data: [
            {
              value: Math.round(avgRate),
              name: 'On-Time Rate',
              itemStyle: {
                color: avgRate >= 80 ? '#10b981' : avgRate >= 60 ? '#f59e0b' : '#ef4444',
              },
            },
          ],
        },
      ],
    };
  };

  // Radar Chart - Metrics Comparison
  const getRadarChartOption = () => {
    if (!radarData) return null;

    const { requests, contracts, tasks, completed, maxValue } = radarData;
    
    if (maxValue === 0) return null;

    // Normalize values to 0-100 scale for better comparison
    // The max value should be 100%, others are relative to it
    const normalize = (value) => {
      if (maxValue === 0) return 0;
      const normalized = (value / maxValue) * 100;
      return Math.round(normalized);
    };

    return {
      tooltip: {
        trigger: 'item',
        show: true,
        backgroundColor: 'rgba(50, 50, 50, 0.9)',
        borderColor: '#333',
        borderWidth: 1,
        textStyle: {
          color: '#fff',
        },
        formatter: (params) => {
          // For radar chart, params contains dataIndex and value
          if (params && typeof params.dataIndex !== 'undefined') {
            const index = params.dataIndex;
            const actualValues = [requests, contracts, tasks, completed];
            const metricNames = ['Requests', 'Contracts', 'Tasks', 'Completed'];
            const normalizedValue = params.value || params.data[index];
            
            return `<div style="padding: 4px;">
              <strong>${metricNames[index]}</strong><br/>
              Actual Value: <strong>${actualValues[index].toLocaleString()}</strong><br/>
              Normalized: <strong>${normalizedValue}%</strong>
            </div>`;
          }
          return '';
        },
      },
      legend: {
        data: ['Metrics Overview'],
        bottom: 0,
      },
      radar: {
        indicator: [
          { name: 'Requests', max: 100 },
          { name: 'Contracts', max: 100 },
          { name: 'Tasks', max: 100 },
          { name: 'Completed', max: 100 },
        ],
        center: ['50%', '50%'],
        radius: '65%',
        axisName: {
          fontSize: 14,
          fontWeight: 'bold',
        },
        splitArea: {
          areaStyle: {
            color: ['rgba(59, 130, 246, 0.1)', 'rgba(59, 130, 246, 0.05)'],
          },
        },
        splitLine: {
          lineStyle: {
            color: '#e5e7eb',
          },
        },
        axisLine: {
          lineStyle: {
            color: '#9ca3af',
          },
        },
      },
      series: [
        {
          name: 'Metrics Overview',
          type: 'radar',
          data: [
            {
              value: [
                normalize(requests),
                normalize(contracts),
                normalize(tasks),
                normalize(completed),
              ],
              name: 'Metrics Overview',
              areaStyle: {
                color: 'rgba(59, 130, 246, 0.3)',
              },
              lineStyle: {
                width: 2,
                color: '#3b82f6',
              },
              itemStyle: {
                color: '#3b82f6',
              },
              label: {
                show: true,
                formatter: (params) => {
                  // params.value is the normalized value (0-100)
                  // params.dataIndex is the index (0=Requests, 1=Contracts, 2=Tasks, 3=Completed)
                  const normalizedValue = params.value;
                  const actualValues = [requests, contracts, tasks, completed];
                  const actualValue = actualValues[params.dataIndex];
                  
                  // Show normalized percentage (the one used for chart position)
                  return `${normalizedValue}%`;
                },
                fontSize: 12,
                fontWeight: 'bold',
                color: '#1f2937',
              },
            },
          ],
        },
      ],
    };
  };

  const workloadDistributionChartOption = getWorkloadDistributionChartOption();
  const completionRateChartOption = getCompletionRateChartOption();
  const tasksCompletedChartOption = getTasksCompletedChartOption();
  const requestTypeChartOption = getRequestTypeChartOption();
  const taskTypeChartOption = getTaskTypeChartOption();
  const contractTypeChartOption = getContractTypeChartOption();
  const completionRateGaugeOption = getCompletionRateGaugeOption();
  const radarChartOption = getRadarChartOption();

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

            {tasksCompletedChartOption && (
              <motion.div
                className={styles.chartCard}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
              >
                <div className={styles.chartTitle}>Tasks Completed Over Time</div>
                <div className={styles.chartWrapper}>
                  <ReactECharts
                    option={tasksCompletedChartOption}
                    style={{ height: '100%', width: '100%' }}
                    opts={{ renderer: 'svg' }}
                  />
                </div>
              </motion.div>
            )}

            {requestTypeChartOption && (
              <motion.div
                className={styles.chartCard}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
              >
                <div className={styles.chartTitle}>Request Type Distribution</div>
                <div className={styles.chartWrapper}>
                  <ReactECharts
                    option={requestTypeChartOption}
                    style={{ height: '100%', width: '100%' }}
                    opts={{ renderer: 'svg' }}
                  />
                </div>
              </motion.div>
            )}

            {taskTypeChartOption && (
              <motion.div
                className={styles.chartCard}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
              >
                <div className={styles.chartTitle}>Task Type Distribution</div>
                <div className={styles.chartWrapper}>
                  <ReactECharts
                    option={taskTypeChartOption}
                    style={{ height: '100%', width: '100%' }}
                    opts={{ renderer: 'svg' }}
                  />
                </div>
              </motion.div>
            )}

            {contractTypeChartOption && (
              <motion.div
                className={styles.chartCard}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
              >
                <div className={styles.chartTitle}>Contract Type Distribution</div>
                <div className={styles.chartWrapper}>
                  <ReactECharts
                    option={contractTypeChartOption}
                    style={{ height: '100%', width: '100%' }}
                    opts={{ renderer: 'svg' }}
                  />
                </div>
              </motion.div>
            )}

            {completionRateGaugeOption && (
              <motion.div
                className={styles.chartCard}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
              >
                <div className={styles.chartTitle}>Average On-Time Completion Rate</div>
                <div className={styles.chartWrapper}>
                  <ReactECharts
                    option={completionRateGaugeOption}
                    style={{ height: '100%', width: '100%' }}
                    opts={{ renderer: 'svg' }}
                  />
                </div>
              </motion.div>
            )}

            {radarChartOption && (
              <motion.div
                className={styles.chartCard}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
              >
                <div className={styles.chartTitle}>Metrics Overview (Radar Chart)</div>
                <div className={styles.chartWrapper}>
                  <ReactECharts
                    option={radarChartOption}
                    style={{ height: '100%', width: '100%' }}
                    opts={{ renderer: 'svg' }}
                  />
                </div>
              </motion.div>
            )}

          </>
        )}
      </div>
    </motion.div>
  );
};

export default ManagerDashboard;

