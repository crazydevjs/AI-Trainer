import { createExperiment } from "@/lib/observability/experiments";
import { requireArg, fail } from "../validation/_shared";

/** Variant args look like "control:50" "treatment:50" (name:weight). */
function parseVariant(raw: string): { name: string; weight: number } {
  const [name, weight] = raw.split(":");
  if (!name || !weight) fail(`Invalid variant "${raw}" — expected "name:weight"`);
  return { name, weight: Number(weight) };
}

async function main() {
  const args = process.argv.slice(2);
  const usage =
    "tsx scripts/observability/experiments-create.ts <key> <name> <metricKey> <variant:weight> [<variant:weight> ...]";
  const key = requireArg(args, 0, usage);
  const name = requireArg(args, 1, usage);
  const metricKey = requireArg(args, 2, usage);
  const variantArgs = args.slice(3);
  if (variantArgs.length < 2) fail("Need at least 2 variants (e.g. control:50 treatment:50)");

  const experiment = await createExperiment({
    key,
    name,
    description: `Created via CLI on ${new Date().toISOString()}`,
    metricKey,
    variants: variantArgs.map(parseVariant),
  });

  console.log(`Created experiment "${name}" (${experiment.id}), key="${key}", status=${experiment.status}`);
  console.log(`Variants: ${experiment.variants.map((v) => `${v.name}:${v.weight}`).join(", ")}`);
  console.log(`Run "npm run experiments:compare ${experiment.id}" once outcomes have been recorded.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
