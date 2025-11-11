# Luồng Tạo Contract từ Service Request

## Tổng quan
Luồng này mô tả cách Manager tạo Contract từ Service Request sau khi đã được assign task.

## Flow Diagram

```
Customer tạo Service Request
    ↓
Manager xem danh sách Requests (pending)
    ↓
Manager assign request vào mình (Assign to Me)
    ↓
Service Request được cập nhật: managerUserId = current manager ID
    ↓
Manager click "Create Contract" button
    ↓
Modal Create Contract hiển thị với thông tin tự động điền
    ↓
Manager điều chỉnh thông tin (pricing, SLA, terms, etc.)
    ↓
Manager submit form
    ↓
Frontend gọi API: POST /contracts/from-request/{requestId}
    ↓
Backend ContractService xử lý:
    1. Lấy Service Request từ request-service (Feign Client)
    2. Validate: Request có manager chưa?
    3. Validate: Manager có phải là current user?
    4. Validate: Đã có contract cho request này chưa?
    5. Map ServiceType → ContractType
    6. Generate contract number
    7. Tính toán pricing (deposit, final amount)
    8. Tính SLA days và due date
    9. Tạo Contract entity với snapshot contact info
    10. Lưu vào database
    ↓
Trả về ContractResponse
    ↓
Frontend hiển thị success message
    ↓
Refresh danh sách requests
```

## Chi tiết từng bước

### Bước 1: Customer tạo Service Request
- Customer tạo service request qua frontend
- Request có status = `pending`
- Request chưa có `managerUserId` (null)

### Bước 2: Manager xem danh sách Requests
**Frontend:** `ServiceRequestManagement.jsx`
- Manager vào trang Service Request Management
- Có 2 tabs:
  - **All Requests**: Tất cả requests (pending, assigned, etc.)
  - **My Assigned Requests**: Chỉ requests đã được assign cho manager hiện tại

**API Calls:**
- `GET /requests/requests` - Lấy tất cả requests
- `GET /requests/requests?assignedTo={managerId}` - Lấy requests đã assign

### Bước 3: Manager Assign Request
**Frontend Action:** Click button "Assign to Me"

**API Call:**
```javascript
PUT /requests/requests/{requestId}/assign
Body: { managerId: currentUserId }
```

**Backend (request-service):**
- ServiceRequestService.assignManager()
- Kiểm tra request chưa có manager
- Set `managerUserId = currentUserId`
- Publish RequestAssignedEvent (để chat service tạo room)
- Update status nếu cần

**Kết quả:**
- Request có `managerUserId` = manager hiện tại
- Button "Assign to Me" biến mất
- Button "Create Contract" xuất hiện

### Bước 4: Manager Click "Create Contract"
**Frontend:** `handleCreateContract(record)`
```javascript
const handleCreateContract = record => {
  setSelectedRequestForContract(record);
  setCreateContractModalVisible(true);
};
```

**UI Changes:**
- Modal `CreateContractModal` hiển thị
- Form tự động điền thông tin từ serviceRequest

### Bước 5: Form Tự Động Điền Thông Tin
**Frontend:** `CreateContractModal.jsx` - useEffect hook

**Auto-filled Data:**
```javascript
- contractType: mapServiceTypeToContractType(serviceRequest.requestType)
  * transcription → transcription
  * arrangement → arrangement
  * arrangement_with_recording → arrangement_with_recording
  * recording → recording

- totalPrice: serviceRequest.totalPrice (từ request)
- currency: serviceRequest.currency (từ request)
- depositPercent: 40% (default)
- slaDays: 
  * transcription → 7 days
  * arrangement → 14 days
  * arrangement_with_recording → 21 days
  * recording → 7 days
  * bundle → 21 days

- autoDueDate: true (default)
- expectedStartDate: today
- freeRevisionsIncluded: 1 (default)
```

### Bước 6: Manager Điều Chỉnh Thông Tin
Manager có thể chỉnh sửa:
- Contract Type (nếu muốn thay đổi)
- Total Price
- Base Price
- Currency
- Deposit Percent
- SLA Days
- Expected Start Date
- Terms and Conditions
- Special Clauses
- Notes
- Expires At (optional)

**Auto-calculated Fields:**
- Deposit Amount = Total Price × Deposit Percent / 100
- Final Amount = Total Price - Deposit Amount
- Due Date = Expected Start Date + SLA Days (nếu autoDueDate = true)

### Bước 7: Manager Submit Form
**Frontend:** `handleSubmit(values)`

**API Call:**
```javascript
POST /api/v1/projects/contracts/from-request/{requestId}
Body: {
  contractType: "arrangement_with_recording",
  totalPrice: 5000000,
  basePrice: 5000000,
  currency: "VND",
  depositPercent: 40,
  slaDays: 21,
  autoDueDate: true,
  expectedStartDate: "2025-01-20T00:00:00Z",
  termsAndConditions: "...",
  specialClauses: "...",
  notes: "...",
  freeRevisionsIncluded: 1,
  additionalRevisionFeeVnd: 0,
  expiresAt: null
}
```

### Bước 8: Backend Xử Lý (ContractService)
**Location:** `backend/project-service/src/main/java/.../ContractService.java`

#### 8.1. Lấy Service Request từ request-service
```java
ApiResponse<ServiceRequestInfoResponse> serviceRequestResponse = 
    requestServiceFeignClient.getServiceRequestById(requestId);
```
- Sử dụng Feign Client để gọi request-service
- URL: `http://localhost:8084/requests/{requestId}`
- Lấy thông tin: userId, managerUserId, requestType, contactInfo, totalPrice, currency

#### 8.2. Validate: Request có manager chưa?
```java
if (serviceRequest.getManagerUserId() == null || serviceRequest.getManagerUserId().isBlank()) {
    throw UnauthorizedException.create(
        "Cannot create contract: Service request has no assigned manager");
}
```

#### 8.3. Validate: Đã có contract chưa?
```java
if (contractRepository.existsByRequestId(requestId)) {
    throw ContractAlreadyExistsException.forRequest(requestId);
}
```
- Một request chỉ có thể có 1 contract

#### 8.4. Validate: Manager có quyền?
```java
String currentUserId = getCurrentUserId(); // Lấy từ JWT token
if (!currentUserId.equals(serviceRequest.getManagerUserId())) {
    throw UnauthorizedException.create(
        "Only the assigned manager can create contract for this request");
}
```

#### 8.5. Map ServiceType → ContractType
```java
ContractType contractType = mapServiceTypeToContractType(serviceRequest.getRequestType());
// Nếu frontend gửi contractType, ưu tiên dùng giá trị từ frontend
if (createRequest.getContractType() != null) {
    contractType = createRequest.getContractType();
}
```

#### 8.6. Generate Contract Number
```java
String contractNumber = generateContractNumber(contractType);
// Format: CTR-YYYYMMDD-XXXX
// Ví dụ: CTR-20250120-A1B2
```

#### 8.7. Tính toán Pricing
```java
// Total Price: từ request hoặc từ form
BigDecimal totalPrice = createRequest.getTotalPrice() != null 
    ? createRequest.getTotalPrice() 
    : serviceRequest.getTotalPrice();

// Base Price: từ form hoặc = totalPrice
BigDecimal basePrice = createRequest.getBasePrice() != null 
    ? createRequest.getBasePrice() 
    : totalPrice;

// Currency: từ request hoặc từ form, default VND
CurrencyType currency = createRequest.getCurrency() != null
    ? createRequest.getCurrency()
    : CurrencyType.valueOf(serviceRequest.getCurrency());

// Deposit Percent: từ form, default 40%
BigDecimal depositPercent = createRequest.getDepositPercent() != null
    ? createRequest.getDepositPercent()
    : BigDecimal.valueOf(40.0);

// Tính Deposit Amount và Final Amount
BigDecimal depositAmount = totalPrice * depositPercent / 100;
BigDecimal finalAmount = totalPrice - depositAmount;
```

#### 8.8. Tính SLA Days và Due Date
```java
// SLA Days: từ form hoặc default theo contract type
Integer slaDays = createRequest.getSlaDays() != null
    ? createRequest.getSlaDays()
    : getDefaultSlaDays(contractType);

// Due Date: tự động tính nếu autoDueDate = true
Instant expectedStartDate = createRequest.getExpectedStartDate() != null
    ? createRequest.getExpectedStartDate()
    : Instant.now();

Instant dueDate = null;
if (createRequest.getAutoDueDate() == null || createRequest.getAutoDueDate()) {
    dueDate = expectedStartDate.plusSeconds(slaDays * 24L * 60 * 60);
}
```

#### 8.9. Tạo Contract Entity
```java
Contract contract = Contract.builder()
    .requestId(requestId)                    // Link đến service request
    .userId(serviceRequest.getUserId())      // Customer ID
    .managerUserId(serviceRequest.getManagerUserId()) // Manager ID
    .contractNumber(contractNumber)          // CTR-YYYYMMDD-XXXX
    .contractType(contractType)              // transcription, arrangement, etc.
    .status(ContractStatus.draft)            // Mặc định = draft
    .basePrice(basePrice)
    .totalPrice(totalPrice)
    .currency(currency)
    .depositPercent(depositPercent)
    .depositAmount(depositAmount)
    .finalAmount(finalAmount)
    .depositPaid(false)                      // Chưa thanh toán
    .expectedStartDate(expectedStartDate)
    .dueDate(dueDate)
    .slaDays(slaDays)
    .autoDueDate(true)
    .freeRevisionsIncluded(1)                // Default 1 revision
    .termsAndConditions(createRequest.getTermsAndConditions())
    .specialClauses(createRequest.getSpecialClauses())
    .notes(createRequest.getNotes())
    // Snapshot contact info (cho legal purposes)
    .nameSnapshot(serviceRequest.getContactName())
    .phoneSnapshot(serviceRequest.getContactPhone())
    .emailSnapshot(serviceRequest.getContactEmail())
    .createdAt(Instant.now())
    .build();
```

**Lưu ý quan trọng:**
- **Snapshot contact info**: Lưu thông tin contact tại thời điểm tạo contract (để legal purposes, không thay đổi sau này)
- **Status = draft**: Contract mới tạo có status = draft, manager có thể chỉnh sửa sau

#### 8.10. Lưu vào Database
```java
Contract saved = contractRepository.save(contract);
```

**Database Table:** `contracts`
- Contract được lưu vào project-service database
- Có foreign key reference đến service request (soft reference, chỉ lưu requestId)

### Bước 9: Trả về Response
**Backend:** `ContractController.createContractFromServiceRequest()`
```java
return ApiResponse.<ContractResponse>builder()
    .message("Contract created successfully")
    .data(contractResponse)
    .statusCode(HttpStatus.CREATED.value())
    .status("success")
    .build();
```

### Bước 10: Frontend Xử lý Response
**Frontend:** `CreateContractModal.handleSubmit()`
```javascript
if (response?.status === 'success') {
    message.success('Contract created successfully!');
    form.resetFields();
    onSuccess?.(response.data);  // Callback để refresh danh sách
    onCancel();                  // Đóng modal
}
```

### Bước 11: Refresh Danh Sách
**Frontend:** `ServiceRequestManagement.handleContractCreated()`
```javascript
const handleContractCreated = contract => {
    message.success('Contract created successfully!');
    fetchAllRequests();   // Refresh tất cả requests
    fetchMyRequests();    // Refresh requests đã assign
};
```

## Kiến trúc và Components

### Frontend Components
1. **ServiceRequestManagement.jsx**
   - Trang quản lý service requests
   - Hiển thị danh sách requests
   - Button "Create Contract" (chỉ hiện khi request đã được assign cho manager)

2. **CreateContractModal.jsx**
   - Modal form để tạo contract
   - Tự động điền thông tin từ serviceRequest
   - Validate và submit form

3. **ServiceRequestDetailModal.jsx**
   - Modal hiển thị chi tiết request
   - Có button "Create Contract" nếu request đã được assign

### Backend Services
1. **ContractService** (project-service)
   - Xử lý logic tạo contract
   - Validate và tính toán
   - Lưu vào database

2. **RequestServiceFeignClient** (project-service)
   - Feign Client để gọi request-service
   - Lấy thông tin service request

3. **ServiceRequestService** (request-service)
   - Xử lý assign manager
   - Quản lý service requests

### Database
1. **contracts table** (project-service database)
   - Lưu thông tin contract
   - Soft reference đến service_requests (chỉ lưu requestId)

2. **service_requests table** (request-service database)
   - Lưu thông tin service request
   - Có managerUserId để biết manager đã assign

## Security & Validation

### Security Checks
1. **Authentication**: JWT token từ request header
2. **Authorization**: Chỉ manager được assign mới tạo được contract
3. **Validation**: Request phải có manager, chưa có contract

### Validation Rules
1. Service request phải có managerUserId
2. Manager tạo contract phải là manager được assign
3. Một request chỉ có thể có 1 contract
4. Contract type phải hợp lệ
5. Pricing phải > 0
6. SLA days phải > 0

## Error Handling

### Frontend Errors
- Service request not found
- Failed to create contract
- Network errors

### Backend Errors
- `ServiceRequestNotFoundException`: Request không tồn tại
- `UnauthorizedException`: Không có quyền tạo contract
- `ContractAlreadyExistsException`: Đã có contract cho request này
- `UserNotAuthenticatedException`: User chưa đăng nhập

## Next Steps (Sau khi tạo contract)

1. **Manager review contract**: Xem lại contract đã tạo
2. **Send to customer**: Manager gửi contract cho customer (status = sent)
3. **Customer review**: Customer xem và review contract (status = reviewed)
4. **Customer sign**: Customer ký contract (status = signed)
5. **Payment**: Customer thanh toán deposit
6. **Start work**: Bắt đầu thực hiện công việc

## API Endpoints

### Create Contract
```
POST /api/v1/projects/contracts/from-request/{requestId}
Authorization: Bearer {JWT_TOKEN}
Body: CreateContractRequest
Response: ContractResponse
```

### Get Contract
```
GET /api/v1/projects/contracts/{contractId}
Authorization: Bearer {JWT_TOKEN}
Response: ContractResponse
```

### Get Contracts by Request
```
GET /api/v1/projects/contracts/by-request/{requestId}
Authorization: Bearer {JWT_TOKEN}
Response: List<ContractResponse>
```

### Get My Contracts
```
GET /api/v1/projects/contracts/my-contracts
Authorization: Bearer {JWT_TOKEN}
Response: List<ContractResponse>
```

### Get My Managed Contracts
```
GET /api/v1/projects/contracts/my-managed-contracts
Authorization: Bearer {JWT_TOKEN}
Response: List<ContractResponse>
```

## Summary

Luồng tạo contract từ service request là một quy trình đơn giản nhưng có nhiều bước validation và xử lý:

1. **Manager assign request** → Request có manager
2. **Manager click "Create Contract"** → Modal hiển thị
3. **Form tự động điền** → Thông tin từ service request
4. **Manager điều chỉnh** → Pricing, SLA, terms, etc.
5. **Submit form** → API call đến backend
6. **Backend validate** → Kiểm tra quyền, dữ liệu
7. **Backend tạo contract** → Lưu vào database
8. **Frontend refresh** → Hiển thị contract mới tạo

Contract được tạo với status = `draft`, manager có thể chỉnh sửa và gửi cho customer sau.

