import { Link } from 'react-router-dom';
import {
  ProfileOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import SpecialistLayout from '../SpecialistLayout/SpecialistLayout';

const menuItems = [
  {
    key: '/arrangement/my-tasks',
    icon: <UnorderedListOutlined />,
    label: <Link to="/arrangement/my-tasks">My Tasks</Link>,
  },
  {
    key: '/arrangement/profile',
    icon: <ProfileOutlined />,
    label: <Link to="/arrangement/profile">My Profile</Link>,
  },
];

const ArrangementLayout = () => {
  return (
    <SpecialistLayout specialization="ARRANGEMENT" menuItems={menuItems} />
  );
};

export default ArrangementLayout;
