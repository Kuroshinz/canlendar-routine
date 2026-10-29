export interface ExpenseEntry {
  id: string;
  title: string;
  amount: number;
  currency: 'VND' | 'USD';
  type: 'expense' | 'income';
  category: 'food' | 'transport' | 'study' | 'work' | 'health' | 'entertainment';
  date: string;
  eventId?: string;
}

export interface StudyItem {
  id: string;
  courseName: string;
  taskTitle: string;
  dueDate: string;
  status: 'todo' | 'in_progress' | 'submitted';
  targetHours: number;
  completedHours: number;
  priority: 'high' | 'medium' | 'low';
}

export interface DailyWellnessCheck {
  date: string; // YYYY-MM-DD
  stressLevel: number; // 1 to 5 (1: Thư thái, 3: Bình thường, 5: Áp lực cao)
  energyLevel: number; // 1 to 5
  sleepHours: number;
  note?: string;
}

export interface PomodoroState {
  timeLeftSeconds: number;
  isRunning: boolean;
  mode: 'work' | 'shortBreak' | 'longBreak';
  sessionsCompleted: number;
}
