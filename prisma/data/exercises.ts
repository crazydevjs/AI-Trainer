/* eslint-disable @typescript-eslint/no-explicit-any */
// Complete exercise library. Strings map to Prisma enums (validated on insert).

type Cat =
  | "CHEST" | "BACK" | "SHOULDERS" | "BICEPS" | "TRICEPS" | "QUADS"
  | "HAMSTRINGS" | "GLUTES" | "CALVES" | "CORE" | "CARDIO" | "FUNCTIONAL"
  | "OLYMPIC" | "FULL_BODY";
type Diff = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
type Disc =
  | "GYM" | "HOME" | "POWERLIFTING" | "BODYBUILDING" | "CALISTHENICS"
  | "CARDIO" | "FUNCTIONAL" | "CROSSFIT";

interface Raw {
  slug: string;
  name: string;
  category: Cat;
  difficulty: Diff;
  disciplines: Disc[];
  muscles: string[];
  secondaryMuscles?: string[];
  equipment: string[];
  instructions: string[];
  commonMistakes: string[];
  formTips?: string[];
  beginnerMod?: string;
  advancedVariations?: string[];
  metValue: number;
  poseKey?: string;
  /** true => all four AI features; object => granular */
  ai?: boolean | { posture?: boolean; rep?: boolean; rom?: boolean; feedback?: boolean };
}

export interface ExerciseSeed extends Omit<Raw, "ai"> {
  secondaryMuscles: string[];
  formTips: string[];
  advancedVariations: string[];
  aiPosture: boolean;
  aiRepCount: boolean;
  aiRom: boolean;
  aiFeedback: boolean;
}

function build(raw: Raw): ExerciseSeed {
  // Strip the `ai` shorthand — it's expanded into discrete flags below and is
  // not a real column.
  const { ai: aiRaw, ...r } = raw;
  const ai =
    aiRaw === true
      ? { posture: true, rep: true, rom: true, feedback: true }
      : aiRaw || {};
  return {
    ...r,
    secondaryMuscles: r.secondaryMuscles ?? [],
    formTips: r.formTips ?? [],
    advancedVariations: r.advancedVariations ?? [],
    beginnerMod: r.beginnerMod,
    poseKey: r.poseKey,
    aiPosture: !!ai.posture,
    aiRepCount: !!ai.rep,
    aiRom: !!ai.rom,
    aiFeedback: !!ai.feedback,
  };
}

const RAW: Raw[] = [
  // ===================== CHEST =====================
  {
    slug: "bench-press", name: "Bench Press", category: "CHEST", difficulty: "INTERMEDIATE",
    disciplines: ["GYM", "POWERLIFTING", "BODYBUILDING"], muscles: ["Chest"],
    secondaryMuscles: ["Triceps", "Front Delts"], equipment: ["Barbell", "Bench"],
    instructions: ["Lie flat, eyes under the bar, feet planted.", "Grip slightly wider than shoulders.", "Lower to mid-chest with control.", "Press up to lockout."],
    commonMistakes: ["Flaring elbows 90°", "Bouncing off chest", "Lifting hips off bench"],
    formTips: ["Retract and depress the shoulder blades", "Keep wrists stacked over elbows"],
    beginnerMod: "Use a lighter barbell or the Smith machine for guided path.",
    advancedVariations: ["Paused bench", "Close-grip bench"], metValue: 6, poseKey: "bench-press", ai: true,
  },
  {
    slug: "incline-bench-press", name: "Incline Bench Press", category: "CHEST", difficulty: "INTERMEDIATE",
    disciplines: ["GYM", "BODYBUILDING"], muscles: ["Upper Chest"], secondaryMuscles: ["Front Delts", "Triceps"],
    equipment: ["Barbell", "Bench"],
    instructions: ["Set bench to 30-45°.", "Grip just wider than shoulders.", "Lower to upper chest.", "Press to lockout."],
    commonMistakes: ["Bench angle too steep", "Bar drifting to neck"], formTips: ["Keep elbows ~45°"],
    beginnerMod: "Use dumbbells for a natural path.", advancedVariations: ["Paused incline"], metValue: 6, poseKey: "bench-press", ai: { posture: true, rep: true, rom: true, feedback: true },
  },
  {
    slug: "decline-bench-press", name: "Decline Bench Press", category: "CHEST", difficulty: "INTERMEDIATE",
    disciplines: ["GYM", "BODYBUILDING"], muscles: ["Lower Chest"], secondaryMuscles: ["Triceps"],
    equipment: ["Barbell", "Bench"],
    instructions: ["Set bench to slight decline, secure legs.", "Lower bar to lower chest.", "Press up to lockout."],
    commonMistakes: ["Excess range straining shoulders", "Losing tightness"], metValue: 6, poseKey: "bench-press", ai: { rep: true, rom: true },
  },
  {
    slug: "dumbbell-bench-press", name: "Dumbbell Bench Press", category: "CHEST", difficulty: "BEGINNER",
    disciplines: ["GYM", "BODYBUILDING", "HOME"], muscles: ["Chest"], secondaryMuscles: ["Triceps", "Front Delts"],
    equipment: ["Dumbbells", "Bench"],
    instructions: ["Lie back with dumbbells at chest.", "Press up until arms extend.", "Lower with control to a deep stretch."],
    commonMistakes: ["Clashing dumbbells at top", "Dropping into the stretch"], formTips: ["Keep a slight elbow tuck"],
    beginnerMod: "Start light to master balance.", advancedVariations: ["Incline DB press", "Single-arm DB press"], metValue: 6, poseKey: "bench-press", ai: { rep: true, rom: true, feedback: true },
  },
  {
    slug: "incline-dumbbell-press", name: "Incline Dumbbell Press", category: "CHEST", difficulty: "INTERMEDIATE",
    disciplines: ["GYM", "BODYBUILDING"], muscles: ["Upper Chest"], secondaryMuscles: ["Front Delts", "Triceps"],
    equipment: ["Dumbbells", "Bench"],
    instructions: ["Set bench 30-45°.", "Press dumbbells up and slightly together.", "Lower to upper-chest stretch."],
    commonMistakes: ["Bench too steep (delt takeover)", "Half reps"], metValue: 6, poseKey: "bench-press", ai: { rep: true, rom: true },
  },
  {
    slug: "decline-dumbbell-press", name: "Decline Dumbbell Press", category: "CHEST", difficulty: "INTERMEDIATE",
    disciplines: ["GYM", "BODYBUILDING"], muscles: ["Lower Chest"], secondaryMuscles: ["Triceps"],
    equipment: ["Dumbbells", "Bench"],
    instructions: ["Secure legs on decline bench.", "Press dumbbells from lower chest to lockout.", "Lower under control."],
    commonMistakes: ["Overreaching the stretch"], metValue: 6, ai: { rep: true },
  },
  {
    slug: "dumbbell-fly", name: "Dumbbell Fly", category: "CHEST", difficulty: "BEGINNER",
    disciplines: ["GYM", "BODYBUILDING"], muscles: ["Chest"], secondaryMuscles: ["Front Delts"],
    equipment: ["Dumbbells", "Bench"],
    instructions: ["Hold dumbbells above chest, slight elbow bend.", "Open arms in a wide arc.", "Squeeze chest to return."],
    commonMistakes: ["Pressing instead of flying", "Going too heavy and over-stretching"], formTips: ["Keep the elbow angle fixed"],
    beginnerMod: "Use light weights, focus on the stretch.", metValue: 4,
  },
  {
    slug: "cable-fly", name: "Cable Fly", category: "CHEST", difficulty: "BEGINNER",
    disciplines: ["GYM", "BODYBUILDING"], muscles: ["Chest"], secondaryMuscles: ["Front Delts"],
    equipment: ["Cable Machine", "Cable Attachments"],
    instructions: ["Set pulleys high or mid.", "Step forward, bring handles together in an arc.", "Squeeze, then control back."],
    commonMistakes: ["Bending elbows to press", "Shrugging shoulders"], metValue: 4,
  },
  {
    slug: "pec-deck-fly", name: "Pec Deck Fly", category: "CHEST", difficulty: "BEGINNER",
    disciplines: ["GYM", "BODYBUILDING"], muscles: ["Chest"], secondaryMuscles: ["Front Delts"],
    equipment: ["Pec Deck"],
    instructions: ["Sit with back flat against pad.", "Bring arms together in front.", "Squeeze and return slowly."],
    commonMistakes: ["Using momentum", "Partial range"], metValue: 4,
  },
  {
    slug: "chest-press-machine", name: "Chest Press Machine", category: "CHEST", difficulty: "BEGINNER",
    disciplines: ["GYM"], muscles: ["Chest"], secondaryMuscles: ["Triceps", "Front Delts"],
    equipment: ["Chest Press Machine"],
    instructions: ["Adjust seat so handles align with mid-chest.", "Press out to lockout.", "Return with control."],
    commonMistakes: ["Seat too high/low", "Locking out aggressively"], beginnerMod: "Great first chest movement — fixed path.", metValue: 5,
  },
  {
    slug: "push-ups", name: "Push-up", category: "CHEST", difficulty: "BEGINNER",
    disciplines: ["HOME", "CALISTHENICS"], muscles: ["Chest"], secondaryMuscles: ["Triceps", "Core"],
    equipment: ["Bodyweight"],
    instructions: ["Hands under shoulders, body straight.", "Lower until chest nearly touches floor.", "Press back up fully."],
    commonMistakes: ["Sagging hips", "Half range", "Flaring elbows"], formTips: ["Brace abs and glutes"],
    beginnerMod: "Drop to knees or elevate hands.", advancedVariations: ["Decline push-up", "Archer push-up", "Plyo push-up"], metValue: 4, poseKey: "push-up", ai: true,
  },
  {
    slug: "incline-push-up", name: "Incline Push-up", category: "CHEST", difficulty: "BEGINNER",
    disciplines: ["HOME", "CALISTHENICS"], muscles: ["Lower Chest"], secondaryMuscles: ["Triceps"],
    equipment: ["Bodyweight", "Bench"],
    instructions: ["Hands on an elevated surface.", "Lower chest to the edge.", "Press up."],
    commonMistakes: ["Sagging hips"], beginnerMod: "Higher surface = easier.", metValue: 3, poseKey: "push-up", ai: { rep: true, rom: true },
  },
  {
    slug: "decline-push-up", name: "Decline Push-up", category: "CHEST", difficulty: "INTERMEDIATE",
    disciplines: ["HOME", "CALISTHENICS"], muscles: ["Upper Chest"], secondaryMuscles: ["Front Delts", "Triceps"],
    equipment: ["Bodyweight", "Bench"],
    instructions: ["Feet elevated, hands on floor.", "Lower chest to the ground.", "Press up."],
    commonMistakes: ["Hips piking up"], metValue: 5, poseKey: "push-up", ai: { rep: true, rom: true },
  },
  {
    slug: "dips", name: "Dips", category: "CHEST", difficulty: "INTERMEDIATE",
    disciplines: ["CALISTHENICS", "GYM", "BODYBUILDING"], muscles: ["Lower Chest", "Triceps"], secondaryMuscles: ["Front Delts"],
    equipment: ["Bodyweight", "Pull-up Bar"],
    instructions: ["Support on parallel bars.", "Lean forward, lower until shoulders below elbows.", "Press to lockout."],
    commonMistakes: ["Insufficient depth", "Shoulders rolling forward"], formTips: ["Lean forward for chest, stay upright for triceps"],
    beginnerMod: "Use assisted dip machine or bands.", advancedVariations: ["Weighted dips", "Ring dips"], metValue: 6, poseKey: "dip", ai: { rep: true, rom: true, feedback: true },
  },
  {
    slug: "svend-press", name: "Svend Press", category: "CHEST", difficulty: "BEGINNER",
    disciplines: ["GYM", "BODYBUILDING"], muscles: ["Inner Chest"], secondaryMuscles: ["Front Delts"],
    equipment: ["Weight Plates"],
    instructions: ["Press two plates together at chest.", "Extend arms straight out.", "Pull back in, keeping plates squeezed."],
    commonMistakes: ["Letting plates separate"], metValue: 3,
  },

  // ===================== BACK =====================
  {
    slug: "deadlift", name: "Deadlift", category: "BACK", difficulty: "ADVANCED",
    disciplines: ["POWERLIFTING", "GYM", "FUNCTIONAL"], muscles: ["Hamstrings", "Glutes", "Back"], secondaryMuscles: ["Traps", "Forearms", "Core"],
    equipment: ["Barbell", "Weight Plates"],
    instructions: ["Mid-foot under bar, shins close.", "Hinge, grip just outside knees.", "Brace, flat back, push the floor away.", "Lock out hips at the top."],
    commonMistakes: ["Rounding the back", "Bar drifting forward", "Hyperextending at top"], formTips: ["Engage lats to keep the bar close", "Take the slack out before pulling"],
    beginnerMod: "Start with trap-bar or elevated (block) pulls.", advancedVariations: ["Deficit deadlift", "Pause deadlift"], metValue: 7, poseKey: "deadlift", ai: true,
  },
  {
    slug: "romanian-deadlift", name: "Romanian Deadlift", category: "HAMSTRINGS", difficulty: "INTERMEDIATE",
    disciplines: ["GYM", "BODYBUILDING", "POWERLIFTING"], muscles: ["Hamstrings", "Glutes"], secondaryMuscles: ["Lower Back"],
    equipment: ["Barbell"],
    instructions: ["Stand tall holding the bar.", "Hinge at hips, push them back.", "Lower until hamstrings stretch.", "Drive hips forward to stand."],
    commonMistakes: ["Rounding the back", "Bending knees too much", "Bar drifting away"], formTips: ["Keep a soft knee, bar against legs"],
    beginnerMod: "Use dumbbells and a shorter range.", advancedVariations: ["Single-leg RDL"], metValue: 6, poseKey: "rdl", ai: { posture: true, rep: true, rom: true, feedback: true },
  },
  {
    slug: "rack-pull", name: "Rack Pull", category: "BACK", difficulty: "INTERMEDIATE",
    disciplines: ["POWERLIFTING", "BODYBUILDING"], muscles: ["Back", "Traps"], secondaryMuscles: ["Glutes", "Hamstrings"],
    equipment: ["Barbell", "Smith Machine"],
    instructions: ["Set bar at knee height in a rack.", "Brace and pull to lockout.", "Lower under control."],
    commonMistakes: ["Hyperextending", "Using too much momentum"], metValue: 6, poseKey: "deadlift", ai: { rep: true },
  },
  {
    slug: "barbell-row", name: "Barbell Row", category: "BACK", difficulty: "INTERMEDIATE",
    disciplines: ["GYM", "BODYBUILDING", "POWERLIFTING"], muscles: ["Lats", "Mid Back"], secondaryMuscles: ["Biceps", "Rear Delts"],
    equipment: ["Barbell"],
    instructions: ["Hinge to ~45°, flat back.", "Row bar to lower ribs.", "Squeeze and lower with control."],
    commonMistakes: ["Standing too upright", "Using momentum", "Rounding back"], formTips: ["Lead with the elbows"],
    beginnerMod: "Use dumbbells or chest-supported row.", advancedVariations: ["Pendlay row"], metValue: 6, poseKey: "row", ai: { posture: true, rep: true, feedback: true },
  },
  {
    slug: "pendlay-row", name: "Pendlay Row", category: "BACK", difficulty: "ADVANCED",
    disciplines: ["POWERLIFTING", "GYM"], muscles: ["Lats", "Mid Back"], secondaryMuscles: ["Biceps"],
    equipment: ["Barbell"],
    instructions: ["Torso parallel to floor.", "Explosively row bar to chest.", "Reset bar on the floor each rep."],
    commonMistakes: ["Rising torso", "Not resetting"], metValue: 6, poseKey: "row", ai: { rep: true },
  },
  {
    slug: "t-bar-row", name: "T-Bar Row", category: "BACK", difficulty: "INTERMEDIATE",
    disciplines: ["GYM", "BODYBUILDING"], muscles: ["Mid Back", "Lats"], secondaryMuscles: ["Biceps"],
    equipment: ["T-Bar Row Machine", "Barbell"],
    instructions: ["Straddle the bar, hinge forward.", "Row handles to chest.", "Lower under control."],
    commonMistakes: ["Jerking the weight", "Standing too tall"], metValue: 6, poseKey: "row", ai: { rep: true },
  },
  {
    slug: "dumbbell-row", name: "Dumbbell Row", category: "BACK", difficulty: "BEGINNER",
    disciplines: ["GYM", "HOME", "BODYBUILDING"], muscles: ["Lats", "Mid Back"], secondaryMuscles: ["Biceps", "Rear Delts"],
    equipment: ["Dumbbells", "Bench"],
    instructions: ["One hand and knee on bench.", "Row dumbbell to hip.", "Lower with a full stretch."],
    commonMistakes: ["Rotating the torso", "Shrugging"], beginnerMod: "Lighter weight, control the eccentric.", metValue: 5, poseKey: "row", ai: { rep: true },
  },
  {
    slug: "seated-cable-row", name: "Seated Cable Row", category: "BACK", difficulty: "BEGINNER",
    disciplines: ["GYM", "BODYBUILDING"], muscles: ["Mid Back", "Lats"], secondaryMuscles: ["Biceps"],
    equipment: ["Cable Machine", "Seated Row Machine"],
    instructions: ["Sit tall, slight knee bend.", "Pull handle to abdomen.", "Squeeze shoulder blades, return slowly."],
    commonMistakes: ["Leaning back excessively", "Rounding forward"], metValue: 5, poseKey: "row", ai: { rep: true },
  },
  {
    slug: "machine-row", name: "Machine Row", category: "BACK", difficulty: "BEGINNER",
    disciplines: ["GYM"], muscles: ["Mid Back", "Lats"], secondaryMuscles: ["Biceps"],
    equipment: ["Seated Row Machine"],
    instructions: ["Chest against pad.", "Row handles back.", "Squeeze and return."],
    commonMistakes: ["Using body english"], beginnerMod: "Fixed path — great for learning the squeeze.", metValue: 5,
  },
  {
    slug: "lat-pulldown", name: "Lat Pulldown", category: "BACK", difficulty: "BEGINNER",
    disciplines: ["GYM", "BODYBUILDING"], muscles: ["Lats"], secondaryMuscles: ["Biceps", "Rear Delts"],
    equipment: ["Lat Pulldown Machine"],
    instructions: ["Grip wider than shoulders.", "Pull bar to upper chest.", "Control the bar back up."],
    commonMistakes: ["Leaning back too far", "Partial range"], formTips: ["Drive elbows down and back"],
    beginnerMod: "Best precursor to pull-ups.", metValue: 5, poseKey: "pull-down", ai: { rep: true },
  },
  {
    slug: "pull-ups", name: "Pull-up", category: "BACK", difficulty: "ADVANCED",
    disciplines: ["CALISTHENICS", "GYM"], muscles: ["Lats", "Upper Back"], secondaryMuscles: ["Biceps"],
    equipment: ["Pull-up Bar", "Bodyweight"],
    instructions: ["Hang with grip wider than shoulders.", "Pull chest toward the bar.", "Lower to a full hang."],
    commonMistakes: ["Kipping/swinging", "Partial range", "Shrugging"], formTips: ["Initiate by depressing the shoulders"],
    beginnerMod: "Use band assistance or assisted machine.", advancedVariations: ["Weighted pull-up", "L-sit pull-up"], metValue: 6, poseKey: "pull-up", ai: true,
  },
  {
    slug: "chin-up", name: "Chin-up", category: "BACK", difficulty: "INTERMEDIATE",
    disciplines: ["CALISTHENICS", "GYM"], muscles: ["Lats", "Biceps"], secondaryMuscles: ["Upper Back"],
    equipment: ["Pull-up Bar", "Bodyweight"],
    instructions: ["Underhand grip shoulder-width.", "Pull chin over the bar.", "Lower to full hang."],
    commonMistakes: ["Half reps", "Swinging"], beginnerMod: "Band-assisted or negatives.", metValue: 6, poseKey: "pull-up", ai: { rep: true, rom: true, feedback: true },
  },
  {
    slug: "straight-arm-pulldown", name: "Straight Arm Pulldown", category: "BACK", difficulty: "BEGINNER",
    disciplines: ["GYM", "BODYBUILDING"], muscles: ["Lats"], secondaryMuscles: ["Triceps"],
    equipment: ["Cable Machine"],
    instructions: ["Stand, arms extended to a high pulley.", "Pull bar down to thighs with straight arms.", "Return with control."],
    commonMistakes: ["Bending the elbows", "Using momentum"], metValue: 4,
  },
  {
    slug: "inverted-row", name: "Inverted Row", category: "BACK", difficulty: "BEGINNER",
    disciplines: ["CALISTHENICS", "HOME"], muscles: ["Mid Back", "Lats"], secondaryMuscles: ["Biceps"],
    equipment: ["Barbell", "Bodyweight"],
    instructions: ["Hang under a fixed bar, body straight.", "Pull chest to the bar.", "Lower with control."],
    commonMistakes: ["Sagging hips", "Partial range"], beginnerMod: "Raise the bar / bend knees.", metValue: 5, poseKey: "row", ai: { rep: true },
  },

  // ===================== SHOULDERS =====================
  {
    slug: "shoulder-press", name: "Overhead Press", category: "SHOULDERS", difficulty: "INTERMEDIATE",
    disciplines: ["GYM", "POWERLIFTING", "BODYBUILDING"], muscles: ["Delts"], secondaryMuscles: ["Triceps", "Upper Chest"],
    equipment: ["Barbell"],
    instructions: ["Bar at shoulders, elbows under wrists.", "Brace core, press overhead.", "Lock out, then lower with control."],
    commonMistakes: ["Excessive back arch", "Pressing forward", "Partial lockout"], formTips: ["Squeeze glutes to protect the spine"],
    beginnerMod: "Use dumbbells or seated press.", advancedVariations: ["Push press", "Z-press"], metValue: 5, poseKey: "shoulder-press", ai: true,
  },
  {
    slug: "seated-dumbbell-press", name: "Seated Dumbbell Press", category: "SHOULDERS", difficulty: "BEGINNER",
    disciplines: ["GYM", "BODYBUILDING"], muscles: ["Delts"], secondaryMuscles: ["Triceps"],
    equipment: ["Dumbbells", "Bench"],
    instructions: ["Sit with back supported, dumbbells at shoulders.", "Press overhead.", "Lower to ear height."],
    commonMistakes: ["Clashing dumbbells", "Bouncing out of the bottom"], beginnerMod: "Lighter weight, controlled tempo.", metValue: 5, poseKey: "shoulder-press", ai: { rep: true, rom: true },
  },
  {
    slug: "arnold-press", name: "Arnold Press", category: "SHOULDERS", difficulty: "INTERMEDIATE",
    disciplines: ["GYM", "BODYBUILDING"], muscles: ["Delts"], secondaryMuscles: ["Triceps"],
    equipment: ["Dumbbells", "Bench"],
    instructions: ["Start palms facing you at chin.", "Rotate palms out while pressing up.", "Reverse on the way down."],
    commonMistakes: ["Rushing the rotation", "Arching back"], metValue: 5, poseKey: "shoulder-press", ai: { rep: true },
  },
  {
    slug: "lateral-raise", name: "Lateral Raise", category: "SHOULDERS", difficulty: "BEGINNER",
    disciplines: ["GYM", "BODYBUILDING"], muscles: ["Side Delts"], secondaryMuscles: ["Traps"],
    equipment: ["Dumbbells"],
    instructions: ["Hold dumbbells at sides, slight bend.", "Raise to shoulder height.", "Lower slowly."],
    commonMistakes: ["Swinging the weight", "Shrugging", "Going too heavy"], formTips: ["Lead with the elbows, pinkies slightly up"],
    beginnerMod: "Very light dumbbells or cables.", advancedVariations: ["Cable lateral raise", "Lean-away raise"], metValue: 4, poseKey: "lateral-raise", ai: { rep: true, rom: true, feedback: true },
  },
  {
    slug: "front-raise", name: "Front Raise", category: "SHOULDERS", difficulty: "BEGINNER",
    disciplines: ["GYM", "BODYBUILDING"], muscles: ["Front Delts"], secondaryMuscles: [],
    equipment: ["Dumbbells", "Weight Plates"],
    instructions: ["Hold weights in front of thighs.", "Raise to shoulder height.", "Lower with control."],
    commonMistakes: ["Swinging", "Raising too high"], metValue: 4, poseKey: "front-raise", ai: { rep: true },
  },
  {
    slug: "rear-delt-fly", name: "Rear Delt Fly", category: "SHOULDERS", difficulty: "BEGINNER",
    disciplines: ["GYM", "BODYBUILDING"], muscles: ["Rear Delts"], secondaryMuscles: ["Mid Back"],
    equipment: ["Dumbbells", "Pec Deck"],
    instructions: ["Hinge forward, slight elbow bend.", "Raise dumbbells out to the sides.", "Squeeze and lower."],
    commonMistakes: ["Using traps", "Going too heavy"], metValue: 4,
  },
  {
    slug: "upright-row", name: "Upright Row", category: "SHOULDERS", difficulty: "INTERMEDIATE",
    disciplines: ["GYM", "BODYBUILDING"], muscles: ["Side Delts", "Traps"], secondaryMuscles: ["Biceps"],
    equipment: ["Barbell", "Dumbbells"],
    instructions: ["Grip just inside shoulders.", "Pull elbows up to chest height.", "Lower with control."],
    commonMistakes: ["Pulling too high (impingement)"], formTips: ["Stop at chest height"], metValue: 4, poseKey: "row", ai: { rep: true },
  },
  {
    slug: "face-pull", name: "Face Pull", category: "SHOULDERS", difficulty: "BEGINNER",
    disciplines: ["GYM", "FUNCTIONAL"], muscles: ["Rear Delts"], secondaryMuscles: ["Mid Back", "Rotator Cuff"],
    equipment: ["Cable Machine", "Resistance Bands"],
    instructions: ["Set rope at face height.", "Pull toward face, elbows high.", "Externally rotate, then return."],
    commonMistakes: ["Elbows dropping", "Using too much weight"], formTips: ["Great for shoulder health"], metValue: 4,
  },
  {
    slug: "machine-shoulder-press", name: "Machine Shoulder Press", category: "SHOULDERS", difficulty: "BEGINNER",
    disciplines: ["GYM"], muscles: ["Delts"], secondaryMuscles: ["Triceps"],
    equipment: ["Shoulder Press Machine"],
    instructions: ["Adjust seat, handles at shoulder height.", "Press overhead.", "Lower with control."],
    commonMistakes: ["Seat misaligned"], beginnerMod: "Fixed path — beginner friendly.", metValue: 5,
  },

  // ===================== BICEPS =====================
  {
    slug: "barbell-curl", name: "Barbell Curl", category: "BICEPS", difficulty: "BEGINNER",
    disciplines: ["GYM", "BODYBUILDING"], muscles: ["Biceps"], secondaryMuscles: ["Forearms"],
    equipment: ["Barbell"],
    instructions: ["Elbows pinned to sides.", "Curl bar up, squeeze.", "Lower slowly to full extension."],
    commonMistakes: ["Swinging the torso", "Elbows drifting forward", "Half reps"], formTips: ["Keep wrists neutral"],
    beginnerMod: "Use the EZ bar to ease wrist strain.", advancedVariations: ["21s", "Cheat curls (controlled)"], metValue: 3, poseKey: "curl", ai: { rep: true, rom: true, feedback: true },
  },
  {
    slug: "ez-bar-curl", name: "EZ Bar Curl", category: "BICEPS", difficulty: "BEGINNER",
    disciplines: ["GYM", "BODYBUILDING"], muscles: ["Biceps"], secondaryMuscles: ["Forearms"],
    equipment: ["EZ Bar"],
    instructions: ["Grip the angled bar.", "Curl up, squeeze.", "Lower with control."],
    commonMistakes: ["Swinging", "Partial range"], metValue: 3, poseKey: "curl", ai: { rep: true },
  },
  {
    slug: "bicep-curl", name: "Dumbbell Curl", category: "BICEPS", difficulty: "BEGINNER",
    disciplines: ["GYM", "HOME", "BODYBUILDING"], muscles: ["Biceps"], secondaryMuscles: ["Forearms"],
    equipment: ["Dumbbells"],
    instructions: ["Elbows at sides, palms forward.", "Curl up, squeeze the biceps.", "Lower slowly to full extension."],
    commonMistakes: ["Swinging the torso", "Moving elbows forward", "Half reps"], formTips: ["Supinate (rotate) at the top"],
    beginnerMod: "Alternate arms with lighter weight.", advancedVariations: ["Incline curl", "Spider curl"], metValue: 3, poseKey: "curl", ai: true,
  },
  {
    slug: "hammer-curl", name: "Hammer Curl", category: "BICEPS", difficulty: "BEGINNER",
    disciplines: ["GYM", "HOME", "BODYBUILDING"], muscles: ["Biceps", "Brachialis"], secondaryMuscles: ["Forearms"],
    equipment: ["Dumbbells"],
    instructions: ["Neutral grip (palms facing in).", "Curl up keeping the neutral grip.", "Lower with control."],
    commonMistakes: ["Swinging", "Elbows flaring"], beginnerMod: "Alternate arms.", metValue: 3, poseKey: "hammer-curl", ai: { rep: true, rom: true },
  },
  {
    slug: "preacher-curl", name: "Preacher Curl", category: "BICEPS", difficulty: "INTERMEDIATE",
    disciplines: ["GYM", "BODYBUILDING"], muscles: ["Biceps"], secondaryMuscles: ["Forearms"],
    equipment: ["EZ Bar", "Bench"],
    instructions: ["Arms over the preacher pad.", "Curl up, squeeze.", "Lower to near full extension."],
    commonMistakes: ["Bouncing at the bottom", "Coming off the pad"], metValue: 3, poseKey: "curl", ai: { rep: true },
  },
  {
    slug: "concentration-curl", name: "Concentration Curl", category: "BICEPS", difficulty: "BEGINNER",
    disciplines: ["GYM", "BODYBUILDING"], muscles: ["Biceps"], secondaryMuscles: [],
    equipment: ["Dumbbells", "Bench"],
    instructions: ["Seated, elbow braced on inner thigh.", "Curl the dumbbell up.", "Squeeze, then lower slowly."],
    commonMistakes: ["Using the shoulder", "Rushing"], metValue: 3, poseKey: "curl", ai: { rep: true },
  },
  {
    slug: "cable-curl", name: "Cable Curl", category: "BICEPS", difficulty: "BEGINNER",
    disciplines: ["GYM", "BODYBUILDING"], muscles: ["Biceps"], secondaryMuscles: ["Forearms"],
    equipment: ["Cable Machine"],
    instructions: ["Low pulley, grip the bar.", "Curl up with constant tension.", "Lower with control."],
    commonMistakes: ["Elbows drifting", "Leaning back"], metValue: 3, poseKey: "curl", ai: { rep: true },
  },
  {
    slug: "incline-dumbbell-curl", name: "Incline Dumbbell Curl", category: "BICEPS", difficulty: "INTERMEDIATE",
    disciplines: ["GYM", "BODYBUILDING"], muscles: ["Biceps (long head)"], secondaryMuscles: ["Forearms"],
    equipment: ["Dumbbells", "Bench"],
    instructions: ["Recline on a 45-60° bench, arms hanging.", "Curl up without moving the elbows.", "Lower to a deep stretch."],
    commonMistakes: ["Swinging elbows forward"], metValue: 3, poseKey: "curl", ai: { rep: true },
  },

  // ===================== TRICEPS =====================
  {
    slug: "tricep-pushdown", name: "Tricep Pushdown", category: "TRICEPS", difficulty: "BEGINNER",
    disciplines: ["GYM", "BODYBUILDING"], muscles: ["Triceps"], secondaryMuscles: [],
    equipment: ["Cable Machine"],
    instructions: ["Elbows tucked at sides.", "Push the bar down to lockout.", "Return under control."],
    commonMistakes: ["Elbows drifting", "Using bodyweight", "Partial lockout"], formTips: ["Keep upper arms still"],
    beginnerMod: "Start light, focus on the squeeze.", advancedVariations: ["Single-arm pushdown"], metValue: 3, poseKey: "pushdown", ai: { rep: true },
  },
  {
    slug: "skull-crusher", name: "Skull Crusher", category: "TRICEPS", difficulty: "INTERMEDIATE",
    disciplines: ["GYM", "BODYBUILDING"], muscles: ["Triceps"], secondaryMuscles: [],
    equipment: ["EZ Bar", "Bench"],
    instructions: ["Lie down, bar over forehead.", "Bend elbows to lower the bar.", "Extend back to lockout."],
    commonMistakes: ["Flaring elbows", "Moving upper arms"], metValue: 3,
  },
  {
    slug: "overhead-tricep-extension", name: "Overhead Extension", category: "TRICEPS", difficulty: "BEGINNER",
    disciplines: ["GYM", "HOME", "BODYBUILDING"], muscles: ["Triceps (long head)"], secondaryMuscles: [],
    equipment: ["Dumbbells", "Cable Machine"],
    instructions: ["Hold weight overhead.", "Lower behind the head.", "Extend to lockout."],
    commonMistakes: ["Elbows flaring wide", "Short range"], metValue: 3,
  },
  {
    slug: "close-grip-bench-press", name: "Close Grip Bench Press", category: "TRICEPS", difficulty: "INTERMEDIATE",
    disciplines: ["POWERLIFTING", "GYM", "BODYBUILDING"], muscles: ["Triceps"], secondaryMuscles: ["Chest", "Front Delts"],
    equipment: ["Barbell", "Bench"],
    instructions: ["Grip ~shoulder width.", "Lower to lower chest, elbows tucked.", "Press to lockout."],
    commonMistakes: ["Grip too narrow (wrist strain)", "Flaring elbows"], metValue: 5, poseKey: "bench-press", ai: { rep: true },
  },
  {
    slug: "bench-dips", name: "Bench Dips", category: "TRICEPS", difficulty: "BEGINNER",
    disciplines: ["HOME", "CALISTHENICS"], muscles: ["Triceps"], secondaryMuscles: ["Front Delts"],
    equipment: ["Bench", "Bodyweight"],
    instructions: ["Hands on a bench behind you.", "Lower by bending elbows.", "Press back up."],
    commonMistakes: ["Shoulders rolling forward", "Partial depth"], beginnerMod: "Bend knees to reduce load.", metValue: 4, poseKey: "dip", ai: { rep: true },
  },
  {
    slug: "rope-pushdown", name: "Rope Pushdown", category: "TRICEPS", difficulty: "BEGINNER",
    disciplines: ["GYM", "BODYBUILDING"], muscles: ["Triceps"], secondaryMuscles: [],
    equipment: ["Cable Machine", "Cable Attachments"],
    instructions: ["Grip the rope, elbows tucked.", "Push down and spread the rope at the bottom.", "Return with control."],
    commonMistakes: ["Elbows moving", "No spread at bottom"], metValue: 3, poseKey: "pushdown", ai: { rep: true },
  },
  {
    slug: "tricep-kickback", name: "Kickback", category: "TRICEPS", difficulty: "BEGINNER",
    disciplines: ["GYM", "HOME", "BODYBUILDING"], muscles: ["Triceps"], secondaryMuscles: [],
    equipment: ["Dumbbells"],
    instructions: ["Hinge forward, upper arm parallel to torso.", "Extend the elbow back.", "Squeeze, then return."],
    commonMistakes: ["Dropping the upper arm", "Swinging"], metValue: 3,
  },

  // ===================== QUADS =====================
  {
    slug: "squat", name: "Back Squat", category: "QUADS", difficulty: "INTERMEDIATE",
    disciplines: ["POWERLIFTING", "GYM", "FUNCTIONAL"], muscles: ["Quads", "Glutes"], secondaryMuscles: ["Hamstrings", "Core"],
    equipment: ["Barbell", "Squat Rack"],
    instructions: ["Bar on upper traps, feet shoulder-width.", "Brace, break at hips and knees.", "Descend to parallel or below.", "Drive through mid-foot to stand."],
    commonMistakes: ["Knees caving in", "Heels lifting", "Rounding lower back"], formTips: ["Spread the floor with your feet", "Keep the chest proud"],
    beginnerMod: "Goblet squat or box squat to learn depth.", advancedVariations: ["Pause squat", "Front squat"], metValue: 7, poseKey: "squat", ai: true,
  },
  {
    slug: "front-squat", name: "Front Squat", category: "QUADS", difficulty: "ADVANCED",
    disciplines: ["GYM", "CROSSFIT", "FUNCTIONAL"], muscles: ["Quads"], secondaryMuscles: ["Glutes", "Core"],
    equipment: ["Barbell", "Squat Rack"],
    instructions: ["Bar racked on front delts, elbows high.", "Squat down keeping torso upright.", "Drive up to stand."],
    commonMistakes: ["Elbows dropping", "Rounding upper back"], formTips: ["Keep elbows up throughout"],
    beginnerMod: "Use a cross-arm grip or goblet squat.", metValue: 7, poseKey: "front-squat", ai: { posture: true, rep: true, rom: true, feedback: true },
  },
  {
    slug: "hack-squat", name: "Hack Squat", category: "QUADS", difficulty: "INTERMEDIATE",
    disciplines: ["GYM", "BODYBUILDING"], muscles: ["Quads"], secondaryMuscles: ["Glutes"],
    equipment: ["Hack Squat Machine"],
    instructions: ["Shoulders under pads, feet mid-platform.", "Lower to parallel.", "Press up without locking hard."],
    commonMistakes: ["Knees caving", "Partial depth"], metValue: 6,
  },
  {
    slug: "leg-press", name: "Leg Press", category: "QUADS", difficulty: "BEGINNER",
    disciplines: ["GYM", "BODYBUILDING"], muscles: ["Quads", "Glutes"], secondaryMuscles: ["Hamstrings"],
    equipment: ["Leg Press Machine"],
    instructions: ["Feet shoulder-width on platform.", "Lower until knees ~90°.", "Press up without locking out."],
    commonMistakes: ["Lower back rounding (too deep)", "Locking knees"], beginnerMod: "Great quad builder with low skill demand.", metValue: 6,
  },
  {
    slug: "leg-extension", name: "Leg Extension", category: "QUADS", difficulty: "BEGINNER",
    disciplines: ["GYM", "BODYBUILDING"], muscles: ["Quads"], secondaryMuscles: [],
    equipment: ["Leg Extension Machine"],
    instructions: ["Pad on lower shins.", "Extend knees fully.", "Squeeze, then lower."],
    commonMistakes: ["Using momentum", "Partial range"], metValue: 4,
  },
  {
    slug: "bulgarian-split-squat", name: "Bulgarian Split Squat", category: "QUADS", difficulty: "INTERMEDIATE",
    disciplines: ["GYM", "FUNCTIONAL", "HOME"], muscles: ["Quads", "Glutes"], secondaryMuscles: ["Hamstrings", "Core"],
    equipment: ["Dumbbells", "Bench"],
    instructions: ["Rear foot on a bench.", "Lower the front knee to ~90°.", "Drive through the front heel."],
    commonMistakes: ["Front knee caving", "Leaning too far"], formTips: ["Most growth per leg — go controlled"],
    beginnerMod: "Bodyweight only, shorter range.", metValue: 6, poseKey: "lunge", ai: { rep: true, rom: true },
  },
  {
    slug: "lunges", name: "Walking Lunges", category: "QUADS", difficulty: "BEGINNER",
    disciplines: ["GYM", "HOME", "FUNCTIONAL"], muscles: ["Quads", "Glutes"], secondaryMuscles: ["Hamstrings"],
    equipment: ["Dumbbells", "Bodyweight"],
    instructions: ["Step forward into a long stride.", "Lower until both knees ~90°.", "Drive up and step through."],
    commonMistakes: ["Knee past toes", "Leaning forward", "Short stride"], formTips: ["Keep torso tall"],
    beginnerMod: "Stationary split squats, no weight.", advancedVariations: ["Walking DB lunges", "Deficit lunges"], metValue: 5, poseKey: "lunge", ai: true,
  },
  {
    slug: "step-ups", name: "Step-ups", category: "QUADS", difficulty: "BEGINNER",
    disciplines: ["HOME", "FUNCTIONAL", "GYM"], muscles: ["Quads", "Glutes"], secondaryMuscles: ["Hamstrings"],
    equipment: ["Bench", "Dumbbells"],
    instructions: ["Place one foot on a box.", "Drive up through that heel.", "Lower under control."],
    commonMistakes: ["Pushing off the back foot", "Box too high"], metValue: 5, poseKey: "lunge", ai: { rep: true },
  },

  // ===================== HAMSTRINGS =====================
  {
    slug: "stiff-leg-deadlift", name: "Stiff Leg Deadlift", category: "HAMSTRINGS", difficulty: "INTERMEDIATE",
    disciplines: ["GYM", "BODYBUILDING"], muscles: ["Hamstrings"], secondaryMuscles: ["Glutes", "Lower Back"],
    equipment: ["Barbell", "Dumbbells"],
    instructions: ["Near-straight legs, hinge at hips.", "Lower bar along the legs.", "Stand by squeezing glutes."],
    commonMistakes: ["Rounding the back", "Bending knees too much"], metValue: 6, poseKey: "rdl", ai: { rep: true, rom: true },
  },
  {
    slug: "leg-curl", name: "Leg Curl", category: "HAMSTRINGS", difficulty: "BEGINNER",
    disciplines: ["GYM", "BODYBUILDING"], muscles: ["Hamstrings"], secondaryMuscles: ["Calves"],
    equipment: ["Leg Curl Machine"],
    instructions: ["Pad on lower calves.", "Curl heels toward glutes.", "Lower with control."],
    commonMistakes: ["Hips lifting", "Using momentum"], metValue: 4,
  },
  {
    slug: "good-morning", name: "Good Morning", category: "HAMSTRINGS", difficulty: "ADVANCED",
    disciplines: ["POWERLIFTING", "GYM"], muscles: ["Hamstrings", "Lower Back"], secondaryMuscles: ["Glutes"],
    equipment: ["Barbell"],
    instructions: ["Bar on traps, soft knees.", "Hinge forward, push hips back.", "Return to standing."],
    commonMistakes: ["Rounding back", "Going too heavy"], beginnerMod: "Use very light load to learn the hinge.", metValue: 5, poseKey: "rdl", ai: { posture: true, rep: true },
  },
  {
    slug: "nordic-curl", name: "Nordic Curl", category: "HAMSTRINGS", difficulty: "ADVANCED",
    disciplines: ["CALISTHENICS", "FUNCTIONAL"], muscles: ["Hamstrings"], secondaryMuscles: ["Glutes"],
    equipment: ["Bodyweight"],
    instructions: ["Anchor the ankles, kneel tall.", "Lower the torso slowly, resisting.", "Push back up (or assist with hands)."],
    commonMistakes: ["Bending at the hips", "Dropping fast"], beginnerMod: "Band-assisted or partial range.", metValue: 5, poseKey: "rep-generic", ai: { rep: true },
  },
  {
    slug: "glute-ham-raise", name: "Glute Ham Raise", category: "HAMSTRINGS", difficulty: "ADVANCED",
    disciplines: ["GYM", "FUNCTIONAL"], muscles: ["Hamstrings", "Glutes"], secondaryMuscles: ["Lower Back"],
    equipment: ["Bodyweight"],
    instructions: ["Lock feet in the GHR pad.", "Lower the torso, then curl back up.", "Squeeze hamstrings at the top."],
    commonMistakes: ["Using only the hip hinge"], metValue: 5,
  },

  // ===================== GLUTES =====================
  {
    slug: "hip-thrust", name: "Hip Thrust", category: "GLUTES", difficulty: "INTERMEDIATE",
    disciplines: ["GYM", "BODYBUILDING", "FUNCTIONAL"], muscles: ["Glutes"], secondaryMuscles: ["Hamstrings"],
    equipment: ["Barbell", "Bench"],
    instructions: ["Upper back on a bench, bar over hips.", "Drive hips up to full extension.", "Squeeze glutes, then lower."],
    commonMistakes: ["Overextending the lower back", "Short range"], formTips: ["Tuck the chin, ribs down"],
    beginnerMod: "Bodyweight glute bridge first.", advancedVariations: ["Single-leg hip thrust"], metValue: 5, poseKey: "hip-thrust", ai: { rep: true, rom: true },
  },
  {
    slug: "glute-bridge", name: "Glute Bridge", category: "GLUTES", difficulty: "BEGINNER",
    disciplines: ["HOME", "FUNCTIONAL"], muscles: ["Glutes"], secondaryMuscles: ["Hamstrings"],
    equipment: ["Bodyweight"],
    instructions: ["Lie on back, knees bent.", "Drive hips up.", "Squeeze glutes, lower slowly."],
    commonMistakes: ["Arching lower back", "Heels too far away"], beginnerMod: "Perfect entry glute exercise.", metValue: 3, poseKey: "hip-thrust", ai: { rep: true },
  },
  {
    slug: "cable-kickback", name: "Cable Kickback", category: "GLUTES", difficulty: "BEGINNER",
    disciplines: ["GYM", "BODYBUILDING"], muscles: ["Glutes"], secondaryMuscles: ["Hamstrings"],
    equipment: ["Cable Machine"],
    instructions: ["Ankle strap on a low pulley.", "Kick the leg straight back.", "Squeeze and return."],
    commonMistakes: ["Arching back", "Using momentum"], metValue: 3,
  },
  {
    slug: "sumo-squat", name: "Sumo Squat", category: "GLUTES", difficulty: "BEGINNER",
    disciplines: ["GYM", "HOME", "FUNCTIONAL"], muscles: ["Glutes", "Inner Thighs"], secondaryMuscles: ["Quads"],
    equipment: ["Dumbbells", "Kettlebell"],
    instructions: ["Wide stance, toes out.", "Squat down keeping chest up.", "Drive through heels to stand."],
    commonMistakes: ["Knees caving", "Leaning forward"], metValue: 5, poseKey: "squat", ai: { rep: true, rom: true },
  },
  {
    slug: "frog-pump", name: "Frog Pump", category: "GLUTES", difficulty: "BEGINNER",
    disciplines: ["HOME", "BODYBUILDING"], muscles: ["Glutes"], secondaryMuscles: [],
    equipment: ["Bodyweight", "Weight Plates"],
    instructions: ["Soles of feet together, knees out.", "Drive hips up.", "Squeeze glutes hard at the top."],
    commonMistakes: ["Using the lower back"], metValue: 3, poseKey: "hip-thrust", ai: { rep: true },
  },

  // ===================== CALVES =====================
  {
    slug: "standing-calf-raise", name: "Standing Calf Raise", category: "CALVES", difficulty: "BEGINNER",
    disciplines: ["GYM", "HOME", "BODYBUILDING"], muscles: ["Calves (Gastroc)"], secondaryMuscles: [],
    equipment: ["Calf Raise Machine", "Dumbbells"],
    instructions: ["Balls of feet on a step.", "Rise onto the toes.", "Lower for a deep stretch."],
    commonMistakes: ["Bouncing", "Partial range"], formTips: ["Pause at the top"], metValue: 3, poseKey: "calf-raise", ai: { rep: true },
  },
  {
    slug: "seated-calf-raise", name: "Seated Calf Raise", category: "CALVES", difficulty: "BEGINNER",
    disciplines: ["GYM", "BODYBUILDING"], muscles: ["Calves (Soleus)"], secondaryMuscles: [],
    equipment: ["Calf Raise Machine"],
    instructions: ["Pad over the knees, balls of feet on platform.", "Raise heels up.", "Lower for a full stretch."],
    commonMistakes: ["Short range", "Rushing"], metValue: 3,
  },
  {
    slug: "donkey-calf-raise", name: "Donkey Calf Raise", category: "CALVES", difficulty: "BEGINNER",
    disciplines: ["GYM", "BODYBUILDING"], muscles: ["Calves"], secondaryMuscles: [],
    equipment: ["Calf Raise Machine", "Bodyweight"],
    instructions: ["Hinge at hips, balls of feet on a step.", "Raise the heels.", "Lower with a stretch."],
    commonMistakes: ["Bouncing"], metValue: 3, poseKey: "calf-raise", ai: { rep: true },
  },
  {
    slug: "leg-press-calf-raise", name: "Leg Press Calf Raise", category: "CALVES", difficulty: "BEGINNER",
    disciplines: ["GYM", "BODYBUILDING"], muscles: ["Calves"], secondaryMuscles: [],
    equipment: ["Leg Press Machine"],
    instructions: ["Balls of feet low on the platform.", "Press through the toes.", "Lower for a stretch."],
    commonMistakes: ["Bending knees", "Partial range"], metValue: 3,
  },

  // ===================== CORE / ABS =====================
  {
    slug: "plank", name: "Plank", category: "CORE", difficulty: "BEGINNER",
    disciplines: ["HOME", "CALISTHENICS", "FUNCTIONAL"], muscles: ["Core"], secondaryMuscles: ["Shoulders", "Glutes"],
    equipment: ["Bodyweight"],
    instructions: ["Forearms under shoulders.", "Body straight head-to-heels.", "Brace abs and glutes; hold."],
    commonMistakes: ["Sagging hips", "Hips too high", "Holding breath"], formTips: ["Squeeze everything; breathe steadily"],
    beginnerMod: "Drop to knees or shorten the hold.", advancedVariations: ["RKC plank", "Long-lever plank"], metValue: 3, poseKey: "plank", ai: { posture: true, rom: true, feedback: true },
  },
  {
    slug: "side-plank", name: "Side Plank", category: "CORE", difficulty: "BEGINNER",
    disciplines: ["HOME", "FUNCTIONAL"], muscles: ["Obliques"], secondaryMuscles: ["Core", "Shoulders"],
    equipment: ["Bodyweight"],
    instructions: ["On one forearm, body in a line.", "Lift hips off the floor.", "Hold, then switch sides."],
    commonMistakes: ["Hips dropping", "Rotating forward"], beginnerMod: "Bottom knee down.", metValue: 3, poseKey: "plank", ai: { posture: true, feedback: true },
  },
  {
    slug: "crunch", name: "Crunch", category: "CORE", difficulty: "BEGINNER",
    disciplines: ["HOME", "BODYBUILDING"], muscles: ["Abs"], secondaryMuscles: [],
    equipment: ["Bodyweight"],
    instructions: ["Lie on back, knees bent.", "Curl shoulders toward the hips.", "Lower with control."],
    commonMistakes: ["Pulling on the neck", "Using momentum"], metValue: 3, poseKey: "crunch", ai: { rep: true },
  },
  {
    slug: "sit-up", name: "Sit-up", category: "CORE", difficulty: "BEGINNER",
    disciplines: ["HOME", "CALISTHENICS", "FUNCTIONAL"], muscles: ["Abs"], secondaryMuscles: ["Hip Flexors"],
    equipment: ["Bodyweight"],
    instructions: ["Knees bent, feet anchored or flat.", "Sit all the way up.", "Lower under control."],
    commonMistakes: ["Yanking the neck", "Feet flying up"], metValue: 4, poseKey: "crunch", ai: { rep: true },
  },
  {
    slug: "russian-twist", name: "Russian Twist", category: "CORE", difficulty: "BEGINNER",
    disciplines: ["HOME", "FUNCTIONAL", "CROSSFIT"], muscles: ["Obliques"], secondaryMuscles: ["Abs"],
    equipment: ["Medicine Ball", "Weight Plates"],
    instructions: ["Sit, lean back, feet up.", "Rotate the torso side to side.", "Tap the weight each side."],
    commonMistakes: ["Moving only the arms", "Rounding the back"], metValue: 4,
  },
  {
    slug: "leg-raise", name: "Leg Raise", category: "CORE", difficulty: "BEGINNER",
    disciplines: ["HOME", "CALISTHENICS"], muscles: ["Lower Abs"], secondaryMuscles: ["Hip Flexors"],
    equipment: ["Bodyweight"],
    instructions: ["Lie flat, legs straight.", "Raise legs to vertical.", "Lower slowly without touching the floor."],
    commonMistakes: ["Arching the lower back", "Using momentum"], beginnerMod: "Bend the knees.", metValue: 4, poseKey: "leg-raise", ai: { rep: true },
  },
  {
    slug: "hanging-leg-raise", name: "Hanging Leg Raise", category: "CORE", difficulty: "ADVANCED",
    disciplines: ["CALISTHENICS", "GYM"], muscles: ["Lower Abs"], secondaryMuscles: ["Hip Flexors", "Forearms"],
    equipment: ["Pull-up Bar", "Bodyweight"],
    instructions: ["Hang from a bar.", "Raise legs to hip height (or toes-to-bar).", "Lower with control."],
    commonMistakes: ["Swinging", "Using momentum"], beginnerMod: "Knee raises first.", advancedVariations: ["Toes-to-bar"], metValue: 5, poseKey: "leg-raise", ai: { rep: true },
  },
  {
    slug: "mountain-climbers", name: "Mountain Climbers", category: "CORE", difficulty: "BEGINNER",
    disciplines: ["HOME", "CARDIO", "CROSSFIT", "FUNCTIONAL"], muscles: ["Core"], secondaryMuscles: ["Shoulders", "Quads"],
    equipment: ["Bodyweight"],
    instructions: ["Start in a push-up position.", "Drive knees toward the chest alternately.", "Keep a fast, steady rhythm."],
    commonMistakes: ["Hips bouncing high", "Slowing down"], metValue: 8, poseKey: "rep-generic", ai: { rep: true },
  },
  {
    slug: "bicycle-crunch", name: "Bicycle Crunch", category: "CORE", difficulty: "BEGINNER",
    disciplines: ["HOME", "BODYBUILDING"], muscles: ["Abs", "Obliques"], secondaryMuscles: [],
    equipment: ["Bodyweight"],
    instructions: ["On your back, hands by the ears.", "Bring elbow to opposite knee.", "Alternate in a pedaling motion."],
    commonMistakes: ["Pulling the neck", "Rushing the reps"], metValue: 4, poseKey: "crunch", ai: { rep: true },
  },
  {
    slug: "ab-wheel-rollout", name: "Ab Wheel Rollout", category: "CORE", difficulty: "ADVANCED",
    disciplines: ["HOME", "FUNCTIONAL", "CALISTHENICS"], muscles: ["Abs"], secondaryMuscles: ["Lats", "Shoulders"],
    equipment: ["Ab Wheel"],
    instructions: ["Kneel, grip the wheel.", "Roll out as far as control allows.", "Pull back using the abs."],
    commonMistakes: ["Sagging lower back", "Rolling too far too soon"], beginnerMod: "Short range from the knees.", metValue: 5,
  },

  // ===================== CALISTHENICS (advanced statics) =====================
  {
    slug: "muscle-up", name: "Muscle-up", category: "BACK", difficulty: "ADVANCED",
    disciplines: ["CALISTHENICS"], muscles: ["Lats", "Chest", "Triceps"], secondaryMuscles: ["Core"],
    equipment: ["Pull-up Bar", "Bodyweight"],
    instructions: ["Explosive pull-up, then transition over the bar.", "Press out at the top.", "Lower under control."],
    commonMistakes: ["No explosive pull", "Chicken-winging the transition"], beginnerMod: "Master high pull-ups and dips first.", metValue: 7,
  },
  {
    slug: "handstand-push-up", name: "Handstand Push-up", category: "SHOULDERS", difficulty: "ADVANCED",
    disciplines: ["CALISTHENICS", "CROSSFIT"], muscles: ["Delts"], secondaryMuscles: ["Triceps", "Traps"],
    equipment: ["Bodyweight"],
    instructions: ["Kick up to a handstand against a wall.", "Lower the head toward the floor.", "Press back to lockout."],
    commonMistakes: ["Arching the back", "Partial range"], beginnerMod: "Pike push-ups.", metValue: 6,
  },
  {
    slug: "front-lever", name: "Front Lever", category: "CORE", difficulty: "ADVANCED",
    disciplines: ["CALISTHENICS"], muscles: ["Lats", "Core"], secondaryMuscles: ["Shoulders"],
    equipment: ["Pull-up Bar", "Bodyweight"],
    instructions: ["Hang, then lift the body to horizontal.", "Keep the body straight and rigid.", "Hold the position."],
    commonMistakes: ["Sagging hips", "Bent arms"], beginnerMod: "Tuck or advanced-tuck progressions.", metValue: 6,
  },
  {
    slug: "back-lever", name: "Back Lever", category: "BACK", difficulty: "ADVANCED",
    disciplines: ["CALISTHENICS"], muscles: ["Lats", "Chest"], secondaryMuscles: ["Core", "Shoulders"],
    equipment: ["Pull-up Bar", "Bodyweight"],
    instructions: ["From an inverted hang, lower to horizontal facing down.", "Keep the body straight.", "Hold."],
    commonMistakes: ["Piking", "Rushing the progression"], beginnerMod: "Tuck back lever.", metValue: 6,
  },
  {
    slug: "human-flag", name: "Human Flag", category: "CORE", difficulty: "ADVANCED",
    disciplines: ["CALISTHENICS"], muscles: ["Obliques", "Lats"], secondaryMuscles: ["Shoulders", "Core"],
    equipment: ["Bodyweight"],
    instructions: ["Grip a vertical pole, top/bottom hands.", "Press and pull to raise the body sideways.", "Hold horizontally."],
    commonMistakes: ["Insufficient base strength"], beginnerMod: "Flag raises / vertical flag.", metValue: 6,
  },

  // ===================== CARDIO =====================
  {
    slug: "cardio", name: "Cardio", category: "CARDIO", difficulty: "BEGINNER",
    disciplines: ["CARDIO", "HOME", "GYM"], muscles: ["Heart"], secondaryMuscles: ["Legs", "Full Body"],
    equipment: ["Bodyweight"],
    instructions: ["Warm up 3-5 min.", "Hold a challenging but sustainable pace.", "Cool down and stretch."],
    commonMistakes: ["Starting too fast", "Skipping cool down"], metValue: 8,
  },
  {
    slug: "running", name: "Running", category: "CARDIO", difficulty: "BEGINNER",
    disciplines: ["CARDIO"], muscles: ["Legs", "Heart"], secondaryMuscles: ["Core"],
    equipment: ["Bodyweight", "Treadmill"],
    instructions: ["Warm up with a brisk walk.", "Run at a conversational pace.", "Land mid-foot, relax the shoulders."],
    commonMistakes: ["Overstriding", "Starting too fast"], beginnerMod: "Run/walk intervals.", metValue: 10,
  },
  {
    slug: "walking", name: "Walking", category: "CARDIO", difficulty: "BEGINNER",
    disciplines: ["CARDIO", "HOME"], muscles: ["Legs", "Heart"], secondaryMuscles: [],
    equipment: ["Bodyweight", "Treadmill"],
    instructions: ["Maintain a brisk pace.", "Stand tall, swing the arms.", "Breathe steadily."],
    commonMistakes: ["Pace too slow to elevate HR"], metValue: 4,
  },
  {
    slug: "sprinting", name: "Sprinting", category: "CARDIO", difficulty: "ADVANCED",
    disciplines: ["CARDIO", "FUNCTIONAL"], muscles: ["Legs", "Heart"], secondaryMuscles: ["Core", "Glutes"],
    equipment: ["Bodyweight", "Treadmill"],
    instructions: ["Warm up thoroughly.", "Sprint near-max for 10-30s.", "Rest fully, then repeat."],
    commonMistakes: ["No warm-up (injury risk)", "Too little rest"], beginnerMod: "Strides at 70% effort.", metValue: 13,
  },
  {
    slug: "cycling", name: "Cycling", category: "CARDIO", difficulty: "BEGINNER",
    disciplines: ["CARDIO"], muscles: ["Quads", "Heart"], secondaryMuscles: ["Glutes", "Calves"],
    equipment: ["Stationary Bike"],
    instructions: ["Set saddle to hip height.", "Maintain steady cadence.", "Adjust resistance to challenge."],
    commonMistakes: ["Saddle too low", "Knees bowing out"], metValue: 8,
  },
  {
    slug: "rowing", name: "Rowing", category: "CARDIO", difficulty: "INTERMEDIATE",
    disciplines: ["CARDIO", "CROSSFIT", "FUNCTIONAL"], muscles: ["Back", "Legs", "Heart"], secondaryMuscles: ["Core", "Arms"],
    equipment: ["Rowing Machine"],
    instructions: ["Drive with the legs first.", "Then lean back and pull to the chest.", "Reverse the sequence to return."],
    commonMistakes: ["Pulling with arms first", "Rounding the back"], metValue: 9,
  },
  {
    slug: "jump-rope", name: "Jump Rope", category: "CARDIO", difficulty: "BEGINNER",
    disciplines: ["CARDIO", "CROSSFIT", "HOME"], muscles: ["Calves", "Heart"], secondaryMuscles: ["Shoulders"],
    equipment: ["Jump Rope"],
    instructions: ["Turn the rope with the wrists.", "Small, light bounces on the balls of the feet.", "Keep a steady rhythm."],
    commonMistakes: ["Jumping too high", "Swinging from the shoulders"], advancedVariations: ["Double unders"], metValue: 11,
  },
  {
    slug: "stair-climber", name: "Stair Climber", category: "CARDIO", difficulty: "BEGINNER",
    disciplines: ["CARDIO", "GYM"], muscles: ["Quads", "Glutes", "Heart"], secondaryMuscles: ["Calves"],
    equipment: ["Stair Climber"],
    instructions: ["Stand tall, light grip on rails.", "Step at a steady pace.", "Avoid leaning on the handrails."],
    commonMistakes: ["Slouching on the rails"], metValue: 9,
  },
  {
    slug: "elliptical", name: "Elliptical", category: "CARDIO", difficulty: "BEGINNER",
    disciplines: ["CARDIO", "GYM"], muscles: ["Legs", "Heart"], secondaryMuscles: ["Arms"],
    equipment: ["Elliptical"],
    instructions: ["Drive through the handles and pedals.", "Maintain an upright posture.", "Keep a steady stride."],
    commonMistakes: ["Leaning forward heavily"], metValue: 7,
  },
  {
    slug: "swimming", name: "Swimming", category: "CARDIO", difficulty: "INTERMEDIATE",
    disciplines: ["CARDIO", "FUNCTIONAL"], muscles: ["Full Body", "Heart"], secondaryMuscles: [],
    equipment: ["Bodyweight"],
    instructions: ["Warm up with easy laps.", "Maintain efficient technique.", "Breathe rhythmically."],
    commonMistakes: ["Holding the breath", "Poor body position"], metValue: 9,
  },

  // ===================== FUNCTIONAL =====================
  {
    slug: "farmer-carry", name: "Farmer Carry", category: "FUNCTIONAL", difficulty: "BEGINNER",
    disciplines: ["FUNCTIONAL", "CROSSFIT", "GYM"], muscles: ["Forearms", "Traps", "Core"], secondaryMuscles: ["Legs"],
    equipment: ["Dumbbells", "Kettlebell"],
    instructions: ["Grab heavy weights at the sides.", "Stand tall, walk with control.", "Keep the core braced."],
    commonMistakes: ["Leaning to one side", "Shrugging"], metValue: 6,
  },
  {
    slug: "sled-push", name: "Sled Push", category: "FUNCTIONAL", difficulty: "INTERMEDIATE",
    disciplines: ["FUNCTIONAL", "CROSSFIT"], muscles: ["Quads", "Glutes"], secondaryMuscles: ["Calves", "Core"],
    equipment: ["Weight Plates"],
    instructions: ["Low body angle, arms extended.", "Drive the sled with powerful steps.", "Keep a flat back."],
    commonMistakes: ["Standing too upright", "Short steps"], metValue: 10,
  },
  {
    slug: "battle-rope", name: "Battle Rope", category: "FUNCTIONAL", difficulty: "BEGINNER",
    disciplines: ["FUNCTIONAL", "CROSSFIT", "CARDIO"], muscles: ["Shoulders", "Core"], secondaryMuscles: ["Arms"],
    equipment: ["Battle Rope"],
    instructions: ["Athletic stance, grip the ends.", "Create powerful waves.", "Keep a steady, hard pace."],
    commonMistakes: ["Standing too tall", "Only using the arms"], metValue: 10,
  },
  {
    slug: "kettlebell-swing", name: "Kettlebell Swing", category: "FUNCTIONAL", difficulty: "INTERMEDIATE",
    disciplines: ["FUNCTIONAL", "CROSSFIT", "GYM"], muscles: ["Glutes", "Hamstrings"], secondaryMuscles: ["Core", "Shoulders"],
    equipment: ["Kettlebell"],
    instructions: ["Hinge and hike the bell back.", "Explosively drive the hips forward.", "Let the bell float to chest height."],
    commonMistakes: ["Squatting instead of hinging", "Lifting with the arms"], formTips: ["Power comes from the hips"],
    beginnerMod: "Light bell, hip-hinge drills first.", metValue: 9, poseKey: "rep-generic", ai: { rep: true },
  },
  {
    slug: "box-jump", name: "Box Jump", category: "FUNCTIONAL", difficulty: "INTERMEDIATE",
    disciplines: ["FUNCTIONAL", "CROSSFIT", "HOME"], muscles: ["Quads", "Glutes"], secondaryMuscles: ["Calves"],
    equipment: ["Bench"],
    instructions: ["Athletic stance before the box.", "Swing arms and jump onto the box.", "Land soft, stand tall, step down."],
    commonMistakes: ["Jumping down (knee stress)", "Box too high"], beginnerMod: "Use a low box or step-ups.", metValue: 9, poseKey: "rep-generic", ai: { rep: true },
  },
  {
    slug: "burpees", name: "Burpees", category: "FULL_BODY", difficulty: "INTERMEDIATE",
    disciplines: ["CROSSFIT", "HOME", "CARDIO", "FUNCTIONAL"], muscles: ["Full Body"], secondaryMuscles: ["Heart"],
    equipment: ["Bodyweight"],
    instructions: ["Drop to a squat, hands down.", "Kick back to a push-up.", "Return and jump up explosively."],
    commonMistakes: ["Sagging hips in the plank", "No full jump"], beginnerMod: "Step back instead of jumping.", metValue: 10, poseKey: "rep-generic", ai: { rep: true },
  },
  {
    slug: "medicine-ball-slam", name: "Medicine Ball Slam", category: "FULL_BODY", difficulty: "BEGINNER",
    disciplines: ["FUNCTIONAL", "CROSSFIT"], muscles: ["Core", "Shoulders"], secondaryMuscles: ["Lats", "Legs"],
    equipment: ["Medicine Ball"],
    instructions: ["Lift the ball overhead.", "Slam it down with full force.", "Catch the bounce and repeat."],
    commonMistakes: ["Using only the arms", "Rounding the back"], metValue: 9, poseKey: "rep-generic", ai: { rep: true },
  },

  // ===================== HOME (unique) =====================
  {
    slug: "bodyweight-squat", name: "Bodyweight Squat", category: "QUADS", difficulty: "BEGINNER",
    disciplines: ["HOME", "CALISTHENICS"], muscles: ["Quads", "Glutes"], secondaryMuscles: ["Hamstrings", "Core"],
    equipment: ["Bodyweight"],
    instructions: ["Feet shoulder-width.", "Sit back and down to parallel.", "Drive up through the heels."],
    commonMistakes: ["Knees caving", "Heels rising"], beginnerMod: "Squat to a chair.", advancedVariations: ["Jump squat", "Pistol squat"], metValue: 5, poseKey: "squat", ai: true,
  },
  {
    slug: "jump-squat", name: "Jump Squat", category: "QUADS", difficulty: "INTERMEDIATE",
    disciplines: ["HOME", "CROSSFIT", "FUNCTIONAL"], muscles: ["Quads", "Glutes"], secondaryMuscles: ["Calves"],
    equipment: ["Bodyweight"],
    instructions: ["Squat down.", "Explode up into a jump.", "Land soft and immediately repeat."],
    commonMistakes: ["Hard landings", "Shallow squat"], metValue: 9, poseKey: "squat", ai: { rep: true },
  },
  {
    slug: "high-knees", name: "High Knees", category: "CARDIO", difficulty: "BEGINNER",
    disciplines: ["HOME", "CARDIO", "FUNCTIONAL"], muscles: ["Quads", "Core"], secondaryMuscles: ["Calves", "Heart"],
    equipment: ["Bodyweight"],
    instructions: ["Run in place driving knees to hip height.", "Pump the arms.", "Keep a fast pace on the balls of the feet."],
    commonMistakes: ["Knees too low", "Slouching"], metValue: 8, poseKey: "rep-generic", ai: { rep: true },
  },
  {
    slug: "jumping-jacks", name: "Jumping Jacks", category: "CARDIO", difficulty: "BEGINNER",
    disciplines: ["HOME", "CARDIO"], muscles: ["Full Body", "Heart"], secondaryMuscles: [],
    equipment: ["Bodyweight"],
    instructions: ["Jump feet out while raising arms overhead.", "Jump back to start.", "Keep a steady rhythm."],
    commonMistakes: ["Half range on the arms"], metValue: 8, poseKey: "rep-generic", ai: { rep: true },
  },

  // ===================== POWERLIFTING (variations) =====================
  {
    slug: "pause-squat", name: "Pause Squat", category: "QUADS", difficulty: "ADVANCED",
    disciplines: ["POWERLIFTING"], muscles: ["Quads", "Glutes"], secondaryMuscles: ["Core"],
    equipment: ["Barbell", "Squat Rack"],
    instructions: ["Squat to the bottom.", "Pause 2-3s while staying tight.", "Drive up explosively."],
    commonMistakes: ["Relaxing in the hole", "Shifting forward"], metValue: 7, poseKey: "squat", ai: { posture: true, rep: true, rom: true },
  },
  {
    slug: "pause-bench", name: "Pause Bench", category: "CHEST", difficulty: "ADVANCED",
    disciplines: ["POWERLIFTING"], muscles: ["Chest", "Triceps"], secondaryMuscles: ["Front Delts"],
    equipment: ["Barbell", "Bench"],
    instructions: ["Lower the bar to the chest.", "Pause 1-2s motionless.", "Press to lockout."],
    commonMistakes: ["Sinking the bar", "Losing tightness"], metValue: 6, poseKey: "bench-press", ai: { rep: true },
  },
  {
    slug: "deficit-deadlift", name: "Deficit Deadlift", category: "BACK", difficulty: "ADVANCED",
    disciplines: ["POWERLIFTING"], muscles: ["Hamstrings", "Back", "Glutes"], secondaryMuscles: ["Traps"],
    equipment: ["Barbell", "Weight Plates"],
    instructions: ["Stand on a 1-2 inch platform.", "Pull from the increased range.", "Maintain a flat back throughout."],
    commonMistakes: ["Rounding due to extra range", "Too high a deficit"], metValue: 7, poseKey: "deadlift", ai: { posture: true, rep: true },
  },

  // ===================== CROSSFIT / OLYMPIC =====================
  {
    slug: "thruster", name: "Thruster", category: "FULL_BODY", difficulty: "INTERMEDIATE",
    disciplines: ["CROSSFIT", "FUNCTIONAL"], muscles: ["Quads", "Shoulders"], secondaryMuscles: ["Glutes", "Triceps", "Core"],
    equipment: ["Barbell", "Dumbbells"],
    instructions: ["Front-rack squat down.", "Drive up and press the bar overhead in one motion.", "Return to the rack and repeat."],
    commonMistakes: ["Pressing too early", "Shallow squat"], metValue: 9, poseKey: "squat", ai: { rep: true },
  },
  {
    slug: "wall-ball", name: "Wall Ball", category: "FULL_BODY", difficulty: "INTERMEDIATE",
    disciplines: ["CROSSFIT", "FUNCTIONAL"], muscles: ["Quads", "Shoulders"], secondaryMuscles: ["Core", "Glutes"],
    equipment: ["Medicine Ball"],
    instructions: ["Squat with the ball at the chest.", "Drive up and throw to a wall target.", "Catch and descend into the next rep."],
    commonMistakes: ["Not hitting depth", "Throwing with arms only"], metValue: 9, poseKey: "squat", ai: { rep: true },
  },
  {
    slug: "double-under", name: "Double Under", category: "CARDIO", difficulty: "ADVANCED",
    disciplines: ["CROSSFIT", "CARDIO"], muscles: ["Calves", "Heart"], secondaryMuscles: ["Shoulders"],
    equipment: ["Jump Rope"],
    instructions: ["Jump slightly higher than a single.", "Spin the rope twice per jump using the wrists.", "Keep an even rhythm."],
    commonMistakes: ["Piking the legs", "Over-bending the knees"], beginnerMod: "Master single unders first.", metValue: 12,
  },
  {
    slug: "power-clean", name: "Power Clean", category: "OLYMPIC", difficulty: "ADVANCED",
    disciplines: ["CROSSFIT", "FUNCTIONAL", "POWERLIFTING"], muscles: ["Full Body"], secondaryMuscles: ["Traps", "Quads", "Glutes"],
    equipment: ["Barbell", "Weight Plates"],
    instructions: ["Pull the bar explosively from the floor.", "Extend hips and shrug, then pull under.", "Catch in a partial front-rack squat."],
    commonMistakes: ["Early arm pull", "Bar drifting forward"], beginnerMod: "Learn the hang clean with light load.", metValue: 9,
  },
  {
    slug: "snatch", name: "Snatch", category: "OLYMPIC", difficulty: "ADVANCED",
    disciplines: ["CROSSFIT", "FUNCTIONAL"], muscles: ["Full Body"], secondaryMuscles: ["Shoulders", "Quads", "Traps"],
    equipment: ["Barbell", "Weight Plates"],
    instructions: ["Wide grip, explosive pull from the floor.", "Extend and pull under the bar.", "Catch overhead in an overhead squat."],
    commonMistakes: ["Poor overhead mobility", "Bar looping out"], beginnerMod: "Use a PVC pipe to drill positions.", metValue: 10,
  },
  {
    slug: "clean-and-jerk", name: "Clean and Jerk", category: "OLYMPIC", difficulty: "ADVANCED",
    disciplines: ["CROSSFIT", "FUNCTIONAL"], muscles: ["Full Body"], secondaryMuscles: ["Quads", "Shoulders", "Glutes"],
    equipment: ["Barbell", "Weight Plates"],
    instructions: ["Clean the bar to the front rack.", "Dip and drive the bar overhead.", "Split or power jerk to lockout."],
    commonMistakes: ["Pressing out the jerk", "Soft front rack"], beginnerMod: "Train the clean and jerk separately first.", metValue: 10,
  },
];

export const exercises: ExerciseSeed[] = RAW.map(build);
