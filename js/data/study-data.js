export const STUDY_STAGES = [
{ key: 'intermediate', label: 'الشهادة المتوسطة' },
{ key: 'secondary',    label: 'الشهادة السودانية' },
];
export const stageLabel = (key) =>
STUDY_STAGES.find(s => s.key === key)?.label || '';
