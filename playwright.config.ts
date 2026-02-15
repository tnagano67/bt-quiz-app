import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "setup",
      testMatch: /global-setup\.ts/,
    },
    {
      name: "teacher",
      testDir: "./e2e/teacher",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/teacher.json",
      },
      dependencies: ["setup"],
    },
    {
      name: "student",
      testDir: "./e2e/student",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/student.json",
      },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
