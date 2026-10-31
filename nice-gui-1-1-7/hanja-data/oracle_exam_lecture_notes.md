# Oracle DB 사내 접근 인증시험 기출 기반 강의자료

## 1. 시험 출제 방향

이번 메모에서 보이는 출제 방향은 단순 암기보다 Oracle SQL의 작은 문법 차이와 실행 특성을 묻는 형태다.

주요 범위:

- 객체명 규칙, 계정/스키마 접근
- NULL 처리와 비교 연산
- 집합 연산자와 정렬/중복 제거
- JOIN 조건, SELF JOIN, OUTER JOIN
- 인덱스 구성, 인덱스 사용/미사용 조건
- 힌트 문법과 실행계획
- 트랜잭션, COMMIT/ROLLBACK, 암시적 COMMIT
- PL/SQL 블록, 변수 대입, 예외 처리
- SQL*Plus 명령어
- 그룹 함수, HAVING, ROLLUP/CUBE/GROUPING SETS
- 날짜/문자/숫자 함수

---

## 2. 객체명과 계정 접근

### 테이블 이름 규칙

일반적인 Oracle 객체명은 문자로 시작하고, 문자/숫자/언더바를 사용할 수 있다.

올바른 예:

```sql
EMP
EMP100
EMP_100
```

주의할 예:

```sql
100EMP   -- 숫자로 시작
EMP-100  -- 하이픈 사용
EMP 100  -- 공백 사용
```

시험 포인트:

- 공백이 들어간 이름은 일반 객체명으로 부적절하다.
- 언더바 `_`는 허용된다.
- 따옴표로 감싼 식별자는 예외가 가능하지만, 사내 시험에서는 일반 규칙 기준으로 판단한다.

### 다른 계정 테이블 조회

다른 계정의 테이블을 조회할 때는 보통 스키마명을 붙인다.

```sql
SELECT *
FROM DEVTRC.EMP;
```

접근 권한이 있어야 한다.

```sql
GRANT SELECT ON EMP TO IATRC;
```

기출 메모의 `devtrc`, `iatrc`는 특정 계정으로만 접속 가능하다는 보안/권한 문제로 볼 수 있다.

---

## 3. 데이터 딕셔너리와 객체 정보 조회

### 인덱스 목록 확인

내 계정의 인덱스 목록:

```sql
SELECT index_name, table_name, uniqueness
FROM user_indexes
WHERE table_name = 'EMP';
```

### 인덱스 컬럼 구성 확인

EMP 테이블의 인덱스 컬럼 구성을 알고 싶을 때:

```sql
SELECT index_name, column_name, column_position
FROM user_ind_columns
WHERE table_name = 'EMP'
ORDER BY index_name, column_position;
```

시험 포인트:

- `USER_INDEXES`: 인덱스 자체 정보
- `USER_IND_COLUMNS`: 인덱스를 구성하는 컬럼 정보
- Oracle 딕셔너리에서 객체명은 보통 대문자로 저장된다.

---

## 4. NULL 처리

### NULL 비교

NULL은 `=` 또는 `<>`로 비교하지 않는다.

틀린 예:

```sql
WHERE COMM = NULL
WHERE COMM <> NULL
WHERE COMM = ''
```

올바른 예:

```sql
WHERE COMM IS NULL
WHERE COMM IS NOT NULL
```

Oracle에서는 빈 문자열 `''`을 NULL처럼 취급하는 특성이 있지만, NULL 검색 조건은 `IS NULL`로 판단한다.

### NULL 연산 결과

```sql
NULL + 4
```

결과는 `NULL`이다.

NULL이 포함된 산술 연산은 대부분 NULL로 전파된다.

### NOT IN과 NULL

```sql
WHERE deptno NOT IN (10, 20, 40, NULL)
```

결과는 보통 0건이 될 수 있다.

이유:

- `NOT IN`은 내부적으로 모든 값과 다르다는 조건이다.
- 비교 대상에 NULL이 있으면 결과가 UNKNOWN이 된다.
- WHERE는 TRUE만 통과시키므로 UNKNOWN은 제외된다.

안전한 방식:

```sql
WHERE deptno NOT IN (10, 20, 40)
```

또는 NULL 가능성이 있는 서브쿼리는 `NOT EXISTS`를 검토한다.

---

## 5. 집합 연산자

### UNION과 UNION ALL

```sql
SELECT col FROM A
UNION
SELECT col FROM B;
```

`UNION`은 중복 제거가 필요하다. 이 과정에서 정렬 또는 해시 처리가 발생할 수 있다.

```sql
SELECT col FROM A
UNION ALL
SELECT col FROM B;
```

`UNION ALL`은 중복 제거를 하지 않고 결과를 그대로 이어 붙인다.

시험 포인트:

- 정렬/중복 제거가 일어나지 않는 집합 연산자: `UNION ALL`
- `MINUS`, `INTERSECT`, `UNION`은 중복 판단 과정이 필요하다.

### MINUS

```sql
SELECT empno FROM emp
MINUS
SELECT empno FROM retired_emp;
```

첫 번째 쿼리 결과에서 두 번째 쿼리 결과를 제외한다.

효율성 문제에서는 `MINUS` 대신 `NOT EXISTS`가 더 적절한지 비교하는 문제가 나올 수 있다.

---

## 6. JOIN 핵심

### 4개 테이블 JOIN 조건 수

N개의 테이블을 카테시안 곱 없이 연결하려면 최소 `N - 1`개의 조인 조건이 필요하다.

4개 테이블이면 최소 3개:

```sql
FROM A, B, C, D
WHERE A.id = B.a_id
  AND B.id = C.b_id
  AND C.id = D.c_id
```

### SELF JOIN

같은 테이블을 서로 다른 별칭으로 조인한다.

```sql
SELECT e.empno, e.ename, m.ename AS manager_name
FROM emp e
JOIN emp m
  ON e.mgr = m.empno;
```

### NULL이 들어가는 JOIN

OUTER JOIN에서 매칭되지 않은 쪽 컬럼이 NULL로 보완된다.

```sql
SELECT e.empno, d.dname
FROM emp e
LEFT OUTER JOIN dept d
  ON e.deptno = d.deptno;
```

EMP 기준으로 부서가 없으면 `d.dname`은 NULL이 될 수 있다.

### JOIN이 아닌 것 구분

보기 예:

- EQUI JOIN
- NATURAL JOIN
- NESTED LOOP JOIN
- SORT MERGE JOIN

주의:

- `EQUI JOIN`, `NATURAL JOIN`은 SQL 조인 문법/형태에 가깝다.
- `NESTED LOOP JOIN`, `SORT MERGE JOIN`은 실행계획의 조인 방식이다.

문제 표현이 “SQL 조인 문법”을 묻는지 “실행계획 조인 방식”을 묻는지 확인해야 한다.

---

## 7. IN, EXISTS, ANY

### IN

```sql
SELECT *
FROM emp
WHERE deptno IN (10, 20);
```

목록 또는 서브쿼리 결과 중 하나와 일치하면 TRUE다.

### EXISTS

```sql
SELECT *
FROM dept d
WHERE EXISTS (
  SELECT 1
  FROM emp e
  WHERE e.deptno = d.deptno
);
```

서브쿼리 결과가 존재하는지만 판단한다.

### ANY

```sql
WHERE sal > ANY (SELECT sal FROM emp WHERE deptno = 10)
```

서브쿼리 결과 중 하나라도 조건을 만족하면 TRUE다.

`= ANY`는 사실상 `IN`과 유사하게 볼 수 있다.

```sql
WHERE deptno = ANY (10, 20)
```

의미상:

```sql
WHERE deptno IN (10, 20)
```

---

## 8. WHERE, HAVING, 그룹 함수

### WHERE와 HAVING

WHERE는 그룹화 전 행을 제한한다.

```sql
SELECT deptno, AVG(sal)
FROM emp
WHERE job = 'CLERK'
GROUP BY deptno;
```

HAVING은 그룹화 후 집계 결과를 제한한다.

```sql
SELECT deptno, AVG(sal)
FROM emp
GROUP BY deptno
HAVING AVG(sal) >= 3000;
```

### COUNT와 NULL

```sql
COUNT(*)
```

WHERE 조건 등이 적용된 조회 결과의 행 수를 센다.

```sql
COUNT(comm)
```

COMM 값이 NULL이 아닌 행만 센다.

### 그룹 함수와 NULL

대부분의 그룹 함수는 NULL을 무시한다.

```sql
SUM(comm)
AVG(comm)
MIN(comm)
MAX(comm)
COUNT(comm)
```

주의:

```sql
COUNT(*)
```

는 특정 컬럼의 NULL 여부를 보지 않고 결과 행 수를 센다. “NULL 값을 무시하지 않는 함수”로 출제될 수 있다.

---

## 9. ROLLUP, CUBE, GROUPING SETS

### 소계, 중계, 합계

소계/합계를 자동으로 구하는 대표 문법:

```sql
GROUP BY ROLLUP(deptno, job)
```

### ROLLUP

계층적 집계에 적합하다.

```sql
SELECT deptno, job, SUM(sal)
FROM emp
GROUP BY ROLLUP(deptno, job);
```

결과에는 다음이 포함된다.

- deptno + job별 합계
- deptno별 소계
- 전체 합계

### CUBE

가능한 모든 조합의 집계를 만든다.

```sql
GROUP BY CUBE(deptno, job)
```

### GROUPING SETS

필요한 집계 조합만 직접 지정한다.

```sql
GROUP BY GROUPING SETS ((deptno), (job), ())
```

---

## 10. 연산자 우선순위

시험에서 자주 보는 순서:

1. 괄호
2. 산술 연산
3. 비교 연산
4. `NOT`
5. `AND`
6. `OR`

가장 늦게 평가되는 연산자로 `OR`가 출제될 수 있다.

예:

```sql
WHERE deptno = 10 OR deptno = 20 AND job = 'CLERK'
```

`AND`가 `OR`보다 먼저 평가된다.

명확하게 쓰려면:

```sql
WHERE (deptno = 10 OR deptno = 20)
  AND job = 'CLERK'
```

---

## 11. 범위 조건과 LIKE

### 100 이상 200 이하

```sql
WHERE order_amt BETWEEN 100 AND 200
```

또는:

```sql
WHERE order_amt >= 100
  AND order_amt <= 200
```

### 두 번째 글자가 A인 데이터

```sql
WHERE name LIKE '_A%'
```

`_`는 한 글자, `%`는 0개 이상 문자를 의미한다.

### ESCAPE

문자 자체의 `%` 또는 `_`를 검색하려면 ESCAPE를 사용한다.

```sql
WHERE code LIKE 'A\_%' ESCAPE '\'
```

의미: `A_`로 시작하는 문자열.

---

## 12. 날짜 함수

### 현재일 + 15일

```sql
SELECT TO_CHAR(SYSDATE + 15, 'YYYYMMDD')
FROM dual;
```

날짜에 숫자를 더하면 일 단위로 더해진다.

### 월 차이

두 날짜 사이 달 수:

```sql
SELECT MONTHS_BETWEEN(date1, date2)
FROM dual;
```

### 요일 표시

요일 표시에는 보통 `DAY`, `DY`, `D` 등을 사용한다.

```sql
SELECT TO_CHAR(SYSDATE, 'DAY')
FROM dual;
```

주의:

`WW`는 연 기준 주차를 뜻한다. 요일이 아니다.

---

## 13. 문자/숫자 함수

### CONCAT과 ||

```sql
SELECT CONCAT('A', 'B') FROM dual;
```

결과:

```text
AB
```

```sql
SELECT 'A' || 'B' || 'C' FROM dual;
```

결과:

```text
ABC
```

`CONCAT`은 보통 두 인자만 받는다. 여러 문자열 연결은 `||`가 편하다.

### ROUND, TRUNC, MOD

```sql
ROUND(123.456, 2)  -- 123.46
TRUNC(123.456, 2)  -- 123.45
MOD(10, 3)         -- 1
```

### LPAD, RPAD

```sql
LPAD('7', 3, '0')  -- 007
RPAD('A', 3, '*')  -- A**
```

### INSTR

```sql
INSTR('ORACLE', 'A')  -- 3
```

### TRANSLATE

문자 단위 치환.

```sql
TRANSLATE('ABCD', 'AB', '12')  -- 12CD
```

### INITCAP

단어 첫 글자를 대문자로 바꾼다.

```sql
INITCAP('oracle database')  -- Oracle Database
```

---

## 14. 데이터 타입과 컬럼 변경

### VARCHAR2 길이 증가

```sql
ALTER TABLE emp
MODIFY (ename VARCHAR2(14));
```

기존보다 큰 길이로 늘리는 것은 일반적으로 가능하다.

### 대용량 데이터 저장 타입

대용량 문자/바이너리 데이터는 LOB 계열을 사용한다.

```sql
CLOB
BLOB
```

### 기본 정렬 방향

SQL*Plus 같은 도구에서 숫자 타입은 기본적으로 오른쪽 정렬되는 경우가 많다. 문자 타입은 보통 왼쪽 정렬된다.

---

## 15. 제약 조건

대표 제약 조건:

- PRIMARY KEY
- FOREIGN KEY
- UNIQUE
- NOT NULL
- CHECK

제약 조건이 아닌 보기로는 `INDEX`, `VIEW`, `SYNONYM` 등이 나올 수 있다.

### PK, 인덱스, 컬럼 수정

PK 추가:

```sql
ALTER TABLE emp
ADD CONSTRAINT emp_pk PRIMARY KEY (empno);
```

인덱스 생성:

```sql
CREATE INDEX emp_idx01 ON emp(deptno, empno);
```

컬럼 수정:

```sql
ALTER TABLE emp
MODIFY (ename VARCHAR2(30));
```

---

## 16. VIEW

### VIEW 생성

```sql
CREATE VIEW emp_v AS
SELECT empno, ename, deptno
FROM emp;
```

### VIEW 갱신 조건

단순 VIEW는 갱신 가능할 수 있다.

갱신이 제한될 수 있는 경우:

- GROUP BY
- DISTINCT
- 집계 함수
- 조인 VIEW
- 계산식 컬럼

시험 포인트:

VIEW가 항상 갱신 가능한 것은 아니다.

---

## 17. ALTER TABLE에서 가능한 것과 어려운 것

가능한 예:

```sql
ALTER TABLE emp ADD (email VARCHAR2(100));
ALTER TABLE emp MODIFY (ename VARCHAR2(30));
ALTER TABLE emp DROP COLUMN email;
```

주의할 예:

- 이미 데이터가 있는 컬럼을 더 짧게 줄이는 것
- NULL 값이 있는 컬럼에 바로 NOT NULL 추가
- 데이터 타입 변경 시 기존 데이터와 호환되지 않는 경우

---

## 18. 트랜잭션

### COMMIT과 ROLLBACK

DML:

```sql
INSERT
UPDATE
DELETE
MERGE
```

는 COMMIT 전까지 ROLLBACK 가능하다.

```sql
COMMIT;
ROLLBACK;
SAVEPOINT sp1;
ROLLBACK TO sp1;
```

### 암시적 COMMIT

DDL은 일반적으로 암시적 COMMIT을 발생시킨다.

```sql
CREATE TABLE
ALTER TABLE
DROP TABLE
TRUNCATE TABLE
```

시험 포인트:

- `DELETE`는 DML이라 ROLLBACK 가능
- `TRUNCATE`는 DDL 성격이라 일반적으로 ROLLBACK 복구 대상으로 보지 않음
- SELECT는 COMMIT/ROLLBACK 대상이 아님

---

## 19. PL/SQL

### 기본 블록

```sql
DECLARE
  v_sal NUMBER;
BEGIN
  SELECT sal
  INTO v_sal
  FROM emp
  WHERE empno = 7369;
END;
/
```

PL/SQL 블록 구성:

- DECLARE: 선언부, 선택
- BEGIN: 실행부, 필수
- EXCEPTION: 예외 처리부, 선택
- END: 종료, 필수

### 변수 대입

PL/SQL 변수 대입은 `:=`를 사용한다.

```sql
v_count := 500;
```

SQL 비교의 `=`와 구분해야 한다.

### WHEN OTHERS

예외 처리에서 `WHEN OTHERS`는 마지막에 한 번만 사용하는 것이 일반적이다.

```sql
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    ...
  WHEN OTHERS THEN
    ...
END;
```

---

## 20. SQL*Plus 명령어

### 자주 나오는 명령

```sql
@script.sql       -- 스크립트 실행
LIST 또는 L       -- SQL 버퍼 내용 표시
SPOOL file.txt    -- 실행 결과를 파일에 저장 시작/종료
/                 -- 버퍼의 SQL 또는 PL/SQL 실행
```

주의:

- `SPOOL`은 결과 저장
- `/`는 직전 버퍼 실행
- `@`는 파일 실행

---

## 21. 인덱스 기본

### 효율적인 인덱스 후보

효율적일 가능성이 높은 컬럼:

- WHERE 조건에 자주 사용
- 선택도가 높음
- 조인 조건에 자주 사용
- 정렬/범위 검색에 자주 사용

비효율적일 가능성이 높은 컬럼:

- 값 종류가 매우 적음
- 대부분 같은 값
- 거의 NULL
- 자주 변경됨

### 복합 인덱스 컬럼 순서

```sql
CREATE INDEX idx_emp ON emp(deptno, empno);
```

복합 인덱스는 선두 컬럼부터 조건에 사용될 때 유리하다.

```sql
WHERE deptno = 10
WHERE deptno = 10 AND empno = 7369
```

유리.

```sql
WHERE empno = 7369
```

선두 컬럼 `deptno`가 없으므로 기본 원칙상 불리할 수 있다.

---

## 22. 인덱스를 잘 못 타는 조건

### 컬럼에 함수 적용

```sql
WHERE UPPER(ename) = 'KIM'
```

일반 인덱스 `ename`을 그대로 활용하기 어렵다.

### 앞쪽 와일드카드

```sql
WHERE ename LIKE '%KIM'
```

시작 지점을 특정할 수 없어 B-Tree 범위 탐색에 불리하다.

### 부정 조건

```sql
WHERE empno NOT BETWEEN 133 AND 333
```

부정 조건은 인덱스 효율이 떨어질 수 있다.

### 암시적 형변환

문자형 컬럼인데 숫자와 비교:

```sql
WHERE empno = 100
```

컬럼이 VARCHAR2라면:

```sql
WHERE empno = '100'
```

처럼 타입을 맞추는 것이 안전하다.

---

## 23. LIKE와 인덱스 예외적 판단

```sql
WHERE lot_id LIKE SUBSTR('GEA100.1', 1, 3) || '%'
```

`SUBSTR('GEA100.1', 1, 3)`은 상수 표현식으로 `GEA`가 된다.

실질적으로:

```sql
WHERE lot_id LIKE 'GEA%'
```

와 같으므로 인덱스 범위 탐색이 가능할 수 있다.

반대로:

```sql
WHERE SUBSTR(lot_id, 1, 3) = 'GEA'
```

처럼 컬럼에 함수를 적용하면 일반 인덱스 활용이 불리하다.

---

## 24. 힌트

### 기본 문법

```sql
SELECT /*+ INDEX(e emp_idx01) */ *
FROM emp e
WHERE e.empno = 7369;
```

힌트는 `/*+ ... */` 형태다.

주의:

```sql
/* + INDEX(...) */
```

처럼 `/*`와 `+` 사이에 공백이 있으면 정상 힌트로 인식되지 않을 수 있다.

### --+ 힌트

```sql
SELECT --+ INDEX(e emp_idx01)
       *
FROM emp e;
```

한 줄 힌트 형식으로 사용 가능하다. 단, 위치와 문법이 중요하다.

### ORDERED

FROM절에 작성한 테이블 순서대로 조인을 유도한다.

```sql
SELECT /*+ ORDERED */ *
FROM a, b, c
WHERE a.id = b.a_id
  AND b.id = c.b_id;
```

### LEADING

조인 순서를 직접 지정한다.

```sql
SELECT /*+ LEADING(a b c) */ *
FROM a, b, c
WHERE a.id = b.a_id
  AND b.id = c.b_id;
```

### USE_HASH

해시 조인을 유도한다.

```sql
SELECT /*+ USE_HASH(e d) */ *
FROM emp e
JOIN dept d
  ON e.deptno = d.deptno;
```

### INDEX_FFS

Index Fast Full Scan을 유도한다.

```sql
SELECT /*+ INDEX_FFS(e emp_idx01) */ empno
FROM emp e;
```

---

## 25. 실행계획과 접근 방식

### TABLE ACCESS FULL

테이블 전체를 읽는다.

항상 나쁜 것은 아니다.

효율적일 수 있는 경우:

- 테이블이 작음
- 조회 비율이 높음
- 인덱스를 타도 대부분의 블록을 읽어야 함

### INDEX RANGE SCAN

범위 조건에 사용될 수 있다.

```sql
WHERE empno BETWEEN 100 AND 200
```

### INDEX UNIQUE SCAN

고유 인덱스 전체 키가 등가 조건으로 주어질 때 기대할 수 있다.

```sql
WHERE empno = 7369
```

### INDEX FAST FULL SCAN

인덱스 전체를 빠르게 읽는다. 테이블 대신 인덱스만 읽어도 되는 경우 등장할 수 있다.

---

## 26. 대용량 INSERT

### APPEND 힌트

대량 INSERT 시 direct-path insert를 유도할 수 있다.

```sql
INSERT /*+ APPEND */ INTO target_table
SELECT *
FROM source_table;
```

특징:

- 일반 INSERT보다 빠를 수 있음
- direct path 방식
- undo/redo 사용량과 로깅 정책은 환경 설정에 따라 달라짐

시험에서는 “대량 데이터를 빠르게 입력”하는 키워드로 `APPEND`가 나올 수 있다.

---

## 27. 실행 결과 중 1건 선택

Oracle 12c 이상:

```sql
SELECT *
FROM emp
ORDER BY sal DESC
FETCH FIRST 1 ROW ONLY;
```

구버전 방식:

```sql
SELECT *
FROM (
  SELECT *
  FROM emp
  ORDER BY sal DESC
)
WHERE ROWNUM = 1;
```

주의:

```sql
WHERE ROWNUM = 1
ORDER BY sal DESC
```

는 정렬 전에 ROWNUM이 먼저 적용될 수 있어 원하는 “최고 급여 1명”이 아닐 수 있다.

---

## 28. 서브쿼리와 ORDER BY

일반적으로 서브쿼리 안의 `ORDER BY`는 최종 결과 순서를 보장하기 위한 용도로 사용할 수 없다.

특히 IN/EXISTS 같은 조건 서브쿼리에서 ORDER BY는 의미가 없거나 허용되지 않을 수 있다.

예외적으로 Top-N 처리를 위해 inline view에서 ORDER BY를 쓰고 바깥에서 ROWNUM을 제한하는 패턴은 자주 사용된다.

```sql
SELECT *
FROM (
  SELECT *
  FROM emp
  ORDER BY sal DESC
)
WHERE ROWNUM <= 5;
```

---

## 29. 데이터 모델링 매핑

기본 매핑:

- Entity -> Table
- Attribute -> Column
- Relationship -> Foreign Key
- Identifier -> Primary Key

틀린 매핑을 고르는 문제가 나올 수 있다.

---

## 30. 빠른 암기표

| 주제 | 핵심 |
|---|---|
| 테이블명 | 문자 시작, 언더바 가능, 공백/하이픈 주의 |
| NULL 검색 | `IS NULL`, `IS NOT NULL` |
| NULL 연산 | `NULL + 4`는 NULL |
| NOT IN NULL | 결과 0건 가능 |
| UNION ALL | 중복 제거 없음 |
| 4개 테이블 조인 | 최소 조건 3개 |
| HAVING | GROUP BY 이후 집계 조건 |
| COUNT(*) | 조회 결과 행 수 |
| COUNT(col) | col이 NULL 아닌 행 수 |
| DDL | 암시적 COMMIT 가능 |
| TRUNCATE | DDL 성격, ROLLBACK 주의 |
| PL/SQL 대입 | `:=` |
| WHEN OTHERS | 마지막에 한 번 |
| 인덱스 컬럼 확인 | `USER_IND_COLUMNS` |
| 인덱스 함수 조건 | 일반 인덱스 활용 불리 |
| 앞 `%LIKE` | 인덱스 범위 탐색 불리 |
| ORDERED | FROM 순서 조인 유도 |
| LEADING | 조인 순서 지정 |
| USE_HASH | 해시 조인 유도 |
| APPEND | 대량 INSERT direct path 유도 |
| SPOOL | 결과 파일 저장 |
| `/` | 버퍼 실행 |

---

## 31. 기출형 예상 문제 포인트

1. 테이블 이름으로 올바른 것 고르기: `EMP_100`
2. 정렬/중복 제거가 없는 집합 연산자: `UNION ALL`
3. EMP 인덱스 컬럼 구성 조회: `USER_IND_COLUMNS`
4. 4개 테이블 조인 최소 조건 수: 3개
5. NULL 비교에서 틀린 것: `컬럼 = NULL`, `컬럼 = ''`
6. `NULL + 4` 결과: NULL
7. `NOT IN (..., NULL)` 결과: 0건 가능
8. 두 번째 글자가 A: `LIKE '_A%'`
9. 현재일 + 15일 문자 출력: `TO_CHAR(SYSDATE + 15, ...)`
10. 테이블 순서대로 읽는 힌트: `ORDERED`
11. 조인 순서 지정 힌트: `LEADING`
12. 해시 조인 힌트: `USE_HASH`
13. 대용량 INSERT 힌트: `APPEND`
14. PL/SQL 변수 대입: `:=`
15. SQL*Plus 결과 저장: `SPOOL`

