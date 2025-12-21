import { Link } from 'react-router-dom';
import {
  ProfileOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import SpecialistLayout from '../SpecialistLayout/SpecialistLayout';

const menuItems = [
  {
    key: '/recording-artist/studio-bookings',
    icon: <CalendarOutlined />,
    label: <Link to="/recording-artist/studio-bookings">My Bookings</Link>,
  },
  {
    key: '/recording-artist/my-slots',
    icon: <ClockCircleOutlined />,
    label: <Link to="/recording-artist/my-slots">My Work Slots</Link>,
  },
  {
    key: '/recording-artist/profile',
    icon: <ProfileOutlined />,
    label: <Link to="/recording-artist/profile">My Profile</Link>,
  },
];

const RecordingArtistLayout = () => {
  return (
    <SpecialistLayout specialization="RECORDING_ARTIST" menuItems={menuItems} />
  );
};

export default RecordingArtistLayout;
