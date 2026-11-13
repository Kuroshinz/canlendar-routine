import {
  bmi,
  bmiLabel,
  bmr,
  calorieTarget,
  deltaSummary,
  etaWeeks,
  fatMassKg,
  ffmi,
  ffmiCategory,
  gymCalories,
  leanMassKg,
  macroTargets,
  parseFoodText,
  sportCalories,
  tdee,
  calculateNavyBodyFat,
  calculate1RM,
  calculateBarbellPlates,
  calculateDailyHealthScore,
  VIETNAMESE_FOOD_CATALOG,
  BALANCED_MEAL_COMBOS,
  generateCtgPeriodizedRoadmap,
  calculatePhaseNutrition,
} from './fitnessMetrics';
import { BodyPoint, CtgProfile, HealthDayLog, NutritionSettings, SetLog, SportSession } from '../types/productivity';

const mockProfile: CtgProfile = {
  name: 'Test User',
  sex: 'male',
  age: 24,
  heightCm: 172,
  goal: 'cut',
  activity: 'moderate',
  targetWeightKg: 65,
  targetBodyFatPct: 12,
  stepGoal: 8000,
};

const mockSettings: NutritionSettings = {
  overrides: {},
  tdeeOffset: 0,
};

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

console.log('Running fitness metrics tests...');

// 1. BMI & InBody formulas
const testBmi = bmi(68, 172);
assert(testBmi === 23, `Expected BMI 23, got ${testBmi}`);
assert(bmiLabel(testBmi) === 'Bình thường', 'BMI label should be Bình thường');

const fatKg = fatMassKg(70, 20);
assert(fatKg === 14, `Expected fat 14kg, got ${fatKg}`);
const leanKg = leanMassKg(70, 20);
assert(leanKg === 56, `Expected lean 56kg, got ${leanKg}`);

const testFfmi = ffmi(70, 20, 172);
assert(testFfmi > 18 && testFfmi < 20, `Expected realistic FFMI, got ${testFfmi}`);
const ffmiCat = ffmiCategory(testFfmi, 'male');
assert(ffmiCat.label.length > 0, 'FFMI category should have label');

// 2. BMR & TDEE (Mifflin–St Jeor)
// 10 * 68 + 6.25 * 172 - 5 * 24 + 5 = 680 + 1075 - 120 + 5 = 1640
const userBmr = bmr(mockProfile, 68);
assert(userBmr === 1640, `Expected BMR 1640, got ${userBmr}`);

const userTdee = tdee(mockProfile, 68);
assert(userTdee === Math.round(1640 * 1.55), `Expected TDEE around 2542, got ${userTdee}`);

const cutTarget = calorieTarget(userTdee, 'cut');
assert(cutTarget === Math.round(userTdee * 0.85), `Expected cut target 85%, got ${cutTarget}`);

// 3. Macro targets
const macros = macroTargets(2000, 70, 'cut', mockSettings);
assert(macros.protein === 140, `Cut protein should be 70*2 = 140g, got ${macros.protein}`);
assert(macros.fat > 0, 'Fat should be > 0');
assert(macros.carbs > 0, 'Carbs should be > 0');

// 4. Sport & Gym calories
const runSport: SportSession = {
  id: 's1',
  date: '2026-11-05',
  type: 'running',
  durationMin: 30,
  createdAt: Date.now(),
};
const runKcal = sportCalories(runSport, 70);
assert(runKcal > 200 && runKcal < 400, `Expected run kcal around 360, got ${runKcal}`);

const gymSets: SetLog[] = [
  { id: '1', exerciseId: 'bench-press', setIndex: 0, weightKg: 70, reps: 10 },
  { id: '2', exerciseId: 'bench-press', setIndex: 1, weightKg: 70, reps: 10 },
];
const gymKcal = gymCalories(gymSets, 70);
assert(gymKcal > 20, `Expected gym kcal > 20, got ${gymKcal}`);

// 5. Delta summary & ETA
const points: BodyPoint[] = [
  { id: '1', date: '2026-10-01', weightKg: 72, bodyFatPct: 22, createdAt: 1 },
  { id: '2', date: '2026-10-29', weightKg: 68, bodyFatPct: 18, createdAt: 2 },
];
const delta = deltaSummary(points, 172);
assert(delta !== null, 'Delta summary should not be null');
assert(delta!.weightKg === -4, `Expected -4kg, got ${delta!.weightKg}`);
assert(delta!.weightRate < 0, 'Weight rate should be negative');

const eta = etaWeeks(68, 65, delta!.weightRate);
assert(typeof eta === 'number' && eta > 0, `ETA should be a positive number of weeks, got ${eta}`);

// 6. Food text parser
const parsed = parseFoodText('200g ức gà + 250g cơm trắng + 1 chuối');
assert(parsed.length === 3, `Expected 3 parsed items, got ${parsed.length}`);
assert(parsed[0].item.name.includes('ức gà'), 'Item 0 should be ức gà');
assert(parsed[0].item.amount === 200, 'Item 0 amount should be 200');
assert(parsed[0].recognised === true, 'Item 0 should be recognised');
assert(parsed[0].item.protein > 50, '200g chicken breast should have > 50g protein');

// 7. US Navy Body Fat
const maleBf = calculateNavyBodyFat('male', 175, 82, 38);
assert(maleBf > 10 && maleBf < 20, `Expected realistic male Navy BF, got ${maleBf}`);
const femaleBf = calculateNavyBodyFat('female', 162, 70, 32, 95);
assert(femaleBf > 15 && femaleBf < 30, `Expected realistic female Navy BF, got ${femaleBf}`);

// 8. 1RM & Barbell Plates
const maxBench = calculate1RM(80, 6);
assert(maxBench.oneRepMax > 90 && maxBench.oneRepMax < 100, `Expected 1RM ~93-96kg, got ${maxBench.oneRepMax}`);
assert(maxBench.percentages.length === 9, 'Should have 9 percentage tiers');

const plateCalc = calculateBarbellPlates(90, 20); // 70kg / 2 = 35kg per side -> 20 + 15
assert(plateCalc.loadedPerSideKg === 35, `Expected 35kg per side, got ${plateCalc.loadedPerSideKg}`);
assert(plateCalc.platesPerSide.length === 2, `Expected 2 plates per side, got ${plateCalc.platesPerSide.length}`);
assert(plateCalc.platesPerSide[0].plateKg === 20, 'First plate should be 20kg');
assert(plateCalc.platesPerSide[1].plateKg === 15, 'Second plate should be 15kg');

// 9. Vietnamese Catalog & Combos
assert(VIETNAMESE_FOOD_CATALOG.length >= 20, 'Catalog should have at least 20 items');
assert(BALANCED_MEAL_COMBOS.length >= 3, 'Should have at least 3 balanced combos');

// 10. Daily Health Score
const testDayLog: HealthDayLog = {
  date: '2026-11-05',
  steps: 8500,
  waterMl: 2600,
  sleepHours: 7.5,
  protein: 150,
  caloriesBurned: 2200,
  source: 'manual',
};
const healthScore = calculateDailyHealthScore(testDayLog, 8000, 2500, 2000, 140);
assert(healthScore.score >= 90, `Expected score >= 90, got ${healthScore.score}`);
assert(healthScore.status === 'excellent', `Expected excellent status, got ${healthScore.status}`);

// 11. CTG 17-Phase Master Periodized Roadmap
import { SEED_CTG_PERIODIZED_ROADMAP } from '../data/productivitySeed';
import { parseVnDate, getPhaseStatus } from '../components/productivity/fitness/RoadmapTab';

assert(SEED_CTG_PERIODIZED_ROADMAP.phases.length === 17, 'Should have exactly 17 CTG phases');
const p1 = SEED_CTG_PERIODIZED_ROADMAP.phases[0];
assert(p1.name === 'Giảm mỡ' && p1.startWeightKg === 63.55 && p1.targetWeightKg === 61.35, 'Phase 1 checks');
assert(p1.macros.protein === 141 && p1.targetKcal === 1606, 'Phase 1 nutrition checks');

const p2 = SEED_CTG_PERIODIZED_ROADMAP.phases[1];
assert(p2.name === 'Tăng cơ' && p2.isCurrent === true, 'Phase 2 should be active/current');
assert(p2.startWeightKg === 61.35 && p2.targetWeightKg === 65.81, 'Phase 2 weight checks');
assert(p2.macros.protein === 110 && p2.macros.carbs === 310 && p2.macros.fat === 69 && p2.targetKcal === 2302, 'Phase 2 macro checks');

const pFinal = SEED_CTG_PERIODIZED_ROADMAP.phases[16];
assert(pFinal.name === 'Giảm mỡ hoàn thiện' && pFinal.targetWeightKg === 81.23 && pFinal.targetFfmi === 22.0, 'Final phase checks');

// Net LBM growth check: 68.2kg LBM - 52.4kg LBM = 15.8kg pure muscle gain!
const netLbmGrowth = Math.round((pFinal.targetLbmKg - p1.startLbmKg) * 10) / 10;
assert(netLbmGrowth === 15.8, `Expected +15.8kg LBM growth, got ${netLbmGrowth}`);

// Date parse helper check
const parsedD = parseVnDate('24/10/2026');
assert(parsedD.getDate() === 24 && parsedD.getMonth() === 9 && parsedD.getFullYear() === 2026, 'parseVnDate should parse DD/MM/YYYY');
const parsedD2 = parseVnDate('25/12/2026');
assert(parsedD2.getDate() === 25 && parsedD2.getMonth() === 11 && parsedD2.getFullYear() === 2026, 'parseVnDate should parse 25/12/2026');
assert(!isNaN(parsedD2.getTime()), 'parseVnDate timestamp must not be NaN');
const parsedEmpty = parseVnDate('');
assert(isNaN(parsedEmpty.getTime()), 'parseVnDate on empty should return invalid date');

const phaseStatus = getPhaseStatus(p2, 'ctg-p2');
assert(phaseStatus === 'current', 'Phase 2 should report current status');

// 12. Dynamic CTG Roadmap Generation for Any Height, Weight, Body Fat & Sex
const customRoadmapMale = generateCtgPeriodizedRoadmap({
  sex: 'male',
  heightCm: 180,
  currentWeightKg: 78,
  currentBodyFatPct: 20,
  targetFfmi: 22.0,
});
assert(customRoadmapMale.phases.length > 5, 'Should generate multiple waves for 180cm/78kg male');
assert(customRoadmapMale.heightCm === 180, 'Height should be stored');
assert(customRoadmapMale.phases[0].phaseType === 'cut', 'Initial phase should be cut since 20% > 16%');
assert(
  customRoadmapMale.phases[customRoadmapMale.phases.length - 1].phaseType === 'final_cut',
  'Last phase should be final_cut'
);
const lastPhaseMale = customRoadmapMale.phases[customRoadmapMale.phases.length - 1];
assert(lastPhaseMale.targetLbmKg > customRoadmapMale.phases[0].startLbmKg, 'Net LBM should increase significantly');

// Test female generation
const customRoadmapFemale = generateCtgPeriodizedRoadmap({
  sex: 'female',
  heightCm: 160,
  currentWeightKg: 54,
  currentBodyFatPct: 24,
  targetFfmi: 19.5,
});
assert(customRoadmapFemale.phases.length > 3, 'Should generate roadmap for female 160cm');
assert(customRoadmapFemale.phases[0].phaseType === 'cut', 'Initial cut for female at 24%');

// Test phase nutrition calculator
const bulkNut = calculatePhaseNutrition('male', 175, 70, 'bulk');
assert(bulkNut.targetKcal > 2000, 'Bulk kcal should be surplus');
assert(bulkNut.protein >= 120, 'Bulk protein should be high');
assert(bulkNut.fat > 50 && bulkNut.carbs > 150, 'Macros should be balanced');

const minicutNut = calculatePhaseNutrition('male', 175, 70, 'minicut');
assert(minicutNut.targetKcal < bulkNut.targetKcal, 'Minicut kcal should be significantly lower than bulk');
assert(minicutNut.protein > bulkNut.protein, 'Minicut protein should be higher to spare muscle');

console.log('All fitness metrics tests passed successfully!');

