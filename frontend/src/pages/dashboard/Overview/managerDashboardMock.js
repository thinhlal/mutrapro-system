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
    awaiting_feedback: { color: 'purple', text: 'Awaiting Feedback' },
    contract_sent: { color: 'cyan', text: 'Contract Sent' },
    contract_approved: { color: 'blue', text: 'Contract Approved' },
    contract_signed: { color: 'green', text: 'Contract Signed' },
    awaiting_assignment: { color: 'orange', text: 'Awaiting Assignment' },
    confirmed: { color: 'green', text: 'Confirmed' },
    conflict: { color: 'red', text: 'Conflict' },
    available: { color: 'green', text: 'Available' },
    booked: { color: 'blue', text: 'Booked' },
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
    newRequests: { value: 8, trend: 12.5 },
    inProgress: { value: 23, trend: -5.1 },
    completed: { value: 15, trend: 12.0 },
    unassignedTasks: { value: 7, trend: -8.5 },
  },
  '7d': {
    newRequests: { value: 45, trend: 8.1 },
    inProgress: { value: 89, trend: 2.3 },
    completed: { value: 112, trend: 8.5 },
    unassignedTasks: { value: 15, trend: -3.2 },
  },
  '30d': {
    newRequests: { value: 189, trend: 18.7 },
    inProgress: { value: 312, trend: 8.9 },
    completed: { value: 456, trend: 15.3 },
    unassignedTasks: { value: 23, trend: -8.2 },
  },
};

// ============ PIPELINE DATA ============
export const pipelineData = {
  newRequests: [
    {
      key: '1',
      code: 'REQ-2024-089',
      customer: 'Nguyen Van A',
      type: 'Transcription',
      createdAt: '2024-12-15 09:30',
      priority: 'high',
    },
    {
      key: '2',
      code: 'REQ-2024-088',
      customer: 'Tran Thi B',
      type: 'Arrangement',
      createdAt: '2024-12-15 10:15',
      priority: 'medium',
    },
    {
      key: '3',
      code: 'REQ-2024-087',
      customer: 'Le Van C',
      type: 'Recording',
      createdAt: '2024-12-15 11:00',
      priority: 'low',
    },
    {
      key: '4',
      code: 'REQ-2024-086',
      customer: 'Pham Thi D',
      type: 'Full Production',
      createdAt: '2024-12-15 14:20',
      priority: 'high',
    },
  ],
  inQuotation: [
    {
      key: '1',
      code: 'REQ-2024-085',
      customer: 'Hoang Van E',
      type: 'Transcription',
      quotationSent: '2024-12-14',
      daysWaiting: 1,
      estimatedValue: 2500000,
    },
    {
      key: '2',
      code: 'REQ-2024-084',
      customer: 'Vu Thi F',
      type: 'Arrangement',
      quotationSent: '2024-12-13',
      daysWaiting: 2,
      estimatedValue: 5000000,
    },
    {
      key: '3',
      code: 'REQ-2024-083',
      customer: 'Do Van G',
      type: 'Recording',
      quotationSent: '2024-12-12',
      daysWaiting: 3,
      estimatedValue: 8500000,
    },
  ],
  inProgress: [
    {
      key: '1',
      code: 'REQ-2024-082',
      customer: 'Bui Thi H',
      type: 'Transcription',
      assignedTo: 'Specialist A',
      progress: 65,
      deadline: '2024-12-18',
      daysRemaining: 3,
    },
    {
      key: '2',
      code: 'REQ-2024-081',
      customer: 'Nguyen Van I',
      type: 'Arrangement',
      assignedTo: 'Specialist B',
      progress: 45,
      deadline: '2024-12-20',
      daysRemaining: 5,
    },
    {
      key: '3',
      code: 'REQ-2024-080',
      customer: 'Tran Thi J',
      type: 'Recording',
      assignedTo: 'Specialist C',
      progress: 80,
      deadline: '2024-12-17',
      daysRemaining: 2,
    },
  ],
  awaitingFeedback: [
    {
      key: '1',
      code: 'REQ-2024-079',
      customer: 'Le Van K',
      type: 'Transcription',
      submittedAt: '2024-12-14',
      daysWaiting: 1,
      specialist: 'Specialist A',
    },
    {
      key: '2',
      code: 'REQ-2024-078',
      customer: 'Pham Thi L',
      type: 'Arrangement',
      submittedAt: '2024-12-13',
      daysWaiting: 2,
      specialist: 'Specialist B',
    },
  ],
};

// ============ WORKLOAD DATA ============
export const unassignedTasks = [
  {
    key: '1',
    task: 'Transcription - REQ-2024-089',
    skill: 'Music Transcription',
    priority: 'high',
    createdAt: '2024-12-15',
    estimatedHours: 8,
  },
  {
    key: '2',
    task: 'Arrangement - REQ-2024-088',
    skill: 'Orchestration',
    priority: 'medium',
    createdAt: '2024-12-15',
    estimatedHours: 12,
  },
  {
    key: '3',
    task: 'Recording - REQ-2024-087',
    skill: 'Audio Engineering',
    priority: 'high',
    createdAt: '2024-12-15',
    estimatedHours: 6,
  },
  {
    key: '4',
    task: 'Mixing - REQ-2024-086',
    skill: 'Audio Mixing',
    priority: 'medium',
    createdAt: '2024-12-14',
    estimatedHours: 10,
  },
];

export const overloadedSpecialists = [
  {
    key: '1',
    name: 'Specialist A',
    currentTasks: 8,
    maxCapacity: 6,
    utilization: 133,
    skills: ['Transcription', 'Arrangement'],
    nextAvailable: '2024-12-18',
  },
  {
    key: '2',
    name: 'Specialist B',
    currentTasks: 7,
    maxCapacity: 6,
    utilization: 117,
    skills: ['Recording', 'Mixing'],
    nextAvailable: '2024-12-19',
  },
  {
    key: '3',
    name: 'Specialist C',
    currentTasks: 6,
    maxCapacity: 5,
    utilization: 120,
    skills: ['Mastering', 'Audio Engineering'],
    nextAvailable: '2024-12-17',
  },
];

export const slaAtRisk = [
  {
    key: '1',
    code: 'REQ-2024-082',
    customer: 'Bui Thi H',
    deadline: '2024-12-18',
    daysRemaining: 3,
    progress: 65,
    assignedTo: 'Specialist A',
    riskLevel: 'high',
  },
  {
    key: '2',
    code: 'REQ-2024-081',
    customer: 'Nguyen Van I',
    deadline: '2024-12-20',
    daysRemaining: 5,
    progress: 45,
    assignedTo: 'Specialist B',
    riskLevel: 'medium',
  },
  {
    key: '3',
    code: 'REQ-2024-080',
    customer: 'Tran Thi J',
    deadline: '2024-12-17',
    daysRemaining: 2,
    progress: 80,
    assignedTo: 'Specialist C',
    riskLevel: 'high',
  },
];

// ============ MILESTONES DATA ============
export const milestonesDue = [
  {
    key: '1',
    code: 'CT-2024-089',
    milestone: 'Milestone 1: Transcription Complete',
    dueDate: '2024-12-16',
    daysRemaining: 1,
    customer: 'Nguyen Van A',
    value: 5000000,
    status: 'in_progress',
  },
  {
    key: '2',
    code: 'CT-2024-088',
    milestone: 'Milestone 2: Arrangement Review',
    dueDate: '2024-12-17',
    daysRemaining: 2,
    customer: 'Tran Thi B',
    value: 3000000,
    status: 'pending',
  },
  {
    key: '3',
    code: 'CT-2024-087',
    milestone: 'Milestone 3: Final Delivery',
    dueDate: '2024-12-18',
    daysRemaining: 3,
    customer: 'Le Van C',
    value: 8000000,
    status: 'in_progress',
  },
];

export const milestonesAwaitingPayment = [
  {
    key: '1',
    code: 'CT-2024-089',
    milestone: 'Milestone 1: Transcription Complete',
    completedAt: '2024-12-14',
    daysOverdue: 1,
    customer: 'Nguyen Van A',
    amount: 5000000,
  },
  {
    key: '2',
    code: 'CT-2024-088',
    milestone: 'Milestone 2: Arrangement Review',
    completedAt: '2024-12-13',
    daysOverdue: 2,
    customer: 'Tran Thi B',
    amount: 3000000,
  },
];

export const revisionPending = [
  {
    key: '1',
    code: 'CT-2024-089',
    request: 'Adjust tempo and add strings',
    requestedAt: '2024-12-14',
    daysWaiting: 1,
    customer: 'Nguyen Van A',
    assignedTo: 'Specialist A',
    priority: 'high',
  },
  {
    key: '2',
    code: 'CT-2024-088',
    request: 'Change key signature',
    requestedAt: '2024-12-13',
    daysWaiting: 2,
    customer: 'Tran Thi B',
    assignedTo: 'Specialist B',
    priority: 'medium',
  },
  {
    key: '3',
    code: 'CT-2024-087',
    request: 'Increase volume levels',
    requestedAt: '2024-12-12',
    daysWaiting: 3,
    customer: 'Le Van C',
    assignedTo: 'Specialist C',
    priority: 'low',
  },
];

// ============ BOOKING/STUDIO DATA ============
export const upcomingBookings = [
  {
    key: '1',
    studio: 'Studio A',
    customer: 'Nguyen Van A',
    date: '2024-12-18',
    time: '09:00 - 12:00',
    duration: 3,
    status: 'confirmed',
    project: 'REQ-2024-082',
  },
  {
    key: '2',
    studio: 'Studio B',
    customer: 'Tran Thi B',
    date: '2024-12-18',
    time: '14:00 - 18:00',
    duration: 4,
    status: 'confirmed',
    project: 'REQ-2024-081',
  },
  {
    key: '3',
    studio: 'Studio A',
    customer: 'Le Van C',
    date: '2024-12-19',
    time: '10:00 - 14:00',
    duration: 4,
    status: 'pending',
    project: 'REQ-2024-080',
  },
  {
    key: '4',
    studio: 'Studio C',
    customer: 'Pham Thi D',
    date: '2024-12-20',
    time: '08:00 - 11:00',
    duration: 3,
    status: 'confirmed',
    project: 'REQ-2024-079',
  },
];

export const studioAvailability = [
  {
    key: '1',
    studio: 'Studio A',
    today: { available: 4, booked: 8, total: 12 },
    thisWeek: { available: 28, booked: 56, total: 84 },
    conflicts: 0,
  },
  {
    key: '2',
    studio: 'Studio B',
    today: { available: 6, booked: 6, total: 12 },
    thisWeek: { available: 42, booked: 42, total: 84 },
    conflicts: 1,
  },
  {
    key: '3',
    studio: 'Studio C',
    today: { available: 8, booked: 4, total: 12 },
    thisWeek: { available: 56, booked: 28, total: 84 },
    conflicts: 0,
  },
];

export const bookingConflicts = [
  {
    key: '1',
    studio: 'Studio B',
    date: '2024-12-18',
    time: '14:00 - 18:00',
    conflict: 'Double booking detected',
    booking1: 'REQ-2024-081',
    booking2: 'REQ-2024-082',
    severity: 'high',
  },
];

// ============ CUSTOMER EXPERIENCE DATA ============
export const unreadChats = [
  {
    key: '1',
    customer: 'Nguyen Van A',
    lastMessage: 'When will my project be ready?',
    timeAgo: '2 hours ago',
    project: 'REQ-2024-082',
    priority: 'high',
  },
  {
    key: '2',
    customer: 'Tran Thi B',
    lastMessage: 'Can I request a revision?',
    timeAgo: '5 hours ago',
    project: 'REQ-2024-081',
    priority: 'medium',
  },
  {
    key: '3',
    customer: 'Le Van C',
    lastMessage: 'Thank you for the update',
    timeAgo: '1 day ago',
    project: 'REQ-2024-080',
    priority: 'low',
  },
];

export const ticketsDisputes = [
  {
    key: '1',
    ticketId: 'TKT-2024-001',
    customer: 'Nguyen Van A',
    subject: 'Quality issue with transcription',
    status: 'open',
    createdAt: '2024-12-14',
    priority: 'high',
    project: 'REQ-2024-082',
  },
  {
    key: '2',
    ticketId: 'TKT-2024-002',
    customer: 'Tran Thi B',
    subject: 'Payment dispute',
    status: 'in_progress',
    createdAt: '2024-12-13',
    priority: 'critical',
    project: 'REQ-2024-081',
  },
];

export const ratingsFeedback = [
  {
    key: '1',
    customer: 'Nguyen Van A',
    project: 'REQ-2024-082',
    rating: 5,
    comment: 'Excellent work, very professional',
    date: '2024-12-14',
  },
  {
    key: '2',
    customer: 'Tran Thi B',
    project: 'REQ-2024-081',
    rating: 4,
    comment: 'Good quality but delivery was slightly delayed',
    date: '2024-12-13',
  },
  {
    key: '3',
    customer: 'Le Van C',
    project: 'REQ-2024-080',
    rating: 3,
    comment: 'Needs improvement in communication',
    date: '2024-12-12',
  },
];

// ============ TEAM PERFORMANCE DATA ============
export const teamPerformance = [
  {
    key: '1',
    specialist: 'Specialist A',
    tasksCompleted: 45,
    onTimeRate: 94.5,
    revisionRate: 8.2,
    avgProcessingTime: '2.5 days',
    skills: ['Transcription', 'Arrangement'],
  },
  {
    key: '2',
    specialist: 'Specialist B',
    tasksCompleted: 38,
    onTimeRate: 89.2,
    revisionRate: 12.5,
    avgProcessingTime: '3.2 days',
    skills: ['Recording', 'Mixing'],
  },
  {
    key: '3',
    specialist: 'Specialist C',
    tasksCompleted: 52,
    onTimeRate: 96.8,
    revisionRate: 5.8,
    avgProcessingTime: '2.1 days',
    skills: ['Mastering', 'Audio Engineering'],
  },
  {
    key: '4',
    specialist: 'Specialist D',
    tasksCompleted: 31,
    onTimeRate: 87.5,
    revisionRate: 15.3,
    avgProcessingTime: '3.8 days',
    skills: ['Arrangement', 'Orchestration'],
  },
];

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
    pipelineFlow: generateDates(7).map((date, i) => ({
      date,
      new: Math.floor(Math.random() * 5) + 3,
      inQuotation: Math.floor(Math.random() * 8) + 5,
      inProgress: Math.floor(Math.random() * 10) + 15,
      completed: Math.floor(Math.random() * 8) + 10,
    })),
    workloadDistribution: [
      { specialist: 'Specialist A', tasks: 8, capacity: 6 },
      { specialist: 'Specialist B', tasks: 7, capacity: 6 },
      { specialist: 'Specialist C', tasks: 6, capacity: 5 },
      { specialist: 'Specialist D', tasks: 5, capacity: 5 },
    ],
    completionRate: generateDates(7).map(date => ({
      date,
      rate: Math.floor(Math.random() * 10) + 85,
    })),
  },
  '7d': {
    pipelineFlow: generateDates(7).map((date, i) => ({
      date,
      new: Math.floor(Math.random() * 10) + 5,
      inQuotation: Math.floor(Math.random() * 15) + 10,
      inProgress: Math.floor(Math.random() * 20) + 20,
      completed: Math.floor(Math.random() * 15) + 12,
    })),
    workloadDistribution: [
      { specialist: 'Specialist A', tasks: 45, capacity: 42 },
      { specialist: 'Specialist B', tasks: 38, capacity: 42 },
      { specialist: 'Specialist C', tasks: 52, capacity: 35 },
      { specialist: 'Specialist D', tasks: 31, capacity: 35 },
    ],
    completionRate: generateDates(7).map(date => ({
      date,
      rate: Math.floor(Math.random() * 10) + 85,
    })),
  },
  '30d': {
    pipelineFlow: generateDates(30).map((date, i) => ({
      date,
      new: Math.floor(Math.random() * 15) + 5,
      inQuotation: Math.floor(Math.random() * 20) + 10,
      inProgress: Math.floor(Math.random() * 25) + 20,
      completed: Math.floor(Math.random() * 20) + 12,
    })),
    workloadDistribution: [
      { specialist: 'Specialist A', tasks: 189, capacity: 180 },
      { specialist: 'Specialist B', tasks: 156, capacity: 180 },
      { specialist: 'Specialist C', tasks: 234, capacity: 150 },
      { specialist: 'Specialist D', tasks: 124, capacity: 150 },
    ],
    completionRate: generateDates(30).map(date => ({
      date,
      rate: Math.floor(Math.random() * 10) + 85,
    })),
  },
};

// ============ ALERTS ============
export const alerts = [
  { type: 'error', message: '2 specialists are overloaded (>100% capacity)' },
  { type: 'warning', message: '4 tasks at risk of missing SLA deadline' },
  { type: 'warning', message: '3 milestones awaiting payment confirmation' },
  { type: 'info', message: '1 booking conflict detected in Studio B' },
  { type: 'warning', message: '5 unread customer messages > 4 hours' },
  { type: 'error', message: '1 critical ticket requires immediate attention' },
];

