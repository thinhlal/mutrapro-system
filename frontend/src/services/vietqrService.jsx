import axios from 'axios';

/**
 * Service để gọi VietQR API
 * Documentation: https://www.vietqr.io/
 */

const VIETQR_API_BASE_URL = 'https://api.vietqr.io/v2';

/**
 * Lấy danh sách ngân hàng từ VietQR API
 * @returns {Promise<Array>} Danh sách ngân hàng với format: { code, name, shortName, logo }
 */
export const getBankList = async () => {
  try {
    const response = await axios.get(`${VIETQR_API_BASE_URL}/banks`);

    if (response.data && response.data.code === '00' && response.data.data) {
      return response.data.data;
    }
    return getFallbackBankList();
  } catch (error) {
    console.error('Error fetching bank list from VietQR:', error);
    // Fallback to common Vietnamese banks if API fails
    return getFallbackBankList();
  }
};

/**
 * Danh sách ngân hàng fallback (nếu API không hoạt động)
 */
const getFallbackBankList = () => {
  // Danh sách ngân hàng phổ biến tại Việt Nam (fallback nếu API không hoạt động)
  return [
    { code: 'VCB', name: 'Ngân hàng TMCP Ngoại Thương Việt Nam', shortName: 'Vietcombank' },
    { code: 'TCB', name: 'Ngân hàng TMCP Kỹ Thương Việt Nam', shortName: 'Techcombank' },
    { code: 'BIDV', name: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam', shortName: 'BIDV' },
    { code: 'VTB', name: 'Ngân hàng TMCP Công Thương Việt Nam', shortName: 'VietinBank' },
    { code: 'MB', name: 'Ngân hàng TMCP Quân Đội', shortName: 'MB Bank' },
    { code: 'ACB', name: 'Ngân hàng TMCP Á Châu', shortName: 'ACB' },
    { code: 'TPB', name: 'Ngân hàng TMCP Tiên Phong', shortName: 'TPBank' },
    { code: 'VPB', name: 'Ngân hàng TMCP Việt Nam Thịnh Vượng', shortName: 'VPBank' },
    { code: 'STB', name: 'Ngân hàng TMCP Sài Gòn Thương Tín', shortName: 'Sacombank' },
    { code: 'HDB', name: 'Ngân hàng TMCP Phát Triển Thành Phố Hồ Chí Minh', shortName: 'HDBank' },
    { code: 'MSB', name: 'Ngân hàng TMCP Hàng Hải', shortName: 'MSB' },
    { code: 'VIB', name: 'Ngân hàng TMCP Quốc Tế Việt Nam', shortName: 'VIB' },
    { code: 'SHB', name: 'Ngân hàng TMCP Sài Gòn - Hà Nội', shortName: 'SHB' },
    { code: 'OCB', name: 'Ngân hàng TMCP Phương Đông', shortName: 'OCB' },
    { code: 'ABB', name: 'Ngân hàng TMCP An Bình', shortName: 'ABBANK' },
    { code: 'VAB', name: 'Ngân hàng TMCP Việt Á', shortName: 'VietABank' },
    { code: 'NAB', name: 'Ngân hàng TMCP Nam Á', shortName: 'NamABank' },
    { code: 'PGB', name: 'Ngân hàng TMCP Xăng dầu Petrolimex', shortName: 'PGBank' },
    { code: 'GPB', name: 'Ngân hàng TMCP Dầu Khí Toàn Cầu', shortName: 'GPBank' },
    { code: 'AGB', name: 'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam', shortName: 'Agribank' },
    { code: 'BAB', name: 'Ngân hàng TMCP Bắc Á', shortName: 'BacABank' },
    { code: 'BSB', name: 'Ngân hàng TMCP Bảo Việt', shortName: 'BaoVietBank' },
    { code: 'LPB', name: 'Ngân hàng TMCP Lào - Việt', shortName: 'LienVietPostBank' },
    { code: 'NAV', name: 'Ngân hàng TMCP Navibank', shortName: 'Navibank' },
    { code: 'OJB', name: 'Ngân hàng TMCP Đại Dương', shortName: 'OceanBank' },
    { code: 'PUB', name: 'Ngân hàng TMCP Đại Chúng Việt Nam', shortName: 'PublicBank' },
    { code: 'SCB', name: 'Ngân hàng TMCP Sài Gòn', shortName: 'SCB' },
    { code: 'SEA', name: 'Ngân hàng TMCP Đông Nam Á', shortName: 'SeABank' },
    { code: 'TAB', name: 'Ngân hàng TMCP Tân Việt', shortName: 'TAB' },
    { code: 'VCCB', name: 'Ngân hàng TMCP Bản Việt', shortName: 'VietCapitalBank' },
  ];
};

