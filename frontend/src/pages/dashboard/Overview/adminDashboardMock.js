import dayjs from 'dayjs';

// ============ HELPERS ============
export const formatCurrency = value => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value);
};

export const formatPercent = value => `${value >= 0 ? '+' : ''}${value}%`;

export const mapStatusToTag = status => {
  const map = {
    pending: { color: 'orange', text: 'Pending' },
    processing: { color: 'blue', text: 'Processing' },
    completed: { color: 'green', text: 'Completed' },
    cancelled: { color: 'red', text: 'Cancelled' },
    overdue: { color: 'volcano', text: 'Overdue' },
    in_progress: { color: 'processing', text: 'In Progress' },
  };
  return map[status] || { color: 'default', text: status };
};

export const mapPriorityToBadge = priority => {
  const map = {
    high: { status: 'error', text: 'High' },
    medium: { status: 'warning', text: 'Medium' },
    low: { status: 'default', text: 'Low' },
    critical: { status: 'error', text: 'Critical' },
  };
  return map[priority] || { status: 'default', text: priority };
};

// ============ KPI DATA ============
export const kpis = {
  today: {
    totalUsers: { value: 2847, trend: 12.5 },
    newUsers: { value: 34, trend: 8.2 },
    totalBalance: { value: 156000000, trend: 15.3 },
    openRequests: { value: 23, trend: -5.1 },
    activeContracts: { value: 67, trend: 3.8 },
    overdueTasks: { value: 5, trend: -12.0 },
  },
  '7d': {
    totalUsers: { value: 2847, trend: 8.1 },
    newUsers: { value: 189, trend: 12.4 },
    totalBalance: { value: 892000000, trend: 22.1 },
    openRequests: { value: 45, trend: 2.3 },
    activeContracts: { value: 67, trend: 5.2 },
    overdueTasks: { value: 8, trend: -8.5 },
  },
  '30d': {
    totalUsers: { value: 2847, trend: 18.7 },
    newUsers: { value: 623, trend: 25.3 },
    totalBalance: { value: 3450000000, trend: 31.2 },
    openRequests: { value: 112, trend: 8.9 },
    activeContracts: { value: 67, trend: 12.1 },
    overdueTasks: { value: 15, trend: -3.2 },
  },
};

// ============ CHARTS DATA ============
const generateDates = days => {
  const dates = [];
  for (let i = days - 1; i >= 0; i--) {
    dates.push(dayjs().subtract(i, 'day').format('MM/DD'));
  }
  return dates;
};

export const chartsData = {
  today: {
    newUsersOverTime: generateDates(7).map((date, i) => ({
      date,
      users: Math.floor(Math.random() * 30) + 20,
    })),
    requestsByType: [
      { type: 'Transcription', value: 45 },
      { type: 'Arrangement', value: 32 },
      { type: 'Recording', value: 23 },
    ],
    topupsVolume: generateDates(7).map(date => ({
      date,
      amount: Math.floor(Math.random() * 50000000) + 10000000,
    })),
  },
  '7d': {
    newUsersOverTime: generateDates(7).map((date, i) => ({
      date,
      users: Math.floor(Math.random() * 50) + 30,
    })),
    requestsByType: [
      { type: 'Transcription', value: 156 },
      { type: 'Arrangement', value: 98 },
      { type: 'Recording', value: 67 },
    ],
    topupsVolume: generateDates(7).map(date => ({
      date,
      amount: Math.floor(Math.random() * 150000000) + 50000000,
    })),
  },
  '30d': {
    newUsersOverTime: generateDates(30).map((date, i) => ({
      date,
      users: Math.floor(Math.random() * 80) + 40,
    })),
    requestsByType: [
      { type: 'Transcription', value: 512 },
      { type: 'Arrangement', value: 287 },
      { type: 'Recording', value: 198 },
    ],
    topupsVolume: generateDates(30).map(date => ({
      date,
      amount: Math.floor(Math.random() * 200000000) + 80000000,
    })),
  },
};

// ============ TABLES DATA ============
export const recentRequests = [
  {
    key: '1',
    code: 'REQ-2024-001',
    customer: 'Nguyen Van A',
    type: 'Transcription',
    status: 'pending',
    createdAt: '2024-12-15',
    totalPrice: 2500000,
  },
  {
    key: '2',
    code: 'REQ-2024-002',
    customer: 'Tran Thi B',
    type: 'Arrangement',
    status: 'processing',
    createdAt: '2024-12-14',
    totalPrice: 5000000,
  },
  {
    key: '3',
    code: 'REQ-2024-003',
    customer: 'Le Van C',
    type: 'Recording',
    status: 'completed',
    createdAt: '2024-12-13',
    totalPrice: 8500000,
  },
  {
    key: '4',
    code: 'REQ-2024-004',
    customer: 'Pham Thi D',
    type: 'Transcription',
    status: 'pending',
    createdAt: '2024-12-12',
    totalPrice: 1800000,
  },
  {
    key: '5',
    code: 'REQ-2024-005',
    customer: 'Hoang Van E',
    type: 'Arrangement',
    status: 'processing',
    createdAt: '2024-12-11',
    totalPrice: 6200000,
  },
  {
    key: '6',
    code: 'REQ-2024-006',
    customer: 'Vu Thi F',
    type: 'Recording',
    status: 'cancelled',
    createdAt: '2024-12-10',
    totalPrice: 3500000,
  },
  {
    key: '7',
    code: 'REQ-2024-007',
    customer: 'Do Van G',
    type: 'Transcription',
    status: 'completed',
    createdAt: '2024-12-09',
    totalPrice: 4200000,
  },
  {
    key: '8',
    code: 'REQ-2024-008',
    customer: 'Bui Thi H',
    type: 'Arrangement',
    status: 'pending',
    createdAt: '2024-12-08',
    totalPrice: 7800000,
  },
];

export const riskyTasks = [
  {
    key: '1',
    task: 'Review contract #CT-089',
    assignee: 'Admin',
    dueDate: '2024-12-10',
    priority: 'critical',
    status: 'overdue',
  },
  {
    key: '2',
    task: 'Approve specialist application',
    assignee: 'Manager',
    dueDate: '2024-12-12',
    priority: 'high',
    status: 'overdue',
  },
  {
    key: '3',
    task: 'Equipment maintenance check',
    assignee: 'Technician',
    dueDate: '2024-12-14',
    priority: 'high',
    status: 'in_progress',
  },
  {
    key: '4',
    task: 'Process refund request',
    assignee: 'Finance',
    dueDate: '2024-12-15',
    priority: 'medium',
    status: 'pending',
  },
  {
    key: '5',
    task: 'Update skill categories',
    assignee: 'Admin',
    dueDate: '2024-12-16',
    priority: 'low',
    status: 'pending',
  },
  {
    key: '6',
    task: 'Verify demo recordings',
    assignee: 'QA',
    dueDate: '2024-12-11',
    priority: 'high',
    status: 'overdue',
  },
  {
    key: '7',
    task: 'Send payment reminders',
    assignee: 'Finance',
    dueDate: '2024-12-13',
    priority: 'medium',
    status: 'in_progress',
  },
  {
    key: '8',
    task: 'Archive old contracts',
    assignee: 'Admin',
    dueDate: '2024-12-17',
    priority: 'low',
    status: 'pending',
  },
];

// ============ MODULE SUMMARY ============
export const moduleSummary = {
  notationInstruments: { total: 156, mostUsed: 'Piano' },
  equipment: { available: 42, booked: 18, maintenance: 3 },
  specialists: { active: 89, inactive: 12, acceptanceRate: 94.5 },
  skills: { total: 67, topDemanded: 'Music Production' },
  demoManagement: { total: 234, active: 45 },
  settings: { lastChanged: '2024-12-14 09:30' },
  studioBookings: { total: 78, upcoming: 12, completed: 66 },
  revisionRequests: { pending: 8, approved: 45, rejected: 3 },
  transcriptionAssignments: { pending: 15, inProgress: 23, completed: 189 },
};

// ============ RECENT CONTRACTS ============
export const recentContracts = [
  {
    key: '1',
    code: 'CT-2024-089',
    customer: 'Nguyen Van A',
    type: 'Arrangement',
    status: 'active',
    signedAt: '2024-12-14',
    totalValue: 15000000,
  },
  {
    key: '2',
    code: 'CT-2024-088',
    customer: 'Tran Thi B',
    type: 'Recording',
    status: 'pending_deposit',
    signedAt: '2024-12-13',
    totalValue: 25000000,
  },
  {
    key: '3',
    code: 'CT-2024-087',
    customer: 'Le Van C',
    type: 'Transcription',
    status: 'completed',
    signedAt: '2024-12-12',
    totalValue: 8500000,
  },
  {
    key: '4',
    code: 'CT-2024-086',
    customer: 'Pham Thi D',
    type: 'Full Production',
    status: 'active',
    signedAt: '2024-12-11',
    totalValue: 45000000,
  },
  {
    key: '5',
    code: 'CT-2024-085',
    customer: 'Hoang Van E',
    type: 'Arrangement',
    status: 'pending_deposit',
    signedAt: '2024-12-10',
    totalValue: 12000000,
  },
];

// ============ STUDIO BOOKINGS ============
export const upcomingStudioBookings = [
  {
    key: '1',
    studio: 'Studio A',
    customer: 'Nguyen Van A',
    date: '2024-12-18',
    time: '09:00 - 12:00',
    status: 'confirmed',
  },
  {
    key: '2',
    studio: 'Studio B',
    customer: 'Tran Thi B',
    date: '2024-12-18',
    time: '14:00 - 18:00',
    status: 'pending',
  },
  {
    key: '3',
    studio: 'Studio A',
    customer: 'Le Van C',
    date: '2024-12-19',
    time: '10:00 - 14:00',
    status: 'confirmed',
  },
  {
    key: '4',
    studio: 'Studio C',
    customer: 'Pham Thi D',
    date: '2024-12-20',
    time: '08:00 - 11:00',
    status: 'confirmed',
  },
];

// ============ ALERTS ============
export const alerts = [
  { type: 'warning', message: '3 contracts awaiting deposit confirmation' },
  { type: 'error', message: '2 payment transactions failed' },
  { type: 'info', message: '1 equipment scheduled for maintenance tomorrow' },
  { type: 'success', message: '15 new user registrations today' },
  { type: 'warning', message: '5 service requests pending review > 48h' },
];

// ============ REVENUE DATA ============
export const revenueData = {
  today: {
    total: { value: 45000000, trend: 12.5, sparkline: [28, 35, 42, 38, 45] },
    fromTopups: {
      value: 30000000,
      trend: 8.2,
      sparkline: [18, 22, 28, 25, 30],
    },
    fromServices: {
      value: 15000000,
      trend: 18.7,
      sparkline: [10, 13, 14, 13, 15],
    },
  },
  '7d': {
    total: {
      value: 320000000,
      trend: 15.3,
      sparkline: [220, 280, 310, 290, 340, 300, 320],
    },
    fromTopups: {
      value: 200000000,
      trend: 11.8,
      sparkline: [140, 170, 190, 180, 210, 185, 200],
    },
    fromServices: {
      value: 120000000,
      trend: 22.1,
      sparkline: [80, 110, 120, 110, 130, 115, 120],
    },
  },
  '30d': {
    total: {
      value: 1250000000,
      trend: 28.4,
      sparkline: [800, 950, 1100, 1050, 1200, 1150, 1250],
    },
    fromTopups: {
      value: 780000000,
      trend: 24.6,
      sparkline: [500, 600, 700, 650, 750, 720, 780],
    },
    fromServices: {
      value: 470000000,
      trend: 35.2,
      sparkline: [300, 350, 400, 400, 450, 430, 470],
    },
  },
};
