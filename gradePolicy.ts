export type GradeBand = {
  min: number;
  max: number;
  grade: string;
  gpa: number;
};

export const gradeBands: GradeBand[] = [
  { min: 80, max: 100, grade: 'A+', gpa: 5.0 },
  { min: 75, max: 79.9999, grade: 'A', gpa: 4.75 },
  { min: 70, max: 74.9999, grade: 'A-', gpa: 4.5 },
  { min: 60, max: 69.9999, grade: 'B', gpa: 4.0 },
  { min: 50, max: 59.9999, grade: 'C', gpa: 3.5 },
  { min: 40, max: 49.9999, grade: 'D', gpa: 3.0 },
  { min: 0, max: 39.9999, grade: 'F', gpa: 0.0 },
];

const roundToTwo = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export const calculateGradeDetails = (marks: number) => {
  const normalized = Math.max(0, Math.min(100, marks));
  const band = gradeBands.find((item) => normalized >= item.min && normalized <= item.max) || gradeBands[gradeBands.length - 1];

  return {
    percentage: roundToTwo(normalized),
    grade: band.grade,
    gpa: band.gpa,
  };
};

export const calculateFinalGrade = (overallPercentage: number, hasFail: boolean) => {
  if (hasFail) {
    return { final_grade: 'F', final_status: 'Fail' };
  }

  const mapped = calculateGradeDetails(overallPercentage);
  return { final_grade: mapped.grade, final_status: 'Pass' };
};

export const average = (values: number[]) => {
  if (!values.length) return 0;
  return roundToTwo(values.reduce((sum, value) => sum + value, 0) / values.length);
};
