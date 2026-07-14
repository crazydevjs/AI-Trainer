import { approveRelease, rejectRelease } from "@/lib/mlops/release-manager";
import { requireArg, parseFlags } from "../validation/_shared";

async function main() {
  const args = process.argv.slice(2);
  const { positional, flags } = parseFlags(args);
  const releaseId = requireArg(
    positional,
    0,
    "tsx scripts/mlops/release-approve.ts <releaseId> [--force] [--reject] [--by=name] [--reason=text]",
  );

  if (flags.reject) {
    const release = await rejectRelease(releaseId, flags.reason);
    console.log(`Release ${releaseId} rejected (status: ${release.status}).`);
    return;
  }

  const release = await approveRelease(releaseId, { approvedBy: flags.by, force: !!flags.force });
  console.log(`Release ${releaseId} approved (status: ${release.status}).`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
