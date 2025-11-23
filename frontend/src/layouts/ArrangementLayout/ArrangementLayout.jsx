import { Link } from 'react-router-dom';
import { ProfileOutlined } from '@ant-design/icons';
import SpecialistLayout from '../SpecialistLayout/SpecialistLayout';

const menuItems = [
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
