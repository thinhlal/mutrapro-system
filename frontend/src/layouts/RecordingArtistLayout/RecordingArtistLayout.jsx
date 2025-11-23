import { Link } from 'react-router-dom';
import { ProfileOutlined } from '@ant-design/icons';
import SpecialistLayout from '../SpecialistLayout/SpecialistLayout';

const menuItems = [
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
