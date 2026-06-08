-- ──────────────────────────────────────────────────────────────
-- TimescaleDB hypertable 설정
-- prisma migrate dev 완료 후 수동으로 실행
-- 실행: docker compose exec timescale psql -U harmrise -d harmrise_db -f /path/to/this.sql
-- ──────────────────────────────────────────────────────────────

-- 1. bpm_records 테이블을 hypertable로 변환 (recorded_at 기준)
SELECT create_hypertable(
  'bpm_records',
  'recorded_at',
  if_not_exists => TRUE
);

-- 2. 청크 간격 설정 (1개월 단위)
SELECT set_chunk_time_interval('bpm_records', INTERVAL '1 month');

-- 3. 압축 정책 설정 (3개월 이상 데이터 자동 압축)
ALTER TABLE bpm_records SET (
  timescaledb.compress,
  timescaledb.compress_orderby = 'recorded_at DESC',
  timescaledb.compress_segmentby = 'user_id'
);

SELECT add_compression_policy('bpm_records', INTERVAL '3 months');

-- 4. 결과 확인
SELECT hypertable_name, num_chunks
FROM timescaledb_information.hypertables
WHERE hypertable_name = 'bpm_records';
