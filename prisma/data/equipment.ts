// Equipment & machine catalog. `type` matches the EquipmentType enum.
export const equipment = [
  // Free weights
  { slug: "barbell", name: "Barbell", type: "BARBELL" },
  { slug: "ez-bar", name: "EZ Bar", type: "BARBELL" },
  { slug: "dumbbell", name: "Dumbbell", type: "DUMBBELL" },
  { slug: "kettlebell", name: "Kettlebell", type: "KETTLEBELL" },
  { slug: "weight-plates", name: "Weight Plates", type: "ACCESSORY" },

  // Bodyweight / accessories
  { slug: "bodyweight", name: "Bodyweight", type: "BODYWEIGHT" },
  { slug: "pull-up-bar", name: "Pull-up Bar", type: "ACCESSORY" },
  { slug: "bench", name: "Bench", type: "ACCESSORY" },
  { slug: "resistance-bands", name: "Resistance Bands", type: "ACCESSORY" },
  { slug: "medicine-ball", name: "Medicine Ball", type: "ACCESSORY" },
  { slug: "battle-rope", name: "Battle Rope", type: "ACCESSORY" },
  { slug: "ab-wheel", name: "Ab Wheel", type: "ACCESSORY" },
  { slug: "jump-rope", name: "Jump Rope", type: "ACCESSORY" },
  { slug: "cable-attachments", name: "Cable Attachments", type: "ACCESSORY" },

  // Machines
  { slug: "smith-machine", name: "Smith Machine", type: "MACHINE" },
  { slug: "leg-press-machine", name: "Leg Press Machine", type: "MACHINE" },
  { slug: "hack-squat-machine", name: "Hack Squat Machine", type: "MACHINE" },
  { slug: "leg-extension-machine", name: "Leg Extension Machine", type: "MACHINE" },
  { slug: "leg-curl-machine", name: "Leg Curl Machine", type: "MACHINE" },
  { slug: "pec-deck", name: "Pec Deck", type: "MACHINE" },
  { slug: "cable-machine", name: "Cable Machine", type: "CABLE" },
  { slug: "lat-pulldown-machine", name: "Lat Pulldown Machine", type: "MACHINE" },
  { slug: "seated-row-machine", name: "Seated Row Machine", type: "MACHINE" },
  { slug: "chest-press-machine", name: "Chest Press Machine", type: "MACHINE" },
  { slug: "shoulder-press-machine", name: "Shoulder Press Machine", type: "MACHINE" },
  { slug: "ab-crunch-machine", name: "Ab Crunch Machine", type: "MACHINE" },
  { slug: "calf-raise-machine", name: "Calf Raise Machine", type: "MACHINE" },
  { slug: "assisted-pull-up-machine", name: "Assisted Pull-up Machine", type: "MACHINE" },
  { slug: "t-bar-row-machine", name: "T-Bar Row Machine", type: "MACHINE" },

  // Cardio machines
  { slug: "treadmill", name: "Treadmill", type: "CARDIO_MACHINE" },
  { slug: "elliptical", name: "Elliptical", type: "CARDIO_MACHINE" },
  { slug: "rowing-machine", name: "Rowing Machine", type: "CARDIO_MACHINE" },
  { slug: "stair-climber", name: "Stair Climber", type: "CARDIO_MACHINE" },
  { slug: "stationary-bike", name: "Stationary Bike", type: "CARDIO_MACHINE" },
] as const;
