// Removes build output directories. electron-builder doesn't clean up
// after itself between runs, so release/ silently accumulates every past
// version's installers forever (this repo had 1.4GB of it across 3 old
// versions before this script existed). Run before a build you care about
// being a clean, single-version output.
import { rmSync, existsSync } from 'fs';

const dirs = ['dist', 'dist-electron', 'release'];

for (const dir of dirs) {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
    console.log(`Removed ${dir}/`);
  }
}
