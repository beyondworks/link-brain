const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function timestamp(): string {
  return new Date().toISOString().slice(11, 19);
}

export const log = {
  info(msg: string): void {
    console.log(`${COLORS.dim}[${timestamp()}]${COLORS.reset} ${COLORS.blue}INFO${COLORS.reset}  ${msg}`);
  },
  success(msg: string): void {
    console.log(`${COLORS.dim}[${timestamp()}]${COLORS.reset} ${COLORS.green}OK${COLORS.reset}    ${msg}`);
  },
  warn(msg: string): void {
    console.log(`${COLORS.dim}[${timestamp()}]${COLORS.reset} ${COLORS.yellow}WARN${COLORS.reset}  ${msg}`);
  },
  error(msg: string, err?: unknown): void {
    console.error(`${COLORS.dim}[${timestamp()}]${COLORS.reset} ${COLORS.red}ERROR${COLORS.reset} ${msg}`);
    if (err instanceof Error) {
      console.error(`  ${COLORS.dim}${err.message}${COLORS.reset}`);
    }
  },
  progress(current: number, total: number, label: string): void {
    const pct = total > 0 ? Math.round((current / total) * 100) : 0;
    process.stdout.write(
      `\r${COLORS.dim}[${timestamp()}]${COLORS.reset} ${COLORS.cyan}PROG${COLORS.reset}  ${label}: ${current}/${total} (${pct}%)`
    );
    if (current === total) process.stdout.write('\n');
  },
  divider(title: string): void {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  ${title}`);
    console.log(`${'='.repeat(60)}\n`);
  },
};
