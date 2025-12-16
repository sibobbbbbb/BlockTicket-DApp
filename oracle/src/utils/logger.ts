/**
 * Simple logger utility with colored output
 */

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function getTimestamp(): string {
  return new Date().toISOString();
}

export const logger = {
  info: (message: string, ...args: unknown[]) => {
    console.log(
      `${colors.cyan}[${getTimestamp()}]${colors.reset} ${colors.blue}INFO${
        colors.reset
      }  ${message}`,
      ...args
    );
  },

  success: (message: string, ...args: unknown[]) => {
    console.log(
      `${colors.cyan}[${getTimestamp()}]${colors.reset} ${colors.green}✓${
        colors.reset
      }     ${message}`,
      ...args
    );
  },

  warn: (message: string, ...args: unknown[]) => {
    console.warn(
      `${colors.cyan}[${getTimestamp()}]${colors.reset} ${colors.yellow}WARN${
        colors.reset
      }  ${message}`,
      ...args
    );
  },

  error: (message: string, ...args: unknown[]) => {
    console.error(
      `${colors.cyan}[${getTimestamp()}]${colors.reset} ${colors.red}ERROR${
        colors.reset
      } ${message}`,
      ...args
    );
  },

  debug: (message: string, ...args: unknown[]) => {
    if (Bun.env.NODE_ENV === "development") {
      console.log(
        `${colors.cyan}[${getTimestamp()}]${colors.reset} ${
          colors.magenta
        }DEBUG${colors.reset} ${message}`,
        ...args
      );
    }
  },

  tx: (message: string, txHash?: string) => {
    console.log(
      `${colors.cyan}[${getTimestamp()}]${colors.reset} ${colors.green}TX${
        colors.reset
      }    ${message}`,
      txHash ? `\n   └─ Hash: ${txHash}` : ""
    );
  },
};
