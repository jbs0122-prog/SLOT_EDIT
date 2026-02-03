# 이미지 스토리지 비용 및 트래픽 관리 가이드

## Supabase Storage 비용 구조

### 무료 티어 (Free Plan)
- **스토리지**: 1GB
- **전송량**: 2GB/월
- **API 요청**: 무제한
- 소규모 프로젝트에 적합

### Pro Plan ($25/월)
- **스토리지**: 100GB 포함 (추가 $0.021/GB/월)
- **전송량**: 200GB/월 포함 (추가 $0.09/GB)
- **API 요청**: 무제한
- 중소규모 상업용 서비스에 적합

### 예상 비용 계산

#### 시나리오 1: 초기 단계 (제품 100개)
- 제품당 평균 이미지 크기: 500KB
- 총 스토리지: 50MB
- 월 조회수: 10,000회
- 전송량: 5GB
- **비용: 무료 티어로 충분**

#### 시나리오 2: 성장 단계 (제품 1,000개)
- 제품당 평균 이미지 크기: 500KB
- 총 스토리지: 500MB
- 월 조회수: 100,000회
- 전송량: 50GB
- **비용: 무료 티어로 충분**

#### 시나리오 3: 확장 단계 (제품 5,000개)
- 제품당 평균 이미지 크기: 500KB
- 총 스토리지: 2.5GB
- 월 조회수: 500,000회
- 전송량: 250GB
- **예상 비용**:
  - Pro Plan 기본: $25
  - 추가 스토리지 (1.5GB): $0.03
  - 추가 전송량 (50GB): $4.50
  - **월 총 비용: ~$30**

#### 시나리오 4: 대규모 운영 (제품 20,000개)
- 제품당 평균 이미지 크기: 500KB
- 총 스토리지: 10GB
- 월 조회수: 2,000,000회
- 전송량: 1TB
- **예상 비용**:
  - Pro Plan 기본: $25
  - 추가 전송량 (800GB): $72
  - **월 총 비용: ~$100**

---

## 비용 절감 전략

### 1. 이미지 최적화 (중요!)

#### 업로드 전 최적화
```javascript
// 이미지 압축 라이브러리 사용 권장
// browser-image-compression 또는 compressorjs

import imageCompression from 'browser-image-compression';

const options = {
  maxSizeMB: 0.5,          // 최대 500KB
  maxWidthOrHeight: 1200,  // 최대 너비/높이
  useWebWorker: true
};

const compressedFile = await imageCompression(file, options);
```

**효과**: 전송량 70-80% 절감 가능

#### WebP 포맷 사용
- JPEG/PNG 대비 30-50% 작은 파일 크기
- 최신 브라우저 대부분 지원

### 2. CDN 캐싱 활용

Supabase Storage는 자동으로 CDN을 통해 제공됩니다:
- 이미지가 전 세계 엣지 서버에 캐시됨
- 반복 요청 시 전송량 비용 없음
- `Cache-Control` 헤더 설정으로 캐시 기간 조정

```typescript
// 업로드 시 캐시 설정
const { data, error } = await supabase.storage
  .from('product-images')
  .upload(filePath, file, {
    cacheControl: '31536000', // 1년 캐싱
    upsert: false,
  });
```

### 3. 이미지 썸네일 생성

대용량 이미지는 썸네일을 별도로 생성:
```javascript
// Supabase Edge Function에서 이미지 리사이징
// 목록 페이지: 300x300 썸네일
// 상세 페이지: 원본 이미지
```

**효과**: 목록 페이지 전송량 90% 절감

### 4. Lazy Loading 구현

```jsx
<img
  src={product.image_url}
  loading="lazy"
  alt={product.name}
/>
```

**효과**: 초기 페이지 로드 전송량 50-60% 절감

### 5. 이미지 정리 자동화

사용하지 않는 이미지 자동 삭제:
```sql
-- 제품에 연결되지 않은 오래된 이미지 찾기
SELECT * FROM storage.objects
WHERE bucket_id = 'product-images'
AND created_at < NOW() - INTERVAL '90 days'
AND name NOT IN (
  SELECT SUBSTRING(image_url FROM 'product-images/(.+)$')
  FROM products
);
```

---

## 트래픽 모니터링

### Supabase Dashboard 활용
1. **Storage** 탭에서 실시간 사용량 확인
2. **Logs** 탭에서 요청 패턴 분석
3. **Usage** 탭에서 월간 트렌드 확인

### 알림 설정
Supabase Project Settings에서:
- 스토리지 사용량 80% 도달 시 알림
- 전송량 80% 도달 시 알림
- 이메일/Slack 웹훅 연동

---

## 비용 최적화 체크리스트

### 즉시 적용 가능 (무료)
- [ ] 업로드 전 이미지 압축 (500KB 이하)
- [ ] WebP 포맷 사용
- [ ] Lazy Loading 구현
- [ ] CDN 캐싱 활용 (1년)

### 단기 구현 (개발 필요)
- [ ] 썸네일 자동 생성 시스템
- [ ] 이미지 크기 검증 강화
- [ ] 중복 이미지 감지 및 제거

### 장기 전략
- [ ] 이미지 사용량 대시보드 구축
- [ ] 오래된 이미지 자동 정리
- [ ] 이미지 리사이징 Edge Function
- [ ] 다중 해상도 이미지 제공

---

## 대안 비교

### Supabase Storage (현재 솔루션)
**장점**:
- 통합 관리 (DB와 같은 플랫폼)
- 자동 CDN 제공
- RLS 보안 기능
- 간편한 SDK

**단점**:
- 대용량 트래픽 시 비용 증가

**추천**: 초기~중기 단계, 월 방문자 50만 이하

### Cloudinary
**장점**:
- 강력한 이미지 변환 기능
- 자동 최적화
- 무료 티어 25GB 저장

**단점**:
- 별도 서비스 관리 필요
- 복잡한 가격 구조

**추천**: 이미지 최적화가 중요한 서비스

### AWS S3 + CloudFront
**장점**:
- 대규모 트래픽에 최적화
- 매우 저렴한 스토리지 비용
- 높은 확장성

**단점**:
- 복잡한 설정
- 관리 부담

**추천**: 대규모 서비스, 월 방문자 100만 이상

---

## 결론 및 권장사항

### 현재 단계에서 Supabase Storage는 최적의 선택입니다:
1. **쉬운 통합**: 이미 사용 중인 Supabase와 완벽한 통합
2. **관리 편의성**: 별도 서비스 없이 한 곳에서 관리
3. **비용 효율성**: 초기~중기 단계에서 매우 경제적
4. **확장 가능성**: 필요 시 쉽게 Pro Plan으로 업그레이드

### 비용 증가 시 대응 전략:
1. **5,000개 제품까지**: 이미지 최적화만으로 충분
2. **20,000개 제품까지**: 썸네일 생성 + 최적화
3. **그 이상**: CDN 별도 구축 또는 S3 전환 검토

### 당장 시작할 것:
1. 이미지 업로드 시 자동 압축 적용
2. WebP 포맷 우선 사용
3. 모든 이미지에 Lazy Loading 적용

이러한 전략을 따르면 **제품 10,000개까지는 월 $50 이하로 운영 가능**합니다.
