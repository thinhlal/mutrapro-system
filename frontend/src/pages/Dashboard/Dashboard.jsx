import { Typography } from "antd";

const { Title } = Typography;

const Dashboard = () => {
  return (
    <div>
      <Title level={2}>Coordinator Dashboard</Title>
      <p>
        Welcome to the coordinator dashboard. Here you can see an overview of
        all activities.
      </p>
    </div>
  );
};

export default Dashboard;
