export const TANJALAB_LEVEL_SIZE = 5;
export const TANJALAB_VILLAGE_QUESTIONS = [];
export function buildTanjalabLevels() {
const qs = [...TANJALAB_VILLAGE_QUESTIONS];
const levels = [];
for (let i = 0; i + TANJALAB_LEVEL_SIZE <= qs.length; i += TANJALAB_LEVEL_SIZE) {
levels.push(qs.slice(i, i + TANJALAB_LEVEL_SIZE));
}
return levels;
}
export function getAllTanjalabQuestions() {
return [...TANJALAB_VILLAGE_QUESTIONS];
}
