generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ========== USER MANAGEMENT ==========
model User {
  id              String   @id @default(uuid())
  email           String   @unique
  password        String   // Hashed with bcrypt (12 rounds)
  name            String
  phone           String?
  status          String   @default("student") // student, working_professional, fresher
  avatar          String?
  role            String   @default("user") // user, admin
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  subscriptions     Subscription[]
  quizSessions      QuizSession[]
  progress          UserProgress[]
  questionHistory   UserQuestionHistory[]
  streaks           UserStreak?
}

model Admin {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  password  String
  role      String   @default("admin") // admin, super_admin
  isActive  Boolean  @default(true)
  lastLogin DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// ========== CONTENT MANAGEMENT ==========
model Domain {
  id          String   @id @default(uuid())
  name        String   @unique
  slug        String   @unique
  description String?
  icon        String?  // Emoji or icon name
  color       String?  // Hex color
  isActive    Boolean  @default(true)
  sortOrder   Int      @default(0)
  
  skills      Skill[]
}

model Skill {
  id          String   @id @default(uuid())
  name        String
  slug        String   @unique
  description String?
  icon        String?
  color       String?
  isActive    Boolean  @default(true)
  sortOrder   Int      @default(0)
  domainId    String
  domain      Domain     @relation(fields: [domainId], references: [id])
  
  questions   Question[]
  userProgress UserProgress[]
}

model Question {
  id             String   @id @default(uuid())
  question       String   // The question text
  type           String   @default("mcq") // mcq, multi-select, true-false
  difficulty     String   @default("medium") // easy, medium, hard
  options        String   // JSON array: ["Option A", "Option B", ...]
  correctAnswer  String   // The exact correct option text
  explanation    String   // Why this answer is correct
  tags           String?  // JSON array of topic tags
  isActive       Boolean  @default(true)
  
  // Source tracking for AI questions
  source         String   @default("static")  // static | ai_generated
  originalFormat String   @default("mcq")     // mcq | passage | qa
  rawContent     String?                      // Original Q&A before conversion
  verified       Boolean  @default(false)     // Admin verified
  topics         String?                      // JSON array
  
  skillId        String
  skill          Skill      @relation(fields: [skillId], references: [id])
  
  quizQuestions  QuizQuestion[]
  userHistory    UserQuestionHistory[]
}

// ========== SUBSCRIPTION MANAGEMENT ==========
model Package {
  id            String   @id @default(uuid())
  name          String   // "7 Day Access", "30 Day Access", etc.
  slug          String   @unique
  description   String?
  price         Float    // In INR
  originalPrice Float?   // For showing discounts
  durationDays  Int      // 7, 30, 90, 365
  features      String   // JSON array of feature strings
  isPopular     Boolean  @default(false)
  isActive      Boolean  @default(true)
  sortOrder     Int      @default(0)
  
  subscriptions Subscription[]
}

model Subscription {
  id            String    @id @default(uuid())
  status        String    @default("inactive") // active, inactive, expired, cancelled
  startDate     DateTime?
  endDate       DateTime?
  paymentId     String?   // Razorpay payment ID
  paymentMethod String?
  amount        Float?
  
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  packageId     String
  package       Package   @relation(fields: [packageId], references: [id])
}

// ========== QUIZ MANAGEMENT ==========
model QuizSession {
  id              String   @id @default(uuid())
  status          String   @default("in_progress") // in_progress, completed, abandoned
  totalQuestions  Int      // Number of questions in this session
  answeredCount   Int      @default(0)
  correctCount    Int      @default(0)
  score           Float?   // Percentage score
  timeSpentSecs   Int      @default(0)
  startedAt       DateTime @default(now())
  completedAt     DateTime?
  
  userId          String
  user          User           @relation(fields: [userId], references: [id])
  questions       QuizQuestion[]
}

model QuizQuestion {
  id              String   @id @default(uuid())
  orderIndex      Int      // Position in the quiz
  userAnswer      String?  // What the user selected
  isCorrect       Boolean?
  hintsUsed       Int      @default(0)
  pointsEarned    Float?
  timeSpentSecs   Int      @default(0)
  answeredAt      DateTime?
  
  sessionId       String
  session         QuizSession @relation(fields: [sessionId], references: [id])
  questionId      String
  question        Question    @relation(fields: [questionId], references: [id])
}

// ========== PROGRESS & ANALYTICS ==========
model UserProgress {
  id                String   @id @default(uuid())
  totalAttempted    Int      @default(0)
  totalCorrect      Int      @default(0)
  accuracy          Float    @default(0) // Percentage
  lastPracticed     DateTime?
  masteryLevel      String   @default("beginner") // beginner, intermediate, advanced, expert
  
  userId            String
  user              User     @relation(fields: [userId], references: [id])
  skillId           String
  skill             Skill    @relation(fields: [skillId], references: [id])
  
  @@unique([userId, skillId])
}

model UserStreak {
  id              String   @id @default(uuid())
  currentStreak   Int      @default(0)
  longestStreak   Int      @default(0)
  lastActivityAt  DateTime?
  weeklyActivity  String   @default("[]") // JSON array of last 7 days
  
  userId          String   @unique
  user          User     @relation(fields: [userId], references: [id])
}

model UserQuestionHistory {
  id          String   @id @default(uuid())
  answeredAt  DateTime @default(now())
  wasCorrect  Boolean
  timeSpent   Int?     // seconds
  
  userId      String
  questionId  String
  user        User     @relation(fields: [userId], references: [id])
  question    Question @relation(fields: [questionId], references: [id])
  
  @@unique([userId, questionId])
}

model Setting {
  id        String   @id @default(uuid())
  key       String   @unique
  value     String
  type      String   @default("string") // string, number, boolean, json
  category  String   @default("general")
}
