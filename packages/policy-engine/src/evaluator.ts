import type { Condition, Operator } from './types';

/**
 * 필드 경로로 중첩 객체에서 값을 가져오기
 * 예: getFieldValue({ input: { soh: 92 } }, "input.soh") → 92
 */
export function getFieldValue(data: Record<string, unknown>, fieldPath: string): unknown {
  const parts = fieldPath.split('.');
  let current: unknown = data;

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * 단일 조건을 평가
 * - 비교 연산: field의 값과 value를 비교
 * - 논리 연산: operands를 재귀 평가 후 AND/OR
 */
export function evaluateCondition(condition: Condition, data: Record<string, unknown>): boolean {
  const op = condition.operator;

  // 논리 연산자 — 재귀 평가
  if (op === 'AND') {
    if (!condition.operands || condition.operands.length === 0) return true;
    return condition.operands.every((sub) => evaluateCondition(sub, data));
  }

  if (op === 'OR') {
    if (!condition.operands || condition.operands.length === 0) return false;
    return condition.operands.some((sub) => evaluateCondition(sub, data));
  }

  // 비교 연산자 — field와 value 필요
  if (!condition.field) return false;

  const fieldValue = getFieldValue(data, condition.field);
  const targetValue = condition.value;

  if (fieldValue === undefined) return false;

  return compareValues(op as Exclude<Operator, 'AND' | 'OR'>, fieldValue, targetValue);
}

/**
 * 비교 연산 실행
 */
function compareValues(op: string, fieldValue: unknown, targetValue: unknown): boolean {
  switch (op) {
    case 'EQ':
      return fieldValue === targetValue;

    case 'NEQ':
      return fieldValue !== targetValue;

    case 'GT':
      return typeof fieldValue === 'number' && typeof targetValue === 'number'
        && fieldValue > targetValue;

    case 'GTE':
      return typeof fieldValue === 'number' && typeof targetValue === 'number'
        && fieldValue >= targetValue;

    case 'LT':
      return typeof fieldValue === 'number' && typeof targetValue === 'number'
        && fieldValue < targetValue;

    case 'LTE':
      return typeof fieldValue === 'number' && typeof targetValue === 'number'
        && fieldValue <= targetValue;

    case 'IN':
      return Array.isArray(targetValue) && targetValue.includes(fieldValue);

    case 'NOT_IN':
      return Array.isArray(targetValue) && !targetValue.includes(fieldValue);

    default:
      return false;
  }
}
