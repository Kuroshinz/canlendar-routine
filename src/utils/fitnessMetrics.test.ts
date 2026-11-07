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

console.log('All fitness metrics tests passed successfully!');

