-- ============================================================
-- ダミー受験記録シードスクリプト（複数科目対応版）
-- Supabase SQL Editor で実行してください
-- ============================================================
-- 注意: 既存の quiz_records を全削除してから挿入します。
-- 本番環境では実行しないでください。
-- ============================================================

BEGIN;

-- 1. 既存の受験記録を削除
DELETE FROM quiz_records;

-- 2. 生徒の科目別進捗をリセット
UPDATE student_subject_progress SET
  consecutive_pass_days = 0,
  last_challenge_date = NULL,
  updated_at = NOW();

-- 3. ダミー受験記録を生成・挿入
DO $$
DECLARE
  v_subject RECORD;
  v_student RECORD;
  v_day DATE;
  v_taken_at TIMESTAMPTZ;
  v_num_questions INTEGER;
  v_pass_score INTEGER;
  v_score INTEGER;
  v_correct_count INTEGER;
  v_total_questions INTEGER;
  v_passed BOOLEAN;
  v_question_ids JSONB;
  v_correct_answers JSONB;
  v_student_answers JSONB;
  v_all_question_ids INTEGER[];
  v_selected_ids INTEGER[];
  v_selected_correct INTEGER[];
  v_answers INTEGER[];
  v_i INTEGER;
  v_rand DOUBLE PRECISION;
  v_consecutive INTEGER;
  v_last_date DATE;
  v_current_grade TEXT;
  v_next_grade TEXT;
  v_required_days INTEGER;
  v_skip BOOLEAN;
  v_first_grade TEXT;
  v_record_count INTEGER := 0;
BEGIN
  -- 各科目についてループ
  FOR v_subject IN SELECT id, name FROM subjects ORDER BY display_order
  LOOP
    -- この科目の最初のグレードを取得
    SELECT grade_name INTO v_first_grade
    FROM grade_definitions
    WHERE subject_id = v_subject.id
    ORDER BY display_order ASC
    LIMIT 1;

    -- グレード定義がない科目はスキップ
    IF v_first_grade IS NULL THEN
      RAISE NOTICE '科目「%」にグレード定義がないためスキップ', v_subject.name;
      CONTINUE;
    END IF;

    -- この科目の問題があるか確認
    IF NOT EXISTS (SELECT 1 FROM questions WHERE subject_id = v_subject.id) THEN
      RAISE NOTICE '科目「%」に問題がないためスキップ', v_subject.name;
      CONTINUE;
    END IF;

    -- 各生徒についてループ
    FOR v_student IN SELECT s.id FROM students s ORDER BY s.year, s.class, s.number
    LOOP
      -- この生徒・科目のグレードを最初のグレードにリセット
      v_current_grade := v_first_grade;
      v_consecutive := 0;
      v_last_date := NULL;

      -- 過去30日間の各日についてループ
      FOR v_day IN SELECT d::date FROM generate_series(
        CURRENT_DATE - INTERVAL '30 days',
        CURRENT_DATE - INTERVAL '1 day',
        INTERVAL '1 day'
      ) AS d
      LOOP
        -- 約70%の確率で受験する（日によってスキップ）
        v_rand := random();
        v_skip := v_rand > 0.70;

        IF v_skip THEN
          -- 受験しなかった日は連続日数リセット（1日以上空いた場合）
          IF v_last_date IS NOT NULL AND v_day - v_last_date > 1 THEN
            v_consecutive := 0;
          END IF;
          CONTINUE;
        END IF;

        -- 現在のグレード定義を取得（科目内）
        SELECT num_questions, pass_score, required_consecutive_days, grade_name
        INTO v_num_questions, v_pass_score, v_required_days, v_current_grade
        FROM grade_definitions
        WHERE grade_name = v_current_grade AND subject_id = v_subject.id;

        -- グレードが見つからない場合はスキップ
        IF v_num_questions IS NULL THEN
          CONTINUE;
        END IF;

        -- グレード範囲の問題IDを取得（同じ科目内）
        SELECT ARRAY_AGG(question_id ORDER BY random())
        INTO v_all_question_ids
        FROM questions
        WHERE subject_id = v_subject.id
        AND question_id >= (
          SELECT start_id FROM grade_definitions WHERE grade_name = v_current_grade AND subject_id = v_subject.id
        )
        AND question_id <= (
          SELECT end_id FROM grade_definitions WHERE grade_name = v_current_grade AND subject_id = v_subject.id
        );

        -- 問題が足りない場合はこの科目の全問題からランダムに取得
        IF v_all_question_ids IS NULL OR array_length(v_all_question_ids, 1) < v_num_questions THEN
          SELECT ARRAY_AGG(question_id ORDER BY random())
          INTO v_all_question_ids
          FROM questions
          WHERE subject_id = v_subject.id;
        END IF;

        -- 問題がまだない場合はスキップ
        IF v_all_question_ids IS NULL OR array_length(v_all_question_ids, 1) = 0 THEN
          CONTINUE;
        END IF;

        -- 出題する問題を選択（num_questions 個）
        v_selected_ids := v_all_question_ids[1:LEAST(v_num_questions, array_length(v_all_question_ids, 1))];

        -- 正解を取得（0-based に変換: DB上は1-based、アプリ保存時は0-based）
        SELECT ARRAY_AGG(q.correct_answer - 1 ORDER BY idx)
        INTO v_selected_correct
        FROM unnest(v_selected_ids) WITH ORDINALITY AS t(qid, idx)
        JOIN questions q ON q.question_id = t.qid AND q.subject_id = v_subject.id;

        -- 出題数
        v_total_questions := array_length(v_selected_ids, 1);

        -- 正解数を決定（約65%の合格率になるよう調整）
        v_rand := random();
        IF v_rand < 0.65 THEN
          -- 合格: 合格ラインの正解数 〜 全問正解
          DECLARE
            v_min_correct INTEGER;
          BEGIN
            v_min_correct := CEIL(v_pass_score * v_total_questions / 100.0)::INTEGER;
            v_correct_count := v_min_correct + floor(random() * (v_total_questions - v_min_correct + 1))::INTEGER;
          END;
        ELSE
          -- 不合格: 0 〜 合格ライン未満の正解数
          DECLARE
            v_min_correct INTEGER;
          BEGIN
            v_min_correct := CEIL(v_pass_score * v_total_questions / 100.0)::INTEGER;
            v_correct_count := floor(random() * v_min_correct)::INTEGER;
          END;
        END IF;

        -- 正解数の範囲チェック
        IF v_correct_count > v_total_questions THEN
          v_correct_count := v_total_questions;
        END IF;
        IF v_correct_count < 0 THEN
          v_correct_count := 0;
        END IF;

        -- スコアをパーセンテージで計算（アプリと同じロジック: Math.round(correctCount / totalQuestions * 100)）
        v_score := ROUND(v_correct_count::NUMERIC / v_total_questions * 100)::INTEGER;
        v_passed := v_score >= v_pass_score;

        -- 生徒の回答を生成（正解数に基づいて正解/不正解を配分）
        v_answers := '{}';
        FOR v_i IN 1..v_total_questions
        LOOP
          IF v_i <= v_correct_count THEN
            -- 正解
            v_answers := v_answers || v_selected_correct[v_i];
          ELSE
            -- 不正解（正解以外のランダムな選択肢、0-based: 0〜3）
            v_answers := v_answers || (
              CASE v_selected_correct[v_i]
                WHEN 0 THEN (ARRAY[1,2,3])[1 + floor(random()*3)::INTEGER]
                WHEN 1 THEN (ARRAY[0,2,3])[1 + floor(random()*3)::INTEGER]
                WHEN 2 THEN (ARRAY[0,1,3])[1 + floor(random()*3)::INTEGER]
                WHEN 3 THEN (ARRAY[0,1,2])[1 + floor(random()*3)::INTEGER]
                ELSE 1
              END
            );
          END IF;
        END LOOP;

        -- JSONB に変換
        v_question_ids := to_jsonb(v_selected_ids);
        v_correct_answers := to_jsonb(v_selected_correct);
        v_student_answers := to_jsonb(v_answers);

        -- 受験時刻をランダムに設定（その日の7:00〜21:00 JST）
        v_taken_at := (v_day || ' 07:00:00')::TIMESTAMP AT TIME ZONE 'Asia/Tokyo'
                      + (random() * INTERVAL '14 hours');

        -- quiz_records に挿入（subject_id を含む）
        INSERT INTO quiz_records (student_id, subject_id, grade, score, passed, question_ids, student_answers, correct_answers, taken_at)
        VALUES (v_student.id, v_subject.id, v_current_grade, v_score, v_passed, v_question_ids, v_student_answers, v_correct_answers, v_taken_at);

        v_record_count := v_record_count + 1;

        -- 連続日数と進級の処理
        IF v_passed THEN
          IF v_last_date IS NULL OR v_day - v_last_date = 1 THEN
            v_consecutive := v_consecutive + 1;
          ELSIF v_day - v_last_date > 1 THEN
            v_consecutive := 1;
          END IF;

          -- 進級判定（同じ科目内で次のグレードへ）
          IF v_consecutive >= v_required_days THEN
            SELECT grade_name INTO v_next_grade
            FROM grade_definitions
            WHERE subject_id = v_subject.id
            AND display_order > (
              SELECT display_order FROM grade_definitions
              WHERE grade_name = v_current_grade AND subject_id = v_subject.id
            )
            ORDER BY display_order ASC
            LIMIT 1;

            IF v_next_grade IS NOT NULL THEN
              v_current_grade := v_next_grade;
              v_consecutive := 0;
            END IF;
          END IF;
        ELSE
          v_consecutive := 0;
        END IF;

        v_last_date := v_day;

      END LOOP; -- 日ループ終了

      -- student_subject_progress を更新
      UPDATE student_subject_progress SET
        current_grade = v_current_grade,
        consecutive_pass_days = v_consecutive,
        last_challenge_date = v_last_date,
        updated_at = NOW()
      WHERE student_id = v_student.id AND subject_id = v_subject.id;

    END LOOP; -- 生徒ループ終了

    RAISE NOTICE '科目「%」のシード完了', v_subject.name;

  END LOOP; -- 科目ループ終了

  RAISE NOTICE 'シード完了: 合計 % 件の受験記録を生成しました', v_record_count;
END $$;

-- 4. 生成結果の確認
SELECT
  '受験記録数' AS label,
  COUNT(*)::TEXT AS value
FROM quiz_records
UNION ALL
SELECT
  '生徒数',
  COUNT(DISTINCT student_id)::TEXT
FROM quiz_records
UNION ALL
SELECT
  '科目数',
  COUNT(DISTINCT subject_id)::TEXT
FROM quiz_records
UNION ALL
SELECT
  '日数範囲',
  MIN(taken_at::date)::TEXT || ' 〜 ' || MAX(taken_at::date)::TEXT
FROM quiz_records
UNION ALL
SELECT
  '合格率',
  ROUND(AVG(CASE WHEN passed THEN 1 ELSE 0 END) * 100, 1)::TEXT || '%'
FROM quiz_records;

-- 5. 科目別の結果確認
SELECT
  s.name AS 科目,
  COUNT(qr.id) AS 受験記録数,
  COUNT(DISTINCT qr.student_id) AS 受験生徒数,
  ROUND(AVG(CASE WHEN qr.passed THEN 1 ELSE 0 END) * 100, 1) AS 合格率
FROM quiz_records qr
JOIN subjects s ON s.id = qr.subject_id
GROUP BY s.name, s.display_order
ORDER BY s.display_order;

-- 6. 生徒のグレード分布確認
SELECT
  s.name AS 科目,
  ssp.current_grade AS グレード,
  COUNT(*) AS 生徒数
FROM student_subject_progress ssp
JOIN subjects s ON s.id = ssp.subject_id
GROUP BY s.name, s.display_order, ssp.current_grade
ORDER BY s.display_order, ssp.current_grade;

COMMIT;
