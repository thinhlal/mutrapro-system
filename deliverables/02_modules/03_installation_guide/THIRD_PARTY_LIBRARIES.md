# 📚 DANH SÁCH THƯ VIỆN, FRAMEWORK VÀ CÔNG CỤ BÊN THỨ 3

## 📋 TỔNG QUAN

File này liệt kê tất cả các thư viện, framework và công cụ bên thứ 3 được sử dụng trong dự án MuTraPro.

---

## 🔧 BACKEND (Java/Spring Boot)

### Core Framework
| Thư viện | Version | Mục đích |
|----------|---------|----------|
| Spring Boot | 3.5.7 | Core framework |
| Spring Cloud | 2025.0.0 | Microservices support |
| Spring Security | (included) | Authentication & Authorization |
| Spring Data JPA | (included) | Database access |
| Spring Kafka | (included) | Message broker integration |
| Spring Web | (included) | REST API |

### Database & Persistence
| Thư viện | Version | Mục đích |
|----------|---------|----------|
| PostgreSQL Driver | (included) | PostgreSQL database driver |
| Hibernate | (included) | ORM framework |
| Lombok | (included) | Code generation |

### Security
| Thư viện | Version | Mục đích |
|----------|---------|----------|
| Spring Security OAuth2 Resource Server | (included) | JWT validation |
| Spring Security OAuth2 JOSE | (included) | JWT handling |

### Cloud Services
| Thư viện | Version | Mục đích |
|----------|---------|----------|
| AWS SDK for Java (S3) | 2.37.5 | AWS S3 file storage |

### Monitoring & Metrics
| Thư viện | Version | Mục đích |
|----------|---------|----------|
| Spring Boot Actuator | (included) | Health checks, metrics |
| Micrometer Prometheus | (included) | Metrics export |

### Caching
| Thư viện | Version | Mục đích |
|----------|---------|----------|
| Spring Data Redis | (included) | Redis caching |
| Spring Data Redis Reactive | (included) | Reactive Redis (API Gateway) |

### Testing
| Thư viện | Version | Mục đích |
|----------|---------|----------|
| JUnit | (included) | Unit testing |
| Spring Boot Test | (included) | Integration testing |
| Mockito | (included) | Mocking |

---

## 🎨 FRONTEND WEB (React)

### Core Framework
| Thư viện | Version | Mục đích |
|----------|---------|----------|
| React | 19.1.1 | UI framework |
| React DOM | 19.1.1 | DOM rendering |
| Vite | 7.1.2 | Build tool & dev server |

### UI Libraries
| Thư viện | Version | Mục đích |
|----------|---------|----------|
| Material-UI (MUI) | 7.3.2 | UI component library |
| Ant Design | 5.27.3 | UI component library |
| Bootstrap | 5.3.8 | CSS framework |
| React Bootstrap | 2.10.10 | Bootstrap components for React |

### Routing & Navigation
| Thư viện | Version | Mục đích |
|----------|---------|----------|
| React Router DOM | 7.8.2 | Client-side routing |

### State Management
| Thư viện | Version | Mục đích |
|----------|---------|----------|
| Zustand | 5.0.8 | State management |

### HTTP Client
| Thư viện | Version | Mục đích |
|----------|---------|----------|
| Axios | 0.27.2 | HTTP client |

### Real-time Communication
| Thư viện | Version | Mục đích |
|----------|---------|----------|
| STOMP.js | 7.2.1 | WebSocket protocol |
| SockJS Client | 1.6.1 | WebSocket fallback |

### Audio/Media
| Thư viện | Version | Mục đích |
|----------|---------|----------|
| Wavesurfer.js | 7.11.1 | Audio waveform visualization |
| Flat Embed | 2.5.1 | Music notation rendering |

### PDF & Documents
| Thư viện | Version | Mục đích |
|----------|---------|----------|
| React-PDF | 4.3.1 | PDF viewer |
| jsPDF | 3.0.3 | PDF generation |
| html2canvas | 1.4.1 | HTML to image |

### Forms & Signatures
| Thư viện | Version | Mục đích |
|----------|---------|----------|
| React Signature Canvas | 1.1.0-alpha.2 | E-signature |

### Utilities
| Thư viện | Version | Mục đích |
|----------|---------|----------|
| Day.js | 1.11.18 | Date manipulation |
| React Icons | 5.5.0 | Icon library |
| React Hot Toast | 2.6.0 | Toast notifications |
| Lottie React | 2.4.1 | Animation |

### Development Tools
| Thư viện | Version | Mục đích |
|----------|---------|----------|
| ESLint | 9.33.0 | Code linting |
| Prettier | 3.6.2 | Code formatting |
| TypeScript Types | (various) | Type definitions |

---

## 📱 MOBILE (React Native/Expo)

### Core Framework
| Thư viện | Version | Mục đích |
|----------|---------|----------|
| React | 19.1.0 | UI framework |
| React Native | 0.81.5 | Mobile framework |
| Expo | ~54.0.25 | Development platform |

### Navigation
| Thư viện | Version | Mục đích |
|----------|---------|----------|
| React Navigation | 7.x | Navigation library |
| React Navigation Native Stack | 7.8.6 | Stack navigator |
| React Navigation Bottom Tabs | 7.8.6 | Tab navigator |
| React Navigation Drawer | 7.7.4 | Drawer navigator |

### Expo Modules
| Thư viện | Version | Mục đích |
|----------|---------|----------|
| Expo AV | ~16.0.7 | Audio/Video playback |
| Expo File System | ~19.0.19 | File operations |
| Expo Image Picker | ^17.0.9 | Image selection |
| Expo Document Picker | ~14.0.7 | Document selection |
| Expo Sharing | ~14.0.7 | File sharing |
| Expo Auth Session | ^7.0.9 | OAuth authentication |
| Expo Web Browser | ^15.0.9 | In-app browser |
| Expo Crypto | ^15.0.7 | Cryptographic functions |
| Expo Linear Gradient | ~15.0.7 | Gradient backgrounds |
| Expo Vector Icons | ^15.0.3 | Icon library |

### State Management
| Thư viện | Version | Mục đích |
|----------|---------|----------|
| Zustand | 5.0.8 | State management |

### HTTP Client
| Thư viện | Version | Mục đích |
|----------|---------|----------|
| Axios | 1.13.2 | HTTP client |

### Real-time Communication
| Thư viện | Version | Mục đích |
|----------|---------|----------|
| STOMP.js | 7.2.1 | WebSocket protocol |
| SockJS Client | 1.6.1 | WebSocket fallback |

### UI Components
| Thư viện | Version | Mục đích |
|----------|---------|----------|
| React Native Calendars | ^1.1313.0 | Calendar component |
| React Native Signature Canvas | ^5.0.1 | E-signature |
| React Native Toast Message | ^2.3.3 | Toast notifications |
| Lottie React Native | ~7.3.1 | Animation |

### Utilities
| Thư viện | Version | Mục đích |
|----------|---------|----------|
| Day.js | 1.11.19 | Date manipulation |
| Async Storage | 2.2.0 | Local storage |

### Development Tools
| Thư viện | Version | Mục đích |
|----------|---------|----------|
| Babel | ^7.28.5 | JavaScript compiler |
| Babel Preset Expo | ^54.0.7 | Expo Babel preset |
| React Native Dotenv | ^3.4.11 | Environment variables |

---

## 🐳 DEVOPS & INFRASTRUCTURE

### Containerization
| Công cụ | Version | Mục đích |
|---------|--------|----------|
| Docker | Latest | Containerization |
| Docker Compose | 2.0+ | Multi-container orchestration |


### Build Tools
| Công cụ | Version | Mục đích |
|---------|--------|----------|
| Maven | (included) | Java build tool |
| npm | Latest | Node.js package manager |

---

## ☁️ EXTERNAL SERVICES

### Database
| Dịch vụ | Provider | Mục đích |
|---------|----------|----------|
| PostgreSQL | Railway | Main database (7 instances) |

### Caching
| Dịch vụ | Provider | Mục đích |
|---------|----------|----------|
| Redis | Redis Cloud | Caching & session |

### Message Broker
| Dịch vụ | Provider | Mục đích |
|---------|----------|----------|
| Kafka/Redpanda | Local/Managed | Event streaming |

### Object Storage
| Dịch vụ | Provider | Mục đích |
|---------|----------|----------|
| AWS S3 | AWS | File storage |

### Email
| Dịch vụ | Provider | Mục đích |
|---------|----------|----------|
| Gmail SMTP | Google | Email notifications |

### OAuth
| Dịch vụ | Provider | Mục đích |
|---------|----------|----------|
| Google OAuth 2.0 | Google Cloud | Social login |

### Payment
| Dịch vụ | Provider | Mục đích |
|---------|----------|----------|
| Sepay | Sepay | Payment gateway |

### Monitoring
| Dịch vụ | Provider | Mục đích |
|---------|----------|----------|
| Grafana Cloud | Grafana | Metrics & logs |
| Prometheus | (Grafana) | Metrics collection |
| Loki | (Grafana) | Log aggregation |

---

## 📦 PACKAGE MANAGERS

- **Backend:** Maven (Java)
- **Frontend Web:** npm (Node.js)
- **Mobile:** npm (Node.js)

---

## 🔗 LIÊN KẾT TÀI LIỆU

- [Spring Boot Documentation](https://spring.io/projects/spring-boot)
- [React Documentation](https://react.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Expo Documentation](https://docs.expo.dev/)
- [Material-UI Documentation](https://mui.com/)
- [Ant Design Documentation](https://ant.design/)

---

## ⚠️ LƯU Ý

1. **Version Management:** 
   - Backend: Quản lý qua Maven `pom.xml`
   - Frontend: Quản lý qua `package.json`
   - Luôn cập nhật dependencies để fix security vulnerabilities

2. **License:** 
   - Hầu hết các thư viện đều open-source
   - Kiểm tra license trước khi sử dụng trong production

3. **Security:**
   - Thường xuyên chạy `npm audit` và `mvn dependency-check`
   - Cập nhật dependencies có security patches

---

**Cập nhật lần cuối:** [Ngày cập nhật]

