/*
  # Add target_warmth and target_season to outfits table

  ## Summary
  코디 생성 시 사용자가 선택한 Season & 보온성 설정값을 저장하기 위한 컬럼 추가

  ## Changes
  - `outfits` 테이블에 `target_warmth` (numeric) 컬럼 추가
    - 코디 생성 시 선택한 목표 보온도 값 (1.0 ~ 5.0)
    - NULL 허용 (기존 코디 호환성)
  - `outfits` 테이블에 `target_season` (text) 컬럼 추가
    - 코디 생성 시 선택한 시즌 ('spring' | 'summer' | 'fall' | 'winter')
    - NULL 허용 (기존 코디 호환성)

  ## Notes
  - 기존 코디 데이터에는 NULL로 저장되며 기존 로직과 호환
  - outfit linker에서 이 값을 기반으로 시즌/보온성 추천 필터링에 활용
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'outfits' AND column_name = 'target_warmth'
  ) THEN
    ALTER TABLE outfits ADD COLUMN target_warmth numeric;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'outfits' AND column_name = 'target_season'
  ) THEN
    ALTER TABLE outfits ADD COLUMN target_season text;
  END IF;
END $$;
