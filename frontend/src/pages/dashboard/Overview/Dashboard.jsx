import { Typography } from 'antd';
import styles from './Dashboard.module.css';

const { Title } = Typography;

const Dashboard = () => {
  return (
    <div className={styles.container}>
      <Title level={3}>Manager Dashboard</Title>
      <p>
        Welcome to the manager dashboard. Here you can see an overview of all
        activities.
      </p>
    </div>
  );
};

export default Dashboard;
