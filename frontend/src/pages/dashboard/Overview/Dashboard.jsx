import { Typography } from 'antd';

const { Title } = Typography;

const Dashboard = () => {
  return (
    <div>
      <Title level={2}>Manager Dashboard</Title>
      <p>
        Welcome to the manager dashboard. Here you can see an overview of all
        activities.
      </p>
    </div>
  );
};

export default Dashboard;
