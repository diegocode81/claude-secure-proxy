import fs from 'node:fs';
import path from 'node:path';
import { getDashboardBudgetSettings } from '../settings/platform-settings.service.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const USAGE_FILE = path.join(DATA_DIR, 'usage.json');

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function getBudgetUsd() {
  return Number(getDashboardBudgetSettings().monthlyBudgetUsd || process.env.MONTHLY_BUDGET_USD || 80);
}

function getAlertThresholdUsd() {
  const dashboardSettings = getDashboardBudgetSettings();
  const budgetUsd = Number(dashboardSettings.monthlyBudgetUsd || process.env.MONTHLY_BUDGET_USD || 80);
  return Number(dashboardSettings.alertThresholdUsd || budgetUsd * Number(process.env.BUDGET_WARNING_PERCENT || 85) / 100);
}

function getInputCostPer1M() {
  return Number(process.env.INPUT_COST_PER_1M_TOKENS || 3);
}

function getOutputCostPer1M() {
  return Number(process.env.OUTPUT_COST_PER_1M_TOKENS || 15);
}

function roundMoney(value) {
  return Math.round(value * 10000) / 10000;
}

function roundPercent(value) {
  return Math.round(value * 100) / 100;
}

function calculateEstimatedCostUsd(inputTokens, outputTokens) {
  return roundMoney(
    (inputTokens / 1000000 * getInputCostPer1M()) +
    (outputTokens / 1000000 * getOutputCostPer1M())
  );
}

function createEmptyUsage(month = getCurrentMonth()) {
  return {
    month,
    inputTokens: 0,
    outputTokens: 0,
    totalRequests: 0,
    blockedRequests: 0,
    sanitizedRequests: 0,
    allowedRequests: 0,
    estimatedCostUsd: 0
  };
}

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function normalizeUsage(data) {
  const month = getCurrentMonth();
  const base = data?.month === month ? data : createEmptyUsage(month);

  const inputTokens = Number(base.inputTokens || 0);
  const outputTokens = Number(base.outputTokens || 0);

  return {
    month,
    inputTokens,
    outputTokens,
    totalRequests: Number(base.totalRequests || 0),
    blockedRequests: Number(base.blockedRequests || 0),
    sanitizedRequests: Number(base.sanitizedRequests || 0),
    allowedRequests: Number(base.allowedRequests || 0),
    estimatedCostUsd: calculateEstimatedCostUsd(inputTokens, outputTokens)
  };
}

function writeUsage(usage) {
  ensureDataDir();
  fs.writeFileSync(USAGE_FILE, `${JSON.stringify(usage, null, 2)}\n`);
}

export function readUsage() {
  ensureDataDir();

  if (!fs.existsSync(USAGE_FILE)) {
    const empty = createEmptyUsage();
    writeUsage(empty);
    return empty;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8'));
    const normalized = normalizeUsage(parsed);
    writeUsage(normalized);
    return normalized;
  } catch {
    const empty = createEmptyUsage();
    writeUsage(empty);
    return empty;
  }
}

export function getUsageSummary() {
  const usage = readUsage();
  const budgetUsd = getBudgetUsd();
  const alertThresholdUsd = getAlertThresholdUsd();
  const alertThresholdPercent = budgetUsd > 0
    ? roundPercent((alertThresholdUsd / budgetUsd) * 100)
    : 0;
  const usagePercent = budgetUsd > 0
    ? roundPercent((usage.estimatedCostUsd / budgetUsd) * 100)
    : 0;

  return {
    month: usage.month,
    budgetUsd,
    alertThresholdUsd,
    alertThresholdPercent,
    estimatedCostUsd: usage.estimatedCostUsd,
    usagePercent,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalRequests: usage.totalRequests,
    blockedRequests: usage.blockedRequests,
    sanitizedRequests: usage.sanitizedRequests,
    allowedRequests: usage.allowedRequests
  };
}

export function recordBlockedRequest() {
  const usage = readUsage();
  usage.blockedRequests += 1;
  writeUsage(usage);
  return getUsageSummary();
}

export function recordClaudeUsage({ status, inputTokens, outputTokens }) {
  const usage = readUsage();

  usage.inputTokens += Number(inputTokens || 0);
  usage.outputTokens += Number(outputTokens || 0);
  usage.totalRequests += 1;

  if (status === 'SANITIZED') {
    usage.sanitizedRequests += 1;
  } else if (status === 'ALLOWED') {
    usage.allowedRequests += 1;
  }

  usage.estimatedCostUsd = calculateEstimatedCostUsd(usage.inputTokens, usage.outputTokens);
  writeUsage(usage);
  return getUsageSummary();
}

export function resetUsage() {
  const empty = createEmptyUsage();
  writeUsage(empty);
  return getUsageSummary();
}

export function isBudgetExceeded() {
  return getUsageSummary().usagePercent >= 100;
}

export function isBudgetWarning(summary = getUsageSummary()) {
  return Number(summary.estimatedCostUsd || 0) >= Number(summary.alertThresholdUsd || 0);
}
