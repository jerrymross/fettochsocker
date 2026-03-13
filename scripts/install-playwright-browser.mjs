import { execFileSync } from "node:child_process";

if (process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD === "1") {
  process.exit(0);
}

const env = {
  ...process.env,
  PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH || "0",
};

if (process.platform === "win32") {
  execFileSync("cmd.exe", ["/c", "npx playwright install chromium"], {
    stdio: "inherit",
    env,
  });
} else {
  execFileSync("npx", ["playwright", "install", "chromium"], {
    stdio: "inherit",
    env,
  });
}
